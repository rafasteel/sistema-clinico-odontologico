import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import { ejecutarOperacionClinica } from "@/lib/supabase/operaciones";

export type EstadoCierreCajaSupabase = "Cuadrado" | "Con diferencia" | "Anulado";

export type CierreCajaSupabase = {
    id: string;
    clinica_id: string;
    fecha: string;
    hora: string;
    usuario_nombre: string;
    ventas_cantidad: number;
    ventas_brutas: number;
    efectivo_sistema: number;
    tarjeta_sistema: number;
    transferencia_sistema: number;
    credito_generado: number;
    gastos_efectivo: number;
    gastos_tarjeta: number;
    gastos_transferencia: number;
    gastos_total: number;
    comision_pos: number;
    neto_tarjeta: number;
    efectivo_esperado: number;
    efectivo_contado: number;
    tarjeta_esperada: number;
    tarjeta_reportada: number;
    transferencia_esperada: number;
    transferencia_reportada: number;
    diferencia_efectivo: number;
    diferencia_tarjeta: number;
    diferencia_transferencia: number;
    estado: EstadoCierreCajaSupabase;
    observaciones: string;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
    cobros_cantidad: number | null;
    abonos_cobrados: number | null;
    total_cobrado: number | null;
    resumen_version: number;
    motivo_reapertura: string | null;
    reabierto_por: string | null;
    reabierto_en: string | null;
};

export type FormularioCierreCajaSupabase = {
    fecha: string;
    efectivo_contado: number | string;
    tarjeta_reportada: number | string;
    transferencia_reportada: number | string;
    observaciones?: string;
    resumen_esperado?: string;
};

export type ResumenCajaSupabase = Pick<CierreCajaSupabase,
    "fecha" | "ventas_cantidad" | "ventas_brutas" | "efectivo_sistema" | "tarjeta_sistema" |
    "transferencia_sistema" | "credito_generado" | "gastos_efectivo" | "gastos_tarjeta" |
    "gastos_transferencia" | "gastos_total" | "comision_pos" | "neto_tarjeta" |
    "efectivo_esperado" | "tarjeta_esperada" | "transferencia_esperada"
> & { cobros_cantidad: number; abonos_cobrados: number; total_cobrado: number; huella: string };

export async function obtenerResumenCajaSupabase(fecha: string): Promise<ResumenCajaSupabase> {
    const { data, error } = await crearClienteSupabase().rpc("obtener_resumen_caja", { p_fecha: fecha });
    if (error || !data) throw new Error(error?.message || "No se pudo consultar el resumen de caja.");
    return data as ResumenCajaSupabase;
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();

    if (error || !perfil) throw new Error("No se encontró el perfil activo del usuario.");
    if (!perfil.clinica_id) throw new Error("Este usuario no tiene clínica asignada.");

    return { perfil, clinicaId: perfil.clinica_id };
}

export async function listarCierresCajaSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("cierres_caja")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as CierreCajaSupabase[];
}

export async function obtenerCierreCajaPorFechaSupabase(fecha: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("cierres_caja")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("fecha", fecha)
        .neq("estado", "Anulado")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return (data || null) as CierreCajaSupabase | null;
}

export async function crearCierreCajaSupabase(formulario: FormularioCierreCajaSupabase) {
    return ejecutarOperacionClinica<CierreCajaSupabase>("cierre.crear", formulario);
}

export async function reabrirCierreCajaSupabase(id: string, motivo: string) {
    return ejecutarOperacionClinica<CierreCajaSupabase>("cierre.reabrir", { id, motivo });
}
