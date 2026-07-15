"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Plus,
    RefreshCcw,
    Search,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

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

const horasAgenda = Array.from({ length: 13 }, (_, index) => index + 7);

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function crearFechaLocal(fecha: string) {
    const [year, month, day] = fecha.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatearFechaLocal(fecha: Date) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function sumarDias(fecha: Date, dias: number) {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    return nuevaFecha;
}

function inicioSemana(fecha: string) {
    const base = crearFechaLocal(fecha);
    const diaSemana = base.getDay();
    const diferencia = diaSemana === 0 ? -6 : 1 - diaSemana;

    return sumarDias(base, diferencia);
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

function normalizar(texto: string) {
    return texto.toLowerCase().trim();
}

function nombreDia(fecha: string) {
    return crearFechaLocal(fecha)
        .toLocaleDateString("es-NI", { weekday: "short" })
        .replace(".", "");
}

function numeroDia(fecha: string) {
    return crearFechaLocal(fecha).getDate();
}

function mesCorto(fecha: string) {
    return crearFechaLocal(fecha)
        .toLocaleDateString("es-NI", { month: "short" })
        .replace(".", "");
}

function horaNumero(hora: string) {
    const numero = Number(String(hora || "0").split(":")[0]);
    return Number.isNaN(numero) ? -1 : numero;
}

function colorEstadoCita(estado: EstadoCita) {
    if (estado === "Cobrada" || estado === "Atendida") {
        return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    if (estado === "Confirmada") {
        return "border-blue-200 bg-blue-50 text-blue-800";
    }

    if (estado === "En espera" || estado === "En atención") {
        return "border-cyan-200 bg-cyan-50 text-cyan-800";
    }

    if (estado === "Cancelada" || estado === "No asistió") {
        return "border-red-200 bg-red-50 text-red-800";
    }

    if (estado === "Reagendada") {
        return "border-purple-200 bg-purple-50 text-purple-800";
    }

    return "border-amber-200 bg-amber-50 text-amber-800";
}

function colorEstadoBadge(estado: EstadoCita) {
    if (estado === "Cobrada" || estado === "Atendida") {
        return "bg-emerald-50 text-emerald-700";
    }

    if (estado === "Confirmada" || estado === "En atención") {
        return "bg-blue-50 text-blue-700";
    }

    if (estado === "Cancelada" || estado === "No asistió") {
        return "bg-red-50 text-red-700";
    }

    if (estado === "Reagendada") {
        return "bg-purple-50 text-purple-700";
    }

    return "bg-amber-50 text-amber-700";
}

export default function CalendarioPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [citas, setCitas] = useState<Cita[]>([]);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoyLocal());
    const [busqueda, setBusqueda] = useState("");

    function cargarDatos() {
        setConfiguracion(obtenerConfiguracionClinica());
        setCitas(leerLocalStorage<Cita[]>("citas_sistema_clinico", []));
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    const hoy = fechaHoyLocal();

    const semanaInicio = useMemo(
        () => inicioSemana(fechaSeleccionada),
        [fechaSeleccionada]
    );

    const diasSemana = useMemo(() => {
        return Array.from({ length: 7 }, (_, index) => {
            const fecha = sumarDias(semanaInicio, index);
            const fechaTexto = formatearFechaLocal(fecha);

            return {
                fecha: fechaTexto,
                nombre: nombreDia(fechaTexto),
                dia: numeroDia(fechaTexto),
                mes: mesCorto(fechaTexto),
            };
        });
    }, [semanaInicio]);

    const tituloSemana = `${diasSemana[0]?.dia} ${diasSemana[0]?.mes} - ${diasSemana[6]?.dia
        } ${diasSemana[6]?.mes}`;

    const citasVisibles = useMemo(() => {
        const texto = normalizar(busqueda);

        return citas.filter((cita) => {
            if (!texto) return true;

            return (
                normalizar(cita.pacienteNombre).includes(texto) ||
                normalizar(cita.doctorNombre).includes(texto) ||
                normalizar(cita.servicioNombre).includes(texto) ||
                normalizar(cita.estado).includes(texto) ||
                normalizar(cita.observaciones || "").includes(texto)
            );
        });
    }, [citas, busqueda]);

    const citasDiaSeleccionado = useMemo(() => {
        return citasVisibles
            .filter((cita) => cita.fecha === fechaSeleccionada)
            .sort((a, b) => a.hora.localeCompare(b.hora));
    }, [citasVisibles, fechaSeleccionada]);

    function irSemanaAnterior() {
        setFechaSeleccionada(formatearFechaLocal(sumarDias(semanaInicio, -7)));
    }

    function irSemanaSiguiente() {
        setFechaSeleccionada(formatearFechaLocal(sumarDias(semanaInicio, 7)));
    }

    function irHoy() {
        setFechaSeleccionada(fechaHoyLocal());
    }

    function citasEnCelda(fecha: string, hora: number) {
        return citasVisibles
            .filter((cita) => cita.fecha === fecha && horaNumero(cita.hora) === hora)
            .sort((a, b) => a.hora.localeCompare(b.hora));
    }

    return (
        <AppShell
            titulo="Calendario"
            descripcion="Vista semanal de citas por día y hora"
            moduloActivo="Calendario"
        >
            <section className="glass-card overflow-hidden rounded-3xl">
                <div className="border-b border-black/[0.04] px-6 py-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-teal-700" />
                                <h3 className="text-[20px] font-black text-slate-800">
                                    Calendario semanal
                                </h3>
                            </div>

                            <p className="mono mt-1 text-[10px] text-slate-400">
                                {tituloSemana} · {citasDiaSeleccionado.length} cita(s) el día
                                seleccionado
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={irSemanaAnterior}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>

                                <button
                                    onClick={irHoy}
                                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-black text-white hover:bg-slate-800"
                                >
                                    Hoy
                                </button>

                                <button
                                    onClick={irSemanaSiguiente}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>

                            <input
                                type="date"
                                value={fechaSeleccionada}
                                onChange={(event) => setFechaSeleccionada(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <Link
                                href="/agenda"
                                className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-teal-700"
                            >
                                <Plus className="h-4 w-4" />
                                Nueva cita
                            </Link>

                            <button
                                onClick={cargarDatos}
                                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Recargar
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            placeholder="Buscar por paciente, doctor, servicio o estado..."
                            className="w-full bg-transparent text-[13px] font-medium outline-none"
                        />
                    </div>
                </div>

                <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
                    <div className="overflow-x-auto">
                        <div className="grid min-w-[1060px] grid-cols-[70px_repeat(7,minmax(135px,1fr))]">
                            <div className="sticky left-0 z-20 border-b border-r border-slate-100 bg-white p-3" />

                            {diasSemana.map((dia) => {
                                const seleccionado = dia.fecha === fechaSeleccionada;
                                const actual = dia.fecha === hoy;
                                const cantidadCitas = citasVisibles.filter(
                                    (cita) => cita.fecha === dia.fecha
                                ).length;

                                return (
                                    <button
                                        key={dia.fecha}
                                        onClick={() => setFechaSeleccionada(dia.fecha)}
                                        className={`border-b border-r border-slate-100 p-3 text-left hover:bg-teal-50/50 ${seleccionado ? "bg-teal-50" : "bg-white"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p
                                                    className={`text-[11px] font-black uppercase ${seleccionado ? "text-teal-700" : "text-slate-400"
                                                        }`}
                                                >
                                                    {dia.nombre}
                                                </p>

                                                <p
                                                    className={`mt-1 text-2xl font-black ${actual
                                                            ? "text-teal-700"
                                                            : seleccionado
                                                                ? "text-slate-900"
                                                                : "text-slate-700"
                                                        }`}
                                                >
                                                    {dia.dia}
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${cantidadCitas > 0
                                                        ? "bg-teal-600 text-white"
                                                        : "bg-slate-100 text-slate-400"
                                                    }`}
                                            >
                                                {cantidadCitas}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}

                            {horasAgenda.map((hora) => (
                                <div key={hora} className="contents">
                                    <div className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-4 text-right">
                                        <p className="mono text-[11px] font-bold text-slate-400">
                                            {String(hora).padStart(2, "0")}:00
                                        </p>
                                    </div>

                                    {diasSemana.map((dia) => {
                                        const citasHora = citasEnCelda(dia.fecha, hora);
                                        const seleccionado = dia.fecha === fechaSeleccionada;

                                        return (
                                            <div
                                                key={`${dia.fecha}-${hora}`}
                                                onClick={() => setFechaSeleccionada(dia.fecha)}
                                                className={`min-h-[92px] cursor-pointer border-b border-r border-slate-100 p-2 ${seleccionado ? "bg-teal-50/30" : "bg-white"
                                                    } hover:bg-slate-50`}
                                            >
                                                <div className="space-y-1.5">
                                                    {citasHora.slice(0, 3).map((cita) => (
                                                        <Link
                                                            key={cita.id}
                                                            href="/agenda"
                                                            className={`block rounded-xl border px-2.5 py-2 shadow-sm ${colorEstadoCita(
                                                                cita.estado
                                                            )}`}
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock3 className="h-3 w-3" />
                                                                <span className="mono text-[9px] font-black">
                                                                    {cita.hora}
                                                                </span>
                                                            </div>

                                                            <h4 className="mt-1 truncate text-[11px] font-black">
                                                                {cita.pacienteNombre}
                                                            </h4>

                                                            <p className="mt-0.5 truncate text-[10px] opacity-80">
                                                                {cita.servicioNombre}
                                                            </p>
                                                        </Link>
                                                    ))}

                                                    {citasHora.length > 3 && (
                                                        <p className="rounded-lg bg-slate-100 px-2 py-1 text-center text-[10px] font-bold text-slate-500">
                                                            +{citasHora.length - 3} más
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <aside className="border-l border-slate-100 bg-slate-50/50">
                        <div className="border-b border-slate-100 bg-white px-5 py-4">
                            <h3 className="text-[16px] font-black text-slate-800">
                                Citas del día
                            </h3>
                            <p className="mono mt-1 text-[10px] text-slate-400">
                                {fechaSeleccionada}
                            </p>
                        </div>

                        <div className="max-h-[820px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {citasDiaSeleccionado.map((cita) => (
                                    <Link
                                        key={cita.id}
                                        href="/agenda"
                                        className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-teal-100 hover:bg-teal-50/20"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                                        {cita.hora}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoBadge(
                                                            cita.estado
                                                        )}`}
                                                    >
                                                        {cita.estado}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {cita.pacienteNombre}
                                                </h4>

                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    {cita.servicioNombre} con {cita.doctorNombre}
                                                </p>
                                            </div>

                                            <p className="text-xs font-black text-slate-800">
                                                {formatoMoneda(cita.costo, configuracion.simboloMoneda)}
                                            </p>
                                        </div>

                                        {cita.observaciones && (
                                            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                                                <p className="text-xs leading-5 text-slate-500">
                                                    {cita.observaciones}
                                                </p>
                                            </div>
                                        )}
                                    </Link>
                                ))}

                                {citasDiaSeleccionado.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                        <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin citas
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            No hay citas en esta fecha.
                                        </p>

                                        <Link
                                            href="/agenda"
                                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-black text-white hover:bg-slate-800"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Crear cita
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 bg-white p-4">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                                    <div>
                                        <h4 className="text-sm font-black text-blue-800">
                                            Calendario limpio
                                        </h4>
                                        <p className="mt-1 text-xs leading-5 text-blue-700">
                                            Este módulo queda solo para citas, navegación semanal y
                                            agenda del día.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </AppShell>
    );
}