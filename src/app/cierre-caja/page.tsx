"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Banknote,
    Calculator,
    CalendarDays,
    CheckCircle2,
    Clock,
    CreditCard,
    FileText,
    LockKeyhole,
    Printer,
    ReceiptText,
    Search,
    ShieldCheck,
    Trash2,
    Wallet,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
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
    observaciones: string;
    estado: EstadoGasto;
};

type CierreCaja = {
    id: string;
    fecha: string;
    hora: string;
    usuarioNombre: string;
    ventasCantidad: number;
    ventasBrutas: number;
    efectivoSistema: number;
    tarjetaSistema: number;
    transferenciaSistema: number;
    creditoGenerado: number;
    gastosEfectivo: number;
    gastosTarjeta: number;
    gastosTransferencia: number;
    gastosTotal: number;
    comisionPOS: number;
    netoTarjeta: number;
    efectivoEsperado: number;
    efectivoContado: number;
    tarjetaReportada: number;
    transferenciaReportada: number;
    diferenciaEfectivo: number;
    diferenciaTarjeta: number;
    diferenciaTransferencia: number;
    estado: "Cuadrado" | "Con diferencia";
    observaciones: string;
};

type FormularioCierre = {
    efectivoContado: string;
    tarjetaReportada: string;
    transferenciaReportada: string;
    observaciones: string;
};

