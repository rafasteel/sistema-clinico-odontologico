"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    BadgeDollarSign,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    CreditCard,
    FileText,
    HeartPulse,
    MapPin,
    Phone,
    Pill,
    Plus,
    ReceiptText,
    Save,
    ShieldAlert,
    ShieldCheck,
    Stethoscope,
    UserRound,
    WalletCards,
    XCircle,
    Paperclip,
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

type FormularioNota = {
    doctor: string;
    servicio: string;
    diagnostico: string;
    procedimiento: string;
    observaciones: string;
    proximaCita: string;
};

type FormularioTratamiento = {
    nombre: string;
    descripcion: string;
    total: string;
    abonado: string;
    estado: "Planificado" | "En proceso" | "Completado" | "Suspendido";
};

type FormularioReceta = {
    doctor: string;
    medicamento: string;
    indicaciones: string;
    duracion: string;
    observaciones: string;
};

const formularioNotaVacio: FormularioNota = {
    doctor: "",
    servicio: "",
    diagnostico: "",
    procedimiento: "",
    observaciones: "",
    proximaCita: "",
};

const formularioTratamientoVacio: FormularioTratamiento = {
    nombre: "",
    descripcion: "",
    total: "",
    abonado: "",
    estado: "Planificado",
};

const formularioRecetaVacio: FormularioReceta = {
    doctor: "",
    medicamento: "",
    indicaciones: "",
    duracion: "",
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
        edad--;
    }

    return `${edad} años`;
}

