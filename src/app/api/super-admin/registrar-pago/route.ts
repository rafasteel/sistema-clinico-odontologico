import { NextRequest, NextResponse } from "next/server";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/serverAdmin";

type RegistrarPagoPayload = {
    clinicaId: string;
    monto: number;
    moneda?: string;
    metodoPago?: string;
    referencia?: string;
    meses?: number;
    notas?: string;
};

function respuestaError(mensaje: string, estado = 400) {
    return NextResponse.json({ ok: false, mensaje }, { status: estado });
}

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown, valorInicial: number) {
    const convertido = Number(valor);

    if (Number.isNaN(convertido)) return valorInicial;

    return convertido;
}

function hoyISO() {
    return new Date().toISOString().slice(0, 10);
}

function sumarMeses(fechaBase: string, meses: number) {
    const fecha = new Date(`${fechaBase}T12:00:00`);

    if (Number.isNaN(fecha.getTime())) {
        const fallback = new Date();
        fallback.setMonth(fallback.getMonth() + meses);
        return fallback.toISOString().slice(0, 10);
    }

    fecha.setMonth(fecha.getMonth() + meses);

    return fecha.toISOString().slice(0, 10);
}

function mayorFecha(fechaA: string, fechaB: string) {
    return fechaA >= fechaB ? fechaA : fechaB;
}

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

        if (!token) {
            return respuestaError("No se recibió token de sesión.", 401);
        }

        const payload = (await request.json()) as RegistrarPagoPayload;

        const clinicaId = texto(payload.clinicaId);
        const monto = numero(payload.monto, 0);
        const moneda = texto(payload.moneda) || "USD";
        const metodoPago = texto(payload.metodoPago) || "Transferencia";
        const referencia = texto(payload.referencia);
        const notas = texto(payload.notas);
        const meses = Math.max(1, Math.round(numero(payload.meses, 1)));

        if (!clinicaId) {
            return respuestaError("No se recibió la clínica.");
        }

        if (monto <= 0) {
            return respuestaError("El monto del pago debe ser mayor que cero.");
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
            return respuestaError("No tenés permiso para registrar pagos.", 403);
        }

        const { data: clinica, error: errorClinica } = await supabaseAdmin
            .from("clinicas")
            .select("*")
            .eq("id", clinicaId)
            .single();

        if (errorClinica || !clinica) {
            return respuestaError("No se encontró la clínica.", 404);
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

        const suscripcion = suscripciones?.[0];

        if (!suscripcion) {
            return respuestaError("La clínica no tiene suscripción registrada.", 404);
        }

        const fechaPago = hoyISO();
        const fechaBase = mayorFecha(suscripcion.fecha_vencimiento || fechaPago, fechaPago);
        const nuevaFechaVencimiento = sumarMeses(fechaBase, meses);

        const { data: pago, error: errorPago } = await supabaseAdmin
            .from("pagos_suscripcion")
            .insert({
                clinica_id: clinicaId,
                suscripcion_id: suscripcion.id,
                fecha_pago: fechaPago,
                monto,
                moneda,
                metodo_pago: metodoPago,
                referencia,
                estado: "Pagado",
                registrado_por: perfilSolicitante.id,
                notas:
                    notas ||
                    `Pago registrado desde SUPER_ADMIN. Extiende ${meses} mes(es).`,
            })
            .select("*")
            .single();

        if (errorPago || !pago) {
            return respuestaError(errorPago?.message || "No se pudo registrar el pago.", 500);
        }

        const { data: suscripcionActualizada, error: errorActualizarSuscripcion } =
            await supabaseAdmin
                .from("suscripciones")
                .update({
                    estado: "Activa",
                    fecha_vencimiento: nuevaFechaVencimiento,
                    ultimo_pago: fechaPago,
                    notas:
                        notas ||
                        `Último pago registrado el ${fechaPago}. Próximo vencimiento ${nuevaFechaVencimiento}.`,
                })
                .eq("id", suscripcion.id)
                .select("*")
                .single();

        if (errorActualizarSuscripcion || !suscripcionActualizada) {
            return respuestaError(
                errorActualizarSuscripcion?.message ||
                "El pago se registró, pero no se pudo actualizar la suscripción.",
                500
            );
        }

        const { data: clinicaActualizada, error: errorActualizarClinica } =
            await supabaseAdmin
                .from("clinicas")
                .update({
                    estado: "Activa",
                    fecha_vencimiento: nuevaFechaVencimiento,
                    plan: suscripcionActualizada.plan,
                })
                .eq("id", clinicaId)
                .select("*")
                .single();

        if (errorActualizarClinica || !clinicaActualizada) {
            return respuestaError(
                errorActualizarClinica?.message ||
                "El pago se registró, pero no se pudo actualizar la clínica.",
                500
            );
        }

        await supabaseAdmin.from("auditoria").insert({
            clinica_id: clinicaId,
            usuario_id: perfilSolicitante.id,
            modulo: "SUPER_ADMIN",
            accion: "Pago de suscripción registrado",
            detalle: `Pago de ${moneda} ${monto.toFixed(2)} registrado para ${clinica.nombre}. Nueva fecha de vencimiento: ${nuevaFechaVencimiento}.`,
            registro_id: pago.id,
            datos_anteriores: {
                clinica,
                suscripcion,
            },
            datos_nuevos: {
                pago,
                clinica: clinicaActualizada,
                suscripcion: suscripcionActualizada,
            },
            nivel: "Éxito",
        });

        return NextResponse.json({
            ok: true,
            mensaje: `Pago registrado. Nueva fecha de vencimiento: ${nuevaFechaVencimiento}.`,
            pago,
            clinica: clinicaActualizada,
            suscripcion: suscripcionActualizada,
        });
    } catch (error) {
        const mensaje =
            error instanceof Error
                ? error.message
                : "Error interno al registrar el pago.";

        return respuestaError(mensaje, 500);
    }
}