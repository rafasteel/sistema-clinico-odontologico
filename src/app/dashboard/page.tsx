"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    BadgeDollarSign,
    Banknote,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    FileText,
    Package,
    ReceiptText,
    ShieldAlert,
    Stethoscope,
    TrendingDown,
    TrendingUp,
    Users,
    WalletCards,
} from "lucide-react";
import AppShell from "@/components/AppShell";
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
    estado: "Activo" | "Inactivo";
    saldoPendiente: number;
};

type EstadoVenta = "Pagada" | "Parcial" | "Crédito" | "Anulada";

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
    estado: EstadoVenta;
    usuarioNombre: string;
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
    estado: EstadoGasto;
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
    pacienteNombre: string;
    doctorNombre: string;
    servicioNombre: string;
    costo: number;
    fecha: string;
    hora: string;
    estado: EstadoCita;
    observaciones: string;
};

type Producto = {
    id: string;
    codigo?: string;
    nombre: string;
    categoria: string;
    unidad?: string;
    stock: number;
    stockMinimo: number;
    costo?: number;
    costoCompra?: number;
    precioVenta: number;
    proveedor: string;
    vencimiento?: string;
    estado: "Activo" | "Inactivo";
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
};

type CierreCaja = {
    id: string;
    fecha: string;
    hora: string;
    usuarioNombre: string;
    ventasCantidad: number;
    ventasBrutas: number;
    gastosTotal: number;
    diferenciaEfectivo: number;
    diferenciaTarjeta: number;
    diferenciaTransferencia: number;
    estado: "Cuadrado" | "Con diferencia";
};

