"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    ClipboardList,
    FileText,
    Printer,
    RefreshCcw,
} from "lucide-react";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import { crearClienteSupabase } from "@/lib/supabase/client";

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

type EstadoCita =
    | "Programada"
    | "Confirmada"
    | "En espera"
    | "En atención"
    | "Atendida"
    | "Cobrada"
    | "Reagendada"
    | "Cancelada"
    | "No asistió";

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
    recurrencia: string;
    estado: EstadoCita;
    observaciones: string;
    creadaEn: string;
};

type NotaClinica = {
    id: string;
    pacienteId: string;
    fecha: string;
    hora: string;
    doctor: string;
    servicio: string;
    diagnostico: string;
    procedimiento: string;
    observaciones: string;
    proximaCita: string;
    usuarioNombre: string;
    estado: "Activa" | "Anulada";
};

type Registro = Record<string, unknown>;

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

function texto(valor: unknown, respaldo = "") {
    const convertido = String(valor ?? "").trim();

    return convertido || respaldo;
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function fechaSolo(valor: unknown) {
    const convertido = texto(valor);

    if (convertido.length >= 10) return convertido.slice(0, 10);

    return "";
}

function horaSolo(valor: unknown) {
    const convertido = texto(valor);

    if (!convertido) return "";

    if (convertido.includes("T")) return convertido.slice(11, 16);

    return convertido.slice(0, 5);
}

function convertirPaciente(data: Registro): Paciente {
    return {
        id: texto(data.id),
        nombre: texto(data.nombre),
        telefono: texto(data.telefono || data.whatsapp),
        cedula: texto(data.cedula),
        fechaNacimiento: texto(data.fecha_nacimiento || data.fechaNacimiento),
        direccion: texto(data.direccion),
        alergias: texto(data.alergias),
        enfermedades: texto(
            data.enfermedades ||
            data.enfermedades_sistemicas ||
            data.enfermedadesSistemicas ||
            data.antecedentes
        ),
        medicamentos: texto(
            data.medicamentos ||
            data.medicamentos_actuales ||
            data.medicamentosActuales
        ),
        observaciones: texto(data.observaciones),
        estado: texto(data.estado, "Activo") === "Inactivo" ? "Inactivo" : "Activo",
        saldoPendiente: numero(data.saldo_pendiente || data.saldoPendiente),
        ultimaCita: texto(data.ultima_cita || data.ultimaCita),
    };
}

function convertirCita(data: Registro): Cita {
    return {
        id: texto(data.id),
        pacienteId: texto(data.paciente_id || data.pacienteId),
        pacienteNombre: texto(data.paciente_nombre || data.pacienteNombre),
        doctorId: texto(data.doctor_id || data.doctorId),
        doctorNombre: texto(data.doctor_nombre || data.doctorNombre),
        servicioId: texto(data.servicio_id || data.servicioId),
        servicioNombre: texto(data.servicio_nombre || data.servicioNombre),
        costo: numero(data.costo),
        fecha: fechaSolo(data.fecha),
        hora: horaSolo(data.hora || data.creado_en),
        recurrencia: texto(data.recurrencia, "No repetir"),
        estado: texto(data.estado, "Programada") as EstadoCita,
        observaciones: texto(data.observaciones),
        creadaEn: texto(data.creado_en || data.creadaEn),
    };
}

function convertirNota(data: Registro): NotaClinica {
    return {
        id: texto(data.id),
        pacienteId: texto(data.paciente_id || data.pacienteId),
        fecha: fechaSolo(data.fecha || data.creado_en),
        hora: horaSolo(data.hora || data.creado_en),
        doctor: texto(data.doctor || data.doctor_nombre || data.doctorNombre),
        servicio: texto(data.servicio || data.servicio_nombre || data.servicioNombre),
        diagnostico: texto(data.diagnostico),
        procedimiento: texto(data.procedimiento),
        observaciones: texto(data.observaciones),
        proximaCita: texto(data.proxima_cita || data.proximaCita),
        usuarioNombre: texto(data.usuario_nombre || data.usuarioNombre),
        estado: texto(data.estado, "Activa") === "Anulada" ? "Anulada" : "Activa",
    };
}

function fechaLegible(fecha: string) {
    if (!fecha) return "No registrada";

    const partes = fecha.split("-");
    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function calcularEdad(fechaNacimiento: string) {
    if (!fechaNacimiento) return "No registrada";

    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();

    if (Number.isNaN(nacimiento.getTime())) return "No registrada";

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad -= 1;
    }

    return `${edad} años`;
}

async function obtenerPacienteDirecto(pacienteId: string) {
    const supabase = crearClienteSupabase();

    const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", pacienteId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return data ? convertirPaciente(data as Registro) : null;
}

async function listarCitasPacienteDirecto(pacienteId: string) {
    const supabase = crearClienteSupabase();

    const { data, error } = await supabase
        .from("citas")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })
        .limit(20);

    if (error) throw new Error(error.message);

    return (data || []).map((item) => convertirCita(item as Registro));
}

