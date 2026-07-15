"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BadgeDollarSign,
    CalendarPlus,
    ClipboardList,
    Edit3,
    FileText,
    HeartPulse,
    IdCard,
    MapPin,
    Phone,
    Plus,
    Search,
    ShieldAlert,
    Stethoscope,
    Trash2,
    UserRound,
    Users,
    WalletCards,
    X,
} from "lucide-react";
import AppShell from "@/components/AppShell";

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

type FormularioPaciente = {
    nombre: string;
    telefono: string;
    cedula: string;
    fechaNacimiento: string;
    direccion: string;
    alergias: string;
    enfermedades: string;
    medicamentos: string;
    observaciones: string;
};

type EstadoCuenta = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

type AbonoCuenta = {
    id?: string;
    fecha?: string;
    hora?: string;
    monto?: number | string;
    metodo?: string;
};

type CuentaPorCobrar = {
    id?: string;
    ventaId?: string;
    pacienteId?: string;
    pacienteNombre?: string;
    nombrePaciente?: string;
    clienteNombre?: string;
    concepto?: string;
    total?: number | string;
    abonado?: number | string;
    saldo?: number | string;
    saldoPendiente?: number | string;
    balancePendiente?: number | string;
    pendiente?: number | string;
    montoPendiente?: number | string;
    fecha?: string;
    fechaVencimiento?: string;
    estado?: EstadoCuenta | string;
    abonos?: AbonoCuenta[];
};

const PACIENTES_KEY = "pacientes_sistema_clinico";
const CUENTAS_COBRAR_KEY = "cuentas_cobrar_sistema_clinico";

const pacientesIniciales: Paciente[] = [
    {
        id: "1",
        nombre: "María López",
        telefono: "8888-1122",
        cedula: "001-010190-0000A",
        fechaNacimiento: "1990-01-01",
        direccion: "Managua, Nicaragua",
        alergias: "Penicilina",
        enfermedades: "Ninguna registrada",
        medicamentos: "No refiere",
        observaciones: "Paciente frecuente. Prefiere citas por la mañana.",
        estado: "Activo",
        saldoPendiente: 0,
        ultimaCita: "",
    },
    {
        id: "2",
        nombre: "Carlos Hernández",
        telefono: "7777-3344",
        cedula: "001-150285-0001B",
        fechaNacimiento: "1985-02-15",
        direccion: "Masaya, Nicaragua",
        alergias: "No refiere",
        enfermedades: "Hipertensión controlada",
        medicamentos: "Losartán",
        observaciones: "Controlar presión antes de procedimientos.",
        estado: "Activo",
        saldoPendiente: 1500,
        ultimaCita: "",
    },
    {
        id: "3",
        nombre: "Fernanda Ruiz",
        telefono: "8555-9988",
        cedula: "001-100300-0002C",
        fechaNacimiento: "2000-03-10",
        direccion: "Carretera Sur, Managua",
        alergias: "No refiere",
        enfermedades: "No refiere",
        medicamentos: "No refiere",
        observaciones: "Interesada en tratamiento estético.",
        estado: "Activo",
        saldoPendiente: 0,
        ultimaCita: "",
    },
];

const formularioVacio: FormularioPaciente = {
    nombre: "",
    telefono: "",
    cedula: "",
    fechaNacimiento: "",
    direccion: "",
    alergias: "",
    enfermedades: "",
    medicamentos: "",
    observaciones: "",
};

function calcularEdad(fechaNacimiento: string) {
    if (!fechaNacimiento) return "No registrada";

    const fecha = new Date(fechaNacimiento);
    const hoy = new Date();

    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mes = hoy.getMonth() - fecha.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) {
        edad--;
    }

    if (Number.isNaN(edad)) return "No registrada";

    return `${edad} años`;
}

