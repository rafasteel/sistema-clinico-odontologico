import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type EstadoRegistroClinico = "Activo" | "Inactivo";

export type SexoPaciente =
    | "Masculino"
    | "Femenino"
    | "Otro"
    | "No especificado";

export type PacienteSupabase = {
    id: string;
    clinica_id: string;

    codigo: string;
    nombre: string;
    cedula: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    fecha_nacimiento: string | null;
    edad: number;
    sexo: SexoPaciente;
    direccion: string;
    ocupacion: string;

    alergias: string;
    antecedentes: string;
    medicamentos_actuales: string;
    enfermedades_sistemicas: string;
    observaciones: string;

    estado: EstadoRegistroClinico;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type FormularioPacienteSupabase = {
    codigo?: string;
    nombre: string;
    cedula?: string;
    telefono?: string;
    whatsapp?: string;
    correo?: string;
    fecha_nacimiento?: string;
    edad?: number | string;
    sexo?: SexoPaciente;
    direccion?: string;
    ocupacion?: string;

    alergias?: string;
    antecedentes?: string;
    medicamentos_actuales?: string;
    enfermedades_sistemicas?: string;
    observaciones?: string;

    estado?: EstadoRegistroClinico;
};

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown, valorInicial = 0) {
    const convertido = Number(valor);

    if (Number.isNaN(convertido)) return valorInicial;

    return convertido;
}

function fechaONull(valor: unknown) {
    const fecha = texto(valor);

    if (!fecha) return null;

    return fecha;
}

function codigoPacienteAutomatico() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 9000) + 1000;

    return `PAC-${year}${month}${day}-${random}`;
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

export async function listarPacientesSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("creado_en", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as PacienteSupabase[];
}

export async function obtenerPacienteSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .single();

    if (error) throw new Error(error.message);

    return data as PacienteSupabase;
}

export async function crearPacienteSupabase(formulario: FormularioPacienteSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const nombre = texto(formulario.nombre);

    if (!nombre) {
        throw new Error("El nombre del paciente es obligatorio.");
    }

    const { data, error } = await supabase
        .from("pacientes")
        .insert({
            clinica_id: clinicaId,

            codigo: texto(formulario.codigo) || codigoPacienteAutomatico(),
            nombre,
            cedula: texto(formulario.cedula),
            telefono: texto(formulario.telefono),
            whatsapp: texto(formulario.whatsapp),
            correo: texto(formulario.correo),
            fecha_nacimiento: fechaONull(formulario.fecha_nacimiento),
            edad: Math.max(0, numero(formulario.edad, 0)),
            sexo: formulario.sexo || "No especificado",
            direccion: texto(formulario.direccion),
            ocupacion: texto(formulario.ocupacion),

            alergias: texto(formulario.alergias),
            antecedentes: texto(formulario.antecedentes),
            medicamentos_actuales: texto(formulario.medicamentos_actuales),
            enfermedades_sistemicas: texto(formulario.enfermedades_sistemicas),
            observaciones: texto(formulario.observaciones),

            estado: formulario.estado || "Activo",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as PacienteSupabase;
}

export async function actualizarPacienteSupabase(
    id: string,
    formulario: FormularioPacienteSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const nombre = texto(formulario.nombre);

    if (!nombre) {
        throw new Error("El nombre del paciente es obligatorio.");
    }

    const { data, error } = await supabase
        .from("pacientes")
        .update({
            codigo: texto(formulario.codigo),
            nombre,
            cedula: texto(formulario.cedula),
            telefono: texto(formulario.telefono),
            whatsapp: texto(formulario.whatsapp),
            correo: texto(formulario.correo),
            fecha_nacimiento: fechaONull(formulario.fecha_nacimiento),
            edad: Math.max(0, numero(formulario.edad, 0)),
            sexo: formulario.sexo || "No especificado",
            direccion: texto(formulario.direccion),
            ocupacion: texto(formulario.ocupacion),

            alergias: texto(formulario.alergias),
            antecedentes: texto(formulario.antecedentes),
            medicamentos_actuales: texto(formulario.medicamentos_actuales),
            enfermedades_sistemicas: texto(formulario.enfermedades_sistemicas),
            observaciones: texto(formulario.observaciones),

            estado: formulario.estado || "Activo",
        })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as PacienteSupabase;
}

export async function cambiarEstadoPacienteSupabase(
    id: string,
    estado: EstadoRegistroClinico
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("pacientes")
        .update({ estado })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as PacienteSupabase;
}