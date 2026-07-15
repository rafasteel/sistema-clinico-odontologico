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

const PACIENTES_KEY = "pacientes_sistema_clinico";
const CITAS_KEY = "citas_sistema_clinico";
const NOTAS_KEY = "notas_clinicas_sistema_clinico";

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

export default function ConstanciaAtencionPage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [paciente, setPaciente] = useState<Paciente | null>(null);

    const [fechaAtencion, setFechaAtencion] = useState(fechaHoyLocal());
    const [horaAtencion, setHoraAtencion] = useState(horaActualLocal());
    const [doctor, setDoctor] = useState("");
    const [servicio, setServicio] = useState("Consulta odontológica");
    const [motivo, setMotivo] = useState(
        "El paciente fue atendido en esta clínica odontológica."
    );
    const [reposo, setReposo] = useState("");
    const [observaciones, setObservaciones] = useState("");

    useEffect(() => {
        const config = obtenerConfiguracionClinica();
        const pacientes = leerLocalStorage<Paciente[]>(PACIENTES_KEY, []);
        const citas = leerLocalStorage<Cita[]>(CITAS_KEY, []);
        const notas = leerLocalStorage<NotaClinica[]>(NOTAS_KEY, []);

        const pacienteEncontrado =
            pacientes.find((item) => item.id === pacienteId) || null;

        const citasPaciente = citas
            .filter(
                (item) =>
                    item.pacienteId === pacienteId ||
                    item.pacienteNombre?.toLowerCase() ===
                    (pacienteEncontrado?.nombre || "").toLowerCase()
            )
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );

        const notasPaciente = notas
            .filter((item) => item.pacienteId === pacienteId)
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );

        const ultimaCita = citasPaciente[0];
        const ultimaNota = notasPaciente[0];

        setConfiguracion(config);
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
            setDoctor(ultimaNota.doctor || doctor);
            setServicio(ultimaNota.servicio || servicio);
            setMotivo(
                ultimaNota.procedimiento ||
                ultimaNota.diagnostico ||
                "El paciente fue atendido en esta clínica odontológica."
            );
            setObservaciones(ultimaNota.observaciones || "");
        }
    }, [pacienteId]);

    function imprimir() {
        window.print();
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
                        No encontramos el paciente solicitado para generar la constancia.
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