"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Archive,
    BadgeDollarSign,
    Banknote,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    Database,
    Download,
    Filter,
    LockKeyhole,
    Package,
    ReceiptText,
    RefreshCcw,
    Search,
    ShieldAlert,
    ShieldCheck,
    UserCog,
    WalletCards,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    listarEventosAuditoriaSupabase,
    type EventoAuditoriaSupabase,
    type ModuloAuditoriaSupabase,
    type NivelAuditoriaSupabase,
} from "@/lib/supabase/auditoria";

type NivelAuditoria = NivelAuditoriaSupabase;
type ModuloAuditoria = ModuloAuditoriaSupabase;
type EventoAuditoria = EventoAuditoriaSupabase;

const modulosAuditoria: (ModuloAuditoria | "Todos")[] = [
    "Todos",
    "Agenda",
    "Pacientes",
    "Caja",
    "Gastos",
    "Inventario",
    "Proveedores",
    "Cierre de Caja",
    "Administración",
    "Respaldo",
    "Cuentas por Cobrar",
    "Cuentas por Pagar",
    "Sistema",
    "Documentos",
    "Odontograma",
    "Presupuestos",
    "Órdenes de estudio",
];

const nivelesAuditoria: (NivelAuditoria | "Todos")[] = [
    "Todos",
    "Crítico",
    "Advertencia",
    "Éxito",
    "Info",
];

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

function normalizar(valor: unknown) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function colorNivel(nivel: NivelAuditoria) {
    if (nivel === "Crítico") return "bg-red-50 text-red-700 border border-red-100";
    if (nivel === "Advertencia")
        return "bg-amber-50 text-amber-700 border border-amber-100";
    if (nivel === "Éxito")
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";

    return "bg-blue-50 text-blue-700 border border-blue-100";
}

function iconoModulo(modulo: ModuloAuditoria) {
    if (modulo === "Agenda") return CalendarClock;
    if (modulo === "Caja") return Banknote;
    if (modulo === "Gastos") return ReceiptText;
    if (modulo === "Inventario") return Package;
    if (modulo === "Proveedores") return WalletCards;
    if (modulo === "Cierre de Caja") return ShieldCheck;
    if (modulo === "Administración") return UserCog;
    if (modulo === "Respaldo") return Archive;
    if (modulo === "Cuentas por Cobrar") return BadgeDollarSign;
    if (modulo === "Cuentas por Pagar") return WalletCards;
    if (modulo === "Documentos") return ClipboardList;
    if (modulo === "Odontograma") return ShieldCheck;
    if (modulo === "Presupuestos") return ClipboardList;
    if (modulo === "Órdenes de estudio") return ClipboardList;

    return Database;
}

