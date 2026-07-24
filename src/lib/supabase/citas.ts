import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type EstadoCitaSupabase =
    | "Programada"
    | "Confirmada"
    | "En espera"
    | "En atención"
    | "Atendida"
    | "Cobrada"
    | "Reagendada"
    | "Cancelada"
    | "No asistió";

export type CitaSupabase = {
    id: string;
    clinica_id: string;

    paciente_id: string | null;
    doctor_id: string | null;
    servicio_id: string | null;

    paciente_nombre: string;
    doctor_nombre: string;
    servicio_nombre: string;

    fecha: string;
    hora: string;
    duracion_minutos: number;
    costo: number;

    estado: EstadoCitaSupabase;
    observaciones: string;

    recurrencia: string;
    cita_origen_id: string | null;

    tratamiento_id: string | null;
    presupuesto_id: string | null;

    confirmacion_token: string | null;
    confirmada_en: string | null;
    recordatorio_enviado_en: string | null;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type FormularioCitaSupabase = {
    paciente_id?: string | null;
    doctor_id?: string | null;
    servicio_id?: string | null;

    paciente_nombre: string;
    doctor_nombre: string;
    servicio_nombre: string;

    fecha: string;
    hora: string;
    duracion_minutos?: number | string;
    costo?: number | string;

    estado?: EstadoCitaSupabase;
    observaciones?: string;

    recurrencia?: string;
    cantidad_repeticiones?: number | string;

    tratamiento_id?: string | null;
    presupuesto_id?: string | null;
};

export type ActualizarCitaSupabase = Partial<FormularioCitaSupabase>;

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown, valorInicial = 0) {
    const convertido = Number(valor);

    if (Number.isNaN(convertido)) return valorInicial;

    return convertido;
}

