"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    BadgeDollarSign,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    CreditCard,
    FileText,
    Plus,
    RefreshCcw,
    Save,
    Search,
    Stethoscope,
    Trash2,
    WalletCards,
    XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import { obtenerPacienteSupabase, type PacienteSupabase } from "@/lib/supabase/pacientes";
import {
    actualizarEstadoPresupuestoSupabase,
    convertirPresupuestoAVentaSupabase,
    crearPresupuestoSupabase,
    eliminarPresupuestoSupabase,
    listarPresupuestosPacienteSupabase,
    type CaraDentalSupabase,
    type EstadoDentalSupabase,
    type EstadoPresupuestoSupabase,
    type PresupuestoSupabase,
} from "@/lib/supabase/presupuestos";

type Paciente = {
    id: string;
    nombre: string;
    telefono: string;
    cedula: string;
    direccion: string;
    estado: "Activo" | "Inactivo";
};

type FormularioItemPresupuesto = {
    idLocal: string;
    nombre: string;
    descripcion: string;
    cantidad: string;
    precioUnitario: string;
    piezaCodigo: string;
    cara: CaraDentalSupabase | "";
    estadoDental: EstadoDentalSupabase | "";
};

type FormularioPresupuesto = {
    descuento: string;
    observaciones: string;
    items: FormularioItemPresupuesto[];
};

function crearItemVacio(): FormularioItemPresupuesto {
    return {
        idLocal:
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
        nombre: "",
        descripcion: "",
        cantidad: "1",
        precioUnitario: "",
        piezaCodigo: "",
        cara: "",
        estadoDental: "",
    };
}

const formularioVacio: FormularioPresupuesto = {
    descuento: "0",
    observaciones: "",
    items: [crearItemVacio()],
};

const carasDentales: { valor: CaraDentalSupabase; etiqueta: string }[] = [
    { valor: "sup", etiqueta: "Superior" },
    { valor: "der", etiqueta: "Derecha" },
    { valor: "inf", etiqueta: "Inferior" },
    { valor: "izq", etiqueta: "Izquierda" },
    { valor: "centro", etiqueta: "Oclusal / Centro" },
];

const estadosDentales: EstadoDentalSupabase[] = [
    "Sano",
    "Caries",
    "Resina",
    "Corona",
    "Ausente",
    "Extracción",
    "Endodoncia",
    "Implante",
    "Fractura",
    "Sellante",
    "Observación",
];

