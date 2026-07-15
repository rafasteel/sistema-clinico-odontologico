"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Printer, Stethoscope, WalletCards } from "lucide-react";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

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

type NotaClinica = {
    id: string;
    pacienteId: string;
    fecha: string;
    hora?: string;
    motivo?: string;
    diagnostico?: string;
    tratamiento?: string;
    observaciones?: string;
    usuarioNombre?: string;
};

type Tratamiento = {
    id: string;
    pacienteId: string;
    fecha: string;
    nombre: string;
    descripcion: string;
    total: number;
    abonado: number;
    estado: "Planificado" | "En proceso" | "Completado" | "Suspendido";
};

type Receta = {
    id: string;
    pacienteId: string;
    fecha: string;
    medicamento: string;
    indicaciones: string;
    doctorNombre?: string;
};

type EstadoCita =
    | "Programada"
    | "Confirmada"
    | "En espera"
    | "En atención"
    | "Atendida"
    | "Cancelada"
    | "Cobrada";

type Cita = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    doctorId: string;
    doctorNombre: string;
    servicioId: string;
    servicioNombre: string;
    fecha: string;
    hora: string;
    duracionMinutos: number;
    precio: number;
    estado: EstadoCita;
    observaciones: string;
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

type CarasDentales = Record<CaraDental, EstadoDental>;

type PiezaDental = {
    codigo: string;
    numeroLegacy?: number;
    nombre?: string;
    tipo?: string;
    arcada?: string;
    cuadrante?: string;
    caras: CarasDentales;
    nota?: string;
    actualizadoEn?: string;
};

type HistorialOdontograma = {
    id: string;
    fecha: string;
    hora: string;
    piezaCodigo: string;
    cara: CaraDental | "todas";
    estado: EstadoDental;
    nota: string;
    usuarioNombre: string;
};

type OdontogramaPaciente = {
    pacienteId: string;
    actualizadoEn: string;
    piezas: PiezaDental[];
    historial?: HistorialOdontograma[];
};

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

type EstadoCuenta = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

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
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuenta;
    abonos?: AbonoCuenta[];
};

const PACIENTES_KEY = "pacientes_sistema_clinico";
const NOTAS_KEY = "notas_clinicas_sistema_clinico";
const TRATAMIENTOS_KEY = "tratamientos_sistema_clinico";
const RECETAS_KEY = "recetas_sistema_clinico";
const CITAS_KEY = "citas_sistema_clinico";
const ODONTOGRAMAS_KEY = "odontogramas_sistema_clinico";
const PRESUPUESTOS_KEY = "presupuestos_sistema_clinico";
const VENTAS_KEY = "ventas_sistema_clinico";
const CUENTAS_KEY = "cuentas_cobrar_sistema_clinico";

const carasLabels: Record<CaraDental, string> = {
    sup: "Superior",
    der: "Derecha",
    inf: "Inferior",
    izq: "Izquierda",
    centro: "Oclusal / Centro",
};

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

function calcularEdad(fechaNacimiento: string) {
    if (!fechaNacimiento) return "No registrada";

    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();

    if (Number.isNaN(nacimiento.getTime())) return "No registrada";

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad -= 1;
    }

    return `${edad} años`;
}

function obtenerEstadoCuenta(cuenta: CuentaPorCobrar): EstadoCuenta {
    if (cuenta.estado === "Pagada" || cuenta.estado === "Anulada") {
        return cuenta.estado;
    }

    if ((cuenta.saldo || 0) <= 0) return "Pagada";

    if (cuenta.fechaVencimiento && cuenta.fechaVencimiento < fechaHoyLocal()) {
        return "Vencida";
    }

    if ((cuenta.abonos || []).length > 0 || cuenta.saldo < cuenta.total) {
        return "Parcial";
    }

    return "Pendiente";
}