function descargarCSV(nombreArchivo: string, eventos: EventoAuditoria[]) {
    const encabezados = [
        "Fecha",
        "Hora",
        "Módulo",
        "Nivel",
        "Acción",
        "Detalle",
        "Usuario",
        "Referencia",
        "Monto",
        "Origen",
    ];

    const filas = eventos.map((evento) => [
        evento.fecha,
        evento.hora,
        evento.modulo,
        evento.nivel,
        evento.accion,
        evento.detalle,
        evento.usuarioNombre,
        evento.referencia,
        evento.monto.toString(),
        evento.origen,
    ]);

    const contenido = [encabezados, ...filas]
        .map((fila) =>
            fila.map((celda) => `"${String(celda).replaceAll('"', '""')}"`).join(",")
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

export default function AuditoriaPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
    const [erroresLectura, setErroresLectura] = useState<string[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [mesSeleccionado, setMesSeleccionado] = useState(mesActualLocal());
    const [filtroModulo, setFiltroModulo] = useState<ModuloAuditoria | "Todos">(
        "Todos"
    );
    const [filtroNivel, setFiltroNivel] = useState<NivelAuditoria | "Todos">(
        "Todos"
    );
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    async function cargarEventos() {
        setCargando(true);
        setError("");

        try {
            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }

            const resultado = await listarEventosAuditoriaSupabase();

            setEventos(resultado.eventos);
            setErroresLectura(resultado.errores);
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar la auditoría desde Supabase.";

            setError(mensaje);
            setEventos([]);
            setErroresLectura([]);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarEventos();
    }, []);

    const eventosFiltrados = useMemo(() => {
        const texto = normalizar(busqueda.trim());

        return eventos
            .filter((evento) => evento.fecha.startsWith(mesSeleccionado))
            .filter((evento) => {
                const coincideTexto =
                    !texto ||
                    normalizar(
                        `${evento.modulo} ${evento.accion} ${evento.detalle} ${evento.usuarioNombre} ${evento.referencia} ${evento.nivel} ${evento.origen}`
                    ).includes(texto);

                const coincideModulo =
                    filtroModulo === "Todos" || evento.modulo === filtroModulo;

                const coincideNivel =
                    filtroNivel === "Todos" || evento.nivel === filtroNivel;

                return coincideTexto && coincideModulo && coincideNivel;
            });
    }, [eventos, busqueda, mesSeleccionado, filtroModulo, filtroNivel]);

    const eventosCriticos = eventosFiltrados.filter(
        (evento) => evento.nivel === "Crítico"
    ).length;

    const eventosAdvertencia = eventosFiltrados.filter(
        (evento) => evento.nivel === "Advertencia"
    ).length;

    const eventosExito = eventosFiltrados.filter(
        (evento) => evento.nivel === "Éxito"
    ).length;

    const montoAuditado = eventosFiltrados.reduce(
        (total, evento) => total + Math.abs(evento.monto || 0),
        0
    );

    const eventosReales = eventosFiltrados.filter(
        (evento) => evento.origen === "Real"
    ).length;

    const resumenPorModulo = useMemo(() => {
        const mapa = new Map<ModuloAuditoria, number>();

        eventosFiltrados.forEach((evento) => {
            mapa.set(evento.modulo, (mapa.get(evento.modulo) || 0) + 1);
        });

        return Array.from(mapa.entries())
            .map(([modulo, total]) => ({ modulo, total }))
            .sort((a, b) => b.total - a.total);
    }, [eventosFiltrados]);

    function exportarAuditoria() {
        descargarCSV(`auditoria-${mesSeleccionado}.csv`, eventosFiltrados);
    }

    return (
        <AppShell
            titulo="Auditoría"
            descripcion="Registro de eventos importantes desde Supabase"
            moduloActivo="Auditoría"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo cargar auditoría
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {erroresLectura.length > 0 && (
                <section className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Algunos módulos no devolvieron datos
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                La auditoría siguió funcionando con los módulos disponibles.
                            </p>

                            <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-black text-amber-800">
                                    Ver detalle técnico
                                </summary>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
                                    {erroresLectura.slice(0, 8).map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </details>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
                        Auditoría conectada a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Combina auditoría real guardada en la tabla auditoria y eventos derivados desde los módulos actuales.
                    </p>
                </div>

                <button
                    onClick={cargarEventos}
                    disabled={cargando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    {cargando ? "Cargando..." : "Recargar"}
                </button>
            </section>

            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <ClipboardList className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Eventos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {eventosFiltrados.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Eventos del período
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <ShieldAlert className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Críticos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {eventosCriticos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Anulaciones o vencidos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Alertas
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {eventosAdvertencia}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Eventos con advertencia
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <BadgeDollarSign className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Monto
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(montoAuditado, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Monto auditado
                    </p>
                </div>
            </section>

            <section className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                    <div>
                        <h3 className="text-sm font-black text-blue-800">
                            Auditoría Supabase
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-blue-700">
                            Eventos reales encontrados: {eventosReales}. Los demás eventos son derivados de las tablas actuales para que el historial sea útil mientras vamos agregando registros directos en cada acción.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 glass-card rounded-2xl p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_170px_190px_170px_180px]">
                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Buscar evento
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar por módulo, acción, detalle, usuario..."
                                className="w-full bg-transparent text-[13px] font-medium outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Mes
                        </label>
                        <input
                            value={mesSeleccionado}
                            onChange={(event) => setMesSeleccionado(event.target.value)}
                            type="month"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Módulo
                        </label>
                        <select
                            value={filtroModulo}
                            onChange={(event) =>
                                setFiltroModulo(event.target.value as ModuloAuditoria | "Todos")
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        >
                            {modulosAuditoria.map((modulo) => (
                                <option key={modulo}>{modulo}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Nivel
                        </label>
                        <select
                            value={filtroNivel}
                            onChange={(event) =>
                                setFiltroNivel(event.target.value as NivelAuditoria | "Todos")
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        >
                            {nivelesAuditoria.map((nivel) => (
                                <option key={nivel}>{nivel}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Acciones
                        </label>
                        <button
                            onClick={cargarEventos}
                            disabled={cargando}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                            Recargar
                        </button>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="glass-card overflow-hidden rounded-2xl">
                    <div className="border-b border-black/[0.04] px-6 py-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-teal-700" />
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Eventos de auditoría
                                    </h3>
                                </div>

                                <p className="mono mt-0.5 text-[10px] text-slate-400">
                                    {eventosFiltrados.length} evento(s) encontrado(s)
                                </p>
                            </div>

                            <button
                                onClick={exportarAuditoria}
                                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800"
                            >
                                <Download className="h-4 w-4" />
                                Exportar CSV
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[900px] overflow-y-auto p-4">
                        <div className="space-y-3">
                            {eventosFiltrados.map((evento) => {
                                const Icono = iconoModulo(evento.modulo);

                                return (
                                    <div
                                        key={evento.id}
                                        className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                                <Icono className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorNivel(
                                                            evento.nivel
                                                        )}`}
                                                    >
                                                        {evento.nivel}
                                                    </span>

                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                                        {evento.modulo}
                                                    </span>

                                                    <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                                                        {evento.fecha} · {evento.hora}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${evento.origen === "Real"
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-slate-50 text-slate-500"
                                                            }`}
                                                    >
                                                        {evento.origen}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {evento.accion}
                                                </h4>

                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    {evento.detalle}
                                                </p>

                                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                                    <div className="rounded-2xl bg-slate-50 p-3">
                                                        <p className="text-[10px] font-bold text-slate-400">
                                                            Usuario
                                                        </p>
                                                        <p className="mt-1 text-xs font-black text-slate-800">
                                                            {evento.usuarioNombre}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-blue-50 p-3">
                                                        <p className="text-[10px] font-bold text-blue-700">
                                                            Referencia
                                                        </p>
                                                        <p className="mono mt-1 truncate text-xs font-black text-blue-700">
                                                            {evento.referencia}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-emerald-50 p-3">
                                                        <p className="text-[10px] font-bold text-emerald-700">
                                                            Monto
                                                        </p>
                                                        <p className="mt-1 text-xs font-black text-emerald-700">
                                                            {formatoMoneda(
                                                                evento.monto,
                                                                configuracion.simboloMoneda
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {eventosFiltrados.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                    <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                                    <h4 className="mt-3 text-sm font-black text-slate-700">
                                        {cargando
                                            ? "Cargando auditoría..."
                                            : "No hay eventos para estos filtros"}
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {cargando
                                            ? "Consultando eventos desde Supabase."
                                            : "Probá cambiar el mes, módulo, nivel o búsqueda."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Resumen por nivel
                        </h3>

                        <div className="mt-4 grid gap-3">
                            <div className="rounded-2xl bg-red-50 p-4">
                                <p className="text-[11px] font-bold text-red-700">Críticos</p>
                                <p className="mt-1 text-2xl font-black text-red-700">
                                    {eventosCriticos}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-amber-50 p-4">
                                <p className="text-[11px] font-bold text-amber-700">
                                    Advertencias
                                </p>
                                <p className="mt-1 text-2xl font-black text-amber-700">
                                    {eventosAdvertencia}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-50 p-4">
                                <p className="text-[11px] font-bold text-emerald-700">
                                    Éxitos
                                </p>
                                <p className="mt-1 text-2xl font-black text-emerald-700">
                                    {eventosExito}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Eventos por módulo
                        </h3>

                        <div className="mt-4 space-y-4">
                            {resumenPorModulo.map((item) => {
                                const porcentaje =
                                    eventosFiltrados.length > 0
                                        ? (item.total / eventosFiltrados.length) * 100
                                        : 0;

                                return (
                                    <div key={item.modulo}>
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="text-sm font-bold text-slate-700">
                                                {item.modulo}
                                            </span>

                                            <span className="mono text-xs font-bold text-slate-500">
                                                {item.total}
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

                            {resumenPorModulo.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                    <Database className="mx-auto h-8 w-8 text-slate-300" />
                                    <p className="mt-3 text-xs text-slate-400">
                                        Sin datos para resumir.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                        <div className="flex items-start gap-3">
                            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                            <div>
                                <h3 className="text-sm font-black text-amber-800">
                                    Registro directo
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    Ya queda listo el helper registrarEventoAuditoriaSupabase para que, después, cada módulo pueda guardar eventos exactos al crear, editar, anular o eliminar.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}