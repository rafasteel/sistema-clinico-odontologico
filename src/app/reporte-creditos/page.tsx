"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BadgeDollarSign,
    Banknote,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    FileText,
    Filter,
    RefreshCcw,
    Search,
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
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    listarAbonosCuentaSupabase,
    listarCuentasCobrarSupabase,
    listarVentasSupabase,
    type AbonoCuentaSupabase,
    type CuentaCobrarSupabase,
    type EstadoCuentaCobrarSupabase,
    type EstadoVentaSupabase,
    type VentaSupabase,
} from "@/lib/supabase/finanzas";
import {
    listarPacientesSupabase,
    type PacienteSupabase,
} from "@/lib/supabase/pacientes";

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

type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia" | "Mixto";

type EstadoCuenta = EstadoCuentaCobrarSupabase;

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
    abonado: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuenta;
    abonos?: AbonoCuenta[];
};

type EstadoVenta = EstadoVentaSupabase;

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
};

type CuentaNormalizada = CuentaPorCobrar & {
    estadoVisual: EstadoCuenta;
    diasVencida: number;
    diasParaVencer: number;
    abonado: number;
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

function normalizarTexto(texto: unknown) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function diferenciaDias(fechaBase: string, fechaComparar: string) {
    if (!fechaBase || !fechaComparar) return 0;

    const [yearA, monthA, dayA] = fechaBase.split("-").map(Number);
    const [yearB, monthB, dayB] = fechaComparar.split("-").map(Number);

    const a = new Date(yearA, monthA - 1, dayA).getTime();
    const b = new Date(yearB, monthB - 1, dayB).getTime();

    if (Number.isNaN(a) || Number.isNaN(b)) return 0;

    return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

function obtenerEstadoVisual(cuenta: CuentaPorCobrar): EstadoCuenta {
    if (cuenta.estado === "Pagada" || cuenta.estado === "Anulada") {
        return cuenta.estado;
    }

    if ((cuenta.saldo || 0) <= 0) {
        return "Pagada";
    }

    if (cuenta.fechaVencimiento && cuenta.fechaVencimiento < fechaHoyLocal()) {
        return "Vencida";
    }

    if ((cuenta.abonos || []).length > 0 || cuenta.saldo < cuenta.total) {
        return "Parcial";
    }

    return "Pendiente";
}

function colorEstadoCuenta(estado: EstadoCuenta) {
    if (estado === "Pagada") return "bg-emerald-50 text-emerald-700";
    if (estado === "Parcial") return "bg-blue-50 text-blue-700";
    if (estado === "Vencida") return "bg-red-50 text-red-700";
    if (estado === "Anulada") return "bg-slate-100 text-slate-500";

    return "bg-amber-50 text-amber-700";
}

function porcentaje(valor: number, total: number) {
    if (!total) return 0;

    return Math.round((valor / total) * 100);
}

function descargarCSV(nombreArchivo: string, filas: string[][]) {
    const contenido = filas
        .map((fila) =>
            fila
                .map((celda) => {
                    const texto = String(celda ?? "").replace(/"/g, '""');
                    return `"${texto}"`;
                })
                .join(",")
        )
        .join("\n");

    const blob = new Blob([`\uFEFF${contenido}`], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();

    URL.revokeObjectURL(url);
}

function metodoPago(valor: string): MetodoPago {
    if (valor === "Efectivo") return "Efectivo";
    if (valor === "Tarjeta") return "Tarjeta";
    if (valor === "Transferencia") return "Transferencia";

    return "Mixto";
}

function convertirAbono(abono: AbonoCuentaSupabase): AbonoCuenta {
    return {
        id: abono.id,
        fecha: abono.fecha,
        hora: String(abono.hora || "").slice(0, 5),
        monto: Number(abono.monto || 0),
        metodo: metodoPago(abono.metodo),
        observaciones: abono.observaciones || "",
        usuarioNombre: abono.usuario_nombre || "",
    };
}

function convertirCuenta(
    cuenta: CuentaCobrarSupabase,
    abonos: AbonoCuenta[]
): CuentaPorCobrar {
    return {
        id: cuenta.id,
        ventaId: cuenta.venta_id || "",
        pacienteId: cuenta.paciente_id || "",
        pacienteNombre: cuenta.paciente_nombre || "",
        concepto: cuenta.concepto || "",
        total: Number(cuenta.total || 0),
        abonado: Number(cuenta.abonado || 0),
        saldo: Number(cuenta.saldo || 0),
        fecha: cuenta.fecha,
        fechaVencimiento: cuenta.fecha_vencimiento || "",
        estado: cuenta.estado || "Pendiente",
        abonos,
    };
}

function convertirVenta(venta: VentaSupabase): Venta {
    return {
        id: venta.id,
        fecha: venta.fecha,
        hora: String(venta.hora || "").slice(0, 5),
        tipoCobro: venta.tipo_cobro || "Venta",
        citaId: venta.cita_id || "",
        pacienteId: venta.paciente_id || "",
        clienteNombre: venta.cliente_nombre || "",
        concepto: venta.concepto || "",
        total: Number(venta.total || 0),
        efectivo: Number(venta.efectivo || 0),
        tarjeta: Number(venta.tarjeta || 0),
        transferencia: Number(venta.transferencia || 0),
        credito: Number(venta.credito || 0),
        estado: venta.estado || "Pagada",
        usuarioNombre: venta.usuario_nombre || "",
        observaciones: venta.observaciones || "",
    };
}

function convertirPaciente(paciente: PacienteSupabase): Paciente {
    return {
        id: paciente.id,
        nombre: paciente.nombre || "",
        telefono: paciente.telefono || paciente.whatsapp || "",
        cedula: paciente.cedula || "",
        fechaNacimiento: paciente.fecha_nacimiento || "",
        direccion: paciente.direccion || "",
        alergias: paciente.alergias || "",
        enfermedades:
            paciente.enfermedades_sistemicas ||
            paciente.antecedentes ||
            "",
        medicamentos: paciente.medicamentos_actuales || "",
        observaciones: paciente.observaciones || "",
        estado: paciente.estado || "Activo",
        saldoPendiente: 0,
        ultimaCita: "",
    };
}

export default function ReporteCreditosPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [pacientes, setPacientes] = useState<Paciente[]>([]);

    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState<"Todos" | EstadoCuenta>(
        "Todos"
    );
    const [mesFiltro, setMesFiltro] = useState(mesActualLocal());
    const [soloConSaldo, setSoloConSaldo] = useState(true);
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

            const [cuentasSupabase, ventasSupabase, pacientesSupabase] =
                await Promise.all([
                    listarCuentasCobrarSupabase(),
                    listarVentasSupabase(),
                    listarPacientesSupabase(),
                ]);

            const cuentasConAbonos = await Promise.all(
                cuentasSupabase.map(async (cuenta) => {
                    const abonosSupabase = await listarAbonosCuentaSupabase(cuenta.id);

                    return convertirCuenta(
                        cuenta,
                        abonosSupabase
                            .filter((abono) => abono.estado !== "Anulado")
                            .map(convertirAbono)
                    );
                })
            );

            setCuentas(cuentasConAbonos);
            setVentas(ventasSupabase.map(convertirVenta));
            setPacientes(pacientesSupabase.map(convertirPaciente));
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el reporte de créditos desde Supabase.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    function recargarDatos() {
        cargarDatos();
    }

    const cuentasNormalizadas = useMemo<CuentaNormalizada[]>(() => {
        return cuentas.map((cuenta) => {
            const estadoVisual = obtenerEstadoVisual(cuenta);
            const abonos = cuenta.abonos || [];
            const abonado = numero(cuenta.abonado);
            const diasParaVencer = diferenciaDias(fechaHoyLocal(), cuenta.fechaVencimiento);
            const diasVencida =
                estadoVisual === "Vencida" ? Math.abs(diasParaVencer) : 0;

            return {
                ...cuenta,
                estadoVisual,
                abonos,
                abonado,
                diasParaVencer,
                diasVencida,
            };
        });
    }, [cuentas]);

    const cuentasFiltradas = useMemo(() => {
        const texto = normalizarTexto(busqueda);

        return cuentasNormalizadas
            .filter((cuenta) => {
                const coincideBusqueda =
                    !texto ||
                    normalizarTexto(cuenta.pacienteNombre || "").includes(texto) ||
                    normalizarTexto(cuenta.concepto || "").includes(texto) ||
                    normalizarTexto(cuenta.id || "").includes(texto) ||
                    normalizarTexto(cuenta.ventaId || "").includes(texto);

                const coincideEstado =
                    estadoFiltro === "Todos" || cuenta.estadoVisual === estadoFiltro;

                const coincideMes =
                    !mesFiltro ||
                    cuenta.fecha.startsWith(mesFiltro) ||
                    cuenta.fechaVencimiento.startsWith(mesFiltro);

                const coincideSaldo = !soloConSaldo || cuenta.saldo > 0;

                return coincideBusqueda && coincideEstado && coincideMes && coincideSaldo;
            })
            .sort((a, b) => {
                if (a.estadoVisual === "Vencida" && b.estadoVisual !== "Vencida") {
                    return -1;
                }

                if (a.estadoVisual !== "Vencida" && b.estadoVisual === "Vencida") {
                    return 1;
                }

                return b.fecha.localeCompare(a.fecha);
            });
    }, [cuentasNormalizadas, busqueda, estadoFiltro, mesFiltro, soloConSaldo]);

    const cuentasActivas = cuentasNormalizadas.filter(
        (cuenta) =>
            cuenta.estadoVisual !== "Pagada" && cuenta.estadoVisual !== "Anulada"
    );

    const cuentasVencidas = cuentasNormalizadas.filter(
        (cuenta) => cuenta.estadoVisual === "Vencida"
    );

    const cuentasPendientes = cuentasNormalizadas.filter(
        (cuenta) => cuenta.estadoVisual === "Pendiente"
    );

    const cuentasParciales = cuentasNormalizadas.filter(
        (cuenta) => cuenta.estadoVisual === "Parcial"
    );

    const cuentasPagadas = cuentasNormalizadas.filter(
        (cuenta) => cuenta.estadoVisual === "Pagada"
    );

    const ventasCredito = ventas.filter(
        (venta) =>
            venta.estado !== "Anulada" &&
            ((venta.credito || 0) > 0 ||
                venta.estado === "Crédito" ||
                venta.estado === "Parcial")
    );

    const totalCreditosGenerados = cuentasNormalizadas
        .filter((cuenta) => cuenta.estadoVisual !== "Anulada")
        .reduce((total, cuenta) => total + numero(cuenta.total), 0);

    const totalSaldoPendiente = cuentasActivas.reduce(
        (total, cuenta) => total + numero(cuenta.saldo),
        0
    );

    const totalVencido = cuentasVencidas.reduce(
        (total, cuenta) => total + numero(cuenta.saldo),
        0
    );

    const totalAbonado = cuentasNormalizadas.reduce(
        (total, cuenta) => total + numero(cuenta.abonado),
        0
    );

    const totalFiltrado = cuentasFiltradas.reduce(
        (total, cuenta) => total + numero(cuenta.saldo),
        0
    );

    const proximosVencimientos = cuentasActivas
        .filter(
            (cuenta) =>
                cuenta.diasParaVencer >= 0 &&
                cuenta.diasParaVencer <= 7 &&
                cuenta.saldo > 0
        )
        .sort((a, b) => a.diasParaVencer - b.diasParaVencer);

    const antiguedadSaldos = [
        {
            titulo: "Al día",
            descripcion: "No vencidas",
            cuentas: cuentasActivas.filter((cuenta) => cuenta.estadoVisual !== "Vencida"),
        },
        {
            titulo: "1 - 30 días",
            descripcion: "Vencimiento reciente",
            cuentas: cuentasVencidas.filter(
                (cuenta) => cuenta.diasVencida >= 1 && cuenta.diasVencida <= 30
            ),
        },
        {
            titulo: "31 - 60 días",
            descripcion: "Seguimiento prioritario",
            cuentas: cuentasVencidas.filter(
                (cuenta) => cuenta.diasVencida >= 31 && cuenta.diasVencida <= 60
            ),
        },
        {
            titulo: "Más de 60 días",
            descripcion: "Riesgo alto",
            cuentas: cuentasVencidas.filter((cuenta) => cuenta.diasVencida > 60),
        },
    ];

    const resumenPacientes = useMemo(() => {
        const mapa = new Map<
            string,
            {
                pacienteId: string;
                pacienteNombre: string;
                telefono: string;
                total: number;
                saldo: number;
                abonado: number;
                cuentas: number;
                vencidas: number;
            }
        >();

        cuentasNormalizadas
            .filter((cuenta) => cuenta.estadoVisual !== "Anulada")
            .forEach((cuenta) => {
                const paciente = pacientes.find((item) => item.id === cuenta.pacienteId);

                const existente =
                    mapa.get(cuenta.pacienteId) ||
                    {
                        pacienteId: cuenta.pacienteId,
                        pacienteNombre: cuenta.pacienteNombre,
                        telefono: paciente?.telefono || "",
                        total: 0,
                        saldo: 0,
                        abonado: 0,
                        cuentas: 0,
                        vencidas: 0,
                    };

                existente.total += numero(cuenta.total);
                existente.saldo += numero(cuenta.saldo);
                existente.abonado += numero(cuenta.abonado);
                existente.cuentas += 1;

                if (cuenta.estadoVisual === "Vencida") {
                    existente.vencidas += 1;
                }

                mapa.set(cuenta.pacienteId, existente);
            });

        return Array.from(mapa.values()).sort((a, b) => b.saldo - a.saldo);
    }, [cuentasNormalizadas, pacientes]);

    function exportarReporteCSV() {
        const filas = [
            [
                "Paciente",
                "Concepto",
                "Fecha",
                "Vencimiento",
                "Estado",
                "Total crédito",
                "Abonado",
                "Saldo",
                "Días vencida",
                "Venta ID",
            ],
            ...cuentasFiltradas.map((cuenta) => [
                cuenta.pacienteNombre,
                cuenta.concepto,
                cuenta.fecha,
                cuenta.fechaVencimiento,
                cuenta.estadoVisual,
                String(cuenta.total || 0),
                String(cuenta.abonado || 0),
                String(cuenta.saldo || 0),
                String(cuenta.diasVencida || 0),
                cuenta.ventaId || "",
            ]),
        ];

        descargarCSV(`reporte-creditos-${fechaHoyLocal()}.csv`, filas);
    }

    return (
        <AppShell
            titulo="Reporte de Créditos"
            descripcion="Análisis de saldos pendientes, vencimientos y recuperación de cartera"
            moduloActivo="Reporte de Créditos"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo cargar el reporte
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
                            Reporte conectado a Supabase
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                            Cuentas por cobrar, ventas, abonos y pacientes se leen desde la base de datos.
                        </p>
                    </div>

                    {cargando && (
                        <span className="rounded-full bg-teal-50 px-3 py-2 text-[11px] font-black text-teal-700">
                            Cargando datos...
                        </span>
                    )}
                </div>
            </section>

            <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">
                        Reporte de créditos
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Analiza cuentas por cobrar, cartera vencida y recuperación de pagos desde Supabase.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={recargarDatos}
                        disabled={cargando}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                        Recargar
                    </button>

                    <button
                        onClick={exportarReporteCSV}
                        className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-[12px] font-bold text-white hover:bg-teal-700"
                    >
                        <Download className="h-4 w-4" />
                        Exportar CSV
                    </button>

                    <Link
                        href="/cuentas-cobrar"
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                    >
                        <WalletCards className="h-4 w-4" />
                        Cuentas por cobrar
                    </Link>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
                    <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <TrendingUp className="h-6 w-6 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">
                            Cartera de créditos
                        </h2>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                            Este reporte consolida ventas a crédito, presupuestos convertidos,
                            abonos, cuentas vencidas y saldos pendientes para ayudarte a dar
                            seguimiento financiero.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Clínica: {configuracion.nombreClinica}
                            </span>

                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Ventas con crédito: {ventasCredito.length}
                            </span>

                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Cuentas activas: {cuentasActivas.length}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Saldo pendiente
                        </p>

                        <h3 className="mt-3 text-3xl font-black">
                            {formatoMoneda(totalSaldoPendiente, configuracion.simboloMoneda)}
                        </h3>

                        <p className="mt-2 text-sm text-white/50">
                            {cuentasVencidas.length} cuenta(s) vencida(s).
                        </p>
                    </div>
                </div>
            </section>

            {cuentasVencidas.length > 0 && (
                <section className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                Cartera vencida detectada
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                Hay {cuentasVencidas.length} cuenta(s) vencida(s) por un total
                                de {formatoMoneda(totalVencido, configuracion.simboloMoneda)}.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <FileText className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(totalCreditosGenerados, configuracion.simboloMoneda)}
                    </h3>

                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Créditos generados
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <WalletCards className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(totalSaldoPendiente, configuracion.simboloMoneda)}
                    </h3>

                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Saldo pendiente
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                        <AlertTriangle className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(totalVencido, configuracion.simboloMoneda)}
                    </h3>

                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Saldo vencido
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Banknote className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(totalAbonado, configuracion.simboloMoneda)}
                    </h3>

                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total abonado
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-blue-700" />
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Filtros del reporte
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-4 p-5">
                            <div>
                                <label className="mb-2 block text-[12px] font-black text-slate-700">
                                    Buscar
                                </label>

                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                    <input
                                        value={busqueda}
                                        onChange={(event) => setBusqueda(event.target.value)}
                                        placeholder="Paciente, concepto, venta..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-black text-slate-700">
                                    Estado
                                </label>

                                <select
                                    value={estadoFiltro}
                                    onChange={(event) =>
                                        setEstadoFiltro(event.target.value as "Todos" | EstadoCuenta)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option>Todos</option>
                                    <option>Pendiente</option>
                                    <option>Parcial</option>
                                    <option>Vencida</option>
                                    <option>Pagada</option>
                                    <option>Anulada</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-black text-slate-700">
                                    Mes
                                </label>

                                <input
                                    value={mesFiltro}
                                    onChange={(event) => setMesFiltro(event.target.value)}
                                    type="month"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4">
                                <span className="text-sm font-bold text-slate-700">
                                    Solo cuentas con saldo
                                </span>

                                <input
                                    type="checkbox"
                                    checked={soloConSaldo}
                                    onChange={(event) => setSoloConSaldo(event.target.checked)}
                                    className="h-5 w-5 accent-teal-600"
                                />
                            </label>

                            <button
                                onClick={() => {
                                    setBusqueda("");
                                    setEstadoFiltro("Todos");
                                    setMesFiltro("");
                                    setSoloConSaldo(true);
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Distribución por estado
                            </h3>
                        </div>

                        <div className="space-y-3 p-5">
                            {[
                                { estado: "Pendiente", total: cuentasPendientes.length },
                                { estado: "Parcial", total: cuentasParciales.length },
                                { estado: "Vencida", total: cuentasVencidas.length },
                                { estado: "Pagada", total: cuentasPagadas.length },
                            ].map((item) => (
                                <div key={item.estado} className="rounded-2xl bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`rounded-full px-3 py-1 text-[10px] font-black ${colorEstadoCuenta(
                                                item.estado as EstadoCuenta
                                            )}`}
                                        >
                                            {item.estado}
                                        </span>

                                        <strong className="text-sm text-slate-800">
                                            {item.total}
                                        </strong>
                                    </div>

                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-900"
                                            style={{
                                                width: `${porcentaje(
                                                    item.total,
                                                    cuentasNormalizadas.length || 1
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Antigüedad de saldos
                            </h3>
                        </div>

                        <div className="grid gap-3 p-5">
                            {antiguedadSaldos.map((grupo) => {
                                const saldo = grupo.cuentas.reduce(
                                    (total, cuenta) => total + numero(cuenta.saldo),
                                    0
                                );

                                return (
                                    <div key={grupo.titulo} className="rounded-2xl bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">
                                                    {grupo.titulo}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    {grupo.descripcion}
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                                                {grupo.cuentas.length}
                                            </span>
                                        </div>

                                        <p className="mt-3 text-lg font-black text-slate-900">
                                            {formatoMoneda(saldo, configuracion.simboloMoneda)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Resultado del reporte
                            </h3>

                            <p className="mono mt-1 text-[10px] text-slate-400">
                                {cuentasFiltradas.length} cuenta(s) ·{" "}
                                {formatoMoneda(totalFiltrado, configuracion.simboloMoneda)} filtrado
                            </p>
                        </div>

                        <div className="max-h-[980px] overflow-y-auto p-4">
                            <div className="space-y-4">
                                {cuentasFiltradas.map((cuenta) => (
                                    <div
                                        key={cuenta.id}
                                        className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-[10px] font-black ${colorEstadoCuenta(
                                                            cuenta.estadoVisual
                                                        )}`}
                                                    >
                                                        {cuenta.estadoVisual}
                                                    </span>

                                                    <span className="mono rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                        Crédito: {fechaLegible(cuenta.fecha)}
                                                    </span>

                                                    <span className="mono rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">
                                                        Vence: {fechaLegible(cuenta.fechaVencimiento)}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-lg font-black text-slate-900">
                                                    {cuenta.pacienteNombre}
                                                </h4>

                                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                                    {cuenta.concepto}
                                                </p>

                                                {cuenta.estadoVisual === "Vencida" && (
                                                    <p className="mt-2 text-xs font-bold text-red-700">
                                                        Vencida hace {cuenta.diasVencida} día(s)
                                                    </p>
                                                )}

                                                {cuenta.estadoVisual !== "Vencida" &&
                                                    cuenta.estadoVisual !== "Pagada" &&
                                                    cuenta.estadoVisual !== "Anulada" && (
                                                        <p className="mt-2 text-xs font-bold text-amber-700">
                                                            Días para vencer: {cuenta.diasParaVencer}
                                                        </p>
                                                    )}
                                            </div>

                                            <div className="text-left md:text-right">
                                                <p className="text-[11px] font-bold text-slate-400">
                                                    Saldo
                                                </p>
                                                <p className="text-2xl font-black text-slate-900">
                                                    {formatoMoneda(
                                                        cuenta.saldo,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>

                                                <Link
                                                    href="/cuentas-cobrar"
                                                    className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800"
                                                >
                                                    Gestionar
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid gap-3 md:grid-cols-4">
                                            <div className="rounded-2xl bg-slate-50 p-4">
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    Total
                                                </p>
                                                <p className="mt-1 text-sm font-black text-slate-800">
                                                    {formatoMoneda(
                                                        cuenta.total,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl bg-emerald-50 p-4">
                                                <p className="text-[10px] font-bold text-emerald-700">
                                                    Abonado
                                                </p>
                                                <p className="mt-1 text-sm font-black text-emerald-700">
                                                    {formatoMoneda(
                                                        cuenta.abonado,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl bg-amber-50 p-4">
                                                <p className="text-[10px] font-bold text-amber-700">
                                                    Pendiente
                                                </p>
                                                <p className="mt-1 text-sm font-black text-amber-700">
                                                    {formatoMoneda(
                                                        cuenta.saldo,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl bg-blue-50 p-4">
                                                <p className="text-[10px] font-bold text-blue-700">
                                                    Abonos
                                                </p>
                                                <p className="mt-1 text-sm font-black text-blue-700">
                                                    {(cuenta.abonos || []).length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {cuentasFiltradas.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <WalletCards className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin resultados
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {cargando
                                                ? "Cargando créditos desde Supabase..."
                                                : "No hay créditos que coincidan con los filtros actuales."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="glass-card overflow-hidden rounded-3xl">
                            <div className="border-b border-black/[0.04] px-6 py-5">
                                <div className="flex items-center gap-2">
                                    <Clock3 className="h-5 w-5 text-amber-700" />
                                    <h3 className="text-[18px] font-black text-slate-800">
                                        Próximos vencimientos
                                    </h3>
                                </div>
                            </div>

                            <div className="space-y-3 p-5">
                                {proximosVencimientos.slice(0, 8).map((cuenta) => (
                                    <div key={cuenta.id} className="rounded-2xl bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">
                                                    {cuenta.pacienteNombre}
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Vence en {cuenta.diasParaVencer} día(s)
                                                </p>
                                            </div>

                                            <strong className="text-sm text-slate-900">
                                                {formatoMoneda(cuenta.saldo, configuracion.simboloMoneda)}
                                            </strong>
                                        </div>
                                    </div>
                                ))}

                                {proximosVencimientos.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
                                        No hay vencimientos próximos en los siguientes 7 días.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-card overflow-hidden rounded-3xl">
                            <div className="border-b border-black/[0.04] px-6 py-5">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-teal-700" />
                                    <h3 className="text-[18px] font-black text-slate-800">
                                        Pacientes con mayor saldo
                                    </h3>
                                </div>
                            </div>

                            <div className="space-y-3 p-5">
                                {resumenPacientes.slice(0, 8).map((paciente) => (
                                    <div
                                        key={paciente.pacienteId}
                                        className="rounded-2xl bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">
                                                    {paciente.pacienteNombre}
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {paciente.cuentas} cuenta(s) · {paciente.vencidas} vencida(s)
                                                </p>
                                            </div>

                                            <strong className="text-sm text-slate-900">
                                                {formatoMoneda(paciente.saldo, configuracion.simboloMoneda)}
                                            </strong>
                                        </div>

                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-teal-600"
                                                style={{
                                                    width: `${porcentaje(
                                                        paciente.saldo,
                                                        totalSaldoPendiente || 1
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {resumenPacientes.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
                                        No hay pacientes con saldo pendiente.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <div className="flex items-start gap-3">
                            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                            <div>
                                <h3 className="text-sm font-black text-blue-800">
                                    Uso recomendado del reporte
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-blue-700">
                                    Usá este módulo para revisión administrativa. Para registrar
                                    abonos o anular cuentas, entrá al módulo Cuentas por Cobrar.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}
