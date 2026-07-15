"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Printer, Stethoscope } from "lucide-react";
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

type CaraDental = "sup" | "der" | "inf" | "izq" | "centro";

type EstadoDental =
    | "Sano"
    | "Caries"
    | "Resina"
    | "Corona"
    | "Ausente"
    | "Extracción"
    | "Endodoncia"
    | "Implante"
    | "Fractura"
    | "Sellante"
    | "Observación";

type EstadoPresupuesto =
    | "Pendiente"
    | "Aprobado"
    | "Rechazado"
    | "Convertido a venta";

type ItemPresupuesto = {
    id: string;
    piezaCodigo?: string;
    piezaNumero?: string;
    cara?: CaraDental;
    estadoDental?: EstadoDental;
    nombre: string;
    tratamiento?: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    precio?: number;
    subtotal: number;
    total: number;
    estado?: string;
};

type Presupuesto = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora?: string;
    estado: EstadoPresupuesto;
    subtotal: number;
    descuento: number;
    total: number;
    observaciones: string;
    origen?: "Manual" | "Odontograma" | string;
    piezaCodigo?: string;
    cara?: CaraDental;
    estadoDental?: EstadoDental;
    usuarioNombre?: string;
    items?: ItemPresupuesto[];
    tratamientos?: ItemPresupuesto[];
};

const PRESUPUESTOS_KEY = "presupuestos_sistema_clinico";
const PACIENTES_KEY = "pacientes_sistema_clinico";

const carasDentales: Record<CaraDental, string> = {
    sup: "Superior",
    der: "Derecha",
    inf: "Inferior",
    izq: "Izquierda",
    centro: "Oclusal / Centro",
};

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

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
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

function etiquetaCara(cara?: CaraDental) {
    if (!cara) return "No especificada";

    return carasDentales[cara] || cara;
}

function normalizarItem(item: Partial<ItemPresupuesto>, index: number) {
    const cantidad = numero(item.cantidad || 1);
    const precioUnitario = numero(item.precioUnitario || item.precio || item.total);
    const subtotal = numero(item.subtotal || cantidad * precioUnitario);
    const total = numero(item.total || subtotal);

    const itemNormalizado: ItemPresupuesto = {
        id: item.id || `ITEM-${index}`,
        piezaCodigo: item.piezaCodigo || item.piezaNumero || "",
        piezaNumero: item.piezaNumero || item.piezaCodigo || "",
        cara: item.cara,
        estadoDental: item.estadoDental,
        nombre: item.nombre || item.tratamiento || "Tratamiento odontológico",
        tratamiento: item.tratamiento || item.nombre || "Tratamiento odontológico",
        descripcion: item.descripcion || "Sin descripción",
        cantidad: cantidad || 1,
        precioUnitario,
        precio: numero(item.precio || precioUnitario),
        subtotal,
        total,
        estado: item.estado || "Pendiente",
    };

    return itemNormalizado;
}

function obtenerItemsPresupuesto(presupuesto: Presupuesto) {
    const fuente =
        presupuesto.items && presupuesto.items.length > 0
            ? presupuesto.items
            : presupuesto.tratamientos || [];

    return fuente.map((item, index) => normalizarItem(item, index));
}

function textoClinicoItem(item: ItemPresupuesto) {
    const partes = [];

    if (item.piezaCodigo) partes.push(`Pieza ${item.piezaCodigo}`);
    if (item.cara) partes.push(etiquetaCara(item.cara));
    if (item.estadoDental) partes.push(item.estadoDental);

    return partes.length > 0 ? partes.join(" · ") : "No especificado";
}

