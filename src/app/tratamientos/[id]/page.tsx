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

type Tratamiento = {
    id: string;
    pacienteId: string;
    fecha: string;
    nombre: string;
    descripcion: string;
    total: number;
    abonado: number;
    estado: "Planificado" | "En proceso" | "Completado" | "Suspendido";
};

type Registro = Record<string, unknown>;

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

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
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

function normalizarEstadoTratamiento(valor: unknown): Tratamiento["estado"] {
    const estado = texto(valor, "Planificado");

    if (estado === "En proceso") return "En proceso";
    if (estado === "Completado") return "Completado";
    if (estado === "Suspendido") return "Suspendido";

    return "Planificado";
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

function convertirTratamiento(data: Registro): Tratamiento {
    return {
        id: texto(data.id),
        pacienteId: texto(data.paciente_id || data.pacienteId),
        fecha: fechaSolo(data.fecha || data.creado_en || data.creadaEn),
        nombre: texto(
            data.nombre ||
            data.tratamiento ||
            data.titulo ||
            data.servicio_nombre ||
            data.servicioNombre,
            "Tratamiento odontológico"
        ),
        descripcion: texto(
            data.descripcion ||
            data.detalle ||
            data.procedimiento ||
            data.observaciones,
            "Sin descripción registrada."
        ),
        total: numero(
            data.total ||
            data.monto_total ||
            data.montoTotal ||
            data.costo ||
            data.precio
        ),
        abonado: numero(
            data.abonado ||
            data.monto_abonado ||
            data.montoAbonado ||
            data.pagado
        ),
        estado: normalizarEstadoTratamiento(data.estado),
    };
}

async function obtenerTratamientoDirecto(tratamientoId: string) {
    const supabase = crearClienteSupabase();

    const { data, error } = await supabase
        .from("tratamientos")
        .select("*")
        .eq("id", tratamientoId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return data ? convertirTratamiento(data as Registro) : null;
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

export default function TratamientoImprimiblePage() {
    const params = useParams();
    const tratamientoId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [tratamiento, setTratamiento] = useState<Tratamiento | null>(null);
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

            const tratamientoEncontrado =
                await obtenerTratamientoDirecto(tratamientoId);

            if (!tratamientoEncontrado) {
                setTratamiento(null);
                setPaciente(null);
                return;
            }

            const pacienteEncontrado = tratamientoEncontrado.pacienteId
                ? await obtenerPacienteDirecto(tratamientoEncontrado.pacienteId)
                : null;

            setTratamiento(tratamientoEncontrado);
            setPaciente(pacienteEncontrado);
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el tratamiento desde Supabase.";

            setError(mensaje);
            setTratamiento(null);
            setPaciente(null);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, [tratamientoId]);

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
                        Cargando tratamiento
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Consultando el tratamiento y el paciente desde Supabase.
                    </p>
                </section>
            </main>
        );
    }

    if (!tratamiento) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <FileText className="h-8 w-8" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Tratamiento no encontrado
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        {error ||
                            `No encontramos el tratamiento solicitado en Supabase. ID consultado: ${tratamientoId}`}
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

    const total = numero(tratamiento.total);
    const abonado = numero(tratamiento.abonado);
    const pendiente = Math.max(total - abonado, 0);
    const porcentajePagado =
        total > 0 ? Math.min((abonado / total) * 100, 100) : 0;

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
                    href={`/pacientes/${tratamiento.pacienteId}`}
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
                        href={`/expediente/${tratamiento.pacienteId}`}
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
                    Tratamiento conectado a Supabase
                </p>
                <p className="mt-1 text-xs font-semibold text-teal-700">
                    El tratamiento, el paciente y la configuración se consultan desde la base real de la clínica.
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
                                Plan de tratamiento
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
                                    {tratamiento.id}
                                </strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Fecha</span>
                                <strong>{fechaLegible(tratamiento.fecha)}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Estado</span>
                                <strong className="text-right">{tratamiento.estado}</strong>
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
                                Fecha plan
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {fechaLegible(tratamiento.fecha)}
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

                <section className="print-section grid gap-3 border-b border-slate-300 py-3 md:grid-cols-4 print-border">
                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Estado
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {tratamiento.estado}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Total
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(total, configuracion.simboloMoneda)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Abonado
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(abonado, configuracion.simboloMoneda)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Pendiente
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(pendiente, configuracion.simboloMoneda)}
                        </p>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Detalle del tratamiento
                    </h2>

                    <div className="overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 print-light-bg print-border">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                Tratamiento
                            </p>
                            <p className="mt-1 text-lg font-black text-slate-950 print:text-base">
                                {tratamiento.nombre}
                            </p>
                        </div>

                        <div className="px-3 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
                                Descripción clínica
                            </p>

                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 print:text-xs print:leading-5">
                                {tratamiento.descripcion || "Sin descripción registrada."}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_255px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Condiciones / nota importante
                        </h3>

                        <p className="print-small mt-1 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                            Este plan puede variar según evolución clínica, valoración del
                            profesional, hallazgos durante el procedimiento, asistencia del
                            paciente y pagos realizados.
                        </p>

                        <p className="print-small mt-2 text-[10px] leading-4 text-slate-600">
                            Avance financiero registrado: {porcentajePagado.toFixed(0)}%
                            abonado del total del tratamiento.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Total</span>
                            <strong>
                                {formatoMoneda(total, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Abonado</span>
                            <strong>
                                {formatoMoneda(abonado, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between bg-slate-100 px-3 py-2 print-light-bg">
                            <span className="text-sm font-black text-slate-700">
                                PENDIENTE
                            </span>
                            <strong className="text-lg text-slate-950">
                                {formatoMoneda(pendiente, configuracion.simboloMoneda)}
                            </strong>
                        </div>
                    </div>
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
                                Firma autorizada
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {configuracion.nombreClinica}
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="mt-3 border-t border-slate-300 pt-2 text-center text-[10px] leading-4 text-slate-500 print-border">
                    <p>{configuracion.mensajeRecibo || "Gracias por su preferencia."}</p>
                    <p>
                        Plan de tratamiento No. {tratamiento.id} · Emitido desde el sistema clínico.
                    </p>
                </footer>
            </section>
        </main>
    );
}