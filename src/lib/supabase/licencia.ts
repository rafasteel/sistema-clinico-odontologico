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

export async function verificarLicenciaClinica(): Promise<LicenciaClinica> {
    const denegar = (mensaje: string, estadoAcceso: EstadoAccesoClinica = "Error"): LicenciaClinica => ({
        permitido: false, estadoAcceso, perfil: null, clinica: null, suscripcion: null, mensaje,
    });
    try {
        const { perfil, error } = await obtenerPerfilActual();
        if (error || !perfil || perfil.estado !== "Activo") {
            return denegar("No se encontró un perfil activo para este usuario.", "SinPerfil");
        }
        // La base decide usando la fecha del servidor, incluso si el navegador
        // cambia su reloj o la clínica está marcada Vencida/Restringida.
        const { data, error: errorAcceso } = await crearClienteSupabase()
            .rpc("verificar_acceso_clinica");
        if (errorAcceso || !data || typeof data.permitido !== "boolean") {
            return denegar("No se pudo verificar la licencia de la clínica.");
        }
        return { ...(data as Omit<LicenciaClinica, "perfil">), perfil };
    } catch (error) {
        return denegar(error instanceof Error ? error.message : "No se pudo verificar la licencia.");
    }
}