function numero(valor: unknown) {
    const convertido = Number(valor || 0);
    return Number.isNaN(convertido) ? 0 : convertido;
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

function etiquetaCara(cara?: CaraDentalSupabase | "" | null) {
    if (!cara) return "No especificada";
    return carasDentales.find((item) => item.valor === cara)?.etiqueta || cara;
}

function colorEstadoPresupuesto(estado: EstadoPresupuestoSupabase | string) {
    if (estado === "Aprobado") return "bg-emerald-50 text-emerald-700";
    if (estado === "Rechazado") return "bg-red-50 text-red-700";
    if (estado === "Convertido a venta") return "bg-blue-50 text-blue-700";
    return "bg-amber-50 text-amber-700";
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

export default function PresupuestosPacientePage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(CONFIGURACION_PREDETERMINADA);
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [presupuestos, setPresupuestos] = useState<PresupuestoSupabase[]>([]);
    const [formulario, setFormulario] = useState<FormularioPresupuesto>(() => ({
        ...formularioVacio,
        items: [crearItemVacio()],
    }));
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState<EstadoPresupuestoSupabase | "Todos">("Todos");
    const [busquedaPresupuesto, setBusquedaPresupuesto] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
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

            const [pacienteSupabase, presupuestosSupabase] = await Promise.all([
                obtenerPacienteSupabase(pacienteId),
                listarPresupuestosPacienteSupabase(pacienteId),
            ]);

            setPaciente(pacienteSupabase ? convertirPaciente(pacienteSupabase) : null);
            setPresupuestos(presupuestosSupabase);
        } catch (errorActual) {
            const mensaje = errorActual instanceof Error ? errorActual.message : "No se pudieron cargar los presupuestos desde Supabase.";
            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, [pacienteId]);

    function actualizarCampo<K extends keyof FormularioPresupuesto>(
        campo: K,
        valor: FormularioPresupuesto[K]
    ) {
        setFormulario((datosActuales) => ({ ...datosActuales, [campo]: valor }));
    }

    function actualizarItem<K extends keyof FormularioItemPresupuesto>(
        idLocal: string,
        campo: K,
        valor: FormularioItemPresupuesto[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            items: datosActuales.items.map((item) =>
                item.idLocal === idLocal ? { ...item, [campo]: valor } : item
            ),
        }));
    }

    function agregarItem() {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            items: [...datosActuales.items, crearItemVacio()],
        }));
    }

    function eliminarItem(idLocal: string) {
        setFormulario((datosActuales) => {
            if (datosActuales.items.length === 1) {
                return {
                    ...datosActuales,
                    items: [crearItemVacio()],
                };
            }

            return {
                ...datosActuales,
                items: datosActuales.items.filter((item) => item.idLocal !== idLocal),
            };
        });
    }

    function limpiarFormulario() {
        setFormulario({
            descuento: "0",
            observaciones: "",
            items: [crearItemVacio()],
        });
    }

    function abrirFormularioNuevo() {
        limpiarFormulario();
        setMostrarFormulario(true);
    }

    const subtotalFormulario = useMemo(() => {
        return formulario.items.reduce((total, item) => {
            return total + numero(item.cantidad) * numero(item.precioUnitario);
        }, 0);
    }, [formulario.items]);

    const descuentoFormulario = Math.max(0, numero(formulario.descuento));
    const totalFormulario = Math.max(0, subtotalFormulario - descuentoFormulario);

    async function crearPresupuestoManual(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!paciente) return;

        const itemsValidos = formulario.items
            .map((item) => ({
                ...item,
                nombre: item.nombre.trim(),
                descripcion: item.descripcion.trim(),
                piezaCodigo: item.piezaCodigo.trim(),
                cantidadNumero: numero(item.cantidad),
                precioUnitarioNumero: numero(item.precioUnitario),
            }))
            .filter((item) => item.nombre || item.descripcion || item.precioUnitarioNumero > 0);

        if (itemsValidos.length === 0) {
            alert("Agregá al menos un concepto al presupuesto.");
            return;
        }

        const itemSinNombre = itemsValidos.find((item) => !item.nombre);

        if (itemSinNombre) {
            alert("Cada concepto debe tener nombre de tratamiento o procedimiento.");
            return;
        }

        const itemCantidadInvalida = itemsValidos.find((item) => item.cantidadNumero <= 0);

        if (itemCantidadInvalida) {
            alert("La cantidad de cada concepto debe ser mayor que cero.");
            return;
        }

        const itemMontoInvalido = itemsValidos.find(
            (item) => item.precioUnitarioNumero < 0
        );

        if (itemMontoInvalido || descuentoFormulario < 0) {
            alert("Los montos no pueden ser negativos.");
            return;
        }

        setGuardando(true);
        setError("");

        try {
            await crearPresupuestoSupabase({
                paciente_id: paciente.id,
                descuento: descuentoFormulario,
                observaciones: formulario.observaciones.trim(),
                origen: "Manual",
                pieza_codigo: itemsValidos[0]?.piezaCodigo || "",
                cara: itemsValidos[0]?.cara || "",
                estado_dental: itemsValidos[0]?.estadoDental || "",
                items: itemsValidos.map((item) => ({
                    pieza_codigo: item.piezaCodigo || "",
                    pieza_numero: item.piezaCodigo || "",
                    cara: item.cara,
                    estado_dental: item.estadoDental,
                    nombre: item.nombre,
                    tratamiento: item.nombre,
                    descripcion: item.descripcion || "Sin descripción",
                    cantidad: item.cantidadNumero,
                    precio_unitario: item.precioUnitarioNumero,
                    estado: "Pendiente",
                })),
            });

            await cargarDatos();
            limpiarFormulario();
            setMostrarFormulario(false);
            alert("Presupuesto creado correctamente con varios conceptos.");
        } catch (errorActual) {
            const mensaje = errorActual instanceof Error ? errorActual.message : "No se pudo crear el presupuesto.";
            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function actualizarEstadoPresupuesto(presupuestoId: string, estado: EstadoPresupuestoSupabase) {
        setGuardando(true);
        setError("");
        try {
            await actualizarEstadoPresupuestoSupabase(presupuestoId, estado);
            await cargarDatos();
        } catch (errorActual) {
            const mensaje = errorActual instanceof Error ? errorActual.message : "No se pudo actualizar el presupuesto.";
            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function eliminarPresupuesto(presupuestoId: string) {
        if (!window.confirm("¿Seguro que deseas eliminar este presupuesto?")) return;
        setGuardando(true);
        setError("");
        try {
            await eliminarPresupuestoSupabase(presupuestoId);
            await cargarDatos();
        } catch (errorActual) {
            const mensaje = errorActual instanceof Error ? errorActual.message : "No se pudo eliminar el presupuesto.";
            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function convertirPresupuestoAVenta(presupuestoId: string) {
        if (!window.confirm("¿Deseás convertir este presupuesto en venta a crédito y generar cuenta por cobrar?")) return;
        setGuardando(true);
        setError("");
        try {
            await convertirPresupuestoAVentaSupabase(presupuestoId);
            await cargarDatos();
            alert("Presupuesto convertido a venta correctamente. Se generó una cuenta por cobrar.");
        } catch (errorActual) {
            const mensaje = errorActual instanceof Error ? errorActual.message : "No se pudo convertir el presupuesto a venta.";
            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    const presupuestosPaciente = useMemo(() => {
        return [...presupuestos].sort((a, b) => `${b.fecha} ${String(b.hora || "00:00").slice(0, 5)}`.localeCompare(`${a.fecha} ${String(a.hora || "00:00").slice(0, 5)}`));
    }, [presupuestos]);

    const presupuestosOdontograma = presupuestosPaciente.filter((p) => p.origen === "Odontograma" || p.pieza_codigo);
    const pendientes = presupuestosPaciente.filter((p) => p.estado === "Pendiente");
    const aprobados = presupuestosPaciente.filter((p) => p.estado === "Aprobado");
    const convertidos = presupuestosPaciente.filter((p) => p.estado === "Convertido a venta");
    const rechazados = presupuestosPaciente.filter((p) => p.estado === "Rechazado");

    const presupuestosFiltrados = useMemo(() => {
        const texto = busquedaPresupuesto.trim().toLowerCase();
        return presupuestosPaciente.filter((p) => {
            const cumpleEstado = filtroEstado === "Todos" || p.estado === filtroEstado;
            const textoItems = (p.items || []).map((item) => `${item.nombre} ${item.descripcion} ${item.pieza_codigo || ""}`).join(" ").toLowerCase();
            const cumpleBusqueda = !texto || p.id.toLowerCase().includes(texto) || p.paciente_nombre.toLowerCase().includes(texto) || (p.origen || "").toLowerCase().includes(texto) || (p.pieza_codigo || "").toLowerCase().includes(texto) || textoItems.includes(texto);
            return cumpleEstado && cumpleBusqueda;
        });
    }, [presupuestosPaciente, filtroEstado, busquedaPresupuesto]);

    const presupuestoReciente = presupuestosPaciente[0] || null;
    const totalPresupuestado = presupuestosPaciente.reduce((total, p) => total + numero(p.total), 0);
    const totalPendiente = pendientes.reduce((total, p) => total + numero(p.total), 0);
    const totalAprobado = aprobados.reduce((total, p) => total + numero(p.total), 0);

    if (!paciente && !cargando) {
        return (
            <AppShell titulo="Presupuestos" descripcion="Presupuestos del paciente" moduloActivo="Pacientes">
                <section className="glass-card rounded-3xl p-10 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h2 className="mt-5 text-2xl font-black text-slate-900">Paciente no encontrado</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">No encontramos el paciente solicitado.</p>
                    <Link href="/pacientes" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                        <ArrowLeft className="h-4 w-4" /> Volver a pacientes
                    </Link>
                </section>
            </AppShell>
        );
    }

    const filtrosEstado: { valor: EstadoPresupuestoSupabase | "Todos"; etiqueta: string; cantidad: number }[] = [
        { valor: "Todos", etiqueta: "Todos", cantidad: presupuestosPaciente.length },
        { valor: "Pendiente", etiqueta: "Pendientes", cantidad: pendientes.length },
        { valor: "Aprobado", etiqueta: "Aprobados", cantidad: aprobados.length },
        { valor: "Convertido a venta", etiqueta: "Convertidos", cantidad: convertidos.length },
        { valor: "Rechazado", etiqueta: "Rechazados", cantidad: rechazados.length },
    ];

    return (
        <AppShell titulo="Presupuestos" descripcion="Presupuestos clínicos conectados con odontograma, tratamientos y caja" moduloActivo="Presupuestos">
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">No se pudo procesar presupuestos</h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">{error}</p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">Presupuestos conectados a Supabase</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Los presupuestos se guardan por clínica y paciente en la base de datos.</p>
                </div>
                <button type="button" onClick={cargarDatos} disabled={cargando || guardando} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} /> {cargando ? "Cargando..." : "Recargar"}
                </button>
            </section>

            <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Link href={`/pacientes/${paciente?.id || pacienteId}`} className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                    <ArrowLeft className="h-4 w-4" /> Volver al perfil
                </Link>
                <div className="flex flex-wrap gap-2">
                    <Link href={`/pacientes/${paciente?.id || pacienteId}/odontograma`} className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-[12px] font-bold text-teal-700 hover:bg-teal-100">
                        <Stethoscope className="h-4 w-4" /> Odontograma
                    </Link>
                    <Link href="/caja" className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800">
                        <BadgeDollarSign className="h-4 w-4" /> Ir a caja
                    </Link>
                </div>
            </section>

            <section className="overflow-hidden rounded-[30px] bg-slate-900 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-0 xl:grid-cols-[1fr_390px]">
                    <div className="p-6 md:p-7">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><ClipboardList className="h-6 w-6 text-teal-300" /></div>
                        <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">Presupuestos de {paciente?.nombre || "paciente"}</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Creá, revisá, aprobá y convertí presupuestos a venta a crédito conectada a cuentas por cobrar.</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">Cédula: {paciente?.cedula || "No registrada"}</span>
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">Odontograma: {presupuestosOdontograma.length}</span>
                        </div>
                    </div>
                    <div className="border-t border-white/10 bg-white/10 p-6 backdrop-blur xl:border-l xl:border-t-0">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Resumen financiero</p>
                        <h3 className="mt-3 text-3xl font-black">{formatoMoneda(totalPresupuestado, configuracion.simboloMoneda)}</h3>
                        <p className="mt-2 text-sm text-white/50">Total histórico presupuestado para este paciente.</p>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white/10 p-4"><p className="text-[10px] font-bold text-white/45">Pendiente</p><p className="mt-1 text-lg font-black text-amber-300">{formatoMoneda(totalPendiente, configuracion.simboloMoneda)}</p></div>
                            <div className="rounded-2xl bg-white/10 p-4"><p className="text-[10px] font-bold text-white/45">Aprobado</p><p className="mt-1 text-lg font-black text-emerald-300">{formatoMoneda(totalAprobado, configuracion.simboloMoneda)}</p></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5"><FileText className="h-5 w-5 text-blue-700" /><h3 className="mt-4 text-[30px] font-black text-slate-800">{presupuestosPaciente.length}</h3><p className="text-xs font-semibold text-slate-500">Registrados</p></div>
                <div className="glass-card rounded-2xl p-5"><WalletCards className="h-5 w-5 text-amber-700" /><h3 className="mt-4 text-[22px] font-black text-slate-800">{formatoMoneda(totalPendiente, configuracion.simboloMoneda)}</h3><p className="text-xs font-semibold text-slate-500">Pendiente</p></div>
                <div className="glass-card rounded-2xl p-5"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><h3 className="mt-4 text-[30px] font-black text-slate-800">{aprobados.length}</h3><p className="text-xs font-semibold text-slate-500">Aprobados</p></div>
                <div className="glass-card rounded-2xl p-5"><CreditCard className="h-5 w-5 text-teal-700" /><h3 className="mt-4 text-[30px] font-black text-slate-800">{convertidos.length}</h3><p className="text-xs font-semibold text-slate-500">Convertidos</p></div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-3xl">
                <div className="border-b border-black/[0.04] px-5 py-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div><h3 className="text-[18px] font-black text-slate-800">Centro de presupuestos</h3><p className="mt-1 text-xs text-slate-500">Buscá, filtrá y gestioná presupuestos desde una vista limpia.</p></div>
                        <button type="button" onClick={abrirFormularioNuevo} disabled={guardando || cargando} className="flex w-fit items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"><Plus className="h-4 w-4" /> Nuevo presupuesto</button>
                    </div>
                </div>

                <div className="border-b border-black/[0.04] bg-slate-50/70 p-4">
                    <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
                        <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={busquedaPresupuesto} onChange={(event) => setBusquedaPresupuesto(event.target.value)} placeholder="Buscar por número, tratamiento, pieza, origen o paciente..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div>
                        <div className="flex flex-wrap gap-2">{filtrosEstado.map((filtro) => (<button key={filtro.valor} type="button" onClick={() => setFiltroEstado(filtro.valor)} className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${filtroEstado === filtro.valor ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>{filtro.etiqueta} · {filtro.cantidad}</button>))}</div>
                    </div>
                </div>

                <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                        {presupuestosFiltrados.map((presupuesto) => {
                            const items = presupuesto.items || [];
                            const itemPrincipal = items[0];
                            return (
                                <article key={presupuesto.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-slate-200 hover:shadow-md">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`rounded-full px-3 py-1 text-[10px] font-black ${colorEstadoPresupuesto(presupuesto.estado)}`}>{presupuesto.estado}</span>
                                                <span className="mono rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">{fechaLegible(presupuesto.fecha)} · {String(presupuesto.hora || "00:00").slice(0, 5)}</span>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">{presupuesto.origen || "Manual"}</span>
                                            </div>
                                            <h4 className="mt-3 truncate text-xl font-black text-slate-900">{itemPrincipal?.nombre || `Presupuesto ${presupuesto.id}`}</h4>
                                            <p className="mt-1 break-all text-xs leading-5 text-slate-500">Presupuesto {presupuesto.id} · Registrado por {presupuesto.usuario_nombre || "Usuario no identificado"}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-4 text-left lg:min-w-[190px] lg:text-right"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Total</p><p className="mt-1 text-2xl font-black text-slate-900">{formatoMoneda(numero(presupuesto.total), configuracion.simboloMoneda)}</p></div>
                                    </div>

                                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                                        <table className="w-full"><thead><tr className="bg-slate-50"><th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Tratamiento</th><th className="hidden px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 md:table-cell">Cant.</th><th className="hidden px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 md:table-cell">Precio</th><th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Total</th></tr></thead>
                                            <tbody>{items.slice(0, 4).map((item) => (<tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-4 align-top"><p className="text-sm font-black text-slate-800">{item.nombre}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.descripcion}</p>{(item.pieza_codigo || item.cara || item.estado_dental) && (<div className="mt-2 flex flex-wrap gap-2">{item.pieza_codigo && <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">Pieza {item.pieza_codigo}</span>}{item.cara && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{etiquetaCara(item.cara)}</span>}{item.estado_dental && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">{item.estado_dental}</span>}</div>)}</td><td className="hidden px-4 py-4 text-center text-sm font-black text-slate-700 md:table-cell">{Number(item.cantidad || 0)}</td><td className="hidden px-4 py-4 text-right text-sm font-black text-slate-700 md:table-cell">{formatoMoneda(Number(item.precio_unitario || 0), configuracion.simboloMoneda)}</td><td className="px-4 py-4 text-right text-sm font-black text-slate-900">{formatoMoneda(Number(item.total || 0), configuracion.simboloMoneda)}</td></tr>))}</tbody></table>
                                    </div>

                                    {items.length > 4 && (<p className="mt-3 text-xs font-bold text-slate-400">+ {items.length - 4} concepto(s) más. Abrí el presupuesto para ver el detalle completo.</p>)}

                                    {presupuesto.observaciones && (<div className="mt-4 rounded-2xl bg-blue-50 p-4"><p className="text-[10px] font-bold text-blue-700">Observaciones</p><p className="mt-1 text-xs leading-5 text-blue-700">{presupuesto.observaciones}</p></div>)}

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Link href={`/presupuestos/${presupuesto.id}`} className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-[12px] font-bold text-blue-700 hover:bg-blue-100"><FileText className="h-4 w-4" /> Ver / imprimir</Link>
                                        {presupuesto.estado !== "Aprobado" && presupuesto.estado !== "Convertido a venta" && (<button type="button" disabled={guardando} onClick={() => actualizarEstadoPresupuesto(presupuesto.id, "Aprobado")} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Aprobar</button>)}
                                        {presupuesto.estado !== "Rechazado" && presupuesto.estado !== "Convertido a venta" && (<button type="button" disabled={guardando} onClick={() => actualizarEstadoPresupuesto(presupuesto.id, "Rechazado")} className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"><XCircle className="h-4 w-4" /> Rechazar</button>)}
                                        {presupuesto.estado !== "Convertido a venta" && presupuesto.estado !== "Rechazado" && (<button type="button" disabled={guardando} onClick={() => convertirPresupuestoAVenta(presupuesto.id)} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800 disabled:opacity-60"><CreditCard className="h-4 w-4" /> Convertir a venta</button>)}
                                        <button type="button" disabled={guardando} onClick={() => eliminarPresupuesto(presupuesto.id)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><Trash2 className="h-4 w-4" /> Eliminar</button>
                                    </div>
                                </article>
                            );
                        })}

                        {presupuestosFiltrados.length === 0 && (<div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center"><ClipboardList className="mx-auto h-10 w-10 text-slate-300" /><h4 className="mt-3 text-sm font-black text-slate-700">{cargando ? "Cargando presupuestos..." : "No hay presupuestos con ese filtro"}</h4><p className="mt-1 text-xs text-slate-400">{cargando ? "Consultando datos desde Supabase." : "Cambiá el filtro, limpiá la búsqueda o creá un nuevo presupuesto."}</p></div>)}
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-amber-700" /><h3 className="text-sm font-black text-slate-800">Último presupuesto</h3></div>{presupuestoReciente ? (<div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="mono break-all text-[10px] font-bold text-slate-400">{presupuestoReciente.id}</p><p className="mt-2 text-sm font-black text-slate-900">{fechaLegible(presupuestoReciente.fecha)} · {String(presupuestoReciente.hora || "00:00").slice(0, 5)}</p><p className="mt-1 text-xs text-slate-500">Estado: {presupuestoReciente.estado}</p><p className="mt-3 text-xl font-black text-slate-900">{formatoMoneda(Number(presupuestoReciente.total || 0), configuracion.simboloMoneda)}</p></div>) : (<p className="mt-3 text-xs leading-5 text-slate-500">Aún no hay presupuestos registrados para este paciente.</p>)}</div>
                    </aside>
                </div>
            </section>

            {mostrarFormulario && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-6xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
                        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-900 px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-xl font-black">Nuevo presupuesto manual</h3>
                                <p className="mt-1 text-xs text-white/50">
                                    Agregá varios tratamientos, productos o procedimientos dentro del mismo presupuesto.
                                </p>
                            </div>
                            <button type="button" onClick={() => setMostrarFormulario(false)} className="flex w-fit items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-[12px] font-bold text-white hover:bg-white/15"><XCircle className="h-4 w-4" /> Cerrar</button>
                        </div>

                        <form onSubmit={crearPresupuestoManual} className="space-y-5 p-6">
                            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800">
                                            Conceptos del presupuesto
                                        </h4>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Podés agregar varias líneas. El subtotal y total se calculan automáticamente.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={agregarItem}
                                        className="flex w-fit items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-[12px] font-black text-white hover:bg-teal-700"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Agregar concepto
                                    </button>
                                </div>

                                <div className="mt-4 space-y-4">
                                    {formulario.items.map((item, indice) => {
                                        const totalItem = numero(item.cantidad) * numero(item.precioUnitario);

                                        return (
                                            <div
                                                key={item.idLocal}
                                                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                                            >
                                                <div className="mb-4 flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800">
                                                            Concepto {indice + 1}
                                                        </p>
                                                        <p className="mt-0.5 text-xs font-semibold text-slate-400">
                                                            Total: {formatoMoneda(totalItem, configuracion.simboloMoneda)}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => eliminarItem(item.idLocal)}
                                                        className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-black text-red-700 hover:bg-red-100"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Quitar
                                                    </button>
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-[1fr_120px_170px]">
                                                    <div>
                                                        <label className="mb-2 block text-[12px] font-black text-slate-700">
                                                            Tratamiento / Procedimiento *
                                                        </label>
                                                        <input
                                                            value={item.nombre}
                                                            onChange={(event) =>
                                                                actualizarItem(item.idLocal, "nombre", event.target.value)
                                                            }
                                                            placeholder="Ejemplo: Limpieza dental, resina, extracción..."
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-[12px] font-black text-slate-700">
                                                            Cantidad
                                                        </label>
                                                        <input
                                                            value={item.cantidad}
                                                            onChange={(event) =>
                                                                actualizarItem(item.idLocal, "cantidad", event.target.value)
                                                            }
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-[12px] font-black text-slate-700">
                                                            Precio unitario
                                                        </label>
                                                        <input
                                                            value={item.precioUnitario}
                                                            onChange={(event) =>
                                                                actualizarItem(item.idLocal, "precioUnitario", event.target.value)
                                                            }
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                                        Descripción
                                                    </label>
                                                    <textarea
                                                        value={item.descripcion}
                                                        onChange={(event) =>
                                                            actualizarItem(item.idLocal, "descripcion", event.target.value)
                                                        }
                                                        rows={2}
                                                        placeholder="Detalle del tratamiento, condiciones o material utilizado..."
                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    />
                                                </div>

                                                <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                                                    <h5 className="text-xs font-black text-slate-700">
                                                        Relación odontológica opcional
                                                    </h5>

                                                    <div className="mt-3 grid gap-4 md:grid-cols-3">
                                                        <input
                                                            value={item.piezaCodigo}
                                                            onChange={(event) =>
                                                                actualizarItem(item.idLocal, "piezaCodigo", event.target.value)
                                                            }
                                                            placeholder="Pieza FDI. Ej: 16"
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                        />

                                                        <select
                                                            value={item.cara}
                                                            onChange={(event) =>
                                                                actualizarItem(
                                                                    item.idLocal,
                                                                    "cara",
                                                                    event.target.value as CaraDentalSupabase | ""
                                                                )
                                                            }
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                        >
                                                            <option value="">Cara dental</option>
                                                            {carasDentales.map((cara) => (
                                                                <option key={cara.valor} value={cara.valor}>{cara.etiqueta}</option>
                                                            ))}
                                                        </select>

                                                        <select
                                                            value={item.estadoDental}
                                                            onChange={(event) =>
                                                                actualizarItem(
                                                                    item.idLocal,
                                                                    "estadoDental",
                                                                    event.target.value as EstadoDentalSupabase | ""
                                                                )
                                                            }
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                        >
                                                            <option value="">Estado dental</option>
                                                            {estadosDentales.map((estado) => (<option key={estado}>{estado}</option>))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Observaciones generales
                                    </label>
                                    <textarea
                                        value={formulario.observaciones}
                                        onChange={(event) => actualizarCampo("observaciones", event.target.value)}
                                        rows={5}
                                        placeholder="Condiciones, vigencia, notas para el paciente..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div className="rounded-3xl bg-slate-900 p-5 text-white">
                                    <h4 className="text-sm font-black">
                                        Resumen del presupuesto
                                    </h4>

                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-xs font-semibold text-white/50">Subtotal</span>
                                            <span className="text-sm font-black">
                                                {formatoMoneda(subtotalFormulario, configuracion.simboloMoneda)}
                                            </span>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-white/60">
                                                Descuento
                                            </label>
                                            <input
                                                value={formulario.descuento}
                                                onChange={(event) => actualizarCampo("descuento", event.target.value)}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div className="border-t border-white/10 pt-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-xs font-semibold text-white/50">Total</span>
                                                <span className="text-2xl font-black text-teal-300">
                                                    {formatoMoneda(totalFormulario, configuracion.simboloMoneda)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        limpiarFormulario();
                                        setMostrarFormulario(false);
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={guardando}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Save className="h-4 w-4" />
                                    {guardando ? "Guardando..." : "Guardar presupuesto"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}