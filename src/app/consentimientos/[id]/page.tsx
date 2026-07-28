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
import {
    obtenerPacienteSupabase,
    type PacienteSupabase,
} from "@/lib/supabase/pacientes";

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

type ResultadoPacienteFlexible =
    | PacienteSupabase
    | null
    | undefined
    | {
        paciente?: PacienteSupabase | null;
        data?: PacienteSupabase | null;
        datos?: PacienteSupabase | null;
        error?: string | null;
    };

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

function extraerPacienteResultado(resultado: ResultadoPacienteFlexible) {
    if (!resultado) return null;

    const resultadoRecord = resultado as Record<string, unknown>;

    if (resultadoRecord.paciente) {
        return resultadoRecord.paciente as PacienteSupabase;
    }

    if (resultadoRecord.data) {
        return resultadoRecord.data as PacienteSupabase;
    }

    if (resultadoRecord.datos) {
        return resultadoRecord.datos as PacienteSupabase;
    }

    if (resultadoRecord.id) {
        return resultado as PacienteSupabase;
    }

    return null;
}

function convertirPacienteSupabase(pacienteSupabase: PacienteSupabase): Paciente {
    const paciente = pacienteSupabase as PacienteSupabase & Record<string, unknown>;

    return {
        id: texto(paciente.id),
        nombre: texto(paciente.nombre),
        telefono: texto(paciente.telefono || paciente.whatsapp),
        cedula: texto(paciente.cedula),
        fechaNacimiento: texto(
            paciente.fecha_nacimiento || paciente.fechaNacimiento
        ),
        direccion: texto(paciente.direccion),
        alergias: texto(paciente.alergias),
        enfermedades: texto(
            paciente.enfermedades ||
            paciente.enfermedades_sistemicas ||
            paciente.enfermedadesSistemicas ||
            paciente.antecedentes
        ),
        medicamentos: texto(
            paciente.medicamentos ||
            paciente.medicamentos_actuales ||
            paciente.medicamentosActuales
        ),
        observaciones: texto(paciente.observaciones),
        estado: texto(paciente.estado, "Activo") === "Inactivo" ? "Inactivo" : "Activo",
        saldoPendiente: numero(paciente.saldo_pendiente || paciente.saldoPendiente),
        ultimaCita: texto(paciente.ultima_cita || paciente.ultimaCita),
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

function tieneAlerta(valor: string) {
    const textoAlerta = valor.trim().toLowerCase();

    if (!textoAlerta) return false;
    if (textoAlerta === "no") return false;
    if (textoAlerta === "ninguna") return false;
    if (textoAlerta === "ninguno") return false;
    if (textoAlerta === "no refiere") return false;
    if (textoAlerta === "ninguna registrada") return false;

    return true;
}

async function obtenerPacienteDirectoSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();

    const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", pacienteId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data as PacienteSupabase | null;
}

export default function ConsentimientoPacientePage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const [procedimiento, setProcedimiento] = useState(
        "Procedimiento odontológico indicado por el profesional tratante"
    );
    const [doctor, setDoctor] = useState("");
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

            let pacienteEncontrado: PacienteSupabase | null = null;

            try {
                const resultado = (await obtenerPacienteSupabase(
                    pacienteId
                )) as ResultadoPacienteFlexible;

                pacienteEncontrado = extraerPacienteResultado(resultado);
            } catch {
                pacienteEncontrado = null;
            }

            if (!pacienteEncontrado) {
                pacienteEncontrado = await obtenerPacienteDirectoSupabase(pacienteId);
            }

            setPaciente(
                pacienteEncontrado
                    ? convertirPacienteSupabase(pacienteEncontrado)
                    : null
            );
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el consentimiento desde Supabase.";

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
                        Cargando consentimiento
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Consultando el paciente y la configuración desde Supabase.
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
                        {error ||
                            `No encontramos el paciente solicitado en Supabase. ID consultado: ${pacienteId}`}
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

    const tieneAlertas =
        tieneAlerta(paciente.alergias) ||
        tieneAlerta(paciente.enfermedades) ||
        tieneAlerta(paciente.medicamentos);

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
                    Consentimiento conectado a Supabase
                </p>
                <p className="mt-1 text-xs font-semibold text-teal-700">
                    Los datos del paciente y la configuración se consultan desde la base real de la clínica.
                </p>
            </section>

            <section className="no-print mx-auto mb-4 max-w-4xl rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black text-slate-900">
                    Completar antes de imprimir
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Procedimiento autorizado
                        </label>
                        <input
                            value={procedimiento}
                            onChange={(event) => setProcedimiento(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Profesional tratante
                        </label>
                        <input
                            value={doctor}
                            onChange={(event) => setDoctor(event.target.value)}
                            placeholder="Nombre del doctor"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="mb-2 block text-xs font-bold text-slate-600">
                        Observaciones adicionales
                    </label>
                    <textarea
                        value={observaciones}
                        onChange={(event) => setObservaciones(event.target.value)}
                        rows={3}
                        placeholder="Ejemplo: Se explicó el procedimiento, alternativas y cuidados posteriores."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                    />
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
                                Consentimiento informado
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
                                <strong>{fechaLegible(fechaHoyLocal())}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Estado</span>
                                <strong>{paciente.estado}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Profesional</span>
                                <strong className="text-right">
                                    {doctor || "No especificado"}
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

                {tieneAlertas && (
                    <section className="print-section border-b border-slate-300 py-2 print-border">
                        <h2 className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                            Alertas clínicas declaradas
                        </h2>

                        <p className="print-small text-[11px] leading-4 text-slate-700">
                            <strong>Alergias:</strong> {paciente.alergias || "No refiere"} ·{" "}
                            <strong>Enfermedades:</strong>{" "}
                            {paciente.enfermedades || "No registra"} ·{" "}
                            <strong>Medicamentos:</strong>{" "}
                            {paciente.medicamentos || "Ninguno"}
                        </p>
                    </section>
                )}

                <section className="print-section grid gap-3 border-b border-slate-300 py-3 md:grid-cols-3 print-border">
                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Procedimiento
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {procedimiento || "No especificado"}
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
                            Fecha
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {fechaLegible(fechaHoyLocal())}
                        </p>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Declaración de consentimiento
                    </h2>

                    <div className="rounded-xl border border-slate-400 p-4 text-sm leading-6 text-slate-700 print:rounded-none print-border print:text-xs print:leading-5">
                        <p>
                            Yo, <strong>{paciente.nombre}</strong>, con identificación{" "}
                            <strong>{paciente.cedula || "no registrada"}</strong>, declaro que
                            he recibido información clara sobre el procedimiento odontológico:{" "}
                            <strong>{procedimiento || "no especificado"}</strong>.
                        </p>

                        <p className="mt-2">
                            Se me explicó la naturaleza del procedimiento, objetivos, posibles
                            beneficios, molestias, riesgos generales, alternativas disponibles
                            y consecuencias de no realizar el tratamiento recomendado.
                        </p>

                        <p className="mt-2">
                            Entiendo que el procedimiento puede requerir ajustes durante la
                            atención según hallazgos clínicos, evolución del caso, respuesta
                            del paciente y criterio profesional.
                        </p>

                        <p className="mt-2">
                            Autorizo al profesional tratante{" "}
                            <strong>{doctor || "no especificado"}</strong> y al equipo de{" "}
                            <strong>{configuracion.nombreClinica}</strong> a realizar el
                            procedimiento descrito y las maniobras clínicas necesarias
                            relacionadas con la atención.
                        </p>

                        <p className="mt-2">
                            Confirmo que informé mis antecedentes relevantes, alergias,
                            enfermedades y medicamentos actuales. He podido hacer preguntas,
                            mis dudas fueron aclaradas y firmo de forma libre y voluntaria.
                        </p>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_260px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Observaciones adicionales
                        </h3>

                        <p className="print-small mt-1 text-[11px] leading-4 text-slate-700">
                            {observaciones || "Sin observaciones adicionales."}
                        </p>

                        <p className="print-small mt-1 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                            Este formato es una plantilla general y puede ajustarse según el
                            procedimiento, políticas internas de la clínica y normativa aplicable.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-3 print:rounded-none print-border">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Confirmación
                        </p>
                        <p className="print-small mt-1 text-[10px] leading-4 text-slate-600">
                            El paciente confirma haber recibido explicación, responder con
                            información médica veraz y aceptar el procedimiento indicado.
                        </p>
                    </div>
                </section>

                <section className="print-section mt-7 grid gap-8 md:grid-cols-2 print:mt-5">
                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma del paciente / responsable
                            </p>
                            <p className="text-[10px] text-slate-500">
                                Acepto y autorizo el procedimiento
                            </p>
                        </div>
                    </div>

                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma y sello profesional
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {doctor || configuracion.nombreClinica}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="print-section mt-7 grid gap-8 md:grid-cols-2 print:mt-5">
                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Testigo / acompañante
                            </p>
                            <p className="text-[10px] text-slate-500">
                                Nombre, cédula y firma
                            </p>
                        </div>
                    </div>

                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Fecha y hora
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {fechaLegible(fechaHoyLocal())}
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="mt-3 border-t border-slate-300 pt-2 text-center text-[10px] leading-4 text-slate-500 print-border">
                    <p>{configuracion.mensajeRecibo || "Gracias por su preferencia."}</p>
                    <p>Consentimiento informado emitido desde el sistema clínico.</p>
                </footer>
            </section>
        </main>
    );
}