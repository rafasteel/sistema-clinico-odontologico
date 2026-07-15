"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, FileText, Printer } from "lucide-react";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

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

const NOTAS_KEY = "notas_clinicas_sistema_clinico";
const PACIENTES_KEY = "pacientes_sistema_clinico";

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function leerLocalStorage<T>(clave: string, valorInicial: T): T {
    if (typeof window === "undefined") return valorInicial;

    try {
        const datos = localStorage.getItem(clave);
        if (!datos) return valorInicial;

        return JSON.parse(datos) as T;
    } catch {
        return valorInicial;
    }
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
    const texto = valor.trim().toLowerCase();

    if (!texto) return false;
    if (texto === "no") return false;
    if (texto === "ninguna") return false;
    if (texto === "ninguno") return false;
    if (texto === "no refiere") return false;
    if (texto === "ninguna registrada") return false;

    return true;
}

export default function NotaClinicaImprimiblePage() {
    const params = useParams();
    const notaId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [nota, setNota] = useState<NotaClinica | null>(null);
    const [paciente, setPaciente] = useState<Paciente | null>(null);

    useEffect(() => {
        const config = obtenerConfiguracionClinica();
        const notas = leerLocalStorage<NotaClinica[]>(NOTAS_KEY, []);
        const pacientes = leerLocalStorage<Paciente[]>(PACIENTES_KEY, []);

        const notaEncontrada = notas.find((item) => item.id === notaId) || null;

        const pacienteEncontrado = notaEncontrada
            ? pacientes.find((item) => item.id === notaEncontrada.pacienteId) || null
            : null;

        setConfiguracion(config);
        setNota(notaEncontrada);
        setPaciente(pacienteEncontrado);
    }, [notaId]);

    function imprimir() {
        window.print();
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
                        No encontramos la nota clínica solicitada. Puede que haya sido
                        eliminada o que el enlace no sea válido.
                    </p>

                    <Link
                        href="/pacientes"
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a pacientes
                    </Link>
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
                        Atención registrada el {fechaLegible(nota.fecha)} a las{" "}
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