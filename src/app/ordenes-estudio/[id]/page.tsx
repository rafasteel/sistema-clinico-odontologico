"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    ClipboardList,
    FileText,
    Printer,
    RefreshCcw,
    Save,
    Search,
    Stethoscope,
    XCircle,
} from "lucide-react";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    obtenerPacienteSupabase,
    type PacienteSupabase,
} from "@/lib/supabase/pacientes";
import {
    listarDoctoresSupabase,
    type DoctorSupabase,
} from "@/lib/supabase/doctoresServicios";
import {
    actualizarOrdenEstudioSupabase,
    anularOrdenEstudioSupabase,
    crearOrdenEstudioSupabase,
    listarOrdenesEstudioPacienteSupabase,
    type OrdenEstudioSupabase,
} from "@/lib/supabase/ordenesEstudio";

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

type OrdenEstudio = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora: string;
    doctor: string;
    tipoEstudio: string;
    zona: string;
    motivo: string;
    indicaciones: string;
    estado: "Activa" | "Anulada";
    usuarioNombre: string;
};

type FormularioOrden = {
    fecha: string;
    doctor: string;
    tipoEstudio: string;
    zona: string;
    motivo: string;
    indicaciones: string;
};

const tiposEstudio = [
    "Radiografía panorámica",
    "Radiografía periapical",
    "Radiografía bitewing",
    "Tomografía CBCT",
    "Cefalometría lateral",
    "Serie radiográfica completa",
    "Fotografías clínicas",
    "Otro estudio odontológico",
];

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formularioInicial(): FormularioOrden {
    return {
        fecha: fechaHoyLocal(),
        doctor: "",
        tipoEstudio: "Radiografía panorámica",
        zona: "Ambas arcadas",
        motivo: "Evaluación diagnóstica odontológica.",
        indicaciones:
            "Favor entregar imagen y reporte para valoración clínica.",
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

    const nacimiento = new Date(`${fechaNacimiento}T12:00:00`);
    const hoy = new Date();

    if (Number.isNaN(nacimiento.getTime())) return "No registrada";

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad -= 1;
    }

    return `${edad} años`;
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

function convertirOrden(orden: OrdenEstudioSupabase): OrdenEstudio {
    return {
        id: orden.id,
        pacienteId: orden.paciente_id,
        pacienteNombre: orden.paciente_nombre,
        fecha: orden.fecha,
        hora: String(orden.hora || "").slice(0, 5),
        doctor: orden.doctor || "",
        tipoEstudio: orden.tipo_estudio || "",
        zona: orden.zona || "",
        motivo: orden.motivo || "",
        indicaciones: orden.indicaciones || "",
        estado: orden.estado || "Activa",
        usuarioNombre: orden.usuario_nombre || "Usuario no identificado",
    };
}

function convertirOrdenAFormulario(orden: OrdenEstudio): FormularioOrden {
    return {
        fecha: orden.fecha || fechaHoyLocal(),
        doctor: orden.doctor || "",
        tipoEstudio: orden.tipoEstudio || "Radiografía panorámica",
        zona: orden.zona || "Ambas arcadas",
        motivo: orden.motivo || "Evaluación diagnóstica odontológica.",
        indicaciones:
            orden.indicaciones ||
            "Favor entregar imagen y reporte para valoración clínica.",
    };
}

export default function OrdenEstudioPage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [doctores, setDoctores] = useState<DoctorSupabase[]>([]);
    const [ordenes, setOrdenes] = useState<OrdenEstudio[]>([]);
    const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState<string | null>(
        null
    );
    const [formulario, setFormulario] = useState<FormularioOrden>(
        formularioInicial()
    );
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }

            const [pacienteSupabase, ordenesSupabase, doctoresSupabase] =
                await Promise.all([
                    obtenerPacienteSupabase(pacienteId),
                    listarOrdenesEstudioPacienteSupabase(pacienteId),
                    listarDoctoresSupabase(),
                ]);

            setPaciente(pacienteSupabase ? convertirPaciente(pacienteSupabase) : null);
            setOrdenes(ordenesSupabase.map(convertirOrden));
            setDoctores(doctoresSupabase);

            const primeraOrden = ordenesSupabase[0]
                ? convertirOrden(ordenesSupabase[0])
                : null;

            if (!ordenSeleccionadaId && primeraOrden) {
                setOrdenSeleccionadaId(primeraOrden.id);
                setFormulario(convertirOrdenAFormulario(primeraOrden));
            }
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar la orden de estudio desde Supabase.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, [pacienteId]);

    function actualizarCampo<K extends keyof FormularioOrden>(
        campo: K,
        valor: FormularioOrden[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function seleccionarOrden(orden: OrdenEstudio) {
        setOrdenSeleccionadaId(orden.id);
        setFormulario(convertirOrdenAFormulario(orden));
    }

    function nuevaOrden() {
        setOrdenSeleccionadaId(null);
        setFormulario(formularioInicial());
    }

    async function guardarOrden(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!paciente) return;

        if (!formulario.tipoEstudio.trim()) {
            alert("Indicá el tipo de estudio.");
            return;
        }

        if (!formulario.zona.trim()) {
            alert("Indicá la zona o piezas dentales.");
            return;
        }

        if (!formulario.motivo.trim()) {
            alert("Indicá el motivo clínico.");
            return;
        }

        setGuardando(true);
        setError("");

        try {
            const payload = {
                paciente_id: paciente.id,
                fecha: formulario.fecha,
                doctor: formulario.doctor.trim() || "Doctor no especificado",
                tipo_estudio: formulario.tipoEstudio.trim(),
                zona: formulario.zona.trim(),
                motivo: formulario.motivo.trim(),
                indicaciones: formulario.indicaciones.trim(),
            };

            const resultado = ordenSeleccionadaId
                ? await actualizarOrdenEstudioSupabase(ordenSeleccionadaId, payload)
                : await crearOrdenEstudioSupabase(payload);

            setOrdenSeleccionadaId(resultado.id);
            await cargarDatos();

            alert(
                ordenSeleccionadaId
                    ? "Orden actualizada correctamente en Supabase."
                    : "Orden creada correctamente en Supabase."
            );
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo guardar la orden de estudio.";

            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function anularOrden(id: string) {
        const confirmar = window.confirm(
            "¿Seguro que deseas anular esta orden de estudio?"
        );

        if (!confirmar) return;

        setGuardando(true);
        setError("");

        try {
            await anularOrdenEstudioSupabase(id);
            await cargarDatos();
            alert("Orden anulada correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo anular la orden.";

            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    function imprimir() {
        window.print();
    }

    const ordenesFiltradas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return ordenes.filter((orden) => {
            if (!texto) return true;

            return (
                orden.tipoEstudio.toLowerCase().includes(texto) ||
                orden.zona.toLowerCase().includes(texto) ||
                orden.doctor.toLowerCase().includes(texto) ||
                orden.motivo.toLowerCase().includes(texto) ||
                orden.estado.toLowerCase().includes(texto)
            );
        });
    }, [ordenes, busqueda]);

    const totalActivas = ordenes.filter((orden) => orden.estado === "Activa").length;
    const totalAnuladas = ordenes.filter((orden) => orden.estado === "Anulada").length;

    if (!paciente && !cargando) {
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
                        {error || "No encontramos el paciente solicitado para generar la orden de estudio."}
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
                            Recargar
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

            {error && (
                <section className="no-print mx-auto mb-4 max-w-5xl rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                </section>
            )}

            <section className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
                        Órdenes de estudio conectadas a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Se guardan por clínica y paciente, listas para imprimir o consultar después.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={cargarDatos}
                        disabled={cargando || guardando}
                        className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                        {cargando ? "Cargando..." : "Recargar"}
                    </button>

                    <button
                        type="button"
                        onClick={nuevaOrden}
                        disabled={guardando}
                        className="flex items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-[12px] font-bold text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <FileText className="h-4 w-4" />
                        Nueva orden
                    </button>
                </div>
            </section>

            <section className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Link
                    href={`/pacientes/${paciente?.id || pacienteId}`}
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al perfil
                </Link>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/expediente/${paciente?.id || pacienteId}`}
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

            <section className="no-print mx-auto mb-4 grid max-w-5xl gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Total órdenes
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-900">
                        {ordenes.length}
                    </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Activas
                    </p>
                    <p className="mt-2 text-3xl font-black text-emerald-700">
                        {totalActivas}
                    </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Anuladas
                    </p>
                    <p className="mt-2 text-3xl font-black text-red-700">
                        {totalAnuladas}
                    </p>
                </div>
            </section>

            <section className="no-print mx-auto mb-4 grid max-w-5xl gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">
                                Completar orden antes de imprimir
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Guardá la orden en Supabase antes o después de imprimirla.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={guardarOrden}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Fecha de orden
                                </label>
                                <input
                                    type="date"
                                    value={formulario.fecha}
                                    onChange={(event) =>
                                        actualizarCampo("fecha", event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Doctor solicitante
                                </label>
                                <input
                                    value={formulario.doctor}
                                    onChange={(event) =>
                                        actualizarCampo("doctor", event.target.value)
                                    }
                                    list="lista-doctores-orden"
                                    placeholder="Nombre del doctor"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                                <datalist id="lista-doctores-orden">
                                    {doctores.map((doctor) => (
                                        <option key={doctor.id} value={doctor.nombre} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Tipo de estudio
                                </label>
                                <select
                                    value={formulario.tipoEstudio}
                                    onChange={(event) =>
                                        actualizarCampo("tipoEstudio", event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    {tiposEstudio.map((tipo) => (
                                        <option key={tipo}>{tipo}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Zona / piezas dentales
                                </label>
                                <input
                                    value={formulario.zona}
                                    onChange={(event) =>
                                        actualizarCampo("zona", event.target.value)
                                    }
                                    placeholder="Ejemplo: pieza 36 / sector posterior inferior"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                Motivo clínico
                            </label>
                            <textarea
                                value={formulario.motivo}
                                onChange={(event) =>
                                    actualizarCampo("motivo", event.target.value)
                                }
                                rows={3}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                Indicaciones para el centro de imagen
                            </label>
                            <textarea
                                value={formulario.indicaciones}
                                onChange={(event) =>
                                    actualizarCampo("indicaciones", event.target.value)
                                }
                                rows={3}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />
                        </div>

                        <button
                            disabled={guardando}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            {guardando
                                ? "Guardando..."
                                : ordenSeleccionadaId
                                    ? "Guardar cambios"
                                    : "Guardar nueva orden"}
                        </button>
                    </form>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">
                                Historial de órdenes
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Seleccioná una orden para verla, editarla o imprimirla.
                            </p>
                        </div>
                    </div>

                    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            placeholder="Buscar orden..."
                            className="w-full bg-transparent text-[13px] font-medium outline-none"
                        />
                    </div>

                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                        {ordenesFiltradas.map((orden) => (
                            <article
                                key={orden.id}
                                className={`rounded-2xl border p-4 ${ordenSeleccionadaId === orden.id
                                        ? "border-teal-200 bg-teal-50"
                                        : "border-slate-100 bg-white"
                                    }`}
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <button
                                        type="button"
                                        onClick={() => seleccionarOrden(orden)}
                                        className="text-left"
                                    >
                                        <span
                                            className={`rounded-full px-3 py-1 text-[10px] font-black ${orden.estado === "Activa"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-red-50 text-red-700"
                                                }`}
                                        >
                                            {orden.estado}
                                        </span>

                                        <h3 className="mt-3 text-sm font-black text-slate-900">
                                            {orden.tipoEstudio}
                                        </h3>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {fechaLegible(orden.fecha)} · {orden.zona}
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            Doctor: {orden.doctor || "No especificado"}
                                        </p>
                                    </button>

                                    {orden.estado !== "Anulada" && (
                                        <button
                                            type="button"
                                            onClick={() => anularOrden(orden.id)}
                                            disabled={guardando}
                                            className="flex w-fit items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                            Anular
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}

                        {ordenesFiltradas.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                                <h4 className="mt-3 text-sm font-black text-slate-700">
                                    {cargando
                                        ? "Cargando órdenes..."
                                        : "Sin órdenes encontradas"}
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    {cargando
                                        ? "Consultando órdenes desde Supabase."
                                        : "Creá una nueva orden o limpiá la búsqueda."}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </section>

            <section className="print-document mx-auto max-w-4xl rounded-2xl border border-slate-300 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                <header className="print-section border-b-2 border-slate-900 pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                {configuracion.nombreClinica}
                            </p>

                            <h1 className="print-title mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
                                Orden de estudio odontológico
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
                                <span className="font-bold text-slate-500">Fecha</span>
                                <strong>{fechaLegible(formulario.fecha)}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Tipo</span>
                                <strong className="text-right">Estudio diagnóstico</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Estado</span>
                                <strong className="text-right">
                                    {ordenes.find((orden) => orden.id === ordenSeleccionadaId)?.estado || "Borrador"}
                                </strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Doctor</span>
                                <strong className="text-right">
                                    {formulario.doctor || "No especificado"}
                                </strong>
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
                                {paciente?.nombre || "Cargando..."}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Cédula
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente?.cedula || "No registrada"}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Edad
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {calcularEdad(paciente?.fechaNacimiento || "")}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Teléfono
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente?.telefono || "No registrado"}
                            </p>
                        </div>

                        <div className="p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Dirección
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente?.direccion || "No registrada"}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-b border-slate-300 py-3 md:grid-cols-3 print-border">
                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Fecha orden
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {fechaLegible(formulario.fecha)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Estudio
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formulario.tipoEstudio || "No especificado"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Zona / piezas
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formulario.zona || "No especificado"}
                        </p>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Solicitud
                    </h2>

                    <div className="overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 print-light-bg print-border">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                Estudio solicitado
                            </p>
                            <p className="mt-1 text-lg font-black text-slate-950 print:text-base">
                                {formulario.tipoEstudio}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2">
                            <div className="border-b border-r border-slate-300 p-3 print-border md:border-b-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                    Zona o piezas dentales
                                </p>
                                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 print:text-xs print:leading-5">
                                    {formulario.zona || "No especificado"}
                                </p>
                            </div>

                            <div className="border-b border-slate-300 p-3 print-border md:border-b-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                    Doctor solicitante
                                </p>
                                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 print:text-xs print:leading-5">
                                    {formulario.doctor || "No especificado"}
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-slate-300 p-3 print-border">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                Motivo clínico
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 print:text-xs print:leading-5">
                                {formulario.motivo || "No especificado"}
                            </p>
                        </div>

                        <div className="border-t border-slate-300 p-3 print-border">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                Indicaciones para el centro de imagen
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 print:text-xs print:leading-5">
                                {formulario.indicaciones || "Sin indicaciones adicionales."}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_260px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Nota
                        </h3>

                        <p className="print-small mt-1 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                            Se solicita entregar imagen y reporte para valoración clínica.
                            Esta orden debe presentarse al centro de imagen indicado.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-3 print:rounded-none print-border">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Tipo documento
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-950">
                            Orden de estudio odontológico
                        </p>
                    </div>
                </section>

                <section className="print-section mt-8 grid gap-8 md:grid-cols-2 print:mt-6">
                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma y sello profesional
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {formulario.doctor || configuracion.nombreClinica}
                            </p>
                        </div>
                    </div>

                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Recibido por paciente
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {paciente?.nombre || ""}
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="mt-3 border-t border-slate-300 pt-2 text-center text-[10px] leading-4 text-slate-500 print-border">
                    <p>{configuracion.mensajeRecibo || "Gracias por su preferencia."}</p>
                    <p>Orden de estudio emitida desde el sistema clínico.</p>
                </footer>
            </section>
        </main>
    );
}