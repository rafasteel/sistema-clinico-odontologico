"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    BadgeDollarSign,
    Banknote,
    CheckCircle2,
    CreditCard,
    FileText,
    Filter,
    RefreshCcw,
    Search,
    ShieldAlert,
    Trash2,
    WalletCards,
    XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
    type POSClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    anularCuentaCobrarSupabase,
    listarAbonosCuentaSupabase,
    listarCuentasCobrarSupabase,
    registrarAbonoCuentaSupabase,
    type AbonoCuentaSupabase,
    type CuentaCobrarSupabase,
    type EstadoCuentaCobrarSupabase,
} from "@/lib/supabase/finanzas";
import {
    listarPacientesSupabase,
    type PacienteSupabase,
} from "@/lib/supabase/pacientes";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
};

type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia" | "Mixto";

type AbonoCuenta = {
    id: string;
    fecha: string;
    hora: string;
    monto: number;
    metodo: MetodoPago;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    posId: string;
    posNombre: string;
    posBanco: string;
    posComision: number;
    comisionTarjeta: number;
    netoTarjeta: number;
    observaciones: string;
    usuarioNombre: string;
    estado: string;
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
    estado: EstadoCuentaCobrarSupabase;
    abonos: AbonoCuenta[];
};

type FormularioAbono = {
    cuentaId: string;
    efectivo: string;
    tarjeta: string;
    transferencia: string;
    posId: string;
    observaciones: string;
};

