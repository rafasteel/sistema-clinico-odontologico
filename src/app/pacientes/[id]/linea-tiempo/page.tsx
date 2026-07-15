"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    Activity,
    ArrowLeft,
    BadgeDollarSign,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    CreditCard,
    FileText,
    Filter,
    Paperclip,
    Pill,
    ReceiptText,
    Search,
    Stethoscope,
    UserRound,
    WalletCards,
} from "lucide-react";
import AppShell from "@/components/AppShell";
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

type EstadoCita =
    | "Programada"
    | "Confirmada"
    | "En espera"
    | "En atención"
    | "Atendida"
    | "Cobrada"
    | "Reagendada"
    | "Cancelada"
    | "No asistió";

type Cita = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    doctorId: string;
    doctorNombre: string;
    servicioId: string;
    servicioNombre: string;
    costo: number;
    fecha: string;
    hora: string;
    recurrencia: string;
    estado: EstadoCita;
    observaciones: string;
    creadaEn: string;
};

type NotaClinica = {
    id: string;
    pacienteId: string;
    fecha: string;
    hora: string;
    doctor: string;
    servicio: string;
    diagnostico: string;
    procedimiento: string;
    observaciones: string;
    proximaCita: string;
    usuarioNombre: string;
    estado: "Activa" | "Anulada";
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
    hora: string;
    doctor: string;
    doctorNombre?: string;
    diagnostico?: string;
    medicamento: string;
    indicaciones: string;
    duracion: string;
    observaciones: string;
    estado: "Activa" | "Anulada";
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
};

type Presupuesto = {
    id: string;
    pacienteId: string;
    pacienteNombre?: string;
    fecha: string;
    hora?: string;
    total: number;
    estado: string;
    origen?: string;
    observaciones?: string;
};

type DocumentoPaciente = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora: string;
    nombreArchivo: string;
    tipoArchivo: string;
    tamanoBytes: number;
    categoria: string;
    descripcion: string;
    dataUrl: string;
    usuarioNombre: string;
};

type TipoEvento =
    | "Cita"
    | "Nota clínica"
    | "Tratamiento"
    | "Receta"
    | "Venta"
    | "Cuenta por cobrar"
    | "Presupuesto"
    | "Documento";

type EventoLineaTiempo = {
    id: string;
    tipo: TipoEvento;
    fecha: string;
    hora: string;
    titulo: string;
    detalle: string;
    estado: string;
    responsable: string;
    monto?: number;
    href: string;
};

const PACIENTES_KEY = "pacientes_sistema_clinico";
const CITAS_KEY = "citas_sistema_clinico";
const NOTAS_KEY = "notas_clinicas_sistema_clinico";
const TRATAMIENTOS_KEY = "tratamientos_sistema_clinico";
const RECETAS_KEY = "recetas_sistema_clinico";
const VENTAS_KEY = "ventas_sistema_clinico";
const CUENTAS_KEY = "cuentas_cobrar_sistema_clinico";
const PRESUPUESTOS_KEY = "presupuestos_sistema_clinico";
const DOCUMENTOS_KEY = "documentos_pacientes_sistema_clinico";

const tiposEvento: ("Todos" | TipoEvento)[] = [
    "Todos",
    "Cita",
    "Nota clínica",
    "Tratamiento",
    "Receta",
    "Venta",
    "Cuenta por cobrar",
    "Presupuesto",
    "Documento",
];

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

function formatoTamano(bytes: number) {
    if (!bytes) return "0 KB";

    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
}

function colorTipoEvento(tipo: TipoEvento) {
    if (tipo === "Cita") return "bg-blue-50 text-blue-700";
    if (tipo === "Nota clínica") return "bg-teal-50 text-teal-700";
    if (tipo === "Tratamiento") return "bg-amber-50 text-amber-700";
    if (tipo === "Receta") return "bg-purple-50 text-purple-700";
    if (tipo === "Venta") return "bg-emerald-50 text-emerald-700";
    if (tipo === "Cuenta por cobrar") return "bg-red-50 text-red-700";
    if (tipo === "Presupuesto") return "bg-indigo-50 text-indigo-700";

    return "bg-slate-100 text-slate-700";
}

function iconoEvento(tipo: TipoEvento) {
    if (tipo === "Cita") return <CalendarClock className="h-5 w-5" />;
    if (tipo === "Nota clínica") return <ClipboardList className="h-5 w-5" />;
    if (tipo === "Tratamiento") return <Activity className="h-5 w-5" />;
    if (tipo === "Receta") return <Pill className="h-5 w-5" />;
    if (tipo === "Venta") return <ReceiptText className="h-5 w-5" />;
    if (tipo === "Cuenta por cobrar") return <WalletCards className="h-5 w-5" />;
    if (tipo === "Presupuesto") return <FileText className="h-5 w-5" />;

    return <Paperclip className="h-5 w-5" />;
}

