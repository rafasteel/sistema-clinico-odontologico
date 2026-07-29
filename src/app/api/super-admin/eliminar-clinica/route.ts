import { NextRequest, NextResponse } from "next/server";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/serverAdmin";

type EliminarClinicaPayload = {
    clinicaId: string;
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

        const payload = (await request.json()) as EliminarClinicaPayload;
        const clinicaId = texto(payload.clinicaId);
        const motivo = texto(payload.motivo) || "Clínica cancelada desde SUPER_ADMIN.";

        if (!clinicaId) {
            return respuestaError("No se recibió la clínica.");
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
            return respuestaError("No tenés permiso para eliminar clínicas.", 403);
        }

        const { data: clinicaAnterior, error: errorClinicaAnterior } = await supabaseAdmin
            .from("clinicas")
            .select("*")
            .eq("id", clinicaId)
            .single();

        if (errorClinicaAnterior || !clinicaAnterior) {
            return respuestaError("No se encontró la clínica.", 404);
        }

        const { data: clinicaCancelada, error: errorClinica } = await supabaseAdmin
            .from("clinicas")
            .update({
                estado: "Cancelada",
                notas: motivo,
            })
            .eq("id", clinicaId)
            .select("*")
            .single();

        if (errorClinica || !clinicaCancelada) {
            return respuestaError(errorClinica?.message || "No se pudo cancelar la clínica.", 500);
        }

        const { data: suscripcionesCanceladas, error: errorSuscripciones } = await supabaseAdmin
            .from("suscripciones")
            .update({
                estado: "Cancelada",
                notas: motivo,
            })
            .eq("clinica_id", clinicaId)
            .select("*");

        if (errorSuscripciones) {
            return respuestaError(errorSuscripciones.message || "No se pudo cancelar la suscripción.", 500);
        }

        const { data: usuariosDesactivados, error: errorUsuarios } = await supabaseAdmin
            .from("usuarios_perfiles")
            .update({ estado: "Inactivo" })
            .eq("clinica_id", clinicaId)
            .select("id, nombre, correo, rol, estado");

        if (errorUsuarios) {
            return respuestaError(errorUsuarios.message || "No se pudieron desactivar los usuarios.", 500);
        }

        await supabaseAdmin.from("auditoria").insert({
            clinica_id: clinicaId,
            usuario_id: perfilSolicitante.id,
            modulo: "SUPER_ADMIN",
            accion: "Clínica eliminada/cancelada",
            detalle: `La clínica ${clinicaAnterior.nombre} fue cancelada desde SUPER_ADMIN. ${motivo}`,
            registro_id: clinicaId,
            datos_anteriores: clinicaAnterior,
            datos_nuevos: {
                clinica: clinicaCancelada,
                suscripciones: suscripcionesCanceladas || [],
                usuarios: usuariosDesactivados || [],
            },
            nivel: "Crítico",
        });

        return NextResponse.json({
            ok: true,
            mensaje: "Clínica eliminada/cancelada correctamente. El historial se conserva para auditoría.",
            clinica: clinicaCancelada,
            suscripciones: suscripcionesCanceladas || [],
            usuarios: usuariosDesactivados || [],
        });
    } catch (error) {
        const mensaje = error instanceof Error ? error.message : "Error interno al eliminar la clínica.";
        return respuestaError(mensaje, 500);
    }
}