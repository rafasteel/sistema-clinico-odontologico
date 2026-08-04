"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    FileText,
    RefreshCcw,
    Search,
    UserRound,
    Users,
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
    listarPacientesSupabase,
    type PacienteSupabase,
} from "@/lib/supabase/pacientes";
import {
    listarPresupuestosSupabase,
    type EstadoPresupuestoSupabase,
    type PresupuestoSupabase,
} from "@/lib/supabase/presupuestos";

type Paciente = {
    id: string;
    nombre: string;
    telefono: string;
    cedula: string;
    direccion: string;
    estado: string;
};

type PacienteConResumen = Paciente & {
    presupuestos: PresupuestoSupabase[];
    cantidadPresupuestos: number;
    totalPresupuestado: number;
    ultimoPresupuesto: PresupuestoSupabase | null;
};

type FiltroEstadoPresupuesto = "Todos" | EstadoPresupuestoSupabase;

const estadosPresupuesto: FiltroEstadoPresupuesto[] = [
    "Todos",
    "Pendiente",
    "Aprobado",
    "Rechazado",
    "Convertido a venta",
];

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function normalizar(valor: unknown) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function fechaLegible(fecha?: string | null) {
    if (!fecha) return "Sin fecha";

    const partes = fecha.split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;

    try {
        return new Date(fecha).toLocaleDateString("es-NI", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    } catch {
        return fecha;
    }
}

function estadoColor(estado?: string | null) {
    if (estado === "Aprobado") return "border-emerald-100 bg-emerald-50 text-emerald-700";
    if (estado === "Convertido a venta") return "border-blue-100 bg-blue-50 text-blue-700";
    if (estado === "Rechazado") return "border-red-100 bg-red-50 text-red-700";

    return "border-amber-100 bg-amber-50 text-amber-700";
}

function convertirPaciente(paciente: PacienteSupabase): Paciente {
    return {
        id: paciente.id,
        nombre: paciente.nombre || "",
        telefono: paciente.telefono || paciente.whatsapp || "",
        cedula: paciente.cedula || "",
        direccion: paciente.direccion || "",
        estado: paciente.estado || "Activo",
    };
}

function ordenarPresupuestos(a: PresupuestoSupabase, b: PresupuestoSupabase) {
    const fechaA = `${a.fecha || ""} ${a.hora || ""}`;
    const fechaB = `${b.fecha || ""} ${b.hora || ""}`;

    return fechaB.localeCompare(fechaA);
}

export default function PresupuestosPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [presupuestos, setPresupuestos] = useState<PresupuestoSupabase[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] =
        useState<FiltroEstadoPresupuesto>("Todos");
    const [soloConPresupuestos, setSoloConPresupuestos] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }

            const [pacientesSupabase, presupuestosSupabase] = await Promise.all([
                listarPacientesSupabase(),
                listarPresupuestosSupabase(),
            ]);

            setPacientes(pacientesSupabase.map(convertirPaciente));
            setPresupuestos([...presupuestosSupabase].sort(ordenarPresupuestos));
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el acceso rápido de presupuestos.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    const presupuestosPorPaciente = useMemo(() => {
        return presupuestos.reduce<Record<string, PresupuestoSupabase[]>>(
            (mapa, presupuesto) => {
                const pacienteId = presupuesto.paciente_id || "";

                if (!pacienteId) return mapa;

                if (!mapa[pacienteId]) mapa[pacienteId] = [];
                mapa[pacienteId].push(presupuesto);

                return mapa;
            },
            {}
        );
    }, [presupuestos]);

    const pacientesConResumen = useMemo<PacienteConResumen[]>(() => {
        return pacientes.map((paciente) => {
            const presupuestosPaciente = [
                ...(presupuestosPorPaciente[paciente.id] || []),
            ].sort(ordenarPresupuestos);

            return {
                ...paciente,
                presupuestos: presupuestosPaciente,
                cantidadPresupuestos: presupuestosPaciente.length,
                totalPresupuestado: presupuestosPaciente.reduce(
                    (total, presupuesto) => total + numero(presupuesto.total),
                    0
                ),
                ultimoPresupuesto: presupuestosPaciente[0] || null,
            };
        });
    }, [pacientes, presupuestosPorPaciente]);

    const pacientesFiltrados = useMemo(() => {
        const textoBusqueda = normalizar(busqueda);

        return pacientesConResumen.filter((paciente) => {
            const coincideBusqueda =
                !textoBusqueda ||
                normalizar(
                    `${paciente.nombre} ${paciente.cedula} ${paciente.telefono} ${paciente.direccion}`
                ).includes(textoBusqueda);

            const coincideConPresupuestos =
                !soloConPresupuestos || paciente.cantidadPresupuestos > 0;

            const coincideEstadoPresupuesto =
                estadoFiltro === "Todos" ||
                paciente.presupuestos.some(
                    (presupuesto) => presupuesto.estado === estadoFiltro
                );

            return (
                coincideBusqueda &&
                coincideConPresupuestos &&
                coincideEstadoPresupuesto
            );
        });
    }, [pacientesConResumen, busqueda, soloConPresupuestos, estadoFiltro]);

    const presupuestosFiltrados = useMemo(() => {
        if (estadoFiltro === "Todos") return presupuestos.slice(0, 8);

        return presupuestos
            .filter((presupuesto) => presupuesto.estado === estadoFiltro)
            .slice(0, 8);
    }, [presupuestos, estadoFiltro]);

    const totalPresupuestos = presupuestos.length;
    const totalPendientes = presupuestos.filter(
        (presupuesto) => presupuesto.estado === "Pendiente"
    ).length;
    const totalAprobados = presupuestos.filter(
        (presupuesto) => presupuesto.estado === "Aprobado"
    ).length;
    const montoTotal = presupuestos.reduce(
        (total, presupuesto) => total + numero(presupuesto.total),
        0
    );

    return (
        <AppShell
            titulo="Presupuestos"
            descripcion="Acceso rápido para seleccionar pacientes y crear o consultar presupuestos"
            moduloActivo="Presupuestos"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo cargar presupuestos
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-3xl p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-3xl font-black text-slate-900">
                        {totalPresupuestos}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                        Presupuestos registrados
                    </p>
                </div>

                <div className="glass-card rounded-3xl p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-3xl font-black text-slate-900">
                        {totalPendientes}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                        Pendientes
                    </p>
                </div>

                <div className="glass-card rounded-3xl p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-3xl font-black text-slate-900">
                        {totalAprobados}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                        Aprobados
                    </p>
                </div>

                <div className="glass-card rounded-3xl p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                        <WalletCards className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-2xl font-black text-slate-900">
                        {formatoMoneda(montoTotal, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                        Total presupuestado
                    </p>
                </div>
            </section>

            <section className="mt-4 rounded-3xl border border-white bg-white/80 p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            Seleccionar paciente
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                            Buscá el paciente y entrá directo a crear o revisar sus presupuestos.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <div className="flex min-w-[260px] items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3">
                            <Search className="h-4 w-4 shrink-0 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar paciente, cédula o teléfono..."
                                className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                            />
                        </div>

                        <select
                            value={estadoFiltro}
                            onChange={(event) =>
                                setEstadoFiltro(event.target.value as FiltroEstadoPresupuesto)
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        >
                            {estadosPresupuesto.map((estado) => (
                                <option key={estado}>{estado}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() => setSoloConPresupuestos((actual) => !actual)}
                            className={`rounded-2xl px-4 py-3 text-xs font-black ${soloConPresupuestos
                                    ? "bg-teal-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Solo con presupuestos
                        </button>

                        <button
                            type="button"
                            onClick={cargarDatos}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white hover:bg-slate-800"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Recargar
                        </button>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="glass-card overflow-hidden rounded-3xl">
                    <div className="border-b border-black/[0.04] px-6 py-5">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-teal-700" />
                            <h2 className="text-lg font-black text-slate-900">
                                Pacientes
                            </h2>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                            Acceso directo a presupuestos por paciente.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px]">
                            <thead>
                                <tr className="border-b border-black/[0.04]">
                                    {[
                                        "Paciente",
                                        "Contacto",
                                        "Presupuestos",
                                        "Último",
                                        "Acciones",
                                    ].map((titulo) => (
                                        <th
                                            key={titulo}
                                            className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"
                                        >
                                            {titulo}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {pacientesFiltrados.map((paciente) => (
                                    <tr
                                        key={paciente.id}
                                        className="border-b border-black/[0.03]"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                                    <UserRound className="h-5 w-5" />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-black text-slate-800">
                                                        {paciente.nombre || "Paciente sin nombre"}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        Cédula: {paciente.cedula || "No registrada"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            <p>{paciente.telefono || "Sin teléfono"}</p>
                                            <p>{paciente.direccion || "Sin dirección"}</p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-sm font-black text-slate-800">
                                                {paciente.cantidadPresupuestos}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                {formatoMoneda(
                                                    paciente.totalPresupuestado,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            {paciente.ultimoPresupuesto ? (
                                                <>
                                                    <span
                                                        className={`rounded-full border px-3 py-1 text-[10px] font-black ${estadoColor(
                                                            paciente.ultimoPresupuesto.estado
                                                        )}`}
                                                    >
                                                        {paciente.ultimoPresupuesto.estado}
                                                    </span>
                                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                                        {fechaLegible(paciente.ultimoPresupuesto.fecha)}
                                                    </p>
                                                </>
                                            ) : (
                                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-500">
                                                    Sin presupuestos
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <Link
                                                    href={`/pacientes/${paciente.id}/presupuestos`}
                                                    className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700 hover:bg-blue-100"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Crear / ver
                                                </Link>

                                                <Link
                                                    href={`/pacientes/${paciente.id}`}
                                                    className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-200"
                                                >
                                                    Perfil
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {!cargando && pacientesFiltrados.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-12 text-center text-sm text-slate-400"
                                        >
                                            No se encontraron pacientes con los filtros actuales.
                                        </td>
                                    </tr>
                                )}

                                {cargando && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-12 text-center text-sm text-slate-400"
                                        >
                                            Cargando pacientes y presupuestos...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-card rounded-3xl p-5">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-teal-700" />
                        <h2 className="text-lg font-black text-slate-900">
                            Presupuestos recientes
                        </h2>
                    </div>

                    <div className="mt-4 space-y-3">
                        {presupuestosFiltrados.map((presupuesto) => (
                            <div
                                key={presupuesto.id}
                                className="rounded-2xl border border-slate-100 bg-white p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-800">
                                            {presupuesto.paciente_nombre || "Paciente no especificado"}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {fechaLegible(presupuesto.fecha)} ·{" "}
                                            {String(presupuesto.hora || "").slice(0, 5) || "Sin hora"}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full border px-3 py-1 text-[10px] font-black ${estadoColor(
                                            presupuesto.estado
                                        )}`}
                                    >
                                        {presupuesto.estado}
                                    </span>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-sm font-black text-slate-900">
                                        {formatoMoneda(
                                            numero(presupuesto.total),
                                            configuracion.simboloMoneda
                                        )}
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href={`/pacientes/${presupuesto.paciente_id}/presupuestos`}
                                            className="rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700 hover:bg-blue-100"
                                        >
                                            Ver paciente
                                        </Link>

                                        <Link
                                            href={`/presupuestos/${presupuesto.id}`}
                                            className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white hover:bg-slate-800"
                                        >
                                            Imprimir
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!cargando && presupuestosFiltrados.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                                <p className="mt-3 text-xs text-slate-400">
                                    Todavía no hay presupuestos registrados.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AppShell>
    );
}