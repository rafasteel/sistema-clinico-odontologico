"use client";

import { resumirVentas } from "@/lib/resumenFinanciero";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Banknote,
    Calculator,
    CheckCircle2,
    CreditCard,
    FileText,
    LockKeyhole,
    Printer,
    ReceiptText,
    RefreshCcw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    Wallet,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    listarVentasSupabase,
    type EstadoVentaSupabase,
    type VentaSupabase,
} from "@/lib/supabase/finanzas";
import {
    listarGastosSupabase,
    type EstadoGastoSupabase,
    type GastoSupabase,
    type MetodoGastoSupabase,
} from "@/lib/supabase/gastos";
import {
    reabrirCierreCajaSupabase,
    crearCierreCajaSupabase,
    obtenerResumenCajaSupabase,
    type ResumenCajaSupabase,
    listarCierresCajaSupabase,
    type CierreCajaSupabase,
    type EstadoCierreCajaSupabase,
} from "@/lib/supabase/cierresCaja";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
};

type Venta = {
    id: string;
    fecha: string;
    hora: string;
    tipoCobro: string;
    clienteNombre: string;
    concepto: string;
    total: number;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    credito: number;
    estado: EstadoVentaSupabase;
    comisionTarjeta: number;
    netoTarjeta: number;
};

type EstadoGasto = EstadoGastoSupabase;

type Gasto = {
    id: string;
    fecha: string;
    hora: string;
    categoria: string;
    descripcion: string;
    monto: number;
    metodoPago: MetodoGastoSupabase;
    proveedor: string;
    usuarioNombre: string;
    observaciones: string;
    estado: EstadoGasto;
};

type CierreCaja = {
    id: string;
    fecha: string;
    hora: string;
    usuarioNombre: string;
    ventasCantidad: number;
    ventasBrutas: number;
    efectivoSistema: number;
    tarjetaSistema: number;
    transferenciaSistema: number;
    creditoGenerado: number;
    gastosEfectivo: number;
    gastosTarjeta: number;
    gastosTransferencia: number;
    gastosTotal: number;
    comisionPOS: number;
    netoTarjeta: number;
    efectivoEsperado: number;
    efectivoContado: number;
    tarjetaEsperada: number;
    tarjetaReportada: number;
    transferenciaEsperada: number;
    transferenciaReportada: number;
    diferenciaEfectivo: number;
    diferenciaTarjeta: number;
    diferenciaTransferencia: number;
    estado: EstadoCierreCajaSupabase;
    observaciones: string;
    motivoReapertura: string;
    resumenVersion: number;
    totalCobrado: number | null;
    abonosCobrados: number | null;
};

type FormularioCierre = {
    efectivoContado: string;
    tarjetaReportada: string;
    transferenciaReportada: string;
    observaciones: string;
};

const formularioVacio: FormularioCierre = {
    efectivoContado: "",
    tarjetaReportada: "",
    transferenciaReportada: "",
    observaciones: "",
};

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function numero(valor: string | number | null | undefined) {
    const convertido = Number(valor || 0);
    if (Number.isNaN(convertido)) return 0;
    return convertido;
}

