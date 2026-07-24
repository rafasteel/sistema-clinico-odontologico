"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    Activity,
    BadgeDollarSign,
    Calendar,
    CalendarCheck,
    CalendarClock,
    CheckCircle2,
    Clock,
    CreditCard,
    Edit3,
    Filter,
    Plus,
    RefreshCcw,
    Search,
    ShieldAlert,
    Stethoscope,
    Trash2,
    UserRound,
    XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import {
    listarPacientesSupabase,
    type PacienteSupabase,
} from "@/lib/supabase/pacientes";
import {
    listarDoctoresSupabase,
    listarServiciosSupabase,
    type DoctorSupabase,
    type ServicioSupabase,
} from "@/lib/supabase/doctoresServicios";
import {
    actualizarCitaSupabase,
    cambiarEstadoCitaSupabase,
    crearCitasSupabase,
    listarCitasSupabase,
    type CitaSupabase,
    type EstadoCitaSupabase,
} from "@/lib/supabase/citas";

type Paciente = {
    id: string;
    nombre: string;
    telefono: string;
    cedula: string;
    fechaNacimiento: string;
    direccion: string;
    alergias: string;
    enfermedades: string;
    medicamentos: string;
    observaciones: string;
    estado: "Activo" | "Inactivo";
    saldoPendiente: number;
    ultimaCita: string;
};

type Doctor = {
    id: string;
    nombre: string;
    especialidad: string;
    telefono: string;
    correo: string;
    horario: string;
    estado: "Activo" | "Inactivo";
};

type Servicio = {
    id: string;
    nombre: string;
    categoria: string;
    duracionMinutos: number;
    precio: number;
    descripcion: string;
    estado: "Activo" | "Inactivo";
};

type Cita = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    doctorId: string;
    doctorNombre: string;
    servicioId: string;
    servicioNombre: string;
    costo: number;
    fecha: string;
    hora: string;
    duracionMinutos: number;
    recurrencia: string;
    estado: EstadoCitaSupabase;
    observaciones: string;
    creadaEn: string;
    citaOrigenId?: string | null;
    repeticion?: number;
    totalRepeticiones?: number;
};

type FormularioCita = {
    pacienteId: string;
    doctorId: string;
    servicioId: string;
    fecha: string;
    hora: string;
    recurrencia: string;
    costo: string;
    observaciones: string;
};

const formularioVacio: FormularioCita = {
    pacienteId: "",
    doctorId: "",
    servicioId: "",
    fecha: "",
    hora: "",
    recurrencia: "No repetir",
    costo: "",
    observaciones: "",
};

const estadosCita: EstadoCitaSupabase[] = [
    "Programada",
    "Confirmada",
    "En espera",
    "En atención",
    "Atendida",
    "Cobrada",
    "Reagendada",
    "Cancelada",
    "No asistió",
];

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI")}`;
}