function fechaValida(fecha: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

function sumarDias(fechaISO: string, dias: number) {
    const fecha = new Date(`${fechaISO}T12:00:00`);

    fecha.setDate(fecha.getDate() + dias);

    return fecha.toISOString().slice(0, 10);
}

function sumarMeses(fechaISO: string, meses: number) {
    const fecha = new Date(`${fechaISO}T12:00:00`);

    fecha.setMonth(fecha.getMonth() + meses);

    return fecha.toISOString().slice(0, 10);
}

function generarTokenConfirmacion() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `confirmar-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generarFechasRecurrencia(
    fechaInicial: string,
    recurrencia = "No repetir",
    cantidad = 1
) {
    const total = Math.max(1, Math.min(60, Math.round(Number(cantidad || 1))));

    if (!fechaValida(fechaInicial)) {
        throw new Error("La fecha de la cita no es válida.");
    }

    const fechas: string[] = [];

    if (recurrencia === "Semanal") {
        for (let index = 0; index < total; index++) {
            fechas.push(sumarDias(fechaInicial, index * 7));
        }

        return fechas;
    }

    if (recurrencia === "Quincenal") {
        for (let index = 0; index < total; index++) {
            fechas.push(sumarDias(fechaInicial, index * 14));
        }

        return fechas;
    }

    if (recurrencia === "Mensual") {
        for (let index = 0; index < total; index++) {
            fechas.push(sumarMeses(fechaInicial, index));
        }

        return fechas;
    }

    return [fechaInicial];
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

export async function listarCitasSupabase(fechaInicio?: string, fechaFin?: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    let consulta = supabase
        .from("citas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });

    if (fechaInicio) {
        consulta = consulta.gte("fecha", fechaInicio);
    }

    if (fechaFin) {
        consulta = consulta.lte("fecha", fechaFin);
    }

    const { data, error } = await consulta;

    if (error) throw new Error(error.message);

    return (data || []) as CitaSupabase[];
}

export async function listarCitasPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("citas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as CitaSupabase[];
}

export async function obtenerCitaSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("citas")
        .select("*")
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .single();

    if (error) throw new Error(error.message);

    return data as CitaSupabase;
}

export async function crearCitasSupabase(formulario: FormularioCitaSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const pacienteNombre = texto(formulario.paciente_nombre);
    const doctorNombre = texto(formulario.doctor_nombre);
    const servicioNombre = texto(formulario.servicio_nombre);
    const fecha = texto(formulario.fecha);
    const hora = texto(formulario.hora);

    if (!pacienteNombre) {
        throw new Error("El paciente es obligatorio.");
    }

    if (!doctorNombre) {
        throw new Error("El doctor es obligatorio.");
    }

    if (!servicioNombre) {
        throw new Error("El servicio es obligatorio.");
    }

    if (!fechaValida(fecha)) {
        throw new Error("La fecha de la cita no es válida.");
    }

    if (!hora) {
        throw new Error("La hora de la cita es obligatoria.");
    }

    const recurrencia = texto(formulario.recurrencia) || "No repetir";
    const cantidadRepeticiones =
        recurrencia === "No repetir"
            ? 1
            : numero(formulario.cantidad_repeticiones, 12);

    const fechas = generarFechasRecurrencia(
        fecha,
        recurrencia,
        cantidadRepeticiones
    );

    const registros = fechas.map((fechaCita, index) => ({
        clinica_id: clinicaId,
        paciente_id: formulario.paciente_id || null,
        doctor_id: formulario.doctor_id || null,
        servicio_id: formulario.servicio_id || null,

        paciente_nombre: pacienteNombre,
        doctor_nombre: doctorNombre,
        servicio_nombre: servicioNombre,

        fecha: fechaCita,
        hora,
        duracion_minutos: Math.max(1, numero(formulario.duracion_minutos, 30)),
        costo: Math.max(0, numero(formulario.costo, 0)),

        estado: formulario.estado || "Programada",
        observaciones: texto(formulario.observaciones),

        recurrencia,
        cita_origen_id: null,

        tratamiento_id: formulario.tratamiento_id || null,
        presupuesto_id: formulario.presupuesto_id || null,

        confirmacion_token: generarTokenConfirmacion(),
        creado_por: perfil.id,
        _orden: index,
    }));

    const registrosInsertar = registros.map(({ _orden, ...registro }) => registro);

    const { data, error } = await supabase
        .from("citas")
        .insert(registrosInsertar)
        .select("*");

    if (error) throw new Error(error.message);

    const citasCreadas = (data || []) as CitaSupabase[];

    if (citasCreadas.length > 1) {
        const primeraCita = citasCreadas[0];

        await supabase
            .from("citas")
            .update({ cita_origen_id: primeraCita.id })
            .neq("id", primeraCita.id)
            .in(
                "id",
                citasCreadas.slice(1).map((cita) => cita.id)
            );
    }

    return citasCreadas;
}

export async function actualizarCitaSupabase(
    id: string,
    formulario: ActualizarCitaSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const cambios: Record<string, unknown> = {};

    if (formulario.paciente_id !== undefined) {
        cambios.paciente_id = formulario.paciente_id || null;
    }

    if (formulario.doctor_id !== undefined) {
        cambios.doctor_id = formulario.doctor_id || null;
    }

    if (formulario.servicio_id !== undefined) {
        cambios.servicio_id = formulario.servicio_id || null;
    }

    if (formulario.paciente_nombre !== undefined) {
        cambios.paciente_nombre = texto(formulario.paciente_nombre);
    }

    if (formulario.doctor_nombre !== undefined) {
        cambios.doctor_nombre = texto(formulario.doctor_nombre);
    }

    if (formulario.servicio_nombre !== undefined) {
        cambios.servicio_nombre = texto(formulario.servicio_nombre);
    }

    if (formulario.fecha !== undefined) {
        if (!fechaValida(formulario.fecha)) {
            throw new Error("La fecha de la cita no es válida.");
        }

        cambios.fecha = formulario.fecha;
    }

    if (formulario.hora !== undefined) {
        cambios.hora = formulario.hora;
    }

    if (formulario.duracion_minutos !== undefined) {
        cambios.duracion_minutos = Math.max(
            1,
            numero(formulario.duracion_minutos, 30)
        );
    }

    if (formulario.costo !== undefined) {
        cambios.costo = Math.max(0, numero(formulario.costo, 0));
    }

    if (formulario.estado !== undefined) {
        cambios.estado = formulario.estado;
    }

    if (formulario.observaciones !== undefined) {
        cambios.observaciones = texto(formulario.observaciones);
    }

    if (formulario.recurrencia !== undefined) {
        cambios.recurrencia = texto(formulario.recurrencia) || "No repetir";
    }

    if (formulario.tratamiento_id !== undefined) {
        cambios.tratamiento_id = formulario.tratamiento_id || null;
    }

    if (formulario.presupuesto_id !== undefined) {
        cambios.presupuesto_id = formulario.presupuesto_id || null;
    }

    const { data, error } = await supabase
        .from("citas")
        .update(cambios)
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as CitaSupabase;
}

export async function cambiarEstadoCitaSupabase(
    id: string,
    estado: EstadoCitaSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const cambios: Record<string, unknown> = { estado };

    if (estado === "Confirmada") {
        cambios.confirmada_en = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from("citas")
        .update(cambios)
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as CitaSupabase;
}

export async function reagendarCitaSupabase(
    id: string,
    fecha: string,
    hora: string,
    observaciones?: string
) {
    return actualizarCitaSupabase(id, {
        fecha,
        hora,
        estado: "Reagendada",
        observaciones,
    });
}

export async function cancelarCitaSupabase(id: string, observaciones?: string) {
    return actualizarCitaSupabase(id, {
        estado: "Cancelada",
        observaciones,
    });
}