export default function LineaTiempoPacientePage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [paciente, setPaciente] = useState<Paciente | null>(null);

    const [citas, setCitas] = useState<Cita[]>([]);
    const [notas, setNotas] = useState<NotaClinica[]>([]);
    const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
    const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);

    const [busqueda, setBusqueda] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState<"Todos" | TipoEvento>("Todos");

    useEffect(() => {
        setConfiguracion(obtenerConfiguracionClinica());

        const pacientes = leerLocalStorage<Paciente[]>(PACIENTES_KEY, []);
        setPaciente(pacientes.find((item) => item.id === pacienteId) || null);

        setCitas(leerLocalStorage<Cita[]>(CITAS_KEY, []));
        setNotas(leerLocalStorage<NotaClinica[]>(NOTAS_KEY, []));
        setTratamientos(leerLocalStorage<Tratamiento[]>(TRATAMIENTOS_KEY, []));
        setRecetas(leerLocalStorage<Receta[]>(RECETAS_KEY, []));
        setVentas(leerLocalStorage<Venta[]>(VENTAS_KEY, []));
        setCuentas(leerLocalStorage<CuentaPorCobrar[]>(CUENTAS_KEY, []));
        setPresupuestos(leerLocalStorage<Presupuesto[]>(PRESUPUESTOS_KEY, []));
        setDocumentos(leerLocalStorage<DocumentoPaciente[]>(DOCUMENTOS_KEY, []));
    }, [pacienteId]);

    const eventos = useMemo<EventoLineaTiempo[]>(() => {
        const nombrePaciente = (paciente?.nombre || "").toLowerCase();

        const eventosCitas: EventoLineaTiempo[] = citas
            .filter(
                (cita) =>
                    cita.pacienteId === pacienteId ||
                    cita.pacienteNombre?.toLowerCase() === nombrePaciente
            )
            .map((cita) => ({
                id: `CITA-${cita.id}`,
                tipo: "Cita",
                fecha: cita.fecha,
                hora: cita.hora || "00:00",
                titulo: cita.servicioNombre || "Cita odontológica",
                detalle: cita.observaciones || `Cita con ${cita.doctorNombre || "doctor no especificado"}.`,
                estado: cita.estado,
                responsable: cita.doctorNombre || "Doctor no especificado",
                monto: cita.costo || 0,
                href: "/agenda",
            }));

        const eventosNotas: EventoLineaTiempo[] = notas
            .filter((nota) => nota.pacienteId === pacienteId)
            .map((nota) => ({
                id: `NOTA-${nota.id}`,
                tipo: "Nota clínica",
                fecha: nota.fecha,
                hora: nota.hora || "00:00",
                titulo: nota.servicio || "Nota clínica",
                detalle: `${nota.diagnostico || "Sin diagnóstico"} · ${nota.procedimiento || "Sin procedimiento"
                    }`,
                estado: nota.estado,
                responsable: nota.doctor || nota.usuarioNombre || "Usuario no identificado",
                href: `/notas/${nota.id}`,
            }));

        const eventosTratamientos: EventoLineaTiempo[] = tratamientos
            .filter((tratamiento) => tratamiento.pacienteId === pacienteId)
            .map((tratamiento) => ({
                id: `TRAT-${tratamiento.id}`,
                tipo: "Tratamiento",
                fecha: tratamiento.fecha,
                hora: "00:00",
                titulo: tratamiento.nombre,
                detalle: tratamiento.descripcion || "Sin descripción registrada.",
                estado: tratamiento.estado,
                responsable: "Plan de tratamiento",
                monto: tratamiento.total || 0,
                href: `/tratamientos/${tratamiento.id}`,
            }));

        const eventosRecetas: EventoLineaTiempo[] = recetas
            .filter((receta) => receta.pacienteId === pacienteId)
            .map((receta) => ({
                id: `REC-${receta.id}`,
                tipo: "Receta",
                fecha: receta.fecha,
                hora: receta.hora || "00:00",
                titulo: receta.medicamento,
                detalle: receta.indicaciones || "Sin indicaciones registradas.",
                estado: receta.estado,
                responsable: receta.doctor || receta.doctorNombre || "Doctor no especificado",
                href: `/recetas/${receta.id}`,
            }));

        const eventosVentas: EventoLineaTiempo[] = ventas
            .filter(
                (venta) =>
                    venta.pacienteId === pacienteId ||
                    venta.clienteNombre?.toLowerCase() === nombrePaciente
            )
            .map((venta) => ({
                id: `VENTA-${venta.id}`,
                tipo: "Venta",
                fecha: venta.fecha,
                hora: venta.hora || "00:00",
                titulo: venta.concepto || "Venta registrada",
                detalle: `${venta.tipoCobro || "Cobro"} · Registró: ${venta.usuarioNombre || "Usuario no identificado"
                    }`,
                estado: venta.estado,
                responsable: venta.usuarioNombre || "Usuario no identificado",
                monto: venta.total || 0,
                href: `/recibos/${venta.id}`,
            }));

        const eventosCuentas: EventoLineaTiempo[] = cuentas
            .filter(
                (cuenta) =>
                    cuenta.pacienteId === pacienteId ||
                    cuenta.pacienteNombre?.toLowerCase() === nombrePaciente
            )
            .map((cuenta) => ({
                id: `CUENTA-${cuenta.id}`,
                tipo: "Cuenta por cobrar",
                fecha: cuenta.fecha,
                hora: "00:00",
                titulo: cuenta.concepto || "Cuenta por cobrar",
                detalle: `Vence: ${fechaLegible(cuenta.fechaVencimiento)} · Saldo pendiente: ${formatoMoneda(
                    cuenta.saldo || 0,
                    configuracion.simboloMoneda
                )}`,
                estado: cuenta.estado,
                responsable: "Caja / Administración",
                monto: cuenta.saldo || 0,
                href: `/estado-cuenta/${pacienteId}`,
            }));

        const eventosPresupuestos: EventoLineaTiempo[] = presupuestos
            .filter(
                (presupuesto) =>
                    presupuesto.pacienteId === pacienteId ||
                    presupuesto.pacienteNombre?.toLowerCase() === nombrePaciente
            )
            .map((presupuesto) => ({
                id: `PRESUP-${presupuesto.id}`,
                tipo: "Presupuesto",
                fecha: presupuesto.fecha,
                hora: presupuesto.hora || "00:00",
                titulo: presupuesto.origen || "Presupuesto odontológico",
                detalle: presupuesto.observaciones || "Presupuesto registrado.",
                estado: presupuesto.estado || "Registrado",
                responsable: "Presupuestos",
                monto: presupuesto.total || 0,
                href: `/presupuestos/${presupuesto.id}`,
            }));

        const eventosDocumentos: EventoLineaTiempo[] = documentos
            .filter((documento) => documento.pacienteId === pacienteId)
            .map((documento) => ({
                id: `DOC-${documento.id}`,
                tipo: "Documento",
                fecha: documento.fecha,
                hora: documento.hora || "00:00",
                titulo: documento.nombreArchivo,
                detalle: `${documento.categoria || "Documento"} · ${formatoTamano(
                    documento.tamanoBytes || 0
                )}${documento.descripcion ? ` · ${documento.descripcion}` : ""}`,
                estado: "Adjunto",
                responsable: documento.usuarioNombre || "Usuario no identificado",
                href: `/pacientes/${pacienteId}/documentos`,
            }));

        return [
            ...eventosCitas,
            ...eventosNotas,
            ...eventosTratamientos,
            ...eventosRecetas,
            ...eventosVentas,
            ...eventosCuentas,
            ...eventosPresupuestos,
            ...eventosDocumentos,
        ].sort((a, b) =>
            `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
        );
    }, [
        citas,
        notas,
        tratamientos,
        recetas,
        ventas,
        cuentas,
        presupuestos,
        documentos,
        paciente,
        pacienteId,
        configuracion.simboloMoneda,
    ]);

    const eventosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return eventos.filter((evento) => {
            const coincideTipo = tipoFiltro === "Todos" || evento.tipo === tipoFiltro;

            const coincideTexto =
                !texto ||
                evento.titulo.toLowerCase().includes(texto) ||
                evento.detalle.toLowerCase().includes(texto) ||
                evento.estado.toLowerCase().includes(texto) ||
                evento.responsable.toLowerCase().includes(texto) ||
                evento.tipo.toLowerCase().includes(texto);

            return coincideTipo && coincideTexto;
        });
    }, [eventos, busqueda, tipoFiltro]);

    const totalFacturado = eventos
        .filter((evento) => evento.tipo === "Venta")
        .reduce((total, evento) => total + (evento.monto || 0), 0);

    const totalSaldo = eventos
        .filter((evento) => evento.tipo === "Cuenta por cobrar")
        .reduce((total, evento) => total + (evento.monto || 0), 0);

    const totalClinicos = eventos.filter(
        (evento) =>
            evento.tipo === "Cita" ||
            evento.tipo === "Nota clínica" ||
            evento.tipo === "Tratamiento" ||
            evento.tipo === "Receta"
    ).length;

    if (!paciente) {
        return (
            <AppShell
                titulo="Línea de tiempo"
                descripcion="No se encontró el paciente solicitado"
                moduloActivo="Pacientes"
            >
                <section className="glass-card rounded-3xl p-10 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <UserRound className="h-8 w-8" />
                    </div>

                    <h2 className="mt-5 text-2xl font-black text-slate-900">
                        Paciente no encontrado
                    </h2>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Puede que el paciente haya sido eliminado o que el enlace no sea válido.
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

    return (
        <AppShell
            titulo={`Línea de tiempo: ${paciente.nombre}`}
            descripcion="Historial clínico, administrativo y financiero del paciente"
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
                        href={`/expediente/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-[12px] font-bold text-teal-700 hover:bg-teal-100"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Expediente
                    </Link>

                    <Link
                        href={`/pacientes/${paciente.id}/documentos`}
                        className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-[12px] font-bold text-slate-700 hover:bg-slate-200"
                    >
                        <Paperclip className="h-4 w-4" />
                        Documentos
                    </Link>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
                    <div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                            <Activity className="h-7 w-7 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">
                            Línea de tiempo clínica
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                            Vista cronológica completa del paciente: citas, notas clínicas,
                            tratamientos, recetas, presupuestos, pagos, saldos y documentos.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Paciente: {paciente.nombre}
                            </span>

                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Cédula: {paciente.cedula || "No registrada"}
                            </span>

                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Edad: {calcularEdad(paciente.fechaNacimiento)}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Eventos registrados
                        </p>

                        <h3 className="mt-3 text-4xl font-black">{eventos.length}</h3>

                        <p className="mt-2 text-sm text-white/50">
                            Actividad acumulada del expediente.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Activity className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {eventos.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Eventos totales
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <Stethoscope className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalClinicos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Eventos clínicos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <BadgeDollarSign className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[22px] font-black text-slate-800">
                        {formatoMoneda(totalFacturado, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Facturado
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                        <CreditCard className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[22px] font-black text-slate-800">
                        {formatoMoneda(totalSaldo, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Saldo registrado
                    </p>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-3xl">
                <div className="border-b border-black/[0.04] px-6 py-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-[18px] font-black text-slate-800">
                                Historial cronológico
                            </h3>
                            <p className="mono mt-1 text-[10px] text-slate-400">
                                {eventosFiltrados.length} evento(s) mostrado(s)
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[1fr_220px] lg:w-[560px]">
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                    value={busqueda}
                                    onChange={(event) => setBusqueda(event.target.value)}
                                    placeholder="Buscar en la línea de tiempo..."
                                    className="w-full bg-transparent text-[13px] font-medium outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                                <Filter className="h-4 w-4 text-slate-400" />
                                <select
                                    value={tipoFiltro}
                                    onChange={(event) =>
                                        setTipoFiltro(event.target.value as "Todos" | TipoEvento)
                                    }
                                    className="w-full bg-transparent text-[13px] font-semibold outline-none"
                                >
                                    {tiposEvento.map((tipo) => (
                                        <option key={tipo}>{tipo}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    <div className="relative space-y-4">
                        <div className="absolute bottom-8 left-[22px] top-8 hidden w-px bg-slate-200 md:block" />

                        {eventosFiltrados.map((evento) => (
                            <div key={evento.id} className="relative md:pl-16">
                                <div
                                    className={`absolute left-0 top-5 hidden h-11 w-11 items-center justify-center rounded-2xl md:flex ${colorTipoEvento(
                                        evento.tipo
                                    )}`}
                                >
                                    {iconoEvento(evento.tipo)}
                                </div>

                                <Link
                                    href={evento.href}
                                    className="block rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:border-teal-100 hover:bg-teal-50/20"
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black ${colorTipoEvento(
                                                        evento.tipo
                                                    )}`}
                                                >
                                                    {iconoEvento(evento.tipo)}
                                                    {evento.tipo}
                                                </span>

                                                <span className="mono rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                    {fechaLegible(evento.fecha)} · {evento.hora}
                                                </span>

                                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
                                                    {evento.estado}
                                                </span>
                                            </div>

                                            <h4 className="mt-4 text-base font-black text-slate-900">
                                                {evento.titulo}
                                            </h4>

                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                {evento.detalle}
                                            </p>

                                            <p className="mt-3 text-[11px] font-bold text-slate-400">
                                                Responsable: {evento.responsable}
                                            </p>
                                        </div>

                                        {typeof evento.monto === "number" && evento.monto > 0 && (
                                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                                                <p className="text-[10px] font-bold uppercase text-slate-400">
                                                    Monto
                                                </p>
                                                <p className="mt-1 text-sm font-black text-slate-800">
                                                    {formatoMoneda(
                                                        evento.monto,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            </div>
                        ))}

                        {eventosFiltrados.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" />
                                <h4 className="mt-3 text-sm font-black text-slate-700">
                                    Sin eventos encontrados
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    No hay registros que coincidan con la búsqueda o filtro actual.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AppShell>
    );
}