function numero(valor: string) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function iniciales(nombre: string) {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "PX";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function normalizarTexto(valor: unknown) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function horaCorta(hora: string) {
    if (!hora) return "";
    return hora.slice(0, 5);
}

function colorEstado(estado: EstadoCitaSupabase) {
    if (estado === "Confirmada") return "bg-blue-50 text-blue-700";
    if (estado === "En espera") return "bg-amber-50 text-amber-700";
    if (estado === "En atención") return "bg-teal-50 text-teal-700";
    if (estado === "Atendida") return "bg-indigo-50 text-indigo-700";
    if (estado === "Cobrada") return "bg-emerald-50 text-emerald-700";
    if (estado === "Cancelada" || estado === "No asistió")
        return "bg-red-50 text-red-700";
    if (estado === "Reagendada") return "bg-purple-50 text-purple-700";

    return "bg-slate-100 text-slate-600";
}

function bordeEstado(estado: EstadoCitaSupabase) {
    if (estado === "Confirmada") return "border-blue-200";
    if (estado === "En espera") return "border-amber-200";
    if (estado === "En atención") return "border-teal-200";
    if (estado === "Atendida") return "border-indigo-200";
    if (estado === "Cobrada") return "border-emerald-200";
    if (estado === "Cancelada" || estado === "No asistió") return "border-red-200";

    return "border-slate-200";
}

function totalRepeticionesPorRecurrencia(recurrencia: string) {
    if (recurrencia === "Semanal") return 12;
    if (recurrencia === "Quincenal") return 12;
    if (recurrencia === "Mensual") return 12;

    return 1;
}

function textoRecurrenciaPlural(recurrencia: string) {
    if (recurrencia === "Semanal") return "semanales";
    if (recurrencia === "Quincenal") return "quincenales";
    if (recurrencia === "Mensual") return "mensuales";

    return "recurrentes";
}

function convertirPaciente(paciente: PacienteSupabase): Paciente {
    return {
        id: paciente.id,
        nombre: paciente.nombre || "",
        telefono: paciente.telefono || paciente.whatsapp || "",
        cedula: paciente.cedula || "",
        fechaNacimiento: paciente.fecha_nacimiento || "",
        direccion: paciente.direccion || "",
        alergias: paciente.alergias || "",
        enfermedades:
            paciente.enfermedades_sistemicas ||
            paciente.antecedentes ||
            "",
        medicamentos: paciente.medicamentos_actuales || "",
        observaciones: paciente.observaciones || "",
        estado: paciente.estado || "Activo",
        saldoPendiente: 0,
        ultimaCita: "",
    };
}

function convertirDoctor(doctor: DoctorSupabase): Doctor {
    return {
        id: doctor.id,
        nombre: doctor.nombre || "",
        especialidad: doctor.especialidad || "",
        telefono: doctor.telefono || "",
        correo: doctor.correo || "",
        horario: doctor.observaciones || "",
        estado: doctor.estado || "Activo",
    };
}

function convertirServicio(servicio: ServicioSupabase): Servicio {
    return {
        id: servicio.id,
        nombre: servicio.nombre || "",
        categoria: servicio.categoria || "General",
        duracionMinutos: Number(servicio.duracion_minutos || 30),
        precio: Number(servicio.precio || 0),
        descripcion: servicio.descripcion || "",
        estado: servicio.estado || "Activo",
    };
}

function convertirCita(cita: CitaSupabase): Cita {
    return {
        id: cita.id,
        pacienteId: cita.paciente_id || "",
        pacienteNombre: cita.paciente_nombre || "",
        doctorId: cita.doctor_id || "",
        doctorNombre: cita.doctor_nombre || "",
        servicioId: cita.servicio_id || "",
        servicioNombre: cita.servicio_nombre || "",
        costo: Number(cita.costo || 0),
        fecha: cita.fecha,
        hora: horaCorta(cita.hora),
        duracionMinutos: Number(cita.duracion_minutos || 30),
        recurrencia: cita.recurrencia || "No repetir",
        estado: cita.estado || "Programada",
        observaciones: cita.observaciones || "",
        creadaEn: cita.creado_en || "",
        citaOrigenId: cita.cita_origen_id,
    };
}

function agregarNumeracionRecurrente(citas: Cita[]) {
    const grupos = new Map<string, Cita[]>();

    citas.forEach((cita) => {
        if (!cita.citaOrigenId && cita.recurrencia === "No repetir") return;

        const clave = cita.citaOrigenId || cita.id;

        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave)?.push(cita);
    });

    grupos.forEach((grupo) => {
        grupo.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
        grupo.forEach((cita, index) => {
            cita.repeticion = index + 1;
            cita.totalRepeticiones = grupo.length;
        });
    });

    return citas;
}

function textoCitaRecurrente(cita: Cita) {
    if (!cita.citaOrigenId && cita.recurrencia === "No repetir") return "";
    if (!cita.repeticion || !cita.totalRepeticiones) return "";

    return `${cita.recurrencia} · ${cita.repeticion}/${cita.totalRepeticiones}`;
}

