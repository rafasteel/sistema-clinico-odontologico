"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    Loader2,
    Printer,
    UserRound,
} from "lucide-react";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import {
    obtenerPacienteSupabase,
    type PacienteSupabase,
} from "@/lib/supabase/pacientes";
import {
    listarAbonosCuentaSupabase,
    listarCuentasPacienteSupabase,
    type AbonoCuentaSupabase,
    type CuentaCobrarSupabase,
    type EstadoCuentaCobrarSupabase,
} from "@/lib/supabase/finanzas";

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

type CuentaNormalizada = CuentaPorCobrar & {
    estadoVisual: EstadoCuenta;
    abonado: number;
    abonos: AbonoCuenta[];
};

type AbonoListado = AbonoCuenta & {
    cuentaId: string;
    ventaId: string;
    concepto: string;
};

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function numero(valor: unknown) {
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

function fechaLegible(fecha: string) {
    if (!fecha) return "No registrada";

    const partes = fecha.split("-");
    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
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

    if ((cuenta.abonado || 0) > 0 || cuenta.saldo < cuenta.total) {
        return "Parcial";
    }

    return "Pendiente";
}

function metodoPago(valor: string): MetodoPago {
    if (valor === "Efectivo") return "Efectivo";
    if (valor === "Tarjeta") return "Tarjeta";
    if (valor === "Transferencia") return "Transferencia";

    return "Mixto";
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

function convertirAbono(abono: AbonoCuentaSupabase): AbonoCuenta {
    return {
        id: abono.id,
        fecha: abono.fecha,
        hora: horaCorta(abono.hora),
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

export default function EstadoCuentaPacientePage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            setConfiguracion(obtenerConfiguracionClinica());

            const pacienteSupabase = await obtenerPacienteSupabase(pacienteId);
            const cuentasSupabase = await listarCuentasPacienteSupabase(pacienteId);

            const cuentasConAbonos = await Promise.all(
                cuentasSupabase.map(async (cuenta) => {
                    const abonosSupabase = await listarAbonosCuentaSupabase(cuenta.id);

                    return convertirCuenta(
                        cuenta,
                        abonosSupabase.map(convertirAbono)
                    );
                })
            );

            setPaciente(convertirPaciente(pacienteSupabase));
            setCuentas(cuentasConAbonos);
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el estado de cuenta desde Supabase.";

            setError(mensaje);
            setPaciente(null);
            setCuentas([]);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        if (!pacienteId) return;

        cargarDatos();
    }, [pacienteId]);

    const cuentasPaciente = useMemo<CuentaNormalizada[]>(() => {
        return cuentas
            .map((cuenta) => ({
                ...cuenta,
                abonos: cuenta.abonos || [],
                abonado: numero(cuenta.abonado),
                estadoVisual: obtenerEstadoVisual(cuenta),
            }))
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [cuentas]);

    const cuentasActivas = cuentasPaciente.filter(
        (cuenta) =>
            cuenta.estadoVisual !== "Pagada" && cuenta.estadoVisual !== "Anulada"
    );

    const cuentasVencidas = cuentasPaciente.filter(
        (cuenta) => cuenta.estadoVisual === "Vencida"
    );

    const totalCredito = cuentasPaciente
        .filter((cuenta) => cuenta.estadoVisual !== "Anulada")
        .reduce((total, cuenta) => total + numero(cuenta.total), 0);

    const totalAbonado = cuentasPaciente
        .filter((cuenta) => cuenta.estadoVisual !== "Anulada")
        .reduce((total, cuenta) => total + numero(cuenta.abonado), 0);

    const totalSaldo = cuentasActivas.reduce(
        (total, cuenta) => total + numero(cuenta.saldo),
        0
    );

    const totalVencido = cuentasVencidas.reduce(
        (total, cuenta) => total + numero(cuenta.saldo),
        0
    );

    const abonosOrdenados = useMemo<AbonoListado[]>(() => {
        return cuentasPaciente
            .flatMap((cuenta) =>
                cuenta.abonos.map((abono) => ({
                    ...abono,
                    cuentaId: cuenta.id,
                    ventaId: cuenta.ventaId,
                    concepto: cuenta.concepto,
                }))
            )
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );
    }, [cuentasPaciente]);

    function imprimir() {
        window.print();
    }

    if (cargando) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 text-teal-700">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Cargando estado de cuenta
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Consultando paciente, cuentas y abonos desde Supabase.
                    </p>
                </section>
            </main>
        );
    }

    if (!paciente) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <section className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <FileText className="h-8 w-8" />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        Paciente no encontrado
                    </h1>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        {error ||
                            "No encontramos el paciente solicitado para generar el estado de cuenta."}
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
                        font-size: 9.4px !important;
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
                        padding: 4px 5px !important;
                    }

                    .print-small {
                        font-size: 9.6px !important;
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

            <section className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Link
                    href="/cuentas-cobrar"
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a cuentas por cobrar
                </Link>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/pacientes/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-[12px] font-bold text-teal-700 hover:bg-teal-100"
                    >
                        <UserRound className="h-4 w-4" />
                        Perfil del paciente
                    </Link>

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

            <section className="print-document mx-auto max-w-5xl rounded-2xl border border-slate-300 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                <header className="print-section border-b-2 border-slate-900 pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                {configuracion.nombreClinica}
                            </p>

                            <h1 className="print-title mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
                                Estado de cuenta
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

                        <div className="rounded-xl border border-slate-400 text-[11px] md:w-[250px] print-border">
                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Emisión</span>
                                <strong>{fechaLegible(fechaHoyLocal())}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Cuentas</span>
                                <strong>{cuentasPaciente.length}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Activas</span>
                                <strong>{cuentasActivas.length}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Vencidas</span>
                                <strong>{cuentasVencidas.length}</strong>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="print-section border-b border-slate-300 py-3 print-border">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Datos del paciente
                    </h2>

                    <div className="grid overflow-hidden rounded-xl border border-slate-400 md:grid-cols-[1.5fr_1fr_1fr_2fr_0.8fr] print:rounded-none print-border">
                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Paciente
                            </p>
                            <p className="mt-0.5 text-sm font-black text-slate-950">
                                {paciente.nombre}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Cédula
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente.cedula || "No registrada"}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Teléfono
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente.telefono || "No registrado"}
                            </p>
                        </div>

                        <div className="border-b border-r border-slate-300 p-2 print-border md:border-b-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Dirección
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente.direccion || "No registrada"}
                            </p>
                        </div>

                        <div className="p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Estado
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente.estado}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-b border-slate-300 py-3 md:grid-cols-4 print-border">
                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Créditos
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(totalCredito, configuracion.simboloMoneda)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Abonado
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(totalAbonado, configuracion.simboloMoneda)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Pendiente
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(totalSaldo, configuracion.simboloMoneda)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Vencido
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(totalVencido, configuracion.simboloMoneda)}
                        </p>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                            Cuentas por cobrar
                        </h2>

                        <p className="text-[10px] font-bold text-slate-500">
                            {cuentasPaciente.length} cuenta(s)
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
                                        Cuenta / concepto
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-2 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Estado
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Crédito
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Abonado
                                    </th>
                                    <th className="border-b border-slate-400 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Saldo
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {cuentasPaciente.map((cuenta) => (
                                    <tr key={cuenta.id}>
                                        <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                            <p className="font-bold">
                                                {fechaLegible(cuenta.fecha)}
                                            </p>
                                            <p className="text-[9px] text-slate-500">
                                                Vence: {fechaLegible(cuenta.fechaVencimiento)}
                                            </p>
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                            <p className="font-black text-slate-950">
                                                {cuenta.id}
                                            </p>
                                            <p className="print-small mt-0.5 text-[9px] leading-3 text-slate-600">
                                                {cuenta.concepto}
                                            </p>
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-2 py-2 text-center font-bold print-border">
                                            {cuenta.estadoVisual}
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-2 py-2 text-right font-bold print-border">
                                            {formatoMoneda(
                                                cuenta.total,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-2 py-2 text-right font-bold print-border">
                                            {formatoMoneda(
                                                cuenta.abonado,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>

                                        <td className="border-b border-slate-300 px-2 py-2 text-right font-black print-border">
                                            {formatoMoneda(
                                                cuenta.saldo,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {cuentasPaciente.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-3 py-5 text-center text-sm text-slate-400"
                                        >
                                            Este paciente no tiene cuentas por cobrar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {abonosOrdenados.length > 0 && (
                    <section className="py-3 print:py-2">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                                Historial de abonos
                            </h2>

                            <p className="text-[10px] font-bold text-slate-500">
                                {abonosOrdenados.length} abono(s)
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
                                            Cuenta
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Método
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Usuario
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Monto
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {abonosOrdenados.map((abono) => (
                                        <tr key={abono.id}>
                                            <td className="border-b border-r border-slate-300 px-2 py-2 font-bold print-border">
                                                {fechaLegible(abono.fecha)} · {abono.hora}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 print-border">
                                                {abono.cuentaId}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 print-border">
                                                {abono.metodo}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 print-border">
                                                {abono.usuarioNombre || "Usuario no identificado"}
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

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_255px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Observación
                        </h3>

                        <p className="print-small mt-1 text-[11px] leading-4 text-slate-700">
                            Este estado de cuenta muestra la información registrada al momento
                            de emitir el documento. Validar contra recibos, ventas y
                            comprobantes cuando sea necesario.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Créditos</span>
                            <strong>
                                {formatoMoneda(totalCredito, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Abonado</span>
                            <strong>
                                {formatoMoneda(totalAbonado, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between bg-slate-100 px-3 py-2 print-light-bg">
                            <span className="text-sm font-black text-slate-700">
                                SALDO
                            </span>
                            <strong className="text-lg text-slate-950">
                                {formatoMoneda(totalSaldo, configuracion.simboloMoneda)}
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
                        Estado de cuenta emitido desde el sistema clínico.
                    </p>
                </footer>
            </section>
        </main>
    );
}