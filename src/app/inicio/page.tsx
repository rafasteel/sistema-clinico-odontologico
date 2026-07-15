"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BadgeDollarSign,
    CalendarClock,
    CheckCircle2,
    Clock3,
    LayoutDashboard,
    Package,
    Plus,
    Stethoscope,
    Users,
    WalletCards,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

type UsuarioSesion = {
    usuario: string;
    nombre: string;
    rol: string;
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

type Paciente = {
    id: string;
    nombre: string;
    estado: "Activo" | "Inactivo";
};

type EstadoVenta = "Pagada" | "Parcial" | "Crédito" | "Anulada";

type Venta = {
    id: string;
    fecha: string;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    estado: EstadoVenta;
};

type Producto = {
    id: string;
    nombre: string;
    stock: number;
    stockMinimo: number;
    estado: "Activo" | "Inactivo";
};

type EstadoCuenta = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

type CuentaPorCobrar = {
    id: string;
    saldo: number;
    estado: EstadoCuenta;
};

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

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
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

export default function InicioPage() {
    const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [citas, setCitas] = useState<Cita[]>([]);
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cuentasCobrar, setCuentasCobrar] = useState<CuentaPorCobrar[]>([]);

    useEffect(() => {
        setUsuario(
            leerLocalStorage<UsuarioSesion | null>("usuario_sistema_clinico", null)
        );
        setConfiguracion(obtenerConfiguracionClinica());
        setCitas(leerLocalStorage<Cita[]>("citas_sistema_clinico", []));
        setPacientes(leerLocalStorage<Paciente[]>("pacientes_sistema_clinico", []));
        setVentas(leerLocalStorage<Venta[]>("ventas_sistema_clinico", []));
        setProductos(leerLocalStorage<Producto[]>("productos_sistema_clinico", []));
        setCuentasCobrar(
            leerLocalStorage<CuentaPorCobrar[]>(
                "cuentas_cobrar_sistema_clinico",
                []
            )
        );
    }, []);

    const hoy = fechaHoyLocal();

    const citasHoy = useMemo(() => {
        return citas
            .filter((cita) => cita.fecha === hoy)
            .sort((a, b) => a.hora.localeCompare(b.hora));
    }, [citas, hoy]);

    const citasPendientes = citasHoy.filter(
        (cita) =>
            cita.estado !== "Atendida" &&
            cita.estado !== "Cobrada" &&
            cita.estado !== "Cancelada" &&
            cita.estado !== "No asistió"
    );

    const ingresosHoy = ventas
        .filter((venta) => venta.fecha === hoy && venta.estado !== "Anulada")
        .reduce(
            (total, venta) =>
                total +
                (venta.efectivo || 0) +
                (venta.tarjeta || 0) +
                (venta.transferencia || 0),
            0
        );

    const pacientesActivos = pacientes.filter(
        (paciente) => paciente.estado === "Activo"
    ).length;

    const productosBajoStock = productos.filter(
        (producto) =>
            producto.estado === "Activo" && producto.stock <= producto.stockMinimo
    ).length;

    const saldoPorCobrar = cuentasCobrar
        .filter(
            (cuenta) =>
                cuenta.estado !== "Pagada" &&
                cuenta.estado !== "Anulada" &&
                cuenta.saldo > 0
        )
        .reduce((total, cuenta) => total + cuenta.saldo, 0);

    return (
        <AppShell
            titulo="Inicio"
            descripcion="Resumen rápido del día y accesos principales"
            moduloActivo="Inicio"
        >
            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
                    <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <Stethoscope className="h-6 w-6 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">
                            Hola, {usuario?.nombre || "bienvenido"}
                        </h2>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                            Esta es la pantalla principal de {configuracion.nombreClinica}.
                            Aquí tenés solo lo necesario para empezar el día.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link
                                href="/calendario"
                                className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-[12px] font-black text-white hover:bg-teal-400"
                            >
                                <CalendarClock className="h-4 w-4" />
                                Ver calendario
                            </Link>

                            <Link
                                href="/agenda"
                                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-black text-slate-900 hover:bg-slate-100"
                            >
                                <Plus className="h-4 w-4" />
                                Nueva cita
                            </Link>

                            <Link
                                href="/dashboard"
                                className="rounded-xl bg-white/10 px-4 py-2.5 text-[12px] font-black text-white hover:bg-white/15"
                            >
                                Dashboard
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Hoy
                        </p>

                        <h3 className="mt-3 text-3xl font-black">
                            {citasHoy.length} cita(s)
                        </h3>

                        <p className="mt-2 text-sm text-white/50">
                            {citasPendientes.length} pendiente(s) para atender.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <CalendarClock className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {citasHoy.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Citas de hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <BadgeDollarSign className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(ingresosHoy, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Cobrado hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <Users className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {pacientesActivos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pacientes activos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <WalletCards className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(saldoPorCobrar, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Por cobrar
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
                <div className="glass-card overflow-hidden rounded-3xl">
                    <div className="border-b border-black/[0.04] px-6 py-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Citas de hoy
                                </h3>
                                <p className="mono mt-1 text-[10px] text-slate-400">{hoy}</p>
                            </div>

                            <Link
                                href="/calendario"
                                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800"
                            >
                                Abrir calendario
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="space-y-3">
                            {citasHoy.slice(0, 6).map((cita) => (
                                <Link
                                    key={cita.id}
                                    href="/agenda"
                                    className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-teal-100 hover:bg-teal-50/30"
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
                                </Link>
                            ))}

                            {citasHoy.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                    <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
                                    <h4 className="mt-3 text-sm font-black text-slate-700">
                                        No hay citas para hoy
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Podés crear una cita desde Agenda Médica.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="glass-card rounded-3xl p-5">
                        <h3 className="text-[16px] font-black text-slate-800">
                            Accesos rápidos
                        </h3>

                        <div className="mt-4 grid gap-3">
                            <Link
                                href="/calendario"
                                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm hover:bg-teal-50"
                            >
                                <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                    <CalendarClock className="h-4 w-4 text-teal-700" />
                                    Calendario
                                </span>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>

                            <Link
                                href="/pacientes"
                                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm hover:bg-teal-50"
                            >
                                <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                    <Users className="h-4 w-4 text-blue-700" />
                                    Pacientes
                                </span>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>

                            <Link
                                href="/caja"
                                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm hover:bg-teal-50"
                            >
                                <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                    <BadgeDollarSign className="h-4 w-4 text-emerald-700" />
                                    Caja y venta
                                </span>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>

                            <Link
                                href="/dashboard"
                                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm hover:bg-teal-50"
                            >
                                <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                    <LayoutDashboard className="h-4 w-4 text-slate-700" />
                                    Dashboard
                                </span>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                            <div>
                                <h3 className="text-sm font-black text-blue-800">
                                    Inicio simplificado
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-blue-700">
                                    El calendario completo queda separado en su propio módulo para
                                    que Inicio se mantenga más limpio y rápido.
                                </p>
                            </div>
                        </div>
                    </div>

                    {productosBajoStock > 0 && (
                        <Link
                            href="/inventario"
                            className="block rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-700"
                        >
                            <div className="flex items-start gap-3">
                                <Package className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <h3 className="text-sm font-black">Inventario</h3>
                                    <p className="mt-1 text-xs leading-5">
                                        {productosBajoStock} producto(s) con bajo stock.
                                    </p>
                                </div>
                            </div>
                        </Link>
                    )}
                </aside>
            </section>
        </AppShell>
    );
}