const formularioAbonoVacio: FormularioAbono = {
    cuentaId: "",
    efectivo: "",
    tarjeta: "",
    transferencia: "",
    posId: "",
    observaciones: "",
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

function normalizarTexto(texto: unknown) {
    return String(texto || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function obtenerEstadoVisual(cuenta: CuentaPorCobrar): EstadoCuentaCobrarSupabase {
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

function colorEstadoCuenta(estado: EstadoCuentaCobrarSupabase) {
    if (estado === "Pagada") return "bg-emerald-50 text-emerald-700";
    if (estado === "Parcial") return "bg-blue-50 text-blue-700";
    if (estado === "Vencida") return "bg-red-50 text-red-700";
    if (estado === "Anulada") return "bg-slate-100 text-slate-500";

    return "bg-amber-50 text-amber-700";
}

function colorMetodo(metodo: MetodoPago) {
    if (metodo === "Efectivo") return "bg-emerald-50 text-emerald-700";
    if (metodo === "Tarjeta") return "bg-blue-50 text-blue-700";
    if (metodo === "Transferencia") return "bg-purple-50 text-purple-700";

    return "bg-slate-900 text-white";
}

function metodoDesdeAbono(abono: AbonoCuentaSupabase): MetodoPago {
    if (abono.metodo === "Efectivo") return "Efectivo";
    if (abono.metodo === "Tarjeta") return "Tarjeta";
    if (abono.metodo === "Transferencia") return "Transferencia";

    return "Mixto";
}

function convertirAbono(abono: AbonoCuentaSupabase): AbonoCuenta {
    return {
        id: abono.id,
        fecha: abono.fecha,
        hora: horaCorta(abono.hora),
        monto: Number(abono.monto || 0),
        metodo: metodoDesdeAbono(abono),
        efectivo: Number(abono.efectivo || 0),
        tarjeta: Number(abono.tarjeta || 0),
        transferencia: Number(abono.transferencia || 0),
        posId: abono.pos_id || "",
        posNombre: abono.pos_nombre || "",
        posBanco: abono.pos_banco || "",
        posComision: Number(abono.comision_pos_porcentaje || 0),
        comisionTarjeta: Number(abono.comision_pos_monto || 0),
        netoTarjeta: Number(abono.neto_tarjeta || 0),
        observaciones: abono.observaciones || "",
        usuarioNombre: abono.usuario_nombre || "",
        estado: abono.estado || "Activo",
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

export default function CuentasCobrarPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [pacientes, setPacientes] = useState<PacienteSupabase[]>([]);

    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState<
        "Todos" | EstadoCuentaCobrarSupabase
    >("Todos");
    const [mesFiltro, setMesFiltro] = useState("");
    const [formularioAbono, setFormularioAbono] =
        useState<FormularioAbono>(formularioAbonoVacio);
    const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    const posesActivos: POSClinica[] = (configuracion.poses || []).filter(
        (pos) => pos.activo
    );
    const posPredeterminadoId = posesActivos[0]?.id || "";

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            let configuracionActual: ConfiguracionClinica;

            try {
                configuracionActual = await obtenerConfiguracionClinicaSupabase();
            } catch {
                configuracionActual = obtenerConfiguracionClinica();
            }

            const posInicial =
                (configuracionActual.poses || []).find((pos) => pos.activo) ||
                (configuracionActual.poses || [])[0];

            setConfiguracion(configuracionActual);
            setFormularioAbono((datosActuales) => ({
                ...datosActuales,
                posId: datosActuales.posId || posInicial?.id || "",
            }));

            const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
            setUsuario(usuarioGuardado ? (JSON.parse(usuarioGuardado) as UsuarioSistema) : null);

            const [cuentasSupabase, pacientesSupabase] = await Promise.all([
                listarCuentasCobrarSupabase(),
                listarPacientesSupabase(),
            ]);

            const cuentasConAbonos = await Promise.all(
                cuentasSupabase.map(async (cuenta) => {
                    try {
                        const abonosSupabase = await listarAbonosCuentaSupabase(
                            cuenta.id
                        );

                        return convertirCuenta(
                            cuenta,
                            abonosSupabase.map(convertirAbono)
                        );
                    } catch {
                        return convertirCuenta(cuenta, []);
                    }
                })
            );

            setCuentas(cuentasConAbonos);
            setPacientes(pacientesSupabase);
            setMesFiltro((mesActual) => mesActual || fechaHoyLocal().slice(0, 7));
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudieron cargar las cuentas por cobrar desde Supabase.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    function actualizarFormularioAbono<K extends keyof FormularioAbono>(
        campo: K,
        valor: FormularioAbono[K]
    ) {
        setFormularioAbono((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function obtenerPOSInicial() {
        return (
            (configuracion.poses || []).find((pos) => pos.activo) ||
            (configuracion.poses || [])[0]
        );
    }

    function cerrarModalAbono() {
        const posInicial = obtenerPOSInicial();

        setModalAbonoAbierto(false);
        setFormularioAbono({
            ...formularioAbonoVacio,
            posId: posInicial?.id || "",
        });
    }

    function seleccionarCuentaParaAbono(cuenta: CuentaPorCobrar) {
        const posInicial = obtenerPOSInicial();

        setFormularioAbono({
            cuentaId: cuenta.id,
            efectivo: String(cuenta.saldo || ""),
            tarjeta: "",
            transferencia: "",
            posId: posInicial?.id || "",
            observaciones: "",
        });
        setModalAbonoAbierto(true);
    }

    async function registrarAbono(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!formularioAbono.cuentaId) {
            alert("Seleccioná una cuenta para registrar el abono.");
            return;
        }

        const cuenta = cuentas.find((item) => item.id === formularioAbono.cuentaId);

        if (!cuenta) {
            alert("No se encontró la cuenta seleccionada.");
            return;
        }

        if (cuenta.estado === "Anulada") {
            alert("No podés abonar una cuenta anulada.");
            return;
        }

        if (cuenta.estado === "Pagada" || cuenta.saldo <= 0) {
            alert("Esta cuenta ya está pagada.");
            return;
        }

        const efectivo = numero(formularioAbono.efectivo);
        const tarjeta = numero(formularioAbono.tarjeta);
        const transferencia = numero(formularioAbono.transferencia);
        const monto = efectivo + tarjeta + transferencia;

        if (monto <= 0) {
            alert("El monto del abono debe ser mayor que cero.");
            return;
        }

        if (monto > cuenta.saldo) {
            alert("El abono no puede ser mayor que el saldo pendiente.");
            return;
        }

        const posSeleccionado =
            posesActivos.find((pos) => pos.id === formularioAbono.posId) ||
            (tarjeta > 0 ? posesActivos[0] : null);

        if (tarjeta > 0 && !posSeleccionado) {
            alert("Seleccioná el POS utilizado para el pago con tarjeta.");
            return;
        }

        setGuardando(true);

        try {
            await registrarAbonoCuentaSupabase({
                cuenta_id: cuenta.id,
                paciente_id: cuenta.pacienteId || null,
                efectivo,
                tarjeta,
                transferencia,
                pos_id: tarjeta > 0 ? posSeleccionado?.id || null : null,
                pos_nombre: tarjeta > 0 ? posSeleccionado?.nombre || "" : "",
                pos_banco: tarjeta > 0 ? posSeleccionado?.banco || "" : "",
                comision_pos_porcentaje:
                    tarjeta > 0 ? posSeleccionado?.comision || 0 : 0,
                observaciones: formularioAbono.observaciones.trim(),
                usuario_nombre: usuario?.nombre || "Usuario no identificado",
            });

            cerrarModalAbono();
            await cargarDatos();

            alert("Abono registrado correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo registrar el abono.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function anularCuenta(cuentaId: string) {
        const confirmar = window.confirm(
            "¿Seguro que deseas anular esta cuenta por cobrar?"
        );

        if (!confirmar) return;

        setGuardando(true);

        try {
            await anularCuentaCobrarSupabase(cuentaId);
            await cargarDatos();

            alert("Cuenta anulada correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo anular la cuenta.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function recalcularEstados() {
        await cargarDatos();
        alert("Estados actualizados desde Supabase correctamente.");
    }

    const cuentasNormalizadas = useMemo(() => {
        return cuentas.map((cuenta) => ({
            ...cuenta,
            estadoVisual: obtenerEstadoVisual(cuenta),
            abonos: cuenta.abonos || [],
        }));
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

                return coincideBusqueda && coincideEstado && coincideMes;
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
    }, [cuentasNormalizadas, busqueda, estadoFiltro, mesFiltro]);

    const cuentasActivas = cuentasNormalizadas.filter(
        (cuenta) =>
            cuenta.estadoVisual !== "Pagada" && cuenta.estadoVisual !== "Anulada"
    );

    const cuentasVencidas = cuentasNormalizadas.filter(
        (cuenta) => cuenta.estadoVisual === "Vencida"
    );

    const cuentasPagadas = cuentasNormalizadas.filter(
        (cuenta) => cuenta.estadoVisual === "Pagada"
    );

    const totalCredito = cuentasNormalizadas
        .filter((cuenta) => cuenta.estadoVisual !== "Anulada")
        .reduce((total, cuenta) => total + (cuenta.total || 0), 0);

    const totalPendiente = cuentasActivas.reduce(
        (total, cuenta) => total + (cuenta.saldo || 0),
        0
    );

    const totalVencido = cuentasVencidas.reduce(
        (total, cuenta) => total + (cuenta.saldo || 0),
        0
    );

    const totalAbonado = cuentasNormalizadas.reduce(
        (total, cuenta) => total + (cuenta.abonado || 0),
        0
    );

    const cuentaSeleccionada = cuentasNormalizadas.find(
        (cuenta) => cuenta.id === formularioAbono.cuentaId
    );

    const efectivoAbono = numero(formularioAbono.efectivo);
    const tarjetaAbono = numero(formularioAbono.tarjeta);
    const transferenciaAbono = numero(formularioAbono.transferencia);
    const montoAbono = efectivoAbono + tarjetaAbono + transferenciaAbono;
    const posAbonoSeleccionado =
        posesActivos.find((pos) => pos.id === formularioAbono.posId) ||
        (tarjetaAbono > 0 ? posesActivos[0] : null);
    const comisionAbonoTarjeta =
        tarjetaAbono > 0 && posAbonoSeleccionado
            ? tarjetaAbono * (posAbonoSeleccionado.comision / 100)
            : 0;
    const netoAbonoTarjeta =
        tarjetaAbono > 0 ? tarjetaAbono - comisionAbonoTarjeta : 0;
    const diferenciaAbono = cuentaSeleccionada
        ? (cuentaSeleccionada.saldo || 0) - montoAbono
        : 0;

    return (
        <AppShell
            titulo="Cuentas por Cobrar"
            descripcion="Control de créditos, abonos, vencimientos y saldos pendientes"
            moduloActivo="Cuentas por Cobrar"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo cargar cuentas por cobrar
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">
                        Gestión de créditos
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Controla saldos pendientes generados desde caja.
                    </p>
                    <p className="mt-2 text-xs font-bold text-teal-700">
                        Cuentas por cobrar conectadas a Supabase.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={recalcularEstados}
                        disabled={cargando || guardando}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                        Recargar
                    </button>

                    <Link
                        href="/caja"
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                    >
                        <BadgeDollarSign className="h-4 w-4" />
                        Ir a caja
                    </Link>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
                    <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <WalletCards className="h-6 w-6 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">
                            Cuentas por cobrar
                        </h2>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                            Revisa créditos activos, vencidos, abonos registrados y pagos
                            pendientes. Este módulo consolida créditos creados desde ventas
                            a crédito en caja.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Clínica: {configuracion.nombreClinica}
                            </span>

                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Pacientes registrados: {pacientes.length}
                            </span>

                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Cuentas activas: {cuentasActivas.length}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Saldo pendiente general
                        </p>

                        <h3 className="mt-3 text-3xl font-black">
                            {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
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
                                Hay cuentas vencidas
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                Existen {cuentasVencidas.length} cuenta(s) vencida(s) por un
                                total de {formatoMoneda(totalVencido, configuracion.simboloMoneda)}.
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
                        {formatoMoneda(totalCredito, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total créditos generados
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <WalletCards className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
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
                        <CheckCircle2 className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(totalAbonado, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total abonado
                    </p>
                </div>
            </section>

            <section className="mt-4">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-5 w-5 text-blue-700" />
                                        <h3 className="text-[18px] font-black text-slate-800">
                                            Lista de cuentas por cobrar
                                        </h3>
                                    </div>
                                    <p className="mono mt-1 text-[10px] text-slate-400">
                                        {cuentasFiltradas.length} cuenta(s) encontrada(s) · buscá el paciente y usá el botón “Registrar abono” de su cuenta
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white xl:min-w-[260px]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                                        Pendiente activo
                                    </p>
                                    <p className="mt-1 text-lg font-black">
                                        {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_170px_170px_auto]">
                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Buscar paciente o cuenta
                                    </label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                        <input
                                            value={busqueda}
                                            onChange={(event) => setBusqueda(event.target.value)}
                                            placeholder="Escribí el nombre del paciente, concepto o venta..."
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
                                            setEstadoFiltro(
                                                event.target.value as
                                                | "Todos"
                                                | EstadoCuentaCobrarSupabase
                                            )
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

                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBusqueda("");
                                            setEstadoFiltro("Todos");
                                            setMesFiltro("");
                                        }}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-[12px] font-bold text-slate-700 hover:bg-slate-200 lg:w-auto"
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Limpiar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[1200px] overflow-y-auto p-4">
                            <div className="space-y-4">
                                {cargando && (
                                    <div className="rounded-3xl border border-teal-100 bg-teal-50 p-8 text-center">
                                        <p className="text-xs font-bold text-teal-700">
                                            Cargando cuentas desde Supabase...
                                        </p>
                                    </div>
                                )}

                                {!cargando &&
                                    cuentasFiltradas.map((cuenta) => {
                                        const estadoVisual = obtenerEstadoVisual(cuenta);
                                        const abonos = cuenta.abonos || [];
                                        const abonado = cuenta.abonado || 0;

                                        return (
                                            <div
                                                key={cuenta.id}
                                                className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
                                            >
                                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={`rounded-full px-3 py-1 text-[10px] font-black ${colorEstadoCuenta(
                                                                    estadoVisual
                                                                )}`}
                                                            >
                                                                {estadoVisual}
                                                            </span>

                                                            <span className="mono rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                                {fechaLegible(cuenta.fecha)}
                                                            </span>

                                                            {estadoVisual === "Vencida" && (
                                                                <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-red-700">
                                                                    Vence:{" "}
                                                                    {fechaLegible(
                                                                        cuenta.fechaVencimiento
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h4 className="mt-3 text-lg font-black text-slate-900">
                                                            {cuenta.pacienteNombre}
                                                        </h4>

                                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                                            {cuenta.concepto}
                                                        </p>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {cuenta.pacienteId && (
                                                                <Link
                                                                    href={`/pacientes/${cuenta.pacienteId}`}
                                                                    className="flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-700 hover:bg-teal-100"
                                                                >
                                                                    Ver paciente
                                                                    <ArrowRight className="h-3 w-3" />
                                                                </Link>
                                                            )}

                                                            {cuenta.pacienteId && (
                                                                <Link
                                                                    href={`/estado-cuenta/${cuenta.pacienteId}`}
                                                                    className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 hover:bg-amber-100"
                                                                >
                                                                    Estado de cuenta
                                                                    <ArrowRight className="h-3 w-3" />
                                                                </Link>
                                                            )}

                                                            {cuenta.ventaId && (
                                                                <Link
                                                                    href={`/recibos/${cuenta.ventaId}`}
                                                                    className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700 hover:bg-blue-100"
                                                                >
                                                                    Recibo / venta
                                                                    <ArrowRight className="h-3 w-3" />
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="text-left md:text-right">
                                                        <p className="text-[11px] font-bold text-slate-400">
                                                            Saldo pendiente
                                                        </p>
                                                        <p className="text-2xl font-black text-slate-900">
                                                            {formatoMoneda(
                                                                cuenta.saldo,
                                                                configuracion.simboloMoneda
                                                            )}
                                                        </p>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                seleccionarCuentaParaAbono(cuenta)
                                                            }
                                                            disabled={
                                                                guardando ||
                                                                estadoVisual === "Pagada" ||
                                                                estadoVisual === "Anulada"
                                                            }
                                                            className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200"
                                                        >
                                                            Abonar
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-5 grid gap-3 md:grid-cols-4">
                                                    <div className="rounded-2xl bg-slate-50 p-4">
                                                        <p className="text-[10px] font-bold text-slate-400">
                                                            Total crédito
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
                                                                abonado,
                                                                configuracion.simboloMoneda
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-amber-50 p-4">
                                                        <p className="text-[10px] font-bold text-amber-700">
                                                            Saldo
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
                                                            Vencimiento
                                                        </p>
                                                        <p className="mt-1 text-sm font-black text-blue-700">
                                                            {fechaLegible(cuenta.fechaVencimiento)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {abonos.length > 0 && (
                                                    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                        <h5 className="text-sm font-black text-slate-800">
                                                            Historial de abonos
                                                        </h5>

                                                        <div className="mt-3 space-y-2">
                                                            {abonos.map((abono) => (
                                                                <div
                                                                    key={abono.id}
                                                                    className="flex flex-col gap-3 rounded-2xl bg-white p-3 text-sm shadow-sm md:flex-row md:items-center md:justify-between"
                                                                >
                                                                    <div>
                                                                        <p className="font-black text-slate-800">
                                                                            {formatoMoneda(
                                                                                abono.monto,
                                                                                configuracion.simboloMoneda
                                                                            )}
                                                                        </p>
                                                                        <p className="text-xs text-slate-500">
                                                                            {fechaLegible(abono.fecha)} ·{" "}
                                                                            {abono.hora} ·{" "}
                                                                            {abono.usuarioNombre ||
                                                                                "Usuario no identificado"}
                                                                        </p>

                                                                        <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                                                            Efectivo:{" "}
                                                                            {formatoMoneda(
                                                                                abono.efectivo,
                                                                                configuracion.simboloMoneda
                                                                            )}{" "}
                                                                            · Tarjeta:{" "}
                                                                            {formatoMoneda(
                                                                                abono.tarjeta,
                                                                                configuracion.simboloMoneda
                                                                            )}{" "}
                                                                            · Transferencia:{" "}
                                                                            {formatoMoneda(
                                                                                abono.transferencia,
                                                                                configuracion.simboloMoneda
                                                                            )}
                                                                        </p>

                                                                        {abono.tarjeta > 0 && (
                                                                            <p className="mt-1 text-[11px] font-semibold text-blue-700">
                                                                                POS:{" "}
                                                                                {abono.posNombre ||
                                                                                    "No registrado"}{" "}
                                                                                ·{" "}
                                                                                {abono.posBanco ||
                                                                                    "Banco no registrado"}{" "}
                                                                                · Comisión{" "}
                                                                                {formatoMoneda(
                                                                                    abono.comisionTarjeta,
                                                                                    configuracion.simboloMoneda
                                                                                )}
                                                                            </p>
                                                                        )}

                                                                        {abono.observaciones && (
                                                                            <p className="mt-1 text-xs text-slate-400">
                                                                                {abono.observaciones}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span
                                                                            className={`w-fit rounded-full px-3 py-1 text-[10px] font-black ${colorMetodo(
                                                                                abono.metodo
                                                                            )}`}
                                                                        >
                                                                            {abono.metodo}
                                                                        </span>

                                                                        <Link
                                                                            href={`/abonos/${abono.id}`}
                                                                            className="flex w-fit items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700 hover:bg-blue-100"
                                                                        >
                                                                            <FileText className="h-3 w-3" />
                                                                            Recibo
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-5 flex flex-wrap gap-2">
                                                    {estadoVisual !== "Pagada" &&
                                                        estadoVisual !== "Anulada" && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    seleccionarCuentaParaAbono(cuenta)
                                                                }
                                                                disabled={guardando}
                                                                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.25)] hover:opacity-90 disabled:opacity-60"
                                                            >
                                                                <Banknote className="h-4 w-4" />
                                                                Registrar abono
                                                            </button>
                                                        )}

                                                    {estadoVisual !== "Anulada" &&
                                                        estadoVisual !== "Pagada" && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    anularCuenta(cuenta.id)
                                                                }
                                                                disabled={guardando}
                                                                className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Anular
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                {!cargando && cuentasFiltradas.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin cuentas encontradas
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            No hay cuentas por cobrar con los filtros seleccionados.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {cuentasPagadas.length > 0 && (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                                <div>
                                    <h3 className="text-sm font-black text-emerald-800">
                                        Cuentas pagadas
                                    </h3>
                                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                                        Hay {cuentasPagadas.length} cuenta(s) pagada(s) registradas
                                        en el sistema.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {modalAbonoAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    Registrar abono
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Seleccioná la cuenta y distribuí el pago en efectivo, tarjeta y transferencia.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarModalAbono}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[calc(92vh-90px)] overflow-y-auto">
                            <form onSubmit={registrarAbono} className="space-y-4 p-6">
                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Cuenta seleccionada
                                    </label>

                                    <select
                                        value={formularioAbono.cuentaId}
                                        onChange={(event) =>
                                            actualizarFormularioAbono("cuentaId", event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option value="">Seleccionar cuenta</option>
                                        {cuentasActivas.map((cuenta) => (
                                            <option key={cuenta.id} value={cuenta.id}>
                                                {cuenta.pacienteNombre} ·{" "}
                                                {formatoMoneda(
                                                    cuenta.saldo,
                                                    configuracion.simboloMoneda
                                                )}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {cuentaSeleccionada && (
                                    <div className="rounded-2xl bg-teal-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-teal-700">
                                            Cuenta activa
                                        </p>
                                        <h4 className="mt-2 text-sm font-black text-teal-800">
                                            {cuentaSeleccionada.pacienteNombre}
                                        </h4>
                                        <p className="mt-1 text-xs leading-5 text-teal-700">
                                            {cuentaSeleccionada.concepto}
                                        </p>
                                        <p className="mt-2 text-lg font-black text-teal-800">
                                            Saldo:{" "}
                                            {formatoMoneda(
                                                cuentaSeleccionada.saldo,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>
                                )}

                                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="mb-3 text-[12px] font-black text-slate-700">
                                        Distribución del pago
                                    </p>

                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div>
                                            <label className="mb-2 block text-[11px] font-black text-emerald-700">
                                                Efectivo
                                            </label>
                                            <input
                                                value={formularioAbono.efectivo}
                                                onChange={(event) =>
                                                    actualizarFormularioAbono(
                                                        "efectivo",
                                                        event.target.value
                                                    )
                                                }
                                                type="number"
                                                placeholder="0"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-[11px] font-black text-blue-700">
                                                Tarjeta
                                            </label>
                                            <input
                                                value={formularioAbono.tarjeta}
                                                onChange={(event) =>
                                                    actualizarFormularioAbono(
                                                        "tarjeta",
                                                        event.target.value
                                                    )
                                                }
                                                type="number"
                                                placeholder="0"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-[11px] font-black text-purple-700">
                                                Transferencia
                                            </label>
                                            <input
                                                value={formularioAbono.transferencia}
                                                onChange={(event) =>
                                                    actualizarFormularioAbono(
                                                        "transferencia",
                                                        event.target.value
                                                    )
                                                }
                                                type="number"
                                                placeholder="0"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>
                                    </div>

                                    {tarjetaAbono > 0 && (
                                        <div className="mt-4">
                                            <label className="mb-2 block text-[12px] font-black text-slate-700">
                                                POS / tarjeta utilizada
                                            </label>

                                            <select
                                                value={formularioAbono.posId || posPredeterminadoId}
                                                onChange={(event) =>
                                                    actualizarFormularioAbono("posId", event.target.value)
                                                }
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            >
                                                <option value="">Seleccionar POS</option>
                                                {posesActivos.map((pos) => (
                                                    <option key={pos.id} value={pos.id}>
                                                        {pos.nombre} · {pos.banco} · {pos.comision}%
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        <div className="rounded-2xl bg-white p-3">
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Total abono
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-900">
                                                {formatoMoneda(montoAbono, configuracion.simboloMoneda)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-white p-3">
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Comisión POS
                                            </p>
                                            <p className="mt-1 text-sm font-black text-rose-600">
                                                {formatoMoneda(
                                                    comisionAbonoTarjeta,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>

                                        <div
                                            className={`rounded-2xl p-3 ${cuentaSeleccionada && diferenciaAbono < -0.01
                                                ? "bg-rose-50"
                                                : "bg-emerald-50"
                                                }`}
                                        >
                                            <p
                                                className={`text-[10px] font-bold ${cuentaSeleccionada && diferenciaAbono < -0.01
                                                    ? "text-rose-700"
                                                    : "text-emerald-700"
                                                    }`}
                                            >
                                                Saldo después
                                            </p>
                                            <p
                                                className={`mt-1 text-sm font-black ${cuentaSeleccionada && diferenciaAbono < -0.01
                                                    ? "text-rose-700"
                                                    : "text-emerald-700"
                                                    }`}
                                            >
                                                {formatoMoneda(
                                                    cuentaSeleccionada
                                                        ? Math.max(diferenciaAbono, 0)
                                                        : 0,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {tarjetaAbono > 0 && posAbonoSeleccionado && (
                                        <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-[11px] font-bold leading-5 text-blue-800">
                                            POS aplicado: {posAbonoSeleccionado.nombre} ·{" "}
                                            {posAbonoSeleccionado.banco} ·{" "}
                                            {posAbonoSeleccionado.comision}%.
                                            <br />
                                            Neto tarjeta:{" "}
                                            {formatoMoneda(
                                                netoAbonoTarjeta,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Observaciones
                                    </label>

                                    <textarea
                                        value={formularioAbono.observaciones}
                                        onChange={(event) =>
                                            actualizarFormularioAbono(
                                                "observaciones",
                                                event.target.value
                                            )
                                        }
                                        rows={3}
                                        placeholder="Referencia de pago, número de transferencia o nota interna..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <button
                                    disabled={guardando}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <BadgeDollarSign className="h-4 w-4" />
                                    {guardando ? "Guardando..." : "Registrar abono mixto"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}