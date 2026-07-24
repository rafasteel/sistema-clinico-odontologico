"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    ClipboardCheck,
    ExternalLink,
    Filter,
    Inbox,
    RefreshCcw,
    Search,
    ShieldCheck,
    Sparkles,
    XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    listarCitasSupabase,
    type CitaSupabase,
} from "@/lib/supabase/citas";
import {
    listarAbonosCuentaSupabase,
    listarCuentasCobrarSupabase,
    type CuentaCobrarSupabase,
} from "@/lib/supabase/finanzas";
import {
    listarProductosInventarioSupabase,
    type ProductoInventarioSupabase,
} from "@/lib/supabase/inventario";
import {
    listarCuentasPagarSupabase,
    type CuentaPagarSupabase,
} from "@/lib/supabase/proveedores";
import {
    listarGastosSupabase,
    type GastoSupabase,
} from "@/lib/supabase/gastos";
import {
    listarCierresCajaSupabase,
    type CierreCajaSupabase,
} from "@/lib/supabase/cierresCaja";

const REVISADAS_KEY = "notificaciones_revisadas_sistema_clinico";

type PrioridadNotificacion = "Urgente" | "Alta" | "Media" | "Baja";

type TipoNotificacion =
    | "Cita"
    | "Caja"
    | "Cobranza"
    | "Proveedor"
    | "Inventario"
    | "Respaldo"
    | "Presupuesto"
    | "Sistema";

type NotificacionInterna = {
    id: string;
    tipo: TipoNotificacion;
    modulo: string;
    titulo: string;
    descripcion: string;
    prioridad: PrioridadNotificacion;
    fecha: string;
    href: string;
};

type FiltroEstado = "Pendientes" | "Revisadas" | "Todas";

const PRIORIDADES_NOTIFICACION: PrioridadNotificacion[] = [
    "Urgente",
    "Alta",
    "Media",
    "Baja",
];

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function fechaMasDias(dias: number) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);

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

