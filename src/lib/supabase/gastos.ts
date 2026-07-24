import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

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

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function horaActualLocal() {
    const fecha = new Date();
    const hours = String(fecha.getHours()).padStart(2, "0");
    const minutes = String(fecha.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

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

export async function crearGastoSupabase(formulario: FormularioGastoSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const fecha = texto(formulario.fecha) || fechaHoyLocal();
    const categoria = texto(formulario.categoria);
    const descripcion = texto(formulario.descripcion);
    const monto = numero(formulario.monto);

    if (!categoria) {
        throw new Error("La categoría del gasto es obligatoria.");
    }

    if (!descripcion) {
        throw new Error("La descripción del gasto es obligatoria.");
    }

    if (monto <= 0) {
        throw new Error("El monto del gasto debe ser mayor que cero.");
    }

    const { data, error } = await supabase
        .from("gastos")
        .insert({
            clinica_id: clinicaId,

            fecha,
            hora: horaActualLocal(),

            categoria,
            descripcion,
            monto,

            metodo_pago: formulario.metodo_pago,
            proveedor: texto(formulario.proveedor),

            usuario_nombre:
                texto(formulario.usuario_nombre) || perfil.nombre || "Usuario no identificado",
            observaciones: texto(formulario.observaciones),

            estado: "Activo",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as GastoSupabase;
}

export async function actualizarGastoSupabase(
    id: string,
    formulario: FormularioGastoSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const categoria = texto(formulario.categoria);
    const descripcion = texto(formulario.descripcion);
    const monto = numero(formulario.monto);

    if (!categoria) {
        throw new Error("La categoría del gasto es obligatoria.");
    }

    if (!descripcion) {
        throw new Error("La descripción del gasto es obligatoria.");
    }

    if (monto <= 0) {
        throw new Error("El monto del gasto debe ser mayor que cero.");
    }

    const { data, error } = await supabase
        .from("gastos")
        .update({
            fecha: texto(formulario.fecha) || fechaHoyLocal(),
            categoria,
            descripcion,
            monto,
            metodo_pago: formulario.metodo_pago,
            proveedor: texto(formulario.proveedor),
            observaciones: texto(formulario.observaciones),
        })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .neq("estado", "Anulado")
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as GastoSupabase;
}

export async function anularGastoSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("gastos")
        .update({ estado: "Anulado" })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as GastoSupabase;
}