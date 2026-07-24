import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual, type PerfilUsuarioSupabase } from "@/lib/supabase/perfil";

export type EstadoAccesoClinica =
    | "Permitido"
    | "Vencido"
    | "Restringido"
    | "Suspendido"
    | "Cancelado"
    | "SinPerfil"
    | "SinClinica"
    | "Error";

export type LicenciaClinica = {
    permitido: boolean;
    estadoAcceso: EstadoAccesoClinica;
    perfil: PerfilUsuarioSupabase | null;
    clinica: {
        id: string;
        nombre: string;
        estado: string;
        plan: string;
        fecha_vencimiento: string | null;
        dias_gracia: number | null;
    } | null;
    suscripcion: {
        id: string;
        estado: string;
        plan: string;
        fecha_vencimiento: string | null;
        dias_gracia: number | null;
        precio_mensual: number | null;
        moneda: string | null;
    } | null;
    mensaje: string;
};

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function estaVencida(fechaVencimiento?: string | null) {
    if (!fechaVencimiento) return false;

    return fechaVencimiento < fechaHoyLocal();
}

function diasDiferenciaDesdeHoy(fecha?: string | null) {
    if (!fecha) return 0;

    const hoy = new Date(`${fechaHoyLocal()}T12:00:00`);
    const fechaBase = new Date(`${fecha}T12:00:00`);

    if (Number.isNaN(hoy.getTime()) || Number.isNaN(fechaBase.getTime())) {
        return 0;
    }

    const diferencia = hoy.getTime() - fechaBase.getTime();

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

export async function verificarLicenciaClinica(): Promise<LicenciaClinica> {
    try {
        const supabase = crearClienteSupabase();
        const { perfil, error } = await obtenerPerfilActual();

        if (error || !perfil) {
            return {
                permitido: false,
                estadoAcceso: "SinPerfil",
                perfil: null,
                clinica: null,
                suscripcion: null,
                mensaje: "No se encontró un perfil activo para este usuario.",
            };
        }

        if (perfil.rol === "SUPER_ADMIN") {
            return {
                permitido: true,
                estadoAcceso: "Permitido",
                perfil,
                clinica: null,
                suscripcion: null,
                mensaje: "Acceso SUPER_ADMIN permitido.",
            };
        }

        if (!perfil.clinica_id) {
            return {
                permitido: false,
                estadoAcceso: "SinClinica",
                perfil,
                clinica: null,
                suscripcion: null,
                mensaje: "Este usuario no tiene clínica asignada.",
            };
        }

        const { data: clinica, error: errorClinica } = await supabase
            .from("clinicas")
            .select("id, nombre, estado, plan, fecha_vencimiento, dias_gracia")
            .eq("id", perfil.clinica_id)
            .single();

        if (errorClinica || !clinica) {
            return {
                permitido: false,
                estadoAcceso: "SinClinica",
                perfil,
                clinica: null,
                suscripcion: null,
                mensaje: "No se encontró la clínica asignada a este usuario.",
            };
        }

        const { data: suscripciones, error: errorSuscripciones } = await supabase
            .from("suscripciones")
            .select(
                "id, estado, plan, fecha_vencimiento, dias_gracia, precio_mensual, moneda"
            )
            .eq("clinica_id", perfil.clinica_id)
            .order("creada_en", { ascending: false })
            .limit(1);

        if (errorSuscripciones) {
            return {
                permitido: false,
                estadoAcceso: "Error",
                perfil,
                clinica,
                suscripcion: null,
                mensaje: errorSuscripciones.message,
            };
        }

        const suscripcion = suscripciones?.[0] || null;
        const estadoClinica = clinica.estado;
        const estadoSuscripcion = suscripcion?.estado || "Activa";
        const fechaVencimiento =
            suscripcion?.fecha_vencimiento || clinica.fecha_vencimiento;
        const diasGracia =
            Number(suscripcion?.dias_gracia ?? clinica.dias_gracia ?? 7) || 7;

        if (estadoClinica === "Cancelada" || estadoSuscripcion === "Cancelada") {
            return {
                permitido: false,
                estadoAcceso: "Cancelado",
                perfil,
                clinica,
                suscripcion,
                mensaje: "La cuenta de esta clínica fue cancelada.",
            };
        }

        if (estadoClinica === "Suspendida" || estadoSuscripcion === "Suspendida") {
            return {
                permitido: false,
                estadoAcceso: "Suspendido",
                perfil,
                clinica,
                suscripcion,
                mensaje:
                    "La cuenta de esta clínica está suspendida por pago pendiente o decisión administrativa.",
            };
        }

        if (estadoClinica === "Restringida" || estadoSuscripcion === "Restringida") {
            return {
                permitido: true,
                estadoAcceso: "Restringido",
                perfil,
                clinica,
                suscripcion,
                mensaje:
                    "La cuenta está en modo restringido. Se recomienda regularizar el pago.",
            };
        }

        if (estadoClinica === "Vencida" || estadoSuscripcion === "Vencida") {
            return {
                permitido: true,
                estadoAcceso: "Vencido",
                perfil,
                clinica,
                suscripcion,
                mensaje:
                    "La suscripción está vencida. El sistema seguirá disponible durante el período de gracia.",
            };
        }

        if (estaVencida(fechaVencimiento)) {
            const diasVencida = diasDiferenciaDesdeHoy(fechaVencimiento);

            if (diasVencida > diasGracia) {
                return {
                    permitido: false,
                    estadoAcceso: "Suspendido",
                    perfil,
                    clinica,
                    suscripcion,
                    mensaje:
                        "La suscripción superó el período de gracia y el acceso fue suspendido.",
                };
            }

            return {
                permitido: true,
                estadoAcceso: "Vencido",
                perfil,
                clinica,
                suscripcion,
                mensaje: `La suscripción está vencida hace ${diasVencida} día(s).`,
            };
        }

        return {
            permitido: true,
            estadoAcceso: "Permitido",
            perfil,
            clinica,
            suscripcion,
            mensaje: "Acceso permitido.",
        };
    } catch (error) {
        const mensaje =
            error instanceof Error
                ? error.message
                : "No se pudo verificar la licencia de la clínica.";

        return {
            permitido: false,
            estadoAcceso: "Error",
            perfil: null,
            clinica: null,
            suscripcion: null,
            mensaje,
        };
    }
}