type ActividadReciente = {
    id: string;
    fecha: string;
    hora: string;
    modulo: string;
    titulo: string;
    detalle: string;
    monto: number;
    href: string;
    tipo: "Ingreso" | "Egreso" | "Agenda" | "Inventario" | "Cierre";
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

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function estadoVisualCuenta(fechaVencimiento: string, estado: string) {
    if (estado === "Pagada" || estado === "Anulada") return estado;

    if (fechaVencimiento && fechaVencimiento < fechaHoyLocal()) {
        return "Vencida";
    }

    return estado;
}

function colorEstadoCita(estado: EstadoCita) {
    if (estado === "Cobrada" || estado === "Atendida") {
        return "bg-emerald-50 text-emerald-700";
    }

    if (estado === "Confirmada" || estado === "En atención") {
        return "bg-blue-50 text-blue-700";
    }

    if (estado === "Cancelada" || estado === "No asistió") {
        return "bg-red-50 text-red-700";
    }

    return "bg-amber-50 text-amber-700";
}

function colorTipoActividad(tipo: ActividadReciente["tipo"]) {
    if (tipo === "Ingreso") return "bg-emerald-50 text-emerald-700";
    if (tipo === "Egreso") return "bg-red-50 text-red-700";
    if (tipo === "Agenda") return "bg-blue-50 text-blue-700";
    if (tipo === "Inventario") return "bg-purple-50 text-purple-700";
    return "bg-slate-100 text-slate-700";
}

export default function DashboardPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [citas, setCitas] = useState<Cita[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cuentasCobrar, setCuentasCobrar] = useState<CuentaPorCobrar[]>([]);
    const [cuentasPagar, setCuentasPagar] = useState<CuentaPorPagar[]>([]);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);

    useEffect(() => {
        setConfiguracion(obtenerConfiguracionClinica());

        setPacientes(leerLocalStorage<Paciente[]>("pacientes_sistema_clinico", []));
        setVentas(leerLocalStorage<Venta[]>("ventas_sistema_clinico", []));
        setGastos(leerLocalStorage<Gasto[]>("gastos_sistema_clinico", []));
        setCitas(leerLocalStorage<Cita[]>("citas_sistema_clinico", []));
        setProductos(leerLocalStorage<Producto[]>("productos_sistema_clinico", []));
        setCuentasCobrar(
            leerLocalStorage<CuentaPorCobrar[]>(
                "cuentas_cobrar_sistema_clinico",
                []
            )
        );
        setCuentasPagar(
            leerLocalStorage<CuentaPorPagar[]>("cuentas_pagar_sistema_clinico", [])
        );
        setCierres(
            leerLocalStorage<CierreCaja[]>("cierres_caja_sistema_clinico", [])
        );
    }, []);

    const hoy = fechaHoyLocal();
    const mesActual = mesActualLocal();

    const ventasHoy = ventas.filter(
        (venta) => venta.fecha === hoy && venta.estado !== "Anulada"
    );

    const ventasMes = ventas.filter(
        (venta) => venta.fecha.startsWith(mesActual) && venta.estado !== "Anulada"
    );

    const gastosHoy = gastos.filter(
        (gasto) => gasto.fecha === hoy && gasto.estado === "Activo"
    );

    const gastosMes = gastos.filter(
        (gasto) => gasto.fecha.startsWith(mesActual) && gasto.estado === "Activo"
    );

    const citasHoy = citas
        .filter((cita) => cita.fecha === hoy)
        .sort((a, b) => a.hora.localeCompare(b.hora));

    const citasPendientesHoy = citasHoy.filter(
        (cita) =>
            cita.estado !== "Atendida" &&
            cita.estado !== "Cobrada" &&
            cita.estado !== "Cancelada" &&
            cita.estado !== "No asistió"
    );

    const pacientesActivos = pacientes.filter(
        (paciente) => paciente.estado === "Activo"
    );

    const ingresosHoy = ventasHoy.reduce(
        (total, venta) =>
            total +
            (venta.efectivo || 0) +
            (venta.tarjeta || 0) +
            (venta.transferencia || 0),
        0
    );

    const ventasBrutasMes = ventasMes.reduce(
        (total, venta) => total + (venta.total || 0),
        0
    );

    const ingresosMes = ventasMes.reduce(
        (total, venta) =>
            total +
            (venta.efectivo || 0) +
            (venta.tarjeta || 0) +
            (venta.transferencia || 0),
        0
    );

    const efectivoMes = ventasMes.reduce(
        (total, venta) => total + (venta.efectivo || 0),
        0
    );

    const tarjetaMes = ventasMes.reduce(
        (total, venta) => total + (venta.tarjeta || 0),
        0
    );

    const transferenciaMes = ventasMes.reduce(
        (total, venta) => total + (venta.transferencia || 0),
        0
    );

    const creditoMes = ventasMes.reduce(
        (total, venta) => total + (venta.credito || 0),
        0
    );

    const gastosTotalHoy = gastosHoy.reduce(
        (total, gasto) => total + (gasto.monto || 0),
        0
    );

    const gastosTotalMes = gastosMes.reduce(
        (total, gasto) => total + (gasto.monto || 0),
        0
    );

    const comisionPOSMes = tarjetaMes * (configuracion.comisionPOS / 100);
    const utilidadMes = ingresosMes - gastosTotalMes - comisionPOSMes;

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

    const saldoPorCobrar = cuentasCobrarPendientes.reduce(
        (total, cuenta) => total + (cuenta.saldo || 0),
        0
    );

    const saldoPorPagar = cuentasPagarPendientes.reduce(
        (total, cuenta) => total + (cuenta.saldo || 0),
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

    const productosBajoStock = productosActivos.filter(
        (producto) => producto.stock <= producto.stockMinimo
    );

    const valorInventario = productosActivos.reduce((total, producto) => {
        const costo = producto.costoCompra ?? producto.costo ?? 0;
        return total + (producto.stock || 0) * costo;
    }, 0);

    const cierresMes = cierres.filter((cierre) =>
        cierre.fecha.startsWith(mesActual)
    );

    const cierresConDiferencia = cierresMes.filter(
        (cierre) => cierre.estado === "Con diferencia"
    );

    const cierreHoy = cierres.find((cierre) => cierre.fecha === hoy);

    const actividadReciente = useMemo<ActividadReciente[]>(() => {
        const actividadVentas: ActividadReciente[] = ventas.slice(0, 40).map((venta) => ({
            id: `VENTA-${venta.id}`,
            fecha: venta.fecha,
            hora: venta.hora || "00:00",
            modulo: "Caja",
            titulo:
                venta.estado === "Anulada"
                    ? "Venta anulada"
                    : venta.credito > 0
                        ? "Venta con crédito"
                        : "Venta registrada",
            detalle: `${venta.clienteNombre} · ${venta.concepto}`,
            monto: venta.total || 0,
            href: `/recibos/${venta.id}`,
            tipo: "Ingreso",
        }));

        const actividadGastos: ActividadReciente[] = gastos.slice(0, 40).map((gasto) => ({
            id: `GASTO-${gasto.id}`,
            fecha: gasto.fecha,
            hora: gasto.hora || "00:00",
            modulo: "Gastos",
            titulo: gasto.estado === "Anulado" ? "Gasto anulado" : "Gasto registrado",
            detalle: `${gasto.categoria} · ${gasto.descripcion}`,
            monto: gasto.monto || 0,
            href: "/gastos",
            tipo: "Egreso",
        }));

        const actividadCitas: ActividadReciente[] = citas.slice(0, 40).map((cita) => ({
            id: `CITA-${cita.id}`,
            fecha: cita.fecha,
            hora: cita.hora || "00:00",
            modulo: "Agenda",
            titulo: `Cita ${cita.estado}`,
            detalle: `${cita.pacienteNombre} · ${cita.servicioNombre}`,
            monto: cita.costo || 0,
            href: "/agenda",
            tipo: "Agenda",
        }));

        const actividadCierres: ActividadReciente[] = cierres.slice(0, 20).map((cierre) => ({
            id: `CIERRE-${cierre.id}`,
            fecha: cierre.fecha,
            hora: cierre.hora || "00:00",
            modulo: "Cierre",
            titulo:
                cierre.estado === "Cuadrado"
                    ? "Cierre de caja cuadrado"
                    : "Cierre con diferencia",
            detalle: `${cierre.ventasCantidad} venta(s) · ${cierre.usuarioNombre}`,
            monto: cierre.ventasBrutas || 0,
            href: "/cierre-caja",
            tipo: "Cierre",
        }));

        return [
            ...actividadVentas,
            ...actividadGastos,
            ...actividadCitas,
            ...actividadCierres,
        ]
            .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`))
            .slice(0, 10);
    }, [ventas, gastos, citas, cierres]);

    const alertas = [
        {
            titulo: "Cuentas por cobrar vencidas",
            descripcion: `${cuentasCobrarVencidas.length} cuenta(s) vencida(s) de pacientes.`,
            cantidad: cuentasCobrarVencidas.length,
            href: "/reportes",
            icono: BadgeDollarSign,
            color: "bg-amber-50 text-amber-700 border-amber-100",
        },
        {
            titulo: "Cuentas por pagar vencidas",
            descripcion: `${cuentasPagarVencidas.length} deuda(s) vencida(s) con proveedores.`,
            cantidad: cuentasPagarVencidas.length,
            href: "/proveedores",
            icono: WalletCards,
            color: "bg-red-50 text-red-700 border-red-100",
        },
        {
            titulo: "Productos bajo stock",
            descripcion: `${productosBajoStock.length} producto(s) requieren reposición.`,
            cantidad: productosBajoStock.length,
            href: "/inventario",
            icono: Package,
            color: "bg-blue-50 text-blue-700 border-blue-100",
        },
        {
            titulo: "Cierres con diferencia",
            descripcion: `${cierresConDiferencia.length} cierre(s) con diferencia este mes.`,
            cantidad: cierresConDiferencia.length,
            href: "/cierre-caja",
            icono: ShieldAlert,
            color: "bg-purple-50 text-purple-700 border-purple-100",
        },
    ].filter((alerta) => alerta.cantidad > 0);

    return (
        <AppShell
            titulo="Dashboard"
            descripcion="Resumen ejecutivo de agenda, caja, gastos, inventario, créditos y alertas"
            moduloActivo="Dashboard"
        >
            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
                    <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <Stethoscope className="h-6 w-6 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">
                            Resumen ejecutivo de {configuracion.nombreClinica}
                        </h2>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                            Vista rápida del comportamiento operativo y financiero del día y
                            del mes actual. Desde aquí podés detectar pendientes, alertas y
                            movimientos importantes.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link
                                href="/agenda"
                                className="rounded-xl bg-white px-4 py-2.5 text-[12px] font-black text-slate-900 hover:bg-slate-100"
                            >
                                Ver agenda
                            </Link>

                            <Link
                                href="/caja"
                                className="rounded-xl bg-teal-500 px-4 py-2.5 text-[12px] font-black text-white hover:bg-teal-400"
                            >
                                Ir a caja
                            </Link>

                            <Link
                                href="/reportes"
                                className="rounded-xl bg-white/10 px-4 py-2.5 text-[12px] font-black text-white hover:bg-white/15"
                            >
                                Reportes
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Resultado estimado del mes
                        </p>

                        <h3 className="mt-3 text-3xl font-black">
                            {formatoMoneda(utilidadMes, configuracion.simboloMoneda)}
                        </h3>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white/10 p-4">
                                <p className="text-[11px] font-bold text-white/45">
                                    Ingresos mes
                                </p>
                                <p className="mt-1 text-sm font-black text-teal-300">
                                    {formatoMoneda(ingresosMes, configuracion.simboloMoneda)}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <p className="text-[11px] font-bold text-white/45">
                                    Gastos mes
                                </p>
                                <p className="mt-1 text-sm font-black text-red-300">
                                    {formatoMoneda(gastosTotalMes, configuracion.simboloMoneda)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {alertas.length > 0 && (
                <section className="mt-4 grid gap-4 lg:grid-cols-4">
                    {alertas.map((alerta) => {
                        const Icono = alerta.icono;

                        return (
                            <Link
                                key={alerta.titulo}
                                href={alerta.href}
                                className={`rounded-2xl border p-5 ${alerta.color}`}
                            >
                                <div className="flex items-start gap-3">
                                    <Icono className="mt-0.5 h-5 w-5 shrink-0" />
                                    <div>
                                        <h3 className="text-sm font-black">{alerta.titulo}</h3>
                                        <p className="mt-1 text-xs leading-5 opacity-80">
                                            {alerta.descripcion}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </section>
            )}

            <section className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Banknote className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Hoy
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(ingresosHoy, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Ingresos cobrados hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <CalendarClock className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Agenda
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {citasPendientesHoy.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Citas pendientes hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <ReceiptText className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Hoy
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(gastosTotalHoy, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Gastos registrados hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Users className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Activos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {pacientesActivos.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pacientes activos
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Agenda de hoy
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        {hoy} · {citasHoy.length} cita(s)
                                    </p>
                                </div>

                                <Link
                                    href="/agenda"
                                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    Ver agenda
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="space-y-3">
                                {citasHoy.slice(0, 7).map((cita) => (
                                    <div
                                        key={cita.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                                        {cita.hora}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoCita(
                                                            cita.estado
                                                        )}`}
                                                    >
                                                        {cita.estado}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {cita.pacienteNombre}
                                                </h4>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {cita.servicioNombre} · {cita.doctorNombre}
                                                </p>
                                            </div>

                                            <p className="text-sm font-black text-slate-800">
                                                {formatoMoneda(cita.costo, configuracion.simboloMoneda)}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {citasHoy.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            No hay citas para hoy
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            La agenda del día está libre.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Actividad reciente
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Últimos movimientos del sistema
                            </p>
                        </div>

                        <div className="p-4">
                            <div className="space-y-3">
                                {actividadReciente.map((actividad) => (
                                    <Link
                                        key={actividad.id}
                                        href={actividad.href}
                                        className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-teal-100 hover:bg-teal-50/20"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorTipoActividad(
                                                            actividad.tipo
                                                        )}`}
                                                    >
                                                        {actividad.modulo}
                                                    </span>

                                                    <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                                                        {actividad.fecha} · {actividad.hora}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {actividad.titulo}
                                                </h4>

                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    {actividad.detalle}
                                                </p>
                                            </div>

                                            <p className="text-sm font-black text-slate-800">
                                                {formatoMoneda(
                                                    actividad.monto,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>
                                    </Link>
                                ))}

                                {actividadReciente.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <FileText className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin actividad todavía
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Cuando registres citas, ventas o gastos aparecerán aquí.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Finanzas del mes
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                {mesActual}
                            </p>
                        </div>

                        <div className="p-5">
                            <div className="grid gap-3">
                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                                        <TrendingUp className="h-4 w-4" />
                                        Ventas brutas
                                    </p>
                                    <p className="mt-1 text-lg font-black text-emerald-700">
                                        {formatoMoneda(
                                            ventasBrutasMes,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-red-50 p-4">
                                    <p className="flex items-center gap-2 text-xs font-bold text-red-700">
                                        <TrendingDown className="h-4 w-4" />
                                        Gastos activos
                                    </p>
                                    <p className="mt-1 text-lg font-black text-red-700">
                                        {formatoMoneda(gastosTotalMes, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-blue-50 p-4">
                                    <p className="flex items-center gap-2 text-xs font-bold text-blue-700">
                                        <CreditCard className="h-4 w-4" />
                                        Comisión POS
                                    </p>
                                    <p className="mt-1 text-lg font-black text-blue-700">
                                        {formatoMoneda(comisionPOSMes, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div
                                    className={`rounded-2xl p-4 ${utilidadMes >= 0 ? "bg-teal-50" : "bg-red-50"
                                        }`}
                                >
                                    <p
                                        className={`flex items-center gap-2 text-xs font-bold ${utilidadMes >= 0 ? "text-teal-700" : "text-red-700"
                                            }`}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Utilidad estimada
                                    </p>
                                    <p
                                        className={`mt-1 text-lg font-black ${utilidadMes >= 0 ? "text-teal-700" : "text-red-700"
                                            }`}
                                    >
                                        {formatoMoneda(utilidadMes, configuracion.simboloMoneda)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Distribución de ingresos
                        </h3>

                        <div className="mt-4 space-y-4">
                            {[
                                { nombre: "Efectivo", total: efectivoMes, icono: Banknote },
                                { nombre: "Tarjeta", total: tarjetaMes, icono: CreditCard },
                                {
                                    nombre: "Transferencia",
                                    total: transferenciaMes,
                                    icono: FileText,
                                },
                                { nombre: "Crédito", total: creditoMes, icono: BadgeDollarSign },
                            ].map((item) => {
                                const Icono = item.icono;
                                const porcentaje =
                                    ventasBrutasMes > 0 ? (item.total / ventasBrutasMes) * 100 : 0;

                                return (
                                    <div key={item.nombre}>
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
                                                style={{ width: `${Math.min(porcentaje, 100)}%` }}
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
                                Estado operativo
                            </h3>
                        </div>

                        <div className="grid gap-3 p-5">
                            <Link
                                href="/reportes"
                                className="rounded-2xl bg-teal-50 p-4 hover:bg-teal-100"
                            >
                                <p className="text-xs font-bold text-teal-700">
                                    Por cobrar a pacientes
                                </p>
                                <p className="mt-1 text-lg font-black text-teal-700">
                                    {formatoMoneda(saldoPorCobrar, configuracion.simboloMoneda)}
                                </p>
                            </Link>

                            <Link
                                href="/proveedores"
                                className="rounded-2xl bg-red-50 p-4 hover:bg-red-100"
                            >
                                <p className="text-xs font-bold text-red-700">
                                    Por pagar a proveedores
                                </p>
                                <p className="mt-1 text-lg font-black text-red-700">
                                    {formatoMoneda(saldoPorPagar, configuracion.simboloMoneda)}
                                </p>
                            </Link>

                            <Link
                                href="/inventario"
                                className="rounded-2xl bg-blue-50 p-4 hover:bg-blue-100"
                            >
                                <p className="text-xs font-bold text-blue-700">
                                    Valor inventario al costo
                                </p>
                                <p className="mt-1 text-lg font-black text-blue-700">
                                    {formatoMoneda(valorInventario, configuracion.simboloMoneda)}
                                </p>
                            </Link>

                            <Link
                                href="/cierre-caja"
                                className={`rounded-2xl p-4 ${cierreHoy ? "bg-emerald-50 hover:bg-emerald-100" : "bg-amber-50 hover:bg-amber-100"
                                    }`}
                            >
                                <p
                                    className={`text-xs font-bold ${cierreHoy ? "text-emerald-700" : "text-amber-700"
                                        }`}
                                >
                                    Cierre de caja de hoy
                                </p>
                                <p
                                    className={`mt-1 text-lg font-black ${cierreHoy ? "text-emerald-700" : "text-amber-700"
                                        }`}
                                >
                                    {cierreHoy ? cierreHoy.estado : "Pendiente"}
                                </p>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}