"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Printer, ReceiptText } from "lucide-react";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

type EstadoVenta = "Pagada" | "Parcial" | "Crédito" | "Anulada";

type Venta = {
    id: string;
    fecha: string;
    hora: string;
    tipoCobro: string;
    citaId: string;
    pacienteId: string;
    clienteNombre: string;
    concepto: string;
    total: number;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    credito: number;
    estado: EstadoVenta;
    usuarioNombre: string;
    observaciones: string;
    productoId?: string;
    productoNombre?: string;
    cantidadProducto?: number;

    posId?: string;
    posNombre?: string;
    posBanco?: string;
    comisionPOS?: number;
    comisionTarjeta?: number;
    netoTarjeta?: number;
};

type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia";

type AbonoCuenta = {
    id: string;
    fecha: string;
    hora: string;
    monto: number;
    metodo: MetodoPago;
    observaciones?: string;
    usuarioNombre?: string;
};

type EstadoCuenta = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

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
    abonos: AbonoCuenta[];
};

const VENTAS_KEY = "ventas_sistema_clinico";
const CUENTAS_KEY = "cuentas_cobrar_sistema_clinico";

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

function textoEstado(estado: EstadoVenta) {
    if (estado === "Pagada") return "Pagado";
    if (estado === "Parcial") return "Pago parcial";
    if (estado === "Crédito") return "Crédito pendiente";
    return "Anulado";
}

function fechaLegible(fecha: string) {
    if (!fecha) return "No registrada";

    try {
        const partes = fecha.split("-");
        if (partes.length !== 3) return fecha;

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    } catch {
        return fecha;
    }
}

function porcentajePagado(venta: Venta) {
    if (!venta.total) return 0;

    const pagado =
        numero(venta.efectivo) + numero(venta.tarjeta) + numero(venta.transferencia);

    return Math.min((pagado / venta.total) * 100, 100);
}