function obtenerOdontogramas(): OdontogramaPaciente[] {
    const datos = leerLocalStorage<unknown>(ODONTOGRAMAS_KEY, []);

    if (Array.isArray(datos)) {
        return datos as OdontogramaPaciente[];
    }

    if (datos && typeof datos === "object") {
        return Object.entries(datos as Record<string, OdontogramaPaciente>).map(
            ([pacienteId, odontograma]) => ({
                ...odontograma,
                pacienteId: odontograma.pacienteId || pacienteId,
            })
        );
    }

    return [];
}

function obtenerItemsPresupuesto(presupuesto: Presupuesto) {
    const fuente =
        presupuesto.items && presupuesto.items.length > 0
            ? presupuesto.items
            : presupuesto.tratamientos || [];

    return fuente;
}

function textoEstado(estado: string) {
    return estado || "No registrado";
}

function textoHallazgosPieza(pieza: PiezaDental) {
    const hallazgos = Object.entries(pieza.caras || {}).filter(
        ([, estado]) => estado !== "Sano"
    );

    if (hallazgos.length === 0) return "Sin hallazgos";

    return hallazgos
        .map(([cara, estado]) => `${carasLabels[cara as CaraDental] || cara}: ${estado}`)
        .join(" · ");
}

export default function ExpedientePacientePage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [notas, setNotas] = useState<NotaClinica[]>([]);
    const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [citas, setCitas] = useState<Cita[]>([]);
    const [odontogramas, setOdontogramas] = useState<OdontogramaPaciente[]>([]);
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);

    useEffect(() => {
        const pacientes = leerLocalStorage<Paciente[]>(PACIENTES_KEY, []);

        setConfiguracion(obtenerConfiguracionClinica());
        setPaciente(pacientes.find((item) => item.id === pacienteId) || null);
        setNotas(leerLocalStorage<NotaClinica[]>(NOTAS_KEY, []));
        setTratamientos(leerLocalStorage<Tratamiento[]>(TRATAMIENTOS_KEY, []));
        setRecetas(leerLocalStorage<Receta[]>(RECETAS_KEY, []));
        setCitas(leerLocalStorage<Cita[]>(CITAS_KEY, []));
        setOdontogramas(obtenerOdontogramas());
        setPresupuestos(leerLocalStorage<Presupuesto[]>(PRESUPUESTOS_KEY, []));
        setVentas(leerLocalStorage<Venta[]>(VENTAS_KEY, []));
        setCuentas(leerLocalStorage<CuentaPorCobrar[]>(CUENTAS_KEY, []));
    }, [pacienteId]);

    const notasPaciente = useMemo(() => {
        return notas
            .filter((item) => item.pacienteId === pacienteId)
            .sort((a, b) =>
                `${b.fecha} ${b.hora || "00:00"}`.localeCompare(
                    `${a.fecha} ${a.hora || "00:00"}`
                )
            );
    }, [notas, pacienteId]);

    const tratamientosPaciente = useMemo(() => {
        return tratamientos
            .filter((item) => item.pacienteId === pacienteId)
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [tratamientos, pacienteId]);

    const recetasPaciente = useMemo(() => {
        return recetas
            .filter((item) => item.pacienteId === pacienteId)
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [recetas, pacienteId]);

    const citasPaciente = useMemo(() => {
        return citas
            .filter(
                (item) =>
                    item.pacienteId === pacienteId ||
                    item.pacienteNombre?.toLowerCase() ===
                    (paciente?.nombre || "").toLowerCase()
            )
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );
    }, [citas, pacienteId, paciente]);

    const odontogramaPaciente = useMemo(() => {
        return (
            odontogramas.find((item) => item.pacienteId === pacienteId) || null
        );
    }, [odontogramas, pacienteId]);

    const piezasConHallazgos = useMemo(() => {
        if (!odontogramaPaciente) return [];

        return (odontogramaPaciente.piezas || []).filter((pieza) =>
            Object.values(pieza.caras || {}).some((estado) => estado !== "Sano")
        );
    }, [odontogramaPaciente]);

    const presupuestosPaciente = useMemo(() => {
        return presupuestos
            .filter(
                (item) =>
                    item.pacienteId === pacienteId ||
                    item.pacienteNombre?.toLowerCase() ===
                    (paciente?.nombre || "").toLowerCase()
            )
            .sort((a, b) =>
                `${b.fecha} ${b.hora || "00:00"}`.localeCompare(
                    `${a.fecha} ${a.hora || "00:00"}`
                )
            );
    }, [presupuestos, pacienteId, paciente]);

    const ventasPaciente = useMemo(() => {
        return ventas
            .filter(
                (item) =>
                    item.pacienteId === pacienteId ||
                    item.clienteNombre?.toLowerCase() ===
                    (paciente?.nombre || "").toLowerCase()
            )
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );
    }, [ventas, pacienteId, paciente]);

    const cuentasPaciente = useMemo(() => {
        return cuentas
            .filter(
                (item) =>
                    item.pacienteId === pacienteId ||
                    item.pacienteNombre?.toLowerCase() ===
                    (paciente?.nombre || "").toLowerCase()
            )
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [cuentas, pacienteId, paciente]);

    const totalTratamientos = tratamientosPaciente.reduce(
        (total, item) => total + numero(item.total),
        0
    );

    const totalFacturado = ventasPaciente
        .filter((item) => item.estado !== "Anulada")
        .reduce((total, item) => total + numero(item.total), 0);

    const totalPendiente = cuentasPaciente
        .filter((item) => {
            const estado = obtenerEstadoCuenta(item);
            return estado !== "Pagada" && estado !== "Anulada";
        })
        .reduce((total, item) => total + numero(item.saldo), 0);

    const citasAtendidas = citasPaciente.filter(
        (item) => item.estado === "Atendida" || item.estado === "Cobrada"
    ).length;

    function imprimir() {
        window.print();
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
                        No encontramos el paciente solicitado para generar el expediente.
                    </p>

                    <Link
                        href="/pacientes"
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a pacientes
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
                        font-size: 9.3px !important;
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
                        font-size: 9.5px !important;
                        line-height: 1.22 !important;
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

                    .screen-card {
                        box-shadow: none !important;
                    }
                }
            `}</style>

            <section className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                        href={`/estado-cuenta/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700 hover:bg-amber-100"
                    >
                        <WalletCards className="h-4 w-4" />
                        Estado de cuenta
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

            <section className="print-document screen-card mx-auto max-w-5xl rounded-2xl border border-slate-300 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                <header className="print-section border-b-2 border-slate-900 pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                {configuracion.nombreClinica}
                            </p>

                            <h1 className="print-title mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
                                Expediente clínico odontológico
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
                                <span className="font-bold text-slate-500">Estado</span>
                                <strong>{paciente.estado}</strong>
                            </div>

                            <div className="flex justify-between gap-3 border-b border-slate-300 px-3 py-1 print-border">
                                <span className="font-bold text-slate-500">Notas</span>
                                <strong>{notasPaciente.length}</strong>
                            </div>

                            <div className="flex justify-between gap-3 px-3 py-1">
                                <span className="font-bold text-slate-500">Citas atendidas</span>
                                <strong>{citasAtendidas}</strong>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="print-section border-b border-slate-300 py-3 print-border">
                    <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Datos del paciente
                    </h2>

                    <div className="grid overflow-hidden rounded-xl border border-slate-400 md:grid-cols-[1.45fr_1fr_0.8fr_1fr_2fr] print:rounded-none print-border">
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
                                Edad
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {calcularEdad(paciente.fechaNacimiento)}
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

                        <div className="p-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Dirección
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800">
                                {paciente.direccion || "No registrada"}
                            </p>
                        </div>
                    </div>
                </section>

                {(paciente.alergias || paciente.enfermedades || paciente.medicamentos) && (
                    <section className="print-section border-b border-slate-300 py-2 print-border">
                        <h2 className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                            Alertas clínicas
                        </h2>

                        <p className="print-small text-[11px] leading-4 text-slate-700">
                            <strong>Alergias:</strong> {paciente.alergias || "No refiere"} ·{" "}
                            <strong>Enfermedades:</strong>{" "}
                            {paciente.enfermedades || "No registra"} ·{" "}
                            <strong>Medicamentos:</strong>{" "}
                            {paciente.medicamentos || "Ninguno"}
                        </p>
                    </section>
                )}

                <section className="print-section grid gap-3 border-b border-slate-300 py-3 md:grid-cols-4 print-border">
                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Citas atendidas
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {citasAtendidas}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Hallazgos
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {piezasConHallazgos.length}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Facturado
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(totalFacturado, configuracion.simboloMoneda)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 p-2 print:rounded-none print-border">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Pendiente
                        </p>
                        <p className="mt-0.5 text-sm font-black text-slate-950">
                            {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
                        </p>
                    </div>
                </section>

                <section className="py-3 print:py-2">
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                            Historial clínico
                        </h2>

                        <p className="text-[10px] font-bold text-slate-500">
                            {notasPaciente.length} nota(s)
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
                                        Motivo
                                    </th>
                                    <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Diagnóstico
                                    </th>
                                    <th className="border-b border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                        Tratamiento / observaciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {notasPaciente.map((nota) => (
                                    <tr key={nota.id}>
                                        <td className="border-b border-r border-slate-300 px-2 py-2 align-top font-bold print-border">
                                            {fechaLegible(nota.fecha)}
                                            <br />
                                            <span className="font-normal text-slate-500">
                                                {nota.hora || "00:00"}
                                            </span>
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                            {nota.motivo || "No registrado"}
                                        </td>

                                        <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                            {nota.diagnostico || "No registrado"}
                                        </td>

                                        <td className="border-b border-slate-300 px-2 py-2 align-top print-border">
                                            <p>
                                                <strong>Trat.:</strong>{" "}
                                                {nota.tratamiento || "No registrado"}
                                            </p>
                                            {nota.observaciones && (
                                                <p className="print-small mt-0.5 text-[9px] leading-3 text-slate-600">
                                                    {nota.observaciones}
                                                </p>
                                            )}
                                            <p className="mt-0.5 text-[9px] text-slate-500">
                                                {nota.usuarioNombre || "Usuario no identificado"}
                                            </p>
                                        </td>
                                    </tr>
                                ))}

                                {notasPaciente.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-3 py-5 text-center text-sm text-slate-400"
                                        >
                                            No hay notas clínicas registradas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="grid gap-4 py-3 md:grid-cols-2 print:py-2">
                    <div className="print-section">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                                Tratamientos
                            </h2>

                            <p className="text-[10px] font-bold text-slate-500">
                                {tratamientosPaciente.length}
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
                                            Tratamiento
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Estado
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Total
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {tratamientosPaciente.map((tratamiento) => (
                                        <tr key={tratamiento.id}>
                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top font-bold print-border">
                                                {fechaLegible(tratamiento.fecha)}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                                <p className="font-black">
                                                    {tratamiento.nombre}
                                                </p>
                                                <p className="print-small mt-0.5 text-[9px] leading-3 text-slate-600">
                                                    {tratamiento.descripcion}
                                                </p>
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 text-center print-border">
                                                {textoEstado(tratamiento.estado)}
                                            </td>

                                            <td className="border-b border-slate-300 px-2 py-2 text-right font-black print-border">
                                                {formatoMoneda(
                                                    tratamiento.total,
                                                    configuracion.simboloMoneda
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {tratamientosPaciente.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-5 text-center text-sm text-slate-400"
                                            >
                                                Sin tratamientos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {tratamientosPaciente.length > 0 && (
                            <p className="mt-1 text-right text-[10px] font-black text-slate-900">
                                Total tratamientos:{" "}
                                {formatoMoneda(totalTratamientos, configuracion.simboloMoneda)}
                            </p>
                        )}
                    </div>

                    <div className="print-section">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                                Odontograma / hallazgos
                            </h2>

                            <p className="text-[10px] font-bold text-slate-500">
                                {piezasConHallazgos.length}
                            </p>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-400 print:rounded-none print-border">
                            <table className="print-table w-full border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-slate-100 print-light-bg">
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Pieza
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Hallazgos
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Nota
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {piezasConHallazgos.map((pieza) => (
                                        <tr key={pieza.codigo}>
                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top font-black print-border">
                                                {pieza.codigo}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                                {textoHallazgosPieza(pieza)}
                                            </td>

                                            <td className="border-b border-slate-300 px-2 py-2 align-top print-border">
                                                {pieza.nota || "Sin nota"}
                                            </td>
                                        </tr>
                                    ))}

                                    {piezasConHallazgos.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-3 py-5 text-center text-sm text-slate-400"
                                            >
                                                Sin hallazgos dentales.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-1 text-[10px] text-slate-500">
                            Última actualización:{" "}
                            {odontogramaPaciente?.actualizadoEn || "Sin odontograma"}
                        </p>
                    </div>
                </section>

                <section className="grid gap-4 py-3 md:grid-cols-2 print:py-2">
                    <div className="print-section">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                                Recetas
                            </h2>

                            <p className="text-[10px] font-bold text-slate-500">
                                {recetasPaciente.length}
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
                                            Medicamento
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Indicaciones
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {recetasPaciente.map((receta) => (
                                        <tr key={receta.id}>
                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top font-bold print-border">
                                                {fechaLegible(receta.fecha)}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                                {receta.medicamento}
                                            </td>

                                            <td className="border-b border-slate-300 px-2 py-2 align-top print-border">
                                                {receta.indicaciones}
                                                <p className="mt-0.5 text-[9px] text-slate-500">
                                                    {receta.doctorNombre || "Doctor no especificado"}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}

                                    {recetasPaciente.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-3 py-5 text-center text-sm text-slate-400"
                                            >
                                                Sin recetas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="print-section">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                                Citas
                            </h2>

                            <p className="text-[10px] font-bold text-slate-500">
                                {citasPaciente.length}
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
                                            Servicio
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {citasPaciente.map((cita) => (
                                        <tr key={cita.id}>
                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top font-bold print-border">
                                                {fechaLegible(cita.fecha)} · {cita.hora}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                                {cita.servicioNombre}
                                                <p className="mt-0.5 text-[9px] text-slate-500">
                                                    {cita.doctorNombre}
                                                </p>
                                            </td>

                                            <td className="border-b border-slate-300 px-2 py-2 align-top print-border">
                                                {textoEstado(cita.estado)}
                                            </td>
                                        </tr>
                                    ))}

                                    {citasPaciente.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-3 py-5 text-center text-sm text-slate-400"
                                            >
                                                Sin citas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 py-3 md:grid-cols-2 print:py-2">
                    <div className="print-section">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                                Presupuestos
                            </h2>

                            <p className="text-[10px] font-bold text-slate-500">
                                {presupuestosPaciente.length}
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
                                            Presupuesto
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Estado
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Total
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {presupuestosPaciente.map((presupuesto) => {
                                        const items = obtenerItemsPresupuesto(presupuesto);

                                        return (
                                            <tr key={presupuesto.id}>
                                                <td className="border-b border-r border-slate-300 px-2 py-2 align-top font-bold print-border">
                                                    {fechaLegible(presupuesto.fecha)}
                                                </td>

                                                <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                                    <p className="font-black">
                                                        {presupuesto.id}
                                                    </p>
                                                    <p className="print-small mt-0.5 text-[9px] leading-3 text-slate-600">
                                                        {(items || [])
                                                            .slice(0, 2)
                                                            .map((item) => item.nombre)
                                                            .join(", ") ||
                                                            presupuesto.origen ||
                                                            "Manual"}
                                                    </p>
                                                </td>

                                                <td className="border-b border-r border-slate-300 px-2 py-2 text-center print-border">
                                                    {textoEstado(presupuesto.estado)}
                                                </td>

                                                <td className="border-b border-slate-300 px-2 py-2 text-right font-black print-border">
                                                    {formatoMoneda(
                                                        presupuesto.total,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {presupuestosPaciente.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-5 text-center text-sm text-slate-400"
                                            >
                                                Sin presupuestos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="print-section">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                                Ventas y cuentas
                            </h2>

                            <p className="text-[10px] font-bold text-slate-500">
                                {ventasPaciente.length} venta(s)
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
                                            Concepto
                                        </th>
                                        <th className="border-b border-r border-slate-400 px-2 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Estado
                                        </th>
                                        <th className="border-b border-slate-400 px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 print-border">
                                            Total / saldo
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {ventasPaciente.map((venta) => (
                                        <tr key={venta.id}>
                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top font-bold print-border">
                                                {fechaLegible(venta.fecha)}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                                {venta.concepto}
                                            </td>

                                            <td className="border-b border-r border-slate-300 px-2 py-2 text-center print-border">
                                                {textoEstado(venta.estado)}
                                            </td>

                                            <td className="border-b border-slate-300 px-2 py-2 text-right font-black print-border">
                                                {formatoMoneda(
                                                    venta.total,
                                                    configuracion.simboloMoneda
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {cuentasPaciente.map((cuenta) => {
                                        const estado = obtenerEstadoCuenta(cuenta);

                                        return (
                                            <tr key={cuenta.id}>
                                                <td className="border-b border-r border-slate-300 px-2 py-2 align-top font-bold print-border">
                                                    {fechaLegible(cuenta.fecha)}
                                                </td>

                                                <td className="border-b border-r border-slate-300 px-2 py-2 align-top print-border">
                                                    <p>{cuenta.concepto}</p>
                                                    <p className="text-[9px] text-slate-500">
                                                        Cuenta: {cuenta.id}
                                                    </p>
                                                </td>

                                                <td className="border-b border-r border-slate-300 px-2 py-2 text-center print-border">
                                                    {textoEstado(estado)}
                                                </td>

                                                <td className="border-b border-slate-300 px-2 py-2 text-right font-black print-border">
                                                    {formatoMoneda(
                                                        cuenta.saldo,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {ventasPaciente.length === 0 &&
                                        cuentasPaciente.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="px-3 py-5 text-center text-sm text-slate-400"
                                                >
                                                    Sin ventas ni cuentas.
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <section className="print-section grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_270px] print-border print:pt-2">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Observaciones generales
                        </h3>

                        <p className="print-small mt-1 text-[11px] leading-4 text-slate-700">
                            {paciente.observaciones ||
                                "No hay observaciones generales registradas."}
                        </p>

                        <p className="print-small mt-1 border-l-2 border-slate-400 pl-2 text-[10px] leading-4 text-slate-600">
                            Expediente generado con la información registrada en el sistema
                            al momento de emisión. Validar contra documentos clínicos y
                            comprobantes cuando corresponda.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-400 print:rounded-none print-border">
                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Facturado</span>
                            <strong>
                                {formatoMoneda(totalFacturado, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs print-border">
                            <span className="text-slate-600">Pendiente</span>
                            <strong>
                                {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between bg-slate-100 px-3 py-2 print-light-bg">
                            <span className="text-sm font-black text-slate-700">
                                Tratamientos
                            </span>
                            <strong className="text-lg text-slate-950">
                                {tratamientosPaciente.length}
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
                        Expediente clínico generado desde el sistema clínico.
                    </p>
                </footer>
            </section>
        </main>
    );
}