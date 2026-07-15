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
    ReceiptText,
    Save,
    Search,
    ShieldAlert,
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

type CaraDental = "sup" | "der" | "inf" | "izq" | "centro";

type EstadoDental =
    | "Sano"
    | "Caries"
    | "Resina"
    | "Corona"
    | "Ausente"
    | "Extracción"
    | "Endodoncia"
    | "Implante"
    | "Fractura"
    | "Sellante"
    | "Observación";

type EstadoPresupuesto =
    | "Pendiente"
    | "Aprobado"
    | "Rechazado"
    | "Convertido a venta";

type ItemPresupuesto = {
    id: string;
    piezaCodigo?: string;
    piezaNumero?: string;
    cara?: CaraDental;
    estadoDental?: EstadoDental;
    nombre: string;
    tratamiento?: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    precio?: number;
    subtotal: number;
    total: number;
    estado?: string;
};

type Presupuesto = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora?: string;
    estado: EstadoPresupuesto;
    subtotal: number;
    descuento: number;
    total: number;
    observaciones: string;
    origen?: "Manual" | "Odontograma" | string;
    piezaCodigo?: string;
    cara?: CaraDental;
    estadoDental?: EstadoDental;
    usuarioNombre?: string;
    items?: ItemPresupuesto[];
    tratamientos?: ItemPresupuesto[];
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
};

type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia";

type AbonoCuenta = {
    id: string;
    fecha: string;
    hora: string;
    monto: number;
    metodo: MetodoPago;
};

type EstadoCuenta = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

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
    abonos: AbonoCuenta[];
};

type FormularioPresupuesto = {
    nombre: string;
    descripcion: string;
    cantidad: string;
    precioUnitario: string;
    descuento: string;
    observaciones: string;
    piezaCodigo: string;
    cara: CaraDental | "";
    estadoDental: EstadoDental | "";
};

const PRESUPUESTOS_KEY = "presupuestos_sistema_clinico";
const VENTAS_KEY = "ventas_sistema_clinico";
const CUENTAS_COBRAR_KEY = "cuentas_cobrar_sistema_clinico";

const formularioVacio: FormularioPresupuesto = {
    nombre: "",
    descripcion: "",
    cantidad: "1",
    precioUnitario: "",
    descuento: "0",
    observaciones: "",
    piezaCodigo: "",
    cara: "",
    estadoDental: "",
};

const carasDentales: { valor: CaraDental; etiqueta: string }[] = [
    { valor: "sup", etiqueta: "Superior" },
    { valor: "der", etiqueta: "Derecha" },
    { valor: "inf", etiqueta: "Inferior" },
    { valor: "izq", etiqueta: "Izquierda" },
    { valor: "centro", etiqueta: "Oclusal / Centro" },
];

