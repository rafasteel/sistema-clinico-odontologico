import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

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
};

export type FormularioCierreCajaSupabase = {
    fecha: string;
    usuario_nombre?: string;
    ventas_cantidad: number | string;
    ventas_brutas: number | string;
    efectivo_sistema: number | string;
    tarjeta_sistema: number | string;
    transferencia_sistema: number | string;
    credito_generado: number | string;
    gastos_efectivo: number | string;
    gastos_tarjeta: number | string;
    gastos_transferencia: number | string;
    gastos_total: number | string;
    comision_pos: number | string;
    neto_tarjeta: number | string;
    efectivo_esperado: number | string;
    efectivo_contado: number | string;
    tarjeta_esperada: number | string;
    tarjeta_reportada: number | string;
    transferencia_esperada: number | string;
    transferencia_reportada: number | string;
    diferencia_efectivo: number | string;
    diferencia_tarjeta: number | string;
    diferencia_transferencia: number | string;
    estado: EstadoCierreCajaSupabase;
    observaciones?: string;
};

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);
    if (Number.isNaN(convertido)) return 0;
    return convertido;
}

function horaActualLocal() {
    const fecha = new Date();
    return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
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
        .maybeSingle();

    if (error) throw new Error(error.message);
    return (data || null) as CierreCajaSupabase | null;
}

export async function crearCierreCajaSupabase(formulario: FormularioCierreCajaSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const fecha = texto(formulario.fecha);
    if (!fecha) throw new Error("La fecha del cierre es obligatoria.");

    const existente = await obtenerCierreCajaPorFechaSupabase(fecha);
    if (existente && existente.estado !== "Anulado") {
        throw new Error("Ya existe un cierre registrado para esta fecha.");
    }

    const { data, error } = await supabase
        .from("cierres_caja")
        .insert({
            clinica_id: clinicaId,
            fecha,
            hora: horaActualLocal(),
            usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "Usuario no identificado",
            ventas_cantidad: Math.max(0, Math.round(numero(formulario.ventas_cantidad))),
            ventas_brutas: numero(formulario.ventas_brutas),
            efectivo_sistema: numero(formulario.efectivo_sistema),
            tarjeta_sistema: numero(formulario.tarjeta_sistema),
            transferencia_sistema: numero(formulario.transferencia_sistema),
            credito_generado: numero(formulario.credito_generado),
            gastos_efectivo: numero(formulario.gastos_efectivo),
            gastos_tarjeta: numero(formulario.gastos_tarjeta),
            gastos_transferencia: numero(formulario.gastos_transferencia),
            gastos_total: numero(formulario.gastos_total),
            comision_pos: numero(formulario.comision_pos),
            neto_tarjeta: numero(formulario.neto_tarjeta),
            efectivo_esperado: numero(formulario.efectivo_esperado),
            efectivo_contado: numero(formulario.efectivo_contado),
            tarjeta_esperada: numero(formulario.tarjeta_esperada),
            tarjeta_reportada: numero(formulario.tarjeta_reportada),
            transferencia_esperada: numero(formulario.transferencia_esperada),
            transferencia_reportada: numero(formulario.transferencia_reportada),
            diferencia_efectivo: numero(formulario.diferencia_efectivo),
            diferencia_tarjeta: numero(formulario.diferencia_tarjeta),
            diferencia_transferencia: numero(formulario.diferencia_transferencia),
            estado: formulario.estado,
            observaciones: texto(formulario.observaciones),
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return data as CierreCajaSupabase;
}

export async function anularCierreCajaSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("cierres_caja")
        .update({ estado: "Anulado" })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return data as CierreCajaSupabase;
}