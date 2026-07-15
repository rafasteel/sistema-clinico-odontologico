"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Printer, ReceiptText } from "lucide-react";
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

type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia";

type EstadoCuenta = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

type AbonoCuenta = {
    id: string;
    fecha: string;
    hora: string;
    monto: number;
    metodo: MetodoPago;
    observaciones?: string;
    usuarioNombre?: string;
};

type CuentaPorCobrar = {
    id: string;
    ventaId: string;
    pacienteId: string;
    pacienteNombre: string;
    concepto: string;
    total: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuenta;
    abonos?: AbonoCuenta[];
};

type AbonoEncontrado = {
    abono: AbonoCuenta;
    cuenta: CuentaPorCobrar;
};

const CUENTAS_KEY = "cuentas_cobrar_sistema_clinico";
const PACIENTES_KEY = "pacientes_sistema_clinico";

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

export default function ReciboAbonoPage() {
    const params = useParams();
    const abonoId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [resultado, setResultado] = useState<AbonoEncontrado | null>(null);
    const [paciente, setPaciente] = useState<Paciente | null>(null);

    useEffect(() => {
        const config = obtenerConfiguracionClinica();
        const cuentas = leerLocalStorage<CuentaPorCobrar[]>(CUENTAS_KEY, []);
        const pacientes = leerLocalStorage<Paciente[]>(PACIENTES_KEY, []);

        let encontrado: AbonoEncontrado | null = null;

        for (const cuenta of cuentas) {
            const abono = (cuenta.abonos || []).find((item) => item.id === abonoId);

            if (abono) {
                encontrado = {
                    abono,
                    cuenta,
                };
                break;
            }
        }

        const pacienteEncontrado = encontrado
            ? pacientes.find((item) => item.id === encontrado?.cuenta.pacienteId) ||
            null
            : null;

        setConfiguracion(config);
        setResultado(encontrado);
        setPaciente(pacienteEncontrado);
    }, [abonoId]);

    function imprimir() {
        window.print();
    }

    if (!resultado) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <ReceiptText className="h-8 w-8" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Abono no encontrado
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        No encontramos el abono solicitado. Puede que haya sido eliminado o
                        que el enlace no sea válido.
                    </p>

                    <Link
                        href="/cuentas-cobrar"
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a cuentas por cobrar
                    </Link>
                </section>
            </main>
        );
    }

    const { abono, cuenta } = resultado;
    const abonos = cuenta.abonos || [];
    const abonadoTotal = abonos.reduce(
        (total, item) => total + numero(item.monto),
        0
    );
    const saldoDespues = numero(cuenta.saldo);
    const saldoAntes = saldoDespues + numero(abono.monto);

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
                        font-size: 10px !important;
                    }

                    .print-table th,
                    .print-table td {
                        padding: 5px 7px !important;
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
                    href="/cuentas-cobrar"
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a cuentas por cobrar
                </Link>

                <div className="flex flex-wrap gap-2">
                    {cuenta.ventaId && (
                        <Link
                            href={`/recibos/${cuenta.ventaId}`}
                            className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                        >
                            <FileText className="h-4 w-4" />
                            Ver venta original
                        </Link>
                    )}

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
                                Recibo de abono
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
                                    {abono.id}
                                </strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Fecha</span>
                                <strong>{fechaLegible(abono.fecha)}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Hora</span>
                                <strong>{abono.hora || "00:00"}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Método</span>
                                <strong className="text-right">{abono.metodo}</strong>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="print-section border-b border-slate-300 py-3 print-border">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Datos del paciente
                    </h2>

                    <div className="grid overflow-hidden rounded-xl border border-slate-400 md:grid-cols-[1.45fr_1fr_1fr_1.2fr] print:rounded-none print-border">
                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Paciente
                            </p>
                            <p className="mt-0.5 text-sm font-black text-slate-950">
                                {cuenta.pacienteNombre}
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
                                Teléfono
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente?.telefono || "No registrado"}
                            </p>
                        </div>

                        <div className="p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Cuenta
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {cuenta.id}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Detalle del pago
                    </h2>

                    <div className="overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                        <table className="print-table w-full border-collapse text-[11px]">
                            <thead>
                                <tr className="bg-slate-100 print-light-bg">
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Concepto
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Saldo antes
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Abono
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Saldo actual
                                    </th>
                                    <th className="border-b border-slate-400 px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Registrado por
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td className="border-r border-slate-300 px-3 py-2 align-top print-border">
                                        <p className="font-black text-slate-950">
                                            {cuenta.concepto}
                                        </p>
                                        <p className="print-small mt-0.5 text-[10px] leading-4 text-slate-600">
                                            Venta: {cuenta.ventaId || "No vinculada"} · Estado:{" "}
                                            {cuenta.estado}
                                        </p>
                                    </td>

                                    <td className="border-r border-slate-300 px-3 py-2 text-right font-bold text-slate-800 print-border">
                                        {formatoMoneda(
                                            saldoAntes,
                                            configuracion.simboloMoneda
                                        )}
                                    </td>

                                    <td className="border-r border-slate-300 px-3 py-2 text-right font-black text-slate-950 print-border">
                                        {formatoMoneda(
                                            abono.monto,
                                            configuracion.simboloMoneda
                                        )}
                                    </td>

                                    <td className="border-r border-slate-300 px-3 py-2 text-right font-bold text-slate-800 print-border">
                                        {formatoMoneda(
                                            saldoDespues,
                                            configuracion.simboloMoneda
                                        )}
                                    </td>

                                    <td className="px-3 py-2 align-top text-[10px] font-bold text-slate-700">
                                        {abono.usuarioNombre || "Usuario no identificado"}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_255px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Observaciones
                        </h3>

                        <p className="print-small mt-1 text-[11px] leading-4 text-slate-700">
                            {abono.observaciones ||
                                "Abono aplicado correctamente a la cuenta por cobrar indicada."}
                        </p>

                        <p className="print-small mt-1 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                            Este documento sirve como comprobante del pago registrado en el
                            sistema. Verificar contra comprobante físico o bancario cuando
                            aplique.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Total crédito</span>
                            <strong>
                                {formatoMoneda(
                                    cuenta.total,
                                    configuracion.simboloMoneda
                                )}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Total abonado</span>
                            <strong>
                                {formatoMoneda(
                                    abonadoTotal,
                                    configuracion.simboloMoneda
                                )}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between bg-slate-100 px-3 py-2 print-light-bg">
                            <span className="text-sm font-black text-slate-700">
                                SALDO
                            </span>
                            <strong className="text-lg text-slate-950">
                                {formatoMoneda(saldoDespues, configuracion.simboloMoneda)}
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
                        Abono No. {abono.id} · Emitido desde el sistema clínico.
                    </p>
                </footer>
            </section>
        </main>
    );
}