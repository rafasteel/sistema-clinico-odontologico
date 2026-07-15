"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    BadgeDollarSign,
    Banknote,
    CalendarDays,
    CheckCircle2,
    CreditCard,
    FileText,
    Filter,
    RefreshCcw,
    Search,
    Trash2,
    WalletCards,
    XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
    POSClinica,
} from "@/lib/configuracionClinica";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
};

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

type EstadoCuenta = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

type AbonoCuenta = {
    id: string;
    fecha: string;
    hora: string;
    monto: number;
    metodo: MetodoPago;
    efectivo?: number;
    tarjeta?: number;
    transferencia?: number;
    posId?: string;
    posNombre?: string;
    posBanco?: string;
    posComision?: number;
    comisionTarjeta?: number;
    netoTarjeta?: number;
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
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuenta;
    abonos?: AbonoCuenta[];
};

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
    posId?: string;
    posNombre?: string;
    posBanco?: string;
    posComision?: number;
    comisionTarjeta?: number;
    netoTarjeta?: number;
};

type FormularioAbono = {
    cuentaId: string;
    efectivo: string;
    tarjeta: string;
    transferencia: string;
    posId: string;
    observaciones: string;
};

const CUENTAS_KEY = "cuentas_cobrar_sistema_clinico";
const VENTAS_KEY = "ventas_sistema_clinico";
const PACIENTES_KEY = "pacientes_sistema_clinico";
const USUARIO_KEY = "usuario_sistema_clinico";

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

