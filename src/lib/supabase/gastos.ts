import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import { ejecutarOperacionClinica } from "@/lib/supabase/operaciones";

export type MetodoGastoSupabase =
    | "Efectivo"
    | "Tarjeta"
    | "Transferencia"
    | "Cheque"
    | "Crédito";

export type EstadoGastoSupabase = "Activo" | "Anulado";

export type GastoSupabase = {
    id: string;
    clinica_id: string;

    fecha: string;
    hora: string;

    categoria: string;
    descripcion: string;
    monto: number;

    metodo_pago: MetodoGastoSupabase;
    proveedor: string;

    usuario_nombre: string;
    observaciones: string;

    estado: EstadoGastoSupabase;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type FormularioGastoSupabase = {
    fecha: string;
    categoria: string;
    descripcion: string;
    monto: number | string;
    metodo_pago: MetodoGastoSupabase;
    proveedor?: string;
    observaciones?: string;
    usuario_nombre?: string;
};

function siguienteMes(mes: string) {
    const [year, month] = mes.split("-").map(Number);
    const fecha = new Date(year, month, 1);

    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
        2,
        "0"
    )}-01`;
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();

    if (error || !perfil) {
        throw new Error("No se encontró el perfil activo del usuario.");
    }

    if (!perfil.clinica_id) {
        throw new Error("Este usuario no tiene clínica asignada.");
    }

    return {
        perfil,
        clinicaId: perfil.clinica_id,
    };
}

export async function listarGastosSupabase(mes?: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    let consulta = supabase
        .from("gastos")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (mes) {
        consulta = consulta.gte("fecha", `${mes}-01`).lt("fecha", siguienteMes(mes));
    }

    const { data, error } = await consulta;

    if (error) throw new Error(error.message);

    return (data || []) as GastoSupabase[];
}

export async function listarGastosPorFechaSupabase(fecha: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("gastos")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("fecha", fecha)
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as GastoSupabase[];
}

export async function crearGastoSupabase(formulario: FormularioGastoSupabase) { return ejecutarOperacionClinica<GastoSupabase>("gasto.crear", formulario); }

export async function actualizarGastoSupabase(id: string, formulario: FormularioGastoSupabase) { return ejecutarOperacionClinica<GastoSupabase>("gasto.actualizar", { ...formulario, id }); }

export async function anularGastoSupabase(id: string) { return ejecutarOperacionClinica<GastoSupabase>("gasto.anular", { id }); }