function diferenciaDias(fechaBase: string, fechaComparar: string) {
    if (!fechaBase || !fechaComparar) return 0;

    const [yearA, monthA, dayA] = fechaBase.split("-").map(Number);
    const [yearB, monthB, dayB] = fechaComparar.split("-").map(Number);

    const a = new Date(yearA, monthA - 1, dayA).getTime();
    const b = new Date(yearB, monthB - 1, dayB).getTime();

    if (Number.isNaN(a) || Number.isNaN(b)) return 0;

    return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function leerRevisadas() {
    if (typeof window === "undefined") return [];

    const datos = localStorage.getItem(REVISADAS_KEY);

    if (!datos) return [];

    try {
        const lista = JSON.parse(datos) as unknown;

        if (!Array.isArray(lista)) return [];

        return lista.filter((item): item is string => typeof item === "string");
    } catch {
        return [];
    }
}

function guardarRevisadas(ids: string[]) {
    if (typeof window === "undefined") return;

    localStorage.setItem(REVISADAS_KEY, JSON.stringify(ids));
}

function normalizarTexto(texto: unknown) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function colorPrioridad(prioridad: PrioridadNotificacion) {
    if (prioridad === "Urgente") {
        return {
            badge: "border-red-200 bg-red-50 text-red-700",
            card: "border-red-100 bg-red-50/45",
            dot: "bg-red-500",
            text: "text-red-700",
        };
    }

    if (prioridad === "Alta") {
        return {
            badge: "border-orange-200 bg-orange-50 text-orange-700",
            card: "border-orange-100 bg-orange-50/45",
            dot: "bg-orange-500",
            text: "text-orange-700",
        };
    }

    if (prioridad === "Media") {
        return {
            badge: "border-amber-200 bg-amber-50 text-amber-700",
            card: "border-amber-100 bg-amber-50/45",
            dot: "bg-amber-500",
            text: "text-amber-700",
        };
    }

    return {
        badge: "border-blue-200 bg-blue-50 text-blue-700",
        card: "border-blue-100 bg-blue-50/45",
        dot: "bg-blue-500",
        text: "text-blue-700",
    };
}

function iconoTipo(tipo: TipoNotificacion) {
    if (tipo === "Cita") return "📅";
    if (tipo === "Caja") return "💳";
    if (tipo === "Cobranza") return "📌";
    if (tipo === "Proveedor") return "🚚";
    if (tipo === "Inventario") return "📦";
    if (tipo === "Respaldo") return "🛡️";
    if (tipo === "Presupuesto") return "🧾";

    return "🔔";
}

function textoResumen(notificaciones: NotificacionInterna[], revisadas: string[]) {
    const pendientes = notificaciones.filter(
        (notificacion) => !revisadas.includes(notificacion.id)
    );

    const urgentes = pendientes.filter(
        (notificacion) => notificacion.prioridad === "Urgente"
    );

    if (urgentes.length > 0) {
        return `Hay ${urgentes.length} alerta(s) urgente(s) pendiente(s).`;
    }

    if (pendientes.length > 0) {
        return `Hay ${pendientes.length} pendiente(s) por revisar.`;
    }

    return "Todo está al día por ahora.";
}

function estadoVisualCuenta(fechaVencimiento: string | null, estado: string) {
    if (estado === "Pagada" || estado === "Anulada") return estado;

    if (fechaVencimiento && fechaVencimiento < fechaHoyLocal()) {
        return "Vencida";
    }

    return estado;
}

function generarNotificacionesSupabase(datos: {
    citas: CitaSupabase[];
    cuentasCobrar: CuentaCobrarSupabase[];
    cuentasPagar: CuentaPagarSupabase[];
    productos: ProductoInventarioSupabase[];
    gastos: GastoSupabase[];
    cierres: CierreCajaSupabase[];
    abonosPorCuenta: Record<string, number>;
}) {
    const hoy = fechaHoyLocal();
    const horaActual = horaActualLocal();
    const enTresDias = fechaMasDias(3);
    const mesActual = mesActualLocal();
    const notificaciones: NotificacionInterna[] = [];

    datos.citas
        .filter((cita) => cita.fecha === hoy)
        .filter(
            (cita) =>
                cita.estado !== "Atendida" &&
                cita.estado !== "Cobrada" &&
                cita.estado !== "Cancelada" &&
                cita.estado !== "No asistió"
        )
        .forEach((cita) => {
            const citaAtrasada =
                String(cita.hora || "").slice(0, 5) < horaActual &&
                cita.estado !== "Confirmada";

            notificaciones.push({
                id: `cita-hoy-${cita.id}-${cita.estado}`,
                tipo: "Cita",
                modulo: "Agenda Médica",
                titulo: citaAtrasada
                    ? "Cita pendiente posiblemente atrasada"
                    : "Cita pendiente para hoy",
                descripcion: `${cita.paciente_nombre || "Paciente"} tiene ${cita.servicio_nombre || "servicio"
                    } a las ${String(cita.hora || "").slice(0, 5)} con ${cita.doctor_nombre || "doctor no especificado"
                    }.`,
                prioridad: citaAtrasada ? "Alta" : "Media",
                fecha: cita.fecha,
                href: "/agenda",
            });
        });

    datos.citas
        .filter((cita) => cita.fecha > hoy && cita.fecha <= enTresDias)
        .filter(
            (cita) =>
                cita.estado !== "Atendida" &&
                cita.estado !== "Cobrada" &&
                cita.estado !== "Cancelada" &&
                cita.estado !== "No asistió"
        )
        .slice(0, 12)
        .forEach((cita) => {
            const dias = diferenciaDias(hoy, cita.fecha);

            notificaciones.push({
                id: `cita-proxima-${cita.id}-${cita.fecha}`,
                tipo: "Cita",
                modulo: "Agenda Médica",
                titulo: "Cita próxima",
                descripcion: `${cita.paciente_nombre || "Paciente"} tiene una cita en ${dias === 1 ? "1 día" : `${dias} días`
                    }: ${cita.servicio_nombre || "servicio"} a las ${String(
                        cita.hora || ""
                    ).slice(0, 5)}.`,
                prioridad: "Baja",
                fecha: cita.fecha,
                href: "/agenda",
            });
        });

    datos.cuentasCobrar
        .filter(
            (cuenta) =>
                cuenta.estado !== "Pagada" &&
                cuenta.estado !== "Anulada" &&
                numero(cuenta.saldo) > 0
        )
        .forEach((cuenta) => {
            const estadoVisual = estadoVisualCuenta(
                cuenta.fecha_vencimiento,
                cuenta.estado
            );
            const dias = diferenciaDias(
                cuenta.fecha_vencimiento || hoy,
                hoy
            );
            const abonos = datos.abonosPorCuenta[cuenta.id] || 0;

            if (estadoVisual === "Vencida") {
                notificaciones.push({
                    id: `cxc-vencida-${cuenta.id}-${cuenta.saldo}`,
                    tipo: "Cobranza",
                    modulo: "Cuentas por Cobrar",
                    titulo: "Cuenta por cobrar vencida",
                    descripcion: `${cuenta.paciente_nombre || "Paciente"} tiene saldo pendiente de C$ ${numero(
                        cuenta.saldo
                    ).toLocaleString("es-NI")} por ${cuenta.concepto || "crédito"
                        }. Vencida hace ${Math.max(dias, 1)} día(s).`,
                    prioridad: "Urgente",
                    fecha: cuenta.fecha_vencimiento || cuenta.fecha,
                    href: "/reporte-creditos",
                });
                return;
            }

            if (cuenta.fecha_vencimiento) {
                const diasParaVencer = diferenciaDias(hoy, cuenta.fecha_vencimiento);

                if (diasParaVencer >= 0 && diasParaVencer <= 3) {
                    notificaciones.push({
                        id: `cxc-proxima-${cuenta.id}-${cuenta.fecha_vencimiento}`,
                        tipo: "Cobranza",
                        modulo: "Cuentas por Cobrar",
                        titulo: "Crédito próximo a vencer",
                        descripcion: `${cuenta.paciente_nombre || "Paciente"} debe C$ ${numero(
                            cuenta.saldo
                        ).toLocaleString("es-NI")} y vence en ${diasParaVencer} día(s). Abonos registrados: ${abonos}.`,
                        prioridad: "Alta",
                        fecha: cuenta.fecha_vencimiento,
                        href: "/cuentas-cobrar",
                    });
                }
            }
        });

    datos.cuentasPagar
        .filter(
            (cuenta) =>
                cuenta.estado !== "Pagada" &&
                cuenta.estado !== "Anulada" &&
                numero(cuenta.saldo) > 0
        )
        .forEach((cuenta) => {
            const estadoVisual = estadoVisualCuenta(
                cuenta.fecha_vencimiento,
                cuenta.estado
            );

            if (estadoVisual === "Vencida") {
                const dias = diferenciaDias(cuenta.fecha_vencimiento || hoy, hoy);

                notificaciones.push({
                    id: `cxp-vencida-${cuenta.id}-${cuenta.saldo}`,
                    tipo: "Proveedor",
                    modulo: "Proveedores",
                    titulo: "Cuenta por pagar vencida",
                    descripcion: `${cuenta.proveedor_nombre || "Proveedor"} tiene saldo pendiente de C$ ${numero(
                        cuenta.saldo
                    ).toLocaleString("es-NI")} por ${cuenta.concepto || "compra"
                        }. Vencida hace ${Math.max(dias, 1)} día(s).`,
                    prioridad: "Urgente",
                    fecha: cuenta.fecha_vencimiento || cuenta.fecha,
                    href: "/proveedores",
                });
            }
        });

    datos.productos
        .filter((producto) => producto.estado === "Activo")
        .forEach((producto) => {
            const stock = numero(producto.stock);
            const stockMinimo = numero(producto.stock_minimo);

            if (stock <= stockMinimo) {
                notificaciones.push({
                    id: `inventario-stock-${producto.id}-${stock}`,
                    tipo: "Inventario",
                    modulo: "Almacén e Inventario",
                    titulo: "Producto bajo stock",
                    descripcion: `${producto.nombre || "Producto"} tiene stock ${stock} ${producto.unidad || ""
                        }. Mínimo configurado: ${stockMinimo}.`,
                    prioridad: stock <= 0 ? "Urgente" : "Alta",
                    fecha: hoy,
                    href: "/inventario",
                });
            }

            if (producto.vencimiento) {
                const diasVencimiento = diferenciaDias(hoy, producto.vencimiento);

                if (diasVencimiento < 0) {
                    notificaciones.push({
                        id: `inventario-vencido-${producto.id}-${producto.vencimiento}`,
                        tipo: "Inventario",
                        modulo: "Almacén e Inventario",
                        titulo: "Producto vencido",
                        descripcion: `${producto.nombre || "Producto"} venció el ${producto.vencimiento
                            }. Revisar antes de usar o vender.`,
                        prioridad: "Urgente",
                        fecha: producto.vencimiento,
                        href: "/inventario",
                    });
                } else if (diasVencimiento <= 30) {
                    notificaciones.push({
                        id: `inventario-vence-${producto.id}-${producto.vencimiento}`,
                        tipo: "Inventario",
                        modulo: "Almacén e Inventario",
                        titulo: "Producto próximo a vencer",
                        descripcion: `${producto.nombre || "Producto"} vence en ${diasVencimiento} día(s).`,
                        prioridad: "Alta",
                        fecha: producto.vencimiento,
                        href: "/inventario",
                    });
                }
            }
        });

    const cierreHoy = datos.cierres.find(
        (cierre) => cierre.fecha === hoy && cierre.estado !== "Anulado"
    );

    if (!cierreHoy) {
        notificaciones.push({
            id: `cierre-pendiente-${hoy}`,
            tipo: "Caja",
            modulo: "Cierre de Caja",
            titulo: "Cierre de caja pendiente",
            descripcion: "Todavía no hay cierre de caja registrado para el día de hoy.",
            prioridad: "Media",
            fecha: hoy,
            href: "/cierre-caja",
        });
    }

    datos.cierres
        .filter(
            (cierre) =>
                cierre.fecha.startsWith(mesActual) &&
                cierre.estado === "Con diferencia"
        )
        .forEach((cierre) => {
            notificaciones.push({
                id: `cierre-diferencia-${cierre.id}-${cierre.fecha}`,
                tipo: "Caja",
                modulo: "Cierre de Caja",
                titulo: "Cierre con diferencia",
                descripcion: `El cierre del ${cierre.fecha} quedó con diferencia. Revisar efectivo, tarjeta o transferencia.`,
                prioridad: "Alta",
                fecha: cierre.fecha,
                href: "/cierre-caja",
            });
        });

    const gastosMes = datos.gastos.filter(
        (gasto) => gasto.estado === "Activo" && gasto.fecha.startsWith(mesActual)
    );

    const gastoMayor = gastosMes.reduce<GastoSupabase | null>((mayor, gasto) => {
        if (!mayor) return gasto;
        return numero(gasto.monto) > numero(mayor.monto) ? gasto : mayor;
    }, null);

    if (gastoMayor && numero(gastoMayor.monto) >= 5000) {
        notificaciones.push({
            id: `gasto-alto-${gastoMayor.id}-${gastoMayor.monto}`,
            tipo: "Caja",
            modulo: "Control de Gastos",
            titulo: "Gasto alto registrado",
            descripcion: `${gastoMayor.categoria || "Gasto"} por C$ ${numero(
                gastoMayor.monto
            ).toLocaleString("es-NI")} registrado el ${gastoMayor.fecha}.`,
            prioridad: "Media",
            fecha: gastoMayor.fecha,
            href: "/gastos",
        });
    }

    return notificaciones;
}

export default function NotificacionesPage() {
    const [notificaciones, setNotificaciones] = useState<NotificacionInterna[]>([]);
    const [revisadas, setRevisadas] = useState<string[]>([]);

    const [busqueda, setBusqueda] = useState("");
    const [filtroPrioridad, setFiltroPrioridad] = useState<
        PrioridadNotificacion | "Todas"
    >("Todas");
    const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("Pendientes");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    async function cargarNotificaciones() {
        setCargando(true);
        setError("");

        try {
            setRevisadas(leerRevisadas());

            const hoy = fechaHoyLocal();
            const enTresDias = fechaMasDias(3);

            const [
                citas,
                cuentasCobrar,
                cuentasPagar,
                productos,
                gastos,
                cierres,
            ] = await Promise.all([
                listarCitasSupabase(hoy, enTresDias),
                listarCuentasCobrarSupabase(),
                listarCuentasPagarSupabase(),
                listarProductosInventarioSupabase(),
                listarGastosSupabase(mesActualLocal()),
                listarCierresCajaSupabase(),
            ]);

            const cuentasConSaldo = cuentasCobrar.filter(
                (cuenta) =>
                    cuenta.estado !== "Pagada" &&
                    cuenta.estado !== "Anulada" &&
                    numero(cuenta.saldo) > 0
            );

            const abonosPorCuenta: Record<string, number> = {};

            await Promise.all(
                cuentasConSaldo.map(async (cuenta) => {
                    try {
                        const abonos = await listarAbonosCuentaSupabase(cuenta.id);
                        abonosPorCuenta[cuenta.id] = abonos.filter(
                            (abono) => abono.estado !== "Anulado"
                        ).length;
                    } catch {
                        abonosPorCuenta[cuenta.id] = 0;
                    }
                })
            );

            setNotificaciones(
                generarNotificacionesSupabase({
                    citas,
                    cuentasCobrar,
                    cuentasPagar,
                    productos,
                    gastos,
                    cierres,
                    abonosPorCuenta,
                })
            );
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudieron cargar las notificaciones desde Supabase.";

            setError(mensaje);
            setNotificaciones([]);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarNotificaciones();
    }, []);

    function marcarRevisada(id: string) {
        const nuevaLista = revisadas.includes(id) ? revisadas : [id, ...revisadas];

        setRevisadas(nuevaLista);
        guardarRevisadas(nuevaLista);
    }

    function marcarPendiente(id: string) {
        const nuevaLista = revisadas.filter((item) => item !== id);

        setRevisadas(nuevaLista);
        guardarRevisadas(nuevaLista);
    }

    function marcarTodasRevisadas() {
        const ids = notificaciones.map((notificacion) => notificacion.id);
        const nuevaLista = Array.from(new Set([...revisadas, ...ids]));

        setRevisadas(nuevaLista);
        guardarRevisadas(nuevaLista);
    }

    const notificacionesFiltradas = useMemo(() => {
        const texto = normalizarTexto(busqueda.trim());

        return notificaciones
            .filter((notificacion) => {
                const estaRevisada = revisadas.includes(notificacion.id);

                const coincideEstado =
                    filtroEstado === "Todas" ||
                    (filtroEstado === "Pendientes" && !estaRevisada) ||
                    (filtroEstado === "Revisadas" && estaRevisada);

                const coincidePrioridad =
                    filtroPrioridad === "Todas" ||
                    notificacion.prioridad === filtroPrioridad;

                const coincideTexto =
                    !texto ||
                    normalizarTexto(notificacion.titulo).includes(texto) ||
                    normalizarTexto(notificacion.descripcion).includes(texto) ||
                    normalizarTexto(notificacion.modulo).includes(texto) ||
                    normalizarTexto(notificacion.tipo).includes(texto) ||
                    normalizarTexto(notificacion.prioridad).includes(texto);

                return coincideEstado && coincidePrioridad && coincideTexto;
            })
            .sort((a, b) => {
                const prioridadOrden: Record<PrioridadNotificacion, number> = {
                    Urgente: 0,
                    Alta: 1,
                    Media: 2,
                    Baja: 3,
                };

                const diferenciaPrioridad =
                    prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad];

                if (diferenciaPrioridad !== 0) return diferenciaPrioridad;

                return String(b.fecha || "").localeCompare(String(a.fecha || ""));
            });
    }, [notificaciones, revisadas, busqueda, filtroEstado, filtroPrioridad]);

    const pendientes = notificaciones.filter(
        (notificacion) => !revisadas.includes(notificacion.id)
    );

    const urgentes = pendientes.filter(
        (notificacion) => notificacion.prioridad === "Urgente"
    );

    const altas = pendientes.filter(
        (notificacion) => notificacion.prioridad === "Alta"
    );

    const revisadasCount = notificaciones.filter((notificacion) =>
        revisadas.includes(notificacion.id)
    ).length;

    const resumenPorTipo = useMemo(() => {
        return notificaciones.reduce<Record<string, number>>((grupos, notificacion) => {
            grupos[notificacion.tipo] = (grupos[notificacion.tipo] || 0) + 1;
            return grupos;
        }, {});
    }, [notificaciones]);

    const resumenPorPrioridad = useMemo(() => {
        return PRIORIDADES_NOTIFICACION.map((prioridad) => ({
            prioridad,
            cantidad: notificaciones.filter(
                (notificacion) => notificacion.prioridad === prioridad
            ).length,
            pendientes: pendientes.filter(
                (notificacion) => notificacion.prioridad === prioridad
            ).length,
        }));
    }, [notificaciones, pendientes]);

    const hayFiltrosActivos =
        busqueda || filtroEstado !== "Pendientes" || filtroPrioridad !== "Todas";

    return (
        <AppShell
            titulo="Notificaciones"
            descripcion="Alertas internas, pendientes operativos y recordatorios importantes"
            moduloActivo="Notificaciones"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudieron cargar notificaciones
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
                        Notificaciones conectadas a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Las alertas se generan leyendo citas, caja, créditos, proveedores e inventario reales.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarNotificaciones}
                    disabled={cargando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    {cargando ? "Cargando..." : "Actualizar"}
                </button>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <div className="relative p-6 text-white md:p-7">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                    <Sparkles className="absolute right-10 top-10 h-24 w-24 opacity-10" />

                    <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="w-fit rounded-full bg-white/10 px-4 py-2 text-[12px] font-black uppercase tracking-[0.14em] text-teal-100">
                                Centro de alertas · Supabase
                            </p>

                            <h1 className="mt-5 text-3xl font-black md:text-5xl">
                                {textoResumen(notificaciones, revisadas)}
                            </h1>

                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 md:text-base">
                                Aquí se agrupan las alertas importantes de citas, caja,
                                créditos, inventario, proveedores y cierres de caja.
                            </p>
                        </div>

                        <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur md:min-w-[300px]">
                            <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm">
                                <span className="text-white/65">Pendientes</span>
                                <strong className="text-white">{pendientes.length}</strong>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl bg-red-500/10 px-4 py-3 text-sm">
                                <span className="text-red-100">Urgentes</span>
                                <strong className="text-red-100">{urgentes.length}</strong>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm">
                                <span className="text-emerald-100">Revisadas</span>
                                <strong className="text-emerald-100">
                                    {revisadasCount}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Inbox className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Bandeja
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-black leading-none text-slate-800">
                        {pendientes.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pendientes
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <AlertTriangle className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Urgente
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-black leading-none text-red-700">
                        {urgentes.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Requieren atención
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                            <Bell className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                            Alta
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-black leading-none text-orange-700">
                        {altas.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Alta prioridad
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Total
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-black leading-none text-slate-800">
                        {notificaciones.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Generadas
                    </p>
                </div>
            </section>

            <section className="mt-4 rounded-[28px] border border-white bg-white/80 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px]">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            placeholder="Buscar por módulo, paciente, producto, prioridad..."
                            className="w-full bg-transparent text-[13px] font-medium outline-none"
                        />
                    </div>

                    <select
                        value={filtroEstado}
                        onChange={(event) =>
                            setFiltroEstado(event.target.value as FiltroEstado)
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                    >
                        <option>Pendientes</option>
                        <option>Revisadas</option>
                        <option>Todas</option>
                    </select>

                    <select
                        value={filtroPrioridad}
                        onChange={(event) =>
                            setFiltroPrioridad(
                                event.target.value as PrioridadNotificacion | "Todas"
                            )
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                    >
                        <option>Todas</option>
                        {PRIORIDADES_NOTIFICACION.map((prioridad) => (
                            <option key={prioridad}>{prioridad}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Filter className="h-3.5 w-3.5" />
                        Mostrando{" "}
                        <strong className="text-slate-900">
                            {notificacionesFiltradas.length}
                        </strong>{" "}
                        de {notificaciones.length} notificaciones.
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={cargarNotificaciones}
                            disabled={cargando}
                            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                            Actualizar
                        </button>

                        <button
                            type="button"
                            onClick={marcarTodasRevisadas}
                            disabled={notificaciones.length === 0}
                            className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ClipboardCheck className="h-4 w-4" />
                            Marcar todas revisadas
                        </button>

                        {hayFiltrosActivos && (
                            <button
                                type="button"
                                onClick={() => {
                                    setBusqueda("");
                                    setFiltroEstado("Pendientes");
                                    setFiltroPrioridad("Todas");
                                }}
                                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                            >
                                <XCircle className="h-4 w-4" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-3">
                    {notificacionesFiltradas.map((notificacion) => {
                        const estaRevisada = revisadas.includes(notificacion.id);
                        const colores = colorPrioridad(notificacion.prioridad);

                        return (
                            <article
                                key={notificacion.id}
                                className={`overflow-hidden rounded-[26px] border bg-white/85 shadow-[0_14px_40px_rgba(15,23,42,0.05)] ${estaRevisada ? "border-slate-100 opacity-75" : colores.card
                                    }`}
                            >
                                <div className="p-5">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="flex min-w-0 gap-4">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-2xl text-white shadow-sm">
                                                {iconoTipo(notificacion.tipo)}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap gap-2">
                                                    <span
                                                        className={`rounded-full border px-3 py-1 text-[10px] font-black ${colores.badge}`}
                                                    >
                                                        {notificacion.prioridad}
                                                    </span>

                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                                                        {notificacion.modulo}
                                                    </span>

                                                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                                                        {notificacion.tipo}
                                                    </span>

                                                    {estaRevisada && (
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                                                            Revisada
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="mt-3 text-lg font-black text-slate-900 md:text-xl">
                                                    {notificacion.titulo}
                                                </h3>

                                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                                    {notificacion.descripcion}
                                                </p>

                                                <p className="mt-3 text-xs font-bold text-slate-400">
                                                    Fecha relacionada: {notificacion.fecha}
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className={`hidden h-3 w-3 rounded-full md:block ${colores.dot}`}
                                        />
                                    </div>

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Link
                                            href={notificacion.href}
                                            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800"
                                        >
                                            Abrir módulo
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Link>

                                        {!estaRevisada ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    marcarRevisada(notificacion.id)
                                                }
                                                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Marcar revisada
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    marcarPendiente(notificacion.id)
                                                }
                                                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                            >
                                                <Bell className="h-4 w-4" />
                                                Marcar pendiente
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}

                    {notificacionesFiltradas.length === 0 && (
                        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
                            <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
                            <h3 className="mt-3 text-xl font-black text-slate-800">
                                {cargando
                                    ? "Cargando notificaciones..."
                                    : "No hay notificaciones con estos filtros"}
                            </h3>
                            <p className="mt-2 text-sm text-slate-500">
                                {cargando
                                    ? "Estamos leyendo datos reales desde Supabase."
                                    : "Cambiá los filtros o actualizá las notificaciones."}
                            </p>
                        </div>
                    )}
                </div>

                <aside className="space-y-4 xl:sticky xl:top-4 xl:h-fit">
                    <div className="rounded-[28px] border border-white bg-white/80 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                        <h3 className="text-[16px] font-black text-slate-900">
                            Prioridades
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Resumen rápido de alertas generadas.
                        </p>

                        <div className="mt-4 space-y-2">
                            {resumenPorPrioridad.map((item) => {
                                const colores = colorPrioridad(item.prioridad);

                                return (
                                    <button
                                        key={item.prioridad}
                                        type="button"
                                        onClick={() =>
                                            setFiltroPrioridad(item.prioridad)
                                        }
                                        className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full ${colores.dot}`}
                                            />
                                            <div>
                                                <p
                                                    className={`text-sm font-black ${colores.text}`}
                                                >
                                                    {item.prioridad}
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    Pendientes: {item.pendientes}
                                                </p>
                                            </div>
                                        </div>

                                        <strong className="text-sm text-slate-800">
                                            {item.cantidad}
                                        </strong>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-white bg-white/80 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                        <h3 className="text-[16px] font-black text-slate-900">
                            Módulos con alertas
                        </h3>

                        <div className="mt-4 space-y-2">
                            {Object.entries(resumenPorTipo).map(([tipo, cantidad]) => (
                                <div
                                    key={tipo}
                                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">
                                            {iconoTipo(tipo as TipoNotificacion)}
                                        </span>
                                        <span className="text-sm font-black text-slate-700">
                                            {tipo}
                                        </span>
                                    </div>

                                    <strong className="text-sm text-slate-800">
                                        {cantidad}
                                    </strong>
                                </div>
                            ))}

                            {Object.keys(resumenPorTipo).length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
                                    <p className="text-sm font-bold text-slate-500">
                                        Sin alertas generadas.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800">
                        <h3 className="font-black">Cómo funcionan</h3>
                        <p className="mt-2 text-xs leading-5">
                            Estas notificaciones se generan automáticamente desde Supabase.
                            Por ahora el estado de revisada queda guardado en este navegador;
                            más adelante podemos guardarlo por usuario en una tabla propia.
                        </p>
                    </div>
                </aside>
            </section>
        </AppShell>
    );
}