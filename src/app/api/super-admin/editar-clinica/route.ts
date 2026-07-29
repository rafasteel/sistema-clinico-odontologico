import { NextRequest, NextResponse } from "next/server";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/serverAdmin";

type EditarClinicaPayload = {
    clinicaId: string;
    nombreClinica: string;
    telefono?: string;
    whatsapp?: string;
    correoClinica?: string;
    direccion?: string;
    ruc?: string;
    plan?: string;
    precioMensual?: number;
    monedaSuscripcion?: string;
    fechaVencimiento?: string;
    diasGracia?: number;
};

function respuestaError(mensaje: string, estado = 400) {
    return NextResponse.json({ ok: false, mensaje }, { status: estado });
}

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown, valorInicial: number) {
    const convertido = Number(valor);
    return Number.isNaN(convertido) ? valorInicial : convertido;
}

function fechaValidaISO(fecha: string) {
    if (!fecha) return "";
    const valor = new Date(`${fecha}T12:00:00`);
    if (Number.isNaN(valor.getTime())) return "";
    return fecha.slice(0, 10);
}

async function obtenerPerfilSuperAdmin(token: string) {
    const supabaseAdmin = crearClienteSupabaseAdmin();

    const {
        data: { user },
        error: errorUsuarioSesion,
    } = await supabaseAdmin.auth.getUser(token);

    if (errorUsuarioSesion || !user) {
        throw new Error("Sesión inválida o vencida.");
    }

    const { data: perfilSolicitante, error: errorPerfil } = await supabaseAdmin
        .from("usuarios_perfiles")
        .select("id, rol, estado")
        .eq("auth_user_id", user.id)
        .single();

    if (errorPerfil || !perfilSolicitante) {
        throw new Error("No se encontró el perfil del usuario solicitante.");
    }

    if (
        perfilSolicitante.rol !== "SUPER_ADMIN" ||
        perfilSolicitante.estado !== "Activo"
    ) {
        throw new Error("No tenés permiso para editar clínicas.");
    }

    return { supabaseAdmin, perfilSolicitante };
}

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

        if (!token) {
            return respuestaError("No se recibió token de sesión.", 401);
        }

        const payload = (await request.json()) as EditarClinicaPayload;

        const clinicaId = texto(payload.clinicaId);
        const nombreClinica = texto(payload.nombreClinica);
        const telefono = texto(payload.telefono);
        const whatsapp = texto(payload.whatsapp);
        const correoClinica = texto(payload.correoClinica).toLowerCase();
        const direccion = texto(payload.direccion);
        const ruc = texto(payload.ruc);
        const plan = texto(payload.plan) || "Profesional";
        const precioMensual = numero(payload.precioMensual, 0);
        const monedaSuscripcion = texto(payload.monedaSuscripcion) || "USD";
        const fechaVencimiento = fechaValidaISO(texto(payload.fechaVencimiento));
        const diasGracia = Math.max(0, Math.round(numero(payload.diasGracia, 7)));

        if (!clinicaId) return respuestaError("No se recibió la clínica.");
        if (!nombreClinica) return respuestaError("El nombre de la clínica es obligatorio.");
        if (!fechaVencimiento) return respuestaError("La fecha de vencimiento no es válida.");
        if (precioMensual < 0) return respuestaError("El precio mensual no puede ser negativo.");

        const { supabaseAdmin, perfilSolicitante } = await obtenerPerfilSuperAdmin(token);

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
                nombre: nombreClinica,
                telefono,
                whatsapp,
                correo: correoClinica,
                direccion,
                ruc,
                plan,
                fecha_vencimiento: fechaVencimiento,
            })
            .eq("id", clinicaId)
            .select("*")
            .single();

        if (errorClinica || !clinicaActualizada) {
            return respuestaError(errorClinica?.message || "No se pudo actualizar la clínica.", 500);
        }

        const { data: suscripciones, error: errorSuscripciones } = await supabaseAdmin
            .from("suscripciones")
            .select("*")
            .eq("clinica_id", clinicaId)
            .order("creada_en", { ascending: false })
            .limit(1);

        if (errorSuscripciones) {
            return respuestaError(errorSuscripciones.message, 500);
        }

        let suscripcionActualizada = null;
        const suscripcionAnterior = suscripciones?.[0] || null;

        if (suscripcionAnterior) {
            const { data, error } = await supabaseAdmin
                .from("suscripciones")
                .update({
                    plan,
                    precio_mensual: precioMensual,
                    moneda: monedaSuscripcion,
                    fecha_vencimiento: fechaVencimiento,
                    dias_gracia: diasGracia,
                })
                .eq("id", suscripcionAnterior.id)
                .select("*")
                .single();

            if (error) {
                return respuestaError(error.message || "No se pudo actualizar la suscripción.", 500);
            }

            suscripcionActualizada = data;
        }

        await supabaseAdmin.from("auditoria").insert({
            clinica_id: clinicaId,
            usuario_id: perfilSolicitante.id,
            modulo: "SUPER_ADMIN",
            accion: "Clínica editada",
            detalle: `Se actualizaron los datos de la clínica ${nombreClinica}.`,
            registro_id: clinicaId,
            datos_anteriores: {
                clinica: clinicaAnterior,
                suscripcion: suscripcionAnterior,
            },
            datos_nuevos: {
                clinica: clinicaActualizada,
                suscripcion: suscripcionActualizada,
            },
            nivel: "Info",
        });

        return NextResponse.json({
            ok: true,
            mensaje: "Clínica actualizada correctamente.",
            clinica: clinicaActualizada,
            suscripcion: suscripcionActualizada,
        });
    } catch (error) {
        const mensaje = error instanceof Error ? error.message : "Error interno al editar la clínica.";
        const estado = mensaje.includes("permiso") ? 403 : mensaje.includes("Sesión") ? 401 : 500;
        return respuestaError(mensaje, estado);
    }
}