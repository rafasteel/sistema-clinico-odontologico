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

type NotaClinica = {
    id: string;
    pacienteId: string;
    fecha: string;
    hora?: string;
    doctor?: string;
    servicio?: string;
    diagnostico?: string;
    procedimiento?: string;
    observaciones?: string;
    proximaCita?: string;
    usuarioNombre?: string;
    estado?: "Activa" | "Anulada";

    motivo?: string;
    tratamiento?: string;
};

type Registro = Record<string, unknown>;

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

function convertirNota(data: Registro): NotaClinica {
    return {
        id: texto(data.id),
        pacienteId: texto(data.paciente_id || data.pacienteId),
        fecha: fechaSolo(data.fecha || data.creado_en || data.creadaEn),
        hora: horaSolo(data.hora || data.creado_en || data.creadaEn),
        doctor: texto(data.doctor || data.doctor_nombre || data.doctorNombre),
        servicio: texto(data.servicio || data.servicio_nombre || data.servicioNombre),
        diagnostico: texto(data.diagnostico || data.motivo),
        procedimiento: texto(data.procedimiento || data.tratamiento),
        observaciones: texto(data.observaciones),
        proximaCita: fechaSolo(data.proxima_cita || data.proximaCita),
        usuarioNombre: texto(data.usuario_nombre || data.usuarioNombre),
        estado: texto(data.estado, "Activa") === "Anulada" ? "Anulada" : "Activa",
        motivo: texto(data.motivo),
        tratamiento: texto(data.tratamiento),
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

async function obtenerNotaDirecto(notaId: string) {
    const supabase = crearClienteSupabase();

    const { data, error } = await supabase
        .from("notas_clinicas")
        .select("*")
        .eq("id", notaId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return data ? convertirNota(data as Registro) : null;
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

export default function NotaClinicaImprimiblePage() {
    const params = useParams();
    const notaId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [nota, setNota] = useState<NotaClinica | null>(null);
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [cargando, setCargando] = useState(true);
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

            const notaEncontrada = await obtenerNotaDirecto(notaId);

            if (!notaEncontrada) {
                setNota(null);
                setPaciente(null);
                return;
            }

            const pacienteEncontrado = notaEncontrada.pacienteId
                ? await obtenerPacienteDirecto(notaEncontrada.pacienteId)
                : null;

            setNota(notaEncontrada);
            setPaciente(pacienteEncontrado);
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar la nota clínica desde Supabase.";

            setError(mensaje);
            setNota(null);
            setPaciente(null);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, [notaId]);

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
                        Cargando nota clínica
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Consultando la nota clínica y el paciente desde Supabase.
                    </p>
                </section>
            </main>
        );
    }

    if (!nota) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <FileText className="h-8 w-8" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Nota clínica no encontrada
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        {error ||
                            `No encontramos la nota clínica solicitada en Supabase. ID consultado: ${notaId}`}
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

    const diagnostico = nota.diagnostico || nota.motivo || "No registrado";
    const procedimiento =
        nota.procedimiento || nota.tratamiento || "No registrado";
    const hayAlertas =
        paciente &&
        (tieneAlerta(paciente.alergias) ||
            tieneAlerta(paciente.enfermedades) ||
            tieneAlerta(paciente.medicamentos));

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
                    href={`/pacientes/${nota.pacienteId}`}
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
                        href={`/expediente/${nota.pacienteId}`}
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
                    Nota clínica conectada a Supabase
                </p>
                <p className="mt-1 text-xs font-semibold text-teal-700">
                    La nota clínica, el paciente y la configuración se consultan desde la base real de la clínica.
                </p>
            </section>

            <section className="print-document mx-auto max-w-4xl rounded-2xl border border-slate-300 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                <header className="print-section border-b-2 border-slate-900 pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                {configuracion.nombreClinica}
                            </p>

                            <h1 className="print-title mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
                                Nota clínica
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
                                <span className="font-bold text-slate-500">No.</span>
                                <strong className="text-right text-slate-950">
                                    {nota.id}
                                </strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Fecha</span>
                                <strong>{fechaLegible(nota.fecha || fechaHoyLocal())}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Hora</span>
                                <strong>{nota.hora || "00:00"}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Estado</span>
                                <strong className="text-right">
                                    {nota.estado || "Activa"}
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
                                {paciente?.nombre || "Paciente no encontrado"}
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
                                {paciente ? calcularEdad(paciente.fechaNacimiento) : "N/R"}
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
                                Servicio
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {nota.servicio || "Consulta clínica"}
                            </p>
                        </div>
                    </div>
                </section>

                {hayAlertas && (
                    <section className="print-section border-b border-slate-300 py-2 print-border">
                        <h2 className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                            Alertas clínicas
                        </h2>

                        <p className="print-small text-[11px] leading-4 text-slate-700">
                            <strong>Alergias:</strong> {paciente?.alergias || "No refiere"} ·{" "}
                            <strong>Enfermedades:</strong>{" "}
                            {paciente?.enfermedades || "No registra"} ·{" "}
                            <strong>Medicamentos actuales:</strong>{" "}
                            {paciente?.medicamentos || "Ninguno"}
                        </p>
                    </section>
                )}

                <section className="print-section grid gap-3 border-b border-slate-300 py-3 md:grid-cols-3 print-border">
                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Doctor
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {nota.doctor || "Doctor no especificado"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Registrado por
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {nota.usuarioNombre || "Usuario no identificado"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Próxima cita
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {nota.proximaCita ? fechaLegible(nota.proximaCita) : "No registrada"}
                        </p>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Detalle clínico
                    </h2>

                    <div className="overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="grid md:grid-cols-2">
                            <div className="border-b border-r border-slate-300 p-3 print-border md:border-b-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                    Diagnóstico / motivo
                                </p>
                                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 print:text-xs print:leading-5">
                                    {diagnostico}
                                </p>
                            </div>

                            <div className="border-b border-slate-300 p-3 print-border md:border-b-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                    Procedimiento / tratamiento
                                </p>
                                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 print:text-xs print:leading-5">
                                    {procedimiento}
                                </p>
                            </div>
                        </div>

                        {nota.observaciones && (
                            <div className="border-t border-slate-300 p-3 print-border">
                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                    Observaciones
                                </p>
                                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 print:text-xs print:leading-5">
                                    {nota.observaciones}
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="print-section border-t border-slate-300 pt-3 print-border">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Información de registro
                    </h3>

                    <p className="print-small mt-1 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                        Atención registrada el {fechaLegible(nota.fecha || fechaHoyLocal())} a las{" "}
                        {nota.hora || "00:00"}. Documento emitido desde el sistema clínico.
                    </p>
                </section>

                <section className="print-section mt-8 grid gap-8 md:grid-cols-2 print:mt-6">
                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma del paciente
                            </p>
                            <p className="text-[10px] text-slate-500">
                                Recibido / conforme
                            </p>
                        </div>
                    </div>

                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma y sello profesional
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {nota.doctor || configuracion.nombreClinica}
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="mt-3 border-t border-slate-300 pt-2 text-center text-[10px] leading-4 text-slate-500 print-border">
                    <p>{configuracion.mensajeRecibo || "Gracias por su preferencia."}</p>
                    <p>Nota clínica No. {nota.id} · Emitida desde el sistema clínico.</p>
                </footer>
            </section>
        </main>
    );
}