const estadosDentales: EstadoDental[] = [
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

function sumarDias(fechaTexto: string, dias: number) {
    const [year, month, day] = fechaTexto.split("-").map(Number);
    const fecha = new Date(year, month - 1, day);

    fecha.setDate(fecha.getDate() + dias);

    const nuevoYear = fecha.getFullYear();
    const nuevoMonth = String(fecha.getMonth() + 1).padStart(2, "0");
    const nuevoDay = String(fecha.getDate()).padStart(2, "0");

    return `${nuevoYear}-${nuevoMonth}-${nuevoDay}`;
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

function etiquetaCara(cara?: CaraDental | "") {
    if (!cara) return "No especificada";

    return carasDentales.find((item) => item.valor === cara)?.etiqueta || cara;
}

function colorEstadoPresupuesto(estado: EstadoPresupuesto | string) {
    if (estado === "Aprobado") return "bg-emerald-50 text-emerald-700";
    if (estado === "Rechazado") return "bg-red-50 text-red-700";
    if (estado === "Convertido a venta") return "bg-blue-50 text-blue-700";

    return "bg-amber-50 text-amber-700";
}

function normalizarItem(item: Partial<ItemPresupuesto>, index: number) {
    const cantidad = numero(item.cantidad || 1);
    const precioUnitario = numero(item.precioUnitario || item.precio || item.total);
    const subtotal = numero(item.subtotal || cantidad * precioUnitario);
    const total = numero(item.total || subtotal);

    const itemNormalizado: ItemPresupuesto = {
        id: item.id || `ITEM-${index}-${Date.now()}`,
        piezaCodigo: item.piezaCodigo || item.piezaNumero || "",
        piezaNumero: item.piezaNumero || item.piezaCodigo || "",
        cara: item.cara,
        estadoDental: item.estadoDental,
        nombre: item.nombre || item.tratamiento || "Tratamiento odontológico",
        tratamiento: item.tratamiento || item.nombre || "Tratamiento odontológico",
        descripcion: item.descripcion || "Sin descripción",
        cantidad: cantidad || 1,
        precioUnitario,
        precio: numero(item.precio || precioUnitario),
        subtotal,
        total,
        estado: item.estado || "Pendiente",
    };

    return itemNormalizado;
}

function obtenerItemsPresupuesto(presupuesto: Presupuesto) {
    const fuente =
        presupuesto.items && presupuesto.items.length > 0
            ? presupuesto.items
            : presupuesto.tratamientos || [];

    return fuente.map((item, index) => normalizarItem(item, index));
}

export default function PresupuestosPacientePage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [paciente, setPaciente] = useState<Paciente | null>(null);

    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [formulario, setFormulario] =
        useState<FormularioPresupuesto>(formularioVacio);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [filtroEstado, setFiltroEstado] =
        useState<EstadoPresupuesto | "Todos">("Todos");
    const [busquedaPresupuesto, setBusquedaPresupuesto] = useState("");

    useEffect(() => {
        setConfiguracion(obtenerConfiguracionClinica());

        setUsuario(
            leerLocalStorage<UsuarioSistema | null>("usuario_sistema_clinico", null)
        );

        const pacientes = leerLocalStorage<Paciente[]>(
            "pacientes_sistema_clinico",
            []
        );

        setPaciente(pacientes.find((item) => item.id === pacienteId) || null);
        setPresupuestos(leerLocalStorage<Presupuesto[]>(PRESUPUESTOS_KEY, []));
        setVentas(leerLocalStorage<Venta[]>(VENTAS_KEY, []));
        setCuentas(leerLocalStorage<CuentaPorCobrar[]>(CUENTAS_COBRAR_KEY, []));
    }, [pacienteId]);

    function guardarPresupuestos(nuevaLista: Presupuesto[]) {
        setPresupuestos(nuevaLista);
        guardarLocalStorage(PRESUPUESTOS_KEY, nuevaLista);
    }

    function guardarVentas(nuevaLista: Venta[]) {
        setVentas(nuevaLista);
        guardarLocalStorage(VENTAS_KEY, nuevaLista);
    }

    function guardarCuentas(nuevaLista: CuentaPorCobrar[]) {
        setCuentas(nuevaLista);
        guardarLocalStorage(CUENTAS_COBRAR_KEY, nuevaLista);
    }

    function actualizarCampo<K extends keyof FormularioPresupuesto>(
        campo: K,
        valor: FormularioPresupuesto[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function crearPresupuestoManual(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!paciente) return;

        if (!formulario.nombre.trim()) {
            alert("Indicá el nombre del tratamiento o procedimiento.");
            return;
        }

        const cantidad = numero(formulario.cantidad);
        const precioUnitario = numero(formulario.precioUnitario);
        const descuento = numero(formulario.descuento);

        if (cantidad <= 0) {
            alert("La cantidad debe ser mayor que cero.");
            return;
        }

        if (precioUnitario < 0 || descuento < 0) {
            alert("Los montos no pueden ser negativos.");
            return;
        }

        const subtotal = cantidad * precioUnitario;

        if (descuento > subtotal) {
            alert("El descuento no puede ser mayor que el subtotal.");
            return;
        }

        const total = subtotal - descuento;

        const item: ItemPresupuesto = {
            id: `ITEM-${Date.now()}`,
            piezaCodigo: formulario.piezaCodigo.trim() || "",
            piezaNumero: formulario.piezaCodigo.trim() || "",
            cara: formulario.cara || undefined,
            estadoDental: formulario.estadoDental || undefined,
            nombre: formulario.nombre.trim(),
            tratamiento: formulario.nombre.trim(),
            descripcion: formulario.descripcion.trim() || "Sin descripción",
            cantidad,
            precioUnitario,
            precio: precioUnitario,
            subtotal,
            total,
            estado: "Pendiente",
        };

        const nuevoPresupuesto: Presupuesto = {
            id: `PRES-${Date.now()}`,
            pacienteId: paciente.id,
            pacienteNombre: paciente.nombre,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            estado: "Pendiente",
            subtotal,
            descuento,
            total,
            observaciones: formulario.observaciones.trim(),
            origen: "Manual",
            piezaCodigo: formulario.piezaCodigo.trim() || "",
            cara: formulario.cara || undefined,
            estadoDental: formulario.estadoDental || undefined,
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
            items: [item],
            tratamientos: [item],
        };

        guardarPresupuestos([nuevoPresupuesto, ...presupuestos]);
        setFormulario(formularioVacio);
        setMostrarFormulario(false);

        alert("Presupuesto creado correctamente.");
    }

    function actualizarEstadoPresupuesto(
        presupuestoId: string,
        estado: EstadoPresupuesto
    ) {
        const nuevaLista = presupuestos.map((presupuesto) =>
            presupuesto.id === presupuestoId
                ? {
                    ...presupuesto,
                    estado,
                }
                : presupuesto
        );

        guardarPresupuestos(nuevaLista);
    }

    function eliminarPresupuesto(presupuestoId: string) {
        const confirmar = window.confirm(
            "¿Seguro que deseas eliminar este presupuesto?"
        );

        if (!confirmar) return;

        guardarPresupuestos(
            presupuestos.filter((presupuesto) => presupuesto.id !== presupuestoId)
        );
    }

    function convertirPresupuestoAVenta(presupuesto: Presupuesto) {
        if (!paciente) return;

        if (presupuesto.estado === "Convertido a venta") {
            alert("Este presupuesto ya fue convertido a venta.");
            return;
        }

        if (presupuesto.estado === "Rechazado") {
            alert("No podés convertir un presupuesto rechazado.");
            return;
        }

        const total = numero(presupuesto.total);

        if (total <= 0) {
            alert("El presupuesto debe tener un total mayor que cero.");
            return;
        }

        const items = obtenerItemsPresupuesto(presupuesto);

        const concepto =
            items.length > 0
                ? items
                    .map((item) =>
                        item.piezaCodigo
                            ? `${item.nombre} · Pieza ${item.piezaCodigo}`
                            : item.nombre
                    )
                    .join(", ")
                    .slice(0, 180)
                : `Presupuesto ${presupuesto.id}`;

        const ventaId = `VENTA-${Date.now()}`;

        const nuevaVenta: Venta = {
            id: ventaId,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            tipoCobro: "Presupuesto convertido",
            citaId: "",
            pacienteId: paciente.id,
            clienteNombre: paciente.nombre,
            concepto,
            total,
            efectivo: 0,
            tarjeta: 0,
            transferencia: 0,
            credito: total,
            estado: "Crédito",
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
            observaciones: `Venta generada desde presupuesto ${presupuesto.id}. Queda como crédito pendiente por cobrar.`,
        };

        const nuevaCuenta: CuentaPorCobrar = {
            id: `CXC-${Date.now()}`,
            ventaId,
            pacienteId: paciente.id,
            pacienteNombre: paciente.nombre,
            concepto,
            total,
            saldo: total,
            fecha: fechaHoyLocal(),
            fechaVencimiento: sumarDias(fechaHoyLocal(), 30),
            estado: "Pendiente",
            abonos: [],
        };

        guardarVentas([nuevaVenta, ...ventas]);
        guardarCuentas([nuevaCuenta, ...cuentas]);

        const nuevaLista = presupuestos.map((item) =>
            item.id === presupuesto.id
                ? {
                    ...item,
                    estado: "Convertido a venta" as EstadoPresupuesto,
                }
                : item
        );

        guardarPresupuestos(nuevaLista);

        alert(
            "Presupuesto convertido a venta correctamente. Se generó una cuenta por cobrar."
        );
    }

    const presupuestosPaciente = useMemo(() => {
        return presupuestos
            .filter(
                (presupuesto) =>
                    presupuesto.pacienteId === pacienteId ||
                    presupuesto.pacienteNombre?.toLowerCase() ===
                    (paciente?.nombre || "").toLowerCase()
            )
            .sort((a, b) =>
                `${b.fecha} ${b.hora || "00:00"}`.localeCompare(
                    `${a.fecha} ${a.hora || "00:00"}`
                )
            );
    }, [presupuestos, pacienteId, paciente]);

    const presupuestosOdontograma = presupuestosPaciente.filter(
        (presupuesto) => presupuesto.origen === "Odontograma" || presupuesto.piezaCodigo
    );

    const pendientes = presupuestosPaciente.filter(
        (presupuesto) => presupuesto.estado === "Pendiente"
    );

    const aprobados = presupuestosPaciente.filter(
        (presupuesto) => presupuesto.estado === "Aprobado"
    );

    const convertidos = presupuestosPaciente.filter(
        (presupuesto) => presupuesto.estado === "Convertido a venta"
    );

    const rechazados = presupuestosPaciente.filter(
        (presupuesto) => presupuesto.estado === "Rechazado"
    );

    const presupuestosFiltrados = useMemo(() => {
        const texto = busquedaPresupuesto.trim().toLowerCase();

        return presupuestosPaciente.filter((presupuesto) => {
            const cumpleEstado =
                filtroEstado === "Todos" || presupuesto.estado === filtroEstado;

            const items = obtenerItemsPresupuesto(presupuesto);
            const textoItems = items
                .map((item) => `${item.nombre} ${item.descripcion} ${item.piezaCodigo || ""}`)
                .join(" ")
                .toLowerCase();

            const cumpleBusqueda =
                !texto ||
                presupuesto.id.toLowerCase().includes(texto) ||
                presupuesto.pacienteNombre.toLowerCase().includes(texto) ||
                (presupuesto.origen || "").toLowerCase().includes(texto) ||
                (presupuesto.piezaCodigo || "").toLowerCase().includes(texto) ||
                textoItems.includes(texto);

            return cumpleEstado && cumpleBusqueda;
        });
    }, [presupuestosPaciente, filtroEstado, busquedaPresupuesto]);

    const presupuestoReciente = presupuestosPaciente[0] || null;

    const totalPresupuestado = presupuestosPaciente.reduce(
        (total, presupuesto) => total + numero(presupuesto.total),
        0
    );

    const totalPendiente = pendientes.reduce(
        (total, presupuesto) => total + numero(presupuesto.total),
        0
    );

    const totalAprobado = aprobados.reduce(
        (total, presupuesto) => total + numero(presupuesto.total),
        0
    );

    if (!paciente) {
        return (
            <AppShell
                titulo="Presupuestos"
                descripcion="Presupuestos del paciente"
                moduloActivo="Pacientes"
            >
                <section className="glass-card rounded-3xl p-10 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <FileText className="h-8 w-8" />
                    </div>

                    <h2 className="mt-5 text-2xl font-black text-slate-900">
                        Paciente no encontrado
                    </h2>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        No encontramos el paciente solicitado. Volvé al directorio de
                        pacientes y abrí presupuestos desde el perfil.
                    </p>

                    <Link
                        href="/pacientes"
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a pacientes
                    </Link>
                </section>
            </AppShell>
        );
    }

    const filtrosEstado: {
        valor: EstadoPresupuesto | "Todos";
        etiqueta: string;
        cantidad: number;
    }[] = [
            { valor: "Todos", etiqueta: "Todos", cantidad: presupuestosPaciente.length },
            { valor: "Pendiente", etiqueta: "Pendientes", cantidad: pendientes.length },
            { valor: "Aprobado", etiqueta: "Aprobados", cantidad: aprobados.length },
            {
                valor: "Convertido a venta",
                etiqueta: "Convertidos",
                cantidad: convertidos.length,
            },
            { valor: "Rechazado", etiqueta: "Rechazados", cantidad: rechazados.length },
        ];

    return (
        <AppShell
            titulo="Presupuestos"
            descripcion="Presupuestos clínicos conectados con odontograma, tratamientos y caja"
            moduloActivo="Pacientes"
        >
            <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Link
                    href={`/pacientes/${paciente.id}`}
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al perfil
                </Link>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/pacientes/${paciente.id}/odontograma`}
                        className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-[12px] font-bold text-teal-700 hover:bg-teal-100"
                    >
                        <Stethoscope className="h-4 w-4" />
                        Odontograma
                    </Link>

                    <Link
                        href="/caja"
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                    >
                        <BadgeDollarSign className="h-4 w-4" />
                        Ir a caja
                    </Link>
                </div>
            </section>

            <section className="overflow-hidden rounded-[30px] bg-slate-900 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-0 xl:grid-cols-[1fr_390px]">
                    <div className="p-6 md:p-7">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <ClipboardList className="h-6 w-6 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                            Presupuestos de {paciente.nombre}
                        </h2>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                            Pantalla rediseñada para crear, revisar y aprobar presupuestos
                            sin sobrecargar la vista. Los presupuestos del odontograma mantienen
                            pieza FDI, cara dental y estado clínico.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Paciente: {paciente.nombre}
                            </span>
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Cédula: {paciente.cedula || "No registrada"}
                            </span>
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Odontograma: {presupuestosOdontograma.length}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-white/10 bg-white/10 p-6 backdrop-blur xl:border-l xl:border-t-0">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Resumen financiero
                        </p>

                        <h3 className="mt-3 text-3xl font-black">
                            {formatoMoneda(totalPresupuestado, configuracion.simboloMoneda)}
                        </h3>

                        <p className="mt-2 text-sm text-white/50">
                            Total histórico presupuestado para este paciente.
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white/10 p-4">
                                <p className="text-[10px] font-bold text-white/45">
                                    Pendiente
                                </p>
                                <p className="mt-1 text-lg font-black text-amber-300">
                                    {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <p className="text-[10px] font-bold text-white/45">
                                    Aprobado
                                </p>
                                <p className="mt-1 text-lg font-black text-emerald-300">
                                    {formatoMoneda(totalAprobado, configuracion.simboloMoneda)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {presupuestosOdontograma.length > 0 && (
                <section className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-5">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                        <div>
                            <h3 className="text-sm font-black text-teal-800">
                                Integración con odontograma activa
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-teal-700">
                                Los presupuestos generados desde odontograma aparecen con pieza,
                                cara dental, estado clínico y tratamiento sugerido.
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
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {presupuestosPaciente.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Registrados
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <WalletCards className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[22px] font-black text-slate-800">
                        {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pendiente de aprobación
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {aprobados.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Aprobados
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <ReceiptText className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {convertidos.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Convertidos a venta
                    </p>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-3xl">
                <div className="border-b border-black/[0.04] px-5 py-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h3 className="text-[18px] font-black text-slate-800">
                                Centro de presupuestos
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Buscá, filtrá y gestioná presupuestos desde una vista limpia.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMostrarFormulario(true)}
                            className="flex w-fit items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo presupuesto
                        </button>
                    </div>
                </div>

                <div className="border-b border-black/[0.04] bg-slate-50/70 p-4">
                    <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busquedaPresupuesto}
                                onChange={(event) =>
                                    setBusquedaPresupuesto(event.target.value)
                                }
                                placeholder="Buscar por número, tratamiento, pieza, origen o paciente..."
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {filtrosEstado.map((filtro) => (
                                <button
                                    key={filtro.valor}
                                    type="button"
                                    onClick={() => setFiltroEstado(filtro.valor)}
                                    className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${filtroEstado === filtro.valor
                                            ? "bg-slate-900 text-white"
                                            : "bg-white text-slate-600 hover:bg-slate-100"
                                        }`}
                                >
                                    {filtro.etiqueta} · {filtro.cantidad}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                        {presupuestosFiltrados.map((presupuesto) => {
                            const items = obtenerItemsPresupuesto(presupuesto);
                            const itemPrincipal = items[0];
                            const esOdontograma =
                                presupuesto.origen === "Odontograma" ||
                                Boolean(presupuesto.piezaCodigo || itemPrincipal?.piezaCodigo);

                            return (
                                <article
                                    key={presupuesto.id}
                                    className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-slate-200 hover:shadow-md"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-[10px] font-black ${colorEstadoPresupuesto(
                                                        presupuesto.estado
                                                    )}`}
                                                >
                                                    {presupuesto.estado}
                                                </span>

                                                <span className="mono rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                    {fechaLegible(presupuesto.fecha)} · {presupuesto.hora || "00:00"}
                                                </span>

                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                    {presupuesto.origen || "Manual"}
                                                </span>

                                                {esOdontograma && (
                                                    <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-black text-teal-700">
                                                        Odontograma
                                                    </span>
                                                )}
                                            </div>

                                            <h4 className="mt-3 truncate text-xl font-black text-slate-900">
                                                {itemPrincipal?.nombre || `Presupuesto ${presupuesto.id}`}
                                            </h4>

                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Presupuesto {presupuesto.id} · Registrado por {" "}
                                                {presupuesto.usuarioNombre || "Usuario no identificado"}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-4 text-left lg:min-w-[190px] lg:text-right">
                                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                                Total
                                            </p>
                                            <p className="mt-1 text-2xl font-black text-slate-900">
                                                {formatoMoneda(
                                                    presupuesto.total,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {esOdontograma && (
                                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                                            <div className="rounded-2xl bg-teal-50 p-4">
                                                <p className="text-[10px] font-bold text-teal-700">
                                                    Pieza FDI
                                                </p>
                                                <p className="mt-1 text-lg font-black text-teal-800">
                                                    {presupuesto.piezaCodigo ||
                                                        itemPrincipal?.piezaCodigo ||
                                                        "No registrada"}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl bg-blue-50 p-4">
                                                <p className="text-[10px] font-bold text-blue-700">
                                                    Cara dental
                                                </p>
                                                <p className="mt-1 text-sm font-black text-blue-800">
                                                    {etiquetaCara(
                                                        presupuesto.cara || itemPrincipal?.cara
                                                    )}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl bg-amber-50 p-4">
                                                <p className="text-[10px] font-bold text-amber-700">
                                                    Estado dental
                                                </p>
                                                <p className="mt-1 text-sm font-black text-amber-800">
                                                    {presupuesto.estadoDental ||
                                                        itemPrincipal?.estadoDental ||
                                                        "No registrado"}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                                        Tratamiento
                                                    </th>
                                                    <th className="hidden px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 md:table-cell">
                                                        Cant.
                                                    </th>
                                                    <th className="hidden px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 md:table-cell">
                                                        Precio
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                                        Total
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {items.slice(0, 4).map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="border-t border-slate-100"
                                                    >
                                                        <td className="px-4 py-4 align-top">
                                                            <p className="text-sm font-black text-slate-800">
                                                                {item.nombre}
                                                            </p>
                                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                                                {item.descripcion}
                                                            </p>

                                                            {(item.piezaCodigo || item.cara || item.estadoDental) && (
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {item.piezaCodigo && (
                                                                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">
                                                                            Pieza {item.piezaCodigo}
                                                                        </span>
                                                                    )}
                                                                    {item.cara && (
                                                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                                                                            {etiquetaCara(item.cara)}
                                                                        </span>
                                                                    )}
                                                                    {item.estadoDental && (
                                                                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                                                                            {item.estadoDental}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="hidden px-4 py-4 text-center text-sm font-black text-slate-700 md:table-cell">
                                                            {item.cantidad}
                                                        </td>

                                                        <td className="hidden px-4 py-4 text-right text-sm font-black text-slate-700 md:table-cell">
                                                            {formatoMoneda(
                                                                item.precioUnitario,
                                                                configuracion.simboloMoneda
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4 text-right text-sm font-black text-slate-900">
                                                            {formatoMoneda(
                                                                item.total,
                                                                configuracion.simboloMoneda
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}

                                                {items.length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={4}
                                                            className="px-4 py-8 text-center text-xs text-slate-400"
                                                        >
                                                            Este presupuesto no tiene items detallados.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        <div className="rounded-2xl bg-slate-50 p-4">
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Subtotal
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-800">
                                                {formatoMoneda(
                                                    presupuesto.subtotal,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-red-50 p-4">
                                            <p className="text-[10px] font-bold text-red-700">
                                                Descuento
                                            </p>
                                            <p className="mt-1 text-sm font-black text-red-700">
                                                {formatoMoneda(
                                                    presupuesto.descuento,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-emerald-50 p-4">
                                            <p className="text-[10px] font-bold text-emerald-700">
                                                Total
                                            </p>
                                            <p className="mt-1 text-sm font-black text-emerald-700">
                                                {formatoMoneda(
                                                    presupuesto.total,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {presupuesto.observaciones && (
                                        <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                                            <p className="text-[10px] font-bold text-blue-700">
                                                Observaciones
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-blue-700">
                                                {presupuesto.observaciones}
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Link
                                            href={`/presupuestos/${presupuesto.id}`}
                                            className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                                        >
                                            <FileText className="h-4 w-4" />
                                            Ver / imprimir
                                        </Link>

                                        {presupuesto.estado !== "Aprobado" &&
                                            presupuesto.estado !== "Convertido a venta" && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        actualizarEstadoPresupuesto(
                                                            presupuesto.id,
                                                            "Aprobado"
                                                        )
                                                    }
                                                    className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Aprobar
                                                </button>
                                            )}

                                        {presupuesto.estado !== "Rechazado" &&
                                            presupuesto.estado !== "Convertido a venta" && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        actualizarEstadoPresupuesto(
                                                            presupuesto.id,
                                                            "Rechazado"
                                                        )
                                                    }
                                                    className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] font-bold text-red-700 hover:bg-red-100"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    Rechazar
                                                </button>
                                            )}

                                        {presupuesto.estado !== "Convertido a venta" &&
                                            presupuesto.estado !== "Rechazado" && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        convertirPresupuestoAVenta(presupuesto)
                                                    }
                                                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800"
                                                >
                                                    <CreditCard className="h-4 w-4" />
                                                    Convertir a venta
                                                </button>
                                            )}

                                        <button
                                            type="button"
                                            onClick={() => eliminarPresupuesto(presupuesto.id)}
                                            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Eliminar
                                        </button>
                                    </div>
                                </article>
                            );
                        })}

                        {presupuestosFiltrados.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                                <h4 className="mt-3 text-sm font-black text-slate-700">
                                    No hay presupuestos con ese filtro
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    Cambiá el filtro, limpiá la búsqueda o creá un nuevo presupuesto.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setMostrarFormulario(true)}
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-black text-white hover:bg-slate-800"
                                >
                                    <Plus className="h-4 w-4" />
                                    Crear presupuesto
                                </button>
                            </div>
                        )}
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-amber-700" />
                                <h3 className="text-sm font-black text-slate-800">
                                    Último presupuesto
                                </h3>
                            </div>

                            {presupuestoReciente ? (
                                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                    <p className="mono text-[10px] font-bold text-slate-400">
                                        {presupuestoReciente.id}
                                    </p>
                                    <p className="mt-2 text-sm font-black text-slate-900">
                                        {fechaLegible(presupuestoReciente.fecha)} · {presupuestoReciente.hora || "00:00"}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Estado: {presupuestoReciente.estado}
                                    </p>
                                    <p className="mt-3 text-xl font-black text-slate-900">
                                        {formatoMoneda(
                                            presupuestoReciente.total,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-3 text-xs leading-5 text-slate-500">
                                    Aún no hay presupuestos registrados para este paciente.
                                </p>
                            )}
                        </div>

                        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                            <div className="flex items-start gap-3">
                                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                                <div>
                                    <h3 className="text-sm font-black text-blue-800">
                                        Flujo recomendado
                                    </h3>
                                    <p className="mt-1 text-xs leading-5 text-blue-700">
                                        Marcá hallazgos en odontograma, generá presupuesto,
                                        aprobalo y convertí a venta. La venta quedará como crédito
                                        pendiente para cobrar en Caja.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {presupuestosPaciente.length > 0 && (
                            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                                    <div>
                                        <h3 className="text-sm font-black text-amber-800">
                                            Conversión a venta
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-amber-700">
                                            Al convertir un presupuesto, se registra una venta a
                                            crédito y una cuenta por cobrar. El pago se gestiona
                                            desde Caja.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </section>

            {mostrarFormulario && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
                        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-900 px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-xl font-black">
                                    Nuevo presupuesto manual
                                </h3>
                                <p className="mt-1 text-xs text-white/50">
                                    Para presupuestos creados fuera del odontograma.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setMostrarFormulario(false)}
                                className="flex w-fit items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-[12px] font-bold text-white hover:bg-white/15"
                            >
                                <XCircle className="h-4 w-4" />
                                Cerrar
                            </button>
                        </div>

                        <form onSubmit={crearPresupuestoManual} className="space-y-5 p-6">
                            <div className="grid gap-4 md:grid-cols-[1fr_190px_190px]">
                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Tratamiento / Procedimiento
                                    </label>
                                    <input
                                        value={formulario.nombre}
                                        onChange={(event) =>
                                            actualizarCampo("nombre", event.target.value)
                                        }
                                        placeholder="Ejemplo: Limpieza dental, restauración, corona..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Cantidad
                                    </label>
                                    <input
                                        value={formulario.cantidad}
                                        onChange={(event) =>
                                            actualizarCampo("cantidad", event.target.value)
                                        }
                                        type="number"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Precio unitario
                                    </label>
                                    <input
                                        value={formulario.precioUnitario}
                                        onChange={(event) =>
                                            actualizarCampo("precioUnitario", event.target.value)
                                        }
                                        type="number"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-[1fr_190px]">
                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={formulario.descripcion}
                                        onChange={(event) =>
                                            actualizarCampo("descripcion", event.target.value)
                                        }
                                        rows={4}
                                        placeholder="Detalle del tratamiento o procedimiento..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[12px] font-black text-slate-700">
                                        Descuento
                                    </label>
                                    <input
                                        value={formulario.descuento}
                                        onChange={(event) =>
                                            actualizarCampo("descuento", event.target.value)
                                        }
                                        type="number"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="rounded-3xl bg-slate-50 p-4">
                                <h4 className="text-sm font-black text-slate-800">
                                    Relación odontológica opcional
                                </h4>

                                <div className="mt-4 grid gap-4 md:grid-cols-3">
                                    <input
                                        value={formulario.piezaCodigo}
                                        onChange={(event) =>
                                            actualizarCampo("piezaCodigo", event.target.value)
                                        }
                                        placeholder="Pieza FDI. Ej: 16"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />

                                    <select
                                        value={formulario.cara}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "cara",
                                                event.target.value as CaraDental | ""
                                            )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option value="">Cara dental</option>
                                        {carasDentales.map((cara) => (
                                            <option key={cara.valor} value={cara.valor}>
                                                {cara.etiqueta}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={formulario.estadoDental}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "estadoDental",
                                                event.target.value as EstadoDental | ""
                                            )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option value="">Estado dental</option>
                                        {estadosDentales.map((estado) => (
                                            <option key={estado}>{estado}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-black text-slate-700">
                                    Observaciones
                                </label>
                                <textarea
                                    value={formulario.observaciones}
                                    onChange={(event) =>
                                        actualizarCampo("observaciones", event.target.value)
                                    }
                                    rows={3}
                                    placeholder="Condiciones, vigencia, notas para el paciente..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormulario(formularioVacio);
                                        setMostrarFormulario(false);
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>

                                <button className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                    <Save className="h-4 w-4" />
                                    Guardar presupuesto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}