async function listarNotasPacienteDirecto(pacienteId: string) {
    const supabase = crearClienteSupabase();

    const { data, error } = await supabase
        .from("notas_clinicas")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })
        .limit(20);

    if (error) throw new Error(error.message);

    return (data || []).map((item) => convertirNota(item as Registro));
}

export default function ConstanciaAtencionPage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const [fechaAtencion, setFechaAtencion] = useState(fechaHoyLocal());
    const [horaAtencion, setHoraAtencion] = useState(horaActualLocal());
    const [doctor, setDoctor] = useState("");
    const [servicio, setServicio] = useState("Consulta odontológica");
    const [motivo, setMotivo] = useState(
        "El paciente fue atendido en esta clínica odontológica."
    );
    const [reposo, setReposo] = useState("");
    const [observaciones, setObservaciones] = useState("");

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }

            const [pacienteEncontrado, citasPaciente, notasPaciente] =
                await Promise.all([
                    obtenerPacienteDirecto(pacienteId),
                    listarCitasPacienteDirecto(pacienteId),
                    listarNotasPacienteDirecto(pacienteId),
                ]);

            const ultimaCita = citasPaciente[0];
            const ultimaNota = notasPaciente.find(
                (item) => item.estado !== "Anulada"
            ) || notasPaciente[0];

            setPaciente(pacienteEncontrado);

            if (ultimaCita) {
                setFechaAtencion(ultimaCita.fecha || fechaHoyLocal());
                setHoraAtencion(ultimaCita.hora || horaActualLocal());
                setDoctor(ultimaCita.doctorNombre || "");
                setServicio(ultimaCita.servicioNombre || "Consulta odontológica");
                setMotivo(
                    `El paciente fue atendido por ${ultimaCita.servicioNombre || "consulta odontológica"
                    }.`
                );
            }

            if (ultimaNota) {
                setFechaAtencion(ultimaNota.fecha || fechaHoyLocal());
                setHoraAtencion(ultimaNota.hora || horaActualLocal());
                setDoctor(ultimaNota.doctor || ultimaCita?.doctorNombre || "");
                setServicio(
                    ultimaNota.servicio ||
                    ultimaCita?.servicioNombre ||
                    "Consulta odontológica"
                );
                setMotivo(
                    ultimaNota.procedimiento ||
                    ultimaNota.diagnostico ||
                    "El paciente fue atendido en esta clínica odontológica."
                );
                setObservaciones(ultimaNota.observaciones || "");
            }
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar la constancia desde Supabase.";

            setError(mensaje);
            setPaciente(null);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, [pacienteId]);

    function imprimir() {
        window.print();
    }

    if (cargando) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 text-teal-700">
                        <RefreshCcw className="h-8 w-8 animate-spin" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Cargando constancia
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Consultando paciente, citas y notas clínicas desde Supabase.
                    </p>
                </section>
            </main>
        );
    }

    if (!paciente) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <FileText className="h-8 w-8" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Paciente no encontrado
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        {error || `No encontramos el paciente solicitado en Supabase. ID consultado: ${pacienteId}`}
                    </p>

                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        <Link
                            href="/pacientes"
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver a pacientes
                        </Link>

                        <button
                            type="button"
                            onClick={cargarDatos}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Reintentar
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 print:bg-white print:px-0 print:py-0">
            <style>{`
                @media print {
                    @page {
                        size: letter;
                        margin: 6mm;
                    }

                    * {
                        -webkit-print-color-adjust: economy;
                        print-color-adjust: economy;
                    }

                    html,
                    body {
                        background: white !important;
                        color: #111827 !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .print-document {
                        width: 100% !important;
                        max-width: none !important;
                        border: 0 !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                    }

                    .print-section {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }

                    .print-small {
                        font-size: 9.8px !important;
                        line-height: 1.25 !important;
                    }

                    .print-title {
                        font-size: 17px !important;
                        line-height: 1.05 !important;
                    }

                    .print-border {
                        border-color: #9ca3af !important;
                    }

                    .print-light-bg {
                        background: #f8fafc !important;
                    }
                }
            `}</style>

            <section className="no-print mx-auto mb-4 flex max-w-4xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Link
                    href={`/pacientes/${paciente.id}`}
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al perfil
                </Link>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={cargarDatos}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Recargar
                    </button>

                    <Link
                        href={`/expediente/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-[12px] font-bold text-teal-700 hover:bg-teal-100"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Expediente
                    </Link>

                    <button
                        type="button"
                        onClick={imprimir}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimir / Guardar PDF
                    </button>
                </div>
            </section>

            <section className="no-print mx-auto mb-4 max-w-4xl rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
                    Constancia conectada a Supabase
                </p>
                <p className="mt-1 text-xs font-semibold text-teal-700">
                    Los datos del paciente, citas y notas clínicas se leen desde la base real de la clínica.
                </p>
            </section>

            <section className="no-print mx-auto mb-4 max-w-4xl rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black text-slate-900">
                    Completar constancia antes de imprimir
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Fecha de atención
                        </label>
                        <input
                            type="date"
                            value={fechaAtencion}
                            onChange={(event) => setFechaAtencion(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Hora de atención
                        </label>
                        <input
                            type="time"
                            value={horaAtencion}
                            onChange={(event) => setHoraAtencion(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Doctor / profesional
                        </label>
                        <input
                            value={doctor}
                            onChange={(event) => setDoctor(event.target.value)}
                            placeholder="Nombre del doctor"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Servicio
                        </label>
                        <input
                            value={servicio}
                            onChange={(event) => setServicio(event.target.value)}
                            placeholder="Ejemplo: Extracción dental"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="mb-2 block text-xs font-bold text-slate-600">
                        Motivo / detalle de atención
                    </label>
                    <textarea
                        value={motivo}
                        onChange={(event) => setMotivo(event.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                    />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Reposo recomendado
                        </label>
                        <input
                            value={reposo}
                            onChange={(event) => setReposo(event.target.value)}
                            placeholder="Ejemplo: 24 horas / No aplica"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Observaciones
                        </label>
                        <input
                            value={observaciones}
                            onChange={(event) => setObservaciones(event.target.value)}
                            placeholder="Observaciones adicionales"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>
                </div>
            </section>

            <section className="print-document mx-auto max-w-4xl rounded-2xl border border-slate-300 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                <header className="print-section border-b-2 border-slate-900 pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                {configuracion.nombreClinica}
                            </p>

                            <h1 className="print-title mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
                                Constancia de atención
                            </h1>

                            <div className="print-small mt-1 max-w-2xl text-[11px] leading-4 text-slate-700">
                                <p>
                                    {configuracion.direccion || "Dirección no registrada"}
                                </p>
                                <p>
                                    Tel: {configuracion.telefono || "No registrado"} · WhatsApp:{" "}
                                    {configuracion.whatsapp || "No registrado"} · RUC:{" "}
                                    {configuracion.ruc || "No registrado"}
                                </p>
                                {configuracion.correo && (
                                    <p>Correo: {configuracion.correo}</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-400 text-[11px] md:w-[245px] print-border">
                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Emisión</span>
                                <strong>{fechaLegible(fechaHoyLocal())}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Atención</span>
                                <strong>{fechaLegible(fechaAtencion)}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Hora</span>
                                <strong>{horaAtencion || "No registrada"}</strong>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="print-section border-b border-slate-300 py-3 print-border">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Datos del paciente
                    </h2>

                    <div className="grid overflow-hidden rounded-xl border border-slate-400 md:grid-cols-[1.5fr_1fr_0.8fr_1fr_1.6fr] print:rounded-none print-border">
                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Paciente
                            </p>
                            <p className="mt-0.5 text-sm font-black text-slate-950">
                                {paciente.nombre}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Cédula
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente.cedula || "No registrada"}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Edad
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {calcularEdad(paciente.fechaNacimiento)}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Teléfono
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente.telefono || "No registrado"}
                            </p>
                        </div>

                        <div className="p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Dirección
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente.direccion || "No registrada"}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-b border-slate-300 py-3 md:grid-cols-3 print-border">
                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Fecha atención
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {fechaLegible(fechaAtencion)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Profesional
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {doctor || "No especificado"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Servicio
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {servicio || "No especificado"}
                        </p>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Declaración
                    </h2>

                    <div className="rounded-xl border border-slate-400 p-4 text-sm leading-6 text-slate-700 print:rounded-none print-border print:text-xs print:leading-5">
                        <p>
                            Por medio de la presente,{" "}
                            <strong>{configuracion.nombreClinica}</strong> hace constar que
                            el/la paciente <strong>{paciente.nombre}</strong>, con número de
                            identificación{" "}
                            <strong>{paciente.cedula || "no registrado"}</strong>, fue
                            atendido(a) en nuestras instalaciones el día{" "}
                            <strong>{fechaLegible(fechaAtencion)}</strong> a las{" "}
                            <strong>{horaAtencion || "hora no registrada"}</strong>.
                        </p>

                        <p className="mt-2">
                            La atención brindada corresponde a:{" "}
                            <strong>{servicio || "servicio no especificado"}</strong>.
                        </p>

                        <p className="mt-2">
                            {motivo || "Atención odontológica registrada."}
                        </p>

                        {reposo && (
                            <p className="mt-2">
                                Se recomienda reposo o cuidados especiales por:{" "}
                                <strong>{reposo}</strong>.
                            </p>
                        )}

                        {observaciones && (
                            <p className="mt-2">
                                <strong>Observaciones:</strong> {observaciones}
                            </p>
                        )}
                    </div>
                </section>

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_260px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Nota
                        </h3>

                        <p className="print-small mt-1 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                            Esta constancia certifica únicamente la atención registrada en la
                            fecha indicada. No sustituye incapacidad médica oficial si la
                            institución solicitante requiere formato específico.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-3 print:rounded-none print-border">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Tipo documento
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-950">
                            Constancia de atención
                        </p>
                    </div>
                </section>

                <section className="print-section mt-8 grid gap-8 md:grid-cols-2 print:mt-6">
                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma y sello autorizado
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {doctor || configuracion.nombreClinica}
                            </p>
                        </div>
                    </div>

                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Recibido por paciente
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {paciente.nombre}
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="mt-3 border-t border-slate-300 pt-2 text-center text-[10px] leading-4 text-slate-500 print-border">
                    <p>{configuracion.mensajeRecibo || "Gracias por su preferencia."}</p>
                    <p>Constancia de atención emitida desde el sistema clínico.</p>
                </footer>
            </section>
        </main>
    );
}