const formularioVacio: FormularioCierre = {
    efectivoContado: "",
    tarjetaReportada: "",
    transferenciaReportada: "",
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

function numero(valor: string) {
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

function colorDiferencia(valor: number) {
    if (Math.abs(valor) < 0.01) return "text-emerald-700";
    if (valor > 0) return "text-blue-700";
    return "text-red-700";
}

function textoDiferencia(valor: number, simbolo: string) {
    if (Math.abs(valor) < 0.01) return "Cuadrado";
    if (valor > 0) return `Sobra ${formatoMoneda(valor, simbolo)}`;
    return `Falta ${formatoMoneda(Math.abs(valor), simbolo)}`;
}

export default function CierreCajaPage() {
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [ventas, setVentas] = useState<Venta[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);

    const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoyLocal());
    const [formulario, setFormulario] =
        useState<FormularioCierre>(formularioVacio);
    const [busqueda, setBusqueda] = useState("");

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
        const ventasGuardadas = localStorage.getItem("ventas_sistema_clinico");
        const gastosGuardados = localStorage.getItem("gastos_sistema_clinico");
        const cierresGuardados = localStorage.getItem(
            "cierres_caja_sistema_clinico"
        );

        if (usuarioGuardado) {
            setUsuario(JSON.parse(usuarioGuardado) as UsuarioSistema);
        }

        setConfiguracion(obtenerConfiguracionClinica());

        if (ventasGuardadas) {
            setVentas(JSON.parse(ventasGuardadas) as Venta[]);
        }

        if (gastosGuardados) {
            setGastos(JSON.parse(gastosGuardados) as Gasto[]);
        }

        if (cierresGuardados) {
            setCierres(JSON.parse(cierresGuardados) as CierreCaja[]);
        }
    }, []);

    function guardarCierres(nuevaLista: CierreCaja[]) {
        setCierres(nuevaLista);
        localStorage.setItem(
            "cierres_caja_sistema_clinico",
            JSON.stringify(nuevaLista)
        );
    }

    function actualizarCampo<K extends keyof FormularioCierre>(
        campo: K,
        valor: FormularioCierre[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    const ventasDia = useMemo(() => {
        return ventas
            .filter((venta) => venta.fecha === fechaSeleccionada)
            .filter((venta) => venta.estado !== "Anulada");
    }, [ventas, fechaSeleccionada]);

    const gastosDia = useMemo(() => {
        return gastos
            .filter((gasto) => gasto.fecha === fechaSeleccionada)
            .filter((gasto) => gasto.estado === "Activo");
    }, [gastos, fechaSeleccionada]);

    const cierreExistente = cierres.find(
        (cierre) => cierre.fecha === fechaSeleccionada
    );

    const ventasBrutas = ventasDia.reduce(
        (total, venta) => total + (venta.total || 0),
        0
    );

    const efectivoSistema = ventasDia.reduce(
        (total, venta) => total + (venta.efectivo || 0),
        0
    );

    const tarjetaSistema = ventasDia.reduce(
        (total, venta) => total + (venta.tarjeta || 0),
        0
    );

    const transferenciaSistema = ventasDia.reduce(
        (total, venta) => total + (venta.transferencia || 0),
        0
    );

    const creditoGenerado = ventasDia.reduce(
        (total, venta) => total + (venta.credito || 0),
        0
    );

    const gastosEfectivo = gastosDia
        .filter((gasto) => gasto.metodoPago === "Efectivo")
        .reduce((total, gasto) => total + (gasto.monto || 0), 0);

    const gastosTarjeta = gastosDia
        .filter((gasto) => gasto.metodoPago === "Tarjeta")
        .reduce((total, gasto) => total + (gasto.monto || 0), 0);

    const gastosTransferencia = gastosDia
        .filter((gasto) => gasto.metodoPago === "Transferencia")
        .reduce((total, gasto) => total + (gasto.monto || 0), 0);

    const gastosOtros = gastosDia
        .filter(
            (gasto) =>
                gasto.metodoPago !== "Efectivo" &&
                gasto.metodoPago !== "Tarjeta" &&
                gasto.metodoPago !== "Transferencia"
        )
        .reduce((total, gasto) => total + (gasto.monto || 0), 0);

    const gastosTotal = gastosDia.reduce(
        (total, gasto) => total + (gasto.monto || 0),
        0
    );

    const comisionPOS = tarjetaSistema * (configuracion.comisionPOS / 100);
    const netoTarjeta = tarjetaSistema - comisionPOS;

    const efectivoEsperado = efectivoSistema - gastosEfectivo;
    const tarjetaEsperada = tarjetaSistema - gastosTarjeta;
    const transferenciaEsperada = transferenciaSistema - gastosTransferencia;

    const efectivoContado = numero(formulario.efectivoContado);
    const tarjetaReportada = numero(formulario.tarjetaReportada);
    const transferenciaReportada = numero(formulario.transferenciaReportada);

    const diferenciaEfectivo = efectivoContado - efectivoEsperado;
    const diferenciaTarjeta = tarjetaReportada - tarjetaEsperada;
    const diferenciaTransferencia = transferenciaReportada - transferenciaEsperada;

    const totalCobrado =
        efectivoSistema + tarjetaSistema + transferenciaSistema;

    const totalNetoCaja =
        efectivoEsperado + transferenciaEsperada + netoTarjeta - gastosTarjeta;

    const diferenciaTotal =
        diferenciaEfectivo + diferenciaTarjeta + diferenciaTransferencia;

    function cargarMontosSistema() {
        setFormulario((datos) => ({
            ...datos,
            efectivoContado: efectivoEsperado.toFixed(2),
            tarjetaReportada: tarjetaEsperada.toFixed(2),
            transferenciaReportada: transferenciaEsperada.toFixed(2),
        }));
    }

    function limpiarFormulario() {
        setFormulario(formularioVacio);
    }

    function registrarCierre(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (cierreExistente) {
            alert("Ya existe un cierre registrado para esta fecha.");
            return;
        }

        if (ventasDia.length === 0 && gastosDia.length === 0) {
            const confirmar = window.confirm(
                "No hay ventas ni gastos para esta fecha. ¿Deseas registrar cierre en cero?"
            );

            if (!confirmar) return;
        }

        const estado =
            Math.abs(diferenciaEfectivo) < 0.01 &&
                Math.abs(diferenciaTarjeta) < 0.01 &&
                Math.abs(diferenciaTransferencia) < 0.01
                ? "Cuadrado"
                : "Con diferencia";

        const nuevoCierre: CierreCaja = {
            id: `CIERRE-${Date.now()}`,
            fecha: fechaSeleccionada,
            hora: horaActualLocal(),
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
            ventasCantidad: ventasDia.length,
            ventasBrutas,
            efectivoSistema,
            tarjetaSistema,
            transferenciaSistema,
            creditoGenerado,
            gastosEfectivo,
            gastosTarjeta,
            gastosTransferencia,
            gastosTotal,
            comisionPOS,
            netoTarjeta,
            efectivoEsperado,
            efectivoContado,
            tarjetaReportada,
            transferenciaReportada,
            diferenciaEfectivo,
            diferenciaTarjeta,
            diferenciaTransferencia,
            estado,
            observaciones: formulario.observaciones.trim(),
        };

        guardarCierres([nuevoCierre, ...cierres]);
        limpiarFormulario();

        alert("Cierre de caja registrado correctamente.");
    }

    function eliminarCierre(cierre: CierreCaja) {
        const confirmar = window.confirm(
            "¿Seguro que deseas eliminar este cierre? Esto permitirá volver a cerrar esa fecha."
        );

        if (!confirmar) return;

        const nuevaLista = cierres.filter((item) => item.id !== cierre.id);
        guardarCierres(nuevaLista);
    }

    function imprimirCierre(cierre?: CierreCaja) {
        if (!cierre && !cierreExistente) {
            alert("Primero registra el cierre para imprimirlo.");
            return;
        }

        window.print();
    }

    const cierresFiltrados = cierres.filter((cierre) => {
        const texto = busqueda.toLowerCase().trim();

        if (!texto) return true;

        return (
            cierre.fecha.toLowerCase().includes(texto) ||
            cierre.usuarioNombre.toLowerCase().includes(texto) ||
            cierre.estado.toLowerCase().includes(texto) ||
            cierre.id.toLowerCase().includes(texto)
        );
    });

    return (
        <AppShell
            titulo="Cierre de Caja"
            descripcion="Cuadre diario de efectivo, tarjeta, transferencias, créditos, gastos y diferencias"
            moduloActivo="Cierre de Caja"
        >
            <section className="print:hidden grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Banknote className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Cobrado
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(totalCobrado, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total cobrado del día
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <CreditCard className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            POS
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(comisionPOS, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Comisión tarjeta
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <ReceiptText className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Gastos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(gastosTotal, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Gastos activos del día
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Wallet className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Neto
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(totalNetoCaja, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Neto estimado del día
                    </p>
                </div>
            </section>

            {cierreExistente && (
                <section className="print:hidden mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <div>
                            <h3 className="text-sm font-black text-emerald-800">
                                Esta fecha ya fue cerrada
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-emerald-700">
                                El cierre de {fechaSeleccionada} fue registrado por{" "}
                                <strong>{cierreExistente.usuarioNombre}</strong> a las{" "}
                                <strong>{cierreExistente.hora}</strong>. Estado:{" "}
                                <strong>{cierreExistente.estado}</strong>.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="print:hidden space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Registrar cierre
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Conteo real contra montos del sistema
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                    <Calculator className="h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </div>

                        <form onSubmit={registrarCierre} className="p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Fecha a cerrar
                                </label>
                                <input
                                    value={fechaSeleccionada}
                                    onChange={(event) => {
                                        setFechaSeleccionada(event.target.value);
                                        setFormulario(formularioVacio);
                                    }}
                                    type="date"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4 rounded-3xl bg-slate-50 p-5">
                                <h4 className="text-sm font-black text-slate-800">
                                    Valores esperados por sistema
                                </h4>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Efectivo esperado
                                        </p>
                                        <p className="mt-1 text-sm font-black text-emerald-700">
                                            {formatoMoneda(
                                                efectivoEsperado,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Tarjeta esperada
                                        </p>
                                        <p className="mt-1 text-sm font-black text-blue-700">
                                            {formatoMoneda(
                                                tarjetaEsperada,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Transferencia esperada
                                        </p>
                                        <p className="mt-1 text-sm font-black text-indigo-700">
                                            {formatoMoneda(
                                                transferenciaEsperada,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={cargarMontosSistema}
                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Usar montos del sistema
                                </button>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Efectivo contado
                                    </label>
                                    <input
                                        value={formulario.efectivoContado}
                                        onChange={(event) =>
                                            actualizarCampo("efectivoContado", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        disabled={!!cierreExistente}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Tarjeta reportada
                                    </label>
                                    <input
                                        value={formulario.tarjetaReportada}
                                        onChange={(event) =>
                                            actualizarCampo("tarjetaReportada", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        disabled={!!cierreExistente}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Transferencia reportada
                                    </label>
                                    <input
                                        value={formulario.transferenciaReportada}
                                        onChange={(event) =>
                                            actualizarCampo("transferenciaReportada", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        disabled={!!cierreExistente}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl bg-slate-50 p-5">
                                <h4 className="text-sm font-black text-slate-800">
                                    Diferencias
                                </h4>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Efectivo
                                        </p>
                                        <p
                                            className={`mt-1 text-sm font-black ${colorDiferencia(
                                                diferenciaEfectivo
                                            )}`}
                                        >
                                            {textoDiferencia(
                                                diferenciaEfectivo,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Tarjeta
                                        </p>
                                        <p
                                            className={`mt-1 text-sm font-black ${colorDiferencia(
                                                diferenciaTarjeta
                                            )}`}
                                        >
                                            {textoDiferencia(
                                                diferenciaTarjeta,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Transferencia
                                        </p>
                                        <p
                                            className={`mt-1 text-sm font-black ${colorDiferencia(
                                                diferenciaTransferencia
                                            )}`}
                                        >
                                            {textoDiferencia(
                                                diferenciaTransferencia,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {Math.abs(diferenciaTotal) > 0.01 && (
                                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                        <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                                            <AlertTriangle className="h-4 w-4" />
                                            Hay diferencia total de{" "}
                                            {formatoMoneda(
                                                diferenciaTotal,
                                                configuracion.simboloMoneda
                                            )}
                                            . Podés cerrar, pero quedará marcado con diferencia.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Observaciones del cierre
                                </label>
                                <textarea
                                    value={formulario.observaciones}
                                    onChange={(event) =>
                                        actualizarCampo("observaciones", event.target.value)
                                    }
                                    rows={4}
                                    placeholder="Notas, motivo de diferencias, referencias POS..."
                                    disabled={!!cierreExistente}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100"
                                />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    disabled={!!cierreExistente}
                                    className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <LockKeyhole className="h-4 w-4" />
                                    Registrar cierre
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarFormulario}
                                    className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Limpiar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => imprimirCierre(cierreExistente)}
                                    className="flex items-center gap-2 rounded-xl bg-blue-50 px-5 py-3 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                                >
                                    <Printer className="h-4 w-4" />
                                    Imprimir
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Resumen del día
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Ventas, gastos, créditos y comisión POS
                            </p>
                        </div>

                        <div className="p-6">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-[11px] font-bold text-emerald-700">
                                        Efectivo ventas
                                    </p>
                                    <p className="mt-1 text-sm font-black text-emerald-700">
                                        {formatoMoneda(
                                            efectivoSistema,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-red-50 p-4">
                                    <p className="text-[11px] font-bold text-red-700">
                                        Gastos efectivo
                                    </p>
                                    <p className="mt-1 text-sm font-black text-red-700">
                                        {formatoMoneda(gastosEfectivo, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-blue-50 p-4">
                                    <p className="text-[11px] font-bold text-blue-700">
                                        Tarjeta ventas
                                    </p>
                                    <p className="mt-1 text-sm font-black text-blue-700">
                                        {formatoMoneda(tarjetaSistema, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-[11px] font-bold text-slate-500">
                                        Neto tarjeta
                                    </p>
                                    <p className="mt-1 text-sm font-black text-slate-800">
                                        {formatoMoneda(netoTarjeta, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-indigo-50 p-4">
                                    <p className="text-[11px] font-bold text-indigo-700">
                                        Transferencias
                                    </p>
                                    <p className="mt-1 text-sm font-black text-indigo-700">
                                        {formatoMoneda(
                                            transferenciaSistema,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-amber-50 p-4">
                                    <p className="text-[11px] font-bold text-amber-700">
                                        Crédito generado
                                    </p>
                                    <p className="mt-1 text-sm font-black text-amber-700">
                                        {formatoMoneda(creditoGenerado, configuracion.simboloMoneda)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl bg-slate-900 p-5 text-white">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                                            Resultado del día
                                        </p>
                                        <h4 className="mt-2 text-xl font-black">
                                            {formatoMoneda(totalNetoCaja, configuracion.simboloMoneda)}
                                        </h4>
                                    </div>

                                    <Wallet className="h-8 w-8 text-teal-300" />
                                </div>

                                <p className="mt-3 text-xs leading-5 text-white/50">
                                    Neto estimado considerando efectivo esperado, transferencias,
                                    tarjeta neta y gastos por métodos principales.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Ventas del día
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                {ventasDia.length} venta(s) activa(s)
                            </p>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {ventasDia.map((venta) => (
                                    <div
                                        key={venta.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">
                                                    {venta.clienteNombre}
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {venta.concepto}
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                                {formatoMoneda(venta.total, configuracion.simboloMoneda)}
                                            </span>
                                        </div>

                                        <p className="mono mt-3 text-[10px] text-slate-400">
                                            {venta.hora} · {venta.tipoCobro} · {venta.estado}
                                        </p>
                                    </div>
                                ))}

                                {ventasDia.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                        <ReceiptText className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-3 text-xs font-medium text-slate-400">
                                            No hay ventas activas en esta fecha.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Gastos del día
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                {gastosDia.length} gasto(s) activo(s)
                            </p>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {gastosDia.map((gasto) => (
                                    <div
                                        key={gasto.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">
                                                    {gasto.descripcion}
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {gasto.categoria}
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">
                                                {formatoMoneda(gasto.monto, configuracion.simboloMoneda)}
                                            </span>
                                        </div>

                                        <p className="mono mt-3 text-[10px] text-slate-400">
                                            {gasto.hora} · {gasto.metodoPago} ·{" "}
                                            {gasto.proveedor || "Sin proveedor"}
                                        </p>
                                    </div>
                                ))}

                                {gastosDia.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                        <FileText className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-3 text-xs font-medium text-slate-400">
                                            No hay gastos activos en esta fecha.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="print:hidden mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Historial de cierres
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Cierres registrados, cuadrados o con diferencias
                            </p>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-80">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar cierre..."
                                className="w-full bg-transparent text-[13px] font-medium outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px]">
                        <thead>
                            <tr className="border-b border-black/[0.04]">
                                {[
                                    "Fecha",
                                    "Usuario",
                                    "Ventas",
                                    "Efectivo",
                                    "Tarjeta",
                                    "Transferencia",
                                    "Diferencia",
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
                            {cierresFiltrados.map((cierre) => {
                                const diferencia =
                                    cierre.diferenciaEfectivo +
                                    cierre.diferenciaTarjeta +
                                    cierre.diferenciaTransferencia;

                                return (
                                    <tr key={cierre.id} className="border-b border-black/[0.03]">
                                        <td className="px-6 py-4">
                                            <p className="text-[12px] font-bold text-slate-700">
                                                {cierre.fecha}
                                            </p>
                                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                                {cierre.hora}
                                            </p>
                                        </td>

                                        <td className="px-4 py-4 text-[12px] text-slate-500">
                                            {cierre.usuarioNombre}
                                        </td>

                                        <td className="px-4 py-4">
                                            <p className="text-[12px] font-black text-slate-800">
                                                {cierre.ventasCantidad}
                                            </p>
                                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                                {formatoMoneda(
                                                    cierre.ventasBrutas,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </td>

                                        <td className="px-4 py-4 text-[12px] text-slate-500">
                                            {formatoMoneda(
                                                cierre.efectivoContado,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>

                                        <td className="px-4 py-4 text-[12px] text-slate-500">
                                            {formatoMoneda(
                                                cierre.tarjetaReportada,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>

                                        <td className="px-4 py-4 text-[12px] text-slate-500">
                                            {formatoMoneda(
                                                cierre.transferenciaReportada,
                                                configuracion.simboloMoneda
                                            )}
                                        </td>

                                        <td
                                            className={`px-4 py-4 text-[12px] font-black ${colorDiferencia(
                                                diferencia
                                            )}`}
                                        >
                                            {formatoMoneda(diferencia, configuracion.simboloMoneda)}
                                        </td>

                                        <td className="px-4 py-4">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cierre.estado === "Cuadrado"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-amber-50 text-amber-700"
                                                    }`}
                                            >
                                                {cierre.estado}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => imprimirCierre(cierre)}
                                                    className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                                                >
                                                    <Printer className="h-3.5 w-3.5" />
                                                    Imprimir
                                                </button>

                                                <button
                                                    onClick={() => eliminarCierre(cierre)}
                                                    className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {cierresFiltrados.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-6 py-10 text-center text-[12px] text-slate-400"
                                    >
                                        No hay cierres registrados o no coinciden con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="hidden print:block bg-white p-8 text-slate-900">
                <h1 className="text-2xl font-black">
                    Cierre de caja - {fechaSeleccionada}
                </h1>
                <p className="mt-1 text-sm">
                    {configuracion.nombreClinica} · Generado por{" "}
                    {usuario?.nombre || "Usuario no identificado"}
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div>
                        <p>Ventas activas: {ventasDia.length}</p>
                        <p>
                            Ventas brutas:{" "}
                            {formatoMoneda(ventasBrutas, configuracion.simboloMoneda)}
                        </p>
                        <p>
                            Efectivo sistema:{" "}
                            {formatoMoneda(efectivoSistema, configuracion.simboloMoneda)}
                        </p>
                        <p>
                            Tarjeta sistema:{" "}
                            {formatoMoneda(tarjetaSistema, configuracion.simboloMoneda)}
                        </p>
                        <p>
                            Transferencia sistema:{" "}
                            {formatoMoneda(transferenciaSistema, configuracion.simboloMoneda)}
                        </p>
                    </div>

                    <div>
                        <p>
                            Gastos total:{" "}
                            {formatoMoneda(gastosTotal, configuracion.simboloMoneda)}
                        </p>
                        <p>
                            Crédito generado:{" "}
                            {formatoMoneda(creditoGenerado, configuracion.simboloMoneda)}
                        </p>
                        <p>
                            Comisión POS:{" "}
                            {formatoMoneda(comisionPOS, configuracion.simboloMoneda)}
                        </p>
                        <p>
                            Neto tarjeta:{" "}
                            {formatoMoneda(netoTarjeta, configuracion.simboloMoneda)}
                        </p>
                    </div>
                </div>

                <div className="mt-8 border-t pt-6">
                    <p>
                        Efectivo esperado:{" "}
                        {formatoMoneda(efectivoEsperado, configuracion.simboloMoneda)}
                    </p>
                    <p>
                        Efectivo contado:{" "}
                        {formatoMoneda(
                            cierreExistente?.efectivoContado || efectivoContado,
                            configuracion.simboloMoneda
                        )}
                    </p>
                    <p>
                        Diferencia efectivo:{" "}
                        {formatoMoneda(
                            cierreExistente?.diferenciaEfectivo || diferenciaEfectivo,
                            configuracion.simboloMoneda
                        )}
                    </p>
                </div>
            </section>
        </AppShell>
    );
}