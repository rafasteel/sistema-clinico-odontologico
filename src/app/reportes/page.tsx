"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BadgeDollarSign,
    Banknote,
    BarChart3,
    CalendarDays,
    CreditCard,
    Download,
    FileText,
    Package,
    ReceiptText,
    Search,
    ShieldAlert,
    TrendingDown,
    TrendingUp,
    Wallet,
} from "lucide-react";
import AppShell from "@/components/AppShell";
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
};

type EstadoGasto = "Activo" | "Anulado";

type Gasto = {
    id: string;
    fecha: string;
    hora: string;
    categoria: string;
    descripcion: string;
    monto: number;
    metodoPago: string;
    proveedor: string;
    usuarioNombre: string;
    observaciones: string;
    estado: EstadoGasto;
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
    abonos: unknown[];
};

type EstadoCuentaPagar =
    | "Pendiente"
    | "Parcial"
    | "Pagada"
    | "Vencida"
    | "Anulada";

type CuentaPorPagar = {
    id: string;
    compraId: string;
    proveedorId: string;
    proveedorNombre: string;
    concepto: string;
    total: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuentaPagar;
    abonos: unknown[];
};

type EstadoProducto = "Activo" | "Inactivo";

type Producto = {
    id: string;
    codigo: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stock: number;
    stockMinimo: number;
    costoCompra: number;
    precioVenta: number;
    proveedor: string;
    vencimiento: string;
    estado: EstadoProducto;
};

type EstadoCompra = "Activa" | "Anulada";

