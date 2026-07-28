"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BadgeDollarSign,
    Banknote,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    CreditCard,
    Filter,
    Pencil,
    Plus,
    ReceiptText,
    RefreshCcw,
    Search,
    ShieldAlert,
    Trash2,
    Wallet,
    XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    actualizarGastoSupabase,
    anularGastoSupabase,
    crearGastoSupabase,
    listarGastosSupabase,
    type GastoSupabase,
} from "@/lib/supabase/gastos";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
};

type MetodoGasto = "Efectivo" | "Tarjeta" | "Transferencia" | "Cheque" | "Crédito";

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

type FormularioGasto = {
    fecha: string;
    categoria: string;
    descripcion: string;
    monto: string;
    metodoPago: MetodoGasto;
    proveedor: string;
    observaciones: string;
};

const categoriasGasto = [
    "Materiales odontológicos",
    "Servicios básicos",
    "Planilla / salarios",
    "Renta del local",
    "Mantenimiento",
    "Publicidad",
    "Compras administrativas",
    "Transporte",
    "Comisiones bancarias",
    "Compra a proveedor",
    "Abono a proveedor",
    "Otros",
];

const metodosGasto: MetodoGasto[] = [
    "Efectivo",
    "Tarjeta",
    "Transferencia",
    "Cheque",
    "Crédito",
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

function horaActualLocal() {
    const fecha = new Date();
    const hours = String(fecha.getHours()).padStart(2, "0");
    const minutes = String(fecha.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

function numero(valor: string) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI")}`;
}

function formularioVacio(): FormularioGasto {
    return {
        fecha: fechaHoyLocal(),
        categoria: "",
        descripcion: "",
        monto: "",
        metodoPago: "Efectivo",
        proveedor: "",
        observaciones: "",
    };
}

function colorEstado(estado: EstadoGasto) {
    if (estado === "Activo") return "bg-emerald-50 text-emerald-700";
    return "bg-red-50 text-red-700";
}

function colorMetodo(metodo: string) {
    if (metodo === "Efectivo") return "bg-emerald-50 text-emerald-700";
    if (metodo === "Tarjeta") return "bg-blue-50 text-blue-700";
    if (metodo === "Transferencia") return "bg-indigo-50 text-indigo-700";
    if (metodo === "Cheque") return "bg-amber-50 text-amber-700";
    return "bg-slate-100 text-slate-600";
}

function horaCorta(valor: string) {
    return String(valor || "").slice(0, 5);
}

function convertirGasto(gasto: GastoSupabase): Gasto {
    return {
        id: gasto.id,
        fecha: gasto.fecha,
        hora: horaCorta(gasto.hora),
        categoria: gasto.categoria || "",
        descripcion: gasto.descripcion || "",
        monto: Number(gasto.monto || 0),
        metodoPago: gasto.metodo_pago,
        proveedor: gasto.proveedor || "",
        usuarioNombre: gasto.usuario_nombre || "",
        observaciones: gasto.observaciones || "",
        estado: gasto.estado || "Activo",
    };
}


export default function GastosPage() {
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [formulario, setFormulario] = useState<FormularioGasto>(
        formularioVacio()
    );
    const [gastoEditandoId, setGastoEditandoId] = useState<string | null>(null);

    const [busqueda, setBusqueda] = useState("");
    const [mesSeleccionado, setMesSeleccionado] = useState(mesActualLocal());
    const [filtroCategoria, setFiltroCategoria] = useState("Todas");
    const [filtroMetodo, setFiltroMetodo] = useState("Todos");
    const [filtroEstado, setFiltroEstado] = useState<"Todos" | EstadoGasto>(
        "Todos"
    );
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    async function cargarDatos(mes = mesSeleccionado) {
        setCargando(true);
        setError("");

        try {
            const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");

            if (usuarioGuardado) {
                setUsuario(JSON.parse(usuarioGuardado) as UsuarioSistema);
            }

            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }

            const gastosSupabase = await listarGastosSupabase(mes);
            setGastos(gastosSupabase.map(convertirGasto));
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudieron cargar los gastos desde Supabase.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos(mesSeleccionado);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mesSeleccionado]);


    function actualizarCampo<K extends keyof FormularioGasto>(
        campo: K,
        valor: FormularioGasto[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function limpiarFormulario() {
        setFormulario(formularioVacio());
        setGastoEditandoId(null);
    }

    async function guardarGasto(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!formulario.fecha) {
            alert("Selecciona la fecha del gasto.");
            return;
        }

        if (!formulario.categoria.trim()) {
            alert("Selecciona o escribe la categoría del gasto.");
            return;
        }

        if (!formulario.descripcion.trim()) {
            alert("La descripción del gasto es obligatoria.");
            return;
        }

        if (numero(formulario.monto) <= 0) {
            alert("El monto debe ser mayor que cero.");
            return;
        }

        setGuardando(true);

        try {
            if (gastoEditandoId) {
                await actualizarGastoSupabase(gastoEditandoId, {
                    fecha: formulario.fecha,
                    categoria: formulario.categoria.trim(),
                    descripcion: formulario.descripcion.trim(),
                    monto: numero(formulario.monto),
                    metodo_pago: formulario.metodoPago,
                    proveedor: formulario.proveedor.trim(),
                    observaciones: formulario.observaciones.trim(),
                    usuario_nombre: usuario?.nombre || "Usuario no identificado",
                });

                limpiarFormulario();
                await cargarDatos();

                alert("Gasto actualizado correctamente.");
                return;
            }

            await crearGastoSupabase({
                fecha: formulario.fecha,
                categoria: formulario.categoria.trim(),
                descripcion: formulario.descripcion.trim(),
                monto: numero(formulario.monto),
                metodo_pago: formulario.metodoPago,
                proveedor: formulario.proveedor.trim(),
                usuario_nombre: usuario?.nombre || "Usuario no identificado",
                observaciones: formulario.observaciones.trim(),
            });

            limpiarFormulario();
            await cargarDatos();

            alert("Gasto registrado correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo guardar el gasto.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    function editarGasto(gasto: Gasto) {
        if (gasto.estado === "Anulado") {
            alert("No se puede editar un gasto anulado.");
            return;
        }

        setGastoEditandoId(gasto.id);
        setFormulario({
            fecha: gasto.fecha,
            categoria: gasto.categoria,
            descripcion: gasto.descripcion,
            monto: gasto.monto.toString(),
            metodoPago: gasto.metodoPago as MetodoGasto,
            proveedor: gasto.proveedor,
            observaciones: gasto.observaciones,
        });
    }

    async function anularGasto(gasto: Gasto) {
        if (gasto.estado === "Anulado") return;

        const confirmar = window.confirm(
            "¿Seguro que deseas anular este gasto? Se conservará en el historial, pero no contará en reportes activos."
        );

        if (!confirmar) return;

        setGuardando(true);

        try {
            await anularGastoSupabase(gasto.id);
            await cargarDatos();

            alert("Gasto anulado correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo anular el gasto.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    const categoriasDisponibles = useMemo(() => {
        const desdeGastos = gastos.map((gasto) => gasto.categoria).filter(Boolean);
        return ["Todas", ...Array.from(new Set([...categoriasGasto, ...desdeGastos]))];
    }, [gastos]);

    const gastosFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();

        return gastos
            .filter((gasto) => gasto.fecha.startsWith(mesSeleccionado))
            .filter((gasto) => {
                const coincideTexto =
                    !texto ||
                    gasto.descripcion.toLowerCase().includes(texto) ||
                    gasto.categoria.toLowerCase().includes(texto) ||
                    gasto.proveedor.toLowerCase().includes(texto) ||
                    gasto.metodoPago.toLowerCase().includes(texto) ||
                    gasto.usuarioNombre.toLowerCase().includes(texto) ||
                    gasto.id.toLowerCase().includes(texto);

                const coincideCategoria =
                    filtroCategoria === "Todas" || gasto.categoria === filtroCategoria;

                const coincideMetodo =
                    filtroMetodo === "Todos" || gasto.metodoPago === filtroMetodo;

                const coincideEstado =
                    filtroEstado === "Todos" || gasto.estado === filtroEstado;

                return (
                    coincideTexto && coincideCategoria && coincideMetodo && coincideEstado
                );
            })
            .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
    }, [gastos, busqueda, mesSeleccionado, filtroCategoria, filtroMetodo, filtroEstado]);

    const gastosMesActivos = gastos.filter(
        (gasto) => gasto.fecha.startsWith(mesSeleccionado) && gasto.estado === "Activo"
    );

    const gastosHoy = gastos.filter(
        (gasto) => gasto.fecha === fechaHoyLocal() && gasto.estado === "Activo"
    );

    const totalMes = gastosMesActivos.reduce(
        (total, gasto) => total + gasto.monto,
        0
    );

    const totalHoy = gastosHoy.reduce((total, gasto) => total + gasto.monto, 0);

    const totalAnuladoMes = gastos
        .filter(
            (gasto) =>
                gasto.fecha.startsWith(mesSeleccionado) && gasto.estado === "Anulado"
        )
        .reduce((total, gasto) => total + gasto.monto, 0);

    const cantidadActivosMes = gastosMesActivos.length;

    const gastoPromedio =
        cantidadActivosMes > 0 ? totalMes / cantidadActivosMes : 0;

    const resumenCategorias = useMemo(() => {
        const mapa = new Map<string, number>();

        gastosMesActivos.forEach((gasto) => {
            mapa.set(gasto.categoria, (mapa.get(gasto.categoria) || 0) + gasto.monto);
        });

        return Array.from(mapa.entries())
            .map(([categoria, total]) => ({ categoria, total }))
            .sort((a, b) => b.total - a.total);
    }, [gastosMesActivos]);

    const resumenMetodos = useMemo(() => {
        const mapa = new Map<string, number>();

        gastosMesActivos.forEach((gasto) => {
            mapa.set(gasto.metodoPago, (mapa.get(gasto.metodoPago) || 0) + gasto.monto);
        });

        return Array.from(mapa.entries())
            .map(([metodo, total]) => ({ metodo, total }))
            .sort((a, b) => b.total - a.total);
    }, [gastosMesActivos]);

    const categoriaMayor = resumenCategorias[0];

    return (
        <AppShell
            titulo="Control de Gastos"
            descripcion="Registro, clasificación, análisis y auditoría de gastos operativos"
            moduloActivo="Control de Gastos"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudieron cargar los gastos
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
                        Gastos conectados a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Registro, edición, anulación, filtros y análisis ya se guardan en base de datos.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => cargarDatos()}
                    disabled={cargando || guardando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    Recargar
                </button>
            </section>
            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <Wallet className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Mes
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(totalMes, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Gastos activos del mes
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <CalendarDays className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Hoy
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(totalHoy, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Gastos registrados hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <ReceiptText className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Activos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {cantidadActivosMes}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Movimientos del mes
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <BadgeDollarSign className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Promedio
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(gastoPromedio, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Promedio por gasto
                    </p>
                </div>
            </section>

            {totalAnuladoMes > 0 && (
                <section className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Gastos anulados en el mes
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Hay {formatoMoneda(totalAnuladoMes, configuracion.simboloMoneda)}{" "}
                                en gastos anulados. Estos no cuentan en el total activo, pero se
                                conservan para auditoría.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        {gastoEditandoId ? "Editar gasto" : "Nuevo gasto"}
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Registro manual de gastos administrativos u operativos
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                    <Plus className="h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </div>

                        <form onSubmit={guardarGasto} className="p-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Fecha
                                    </label>
                                    <input
                                        value={formulario.fecha}
                                        onChange={(event) =>
                                            actualizarCampo("fecha", event.target.value)
                                        }
                                        type="date"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Categoría
                                    </label>
                                    <select
                                        value={formulario.categoria}
                                        onChange={(event) =>
                                            actualizarCampo("categoria", event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option value="">Seleccionar categoría</option>
                                        {categoriasGasto.map((categoria) => (
                                            <option key={categoria}>{categoria}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Descripción
                                </label>
                                <input
                                    value={formulario.descripcion}
                                    onChange={(event) =>
                                        actualizarCampo("descripcion", event.target.value)
                                    }
                                    placeholder="Ejemplo: Pago de energía eléctrica"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Monto
                                    </label>
                                    <input
                                        value={formulario.monto}
                                        onChange={(event) =>
                                            actualizarCampo("monto", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Método de pago
                                    </label>
                                    <select
                                        value={formulario.metodoPago}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "metodoPago",
                                                event.target.value as MetodoGasto
                                            )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        {metodosGasto.map((metodo) => (
                                            <option key={metodo}>{metodo}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Proveedor / beneficiario
                                </label>
                                <input
                                    value={formulario.proveedor}
                                    onChange={(event) =>
                                        actualizarCampo("proveedor", event.target.value)
                                    }
                                    placeholder="Empresa, persona o proveedor relacionado"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Observaciones
                                </label>
                                <textarea
                                    value={formulario.observaciones}
                                    onChange={(event) =>
                                        actualizarCampo("observaciones", event.target.value)
                                    }
                                    rows={3}
                                    placeholder="Referencia, factura, nota interna..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                                <h4 className="text-sm font-black text-slate-800">
                                    Resumen del gasto
                                </h4>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Monto
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-800">
                                            {formatoMoneda(
                                                numero(formulario.monto),
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-teal-50 p-4">
                                        <p className="text-[11px] font-bold text-teal-700">
                                            Método
                                        </p>
                                        <p className="mt-1 text-sm font-black text-teal-700">
                                            {formulario.metodoPago}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-blue-50 p-4">
                                        <p className="text-[11px] font-bold text-blue-700">
                                            Fecha
                                        </p>
                                        <p className="mt-1 text-sm font-black text-blue-700">
                                            {formulario.fecha}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button disabled={guardando} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {guardando ? "Guardando..." : gastoEditandoId ? "Guardar cambios" : "Registrar gasto"}
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarFormulario}
                                    className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-teal-700" />
                                <h3 className="text-[16px] font-bold text-slate-800">
                                    Filtros y análisis
                                </h3>
                            </div>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Busca, filtra y revisa distribución de gastos
                            </p>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                    value={busqueda}
                                    onChange={(event) => setBusqueda(event.target.value)}
                                    placeholder="Buscar gasto..."
                                    className="w-full bg-transparent text-[13px] font-medium outline-none"
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                                        Estado
                                    </label>
                                    <select
                                        value={filtroEstado}
                                        onChange={(event) =>
                                            setFiltroEstado(event.target.value as "Todos" | EstadoGasto)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option>Todos</option>
                                        <option>Activo</option>
                                        <option>Anulado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Categoría
                                    </label>
                                    <select
                                        value={filtroCategoria}
                                        onChange={(event) => setFiltroCategoria(event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        {categoriasDisponibles.map((categoria) => (
                                            <option key={categoria}>{categoria}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Método
                                    </label>
                                    <select
                                        value={filtroMetodo}
                                        onChange={(event) => setFiltroMetodo(event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option>Todos</option>
                                        {metodosGasto.map((metodo) => (
                                            <option key={metodo}>{metodo}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Gastos por categoría
                        </h3>

                        <div className="mt-4 space-y-3">
                            {resumenCategorias.slice(0, 7).map((item) => {
                                const porcentaje = totalMes > 0 ? (item.total / totalMes) * 100 : 0;

                                return (
                                    <div key={item.categoria}>
                                        <div className="mb-1 flex items-center justify-between gap-3">
                                            <span className="text-[12px] font-bold text-slate-600">
                                                {item.categoria}
                                            </span>
                                            <span className="mono text-[11px] font-bold text-slate-500">
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

                            {resumenCategorias.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                    <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                                    <p className="mt-3 text-xs font-medium text-slate-400">
                                        No hay gastos activos para analizar en este mes.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Gastos por método de pago
                        </h3>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {resumenMetodos.map((item) => (
                                <div key={item.metodo} className="rounded-2xl bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorMetodo(
                                                item.metodo
                                            )}`}
                                        >
                                            {item.metodo}
                                        </span>

                                        {item.metodo === "Efectivo" ? (
                                            <Banknote className="h-4 w-4 text-emerald-600" />
                                        ) : item.metodo === "Tarjeta" ? (
                                            <CreditCard className="h-4 w-4 text-blue-600" />
                                        ) : (
                                            <ReceiptText className="h-4 w-4 text-slate-500" />
                                        )}
                                    </div>

                                    <p className="mt-4 text-sm font-black text-slate-800">
                                        {formatoMoneda(item.total, configuracion.simboloMoneda)}
                                    </p>
                                </div>
                            ))}

                            {resumenMetodos.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center md:col-span-2">
                                    <Wallet className="mx-auto h-8 w-8 text-slate-300" />
                                    <p className="mt-3 text-xs font-medium text-slate-400">
                                        Sin métodos registrados.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {categoriaMayor && (
                        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
                            <h3 className="text-sm font-black text-teal-800">
                                Categoría con mayor gasto
                            </h3>
                            <p className="mt-2 text-xs leading-5 text-teal-700">
                                La categoría con más gasto este mes es{" "}
                                <strong>{categoriaMayor.categoria}</strong>, con{" "}
                                <strong>
                                    {formatoMoneda(categoriaMayor.total, configuracion.simboloMoneda)}
                                </strong>
                                .
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Historial de gastos
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Registros activos, anulados y generados por proveedores
                            </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                            {gastosFiltrados.length} resultado(s)
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px]">
                        <thead>
                            <tr className="border-b border-black/[0.04]">
                                {[
                                    "Fecha",
                                    "Categoría",
                                    "Descripción",
                                    "Monto",
                                    "Método",
                                    "Proveedor",
                                    "Usuario",
                                    "Estado",
                                    "Acciones",
                                ].map((titulo) => (
                                    <th
                                        key={titulo}
                                        className="mono px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pl-6"
                                    >
                                        {titulo}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {gastosFiltrados.map((gasto) => (
                                <tr key={gasto.id} className="border-b border-black/[0.03]">
                                    <td className="px-6 py-4">
                                        <p className="text-[12px] font-bold text-slate-700">
                                            {gasto.fecha}
                                        </p>
                                        <p className="mono mt-0.5 text-[10px] text-slate-400">
                                            {gasto.hora}
                                        </p>
                                    </td>

                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                            {gasto.categoria}
                                        </span>
                                    </td>

                                    <td className="px-4 py-4">
                                        <p className="text-[12px] font-bold text-slate-700">
                                            {gasto.descripcion}
                                        </p>
                                        {gasto.observaciones && (
                                            <p className="mt-0.5 max-w-sm truncate text-[11px] text-slate-400">
                                                {gasto.observaciones}
                                            </p>
                                        )}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] font-black text-slate-800">
                                        {formatoMoneda(gasto.monto, configuracion.simboloMoneda)}
                                    </td>

                                    <td className="px-4 py-4">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorMetodo(
                                                gasto.metodoPago
                                            )}`}
                                        >
                                            {gasto.metodoPago}
                                        </span>
                                    </td>

                                    <td className="px-4 py-4 text-[12px] text-slate-500">
                                        {gasto.proveedor || "No registrado"}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] text-slate-500">
                                        {gasto.usuarioNombre || "No identificado"}
                                    </td>

                                    <td className="px-4 py-4">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstado(
                                                gasto.estado
                                            )}`}
                                        >
                                            {gasto.estado}
                                        </span>
                                    </td>

                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {gasto.estado === "Activo" ? (
                                                <>
                                                    <button
                                                        onClick={() => editarGasto(gasto)}
                                                        className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Editar
                                                    </button>

                                                    <button
                                                        onClick={() => anularGasto(gasto)}
                                                        className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Anular
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-400">
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Anulado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {gastosFiltrados.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-6 py-10 text-center text-[12px] text-slate-400"
                                    >
                                        {cargando ? "Cargando gastos desde Supabase..." : "No hay gastos registrados o no coinciden con los filtros."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </AppShell>
    );
}