function iniciales(nombre: string) {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "PX";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function tieneAlerta(valor: string) {
    const texto = valor.trim().toLowerCase();

    if (!texto) return false;
    if (texto === "no") return false;
    if (texto === "ninguna") return false;
    if (texto === "ninguno") return false;
    if (texto === "no refiere") return false;
    if (texto === "ninguna registrada") return false;

    return true;
}

function pacienteTieneAlertas(paciente: Paciente) {
    return (
        tieneAlerta(paciente.alergias) ||
        tieneAlerta(paciente.enfermedades) ||
        tieneAlerta(paciente.medicamentos)
    );
}

function formatoMoneda(valor: number) {
    return `C$ ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function normalizarTexto(valor: unknown) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function leerCuentasPorCobrarGuardadas() {
    if (typeof window === "undefined") return [] as CuentaPorCobrar[];

    const clavesPosibles = [
        CUENTAS_COBRAR_KEY,
        "cuentas_por_cobrar_sistema_clinico",
        "cuentas_sistema_clinico",
    ];

    for (const clave of clavesPosibles) {
        try {
            const datos = localStorage.getItem(clave);
            if (!datos) continue;

            const lista = JSON.parse(datos) as CuentaPorCobrar[];
            if (Array.isArray(lista)) return lista;
        } catch {
            continue;
        }
    }

    return [];
}

function cuentaDebeContarse(cuenta: CuentaPorCobrar) {
    const estado = normalizarTexto(cuenta.estado || "Pendiente");

    if (estado === "pagada") return false;
    if (estado === "anulada") return false;
    if (estado === "cancelada") return false;

    return true;
}

function cuentaPerteneceAPaciente(cuenta: CuentaPorCobrar, paciente: Paciente) {
    if (cuenta.pacienteId && String(cuenta.pacienteId) === String(paciente.id)) {
        return true;
    }

    const nombrePaciente = normalizarTexto(paciente.nombre);
    const nombresCuenta = [
        cuenta.pacienteNombre,
        cuenta.nombrePaciente,
        cuenta.clienteNombre,
    ].map(normalizarTexto);

    return nombresCuenta.some((nombre) => nombre && nombre === nombrePaciente);
}

function obtenerSaldoCuenta(cuenta: CuentaPorCobrar) {
    const camposSaldo = [
        cuenta.saldo,
        cuenta.saldoPendiente,
        cuenta.balancePendiente,
        cuenta.pendiente,
        cuenta.montoPendiente,
    ];

    const saldoDirecto = camposSaldo.find((valor) => valor !== undefined && valor !== null && valor !== "");

    if (saldoDirecto !== undefined) {
        return Math.max(numero(saldoDirecto), 0);
    }

    const total = numero(cuenta.total);
    const abonadoDirecto = cuenta.abonado !== undefined ? numero(cuenta.abonado) : 0;
    const abonadoPorAbonos = Array.isArray(cuenta.abonos)
        ? cuenta.abonos.reduce((suma, abono) => suma + numero(abono.monto), 0)
        : 0;

    return Math.max(total - Math.max(abonadoDirecto, abonadoPorAbonos), 0);
}

function obtenerSaldoPaciente(paciente: Paciente, cuentasCobrar: CuentaPorCobrar[]) {
    return cuentasCobrar.reduce((total, cuenta) => {
        if (!cuentaDebeContarse(cuenta)) return total;
        if (!cuentaPerteneceAPaciente(cuenta, paciente)) return total;

        return total + obtenerSaldoCuenta(cuenta);
    }, 0);
}

function colorEstado(estado: Paciente["estado"]) {
    if (estado === "Activo") {
        return "border-emerald-100 bg-emerald-50 text-emerald-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-500";
}

function leerPacientesGuardados() {
    if (typeof window === "undefined") return pacientesIniciales;

    try {
        const pacientesGuardados = localStorage.getItem(PACIENTES_KEY);

        if (!pacientesGuardados) {
            localStorage.setItem(PACIENTES_KEY, JSON.stringify(pacientesIniciales));
            return pacientesIniciales;
        }

        const lista = JSON.parse(pacientesGuardados) as Paciente[];

        if (!Array.isArray(lista)) return pacientesIniciales;

        return lista;
    } catch {
        return pacientesIniciales;
    }
}

export default function PacientesPage() {
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [cuentasCobrar, setCuentasCobrar] = useState<CuentaPorCobrar[]>([]);
    const [formulario, setFormulario] =
        useState<FormularioPaciente>(formularioVacio);
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState<
        "Todos" | "Activo" | "Inactivo"
    >("Todos");
    const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState("");
    const [pacienteEditandoId, setPacienteEditandoId] = useState<string | null>(
        null
    );
    const [modalPacienteAbierto, setModalPacienteAbierto] = useState(false);

    useEffect(() => {
        const lista = leerPacientesGuardados();

        setPacientes(lista);
        setCuentasCobrar(leerCuentasPorCobrarGuardadas());
        setPacienteSeleccionadoId(lista[0]?.id || "");
    }, []);

    function guardarListaPacientes(nuevaLista: Paciente[]) {
        setPacientes(nuevaLista);
        localStorage.setItem(PACIENTES_KEY, JSON.stringify(nuevaLista));
        setCuentasCobrar(leerCuentasPorCobrarGuardadas());
    }

    function actualizarCampo<K extends keyof FormularioPaciente>(
        campo: K,
        valor: FormularioPaciente[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function limpiarFormulario() {
        setFormulario(formularioVacio);
        setPacienteEditandoId(null);
    }

    function abrirModalNuevoPaciente() {
        limpiarFormulario();
        setModalPacienteAbierto(true);
    }

    function cerrarModalPaciente() {
        setModalPacienteAbierto(false);
        limpiarFormulario();
    }

    function guardarPaciente(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!formulario.nombre.trim()) {
            alert("El nombre del paciente es obligatorio.");
            return;
        }

        if (!formulario.telefono.trim()) {
            alert("El teléfono del paciente es obligatorio.");
            return;
        }

        if (pacienteEditandoId) {
            const nuevaLista = pacientes.map((paciente) =>
                paciente.id === pacienteEditandoId
                    ? {
                        ...paciente,
                        nombre: formulario.nombre.trim(),
                        telefono: formulario.telefono.trim(),
                        cedula: formulario.cedula.trim(),
                        fechaNacimiento: formulario.fechaNacimiento,
                        direccion: formulario.direccion.trim(),
                        alergias: formulario.alergias.trim() || "No refiere",
                        enfermedades:
                            formulario.enfermedades.trim() || "No refiere",
                        medicamentos:
                            formulario.medicamentos.trim() || "No refiere",
                        observaciones: formulario.observaciones.trim(),
                    }
                    : paciente
            );

            guardarListaPacientes(nuevaLista);
            setPacienteSeleccionadoId(pacienteEditandoId);
            cerrarModalPaciente();

            alert("Paciente actualizado correctamente.");
            return;
        }

        const nuevoPaciente: Paciente = {
            id: Date.now().toString(),
            nombre: formulario.nombre.trim(),
            telefono: formulario.telefono.trim(),
            cedula: formulario.cedula.trim(),
            fechaNacimiento: formulario.fechaNacimiento,
            direccion: formulario.direccion.trim(),
            alergias: formulario.alergias.trim() || "No refiere",
            enfermedades: formulario.enfermedades.trim() || "No refiere",
            medicamentos: formulario.medicamentos.trim() || "No refiere",
            observaciones: formulario.observaciones.trim(),
            estado: "Activo",
            saldoPendiente: 0,
            ultimaCita: "",
        };

        guardarListaPacientes([nuevoPaciente, ...pacientes]);
        setPacienteSeleccionadoId(nuevoPaciente.id);
        cerrarModalPaciente();

        alert("Paciente registrado correctamente.");
    }

    function editarPaciente(paciente: Paciente) {
        setPacienteEditandoId(paciente.id);
        setFormulario({
            nombre: paciente.nombre,
            telefono: paciente.telefono,
            cedula: paciente.cedula,
            fechaNacimiento: paciente.fechaNacimiento,
            direccion: paciente.direccion,
            alergias: paciente.alergias,
            enfermedades: paciente.enfermedades,
            medicamentos: paciente.medicamentos,
            observaciones: paciente.observaciones,
        });
        setModalPacienteAbierto(true);
    }

    function cambiarEstadoPaciente(paciente: Paciente) {
        const confirmar = window.confirm(
            `¿Seguro que deseas ${paciente.estado === "Activo" ? "desactivar" : "activar"
            } este paciente?`
        );

        if (!confirmar) return;

        const nuevaLista = pacientes.map((item) =>
            item.id === paciente.id
                ? {
                    ...item,
                    estado: item.estado === "Activo" ? "Inactivo" : "Activo",
                }
                : item
        );

        guardarListaPacientes(nuevaLista);
    }

    const pacientesFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();

        return pacientes.filter((paciente) => {
            const coincideTexto =
                !texto ||
                paciente.nombre.toLowerCase().includes(texto) ||
                paciente.telefono.toLowerCase().includes(texto) ||
                paciente.cedula.toLowerCase().includes(texto) ||
                paciente.direccion.toLowerCase().includes(texto);

            const coincideEstado =
                filtroEstado === "Todos" || paciente.estado === filtroEstado;

            return coincideTexto && coincideEstado;
        });
    }, [pacientes, busqueda, filtroEstado]);

    const pacienteSeleccionado =
        pacientes.find((paciente) => paciente.id === pacienteSeleccionadoId) ||
        pacientesFiltrados[0] ||
        null;

    const pacientesActivos = pacientes.filter(
        (paciente) => paciente.estado === "Activo"
    ).length;

    const pacientesConSaldo = pacientes.filter(
        (paciente) => obtenerSaldoPaciente(paciente, cuentasCobrar) > 0
    ).length;

    const saldoTotal = pacientes.reduce(
        (total, paciente) => total + obtenerSaldoPaciente(paciente, cuentasCobrar),
        0
    );

    const pacientesConAlertas = pacientes.filter(pacienteTieneAlertas).length;

    return (
        <AppShell
            titulo="Pacientes"
            descripcion="Directorio clínico limpio, búsqueda rápida y acceso al expediente"
            moduloActivo="Pacientes"
        >
            <section className="rounded-[28px] border border-white bg-white/80 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
                            Directorio clínico
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900">
                            Pacientes
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                            Buscá, revisá datos importantes y abrí rápido el expediente,
                            odontograma, presupuestos o estado de cuenta.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={abrirModalNuevoPaciente}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[13px] font-black text-white shadow-sm hover:bg-slate-800 lg:w-fit"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo paciente
                    </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-500">Total</p>
                            <Users className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-900">
                            {pacientes.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-emerald-700">
                                Activos
                            </p>
                            <UserRound className="h-4 w-4 text-emerald-700" />
                        </div>
                        <p className="mt-2 text-2xl font-black text-emerald-800">
                            {pacientesActivos}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-amber-700">
                                Alertas
                            </p>
                            <ShieldAlert className="h-4 w-4 text-amber-700" />
                        </div>
                        <p className="mt-2 text-2xl font-black text-amber-800">
                            {pacientesConAlertas}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-rose-700">
                                Saldo pendiente
                            </p>
                            <BadgeDollarSign className="h-4 w-4 text-rose-700" />
                        </div>
                        <p className="mt-2 text-lg font-black text-rose-800">
                            {formatoMoneda(saldoTotal)}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-rose-600">
                            {pacientesConSaldo} paciente(s)
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="overflow-hidden rounded-[28px] border border-white bg-white/80 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                    <div className="border-b border-slate-100 p-5">
                        <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                    value={busqueda}
                                    onChange={(event) => setBusqueda(event.target.value)}
                                    placeholder="Buscar por nombre, teléfono, cédula o dirección..."
                                    className="w-full bg-transparent text-[13px] font-medium outline-none"
                                />
                            </div>

                            <select
                                value={filtroEstado}
                                onChange={(event) =>
                                    setFiltroEstado(
                                        event.target.value as "Todos" | "Activo" | "Inactivo"
                                    )
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            >
                                <option>Todos</option>
                                <option>Activo</option>
                                <option>Inactivo</option>
                            </select>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-500">
                                Mostrando{" "}
                                <strong className="text-slate-900">
                                    {pacientesFiltrados.length}
                                </strong>{" "}
                                de {pacientes.length} pacientes.
                            </p>

                            {(busqueda || filtroEstado !== "Todos") && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBusqueda("");
                                        setFiltroEstado("Todos");
                                    }}
                                    className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80">
                                    <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                        Paciente
                                    </th>
                                    <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                        Contacto
                                    </th>
                                    <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                        Estado
                                    </th>
                                    <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                        Saldo
                                    </th>
                                    <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {pacientesFiltrados.map((paciente) => {
                                    const seleccionado =
                                        pacienteSeleccionado?.id === paciente.id;
                                    const alerta = pacienteTieneAlertas(paciente);
                                    const saldoActual = obtenerSaldoPaciente(paciente, cuentasCobrar);

                                    return (
                                        <tr
                                            key={paciente.id}
                                            onClick={() =>
                                                setPacienteSeleccionadoId(paciente.id)
                                            }
                                            className={`cursor-pointer border-b border-slate-100 ${seleccionado
                                                    ? "bg-teal-50/70"
                                                    : "hover:bg-slate-50"
                                                }`}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[12px] font-black text-white ${seleccionado
                                                                ? "bg-teal-600"
                                                                : "bg-slate-900"
                                                            }`}
                                                    >
                                                        {iniciales(paciente.nombre)}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate text-sm font-black text-slate-900">
                                                                {paciente.nombre}
                                                            </p>
                                                            {alerta && (
                                                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                                                            )}
                                                        </div>

                                                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                                                            {calcularEdad(
                                                                paciente.fechaNacimiento
                                                            )}{" "}
                                                            ·{" "}
                                                            {paciente.cedula ||
                                                                "Sin cédula"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                    {paciente.telefono || "Sin teléfono"}
                                                </p>
                                                <p className="mt-1 max-w-[230px] truncate text-xs text-slate-500">
                                                    {paciente.direccion ||
                                                        "Dirección no registrada"}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${colorEstado(
                                                        paciente.estado
                                                    )}`}
                                                >
                                                    {paciente.estado}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-right text-xs font-black">
                                                <span
                                                    className={
                                                        saldoActual > 0
                                                            ? "text-rose-600"
                                                            : "text-emerald-600"
                                                    }
                                                >
                                                    {formatoMoneda(saldoActual)}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div
                                                    className="flex justify-end gap-2"
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                >
                                                    <Link
                                                        href={`/pacientes/${paciente.id}`}
                                                        className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800"
                                                    >
                                                        Perfil
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            editarPaciente(paciente)
                                                        }
                                                        className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                                    >
                                                        Editar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {pacientesFiltrados.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-5 py-12 text-center"
                                        >
                                            <Search className="mx-auto h-8 w-8 text-slate-300" />
                                            <h4 className="mt-3 text-sm font-black text-slate-700">
                                                No encontramos pacientes
                                            </h4>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Probá cambiar el filtro o registrar un nuevo
                                                paciente.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-3 p-3 lg:hidden">
                        {pacientesFiltrados.map((paciente) => {
                            const seleccionado =
                                pacienteSeleccionado?.id === paciente.id;
                            const alerta = pacienteTieneAlertas(paciente);
                            const saldoActual = obtenerSaldoPaciente(paciente, cuentasCobrar);

                            return (
                                <button
                                    key={paciente.id}
                                    type="button"
                                    onClick={() =>
                                        setPacienteSeleccionadoId(paciente.id)
                                    }
                                    className={`rounded-2xl border p-4 text-left ${seleccionado
                                            ? "border-teal-200 bg-teal-50/70"
                                            : "border-slate-100 bg-white"
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[12px] font-black text-white ${seleccionado
                                                    ? "bg-teal-600"
                                                    : "bg-slate-900"
                                                }`}
                                        >
                                            {iniciales(paciente.nombre)}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="truncate text-[13px] font-black text-slate-800">
                                                    {paciente.nombre}
                                                </h4>

                                                {alerta && (
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                                )}
                                            </div>

                                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                                                {paciente.telefono || "Sin teléfono"} ·{" "}
                                                {calcularEdad(paciente.fechaNacimiento)}
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${colorEstado(
                                                        paciente.estado
                                                    )}`}
                                                >
                                                    {paciente.estado}
                                                </span>

                                                {saldoActual > 0 && (
                                                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                                                        Debe {formatoMoneda(saldoActual)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {pacientesFiltrados.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                <Search className="mx-auto h-8 w-8 text-slate-300" />
                                <h4 className="mt-3 text-sm font-black text-slate-700">
                                    No encontramos pacientes
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    Probá cambiar el filtro o registrar un nuevo paciente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="space-y-4">
                    {pacienteSeleccionado ? (
                        <div className="overflow-hidden rounded-[28px] border border-white bg-white/80 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                            <div className="bg-slate-900 p-5 text-white">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-black">
                                        {iniciales(pacienteSeleccionado.nombre)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-xl font-black">
                                            {pacienteSeleccionado.nombre}
                                        </h3>
                                        <p className="mt-1 text-xs font-medium text-white/60">
                                            {calcularEdad(
                                                pacienteSeleccionado.fechaNacimiento
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="grid gap-3">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                            <Phone className="h-3.5 w-3.5" />
                                            Teléfono
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-800">
                                            {pacienteSeleccionado.telefono ||
                                                "No registrado"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                            <IdCard className="h-3.5 w-3.5" />
                                            Cédula
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-800">
                                            {pacienteSeleccionado.cedula ||
                                                "No registrada"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                            <MapPin className="h-3.5 w-3.5" />
                                            Dirección
                                        </p>
                                        <p className="mt-1 text-sm font-medium leading-5 text-slate-700">
                                            {pacienteSeleccionado.direccion ||
                                                "No registrada"}
                                        </p>
                                    </div>

                                    {pacienteTieneAlertas(pacienteSeleccionado) && (
                                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                            <p className="flex items-center gap-2 text-[11px] font-black text-amber-700">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                Alertas clínicas
                                            </p>
                                            <p className="mt-2 text-xs leading-5 text-amber-800">
                                                <strong>Alergias:</strong>{" "}
                                                {pacienteSeleccionado.alergias ||
                                                    "No refiere"}
                                                <br />
                                                <strong>Enfermedades:</strong>{" "}
                                                {pacienteSeleccionado.enfermedades ||
                                                    "No refiere"}
                                                <br />
                                                <strong>Medicamentos:</strong>{" "}
                                                {pacienteSeleccionado.medicamentos ||
                                                    "No refiere"}
                                            </p>
                                        </div>
                                    )}

                                    {pacienteSeleccionado.observaciones && (
                                        <div className="rounded-2xl bg-blue-50 p-4">
                                            <p className="flex items-center gap-2 text-[11px] font-bold text-blue-700">
                                                <ClipboardList className="h-3.5 w-3.5" />
                                                Observaciones
                                            </p>
                                            <p className="mt-1 text-sm font-medium leading-5 text-slate-700">
                                                {pacienteSeleccionado.observaciones}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 grid gap-2">
                                    <Link
                                        href={`/pacientes/${pacienteSeleccionado.id}`}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                                    >
                                        <FileText className="h-4 w-4" />
                                        Abrir perfil clínico
                                    </Link>

                                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                        <Link
                                            href={`/expediente/${pacienteSeleccionado.id}`}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                                        >
                                            <FileText className="h-4 w-4" />
                                            Expediente
                                        </Link>

                                        <Link
                                            href={`/estado-cuenta/${pacienteSeleccionado.id}`}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100"
                                        >
                                            <WalletCards className="h-4 w-4" />
                                            Estado cuenta
                                        </Link>

                                        <Link
                                            href={`/pacientes/${pacienteSeleccionado.id}/odontograma`}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-[12px] font-bold text-purple-700 hover:bg-purple-100"
                                        >
                                            <Stethoscope className="h-4 w-4" />
                                            Odontograma
                                        </Link>

                                        <Link
                                            href={`/pacientes/${pacienteSeleccionado.id}/presupuestos`}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-[12px] font-bold text-amber-700 hover:bg-amber-100"
                                        >
                                            <ClipboardList className="h-4 w-4" />
                                            Presupuestos
                                        </Link>

                                        <Link
                                            href="/agenda"
                                            className="flex items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-[12px] font-bold text-teal-700 hover:bg-teal-100"
                                        >
                                            <CalendarPlus className="h-4 w-4" />
                                            Cita
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                editarPaciente(pacienteSeleccionado)
                                            }
                                            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                            Editar
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            cambiarEstadoPaciente(
                                                pacienteSeleccionado
                                            )
                                        }
                                        className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-[12px] font-bold text-rose-700 hover:bg-rose-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {pacienteSeleccionado.estado === "Activo"
                                            ? "Desactivar paciente"
                                            : "Activar paciente"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                            <UserRound className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 text-sm font-black text-slate-700">
                                Seleccioná un paciente
                            </h3>
                            <p className="mt-1 text-xs text-slate-400">
                                Al seleccionar uno de la lista verás sus datos rápidos.
                            </p>
                        </div>
                    )}
                </aside>
            </section>

            {modalPacienteAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    {pacienteEditandoId
                                        ? "Editar paciente"
                                        : "Nuevo paciente"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Completá los datos generales y alertas clínicas del
                                    paciente.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarModalPaciente}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={guardarPaciente}
                            className="max-h-[calc(92vh-92px)] overflow-y-auto p-6"
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Nombre completo
                                    </label>
                                    <input
                                        value={formulario.nombre}
                                        onChange={(event) =>
                                            actualizarCampo("nombre", event.target.value)
                                        }
                                        placeholder="Ejemplo: Ana Martínez"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Teléfono
                                    </label>
                                    <input
                                        value={formulario.telefono}
                                        onChange={(event) =>
                                            actualizarCampo("telefono", event.target.value)
                                        }
                                        placeholder="8888-0000"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Cédula
                                    </label>
                                    <input
                                        value={formulario.cedula}
                                        onChange={(event) =>
                                            actualizarCampo("cedula", event.target.value)
                                        }
                                        placeholder="Número de identificación"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Fecha de nacimiento
                                    </label>
                                    <input
                                        value={formulario.fechaNacimiento}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "fechaNacimiento",
                                                event.target.value
                                            )
                                        }
                                        type="date"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Dirección
                                </label>
                                <textarea
                                    value={formulario.direccion}
                                    onChange={(event) =>
                                        actualizarCampo("direccion", event.target.value)
                                    }
                                    rows={2}
                                    placeholder="Dirección del paciente"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Alergias
                                    </label>
                                    <textarea
                                        value={formulario.alergias}
                                        onChange={(event) =>
                                            actualizarCampo("alergias", event.target.value)
                                        }
                                        rows={3}
                                        placeholder="No refiere"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Enfermedades
                                    </label>
                                    <textarea
                                        value={formulario.enfermedades}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "enfermedades",
                                                event.target.value
                                            )
                                        }
                                        rows={3}
                                        placeholder="No refiere"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Medicamentos
                                    </label>
                                    <textarea
                                        value={formulario.medicamentos}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "medicamentos",
                                                event.target.value
                                            )
                                        }
                                        rows={3}
                                        placeholder="No refiere"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Observaciones generales
                                </label>
                                <textarea
                                    value={formulario.observaciones}
                                    onChange={(event) =>
                                        actualizarCampo(
                                            "observaciones",
                                            event.target.value
                                        )
                                    }
                                    rows={3}
                                    placeholder="Notas administrativas o clínicas generales"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="sticky bottom-0 -mx-6 mt-6 flex flex-col gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur md:flex-row md:justify-end">
                                <button
                                    type="button"
                                    onClick={cerrarModalPaciente}
                                    className="rounded-xl bg-slate-100 px-5 py-3 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                                >
                                    <Plus className="h-4 w-4" />
                                    {pacienteEditandoId
                                        ? "Guardar cambios"
                                        : "Registrar paciente"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}