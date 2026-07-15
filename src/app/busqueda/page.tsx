"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    ArrowRight,
    BadgeDollarSign,
    CalendarClock,
    ClipboardList,
    CreditCard,
    FileText,
    Paperclip,
    Pill,
    ReceiptText,
    Search,
    Stethoscope,
    UserRound,
    WalletCards,
    XCircle,
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

type TipoResultado =
    | "Todos"
    | "Paciente"
    | "Cita"
    | "Nota clínica"
    | "Tratamiento"
    | "Receta"
    | "Venta"
    | "Cuenta por cobrar"
    | "Presupuesto"
    | "Documento";

type ResultadoBusqueda = {
    id: string;
    tipo: Exclude<TipoResultado, "Todos">;
    titulo: string;
    subtitulo: string;
    detalle: string;
    fecha: string;
    estado: string;
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

const tiposBusqueda: TipoResultado[] = [
    "Todos",
    "Paciente",
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

function normalizar(texto: string) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function colorTipo(tipo: ResultadoBusqueda["tipo"]) {
    if (tipo === "Paciente") return "bg-slate-100 text-slate-700";
    if (tipo === "Cita") return "bg-blue-50 text-blue-700";
    if (tipo === "Nota clínica") return "bg-teal-50 text-teal-700";
    if (tipo === "Tratamiento") return "bg-amber-50 text-amber-700";
    if (tipo === "Receta") return "bg-purple-50 text-purple-700";
    if (tipo === "Venta") return "bg-emerald-50 text-emerald-700";
    if (tipo === "Cuenta por cobrar") return "bg-red-50 text-red-700";
    if (tipo === "Presupuesto") return "bg-indigo-50 text-indigo-700";

    return "bg-cyan-50 text-cyan-700";
}

function iconoTipo(tipo: ResultadoBusqueda["tipo"]) {
    if (tipo === "Paciente") return <UserRound className="h-5 w-5" />;
    if (tipo === "Cita") return <CalendarClock className="h-5 w-5" />;
    if (tipo === "Nota clínica") return <ClipboardList className="h-5 w-5" />;
    if (tipo === "Tratamiento") return <Activity className="h-5 w-5" />;
    if (tipo === "Receta") return <Pill className="h-5 w-5" />;
    if (tipo === "Venta") return <ReceiptText className="h-5 w-5" />;
    if (tipo === "Cuenta por cobrar") return <WalletCards className="h-5 w-5" />;
    if (tipo === "Presupuesto") return <FileText className="h-5 w-5" />;

    return <Paperclip className="h-5 w-5" />;
}

export default function BusquedaGlobalPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [citas, setCitas] = useState<Cita[]>([]);
    const [notas, setNotas] = useState<NotaClinica[]>([]);
    const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
    const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);

    const [busqueda, setBusqueda] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState<TipoResultado>("Todos");

    useEffect(() => {
        setConfiguracion(obtenerConfiguracionClinica());

        setPacientes(leerLocalStorage<Paciente[]>(PACIENTES_KEY, []));
        setCitas(leerLocalStorage<Cita[]>(CITAS_KEY, []));
        setNotas(leerLocalStorage<NotaClinica[]>(NOTAS_KEY, []));
        setTratamientos(leerLocalStorage<Tratamiento[]>(TRATAMIENTOS_KEY, []));
        setRecetas(leerLocalStorage<Receta[]>(RECETAS_KEY, []));
        setVentas(leerLocalStorage<Venta[]>(VENTAS_KEY, []));
        setCuentas(leerLocalStorage<CuentaPorCobrar[]>(CUENTAS_KEY, []));
        setPresupuestos(leerLocalStorage<Presupuesto[]>(PRESUPUESTOS_KEY, []));
        setDocumentos(leerLocalStorage<DocumentoPaciente[]>(DOCUMENTOS_KEY, []));
    }, []);

    const resultados = useMemo<ResultadoBusqueda[]>(() => {
        const resultadosPacientes: ResultadoBusqueda[] = pacientes.map((paciente) => ({
            id: `PACIENTE-${paciente.id}`,
            tipo: "Paciente",
            titulo: paciente.nombre,
            subtitulo: `Cédula: ${paciente.cedula || "No registrada"} · Tel: ${paciente.telefono || "No registrado"
                }`,
            detalle: `Dirección: ${paciente.direccion || "No registrada"} · Estado: ${paciente.estado
                }`,
            fecha: paciente.ultimaCita || "",
            estado: paciente.estado,
            monto: paciente.saldoPendiente || 0,
            href: `/pacientes/${paciente.id}`,
        }));

        const resultadosCitas: ResultadoBusqueda[] = citas.map((cita) => ({
            id: `CITA-${cita.id}`,
            tipo: "Cita",
            titulo: cita.pacienteNombre || "Paciente no especificado",
            subtitulo: cita.servicioNombre || "Cita odontológica",
            detalle: `Doctor: ${cita.doctorNombre || "No especificado"} · ${cita.observaciones || "Sin observaciones"
                }`,
            fecha: cita.fecha,
            estado: cita.estado,
            monto: cita.costo || 0,
            href: "/agenda",
        }));

        const resultadosNotas: ResultadoBusqueda[] = notas.map((nota) => ({
            id: `NOTA-${nota.id}`,
            tipo: "Nota clínica",
            titulo: nota.servicio || "Nota clínica",
            subtitulo: `Doctor: ${nota.doctor || "No especificado"} · ${fechaLegible(
                nota.fecha
            )}`,
            detalle: `${nota.diagnostico || "Sin diagnóstico"} · ${nota.procedimiento || "Sin procedimiento"
                }`,
            fecha: nota.fecha,
            estado: nota.estado,
            href: `/notas/${nota.id}`,
        }));

        const resultadosTratamientos: ResultadoBusqueda[] = tratamientos.map(
            (tratamiento) => ({
                id: `TRAT-${tratamiento.id}`,
                tipo: "Tratamiento",
                titulo: tratamiento.nombre,
                subtitulo: fechaLegible(tratamiento.fecha),
                detalle: tratamiento.descripcion || "Sin descripción registrada",
                fecha: tratamiento.fecha,
                estado: tratamiento.estado,
                monto: tratamiento.total || 0,
                href: `/tratamientos/${tratamiento.id}`,
            })
        );

        const resultadosRecetas: ResultadoBusqueda[] = recetas.map((receta) => ({
            id: `REC-${receta.id}`,
            tipo: "Receta",
            titulo: receta.medicamento,
            subtitulo: `Doctor: ${receta.doctor || receta.doctorNombre || "No especificado"
                } · ${fechaLegible(receta.fecha)}`,
            detalle: receta.indicaciones || "Sin indicaciones registradas",
            fecha: receta.fecha,
            estado: receta.estado,
            href: `/recetas/${receta.id}`,
        }));

        const resultadosVentas: ResultadoBusqueda[] = ventas.map((venta) => ({
            id: `VENTA-${venta.id}`,
            tipo: "Venta",
            titulo: venta.clienteNombre || "Cliente no especificado",
            subtitulo: venta.concepto || "Venta registrada",
            detalle: `${venta.tipoCobro || "Cobro"} · Usuario: ${venta.usuarioNombre || "No identificado"
                }`,
            fecha: venta.fecha,
            estado: venta.estado,
            monto: venta.total || 0,
            href: `/recibos/${venta.id}`,
        }));

        const resultadosCuentas: ResultadoBusqueda[] = cuentas.map((cuenta) => ({
            id: `CUENTA-${cuenta.id}`,
            tipo: "Cuenta por cobrar",
            titulo: cuenta.pacienteNombre || "Paciente no especificado",
            subtitulo: cuenta.concepto || "Cuenta por cobrar",
            detalle: `Vence: ${fechaLegible(cuenta.fechaVencimiento)} · Saldo: ${formatoMoneda(
                cuenta.saldo || 0,
                configuracion.simboloMoneda
            )}`,
            fecha: cuenta.fecha,
            estado: cuenta.estado,
            monto: cuenta.saldo || 0,
            href: `/estado-cuenta/${cuenta.pacienteId}`,
        }));

        const resultadosPresupuestos: ResultadoBusqueda[] = presupuestos.map(
            (presupuesto) => ({
                id: `PRESUP-${presupuesto.id}`,
                tipo: "Presupuesto",
                titulo: presupuesto.pacienteNombre || "Presupuesto odontológico",
                subtitulo: presupuesto.origen || "Presupuesto registrado",
                detalle: presupuesto.observaciones || "Sin observaciones",
                fecha: presupuesto.fecha,
                estado: presupuesto.estado || "Registrado",
                monto: presupuesto.total || 0,
                href: `/presupuestos/${presupuesto.id}`,
            })
        );

        const resultadosDocumentos: ResultadoBusqueda[] = documentos.map(
            (documento) => ({
                id: `DOC-${documento.id}`,
                tipo: "Documento",
                titulo: documento.nombreArchivo,
                subtitulo: documento.pacienteNombre || "Paciente no especificado",
                detalle: `${documento.categoria || "Documento"} · ${documento.descripcion || "Sin descripción"
                    }`,
                fecha: documento.fecha,
                estado: "Adjunto",
                href: `/pacientes/${documento.pacienteId}/documentos`,
            })
        );

        return [
            ...resultadosPacientes,
            ...resultadosCitas,
            ...resultadosNotas,
            ...resultadosTratamientos,
            ...resultadosRecetas,
            ...resultadosVentas,
            ...resultadosCuentas,
            ...resultadosPresupuestos,
            ...resultadosDocumentos,
        ].sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [
        pacientes,
        citas,
        notas,
        tratamientos,
        recetas,
        ventas,
        cuentas,
        presupuestos,
        documentos,
        configuracion.simboloMoneda,
    ]);

    const resultadosFiltrados = useMemo(() => {
        const texto = normalizar(busqueda.trim());

        return resultados.filter((resultado) => {
            const coincideTipo = tipoFiltro === "Todos" || resultado.tipo === tipoFiltro;

            const textoResultado = normalizar(
                `${resultado.tipo} ${resultado.titulo} ${resultado.subtitulo} ${resultado.detalle} ${resultado.estado}`
            );

            const coincideBusqueda = !texto || textoResultado.includes(texto);

            return coincideTipo && coincideBusqueda;
        });
    }, [resultados, busqueda, tipoFiltro]);

    const totalPacientes = pacientes.length;
    const totalEventosClinicos = notas.length + tratamientos.length + recetas.length + citas.length;
    const totalFinanciero = ventas.reduce((total, venta) => total + (venta.total || 0), 0);
    const totalPendiente = cuentas.reduce((total, cuenta) => total + (cuenta.saldo || 0), 0);

    return (
        <AppShell
            titulo="Búsqueda global"
            descripcion="Buscador general de pacientes, documentos, historial clínico y movimientos"
            moduloActivo="Búsqueda Global"
        >
            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
                    <div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                            <Search className="h-7 w-7 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">
                            Buscador global del sistema
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                            Encontrá rápidamente pacientes, citas, documentos, recetas,
                            tratamientos, presupuestos, ventas y cuentas por cobrar desde una
                            sola pantalla.
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Registros indexados
                        </p>

                        <h3 className="mt-3 text-4xl font-black">{resultados.length}</h3>

                        <p className="mt-2 text-sm text-white/50">
                            Resultados disponibles para buscar.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <UserRound className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalPacientes}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pacientes
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <Stethoscope className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalEventosClinicos}
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
                        {formatoMoneda(totalFinanciero, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total ventas
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                        <CreditCard className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[22px] font-black text-slate-800">
                        {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Saldo pendiente
                    </p>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-3xl">
                <div className="border-b border-black/[0.04] px-6 py-5">
                    <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                autoFocus
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar paciente, cédula, medicamento, tratamiento, documento, venta..."
                                className="w-full bg-transparent text-sm font-semibold outline-none"
                            />

                            {busqueda && (
                                <button
                                    type="button"
                                    onClick={() => setBusqueda("")}
                                    className="rounded-full bg-slate-100 p-1 text-slate-400 hover:bg-slate-200"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <select
                            value={tipoFiltro}
                            onChange={(event) => setTipoFiltro(event.target.value as TipoResultado)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        >
                            {tiposBusqueda.map((tipo) => (
                                <option key={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-slate-400">
                        Mostrando {resultadosFiltrados.length} resultado(s).
                    </p>
                </div>

                <div className="max-h-[760px] overflow-y-auto p-4">
                    <div className="space-y-3">
                        {resultadosFiltrados.map((resultado) => (
                            <Link
                                key={resultado.id}
                                href={resultado.href}
                                className="block rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:border-teal-100 hover:bg-teal-50/20"
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="flex gap-3">
                                        <div
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorTipo(
                                                resultado.tipo
                                            )}`}
                                        >
                                            {iconoTipo(resultado.tipo)}
                                        </div>

                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-[10px] font-black ${colorTipo(
                                                        resultado.tipo
                                                    )}`}
                                                >
                                                    {resultado.tipo}
                                                </span>

                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                    {resultado.estado}
                                                </span>

                                                {resultado.fecha && (
                                                    <span className="mono rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                        {fechaLegible(resultado.fecha)}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="mt-3 text-base font-black text-slate-900">
                                                {resultado.titulo}
                                            </h3>

                                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                                {resultado.subtitulo}
                                            </p>

                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                {resultado.detalle}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3">
                                        {typeof resultado.monto === "number" && resultado.monto > 0 && (
                                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                                                <p className="text-[10px] font-bold uppercase text-slate-400">
                                                    Monto
                                                </p>
                                                <p className="mt-1 text-sm font-black text-slate-800">
                                                    {formatoMoneda(
                                                        resultado.monto,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {resultadosFiltrados.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                <Search className="mx-auto h-10 w-10 text-slate-300" />
                                <h4 className="mt-3 text-sm font-black text-slate-700">
                                    Sin resultados
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    Probá buscando por nombre, cédula, teléfono, medicamento,
                                    documento, tratamiento o concepto de venta.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AppShell>
    );
}