function horaCorta(valor: string) {
    return String(valor || "").slice(0, 5);
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function colorDiferencia(valor: number) {
    if (Math.abs(valor) < 0.01) return "text-emerald-700";
    if (valor > 0) return "text-blue-700";
    return "text-red-700";
}

function textoDiferencia(valor: number, simbolo: string) {
    if (Math.abs(valor) < 0.01) return "Cuadrado";
    if (valor > 0) return `Sobra ${formatoMoneda(valor, simbolo)}`;
    return `Falta ${formatoMoneda(Math.abs(valor), simbolo)}`;
}

function normalizarTexto(valor: unknown) {
    return String(valor || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function convertirVenta(venta: VentaSupabase): Venta {
    return {
        id: venta.id,
        fecha: venta.fecha,
        hora: horaCorta(venta.hora),
        tipoCobro: venta.tipo_cobro || "Venta",
        clienteNombre: venta.cliente_nombre || "",
        concepto: venta.concepto || "",
        total: Number(venta.total || 0),
        efectivo: Number(venta.efectivo || 0),
        tarjeta: Number(venta.tarjeta || 0),
        transferencia: Number(venta.transferencia || 0),
        credito: Number(venta.credito || 0),
        estado: venta.estado || "Pagada",
        comisionTarjeta: Number(venta.comision_pos_monto || 0),
        netoTarjeta: Number(venta.neto_tarjeta || 0),
    };
}

function convertirGasto(gasto: GastoSupabase): Gasto {
    return {
        id: gasto.id,
        fecha: gasto.fecha,
        hora: horaCorta(gasto.hora),
        categoria: gasto.categoria || "",
        descripcion: gasto.descripcion || "",
        monto: Number(gasto.monto || 0),
        metodoPago: gasto.metodo_pago || "Efectivo",
        proveedor: gasto.proveedor || "",
        usuarioNombre: gasto.usuario_nombre || "",
        observaciones: gasto.observaciones || "",
        estado: gasto.estado || "Activo",
    };
}

function convertirCierre(cierre: CierreCajaSupabase): CierreCaja {
    return {
        id: cierre.id,
        fecha: cierre.fecha,
        hora: horaCorta(cierre.hora),
        usuarioNombre: cierre.usuario_nombre || "",
        ventasCantidad: Number(cierre.ventas_cantidad || 0),
        ventasBrutas: Number(cierre.ventas_brutas || 0),
        efectivoSistema: Number(cierre.efectivo_sistema || 0),
        tarjetaSistema: Number(cierre.tarjeta_sistema || 0),
        transferenciaSistema: Number(cierre.transferencia_sistema || 0),
        creditoGenerado: Number(cierre.credito_generado || 0),
        gastosEfectivo: Number(cierre.gastos_efectivo || 0),
        gastosTarjeta: Number(cierre.gastos_tarjeta || 0),
        gastosTransferencia: Number(cierre.gastos_transferencia || 0),
        gastosTotal: Number(cierre.gastos_total || 0),
        comisionPOS: Number(cierre.comision_pos || 0),
        netoTarjeta: Number(cierre.neto_tarjeta || 0),
        efectivoEsperado: Number(cierre.efectivo_esperado || 0),
        efectivoContado: Number(cierre.efectivo_contado || 0),
        tarjetaEsperada: Number(cierre.tarjeta_esperada || 0),
        tarjetaReportada: Number(cierre.tarjeta_reportada || 0),
        transferenciaEsperada: Number(cierre.transferencia_esperada || 0),
        transferenciaReportada: Number(cierre.transferencia_reportada || 0),
        diferenciaEfectivo: Number(cierre.diferencia_efectivo || 0),
        diferenciaTarjeta: Number(cierre.diferencia_tarjeta || 0),
        diferenciaTransferencia: Number(cierre.diferencia_transferencia || 0),
        estado: cierre.estado || "Cuadrado",
        observaciones: cierre.observaciones || "",
        motivoReapertura: cierre.motivo_reapertura || "",
        resumenVersion: cierre.resumen_version ?? 1,
        totalCobrado: cierre.total_cobrado,
        abonosCobrados: cierre.abonos_cobrados,
    };
}

export default function CierreCajaPage() {
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoyLocal());
    const [formulario, setFormulario] = useState<FormularioCierre>(formularioVacio);
    const [resumenServidor, setResumenServidor] = useState<ResumenCajaSupabase | null>(null);
    const [cierreImprimir, setCierreImprimir] = useState<CierreCaja | null>(null);
    const [error, setError] = useState("");

    const solicitudCargaRef = useRef(0);
    const resumenActual = resumenServidor?.fecha === fechaSeleccionada ? resumenServidor : null;
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    async function cargarDatos() {
        const solicitudActual = ++solicitudCargaRef.current;
        setCargando(true);
        setError("");

        try {
            const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
            if (usuarioGuardado) setUsuario(JSON.parse(usuarioGuardado) as UsuarioSistema);

            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }

            const [ventasSupabase, gastosSupabase, cierresSupabase, resumenSupabase] = await Promise.all([
                listarVentasSupabase(),
                listarGastosSupabase(fechaSeleccionada.slice(0, 7)),
                listarCierresCajaSupabase(),
                obtenerResumenCajaSupabase(fechaSeleccionada),
            ]);
            if (solicitudActual !== solicitudCargaRef.current) return;
            setResumenServidor(resumenSupabase);
            setVentas(ventasSupabase.map(convertirVenta));
            setGastos(gastosSupabase.map(convertirGasto));
            setCierres(cierresSupabase.map(convertirCierre));
        } catch (errorActual) {
            if (solicitudActual !== solicitudCargaRef.current) return;
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el cierre de caja desde Supabase.";
            setError(mensaje);
        } finally {
            if (solicitudActual === solicitudCargaRef.current) setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fechaSeleccionada]);

    function actualizarCampo<K extends keyof FormularioCierre>(
        campo: K,
        valor: FormularioCierre[K]
    ) {
        setFormulario((datosActuales) => ({ ...datosActuales, [campo]: valor }));
    }

    const ventasDia = useMemo(() => {
        return ventas
            .filter((venta) => venta.fecha === fechaSeleccionada)
            .filter((venta) => venta.estado !== "Anulada");
    }, [ventas, fechaSeleccionada]);

    const gastosDia = useMemo(() => {
        return gastos
            .filter((gasto) => gasto.fecha === fechaSeleccionada)
            .filter((gasto) => gasto.estado === "Activo");
    }, [gastos, fechaSeleccionada]);

    const cierreExistente = cierres.find(
        (cierre) => cierre.fecha === fechaSeleccionada && cierre.estado !== "Anulado"
    );

    const ventasBrutas = resumenActual?.ventas_brutas ?? resumirVentas(ventasDia).ventasBrutas;
    const efectivoSistema = resumenActual?.efectivo_sistema ?? (ventasDia.reduce((total, venta) => total + venta.efectivo, 0));
    const tarjetaSistema = resumenActual?.tarjeta_sistema ?? (ventasDia.reduce((total, venta) => total + venta.tarjeta, 0));
    const transferenciaSistema = resumenActual?.transferencia_sistema ?? (ventasDia.reduce((total, venta) => total + venta.transferencia, 0));
    const creditoGenerado = resumenActual?.credito_generado ?? (ventasDia.reduce((total, venta) => total + venta.credito, 0));

    const gastosEfectivo = resumenActual?.gastos_efectivo ?? (gastosDia
        .filter((gasto) => gasto.metodoPago === "Efectivo")
        .reduce((total, gasto) => total + gasto.monto, 0));
    const gastosTarjeta = resumenActual?.gastos_tarjeta ?? (gastosDia
        .filter((gasto) => gasto.metodoPago === "Tarjeta")
        .reduce((total, gasto) => total + gasto.monto, 0));
    const gastosTransferencia = resumenActual?.gastos_transferencia ?? (gastosDia
        .filter((gasto) => gasto.metodoPago === "Transferencia")
        .reduce((total, gasto) => total + gasto.monto, 0));
    const gastosTotal = resumenActual?.gastos_total ?? (gastosDia.reduce((total, gasto) => total + gasto.monto, 0));

    const comisionPOS = resumenActual?.comision_pos ?? (ventasDia.reduce((total, venta) => total + venta.comisionTarjeta, 0));
    const netoTarjeta = resumenActual?.neto_tarjeta ?? (ventasDia.reduce((total, venta) => total + venta.netoTarjeta, 0));

    const efectivoEsperado = efectivoSistema - gastosEfectivo;
    const tarjetaEsperada = tarjetaSistema - gastosTarjeta;
    const transferenciaEsperada = transferenciaSistema - gastosTransferencia;

    const efectivoContado = numero(formulario.efectivoContado);
    const tarjetaReportada = numero(formulario.tarjetaReportada);
    const transferenciaReportada = numero(formulario.transferenciaReportada);

    const diferenciaEfectivo = efectivoContado - efectivoEsperado;
    const diferenciaTarjeta = tarjetaReportada - tarjetaEsperada;
    const diferenciaTransferencia = transferenciaReportada - transferenciaEsperada;
    const diferenciaTotal = diferenciaEfectivo + diferenciaTarjeta + diferenciaTransferencia;

    const totalCobrado = efectivoSistema + tarjetaSistema + transferenciaSistema;
    const totalNetoCaja = efectivoEsperado + transferenciaEsperada + netoTarjeta - gastosTarjeta;

    function cargarMontosSistema() {
        setFormulario((datos) => ({
            ...datos,
            efectivoContado: efectivoEsperado.toFixed(2),
            tarjetaReportada: tarjetaEsperada.toFixed(2),
            transferenciaReportada: transferenciaEsperada.toFixed(2),
        }));
    }

    function limpiarFormulario() {
        setFormulario(formularioVacio);
    }

    async function registrarCierre(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (cargando || !resumenActual) { alert("Esperá a que se actualice el resumen del día."); return; }

        if (cierreExistente) {
            alert("Ya existe un cierre registrado para esta fecha.");
            return;
        }

        if (ventasDia.length === 0 && gastosDia.length === 0) {
            const confirmar = window.confirm(
                "No hay ventas ni gastos para esta fecha. ¿Deseas registrar cierre en cero?"
            );
            if (!confirmar) return;
        }


        setGuardando(true);

        try {
            await crearCierreCajaSupabase({
                fecha: fechaSeleccionada,
                efectivo_contado: efectivoContado,
                tarjeta_reportada: tarjetaReportada,
                transferencia_reportada: transferenciaReportada,
                observaciones: formulario.observaciones.trim(),
                resumen_esperado: resumenActual.huella,
            });

            limpiarFormulario();
            await cargarDatos();
            alert("Cierre de caja registrado correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo registrar el cierre.";
            try { setResumenServidor(await obtenerResumenCajaSupabase(fechaSeleccionada)); }
            catch { setResumenServidor(null); }
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function eliminarCierre(cierre: CierreCaja) {
        const confirmar = window.confirm(
            "¿Reabrir esta fecha? El cierre anterior se conservará y un nuevo cierre tendrá su propia instantánea."
        );
        if (!confirmar) return;

        setGuardando(true);
        try {
            const motivo = window.prompt("Motivo obligatorio de la reapertura:");
            if (!motivo?.trim()) return;
            await reabrirCierreCajaSupabase(cierre.id, motivo.trim());
            await cargarDatos();
            alert("Fecha reabierta. El cierre anterior se conserva en el historial.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo anular el cierre.";
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    function imprimirCierre(cierre?: CierreCaja) {
        if (!cierre && !cierreExistente) {
            alert("Primero registra el cierre para imprimirlo.");
            return;
        }
        setCierreImprimir(cierre || cierreExistente || null);
        requestAnimationFrame(() => window.print());
    }

    const cierreParaImprimir = cierreImprimir || cierreExistente;

    const cierresFiltrados = cierres.filter((cierre) => {
        const texto = normalizarTexto(busqueda);
        if (!texto) return true;
        return (
            normalizarTexto(cierre.fecha).includes(texto) ||
            normalizarTexto(cierre.usuarioNombre).includes(texto) ||
            normalizarTexto(cierre.estado).includes(texto) ||
            normalizarTexto(cierre.id).includes(texto)
        );
    });

    return (
        <AppShell
            titulo="Cierre de Caja"
            descripcion="Cuadre diario de efectivo, tarjeta, transferencias, créditos, gastos y diferencias"
            moduloActivo="Cierre de Caja"
        >
            {error && (
                <section className="print:hidden mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">No se pudo cargar cierre de caja</h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">{error}</p>
                        </div>
                    </div>
                </section>
            )}

            <section className="print:hidden mb-4 flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">Cierre conectado a Supabase</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Ventas, gastos y cierres se leen desde Supabase.</p>
                </div>
                <button
                    type="button"
                    onClick={cargarDatos}
                    disabled={cargando || guardando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    Recargar
                </button>
            </section>

            <section className="print:hidden grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <Banknote className="h-5 w-5 text-emerald-700" />
                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">{formatoMoneda(totalCobrado, configuracion.simboloMoneda)}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Total cobrado del día</p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <CreditCard className="h-5 w-5 text-blue-700" />
                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">{formatoMoneda(comisionPOS, configuracion.simboloMoneda)}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Comisión tarjeta</p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <ReceiptText className="h-5 w-5 text-red-700" />
                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">{formatoMoneda(gastosTotal, configuracion.simboloMoneda)}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Gastos activos del día</p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <Wallet className="h-5 w-5 text-teal-700" />
                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">{formatoMoneda(totalNetoCaja, configuracion.simboloMoneda)}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Neto estimado del día</p>
                </div>
            </section>

            {cierreExistente && (
                <section className="print:hidden mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <div>
                            <h3 className="text-sm font-black text-emerald-800">Esta fecha ya fue cerrada</h3>
                            <p className="mt-1 text-xs leading-5 text-emerald-700">
                                El cierre de {fechaSeleccionada} fue registrado por <strong>{cierreExistente.usuarioNombre}</strong> a las <strong>{cierreExistente.hora}</strong>. Estado: <strong>{cierreExistente.estado}</strong>.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="print:hidden space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">Registrar cierre</h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">Conteo real contra montos del sistema</p>
                                </div>
                                <Calculator className="h-5 w-5 text-teal-700" />
                            </div>
                        </div>

                        <form onSubmit={registrarCierre} className="p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">Fecha a cerrar</label>
                                <input
                                    value={fechaSeleccionada}
                                    onChange={(event) => {
                                        setFechaSeleccionada(event.target.value);
                                        setFormulario(formularioVacio);
                                    }}
                                    type="date"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4 rounded-3xl bg-slate-50 p-5">
                                <h4 className="text-sm font-black text-slate-800">Valores esperados por sistema</h4>
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">Efectivo esperado</p>
                                        <p className="mt-1 text-sm font-black text-emerald-700">{formatoMoneda(efectivoEsperado, configuracion.simboloMoneda)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">Tarjeta esperada</p>
                                        <p className="mt-1 text-sm font-black text-blue-700">{formatoMoneda(tarjetaEsperada, configuracion.simboloMoneda)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">Transferencia esperada</p>
                                        <p className="mt-1 text-sm font-black text-indigo-700">{formatoMoneda(transferenciaEsperada, configuracion.simboloMoneda)}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={cargarMontosSistema} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Usar montos del sistema
                                </button>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">Efectivo contado</label>
                                    <input value={formulario.efectivoContado} onChange={(event) => actualizarCampo("efectivoContado", event.target.value)} type="number" placeholder="0.00" disabled={!!cierreExistente} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">Tarjeta reportada</label>
                                    <input value={formulario.tarjetaReportada} onChange={(event) => actualizarCampo("tarjetaReportada", event.target.value)} type="number" placeholder="0.00" disabled={!!cierreExistente} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100" />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">Transferencia reportada</label>
                                    <input value={formulario.transferenciaReportada} onChange={(event) => actualizarCampo("transferenciaReportada", event.target.value)} type="number" placeholder="0.00" disabled={!!cierreExistente} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100" />
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl bg-slate-50 p-5">
                                <h4 className="text-sm font-black text-slate-800">Diferencias</h4>
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">Efectivo</p>
                                        <p className={`mt-1 text-sm font-black ${colorDiferencia(diferenciaEfectivo)}`}>{textoDiferencia(diferenciaEfectivo, configuracion.simboloMoneda)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">Tarjeta</p>
                                        <p className={`mt-1 text-sm font-black ${colorDiferencia(diferenciaTarjeta)}`}>{textoDiferencia(diferenciaTarjeta, configuracion.simboloMoneda)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">Transferencia</p>
                                        <p className={`mt-1 text-sm font-black ${colorDiferencia(diferenciaTransferencia)}`}>{textoDiferencia(diferenciaTransferencia, configuracion.simboloMoneda)}</p>
                                    </div>
                                </div>
                                {Math.abs(diferenciaTotal) > 0.01 && (
                                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                        <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                                            <AlertTriangle className="h-4 w-4" />
                                            Hay diferencia total de {formatoMoneda(diferenciaTotal, configuracion.simboloMoneda)}. Podés cerrar, pero quedará marcado con diferencia.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">Observaciones del cierre</label>
                                <textarea value={formulario.observaciones} onChange={(event) => actualizarCampo("observaciones", event.target.value)} rows={4} placeholder="Notas, motivo de diferencias, referencias POS..." disabled={!!cierreExistente} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100" />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button disabled={!!cierreExistente || guardando} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                                    <LockKeyhole className="h-4 w-4" />
                                    {guardando ? "Guardando..." : "Registrar cierre"}
                                </button>
                                <button type="button" onClick={limpiarFormulario} className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50">Limpiar</button>
                                <button type="button" onClick={() => imprimirCierre(cierreExistente)} className="flex items-center gap-2 rounded-xl bg-blue-50 px-5 py-3 text-[12px] font-bold text-blue-700 hover:bg-blue-100">
                                    <Printer className="h-4 w-4" />
                                    Imprimir
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">Resumen del día</h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">Ventas, gastos, créditos y comisión POS</p>
                        </div>
                        <div className="p-6">
                            <div className="grid gap-3 md:grid-cols-2">
                                <ResumenItem titulo="Ventas nuevas (sin abonos)" valor={ventasBrutas} color="slate" simbolo={configuracion.simboloMoneda} />
                                <ResumenItem titulo="Abonos cobrados" valor={resumenActual?.abonos_cobrados ?? resumirVentas(ventasDia).abonosCobrados} color="emerald" simbolo={configuracion.simboloMoneda} />
                                <ResumenItem titulo="Efectivo cobrado" valor={efectivoSistema} color="emerald" simbolo={configuracion.simboloMoneda} />
                                <ResumenItem titulo="Gastos efectivo" valor={gastosEfectivo} color="red" simbolo={configuracion.simboloMoneda} />
                                <ResumenItem titulo="Tarjeta cobrada" valor={tarjetaSistema} color="blue" simbolo={configuracion.simboloMoneda} />
                                <ResumenItem titulo="Neto tarjeta" valor={netoTarjeta} color="slate" simbolo={configuracion.simboloMoneda} />
                                <ResumenItem titulo="Transferencias" valor={transferenciaSistema} color="indigo" simbolo={configuracion.simboloMoneda} />
                                <ResumenItem titulo="Crédito generado" valor={creditoGenerado} color="amber" simbolo={configuracion.simboloMoneda} />
                            </div>
                            <div className="mt-4 rounded-3xl bg-slate-900 p-5 text-white">
                                <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Resultado del día</p>
                                <h4 className="mt-2 text-xl font-black">{formatoMoneda(totalNetoCaja, configuracion.simboloMoneda)}</h4>
                                <p className="mt-3 text-xs leading-5 text-white/50">Neto estimado considerando efectivo esperado, transferencias, tarjeta neta y gastos por métodos principales.</p>
                            </div>
                        </div>
                    </div>

                    <ListaSimple titulo="Ventas del día" vacio="No hay ventas activas en esta fecha." icono="venta">
                        {cargando && <p className="rounded-2xl border border-teal-100 bg-teal-50 p-6 text-center text-xs font-bold text-teal-700">Cargando ventas desde Supabase...</p>}
                        {!cargando && ventasDia.map((venta) => (
                            <div key={venta.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800">{venta.clienteNombre}</h4>
                                        <p className="mt-1 text-xs text-slate-500">{venta.concepto}</p>
                                    </div>
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{formatoMoneda(venta.total, configuracion.simboloMoneda)}</span>
                                </div>
                                <p className="mono mt-3 text-[10px] text-slate-400">{venta.hora} · {venta.tipoCobro} · {venta.estado}</p>
                            </div>
                        ))}
                        {!cargando && ventasDia.length === 0 && <Vacio texto="No hay ventas activas en esta fecha." />}
                    </ListaSimple>

                    <ListaSimple titulo="Gastos del día" vacio="No hay gastos activos en esta fecha." icono="gasto">
                        {gastosDia.map((gasto) => (
                            <div key={gasto.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800">{gasto.descripcion}</h4>
                                        <p className="mt-1 text-xs text-slate-500">{gasto.categoria}</p>
                                    </div>
                                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">{formatoMoneda(gasto.monto, configuracion.simboloMoneda)}</span>
                                </div>
                                <p className="mono mt-3 text-[10px] text-slate-400">{gasto.hora} · {gasto.metodoPago} · {gasto.proveedor || "Sin proveedor"}</p>
                            </div>
                        ))}
                        {gastosDia.length === 0 && <Vacio texto="No hay gastos activos en esta fecha." />}
                    </ListaSimple>
                </div>
            </section>

            <section className="print:hidden mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-[16px] font-bold text-slate-800">Historial de cierres</h3>
            <p className="mono mt-0.5 text-[10px] text-slate-400">Instantáneas de cierres, incluidos los reabiertos</p>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-80">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar cierre..." className="w-full bg-transparent text-[13px] font-medium outline-none" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px]">
                        <thead>
                            <tr className="border-b border-black/[0.04]">
                                {["Fecha", "Usuario", "Ventas", "Efectivo", "Tarjeta", "Transferencia", "Diferencia", "Estado", "Acciones"].map((titulo) => (
                                    <th key={titulo} className="mono px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pl-6">{titulo}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {cierresFiltrados.map((cierre) => {
                                const diferencia = cierre.diferenciaEfectivo + cierre.diferenciaTarjeta + cierre.diferenciaTransferencia;
                                return (
                                    <tr key={cierre.id} className="border-b border-black/[0.03]">
                                        <td className="px-6 py-4"><p className="text-[12px] font-bold text-slate-700">{cierre.fecha}</p><p className="mono mt-0.5 text-[10px] text-slate-400">{cierre.hora}</p></td>
                                        <td className="px-4 py-4 text-[12px] text-slate-500">{cierre.usuarioNombre}</td>
                                        <td className="px-4 py-4"><p className="text-[12px] font-black text-slate-800">{cierre.ventasCantidad}</p><p className="mono mt-0.5 text-[10px] text-slate-400">{formatoMoneda(cierre.ventasBrutas, configuracion.simboloMoneda)}</p></td>
                                        <td className="px-4 py-4 text-[12px] text-slate-500">{formatoMoneda(cierre.efectivoContado, configuracion.simboloMoneda)}</td>
                                        <td className="px-4 py-4 text-[12px] text-slate-500">{formatoMoneda(cierre.tarjetaReportada, configuracion.simboloMoneda)}</td>
                                        <td className="px-4 py-4 text-[12px] text-slate-500">{formatoMoneda(cierre.transferenciaReportada, configuracion.simboloMoneda)}</td>
                                        <td className={`px-4 py-4 text-[12px] font-black ${colorDiferencia(diferencia)}`}>{formatoMoneda(diferencia, configuracion.simboloMoneda)}</td>
                                        <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cierre.estado === "Cuadrado" ? "bg-emerald-50 text-emerald-700" : cierre.estado === "Anulado" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{cierre.estado === "Anulado" ? "Reabierto" : cierre.estado}</span>{cierre.motivoReapertura && <p className="mt-1 text-xs text-slate-500">{cierre.motivoReapertura}</p>}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => imprimirCierre(cierre)} className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"><Printer className="h-3.5 w-3.5" />Imprimir</button>
                                                {cierre.estado !== "Anulado" && usuario?.rol === "ADMIN" && <button onClick={() => eliminarCierre(cierre)} disabled={guardando} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" />Reabrir</button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {cierresFiltrados.length === 0 && <tr><td colSpan={9} className="px-6 py-10 text-center text-[12px] text-slate-400">{cargando ? "Cargando cierres..." : "No hay cierres registrados o no coinciden con la búsqueda."}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="hidden print:block bg-white p-8 text-slate-900">
                <h1 className="text-2xl font-black">Cierre de caja - {cierreParaImprimir?.fecha}</h1>
                <p className="mt-1 text-sm">{configuracion.nombreClinica} · Registrado por {cierreParaImprimir?.usuarioNombre}</p>
                <p>Estado: {cierreParaImprimir?.estado}</p>
                {cierreParaImprimir?.resumenVersion === 1 && <p>Cierre histórico anterior a la separación de ventas y abonos.</p>}
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div>
                        <p>Ventas: {cierreParaImprimir?.ventasCantidad}</p>
                        <p>Ventas brutas: {formatoMoneda(cierreParaImprimir?.ventasBrutas ?? 0, configuracion.simboloMoneda)}</p>
                        <p>Total cobrado: {formatoMoneda(cierreParaImprimir?.totalCobrado ?? ((cierreParaImprimir?.efectivoSistema ?? 0) + (cierreParaImprimir?.tarjetaSistema ?? 0) + (cierreParaImprimir?.transferenciaSistema ?? 0)), configuracion.simboloMoneda)}</p>
                        <p>Abonos cobrados: {cierreParaImprimir?.abonosCobrados == null ? "No desglosados en este cierre histórico" : formatoMoneda(cierreParaImprimir.abonosCobrados, configuracion.simboloMoneda)}</p>
                    </div>
                    <div>
                        <p>Gastos total: {formatoMoneda(cierreParaImprimir?.gastosTotal ?? 0, configuracion.simboloMoneda)}</p>
                        <p>Crédito generado: {formatoMoneda(cierreParaImprimir?.creditoGenerado ?? 0, configuracion.simboloMoneda)}</p>
                        <p>Comisión POS: {formatoMoneda(cierreParaImprimir?.comisionPOS ?? 0, configuracion.simboloMoneda)}</p>
                        <p>Neto tarjeta: {formatoMoneda(cierreParaImprimir?.netoTarjeta ?? 0, configuracion.simboloMoneda)}</p>
                    </div>
                </div>
                <div className="mt-8 border-t pt-6">
                    <p>Efectivo esperado / contado / diferencia: {formatoMoneda(cierreParaImprimir?.efectivoEsperado ?? 0, configuracion.simboloMoneda)} / {formatoMoneda(cierreParaImprimir?.efectivoContado ?? 0, configuracion.simboloMoneda)} / {formatoMoneda(cierreParaImprimir?.diferenciaEfectivo ?? 0, configuracion.simboloMoneda)}</p>
                    <p>Tarjeta esperada / reportada / diferencia: {formatoMoneda(cierreParaImprimir?.tarjetaEsperada ?? 0, configuracion.simboloMoneda)} / {formatoMoneda(cierreParaImprimir?.tarjetaReportada ?? 0, configuracion.simboloMoneda)} / {formatoMoneda(cierreParaImprimir?.diferenciaTarjeta ?? 0, configuracion.simboloMoneda)}</p>
                    <p>Transferencia esperada / reportada / diferencia: {formatoMoneda(cierreParaImprimir?.transferenciaEsperada ?? 0, configuracion.simboloMoneda)} / {formatoMoneda(cierreParaImprimir?.transferenciaReportada ?? 0, configuracion.simboloMoneda)} / {formatoMoneda(cierreParaImprimir?.diferenciaTransferencia ?? 0, configuracion.simboloMoneda)}</p>
                    {cierreParaImprimir?.motivoReapertura && <p>Motivo de reapertura: {cierreParaImprimir.motivoReapertura}</p>}
                </div>
            </section>
        </AppShell>
    );
}

function ResumenItem({ titulo, valor, color, simbolo }: { titulo: string; valor: number; color: "emerald" | "red" | "blue" | "slate" | "indigo" | "amber"; simbolo: string }) {
    const clases = {
        emerald: "bg-emerald-50 text-emerald-700",
        red: "bg-red-50 text-red-700",
        blue: "bg-blue-50 text-blue-700",
        slate: "bg-slate-50 text-slate-800",
        indigo: "bg-indigo-50 text-indigo-700",
        amber: "bg-amber-50 text-amber-700",
    }[color];

    return (
        <div className={`rounded-2xl p-4 ${clases}`}>
            <p className="text-[11px] font-bold opacity-80">{titulo}</p>
            <p className="mt-1 text-sm font-black">{formatoMoneda(valor, simbolo)}</p>
        </div>
    );
}

function ListaSimple({ titulo, children }: { titulo: string; vacio: string; icono: string; children: React.ReactNode }) {
    return (
        <div className="glass-card overflow-hidden rounded-2xl">
            <div className="border-b border-black/[0.04] px-6 py-4">
                <h3 className="text-[16px] font-bold text-slate-800">{titulo}</h3>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-4">
                <div className="space-y-3">{children}</div>
            </div>
        </div>
    );
}

function Vacio({ texto }: { texto: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-xs font-medium text-slate-400">{texto}</p>
        </div>
    );
}