export default function AgendaPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [doctores, setDoctores] = useState<Doctor[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [citas, setCitas] = useState<Cita[]>([]);

    const [formulario, setFormulario] = useState<FormularioCita>({
        ...formularioVacio,
        fecha: fechaHoyLocal(),
    });

    const [citaEditandoId, setCitaEditandoId] = useState<string | null>(null);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoyLocal());
    const [busqueda, setBusqueda] = useState("");
    const [busquedaPacienteCita, setBusquedaPacienteCita] = useState("");
    const [selectorPacienteAbierto, setSelectorPacienteAbierto] = useState(false);
    const [estadoFiltro, setEstadoFiltro] = useState<EstadoCitaSupabase | "Todos">(
        "Todos"
    );

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            setConfiguracion(obtenerConfiguracionClinica());

            const [
                pacientesSupabase,
                doctoresSupabase,
                serviciosSupabase,
                citasSupabase,
            ] = await Promise.all([
                listarPacientesSupabase(),
                listarDoctoresSupabase(),
                listarServiciosSupabase(),
                listarCitasSupabase(),
            ]);

            const pacientesConvertidos = pacientesSupabase.map(convertirPaciente);
            const doctoresConvertidos = doctoresSupabase.map(convertirDoctor);
            const serviciosConvertidos = serviciosSupabase.map(convertirServicio);
            const citasConvertidas = agregarNumeracionRecurrente(
                citasSupabase.map(convertirCita)
            );

            setPacientes(pacientesConvertidos);
            setDoctores(doctoresConvertidos);
            setServicios(serviciosConvertidos);
            setCitas(citasConvertidas);
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar la agenda desde Supabase.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    function actualizarCampo<K extends keyof FormularioCita>(
        campo: K,
        valor: FormularioCita[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function seleccionarServicio(servicioId: string) {
        const servicio = servicios.find((item) => item.id === servicioId);

        setFormulario((datosActuales) => ({
            ...datosActuales,
            servicioId,
            costo: servicio ? servicio.precio.toString() : "",
        }));
    }

    function seleccionarPacienteCita(paciente: Paciente) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            pacienteId: paciente.id,
        }));
        setBusquedaPacienteCita(paciente.nombre);
        setSelectorPacienteAbierto(false);
    }

    function limpiarFormulario() {
        setFormulario({
            ...formularioVacio,
            fecha: fechaSeleccionada || fechaHoyLocal(),
        });
        setCitaEditandoId(null);
        setBusquedaPacienteCita("");
        setSelectorPacienteAbierto(false);
    }

    async function guardarCita(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const paciente = pacientes.find((item) => item.id === formulario.pacienteId);
        const doctor = doctores.find((item) => item.id === formulario.doctorId);
        const servicio = servicios.find((item) => item.id === formulario.servicioId);

        if (!paciente) {
            alert("Selecciona un paciente.");
            return;
        }

        if (!doctor) {
            alert("Selecciona un doctor.");
            return;
        }

        if (!servicio) {
            alert("Selecciona un servicio.");
            return;
        }

        if (!formulario.fecha) {
            alert("Selecciona la fecha de la cita.");
            return;
        }

        if (!formulario.hora) {
            alert("Selecciona la hora de la cita.");
            return;
        }

        if (numero(formulario.costo) <= 0) {
            alert("El costo debe ser mayor que cero.");
            return;
        }

        setGuardando(true);

        try {
            if (citaEditandoId) {
                await actualizarCitaSupabase(citaEditandoId, {
                    paciente_id: paciente.id,
                    paciente_nombre: paciente.nombre,
                    doctor_id: doctor.id,
                    doctor_nombre: doctor.nombre,
                    servicio_id: servicio.id,
                    servicio_nombre: servicio.nombre,
                    fecha: formulario.fecha,
                    hora: formulario.hora,
                    duracion_minutos: servicio.duracionMinutos,
                    costo: numero(formulario.costo),
                    recurrencia: formulario.recurrencia,
                    observaciones: formulario.observaciones.trim(),
                });

                await cargarDatos();
                limpiarFormulario();
                alert("Cita actualizada correctamente.");
                return;
            }

            const citasCreadas = await crearCitasSupabase({
                paciente_id: paciente.id,
                paciente_nombre: paciente.nombre,
                doctor_id: doctor.id,
                doctor_nombre: doctor.nombre,
                servicio_id: servicio.id,
                servicio_nombre: servicio.nombre,
                fecha: formulario.fecha,
                hora: formulario.hora,
                duracion_minutos: servicio.duracionMinutos,
                costo: numero(formulario.costo),
                recurrencia: formulario.recurrencia,
                cantidad_repeticiones: totalRepeticionesPorRecurrencia(
                    formulario.recurrencia
                ),
                estado: "Programada",
                observaciones: formulario.observaciones.trim(),
            });

            setFechaSeleccionada(formulario.fecha);
            await cargarDatos();
            limpiarFormulario();

            if (citasCreadas.length > 1) {
                alert(
                    `Cita recurrente registrada correctamente. Se generaron ${citasCreadas.length} citas ${textoRecurrenciaPlural(formulario.recurrencia)}.`
                );
                return;
            }

            alert("Cita registrada correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo guardar la cita.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    function editarCita(cita: Cita) {
        setCitaEditandoId(cita.id);
        setFormulario({
            pacienteId: cita.pacienteId,
            doctorId: cita.doctorId,
            servicioId: cita.servicioId,
            fecha: cita.fecha,
            hora: horaCorta(cita.hora),
            recurrencia: cita.recurrencia,
            costo: cita.costo.toString(),
            observaciones: cita.observaciones,
        });
        setBusquedaPacienteCita(cita.pacienteNombre);
        setSelectorPacienteAbierto(false);
    }

    async function cambiarEstadoCita(citaId: string, estado: EstadoCitaSupabase) {
        try {
            await cambiarEstadoCitaSupabase(citaId, estado);
            await cargarDatos();
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cambiar el estado de la cita.";

            alert(mensaje);
        }
    }

    async function eliminarCita(citaId: string) {
        const confirmar = window.confirm(
            "¿Seguro que deseas eliminar esta cita? Por seguridad se marcará como cancelada."
        );

        if (!confirmar) return;

        await cambiarEstadoCita(citaId, "Cancelada");
    }

    const citasDelDia = useMemo(() => {
        const texto = normalizarTexto(busqueda);

        return citas
            .filter((cita) => cita.fecha === fechaSeleccionada)
            .filter((cita) => {
                const coincideTexto =
                    !texto ||
                    normalizarTexto(cita.pacienteNombre).includes(texto) ||
                    normalizarTexto(cita.doctorNombre).includes(texto) ||
                    normalizarTexto(cita.servicioNombre).includes(texto) ||
                    normalizarTexto(cita.estado).includes(texto);

                const coincideEstado =
                    estadoFiltro === "Todos" || cita.estado === estadoFiltro;

                return coincideTexto && coincideEstado;
            })
            .sort((a, b) => a.hora.localeCompare(b.hora));
    }, [citas, fechaSeleccionada, busqueda, estadoFiltro]);

    const citasHoy = citas.filter((cita) => cita.fecha === fechaHoyLocal());

    const citasPendientesHoy = citasHoy.filter(
        (cita) =>
            cita.estado !== "Cancelada" &&
            cita.estado !== "No asistió" &&
            cita.estado !== "Cobrada"
    );

    const citasAtendidasHoy = citasHoy.filter(
        (cita) => cita.estado === "Atendida" || cita.estado === "Cobrada"
    );

    const ingresosPotencialesDia = citasDelDia
        .filter((cita) => cita.estado !== "Cancelada" && cita.estado !== "No asistió")
        .reduce((total, cita) => total + cita.costo, 0);

    const pacientesActivos = pacientes.filter(
        (paciente) => paciente.estado === "Activo"
    );

    const pacienteSeleccionadoFormulario =
        pacientes.find((paciente) => paciente.id === formulario.pacienteId) || null;

    const pacientesFiltradosFormulario = useMemo(() => {
        const texto = normalizarTexto(busquedaPacienteCita);

        return pacientesActivos
            .filter((paciente) => {
                if (!texto) return true;

                return (
                    normalizarTexto(paciente.nombre).includes(texto) ||
                    normalizarTexto(paciente.telefono).includes(texto) ||
                    normalizarTexto(paciente.cedula).includes(texto)
                );
            })
            .slice(0, 8);
    }, [pacientesActivos, busquedaPacienteCita]);

    const doctoresActivos = doctores.filter((doctor) => doctor.estado === "Activo");
    const serviciosActivos = servicios.filter(
        (servicio) => servicio.estado === "Activo"
    );

    return (
        <AppShell
            titulo="Agenda Médica"
            descripcion="Programación de citas, control de estados, atención clínica y envío a caja"
            moduloActivo="Agenda Médica"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo cargar la agenda
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
                        Agenda conectada a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Pacientes, doctores, servicios y citas ya se leen desde la base de datos.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarDatos}
                    disabled={cargando || guardando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    Recargar
                </button>
            </section>

            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Calendar className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Hoy
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {citasHoy.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Citas registradas hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <Clock className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Pendientes
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {citasPendientesHoy.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Por confirmar o atender
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Atendidas
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {citasAtendidasHoy.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pacientes atendidos hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <BadgeDollarSign className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Día
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(
                            ingresosPotencialesDia,
                            configuracion.simboloMoneda
                        )}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Ingreso potencial del día
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="glass-card overflow-hidden rounded-2xl">
                    <div className="border-b border-black/[0.04] px-6 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-[16px] font-bold text-slate-800">
                                    {citaEditandoId ? "Editar cita" : "Nueva cita"}
                                </h3>
                                <p className="mono mt-0.5 text-[10px] text-slate-400">
                                    Paciente, doctor, servicio, fecha y hora
                                </p>
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                <Plus className="h-[18px] w-[18px]" />
                            </div>
                        </div>
                    </div>

                    <form onSubmit={guardarCita} className="p-6">
                        <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                Paciente
                            </label>

                            <div className="relative">
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                                    <Search className="h-4 w-4 shrink-0 text-slate-400" />

                                    <input
                                        value={busquedaPacienteCita}
                                        onFocus={() => setSelectorPacienteAbierto(true)}
                                        onChange={(event) => {
                                            setBusquedaPacienteCita(event.target.value);
                                            setSelectorPacienteAbierto(true);

                                            if (formulario.pacienteId) {
                                                actualizarCampo("pacienteId", "");
                                            }
                                        }}
                                        placeholder="Escribir nombre, teléfono o cédula del paciente..."
                                        className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:text-slate-400"
                                    />

                                    {pacienteSeleccionadoFormulario && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                actualizarCampo("pacienteId", "");
                                                setBusquedaPacienteCita("");
                                                setSelectorPacienteAbierto(true);
                                            }}
                                            className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 hover:bg-slate-200"
                                        >
                                            Cambiar
                                        </button>
                                    )}
                                </div>

                                {selectorPacienteAbierto && (
                                    <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                                        {pacientesFiltradosFormulario.map((paciente) => (
                                            <button
                                                key={paciente.id}
                                                type="button"
                                                onClick={() => seleccionarPacienteCita(paciente)}
                                                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-teal-50 ${formulario.pacienteId === paciente.id
                                                        ? "bg-teal-50"
                                                        : "bg-white"
                                                    }`}
                                            >
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-[11px] font-black text-white">
                                                    {iniciales(paciente.nombre)}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-black text-slate-800">
                                                        {paciente.nombre}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                                                        {paciente.telefono || "Sin teléfono"} ·{" "}
                                                        {paciente.cedula || "Sin cédula"}
                                                    </p>
                                                </div>

                                                {formulario.pacienteId === paciente.id && (
                                                    <CheckCircle2 className="h-4 w-4 text-teal-700" />
                                                )}
                                            </button>
                                        ))}

                                        {pacientesFiltradosFormulario.length === 0 && (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                                                <UserRound className="mx-auto h-7 w-7 text-slate-300" />
                                                <p className="mt-2 text-xs font-bold text-slate-500">
                                                    No encontramos pacientes con esa búsqueda.
                                                </p>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setSelectorPacienteAbierto(false)}
                                            className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-2.5 text-[11px] font-black text-slate-600 hover:bg-slate-200"
                                        >
                                            Cerrar lista
                                        </button>
                                    </div>
                                )}

                                {pacienteSeleccionadoFormulario && (
                                    <div className="mt-3 rounded-2xl bg-teal-50 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-teal-700">
                                            Paciente seleccionado
                                        </p>
                                        <p className="mt-1 text-sm font-black text-teal-900">
                                            {pacienteSeleccionadoFormulario.nombre}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-teal-700">
                                            {pacienteSeleccionadoFormulario.telefono || "Sin teléfono"} ·{" "}
                                            {pacienteSeleccionadoFormulario.cedula || "Sin cédula"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Doctor
                                </label>
                                <select
                                    value={formulario.doctorId}
                                    onChange={(event) =>
                                        actualizarCampo("doctorId", event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option value="">Seleccionar doctor</option>
                                    {doctoresActivos.map((doctor) => (
                                        <option key={doctor.id} value={doctor.id}>
                                            {doctor.nombre} · {doctor.especialidad}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Servicio
                                </label>
                                <select
                                    value={formulario.servicioId}
                                    onChange={(event) => seleccionarServicio(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option value="">Seleccionar servicio</option>
                                    {serviciosActivos.map((servicio) => (
                                        <option key={servicio.id} value={servicio.id}>
                                            {servicio.nombre} ·{" "}
                                            {formatoMoneda(servicio.precio, configuracion.simboloMoneda)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Fecha
                                </label>
                                <input
                                    value={formulario.fecha}
                                    onChange={(event) =>
                                        actualizarCampo("fecha", event.target.value)
                                    }
                                    type="date"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Hora
                                </label>
                                <input
                                    value={formulario.hora}
                                    onChange={(event) => actualizarCampo("hora", event.target.value)}
                                    type="time"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Costo
                                </label>
                                <input
                                    value={formulario.costo}
                                    onChange={(event) =>
                                        actualizarCampo("costo", event.target.value)
                                    }
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                Recurrencia
                            </label>
                            <select
                                value={formulario.recurrencia}
                                onChange={(event) =>
                                    actualizarCampo("recurrencia", event.target.value)
                                }
                                disabled={Boolean(citaEditandoId)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <option>No repetir</option>
                                <option>Semanal</option>
                                <option>Quincenal</option>
                                <option>Mensual</option>
                            </select>

                            {formulario.recurrencia !== "No repetir" && !citaEditandoId && (
                                <p className="mt-2 rounded-2xl bg-purple-50 px-4 py-3 text-xs font-bold text-purple-700">
                                    Se crearán 12 citas {textoRecurrenciaPlural(formulario.recurrencia)}.
                                </p>
                            )}

                            {citaEditandoId && (
                                <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                                    Al editar una cita, solo se modifica esta cita individual.
                                </p>
                            )}
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                Observaciones
                            </label>
                            <textarea
                                value={formulario.observaciones}
                                onChange={(event) =>
                                    actualizarCampo("observaciones", event.target.value)
                                }
                                rows={4}
                                placeholder="Motivo, indicaciones o detalles importantes..."
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <button
                                disabled={guardando}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <CalendarCheck className="h-4 w-4" />
                                {guardando
                                    ? "Guardando..."
                                    : citaEditandoId
                                        ? "Guardar cambios"
                                        : "Registrar cita"}
                            </button>

                            <button
                                type="button"
                                onClick={limpiarFormulario}
                                disabled={guardando}
                                className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Limpiar
                            </button>
                        </div>
                    </form>
                </div>

                <div className="glass-card overflow-hidden rounded-2xl">
                    <div className="border-b border-black/[0.04] px-6 py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h3 className="text-[16px] font-bold text-slate-800">
                                    Agenda del día
                                </h3>
                                <p className="mono mt-0.5 text-[10px] text-slate-400">
                                    Vista diaria con control de estados
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 md:flex-row">
                                <input
                                    value={fechaSeleccionada}
                                    onChange={(event) => setFechaSeleccionada(event.target.value)}
                                    type="date"
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />

                                <select
                                    value={estadoFiltro}
                                    onChange={(event) =>
                                        setEstadoFiltro(event.target.value as EstadoCitaSupabase | "Todos")
                                    }
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option>Todos</option>
                                    {estadosCita.map((estado) => (
                                        <option key={estado}>{estado}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar por paciente, doctor, servicio o estado..."
                                className="w-full bg-transparent text-[13px] font-medium outline-none"
                            />
                        </div>
                    </div>

                    <div className="max-h-[780px] overflow-y-auto p-4">
                        <div className="space-y-3">
                            {cargando && (
                                <div className="rounded-3xl border border-teal-100 bg-teal-50 p-8 text-center">
                                    <Activity className="mx-auto h-8 w-8 animate-pulse text-teal-700" />
                                    <p className="mt-3 text-xs font-bold text-teal-700">
                                        Cargando agenda desde Supabase...
                                    </p>
                                </div>
                            )}

                            {!cargando &&
                                citasDelDia.map((cita) => (
                                    <div
                                        key={cita.id}
                                        className={`rounded-3xl border bg-white p-4 shadow-sm ${bordeEstado(
                                            cita.estado
                                        )}`}
                                    >
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div className="flex gap-3">
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-sm font-black text-white">
                                                    {iniciales(cita.pacienteNombre)}
                                                </div>

                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="text-sm font-black text-slate-800">
                                                            {cita.pacienteNombre}
                                                        </h4>

                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstado(
                                                                cita.estado
                                                            )}`}
                                                        >
                                                            {cita.estado}
                                                        </span>

                                                        {textoCitaRecurrente(cita) && (
                                                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700">
                                                                {textoCitaRecurrente(cita)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-2 grid gap-1 text-[12px] text-slate-500">
                                                        <p className="flex items-center gap-2">
                                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                            {horaCorta(cita.hora)}
                                                        </p>

                                                        <p className="flex items-center gap-2">
                                                            <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                                                            {cita.servicioNombre}
                                                        </p>

                                                        <p className="flex items-center gap-2">
                                                            <UserRound className="h-3.5 w-3.5 text-slate-400" />
                                                            {cita.doctorNombre}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-left md:text-right">
                                                <p className="text-xs font-bold text-slate-400">Costo</p>
                                                <p className="mt-1 text-sm font-black text-slate-800">
                                                    {formatoMoneda(cita.costo, configuracion.simboloMoneda)}
                                                </p>
                                            </div>
                                        </div>

                                        {cita.observaciones && (
                                            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                                <p className="text-xs leading-5 text-slate-500">
                                                    {cita.observaciones}
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {cita.estado === "Programada" && (
                                                <button
                                                    onClick={() => cambiarEstadoCita(cita.id, "Confirmada")}
                                                    className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Confirmar
                                                </button>
                                            )}

                                            {(cita.estado === "Programada" ||
                                                cita.estado === "Confirmada") && (
                                                    <button
                                                        onClick={() => cambiarEstadoCita(cita.id, "En espera")}
                                                        className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                                                    >
                                                        <CalendarClock className="h-3.5 w-3.5" />
                                                        En espera
                                                    </button>
                                                )}

                                            {(cita.estado === "En espera" ||
                                                cita.estado === "Confirmada") && (
                                                    <button
                                                        onClick={() =>
                                                            cambiarEstadoCita(cita.id, "En atención")
                                                        }
                                                        className="flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-700 hover:bg-teal-100"
                                                    >
                                                        <Activity className="h-3.5 w-3.5" />
                                                        En atención
                                                    </button>
                                                )}

                                            {cita.estado !== "Atendida" &&
                                                cita.estado !== "Cobrada" &&
                                                cita.estado !== "Cancelada" &&
                                                cita.estado !== "No asistió" && (
                                                    <button
                                                        onClick={() => cambiarEstadoCita(cita.id, "Atendida")}
                                                        className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                                                    >
                                                        <CalendarCheck className="h-3.5 w-3.5" />
                                                        Atendida
                                                    </button>
                                                )}

                                            {cita.estado === "Atendida" && (
                                                <Link
                                                    href="/caja"
                                                    className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                                                >
                                                    <CreditCard className="h-3.5 w-3.5" />
                                                    Cobrar
                                                </Link>
                                            )}

                                            <button
                                                onClick={() => editarCita(cita)}
                                                className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                                Editar
                                            </button>

                                            {cita.estado !== "Cancelada" &&
                                                cita.estado !== "Cobrada" && (
                                                    <button
                                                        onClick={() =>
                                                            cambiarEstadoCita(cita.id, "Cancelada")
                                                        }
                                                        className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        Cancelar
                                                    </button>
                                                )}

                                            <button
                                                onClick={() => eliminarCita(cita.id)}
                                                className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-200"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            {!cargando && citasDelDia.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                    <Calendar className="mx-auto h-10 w-10 text-slate-300" />
                                    <h4 className="mt-3 text-sm font-black text-slate-700">
                                        No hay citas para esta fecha
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Crea una nueva cita usando el formulario de la izquierda.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-teal-700" />
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Vista rápida por estado
                        </h3>
                    </div>
                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                        Resumen general de todas las citas registradas
                    </p>
                </div>

                <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-5">
                    {estadosCita.map((estado) => {
                        const cantidad = citas.filter((cita) => cita.estado === estado).length;

                        return (
                            <button
                                key={estado}
                                onClick={() => setEstadoFiltro(estado)}
                                className="rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm hover:border-teal-200 hover:bg-teal-50/40"
                            >
                                <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstado(
                                        estado
                                    )}`}
                                >
                                    {estado}
                                </span>

                                <p className="mt-4 text-2xl font-black text-slate-800">
                                    {cantidad}
                                </p>

                                <p className="mt-1 text-xs font-medium text-slate-400">
                                    cita(s)
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>
        </AppShell>
    );
}