type CompraProveedor = {
    id: string;
    fecha: string;
    hora: string;
    proveedorId: string;
    proveedorNombre: string;
    productoId: string;
    productoNombre: string;
    cantidad: number;
    costoUnitario: number;
    total: number;
    pagoAhora: number;
    credito: number;
    metodoPago: string;
    fechaVencimiento: string;
    estado: EstadoCompra;
    usuarioNombre: string;
    observaciones: string;
    gastoId: string;
    cuentaPagarId: string;
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
    tarjetaReportada: number;
    transferenciaReportada: number;
    diferenciaEfectivo: number;
    diferenciaTarjeta: number;
    diferenciaTransferencia: number;
    estado: "Cuadrado" | "Con diferencia";
    observaciones: string;
};

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function mesActualLocal() {
    return fechaHoyLocal().slice(0, 7);
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function porcentaje(valor: number, total: number) {
    if (total <= 0) return 0;
    return Math.min((valor / total) * 100, 100);
}

function descargarCSV(nombreArchivo: string, filas: string[][]) {
    const contenido = filas
        .map((fila) =>
            fila
                .map((celda) => `"${String(celda).replaceAll('"', '""')}"`)
                .join(",")
        )
        .join("\n");

    const blob = new Blob([contenido], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();

    URL.revokeObjectURL(url);
}

function estadoVisualCuenta(fechaVencimiento: string, estado: string) {
    if (estado === "Pagada" || estado === "Anulada") return estado;

    if (fechaVencimiento && fechaVencimiento < fechaHoyLocal()) {
        return "Vencida";
    }

    return estado;
}

export default function ReportesPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [ventas, setVentas] = useState<Venta[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [cuentasCobrar, setCuentasCobrar] = useState<CuentaPorCobrar[]>([]);
    const [cuentasPagar, setCuentasPagar] = useState<CuentaPorPagar[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [compras, setCompras] = useState<CompraProveedor[]>([]);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);

    const [mesSeleccionado, setMesSeleccionado] = useState(mesActualLocal());
    const [busqueda, setBusqueda] = useState("");

    useEffect(() => {
        const ventasGuardadas = localStorage.getItem("ventas_sistema_clinico");
        const gastosGuardados = localStorage.getItem("gastos_sistema_clinico");
        const cuentasCobrarGuardadas = localStorage.getItem(
            "cuentas_cobrar_sistema_clinico"
        );
        const cuentasPagarGuardadas = localStorage.getItem(
            "cuentas_pagar_sistema_clinico"
        );
        const productosGuardados = localStorage.getItem("productos_sistema_clinico");
        const comprasGuardadas = localStorage.getItem(
            "compras_proveedores_sistema_clinico"
        );
        const cierresGuardados = localStorage.getItem(
            "cierres_caja_sistema_clinico"
        );

        setConfiguracion(obtenerConfiguracionClinica());

        if (ventasGuardadas) setVentas(JSON.parse(ventasGuardadas) as Venta[]);
        if (gastosGuardados) setGastos(JSON.parse(gastosGuardados) as Gasto[]);

        if (cuentasCobrarGuardadas) {
            setCuentasCobrar(JSON.parse(cuentasCobrarGuardadas) as CuentaPorCobrar[]);
        }

        if (cuentasPagarGuardadas) {
            setCuentasPagar(JSON.parse(cuentasPagarGuardadas) as CuentaPorPagar[]);
        }

        if (productosGuardados) {
            setProductos(JSON.parse(productosGuardados) as Producto[]);
        }

        if (comprasGuardadas) {
            setCompras(JSON.parse(comprasGuardadas) as CompraProveedor[]);
        }

        if (cierresGuardados) {
            setCierres(JSON.parse(cierresGuardados) as CierreCaja[]);
        }
    }, []);

    const ventasPeriodo = useMemo(() => {
        return ventas.filter(
            (venta) =>
                venta.fecha.startsWith(mesSeleccionado) && venta.estado !== "Anulada"
        );
    }, [ventas, mesSeleccionado]);

    const gastosPeriodo = useMemo(() => {
        return gastos.filter(
            (gasto) =>
                gasto.fecha.startsWith(mesSeleccionado) && gasto.estado === "Activo"
        );
    }, [gastos, mesSeleccionado]);

    const comprasPeriodo = useMemo(() => {
        return compras.filter(
            (compra) =>
                compra.fecha.startsWith(mesSeleccionado) && compra.estado !== "Anulada"
        );
    }, [compras, mesSeleccionado]);

    const cierresPeriodo = useMemo(() => {
        return cierres.filter((cierre) => cierre.fecha.startsWith(mesSeleccionado));
    }, [cierres, mesSeleccionado]);

    const ventasBrutas = ventasPeriodo.reduce(
        (total, venta) => total + (venta.total || 0),
        0
    );

    const efectivo = ventasPeriodo.reduce(
        (total, venta) => total + (venta.efectivo || 0),
        0
    );

    const tarjeta = ventasPeriodo.reduce(
        (total, venta) => total + (venta.tarjeta || 0),
        0
    );

    const transferencia = ventasPeriodo.reduce(
        (total, venta) => total + (venta.transferencia || 0),
        0
    );

    const creditoGenerado = ventasPeriodo.reduce(
        (total, venta) => total + (venta.credito || 0),
        0
    );

    const ingresosCobrados = efectivo + tarjeta + transferencia;

    const comisionPOS = tarjeta * (configuracion.comisionPOS / 100);
    const netoTarjeta = tarjeta - comisionPOS;

    const gastosTotal = gastosPeriodo.reduce(
        (total, gasto) => total + (gasto.monto || 0),
        0
    );

    const comprasTotal = comprasPeriodo.reduce(
        (total, compra) => total + (compra.total || 0),
        0
    );

    const comprasPagadas = comprasPeriodo.reduce(
        (total, compra) => total + (compra.pagoAhora || 0),
        0
    );

    const comprasCredito = comprasPeriodo.reduce(
        (total, compra) => total + (compra.credito || 0),
        0
    );

    const utilidadOperativa = ingresosCobrados - gastosTotal - comisionPOS;

    const margenOperativo =
        ingresosCobrados > 0 ? (utilidadOperativa / ingresosCobrados) * 100 : 0;

    const cuentasCobrarPendientes = cuentasCobrar.filter(
        (cuenta) =>
            cuenta.estado !== "Pagada" &&
            cuenta.estado !== "Anulada" &&
            cuenta.saldo > 0
    );

    const cuentasPagarPendientes = cuentasPagar.filter(
        (cuenta) =>
            cuenta.estado !== "Pagada" &&
            cuenta.estado !== "Anulada" &&
            cuenta.saldo > 0
    );

    const totalPorCobrar = cuentasCobrarPendientes.reduce(
        (total, cuenta) => total + cuenta.saldo,
        0
    );

    const totalPorPagar = cuentasPagarPendientes.reduce(
        (total, cuenta) => total + cuenta.saldo,
        0
    );

    const cuentasCobrarVencidas = cuentasCobrarPendientes.filter(
        (cuenta) => estadoVisualCuenta(cuenta.fechaVencimiento, cuenta.estado) === "Vencida"
    );

    const cuentasPagarVencidas = cuentasPagarPendientes.filter(
        (cuenta) => estadoVisualCuenta(cuenta.fechaVencimiento, cuenta.estado) === "Vencida"
    );

    const productosActivos = productos.filter(
        (producto) => producto.estado === "Activo"
    );

    const valorInventarioCosto = productosActivos.reduce(
        (total, producto) => total + producto.stock * producto.costoCompra,
        0
    );

    const valorInventarioVenta = productosActivos.reduce(
        (total, producto) => total + producto.stock * producto.precioVenta,
        0
    );

    const productosBajoStock = productosActivos.filter(
        (producto) => producto.stock <= producto.stockMinimo
    );

    const cierresConDiferencia = cierresPeriodo.filter(
        (cierre) => cierre.estado === "Con diferencia"
    );

    const diferenciaCierres = cierresPeriodo.reduce((total, cierre) => {
        return (
            total +
            cierre.diferenciaEfectivo +
            cierre.diferenciaTarjeta +
            cierre.diferenciaTransferencia
        );
    }, 0);

    const ventasPorTipo = useMemo(() => {
        const mapa = new Map<string, number>();

        ventasPeriodo.forEach((venta) => {
            mapa.set(venta.tipoCobro, (mapa.get(venta.tipoCobro) || 0) + venta.total);
        });

        return Array.from(mapa.entries())
            .map(([tipo, total]) => ({ tipo, total }))
            .sort((a, b) => b.total - a.total);
    }, [ventasPeriodo]);

    const gastosPorCategoria = useMemo(() => {
        const mapa = new Map<string, number>();

        gastosPeriodo.forEach((gasto) => {
            mapa.set(gasto.categoria, (mapa.get(gasto.categoria) || 0) + gasto.monto);
        });

        return Array.from(mapa.entries())
            .map(([categoria, total]) => ({ categoria, total }))
            .sort((a, b) => b.total - a.total);
    }, [gastosPeriodo]);

    const ventasFiltradas = ventasPeriodo.filter((venta) => {
        const texto = busqueda.toLowerCase().trim();

        if (!texto) return true;

        return (
            venta.clienteNombre.toLowerCase().includes(texto) ||
            venta.concepto.toLowerCase().includes(texto) ||
            venta.tipoCobro.toLowerCase().includes(texto) ||
            venta.estado.toLowerCase().includes(texto)
        );
    });

    function exportarResumenCSV() {
        descargarCSV(`reporte-financiero-${mesSeleccionado}.csv`, [
            ["Reporte financiero", mesSeleccionado],
            ["Clínica", configuracion.nombreClinica],
            [],
            ["Indicador", "Valor"],
            ["Ventas brutas", ventasBrutas.toString()],
            ["Ingresos cobrados", ingresosCobrados.toString()],
            ["Efectivo", efectivo.toString()],
            ["Tarjeta", tarjeta.toString()],
            ["Transferencia", transferencia.toString()],
            ["Crédito generado", creditoGenerado.toString()],
            ["Comisión POS", comisionPOS.toString()],
            ["Gastos activos", gastosTotal.toString()],
            ["Utilidad operativa estimada", utilidadOperativa.toString()],
            ["Cuentas por cobrar pendientes", totalPorCobrar.toString()],
            ["Cuentas por pagar pendientes", totalPorPagar.toString()],
            ["Valor inventario costo", valorInventarioCosto.toString()],
            ["Valor inventario venta", valorInventarioVenta.toString()],
        ]);
    }

    return (
        <AppShell
            titulo="Reportes Financieros"
            descripcion="Resumen de ventas, gastos, créditos, compras, inventario y cierres"
            moduloActivo="Reportes Financieros"
        >
            {(cuentasCobrarVencidas.length > 0 ||
                cuentasPagarVencidas.length > 0 ||
                productosBajoStock.length > 0 ||
                cierresConDiferencia.length > 0) && (
                    <section className="mb-4 grid gap-4 lg:grid-cols-4">
                        {cuentasCobrarVencidas.length > 0 && (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
                                    <div>
                                        <h3 className="text-sm font-black text-amber-800">
                                            Créditos vencidos
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-amber-700">
                                            {cuentasCobrarVencidas.length} cuenta(s) por cobrar vencida(s).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {cuentasPagarVencidas.length > 0 && (
                            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 text-red-700" />
                                    <div>
                                        <h3 className="text-sm font-black text-red-800">
                                            Pagos vencidos
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-red-700">
                                            {cuentasPagarVencidas.length} cuenta(s) por pagar vencida(s).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {productosBajoStock.length > 0 && (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                                <div className="flex items-start gap-3">
                                    <Package className="mt-0.5 h-5 w-5 text-blue-700" />
                                    <div>
                                        <h3 className="text-sm font-black text-blue-800">
                                            Bajo stock
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-blue-700">
                                            {productosBajoStock.length} producto(s) requieren reposición.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {cierresConDiferencia.length > 0 && (
                            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
                                <div className="flex items-start gap-3">
                                    <ReceiptText className="mt-0.5 h-5 w-5 text-purple-700" />
                                    <div>
                                        <h3 className="text-sm font-black text-purple-800">
                                            Cierres con diferencia
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-purple-700">
                                            {cierresConDiferencia.length} cierre(s) con diferencia.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}

            <section className="glass-card rounded-2xl p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Panel financiero del período
                        </h3>
                        <p className="mono mt-0.5 text-[10px] text-slate-400">
                            Filtra por mes y exporta el resumen financiero
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                        <input
                            value={mesSeleccionado}
                            onChange={(event) => setMesSeleccionado(event.target.value)}
                            type="month"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />

                        <button
                            onClick={exportarResumenCSV}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Exportar CSV
                        </button>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <TrendingUp className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Ingresos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(ingresosCobrados, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total cobrado
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <TrendingDown className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Gastos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(gastosTotal, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Gastos activos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <CreditCard className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            POS
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(comisionPOS, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Comisión tarjeta
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${utilidadOperativa >= 0
                                    ? "bg-teal-50 text-teal-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                        >
                            <Wallet className="h-[18px] w-[18px]" />
                        </div>
                        <span
                            className={`mono rounded-full px-2 py-0.5 text-[10px] font-bold ${utilidadOperativa >= 0
                                    ? "bg-teal-50 text-teal-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                        >
                            Neto
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(utilidadOperativa, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Utilidad operativa estimada
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-teal-700" />
                                <h3 className="text-[16px] font-bold text-slate-800">
                                    Estado financiero general
                                </h3>
                            </div>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Lectura rápida del mes seleccionado
                            </p>
                        </div>

                        <div className="p-6">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-[11px] font-bold text-emerald-700">
                                        Ventas brutas
                                    </p>
                                    <p className="mt-1 text-sm font-black text-emerald-700">
                                        {formatoMoneda(ventasBrutas, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-amber-50 p-4">
                                    <p className="text-[11px] font-bold text-amber-700">
                                        Crédito generado
                                    </p>
                                    <p className="mt-1 text-sm font-black text-amber-700">
                                        {formatoMoneda(creditoGenerado, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-blue-50 p-4">
                                    <p className="text-[11px] font-bold text-blue-700">
                                        Margen operativo
                                    </p>
                                    <p className="mt-1 text-sm font-black text-blue-700">
                                        {margenOperativo.toFixed(2)}%
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-teal-50 p-4">
                                    <p className="text-[11px] font-bold text-teal-700">
                                        Por cobrar
                                    </p>
                                    <p className="mt-1 text-sm font-black text-teal-700">
                                        {formatoMoneda(totalPorCobrar, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-red-50 p-4">
                                    <p className="text-[11px] font-bold text-red-700">
                                        Por pagar
                                    </p>
                                    <p className="mt-1 text-sm font-black text-red-700">
                                        {formatoMoneda(totalPorPagar, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-purple-50 p-4">
                                    <p className="text-[11px] font-bold text-purple-700">
                                        Diferencia cierres
                                    </p>
                                    <p className="mt-1 text-sm font-black text-purple-700">
                                        {formatoMoneda(
                                            diferenciaCierres,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 rounded-3xl bg-slate-900 p-6 text-white">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                                            Resultado estimado
                                        </p>
                                        <h3 className="mt-2 text-3xl font-black">
                                            {formatoMoneda(
                                                utilidadOperativa,
                                                configuracion.simboloMoneda
                                            )}
                                        </h3>
                                        <p className="mt-2 text-xs leading-5 text-white/45">
                                            Ingresos cobrados menos gastos activos y comisión POS.
                                        </p>
                                    </div>

                                    <div
                                        className={`rounded-2xl px-4 py-3 text-sm font-black ${utilidadOperativa >= 0
                                                ? "bg-emerald-500/15 text-emerald-300"
                                                : "bg-red-500/15 text-red-300"
                                            }`}
                                    >
                                        {utilidadOperativa >= 0 ? "Resultado positivo" : "Resultado negativo"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Distribución de ingresos
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Por forma de pago
                            </p>
                        </div>

                        <div className="p-6">
                            {[
                                { nombre: "Efectivo", total: efectivo, icono: Banknote },
                                { nombre: "Tarjeta", total: tarjeta, icono: CreditCard },
                                { nombre: "Transferencia", total: transferencia, icono: FileText },
                                { nombre: "Crédito", total: creditoGenerado, icono: BadgeDollarSign },
                            ].map((item) => {
                                const Icono = item.icono;
                                const base = ventasBrutas > 0 ? ventasBrutas : ingresosCobrados;

                                return (
                                    <div key={item.nombre} className="mb-4 last:mb-0">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <Icono className="h-4 w-4 text-slate-400" />
                                                <span className="text-sm font-bold text-slate-700">
                                                    {item.nombre}
                                                </span>
                                            </div>

                                            <span className="mono text-xs font-bold text-slate-500">
                                                {formatoMoneda(item.total, configuracion.simboloMoneda)}
                                            </span>
                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-600"
                                                style={{ width: `${porcentaje(item.total, base)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Ventas del período
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Historial filtrado por mes
                            </p>

                            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                    value={busqueda}
                                    onChange={(event) => setBusqueda(event.target.value)}
                                    placeholder="Buscar venta..."
                                    className="w-full bg-transparent text-[13px] font-medium outline-none"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px]">
                                <thead>
                                    <tr className="border-b border-black/[0.04]">
                                        {["Fecha", "Cliente", "Concepto", "Total", "Estado"].map(
                                            (titulo) => (
                                                <th
                                                    key={titulo}
                                                    className="mono px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pl-6"
                                                >
                                                    {titulo}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>

                                <tbody>
                                    {ventasFiltradas.slice(0, 80).map((venta) => (
                                        <tr key={venta.id} className="border-b border-black/[0.03]">
                                            <td className="px-6 py-4">
                                                <p className="text-[12px] font-bold text-slate-700">
                                                    {venta.fecha}
                                                </p>
                                                <p className="mono mt-0.5 text-[10px] text-slate-400">
                                                    {venta.hora}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-[12px] text-slate-500">
                                                {venta.clienteNombre}
                                            </td>

                                            <td className="px-4 py-4">
                                                <p className="text-[12px] font-bold text-slate-700">
                                                    {venta.concepto}
                                                </p>
                                                <p className="mono mt-0.5 text-[10px] text-slate-400">
                                                    {venta.tipoCobro}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-[12px] font-black text-slate-800">
                                                {formatoMoneda(venta.total, configuracion.simboloMoneda)}
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${venta.estado === "Pagada"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : venta.estado === "Parcial"
                                                                ? "bg-amber-50 text-amber-700"
                                                                : "bg-blue-50 text-blue-700"
                                                        }`}
                                                >
                                                    {venta.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}

                                    {ventasFiltradas.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-6 py-10 text-center text-[12px] text-slate-400"
                                            >
                                                No hay ventas para este período o búsqueda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Ventas por tipo
                        </h3>

                        <div className="mt-4 space-y-4">
                            {ventasPorTipo.slice(0, 8).map((item) => (
                                <div key={item.tipo}>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="text-sm font-bold text-slate-700">
                                            {item.tipo}
                                        </span>

                                        <span className="mono text-xs font-bold text-slate-500">
                                            {formatoMoneda(item.total, configuracion.simboloMoneda)}
                                        </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-600"
                                            style={{ width: `${porcentaje(item.total, ventasBrutas)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {ventasPorTipo.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                    <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
                                    <p className="mt-3 text-xs text-slate-400">
                                        No hay ventas para analizar.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Gastos por categoría
                        </h3>

                        <div className="mt-4 space-y-4">
                            {gastosPorCategoria.slice(0, 8).map((item) => (
                                <div key={item.categoria}>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="text-sm font-bold text-slate-700">
                                            {item.categoria}
                                        </span>

                                        <span className="mono text-xs font-bold text-slate-500">
                                            {formatoMoneda(item.total, configuracion.simboloMoneda)}
                                        </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500"
                                            style={{ width: `${porcentaje(item.total, gastosTotal)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {gastosPorCategoria.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                    <ReceiptText className="mx-auto h-8 w-8 text-slate-300" />
                                    <p className="mt-3 text-xs text-slate-400">
                                        No hay gastos para analizar.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Compras y proveedores
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Compras registradas en el mes
                            </p>
                        </div>

                        <div className="p-5">
                            <div className="grid gap-3">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-[11px] font-bold text-slate-400">
                                        Total comprado
                                    </p>
                                    <p className="mt-1 text-sm font-black text-slate-800">
                                        {formatoMoneda(comprasTotal, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-[11px] font-bold text-emerald-700">
                                        Pagado a proveedores
                                    </p>
                                    <p className="mt-1 text-sm font-black text-emerald-700">
                                        {formatoMoneda(comprasPagadas, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-amber-50 p-4">
                                    <p className="text-[11px] font-bold text-amber-700">
                                        Crédito con proveedores
                                    </p>
                                    <p className="mt-1 text-sm font-black text-amber-700">
                                        {formatoMoneda(comprasCredito, configuracion.simboloMoneda)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Inventario financiero
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Valor actual del almacén
                            </p>
                        </div>

                        <div className="p-5">
                            <div className="grid gap-3">
                                <div className="rounded-2xl bg-teal-50 p-4">
                                    <p className="text-[11px] font-bold text-teal-700">
                                        Valor al costo
                                    </p>
                                    <p className="mt-1 text-sm font-black text-teal-700">
                                        {formatoMoneda(
                                            valorInventarioCosto,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-blue-50 p-4">
                                    <p className="text-[11px] font-bold text-blue-700">
                                        Valor venta estimada
                                    </p>
                                    <p className="mt-1 text-sm font-black text-blue-700">
                                        {formatoMoneda(
                                            valorInventarioVenta,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-red-50 p-4">
                                    <p className="text-[11px] font-bold text-red-700">
                                        Bajo stock
                                    </p>
                                    <p className="mt-1 text-sm font-black text-red-700">
                                        {productosBajoStock.length} producto(s)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Cierres de caja
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Control del período
                            </p>
                        </div>

                        <div className="p-5">
                            <div className="grid gap-3">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-[11px] font-bold text-slate-400">
                                        Cierres registrados
                                    </p>
                                    <p className="mt-1 text-sm font-black text-slate-800">
                                        {cierresPeriodo.length}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-amber-50 p-4">
                                    <p className="text-[11px] font-bold text-amber-700">
                                        Con diferencia
                                    </p>
                                    <p className="mt-1 text-sm font-black text-amber-700">
                                        {cierresConDiferencia.length}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-purple-50 p-4">
                                    <p className="text-[11px] font-bold text-purple-700">
                                        Diferencia acumulada
                                    </p>
                                    <p className="mt-1 text-sm font-black text-purple-700">
                                        {formatoMoneda(
                                            diferenciaCierres,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}