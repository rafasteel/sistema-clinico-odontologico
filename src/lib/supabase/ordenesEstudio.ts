import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type EstadoOrdenEstudioSupabase = "Activa" | "Anulada";

export type OrdenEstudioSupabase = {
    id: string;
    clinica_id: string;
    paciente_id: string;

    paciente_nombre: string;
    fecha: string;
    hora: string;

    doctor: string;
    tipo_estudio: string;
    zona: string;
    motivo: string;
    indicaciones: string;

    estado: EstadoOrdenEstudioSupabase;
    usuario_nombre: string;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type FormularioOrdenEstudioSupabase = {
    paciente_id: string;
    fecha?: string;
    hora?: string;
    doctor: string;
    tipo_estudio: string;
    zona: string;
    motivo: string;
    indicaciones: string;
};

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

function limpiarTexto(valor: unknown, respaldo = "") {
    const convertido = String(valor ?? "").trim();

    return convertido || respaldo;
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

async function obtenerNombrePaciente(pacienteId: string) {
    const supabase = crearClienteSupabase();

    const { data, error } = await supabase
        .from("pacientes")
        .select("nombre")
        .eq("id", pacienteId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return limpiarTexto(data?.nombre, "Paciente no especificado");
}

function validarFormulario(formulario: FormularioOrdenEstudioSupabase) {
    if (!limpiarTexto(formulario.paciente_id)) {
        throw new Error("No se recibió el paciente para la orden de estudio.");
    }

    if (!limpiarTexto(formulario.tipo_estudio)) {
        throw new Error("Indicá el tipo de estudio solicitado.");
    }

    if (!limpiarTexto(formulario.zona)) {
        throw new Error("Indicá la zona o piezas dentales del estudio.");
    }

    if (!limpiarTexto(formulario.motivo)) {
        throw new Error("Indicá el motivo clínico de la orden.");
    }
}

export async function listarOrdenesEstudioSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("ordenes_estudio")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as OrdenEstudioSupabase[];
}

export async function listarOrdenesEstudioPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("ordenes_estudio")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as OrdenEstudioSupabase[];
}

export async function obtenerOrdenEstudioSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("ordenes_estudio")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("id", id)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return (data || null) as OrdenEstudioSupabase | null;
}

export async function crearOrdenEstudioSupabase(
    formulario: FormularioOrdenEstudioSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    validarFormulario(formulario);

    const pacienteNombre = await obtenerNombrePaciente(formulario.paciente_id);

    const { data, error } = await supabase
        .from("ordenes_estudio")
        .insert({
            clinica_id: clinicaId,
            paciente_id: formulario.paciente_id,
            paciente_nombre: pacienteNombre,
            fecha: formulario.fecha || fechaHoyLocal(),
            hora: formulario.hora || horaActualLocal(),
            doctor: limpiarTexto(formulario.doctor, "Doctor no especificado"),
            tipo_estudio: limpiarTexto(formulario.tipo_estudio),
            zona: limpiarTexto(formulario.zona),
            motivo: limpiarTexto(formulario.motivo),
            indicaciones: limpiarTexto(
                formulario.indicaciones,
                "Favor entregar imagen y reporte para valoración clínica."
            ),
            estado: "Activa",
            usuario_nombre: limpiarTexto(perfil.nombre, "Usuario no identificado"),
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as OrdenEstudioSupabase;
}

export async function actualizarOrdenEstudioSupabase(
    id: string,
    formulario: FormularioOrdenEstudioSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    validarFormulario(formulario);

    const { data, error } = await supabase
        .from("ordenes_estudio")
        .update({
            fecha: formulario.fecha || fechaHoyLocal(),
            hora: formulario.hora || horaActualLocal(),
            doctor: limpiarTexto(formulario.doctor, "Doctor no especificado"),
            tipo_estudio: limpiarTexto(formulario.tipo_estudio),
            zona: limpiarTexto(formulario.zona),
            motivo: limpiarTexto(formulario.motivo),
            indicaciones: limpiarTexto(
                formulario.indicaciones,
                "Favor entregar imagen y reporte para valoración clínica."
            ),
        })
        .eq("clinica_id", clinicaId)
        .eq("id", id)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as OrdenEstudioSupabase;
}

export async function anularOrdenEstudioSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { error } = await supabase
        .from("ordenes_estudio")
        .update({ estado: "Anulada" })
        .eq("clinica_id", clinicaId)
        .eq("id", id);

    if (error) throw new Error(error.message);
}