export default function ReciboPage() {
    const params = useParams();
    const ventaId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);

    useEffect(() => {
        setConfiguracion(obtenerConfiguracionClinica());
        setVentas(leerLocalStorage<Venta[]>(VENTAS_KEY, []));
        setCuentas(leerLocalStorage<CuentaPorCobrar[]>(CUENTAS_KEY, []));
    }, []);

    const venta = ventas.find((item) => item.id === ventaId) || null;

    const cuentaRelacionada = cuentas.find(
        (cuenta) => cuenta.ventaId === ventaId
    );

    const totalPagado = venta
        ? numero(venta.efectivo) + numero(venta.tarjeta) + numero(venta.transferencia)
        : 0;

    const saldoPendiente = venta
        ? Math.max(numero(venta.total) - totalPagado, 0)
        : 0;

    const comisionPOS = venta
        ? venta.comisionTarjeta !== undefined
            ? numero(venta.comisionTarjeta)
            : numero(venta.tarjeta) * (numero(venta.comisionPOS ?? configuracion.comisionPOS) / 100)
        : 0;

    const netoTarjeta = venta
        ? venta.netoTarjeta !== undefined
            ? numero(venta.netoTarjeta)
            : numero(venta.tarjeta) - comisionPOS
        : 0;

    const abonos = useMemo(() => {
        return cuentaRelacionada?.abonos || [];
    }, [cuentaRelacionada]);

    function imprimir() {
        window.print();
    }

    if (!venta) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <ReceiptText className="h-8 w-8" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Recibo no encontrado
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        No encontramos una venta con el ID solicitado. Verificá el historial
                        de Caja y abrí el recibo desde ahí.
                    </p>

                    <Link
                        href="/caja"
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Caja
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
                    href="/caja"
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Caja
                </Link>

                <div className="flex flex-wrap gap-2">
                    <span className="rounded-xl bg-white px-4 py-3 text-[12px] font-black text-slate-700 shadow-sm">
                        {textoEstado(venta.estado)}
                    </span>

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
                                Recibo de venta
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
                                <span className="font-bold text-slate-500">Recibo</span>
                                <strong className="text-right text-slate-950">
                                    {venta.id}
                                </strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Fecha</span>
                                <strong>{fechaLegible(venta.fecha)}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Hora</span>
                                <strong>{venta.hora || "00:00"}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Estado</span>
                                <strong className="text-right">
                                    {textoEstado(venta.estado)}
                                </strong>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="print-section border-b border-slate-300 py-3 print-border">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Datos generales
                    </h2>

                    <div className="grid overflow-hidden rounded-xl border border-slate-400 md:grid-cols-[1.6fr_1.1fr_1fr_1.2fr] print:rounded-none print-border">
                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Paciente / cliente
                            </p>
                            <p className="mt-0.5 text-sm font-black text-slate-950">
                                {venta.clienteNombre}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Atendido por
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {venta.usuarioNombre || "Usuario no identificado"}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Tipo cobro
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {venta.tipoCobro || "No especificado"}
                            </p>
                        </div>

                        <div className="p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Avance pago
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {porcentajePagado(venta).toFixed(0)}% pagado
                            </p>
                        </div>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Detalle del servicio o producto
                    </h2>

                    <div className="overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                        <table className="print-table w-full border-collapse text-[11px]">
                            <thead>
                                <tr className="bg-slate-100 print-light-bg">
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Concepto
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Cantidad
                                    </th>
                                    <th className="border-b border-slate-400 px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Total
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td className="border-r border-slate-300 px-3 py-2 align-top print-border">
                                        <p className="font-black text-slate-950">
                                            {venta.concepto}
                                        </p>

                                        {venta.productoNombre && (
                                            <p className="print-small mt-0.5 text-[10px] leading-4 text-slate-600">
                                                Producto: {venta.productoNombre}
                                            </p>
                                        )}

                                        {venta.citaId && (
                                            <p className="print-small mt-0.5 text-[10px] leading-4 text-slate-600">
                                                Cita vinculada: {venta.citaId}
                                            </p>
                                        )}
                                    </td>

                                    <td className="border-r border-slate-300 px-3 py-2 text-center font-bold print-border">
                                        {venta.cantidadProducto || 1}
                                    </td>

                                    <td className="px-3 py-2 text-right font-black text-slate-950">
                                        {formatoMoneda(venta.total, configuracion.simboloMoneda)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_255px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Forma de pago
                        </h3>

                        <div className="mt-2 overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                            <table className="print-table w-full border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-slate-100 print-light-bg">
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Efectivo
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Tarjeta
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Transferencia
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Crédito
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    <tr>
                                        <td className="border-r border-slate-300 px-2 py-2 font-bold print-border">
                                            {formatoMoneda(venta.efectivo, configuracion.simboloMoneda)}
                                        </td>

                                        <td className="border-r border-slate-300 px-2 py-2 font-bold print-border">
                                            {formatoMoneda(venta.tarjeta, configuracion.simboloMoneda)}
                                        </td>

                                        <td className="border-r border-slate-300 px-2 py-2 font-bold print-border">
                                            {formatoMoneda(
                                                venta.transferencia,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>

                                        <td className="px-2 py-2 font-bold">
                                            {formatoMoneda(venta.credito, configuracion.simboloMoneda)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {(venta.tarjeta > 0 || venta.posNombre || venta.posBanco) && (
                            <p className="print-small mt-2 text-[10px] leading-4 text-slate-600">
                                POS: {venta.posNombre || "No especificado"} · Banco:{" "}
                                {venta.posBanco || "No especificado"} · Comisión:{" "}
                                {formatoMoneda(comisionPOS, configuracion.simboloMoneda)} · Neto
                                tarjeta:{" "}
                                {formatoMoneda(netoTarjeta, configuracion.simboloMoneda)}
                            </p>
                        )}

                        {venta.observaciones && (
                            <p className="print-small mt-2 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                                <strong>Observaciones:</strong> {venta.observaciones}
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Subtotal</span>
                            <strong>
                                {formatoMoneda(venta.total, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Total pagado</span>
                            <strong>
                                {formatoMoneda(totalPagado, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Saldo / crédito</span>
                            <strong>
                                {formatoMoneda(saldoPendiente, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between bg-slate-100 px-3 py-2 print-light-bg">
                            <span className="text-sm font-black text-slate-700">
                                TOTAL
                            </span>
                            <strong className="text-lg text-slate-950">
                                {formatoMoneda(venta.total, configuracion.simboloMoneda)}
                            </strong>
                        </div>
                    </div>
                </section>

                {abonos.length > 0 && (
                    <section className="py-3 print:py-2">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                                Abonos registrados
                            </h2>

                            <p className="text-[10px] font-bold text-slate-500">
                                {abonos.length} abono(s)
                            </p>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                            <table className="print-table w-full border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-slate-100 print-light-bg">
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Fecha
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Método
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Monto
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {abonos.map((abono) => (
                                        <tr key={abono.id}>
                                            <td className="border-b border-r border-slate-300 px-2 py-2 font-bold print-border">
                                                {fechaLegible(abono.fecha)} · {abono.hora}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 print-border">
                                                {abono.metodo}
                                            </td>

                                            <td className="border-b border-slate-300 px-2 py-2 text-right font-black print-border">
                                                {formatoMoneda(
                                                    abono.monto,
                                                    configuracion.simboloMoneda
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <section className="print-section mt-7 grid gap-8 md:grid-cols-2 print:mt-5">
                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma autorizada
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {venta.usuarioNombre || "Usuario no identificado"}
                            </p>
                        </div>
                    </div>

                    <div className="pt-7 print:pt-5">
                        <div className="border-t border-slate-500 pt-1.5 text-center">
                            <p className="text-xs font-black text-slate-950">
                                Firma paciente / cliente
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {venta.clienteNombre}
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="mt-3 border-t border-slate-300 pt-2 text-center text-[10px] leading-4 text-slate-500 print-border">
                    <p>{configuracion.mensajeRecibo || "Gracias por su preferencia."}</p>
                    <p>Recibo No. {venta.id} · Emitido desde el sistema clínico.</p>
                </footer>
            </section>
        </main>
    );
}