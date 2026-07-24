import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type EstadoRegistroClinico = "Activo" | "Inactivo";

export type DoctorSupabase = {
    id: string;
    clinica_id: string;
    nombre: string;
    especialidad: string;
    telefono: string;
    correo: string;
    color: string;
    observaciones: string;
    estado: EstadoRegistroClinico;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type ServicioSupabase = {
    id: string;
    clinica_id: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    duracion_minutos: number;
    precio: number;
    estado: EstadoRegistroClinico;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type FormularioDoctorSupabase = {
    nombre: string;
    especialidad: string;
    telefono: string;
    correo: string;
    color: string;
    observaciones: string;
    estado: EstadoRegistroClinico;
};

export type FormularioServicioSupabase = {
    nombre: string;
    categoria: string;
    descripcion: string;
    duracion_minutos: number;
    precio: number;
    estado: EstadoRegistroClinico;
};

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown, valorInicial = 0) {
    const convertido = Number(valor);

    if (Number.isNaN(convertido)) return valorInicial;

    return convertido;
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

export async function listarDoctoresSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("doctores")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []) as DoctorSupabase[];
}

export async function listarServiciosSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []) as ServicioSupabase[];
}

export async function crearDoctorSupabase(formulario: FormularioDoctorSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const nombre = texto(formulario.nombre);

    if (!nombre) {
        throw new Error("El nombre del doctor es obligatorio.");
    }

    const { data, error } = await supabase
        .from("doctores")
        .insert({
            clinica_id: clinicaId,
            nombre,
            especialidad: texto(formulario.especialidad),
            telefono: texto(formulario.telefono),
            correo: texto(formulario.correo),
            color: texto(formulario.color) || "#0d9488",
            observaciones: texto(formulario.observaciones),
            estado: formulario.estado || "Activo",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as DoctorSupabase;
}

export async function actualizarDoctorSupabase(
    id: string,
    formulario: FormularioDoctorSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const nombre = texto(formulario.nombre);

    if (!nombre) {
        throw new Error("El nombre del doctor es obligatorio.");
    }

    const { data, error } = await supabase
        .from("doctores")
        .update({
            nombre,
            especialidad: texto(formulario.especialidad),
            telefono: texto(formulario.telefono),
            correo: texto(formulario.correo),
            color: texto(formulario.color) || "#0d9488",
            observaciones: texto(formulario.observaciones),
            estado: formulario.estado || "Activo",
        })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as DoctorSupabase;
}

export async function cambiarEstadoDoctorSupabase(
    id: string,
    estado: EstadoRegistroClinico
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("doctores")
        .update({ estado })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as DoctorSupabase;
}

export async function crearServicioSupabase(
    formulario: FormularioServicioSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const nombre = texto(formulario.nombre);

    if (!nombre) {
        throw new Error("El nombre del servicio es obligatorio.");
    }

    const { data, error } = await supabase
        .from("servicios")
        .insert({
            clinica_id: clinicaId,
            nombre,
            categoria: texto(formulario.categoria) || "General",
            descripcion: texto(formulario.descripcion),
            duracion_minutos: Math.max(1, numero(formulario.duracion_minutos, 30)),
            precio: Math.max(0, numero(formulario.precio, 0)),
            estado: formulario.estado || "Activo",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as ServicioSupabase;
}

export async function actualizarServicioSupabase(
    id: string,
    formulario: FormularioServicioSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const nombre = texto(formulario.nombre);

    if (!nombre) {
        throw new Error("El nombre del servicio es obligatorio.");
    }

    const { data, error } = await supabase
        .from("servicios")
        .update({
            nombre,
            categoria: texto(formulario.categoria) || "General",
            descripcion: texto(formulario.descripcion),
            duracion_minutos: Math.max(1, numero(formulario.duracion_minutos, 30)),
            precio: Math.max(0, numero(formulario.precio, 0)),
            estado: formulario.estado || "Activo",
        })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as ServicioSupabase;
}

export async function cambiarEstadoServicioSupabase(
    id: string,
    estado: EstadoRegistroClinico
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("servicios")
        .update({ estado })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as ServicioSupabase;
}