function horaActualLocal() {
    const fecha = new Date();
    const hours = String(fecha.getHours()).padStart(2, "0");
    const minutes = String(fecha.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
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

function guardarLocalStorage<T>(clave: string, valor: T) {
    localStorage.setItem(clave, JSON.stringify(valor));
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

function normalizarTexto(texto: string) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
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

function colorMetodo(metodo: MetodoPago) {
    if (metodo === "Efectivo") return "bg-emerald-50 text-emerald-700";
    if (metodo === "Tarjeta") return "bg-blue-50 text-blue-700";
    if (metodo === "Transferencia") return "bg-purple-50 text-purple-700";

    return "bg-slate-900 text-white";
}

export default function CuentasCobrarPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [pacientes, setPacientes] = useState<Paciente[]>([]);

    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState<"Todos" | EstadoCuenta>(
        "Todos"
    );
    const [mesFiltro, setMesFiltro] = useState("");
    const [formularioAbono, setFormularioAbono] =
        useState<FormularioAbono>(formularioAbonoVacio);
    const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);

    useEffect(() => {
        const configuracionActual = obtenerConfiguracionClinica();
        const posInicial =
            (configuracionActual.poses || []).find((pos) => pos.activo) ||
            (configuracionActual.poses || [])[0];

        setConfiguracion(configuracionActual);
        setFormularioAbono((datosActuales) => ({
            ...datosActuales,
            posId: datosActuales.posId || posInicial?.id || "",
        }));
        setUsuario(leerLocalStorage<UsuarioSistema | null>(USUARIO_KEY, null));
        setCuentas(leerLocalStorage<CuentaPorCobrar[]>(CUENTAS_KEY, []));
        setVentas(leerLocalStorage<Venta[]>(VENTAS_KEY, []));
        setPacientes(leerLocalStorage<Paciente[]>(PACIENTES_KEY, []));
        setMesFiltro(fechaHoyLocal().slice(0, 7));
    }, []);

    function guardarCuentas(nuevaLista: CuentaPorCobrar[]) {
        setCuentas(nuevaLista);
        guardarLocalStorage(CUENTAS_KEY, nuevaLista);
    }

    function guardarVentas(nuevaLista: Venta[]) {
        setVentas(nuevaLista);
        guardarLocalStorage(VENTAS_KEY, nuevaLista);
    }

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
        const posInicial =
            (configuracion.poses || []).find((pos) => pos.activo) ||
            (configuracion.poses || [])[0];

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

    function registrarAbono(event: FormEvent<HTMLFormElement>) {
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

        const posesActivos = (configuracion.poses || []).filter((pos) => pos.activo);
        const posSeleccionado =
            posesActivos.find((pos) => pos.id === formularioAbono.posId) ||
            (tarjeta > 0 ? posesActivos[0] : null);

        if (tarjeta > 0 && !posSeleccionado) {
            alert("Seleccioná el POS utilizado para el pago con tarjeta.");
            return;
        }

        const metodosUsados = [
            efectivo > 0 ? "Efectivo" : "",
            tarjeta > 0 ? "Tarjeta" : "",
            transferencia > 0 ? "Transferencia" : "",
        ].filter(Boolean);

        const metodoAbono =
            metodosUsados.length > 1
                ? "Mixto"
                : ((metodosUsados[0] || "Efectivo") as MetodoPago);

        const fecha = fechaHoyLocal();
        const hora = horaActualLocal();
        const saldoNuevo = Math.max(cuenta.saldo - monto, 0);
        const comisionTarjeta =
            tarjeta > 0 && posSeleccionado
                ? tarjeta * ((posSeleccionado.comision || 0) / 100)
                : 0;
        const netoTarjeta = tarjeta > 0 ? tarjeta - comisionTarjeta : 0;
        const abonoId = `ABONO-CXC-${Date.now()}`;

        const nuevoAbono: AbonoCuenta = {
            id: abonoId,
            fecha,
            hora,
            monto,
            metodo: metodoAbono,
            efectivo,
            tarjeta,
            transferencia,
            posId: tarjeta > 0 ? posSeleccionado?.id || "" : "",
            posNombre: tarjeta > 0 ? posSeleccionado?.nombre || "" : "",
            posBanco: tarjeta > 0 ? posSeleccionado?.banco || "" : "",
            posComision: tarjeta > 0 ? posSeleccionado?.comision || 0 : 0,
            comisionTarjeta,
            netoTarjeta,
            observaciones: formularioAbono.observaciones.trim(),
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        const nuevaListaCuentas = cuentas.map((item) => {
            if (item.id !== cuenta.id) return item;

            return {
                ...item,
                saldo: saldoNuevo,
                estado: saldoNuevo <= 0 ? "Pagada" : "Parcial",
                abonos: [nuevoAbono, ...(item.abonos || [])],
            };
        });

        const ventaAbono: Venta = {
            id: `ABONO-${Date.now()}`,
            fecha,
            hora,
            tipoCobro: "Abono a crédito",
            citaId: "",
            pacienteId: cuenta.pacienteId,
            clienteNombre: cuenta.pacienteNombre,
            concepto: `Abono a ${cuenta.concepto}`,
            total: monto,
            efectivo,
            tarjeta,
            transferencia,
            credito: 0,
            estado: "Pagada",
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
            observaciones:
                formularioAbono.observaciones.trim() ||
                `Abono aplicado a cuenta ${cuenta.id}`,
            productoId: "",
            productoNombre: "",
            cantidadProducto: 0,
            posId: tarjeta > 0 ? posSeleccionado?.id || "" : "",
            posNombre: tarjeta > 0 ? posSeleccionado?.nombre || "" : "",
            posBanco: tarjeta > 0 ? posSeleccionado?.banco || "" : "",
            posComision: tarjeta > 0 ? posSeleccionado?.comision || 0 : 0,
            comisionTarjeta,
            netoTarjeta,
        };

        const ventasActualizadas = ventas.map((venta) => {
            if (venta.id !== cuenta.ventaId) return venta;

            return {
                ...venta,
                credito: saldoNuevo,
                estado: saldoNuevo <= 0 ? ("Pagada" as EstadoVenta) : ("Parcial" as EstadoVenta),
            };
        });

        guardarCuentas(nuevaListaCuentas);
        guardarVentas([ventaAbono, ...ventasActualizadas]);
        setFormularioAbono({
            ...formularioAbonoVacio,
            posId:
                (configuracion.poses || []).find((pos) => pos.activo)?.id ||
                (configuracion.poses || [])[0]?.id ||
                "",
        });
        setModalAbonoAbierto(false);

        alert("Abono registrado correctamente.");
    }

    function anularCuenta(cuentaId: string) {
        const confirmar = window.confirm(
            "¿Seguro que deseas anular esta cuenta por cobrar?"
        );

        if (!confirmar) return;

        const nuevaLista = cuentas.map((cuenta) =>
            cuenta.id === cuentaId
                ? {
                    ...cuenta,
                    estado: "Anulada" as EstadoCuenta,
                }
                : cuenta
        );

        guardarCuentas(nuevaLista);
    }

    function recalcularEstados() {
        const nuevaLista = cuentas.map((cuenta) => ({
            ...cuenta,
            estado: obtenerEstadoVisual(cuenta),
        }));

        guardarCuentas(nuevaLista);
        alert("Estados recalculados correctamente.");
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
        (cuenta) => cuenta.estadoVisual !== "Pagada" && cuenta.estadoVisual !== "Anulada"
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

    const totalAbonado = cuentasNormalizadas.reduce((total, cuenta) => {
        return (
            total +
            (cuenta.abonos || []).reduce(
                (suma, abono) => suma + (abono.monto || 0),
                0
            )
        );
    }, 0);

    const cuentaSeleccionada = cuentasNormalizadas.find(
        (cuenta) => cuenta.id === formularioAbono.cuentaId
    );
    const posesActivos: POSClinica[] = (configuracion.poses || []).filter(
        (pos) => pos.activo
    );
    const posPredeterminadoId = posesActivos[0]?.id || "";
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
            <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">
                        Gestión de créditos
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Controla saldos pendientes generados desde caja o presupuestos.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={recalcularEstados}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Recalcular estados
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
                            pendientes. Este módulo consolida créditos creados desde
                            presupuestos convertidos y ventas a crédito.
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
                                {cuentasFiltradas.map((cuenta) => {
                                    const estadoVisual = obtenerEstadoVisual(cuenta);
                                    const abonos = cuenta.abonos || [];
                                    const abonado = abonos.reduce(
                                        (total, abono) => total + (abono.monto || 0),
                                        0
                                    );

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
                                                                Vence: {fechaLegible(cuenta.fechaVencimiento)}
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
                                                        <Link
                                                            href={`/pacientes/${cuenta.pacienteId}`}
                                                            className="flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-700 hover:bg-teal-100"
                                                        >
                                                            Ver paciente
                                                            <ArrowRight className="h-3 w-3" />
                                                        </Link>
                                                        <Link
                                                            href={`/estado-cuenta/${cuenta.pacienteId}`}
                                                            className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 hover:bg-amber-100"
                                                        >
                                                            Estado de cuenta
                                                            <ArrowRight className="h-3 w-3" />
                                                        </Link>
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
                                                        onClick={() => seleccionarCuentaParaAbono(cuenta)}
                                                        disabled={
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
                                                        {abonos.map((abono) => {
                                                            const efectivo = abono.efectivo || 0;
                                                            const tarjeta = abono.tarjeta || 0;
                                                            const transferencia = abono.transferencia || 0;

                                                            return (
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
                                                                            {fechaLegible(abono.fecha)} · {abono.hora} ·{" "}
                                                                            {abono.usuarioNombre ||
                                                                                "Usuario no identificado"}
                                                                        </p>

                                                                        {(efectivo > 0 || tarjeta > 0 || transferencia > 0) && (
                                                                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                                                                Efectivo:{" "}
                                                                                {formatoMoneda(
                                                                                    efectivo,
                                                                                    configuracion.simboloMoneda
                                                                                )}{" "}
                                                                                · Tarjeta:{" "}
                                                                                {formatoMoneda(
                                                                                    tarjeta,
                                                                                    configuracion.simboloMoneda
                                                                                )}{" "}
                                                                                · Transferencia:{" "}
                                                                                {formatoMoneda(
                                                                                    transferencia,
                                                                                    configuracion.simboloMoneda
                                                                                )}
                                                                            </p>
                                                                        )}

                                                                        {tarjeta > 0 && (
                                                                            <p className="mt-1 text-[11px] font-semibold text-blue-700">
                                                                                POS:{" "}
                                                                                {abono.posNombre || "No registrado"} ·{" "}
                                                                                {abono.posBanco || "Banco no registrado"} · Comisión{" "}
                                                                                {formatoMoneda(
                                                                                    abono.comisionTarjeta || 0,
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
                                                            );
                                                        })}                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-5 flex flex-wrap gap-2">
                                                {estadoVisual !== "Pagada" &&
                                                    estadoVisual !== "Anulada" && (
                                                        <button
                                                            onClick={() => seleccionarCuentaParaAbono(cuenta)}
                                                            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.25)] hover:opacity-90"
                                                        >
                                                            <Banknote className="h-4 w-4" />
                                                            Registrar abono
                                                        </button>
                                                    )}

                                                {estadoVisual !== "Anulada" &&
                                                    estadoVisual !== "Pagada" && (
                                                        <button
                                                            onClick={() => anularCuenta(cuenta.id)}
                                                            className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] font-bold text-red-700 hover:bg-red-100"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Anular
                                                        </button>
                                                    )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {cuentasFiltradas.length === 0 && (
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
                                                {cuenta.pacienteNombre} · {formatoMoneda(cuenta.saldo, configuracion.simboloMoneda)}
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

                                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                    <BadgeDollarSign className="h-4 w-4" />
                                    Registrar abono mixto
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                
    )
}

        </AppShell >
    );
}