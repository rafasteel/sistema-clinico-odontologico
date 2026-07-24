import { NextRequest, NextResponse } from "next/server";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/serverAdmin";

type CambiarEstadoPayload = {
    clinicaId: string;
    estado: "Activa" | "Vencida" | "Restringida" | "Suspendida" | "Cancelada";
    motivo?: string;
};

function respuestaError(mensaje: string, estado = 400) {
    return NextResponse.json({ ok: false, mensaje }, { status: estado });
}

function texto(valor: unknown) {
    return String(valor || "").trim();
}

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

        if (!token) {
            return respuestaError("No se recibió token de sesión.", 401);
        }

        const payload = (await request.json()) as CambiarEstadoPayload;
        const clinicaId = texto(payload.clinicaId);
        const nuevoEstado = payload.estado;
        const motivo = texto(payload.motivo);

        if (!clinicaId) {
            return respuestaError("No se recibió la clínica.");
        }

        if (!["Activa", "Vencida", "Restringida", "Suspendida", "Cancelada"].includes(nuevoEstado)) {
            return respuestaError("Estado no válido.");
        }

        const supabaseAdmin = crearClienteSupabaseAdmin();

        const {
            data: { user },
            error: errorUsuarioSesion,
        } = await supabaseAdmin.auth.getUser(token);

        if (errorUsuarioSesion || !user) {
            return respuestaError("Sesión inválida o vencida.", 401);
        }

        const { data: perfilSolicitante, error: errorPerfil } = await supabaseAdmin
            .from("usuarios_perfiles")
            .select("id, rol, estado")
            .eq("auth_user_id", user.id)
            .single();

        if (errorPerfil || !perfilSolicitante) {
            return respuestaError("No se encontró el perfil del usuario solicitante.", 403);
        }

        if (
            perfilSolicitante.rol !== "SUPER_ADMIN" ||
            perfilSolicitante.estado !== "Activo"
        ) {
            return respuestaError("No tenés permiso para cambiar estados de clínicas.", 403);
        }

        const { data: clinicaAnterior, error: errorClinicaAnterior } = await supabaseAdmin
            .from("clinicas")
            .select("*")
            .eq("id", clinicaId)
            .single();

        if (errorClinicaAnterior || !clinicaAnterior) {
            return respuestaError("No se encontró la clínica.", 404);
        }

        const { data: clinicaActualizada, error: errorClinica } = await supabaseAdmin
            .from("clinicas")
            .update({
                estado: nuevoEstado,
                notas:
                    motivo ||
                    clinicaAnterior.notas ||
                    `Estado actualizado a ${nuevoEstado} desde SUPER_ADMIN.`,
            })
            .eq("id", clinicaId)
            .select("*")
            .single();

        if (errorClinica || !clinicaActualizada) {
            return respuestaError(errorClinica?.message || "No se pudo actualizar la clínica.", 500);
        }

        const { data: suscripcionesActualizadas, error: errorSuscripcion } =
            await supabaseAdmin
                .from("suscripciones")
                .update({
                    estado: nuevoEstado,
                    notas:
                        motivo ||
                        `Estado actualizado a ${nuevoEstado} desde SUPER_ADMIN.`,
                })
                .eq("clinica_id", clinicaId)
                .select("*");

        if (errorSuscripcion) {
            return respuestaError(
                errorSuscripcion.message || "No se pudo actualizar la suscripción.",
                500
            );
        }

        await supabaseAdmin.from("auditoria").insert({
            clinica_id: clinicaId,
            usuario_id: perfilSolicitante.id,
            modulo: "SUPER_ADMIN",
            accion: `Clínica ${nuevoEstado.toLowerCase()}`,
            detalle: `La clínica ${clinicaActualizada.nombre} cambió de estado ${clinicaAnterior.estado} a ${nuevoEstado}. ${motivo}`,
            registro_id: clinicaId,
            datos_anteriores: clinicaAnterior,
            datos_nuevos: {
                clinica: clinicaActualizada,
                suscripciones: suscripcionesActualizadas || [],
            },
            nivel:
                nuevoEstado === "Suspendida" || nuevoEstado === "Cancelada"
                    ? "Crítico"
                    : nuevoEstado === "Activa"
                        ? "Éxito"
                        : "Advertencia",
        });

        return NextResponse.json({
            ok: true,
            mensaje: `Clínica actualizada a estado ${nuevoEstado}.`,
            clinica: clinicaActualizada,
            suscripciones: suscripcionesActualizadas || [],
        });
    } catch (error) {
        const mensaje =
            error instanceof Error
                ? error.message
                : "Error interno al cambiar el estado.";

        return respuestaError(mensaje, 500);
    }
}