export default function PresupuestoImprimiblePage() {
    const params = useParams();
    const presupuestoId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
    const [paciente, setPaciente] = useState<Paciente | null>(null);

    useEffect(() => {
        const config = obtenerConfiguracionClinica();
        const presupuestos = leerLocalStorage<Presupuesto[]>(PRESUPUESTOS_KEY, []);
        const pacientes = leerLocalStorage<Paciente[]>(PACIENTES_KEY, []);

        const presupuestoEncontrado =
            presupuestos.find((item) => item.id === presupuestoId) || null;

        const pacienteEncontrado = presupuestoEncontrado
            ? pacientes.find((item) => item.id === presupuestoEncontrado.pacienteId) ||
            null
            : null;

        setConfiguracion(config);
        setPresupuesto(presupuestoEncontrado);
        setPaciente(pacienteEncontrado);
    }, [presupuestoId]);

    const items = useMemo(() => {
        if (!presupuesto) return [];

        return obtenerItemsPresupuesto(presupuesto);
    }, [presupuesto]);

    const subtotalCalculado = items.reduce(
        (total, item) => total + numero(item.subtotal),
        0
    );

    const descuentoCalculado = numero(presupuesto?.descuento);
    const subtotalFinal = numero(presupuesto?.subtotal) || subtotalCalculado;
    const totalCalculado =
        numero(presupuesto?.total) ||
        Math.max(subtotalFinal - descuentoCalculado, 0);

    function imprimir() {
        window.print();
    }

    if (!presupuesto) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <FileText className="h-8 w-8" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Presupuesto no encontrado
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        No encontramos el presupuesto solicitado. Puede que haya sido
                        eliminado o que el enlace no sea válido.
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

                    .print-table {
                        font-size: 9.8px !important;
                    }

                    .print-table thead {
                        display: table-header-group;
                    }

                    .print-table tr {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }

                    .print-table th,
                    .print-table td {
                        padding: 4px 6px !important;
                    }

                    .patient-compact-grid {
                        display: grid !important;
                        grid-template-columns: 1.65fr 1fr 1fr 2fr 0.9fr !important;
                        gap: 0 !important;
                    }

                    .compact-cell {
                        padding: 6px 8px !important;
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
                    href={`/pacientes/${presupuesto.pacienteId}/presupuestos`}
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a presupuestos
                </Link>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/pacientes/${presupuesto.pacienteId}/odontograma`}
                        className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-[12px] font-bold text-teal-700 hover:bg-teal-100"
                    >
                        <Stethoscope className="h-4 w-4" />
                        Odontograma
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
                                Presupuesto odontológico
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
                                    {presupuesto.id}
                                </strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Fecha</span>
                                <strong>{fechaLegible(presupuesto.fecha)}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Hora</span>
                                <strong>{presupuesto.hora || "00:00"}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Estado</span>
                                <strong className="text-right">{presupuesto.estado}</strong>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="print-section border-b border-slate-300 py-3 print-border">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Datos del paciente
                    </h2>

                    <div className="patient-compact-grid overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="compact-cell border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Paciente
                            </p>
                            <p className="mt-0.5 text-sm font-black text-slate-950">
                                {presupuesto.pacienteNombre}
                            </p>
                        </div>

                        <div className="compact-cell border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Cédula
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente?.cedula || "No registrada"}
                            </p>
                        </div>

                        <div className="compact-cell border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Teléfono
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente?.telefono || "No registrado"}
                            </p>
                        </div>

                        <div className="compact-cell border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Dirección
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente?.direccion || "No registrada"}
                            </p>
                        </div>

                        <div className="compact-cell p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Origen
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {presupuesto.origen || "Manual"}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                            Detalle de tratamientos
                        </h2>

                        <p className="text-[10px] font-bold text-slate-500">
                            {items.length} item(s)
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                        <table className="print-table w-full border-collapse text-[11px]">
                            <thead>
                                <tr className="bg-slate-100 print-light-bg">
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Tratamiento / descripción
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Pieza / cara
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Cant.
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Precio
                                    </th>
                                    <th className="border-b border-slate-400 px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Total
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="border-b border-r border-slate-300 px-3 py-2 align-top print-border">
                                            <p className="font-black text-slate-950">
                                                {index + 1}. {item.nombre}
                                            </p>

                                            <p className="mt-0.5 text-[10px] leading-4 text-slate-600 print-small">
                                                {item.descripcion}
                                            </p>
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-3 py-2 align-top text-[10px] font-bold leading-4 text-slate-700 print-border print-small">
                                            {textoClinicoItem(item)}
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-3 py-2 text-center font-bold text-slate-800 print-border">
                                            {item.cantidad}
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-3 py-2 text-right font-bold text-slate-800 print-border">
                                            {formatoMoneda(
                                                item.precioUnitario,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>

                                        <td className="border-b border-slate-300 px-3 py-2 text-right font-black text-slate-950 print-border">
                                            {formatoMoneda(
                                                item.total,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {items.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-3 py-5 text-center text-sm text-slate-400"
                                        >
                                            Este presupuesto no tiene tratamientos detallados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_255px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Observaciones / condiciones
                        </h3>

                        <p className="print-small mt-1 text-[11px] leading-4 text-slate-700">
                            {presupuesto.observaciones ||
                                "Presupuesto sujeto a valoración clínica, disponibilidad de agenda y confirmación del paciente."}
                        </p>

                        <p className="print-small mt-1 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                            Estimación clínica sujeta a cambios si durante el tratamiento se
                            detectan nuevas condiciones o procedimientos adicionales.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Subtotal</span>
                            <strong>
                                {formatoMoneda(
                                    subtotalFinal,
                                    configuracion.simboloMoneda
                                )}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Descuento</span>
                            <strong>
                                {formatoMoneda(
                                    descuentoCalculado,
                                    configuracion.simboloMoneda
                                )}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between bg-slate-100 px-3 py-2 print-light-bg">
                            <span className="text-sm font-black text-slate-700">
                                TOTAL
                            </span>
                            <strong className="text-lg text-slate-950">
                                {formatoMoneda(totalCalculado, configuracion.simboloMoneda)}
                            </strong>
                        </div>
                    </div>
                </section>

                <section className="print-section mt-5 grid gap-8 md:grid-cols-2 print:mt-4">
                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma del paciente
                            </p>
                            <p className="text-[10px] text-slate-500">
                                Aceptación / recibido
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
                        Presupuesto No. {presupuesto.id} · Emitido desde el sistema clínico.
                    </p>
                </footer>
            </section>
        </main>
    );
}