function iniciales(nombre: string) {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "PX";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function colorEstadoCita(estado: EstadoCita) {
    if (estado === "Cobrada" || estado === "Atendida") {
        return "bg-emerald-50 text-emerald-700";
    }

    if (estado === "Confirmada" || estado === "En atención") {
        return "bg-blue-50 text-blue-700";
    }

    if (estado === "Cancelada" || estado === "No asistió") {
        return "bg-red-50 text-red-700";
    }

    if (estado === "Reagendada") {
        return "bg-purple-50 text-purple-700";
    }

    return "bg-amber-50 text-amber-700";
}

function colorEstadoCuenta(estado: EstadoCuenta | string) {
    if (estado === "Pagada") return "bg-emerald-50 text-emerald-700";
    if (estado === "Parcial") return "bg-amber-50 text-amber-700";
    if (estado === "Vencida") return "bg-red-50 text-red-700";
    if (estado === "Anulada") return "bg-slate-100 text-slate-500";

    return "bg-blue-50 text-blue-700";
}

function colorTratamiento(estado: Tratamiento["estado"]) {
    if (estado === "Completado") return "bg-emerald-50 text-emerald-700";
    if (estado === "En proceso") return "bg-blue-50 text-blue-700";
    if (estado === "Suspendido") return "bg-red-50 text-red-700";

    return "bg-amber-50 text-amber-700";
}

function estadoVisualCuenta(fechaVencimiento: string, estado: EstadoCuenta) {
    if (estado === "Pagada" || estado === "Anulada") return estado;

    if (fechaVencimiento && fechaVencimiento < fechaHoyLocal()) {
        return "Vencida";
    }

    return estado;
}

export default function PerfilPacientePage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [paciente, setPaciente] = useState<Paciente | null>(null);

    const [citas, setCitas] = useState<Cita[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [notas, setNotas] = useState<NotaClinica[]>([]);
    const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
    const [recetas, setRecetas] = useState<Receta[]>([]);

    const [formularioNota, setFormularioNota] =
        useState<FormularioNota>(formularioNotaVacio);
    const [formularioTratamiento, setFormularioTratamiento] =
        useState<FormularioTratamiento>(formularioTratamientoVacio);
    const [formularioReceta, setFormularioReceta] =
        useState<FormularioReceta>(formularioRecetaVacio);

    useEffect(() => {
        setConfiguracion(obtenerConfiguracionClinica());

        const usuarioGuardado = leerLocalStorage<UsuarioSistema | null>(
            "usuario_sistema_clinico",
            null
        );
        const listaPacientes = leerLocalStorage<Paciente[]>(
            "pacientes_sistema_clinico",
            []
        );

        setUsuario(usuarioGuardado);
        setPaciente(listaPacientes.find((item) => item.id === pacienteId) || null);

        setCitas(leerLocalStorage<Cita[]>("citas_sistema_clinico", []));
        setVentas(leerLocalStorage<Venta[]>("ventas_sistema_clinico", []));
        setCuentas(
            leerLocalStorage<CuentaPorCobrar[]>(
                "cuentas_cobrar_sistema_clinico",
                []
            )
        );
        setNotas(
            leerLocalStorage<NotaClinica[]>("notas_clinicas_sistema_clinico", [])
        );
        setTratamientos(
            leerLocalStorage<Tratamiento[]>("tratamientos_sistema_clinico", [])
        );
        setRecetas(leerLocalStorage<Receta[]>("recetas_sistema_clinico", []));
    }, [pacienteId]);

    function actualizarNota<K extends keyof FormularioNota>(
        campo: K,
        valor: FormularioNota[K]
    ) {
        setFormularioNota((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function actualizarTratamiento<K extends keyof FormularioTratamiento>(
        campo: K,
        valor: FormularioTratamiento[K]
    ) {
        setFormularioTratamiento((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function actualizarReceta<K extends keyof FormularioReceta>(
        campo: K,
        valor: FormularioReceta[K]
    ) {
        setFormularioReceta((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function guardarNotas(nuevaLista: NotaClinica[]) {
        setNotas(nuevaLista);
        localStorage.setItem(
            "notas_clinicas_sistema_clinico",
            JSON.stringify(nuevaLista)
        );
    }

    function guardarTratamientos(nuevaLista: Tratamiento[]) {
        setTratamientos(nuevaLista);
        localStorage.setItem(
            "tratamientos_sistema_clinico",
            JSON.stringify(nuevaLista)
        );
    }

    function guardarRecetas(nuevaLista: Receta[]) {
        setRecetas(nuevaLista);
        localStorage.setItem("recetas_sistema_clinico", JSON.stringify(nuevaLista));
    }

    function registrarNota(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!paciente) return;

        if (!formularioNota.doctor.trim()) {
            alert("Indica el doctor que atendió.");
            return;
        }

        if (!formularioNota.diagnostico.trim()) {
            alert("El diagnóstico es obligatorio.");
            return;
        }

        if (!formularioNota.procedimiento.trim()) {
            alert("El procedimiento realizado es obligatorio.");
            return;
        }

        const nuevaNota: NotaClinica = {
            id: `NOTA-${Date.now()}`,
            pacienteId: paciente.id,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            doctor: formularioNota.doctor.trim(),
            servicio: formularioNota.servicio.trim(),
            diagnostico: formularioNota.diagnostico.trim(),
            procedimiento: formularioNota.procedimiento.trim(),
            observaciones: formularioNota.observaciones.trim(),
            proximaCita: formularioNota.proximaCita,
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
            estado: "Activa",
        };

        guardarNotas([nuevaNota, ...notas]);
        setFormularioNota(formularioNotaVacio);

        alert("Nota clínica registrada correctamente.");
    }

    function registrarTratamiento(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!paciente) return;

        if (!formularioTratamiento.nombre.trim()) {
            alert("El nombre del tratamiento es obligatorio.");
            return;
        }

        const total = numero(formularioTratamiento.total);
        const abonado = numero(formularioTratamiento.abonado);

        if (total < 0 || abonado < 0) {
            alert("Los montos no pueden ser negativos.");
            return;
        }

        if (abonado > total) {
            alert("El abonado no puede ser mayor que el total.");
            return;
        }

        const nuevoTratamiento: Tratamiento = {
            id: `TRAT-${Date.now()}`,
            pacienteId: paciente.id,
            fecha: fechaHoyLocal(),
            nombre: formularioTratamiento.nombre.trim(),
            descripcion: formularioTratamiento.descripcion.trim(),
            total,
            abonado,
            estado: formularioTratamiento.estado,
        };

        guardarTratamientos([nuevoTratamiento, ...tratamientos]);
        setFormularioTratamiento(formularioTratamientoVacio);

        alert("Tratamiento registrado correctamente.");
    }

    function registrarReceta(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!paciente) return;

        if (!formularioReceta.doctor.trim()) {
            alert("Indica el doctor que receta.");
            return;
        }

        if (!formularioReceta.medicamento.trim()) {
            alert("El medicamento es obligatorio.");
            return;
        }

        if (!formularioReceta.indicaciones.trim()) {
            alert("Las indicaciones son obligatorias.");
            return;
        }

        const nuevaReceta: Receta = {
            id: `REC-${Date.now()}`,
            pacienteId: paciente.id,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            doctor: formularioReceta.doctor.trim(),
            doctorNombre: formularioReceta.doctor.trim(),
            diagnostico: formularioNota.diagnostico.trim(),
            medicamento: formularioReceta.medicamento.trim(),
            indicaciones: formularioReceta.indicaciones.trim(),
            duracion: formularioReceta.duracion.trim(),
            observaciones: formularioReceta.observaciones.trim(),
            estado: "Activa",
        };

        guardarRecetas([nuevaReceta, ...recetas]);
        setFormularioReceta(formularioRecetaVacio);

        alert("Receta registrada correctamente.");
    }

    function anularNota(id: string) {
        const confirmar = window.confirm("¿Seguro que deseas anular esta nota?");
        if (!confirmar) return;

        const nuevaLista = notas.map((nota) =>
            nota.id === id ? { ...nota, estado: "Anulada" as const } : nota
        );

        guardarNotas(nuevaLista);
    }

    function anularReceta(id: string) {
        const confirmar = window.confirm("¿Seguro que deseas anular esta receta?");
        if (!confirmar) return;

        const nuevaLista = recetas.map((receta) =>
            receta.id === id ? { ...receta, estado: "Anulada" as const } : receta

        );

        guardarRecetas(nuevaLista);
    }

    function cambiarEstadoTratamiento(
        id: string,
        estado: Tratamiento["estado"]
    ) {
        const nuevaLista = tratamientos.map((tratamiento) =>
            tratamiento.id === id
                ? {
                    ...tratamiento,
                    estado,
                }
                : tratamiento
        );

        guardarTratamientos(nuevaLista);
    }

    const citasPaciente = useMemo(() => {
        return citas
            .filter(
                (cita) =>
                    cita.pacienteId === pacienteId ||
                    cita.pacienteNombre.toLowerCase() ===
                    (paciente?.nombre || "").toLowerCase()
            )
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );
    }, [citas, pacienteId, paciente]);

    const ventasPaciente = useMemo(() => {
        return ventas
            .filter(
                (venta) =>
                    venta.pacienteId === pacienteId ||
                    venta.clienteNombre.toLowerCase() ===
                    (paciente?.nombre || "").toLowerCase()
            )
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );
    }, [ventas, pacienteId, paciente]);

    const cuentasPaciente = useMemo(() => {
        return cuentas
            .filter(
                (cuenta) =>
                    cuenta.pacienteId === pacienteId ||
                    cuenta.pacienteNombre.toLowerCase() ===
                    (paciente?.nombre || "").toLowerCase()
            )
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [cuentas, pacienteId, paciente]);

    const notasPaciente = useMemo(() => {
        return notas
            .filter((nota) => nota.pacienteId === pacienteId)
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );
    }, [notas, pacienteId]);

    const tratamientosPaciente = useMemo(() => {
        return tratamientos
            .filter((tratamiento) => tratamiento.pacienteId === pacienteId)
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [tratamientos, pacienteId]);

    const recetasPaciente = useMemo(() => {
        return recetas
            .filter((receta) => receta.pacienteId === pacienteId)
            .sort((a, b) =>
                `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
            );
    }, [recetas, pacienteId]);

    const ventasActivasPaciente = ventasPaciente.filter(
        (venta) => venta.estado !== "Anulada"
    );

    const cuentasPendientes = cuentasPaciente.filter(
        (cuenta) => cuenta.estado !== "Pagada" && cuenta.estado !== "Anulada"
    );

    const saldoPendiente = cuentasPendientes.reduce(
        (total, cuenta) => total + (cuenta.saldo || 0),
        0
    );

    const totalFacturado = ventasActivasPaciente.reduce(
        (total, venta) => total + (venta.total || 0),
        0
    );

    const totalCobrado = ventasActivasPaciente.reduce(
        (total, venta) =>
            total +
            (venta.efectivo || 0) +
            (venta.tarjeta || 0) +
            (venta.transferencia || 0),
        0
    );

    const totalTratamientos = tratamientosPaciente.reduce(
        (total, tratamiento) => total + (tratamiento.total || 0),
        0
    );

    const totalPendienteTratamientos = tratamientosPaciente.reduce(
        (total, tratamiento) =>
            total + Math.max((tratamiento.total || 0) - (tratamiento.abonado || 0), 0),
        0
    );

    const citasPendientes = citasPaciente.filter(
        (cita) =>
            cita.estado !== "Atendida" &&
            cita.estado !== "Cobrada" &&
            cita.estado !== "Cancelada" &&
            cita.estado !== "No asistió"
    );

    const tieneAlertaClinica = Boolean(
        paciente?.alergias?.trim() ||
        paciente?.enfermedades?.trim() ||
        paciente?.medicamentos?.trim()
    );

    if (!paciente) {
        return (
            <AppShell
                titulo="Perfil del paciente"
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
                        Puede que el paciente haya sido eliminado o que el enlace no sea
                        válido.
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
            titulo={`Perfil: ${paciente.nombre}`}
            descripcion="Ficha clínica, historial, tratamientos, recetas y estado de cuenta"
            moduloActivo="Pacientes"
        >
            <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Link
                    href="/pacientes"
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Pacientes
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
                        href={`/pacientes/${paciente.id}/presupuestos`}
                        className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                    >
                        <FileText className="h-4 w-4" />
                        Presupuestos
                    </Link>

                    <Link
                        href={`/expediente/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-3 text-[12px] font-bold text-purple-700 hover:bg-purple-100"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Expediente imprimible
                    </Link>
                    <Link
                        href={`/pacientes/${paciente.id}/documentos`}
                        className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-[12px] font-bold text-slate-700 hover:bg-slate-200"
                    >
                        <Paperclip className="h-4 w-4" />
                        Documentos
                    </Link>
                    <Link
                        href={`/pacientes/${paciente.id}/linea-tiempo`}
                        className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3 text-[12px] font-bold text-orange-700 hover:bg-orange-100"
                    >
                        <Activity className="h-4 w-4" />
                        Línea de tiempo
                    </Link>
                    <Link
                        href={`/estado-cuenta/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700 hover:bg-amber-100"
                    >
                        <WalletCards className="h-4 w-4" />
                        Estado de cuenta
                    </Link>

                    <Link
                        href={`/consentimientos/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Consentimiento
                    </Link>
                    <Link
                        href={`/constancias/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-cyan-50 px-4 py-3 text-[12px] font-bold text-cyan-700 hover:bg-cyan-100"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Constancia
                    </Link>
                    <Link
                        href={`/ordenes-estudio/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-[12px] font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                        <Stethoscope className="h-4 w-4" />
                        Orden de estudio
                    </Link>
                    <Link
                        href="/agenda"
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva cita
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

            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
                    <div className="flex flex-col gap-5 md:flex-row md:items-start">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 text-2xl font-black text-white">
                            {iniciales(paciente.nombre)}
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-3xl font-black">{paciente.nombre}</h2>

                                <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-black ${paciente.estado === "Activo"
                                        ? "bg-emerald-500/15 text-emerald-300"
                                        : "bg-red-500/15 text-red-300"
                                        }`}
                                >
                                    {paciente.estado}
                                </span>
                            </div>

                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                                Centro clínico y administrativo del paciente. Aquí se manejan
                                notas clínicas, tratamientos, recetas, citas, pagos y saldos.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                    Cédula: {paciente.cedula || "No registrada"}
                                </span>

                                <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                    Edad: {calcularEdad(paciente.fechaNacimiento)}
                                </span>

                                <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                    Última cita: {fechaLegible(paciente.ultimaCita)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Balance pendiente
                        </p>

                        <h3 className="mt-3 text-3xl font-black">
                            {formatoMoneda(saldoPendiente, configuracion.simboloMoneda)}
                        </h3>

                        <p className="mt-2 text-sm text-white/50">
                            Saldo pendiente en cuentas por cobrar.
                        </p>
                    </div>
                </div>
            </section>

            {tieneAlertaClinica && (
                <section className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Alerta clínica del paciente
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Revisá alergias, enfermedades y medicamentos antes de realizar
                                cualquier procedimiento.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <CalendarClock className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {citasPaciente.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Citas registradas
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <BadgeDollarSign className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(totalFacturado, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total facturado
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <CheckCircle2 className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(totalCobrado, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total cobrado
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <WalletCards className="h-[18px] w-[18px]" />
                    </div>

                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {formatoMoneda(
                            totalPendienteTratamientos,
                            configuracion.simboloMoneda
                        )}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Tratamientos pendientes
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex items-center gap-2">
                                <HeartPulse className="h-5 w-5 text-red-700" />
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Información clínica
                                </h3>
                            </div>
                        </div>

                        <div className="grid gap-3 p-5">
                            <div className="rounded-2xl bg-red-50 p-4">
                                <p className="text-[11px] font-bold text-red-700">Alergias</p>
                                <p className="mt-1 text-sm font-black text-red-800">
                                    {paciente.alergias || "No refiere"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-amber-50 p-4">
                                <p className="text-[11px] font-bold text-amber-700">
                                    Enfermedades importantes
                                </p>
                                <p className="mt-1 text-sm font-black text-amber-800">
                                    {paciente.enfermedades || "Ninguna registrada"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-blue-50 p-4">
                                <p className="text-[11px] font-bold text-blue-700">
                                    Medicamentos actuales
                                </p>
                                <p className="mt-1 text-sm font-black text-blue-800">
                                    {paciente.medicamentos || "Ninguno"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-[11px] font-bold text-slate-400">
                                    Observaciones generales
                                </p>
                                <p className="mt-1 text-sm font-black text-slate-800">
                                    {paciente.observaciones || "Sin observaciones registradas"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex items-center gap-2">
                                <UserRound className="h-5 w-5 text-teal-700" />
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Datos generales
                                </h3>
                            </div>
                        </div>

                        <div className="grid gap-3 p-5">
                            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                                <Phone className="h-5 w-5 text-teal-700" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Teléfono
                                    </p>
                                    <p className="text-sm font-black text-slate-800">
                                        {paciente.telefono || "No registrado"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                                <MapPin className="h-5 w-5 text-red-700" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Dirección
                                    </p>
                                    <p className="text-sm font-black text-slate-800">
                                        {paciente.direccion || "No registrada"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-blue-700" />
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Nueva nota clínica
                                </h3>
                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                                Registra diagnóstico, procedimiento y observaciones.
                            </p>
                        </div>

                        <form onSubmit={registrarNota} className="space-y-4 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <input
                                    value={formularioNota.doctor}
                                    onChange={(event) =>
                                        actualizarNota("doctor", event.target.value)
                                    }
                                    placeholder="Doctor que atiende"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />

                                <input
                                    value={formularioNota.servicio}
                                    onChange={(event) =>
                                        actualizarNota("servicio", event.target.value)
                                    }
                                    placeholder="Servicio realizado"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <textarea
                                value={formularioNota.diagnostico}
                                onChange={(event) =>
                                    actualizarNota("diagnostico", event.target.value)
                                }
                                rows={3}
                                placeholder="Diagnóstico"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <textarea
                                value={formularioNota.procedimiento}
                                onChange={(event) =>
                                    actualizarNota("procedimiento", event.target.value)
                                }
                                rows={3}
                                placeholder="Procedimiento realizado"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <textarea
                                value={formularioNota.observaciones}
                                onChange={(event) =>
                                    actualizarNota("observaciones", event.target.value)
                                }
                                rows={3}
                                placeholder="Observaciones clínicas"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <input
                                value={formularioNota.proximaCita}
                                onChange={(event) =>
                                    actualizarNota("proximaCita", event.target.value)
                                }
                                type="date"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                <Save className="h-4 w-4" />
                                Guardar nota clínica
                            </button>
                        </form>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-amber-700" />
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Plan de tratamiento
                                </h3>
                            </div>
                        </div>

                        <form onSubmit={registrarTratamiento} className="space-y-4 p-5">
                            <input
                                value={formularioTratamiento.nombre}
                                onChange={(event) =>
                                    actualizarTratamiento("nombre", event.target.value)
                                }
                                placeholder="Nombre del tratamiento"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <textarea
                                value={formularioTratamiento.descripcion}
                                onChange={(event) =>
                                    actualizarTratamiento("descripcion", event.target.value)
                                }
                                rows={3}
                                placeholder="Descripción del tratamiento"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <div className="grid gap-4 md:grid-cols-3">
                                <input
                                    value={formularioTratamiento.total}
                                    onChange={(event) =>
                                        actualizarTratamiento("total", event.target.value)
                                    }
                                    type="number"
                                    placeholder="Total"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />

                                <input
                                    value={formularioTratamiento.abonado}
                                    onChange={(event) =>
                                        actualizarTratamiento("abonado", event.target.value)
                                    }
                                    type="number"
                                    placeholder="Abonado"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />

                                <select
                                    value={formularioTratamiento.estado}
                                    onChange={(event) =>
                                        actualizarTratamiento(
                                            "estado",
                                            event.target.value as FormularioTratamiento["estado"]
                                        )
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option>Planificado</option>
                                    <option>En proceso</option>
                                    <option>Completado</option>
                                    <option>Suspendido</option>
                                </select>
                            </div>

                            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                <Save className="h-4 w-4" />
                                Guardar tratamiento
                            </button>

                            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total tratamientos</span>
                                    <strong>
                                        {formatoMoneda(
                                            totalTratamientos,
                                            configuracion.simboloMoneda
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex items-center gap-2">
                                <Pill className="h-5 w-5 text-purple-700" />
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Nueva receta
                                </h3>
                            </div>
                        </div>

                        <form onSubmit={registrarReceta} className="space-y-4 p-5">
                            <input
                                value={formularioReceta.doctor}
                                onChange={(event) =>
                                    actualizarReceta("doctor", event.target.value)
                                }
                                placeholder="Doctor que receta"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <input
                                value={formularioReceta.medicamento}
                                onChange={(event) =>
                                    actualizarReceta("medicamento", event.target.value)
                                }
                                placeholder="Medicamento"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <textarea
                                value={formularioReceta.indicaciones}
                                onChange={(event) =>
                                    actualizarReceta("indicaciones", event.target.value)
                                }
                                rows={3}
                                placeholder="Indicaciones"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <input
                                value={formularioReceta.duracion}
                                onChange={(event) =>
                                    actualizarReceta("duracion", event.target.value)
                                }
                                placeholder="Duración. Ejemplo: 7 días"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <textarea
                                value={formularioReceta.observaciones}
                                onChange={(event) =>
                                    actualizarReceta("observaciones", event.target.value)
                                }
                                rows={3}
                                placeholder="Observaciones"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />

                            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                <Save className="h-4 w-4" />
                                Guardar receta
                            </button>
                        </form>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="text-[18px] font-black text-slate-800">
                                        Historial clínico
                                    </h3>
                                    <p className="mono mt-1 text-[10px] text-slate-400">
                                        {notasPaciente.length} nota(s) registrada(s)
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[620px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {notasPaciente.map((nota) => (
                                    <div
                                        key={nota.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                                        {fechaLegible(nota.fecha)} · {nota.hora}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${nota.estado === "Activa"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-red-50 text-red-700"
                                                            }`}
                                                    >
                                                        {nota.estado}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {nota.servicio || "Consulta clínica"}
                                                </h4>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    Doctor: {nota.doctor} · Registró: {nota.usuarioNombre}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Link
                                                    href={`/notas/${nota.id}`}
                                                    className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Imprimir
                                                </Link>

                                                {nota.estado !== "Anulada" && (
                                                    <button
                                                        onClick={() => anularNota(nota.id)}
                                                        className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        Anular
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                            <div className="rounded-2xl bg-slate-50 p-4">
                                                <p className="text-[10px] font-bold uppercase text-slate-400">
                                                    Diagnóstico
                                                </p>
                                                <p className="mt-1 text-sm text-slate-700">
                                                    {nota.diagnostico}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl bg-slate-50 p-4">
                                                <p className="text-[10px] font-bold uppercase text-slate-400">
                                                    Procedimiento
                                                </p>
                                                <p className="mt-1 text-sm text-slate-700">
                                                    {nota.procedimiento}
                                                </p>
                                            </div>
                                        </div>

                                        {nota.observaciones && (
                                            <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                                                {nota.observaciones}
                                            </p>
                                        )}

                                        {nota.proximaCita && (
                                            <p className="mt-3 text-xs font-bold text-teal-700">
                                                Próxima cita sugerida: {fechaLegible(nota.proximaCita)}
                                            </p>
                                        )}
                                    </div>
                                ))}

                                {notasPaciente.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin notas clínicas
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Todavía no hay notas clínicas para este paciente.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Tratamientos registrados
                            </h3>
                            <p className="mono mt-1 text-[10px] text-slate-400">
                                {tratamientosPaciente.length} tratamiento(s)
                            </p>
                        </div>

                        <div className="p-4">
                            <div className="space-y-3">
                                {tratamientosPaciente.map((tratamiento) => (
                                    <div
                                        key={tratamiento.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorTratamiento(
                                                        tratamiento.estado
                                                    )}`}
                                                >
                                                    {tratamiento.estado}
                                                </span>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {tratamiento.nombre}
                                                </h4>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {fechaLegible(tratamiento.fecha)}
                                                </p>
                                            </div>

                                            <p className="text-sm font-black text-slate-800">
                                                {formatoMoneda(
                                                    tratamiento.total,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>

                                        <p className="mt-3 text-sm leading-6 text-slate-600">
                                            {tratamiento.descripcion || "Sin descripción"}
                                        </p>

                                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                                            <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    Total
                                                </p>
                                                <strong>
                                                    {formatoMoneda(
                                                        tratamiento.total,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="rounded-2xl bg-emerald-50 p-3 text-sm">
                                                <p className="text-[10px] font-bold text-emerald-700">
                                                    Abonado
                                                </p>
                                                <strong className="text-emerald-700">
                                                    {formatoMoneda(
                                                        tratamiento.abonado,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="rounded-2xl bg-amber-50 p-3 text-sm">
                                                <p className="text-[10px] font-bold text-amber-700">
                                                    Pendiente
                                                </p>
                                                <strong className="text-amber-700">
                                                    {formatoMoneda(
                                                        Math.max(
                                                            tratamiento.total - tratamiento.abonado,
                                                            0
                                                        ),
                                                        configuracion.simboloMoneda
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/tratamientos/${tratamiento.id}`}
                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                                        >
                                            <FileText className="h-4 w-4" />
                                            Imprimir tratamiento
                                        </Link>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {(
                                                [
                                                    "Planificado",
                                                    "En proceso",
                                                    "Completado",
                                                    "Suspendido",
                                                ] as const
                                            ).map((estado) => (
                                                <button
                                                    key={estado}
                                                    onClick={() =>
                                                        cambiarEstadoTratamiento(tratamiento.id, estado)
                                                    }
                                                    className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                                >
                                                    {estado}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {tratamientosPaciente.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <Activity className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin tratamientos
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            No hay tratamientos registrados.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Recetas registradas
                            </h3>
                            <p className="mono mt-1 text-[10px] text-slate-400">
                                {recetasPaciente.length} receta(s)
                            </p>
                        </div>

                        <div className="p-4">
                            <div className="space-y-3">
                                {recetasPaciente.map((receta) => (
                                    <div
                                        key={receta.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                                        {fechaLegible(receta.fecha)} · {receta.hora}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${receta.estado === "Activa"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-red-50 text-red-700"
                                                            }`}
                                                    >
                                                        {receta.estado}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {receta.medicamento}
                                                </h4>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    Doctor: {receta.doctor}
                                                </p>
                                            </div>

                                            {receta.estado !== "Anulada" && (
                                                <button
                                                    onClick={() => anularReceta(receta.id)}
                                                    className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Anular
                                                </button>
                                            )}
                                        </div>

                                        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                            {receta.indicaciones}
                                        </p>

                                        {receta.duracion && (
                                            <p className="mt-2 text-xs font-bold text-slate-500">
                                                Duración: {receta.duracion}
                                            </p>
                                        )}

                                        {receta.observaciones && (
                                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                                {receta.observaciones}
                                            </p>
                                        )}

                                        <Link
                                            href={`/recetas/${receta.id}`}
                                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                                        >
                                            <FileText className="h-4 w-4" />
                                            Imprimir receta
                                        </Link>
                                    </div>
                                ))}

                                {recetasPaciente.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <Pill className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin recetas
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            No hay recetas registradas.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Historial de citas
                            </h3>
                            <p className="mono mt-1 text-[10px] text-slate-400">
                                {citasPendientes.length} pendiente(s)
                            </p>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {citasPaciente.map((cita) => (
                                    <Link
                                        key={cita.id}
                                        href="/agenda"
                                        className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-teal-100 hover:bg-teal-50/20"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                                        {fechaLegible(cita.fecha)} · {cita.hora}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoCita(
                                                            cita.estado
                                                        )}`}
                                                    >
                                                        {cita.estado}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {cita.servicioNombre}
                                                </h4>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {cita.doctorNombre}
                                                </p>
                                            </div>

                                            <p className="text-sm font-black text-slate-800">
                                                {formatoMoneda(cita.costo, configuracion.simboloMoneda)}
                                            </p>
                                        </div>
                                    </Link>
                                ))}

                                {citasPaciente.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin citas registradas
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Este paciente todavía no tiene historial de agenda.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Estado de cuenta
                            </h3>
                            <p className="mono mt-1 text-[10px] text-slate-400">
                                Ventas, pagos y saldos del paciente
                            </p>
                        </div>

                        <div className="p-5">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-[11px] font-bold text-emerald-700">
                                        Facturado
                                    </p>
                                    <p className="mt-1 text-sm font-black text-emerald-700">
                                        {formatoMoneda(
                                            totalFacturado,
                                            configuracion.simboloMoneda
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-teal-50 p-4">
                                    <p className="text-[11px] font-bold text-teal-700">
                                        Cobrado
                                    </p>
                                    <p className="mt-1 text-sm font-black text-teal-700">
                                        {formatoMoneda(totalCobrado, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-amber-50 p-4">
                                    <p className="text-[11px] font-bold text-amber-700">
                                        Pendiente
                                    </p>
                                    <p className="mt-1 text-sm font-black text-amber-700">
                                        {formatoMoneda(saldoPendiente, configuracion.simboloMoneda)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {cuentasPaciente.map((cuenta) => {
                                    const estadoVisual = estadoVisualCuenta(
                                        cuenta.fechaVencimiento,
                                        cuenta.estado
                                    );

                                    return (
                                        <div
                                            key={cuenta.id}
                                            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoCuenta(
                                                            estadoVisual
                                                        )}`}
                                                    >
                                                        {estadoVisual}
                                                    </span>

                                                    <h4 className="mt-3 text-sm font-black text-slate-800">
                                                        {cuenta.concepto}
                                                    </h4>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Vence: {fechaLegible(cuenta.fechaVencimiento)}
                                                    </p>
                                                </div>

                                                <p className="text-sm font-black text-slate-800">
                                                    {formatoMoneda(
                                                        cuenta.saldo,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {cuentasPaciente.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                        <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-3 text-xs text-slate-400">
                                            No hay cuentas por cobrar para este paciente.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Últimas ventas
                            </h3>
                        </div>

                        <div className="p-4">
                            <div className="space-y-3">
                                {ventasPaciente.slice(0, 6).map((venta) => (
                                    <Link
                                        key={venta.id}
                                        href={`/recibos/${venta.id}`}
                                        className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-teal-100 hover:bg-teal-50/20"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <span className="mono rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                                    {fechaLegible(venta.fecha)} · {venta.hora}
                                                </span>

                                                <h4 className="mt-3 text-sm font-black text-slate-800">
                                                    {venta.concepto}
                                                </h4>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {venta.tipoCobro} · {venta.estado}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-800">
                                                    {formatoMoneda(
                                                        venta.total,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>

                                                <p className="mt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-teal-700">
                                                    <ReceiptText className="h-3.5 w-3.5" />
                                                    Recibo
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}

                                {ventasPaciente.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                        <Stethoscope className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-3 text-xs text-slate-400">
                                            No hay ventas registradas para este paciente.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {saldoPendiente > 0 && (
                <section className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Este paciente tiene saldo pendiente
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Antes de nuevos procedimientos, revisá las cuentas por cobrar o
                                registrá un abono desde Caja y Venta.
                            </p>
                        </div>
                    </div>
                </section>
            )}
        </AppShell>
    );
}