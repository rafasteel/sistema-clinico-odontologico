import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type EstadoNotaClinica = "Activa" | "Anulada";
export type EstadoTratamiento =
    | "Planificado"
    | "En proceso"
    | "Completado"
    | "Suspendido";
export type EstadoReceta = "Activa" | "Anulada";

export type NotaClinicaSupabase = {
    id: string;
    clinica_id: string;
    paciente_id: string;
    fecha: string;
    hora: string;
    doctor_id: string | null;
    doctor_nombre: string;
    servicio_id: string | null;
    servicio_nombre: string;
    diagnostico: string;
    procedimiento: string;
    observaciones: string;
    proxima_cita: string | null;
    estado: EstadoNotaClinica;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type TratamientoSupabase = {
    id: string;
    clinica_id: string;
    paciente_id: string;
    fecha: string;
    nombre: string;
    descripcion: string;
    total: number;
    abonado: number;
    estado: EstadoTratamiento;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type RecetaSupabase = {
    id: string;
    clinica_id: string;
    paciente_id: string;
    fecha: string;
    hora: string;
    doctor_id: string | null;
    doctor_nombre: string;
    diagnostico: string;
    medicamento: string;
    indicaciones: string;
    duracion: string;
    observaciones: string;
    estado: EstadoReceta;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type FormularioNotaClinicaSupabase = {
    paciente_id: string;
    doctor_id?: string | null;
    doctor_nombre: string;
    servicio_id?: string | null;
    servicio_nombre?: string;
    diagnostico: string;
    procedimiento: string;
    observaciones?: string;
    proxima_cita?: string;
};

export type FormularioTratamientoSupabase = {
    paciente_id: string;
    nombre: string;
    descripcion?: string;
    total?: number | string;
    abonado?: number | string;
    estado?: EstadoTratamiento;
};

export type FormularioRecetaSupabase = {
    paciente_id: string;
    doctor_id?: string | null;
    doctor_nombre: string;
    diagnostico?: string;
    medicamento: string;
    indicaciones: string;
    duracion?: string;
    observaciones?: string;
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

export async function listarNotasClinicasPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("notas_clinicas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as NotaClinicaSupabase[];
}

export async function crearNotaClinicaSupabase(
    formulario: FormularioNotaClinicaSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const pacienteId = texto(formulario.paciente_id);
    const doctorNombre = texto(formulario.doctor_nombre);
    const diagnostico = texto(formulario.diagnostico);
    const procedimiento = texto(formulario.procedimiento);

    if (!pacienteId) {
        throw new Error("No se recibió el paciente.");
    }

    if (!doctorNombre) {
        throw new Error("Indica el doctor que atendió.");
    }

    if (!diagnostico) {
        throw new Error("El diagnóstico es obligatorio.");
    }

    if (!procedimiento) {
        throw new Error("El procedimiento realizado es obligatorio.");
    }

    const { data, error } = await supabase
        .from("notas_clinicas")
        .insert({
            clinica_id: clinicaId,
            paciente_id: pacienteId,
            doctor_id: formulario.doctor_id || null,
            doctor_nombre: doctorNombre,
            servicio_id: formulario.servicio_id || null,
            servicio_nombre: texto(formulario.servicio_nombre),
            diagnostico,
            procedimiento,
            observaciones: texto(formulario.observaciones),
            proxima_cita: fechaONull(formulario.proxima_cita),
            estado: "Activa",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as NotaClinicaSupabase;
}

export async function anularNotaClinicaSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("notas_clinicas")
        .update({ estado: "Anulada" })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as NotaClinicaSupabase;
}

export async function listarTratamientosPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("tratamientos")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("creado_en", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as TratamientoSupabase[];
}

export async function crearTratamientoSupabase(
    formulario: FormularioTratamientoSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const pacienteId = texto(formulario.paciente_id);
    const nombre = texto(formulario.nombre);
    const total = Math.max(0, numero(formulario.total, 0));
    const abonado = Math.max(0, numero(formulario.abonado, 0));

    if (!pacienteId) {
        throw new Error("No se recibió el paciente.");
    }

    if (!nombre) {
        throw new Error("El nombre del tratamiento es obligatorio.");
    }

    if (abonado > total) {
        throw new Error("El abonado no puede ser mayor que el total.");
    }

    const { data, error } = await supabase
        .from("tratamientos")
        .insert({
            clinica_id: clinicaId,
            paciente_id: pacienteId,
            nombre,
            descripcion: texto(formulario.descripcion),
            total,
            abonado,
            estado: formulario.estado || "Planificado",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as TratamientoSupabase;
}

export async function cambiarEstadoTratamientoSupabase(
    id: string,
    estado: EstadoTratamiento
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("tratamientos")
        .update({ estado })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as TratamientoSupabase;
}

export async function listarRecetasPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("recetas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as RecetaSupabase[];
}

export async function crearRecetaSupabase(formulario: FormularioRecetaSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const pacienteId = texto(formulario.paciente_id);
    const doctorNombre = texto(formulario.doctor_nombre);
    const medicamento = texto(formulario.medicamento);
    const indicaciones = texto(formulario.indicaciones);

    if (!pacienteId) {
        throw new Error("No se recibió el paciente.");
    }

    if (!doctorNombre) {
        throw new Error("Indica el doctor que receta.");
    }

    if (!medicamento) {
        throw new Error("El medicamento es obligatorio.");
    }

    if (!indicaciones) {
        throw new Error("Las indicaciones son obligatorias.");
    }

    const { data, error } = await supabase
        .from("recetas")
        .insert({
            clinica_id: clinicaId,
            paciente_id: pacienteId,
            doctor_id: formulario.doctor_id || null,
            doctor_nombre: doctorNombre,
            diagnostico: texto(formulario.diagnostico),
            medicamento,
            indicaciones,
            duracion: texto(formulario.duracion),
            observaciones: texto(formulario.observaciones),
            estado: "Activa",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as RecetaSupabase;
}

export async function anularRecetaSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("recetas")
        .update({ estado: "Anulada" })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as RecetaSupabase;
}