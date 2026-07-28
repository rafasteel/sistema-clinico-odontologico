"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    Activity,
    BadgeDollarSign,
    BriefcaseMedical,
    CheckCircle2,
    Clock,
    Edit3,
    Mail,
    Phone,
    Plus,
    RefreshCcw,
    Search,
    ShieldAlert,
    Sparkles,
    Stethoscope,
    Trash2,
    UserRound,
    Users,
    X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    actualizarDoctorSupabase,
    actualizarServicioSupabase,
    cambiarEstadoDoctorSupabase,
    cambiarEstadoServicioSupabase,
    crearDoctorSupabase,
    crearServicioSupabase,
    listarDoctoresSupabase,
    listarServiciosSupabase,
    type DoctorSupabase,
    type EstadoRegistroClinico,
    type ServicioSupabase,
} from "@/lib/supabase/doctoresServicios";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "RECEPCION" | "CAJA";
};

type Doctor = {
    id: string;
    nombre: string;
    especialidad: string;
    telefono: string;
    correo: string;
    horario: string;
    estado: EstadoRegistroClinico;
};

type Servicio = {
    id: string;
    nombre: string;
    categoria: string;
    duracionMinutos: number;
    precio: number;
    descripcion: string;
    estado: EstadoRegistroClinico;
};

type FormularioDoctor = {
    nombre: string;
    especialidad: string;
    telefono: string;
    correo: string;
    horario: string;
};

type FormularioServicio = {
    nombre: string;
    categoria: string;
    duracionMinutos: string;
    precio: string;
    descripcion: string;
};

type VistaActiva = "Doctores" | "Servicios";
type ModalActivo = "doctor" | "servicio" | null;

const USUARIO_KEY = "usuario_sistema_clinico";

const formularioDoctorVacio: FormularioDoctor = {
    nombre: "",
    especialidad: "",
    telefono: "",
    correo: "",
    horario: "",
};

const formularioServicioVacio: FormularioServicio = {
    nombre: "",
    categoria: "",
    duracionMinutos: "",
    precio: "",
    descripcion: "",
};

function numero(valor: string) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function formatoMoneda(valor: number) {
    return `C$ ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function iniciales(nombre: string) {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "DR";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function normalizarTexto(texto: string) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function colorEstado(estado: EstadoRegistroClinico) {
    if (estado === "Activo") {
        return "border-emerald-100 bg-emerald-50 text-emerald-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-500";
}

function colorCategoria(categoria: string) {
    const texto = normalizarTexto(categoria);

    if (texto.includes("cirugia")) return "bg-rose-50 text-rose-700";
    if (texto.includes("endo")) return "bg-purple-50 text-purple-700";
    if (texto.includes("prevencion")) return "bg-emerald-50 text-emerald-700";
    if (texto.includes("ortodoncia")) return "bg-blue-50 text-blue-700";
    if (texto.includes("operatoria")) return "bg-amber-50 text-amber-700";

    return "bg-slate-100 text-slate-600";
}

function convertirDoctor(doctor: DoctorSupabase): Doctor {
    return {
        id: doctor.id,
        nombre: doctor.nombre || "",
        especialidad: doctor.especialidad || "",
        telefono: doctor.telefono || "",
        correo: doctor.correo || "",
        horario: doctor.observaciones || "",
        estado: doctor.estado || "Activo",
    };
}

function convertirServicio(servicio: ServicioSupabase): Servicio {
    return {
        id: servicio.id,
        nombre: servicio.nombre || "",
        categoria: servicio.categoria || "General",
        duracionMinutos: Number(servicio.duracion_minutos || 0),
        precio: Number(servicio.precio || 0),
        descripcion: servicio.descripcion || "",
        estado: servicio.estado || "Activo",
    };
}

export default function DoctoresServiciosPage() {
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);

    const [doctores, setDoctores] = useState<Doctor[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);

    const [formularioDoctor, setFormularioDoctor] =
        useState<FormularioDoctor>(formularioDoctorVacio);

    const [formularioServicio, setFormularioServicio] =
        useState<FormularioServicio>(formularioServicioVacio);

    const [doctorEditandoId, setDoctorEditandoId] = useState<string | null>(null);
    const [servicioEditandoId, setServicioEditandoId] = useState<string | null>(
        null
    );

    const [vistaActiva, setVistaActiva] = useState<VistaActiva>("Doctores");
    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState<
        "Todos" | EstadoRegistroClinico
    >("Todos");
    const [modalActivo, setModalActivo] = useState<ModalActivo>(null);

    const [cargandoDatos, setCargandoDatos] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [errorCarga, setErrorCarga] = useState("");

    async function cargarDatos() {
        setCargandoDatos(true);
        setErrorCarga("");

        try {
            const usuarioGuardado =
                typeof window !== "undefined" ? localStorage.getItem(USUARIO_KEY) : null;

            setUsuario(
                usuarioGuardado ? (JSON.parse(usuarioGuardado) as UsuarioSistema) : null
            );

            const [doctoresSupabase, serviciosSupabase] = await Promise.all([
                listarDoctoresSupabase(),
                listarServiciosSupabase(),
            ]);

            setDoctores(doctoresSupabase.map(convertirDoctor));
            setServicios(serviciosSupabase.map(convertirServicio));
        } catch (error) {
            const mensaje =
                error instanceof Error
                    ? error.message
                    : "No se pudieron cargar doctores y servicios desde Supabase.";

            setErrorCarga(mensaje);
        } finally {
            setCargandoDatos(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    const puedeEditar = usuario?.rol === "ADMIN";

    function actualizarDoctor<K extends keyof FormularioDoctor>(
        campo: K,
        valor: FormularioDoctor[K]
    ) {
        setFormularioDoctor((datos) => ({
            ...datos,
            [campo]: valor,
        }));
    }

    function actualizarServicio<K extends keyof FormularioServicio>(
        campo: K,
        valor: FormularioServicio[K]
    ) {
        setFormularioServicio((datos) => ({
            ...datos,
            [campo]: valor,
        }));
    }

    function limpiarDoctor() {
        setFormularioDoctor(formularioDoctorVacio);
        setDoctorEditandoId(null);
    }

    function limpiarServicio() {
        setFormularioServicio(formularioServicioVacio);
        setServicioEditandoId(null);
    }

    function cerrarModal() {
        setModalActivo(null);
        limpiarDoctor();
        limpiarServicio();
        setGuardando(false);
    }

    function abrirNuevoDoctor() {
        if (!puedeEditar) {
            alert("Solo el administrador puede registrar doctores.");
            return;
        }

        limpiarDoctor();
        setModalActivo("doctor");
    }

    function abrirNuevoServicio() {
        if (!puedeEditar) {
            alert("Solo el administrador puede registrar servicios.");
            return;
        }

        limpiarServicio();
        setModalActivo("servicio");
    }

    async function guardarDoctor(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!puedeEditar) {
            alert("Solo el administrador puede modificar doctores.");
            return;
        }

        if (!formularioDoctor.nombre.trim()) {
            alert("El nombre del doctor es obligatorio.");
            return;
        }

        if (!formularioDoctor.especialidad.trim()) {
            alert("La especialidad es obligatoria.");
            return;
        }

        setGuardando(true);

        try {
            const estadoActual =
                doctores.find((doctor) => doctor.id === doctorEditandoId)?.estado ||
                "Activo";

            if (doctorEditandoId) {
                await actualizarDoctorSupabase(doctorEditandoId, {
                    nombre: formularioDoctor.nombre.trim(),
                    especialidad: formularioDoctor.especialidad.trim(),
                    telefono: formularioDoctor.telefono.trim(),
                    correo: formularioDoctor.correo.trim(),
                    color: "#0d9488",
                    observaciones: formularioDoctor.horario.trim(),
                    estado: estadoActual,
                });

                await cargarDatos();
                cerrarModal();
                alert("Doctor actualizado correctamente.");
                return;
            }

            await crearDoctorSupabase({
                nombre: formularioDoctor.nombre.trim(),
                especialidad: formularioDoctor.especialidad.trim(),
                telefono: formularioDoctor.telefono.trim(),
                correo: formularioDoctor.correo.trim(),
                color: "#0d9488",
                observaciones: formularioDoctor.horario.trim(),
                estado: "Activo",
            });

            await cargarDatos();
            cerrarModal();
            setVistaActiva("Doctores");
            alert("Doctor registrado correctamente.");
        } catch (error) {
            const mensaje =
                error instanceof Error
                    ? error.message
                    : "No se pudo guardar el doctor.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function guardarServicio(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!puedeEditar) {
            alert("Solo el administrador puede modificar servicios.");
            return;
        }

        if (!formularioServicio.nombre.trim()) {
            alert("El nombre del servicio es obligatorio.");
            return;
        }

        if (!formularioServicio.categoria.trim()) {
            alert("La categoría es obligatoria.");
            return;
        }

        if (numero(formularioServicio.duracionMinutos) <= 0) {
            alert("La duración debe ser mayor que cero.");
            return;
        }

        if (numero(formularioServicio.precio) <= 0) {
            alert("El precio debe ser mayor que cero.");
            return;
        }

        setGuardando(true);

        try {
            const estadoActual =
                servicios.find((servicio) => servicio.id === servicioEditandoId)
                    ?.estado || "Activo";

            if (servicioEditandoId) {
                await actualizarServicioSupabase(servicioEditandoId, {
                    nombre: formularioServicio.nombre.trim(),
                    categoria: formularioServicio.categoria.trim(),
                    duracion_minutos: numero(formularioServicio.duracionMinutos),
                    precio: numero(formularioServicio.precio),
                    descripcion: formularioServicio.descripcion.trim(),
                    estado: estadoActual,
                });

                await cargarDatos();
                cerrarModal();
                alert("Servicio actualizado correctamente.");
                return;
            }

            await crearServicioSupabase({
                nombre: formularioServicio.nombre.trim(),
                categoria: formularioServicio.categoria.trim(),
                duracion_minutos: numero(formularioServicio.duracionMinutos),
                precio: numero(formularioServicio.precio),
                descripcion: formularioServicio.descripcion.trim(),
                estado: "Activo",
            });

            await cargarDatos();
            cerrarModal();
            setVistaActiva("Servicios");
            alert("Servicio registrado correctamente.");
        } catch (error) {
            const mensaje =
                error instanceof Error
                    ? error.message
                    : "No se pudo guardar el servicio.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    function editarDoctor(doctor: Doctor) {
        if (!puedeEditar) {
            alert("Solo el administrador puede modificar doctores.");
            return;
        }

        setDoctorEditandoId(doctor.id);
        setFormularioDoctor({
            nombre: doctor.nombre,
            especialidad: doctor.especialidad,
            telefono: doctor.telefono,
            correo: doctor.correo,
            horario: doctor.horario,
        });
        setModalActivo("doctor");
    }

    function editarServicio(servicio: Servicio) {
        if (!puedeEditar) {
            alert("Solo el administrador puede modificar servicios.");
            return;
        }

        setServicioEditandoId(servicio.id);
        setFormularioServicio({
            nombre: servicio.nombre,
            categoria: servicio.categoria,
            duracionMinutos: servicio.duracionMinutos.toString(),
            precio: servicio.precio.toString(),
            descripcion: servicio.descripcion,
        });
        setModalActivo("servicio");
    }

    async function cambiarEstadoDoctor(doctor: Doctor) {
        if (!puedeEditar) {
            alert("Solo el administrador puede modificar doctores.");
            return;
        }

        const nuevoEstado: EstadoRegistroClinico =
            doctor.estado === "Activo" ? "Inactivo" : "Activo";

        const confirmar = window.confirm(
            `¿Seguro que deseas ${doctor.estado === "Activo" ? "desactivar" : "activar"
            } este doctor?`
        );

        if (!confirmar) return;

        try {
            await cambiarEstadoDoctorSupabase(doctor.id, nuevoEstado);
            await cargarDatos();
        } catch (error) {
            const mensaje =
                error instanceof Error
                    ? error.message
                    : "No se pudo cambiar el estado del doctor.";

            alert(mensaje);
        }
    }

    async function cambiarEstadoServicio(servicio: Servicio) {
        if (!puedeEditar) {
            alert("Solo el administrador puede modificar servicios.");
            return;
        }

        const nuevoEstado: EstadoRegistroClinico =
            servicio.estado === "Activo" ? "Inactivo" : "Activo";

        const confirmar = window.confirm(
            `¿Seguro que deseas ${servicio.estado === "Activo" ? "desactivar" : "activar"
            } este servicio?`
        );

        if (!confirmar) return;

        try {
            await cambiarEstadoServicioSupabase(servicio.id, nuevoEstado);
            await cargarDatos();
        } catch (error) {
            const mensaje =
                error instanceof Error
                    ? error.message
                    : "No se pudo cambiar el estado del servicio.";

            alert(mensaje);
        }
    }

    const doctoresActivos = doctores.filter(
        (doctor) => doctor.estado === "Activo"
    ).length;

    const serviciosActivos = servicios.filter(
        (servicio) => servicio.estado === "Activo"
    ).length;

    const categoriasServicios = useMemo(() => {
        const categorias = servicios
            .map((servicio) => servicio.categoria.trim())
            .filter(Boolean);

        return Array.from(new Set(categorias)).sort((a, b) =>
            a.localeCompare(b)
        );
    }, [servicios]);

    const precioPromedio =
        servicios.length > 0
            ? servicios.reduce((total, servicio) => total + servicio.precio, 0) /
            servicios.length
            : 0;

    const duracionPromedio =
        servicios.length > 0
            ? servicios.reduce(
                (total, servicio) => total + servicio.duracionMinutos,
                0
            ) / servicios.length
            : 0;

    const doctoresFiltrados = useMemo(() => {
        const texto = normalizarTexto(busqueda.trim());

        return doctores.filter((doctor) => {
            const coincideEstado =
                estadoFiltro === "Todos" || doctor.estado === estadoFiltro;

            const coincideTexto =
                !texto ||
                normalizarTexto(doctor.nombre).includes(texto) ||
                normalizarTexto(doctor.especialidad).includes(texto) ||
                normalizarTexto(doctor.telefono).includes(texto) ||
                normalizarTexto(doctor.correo).includes(texto) ||
                normalizarTexto(doctor.horario).includes(texto);

            return coincideEstado && coincideTexto;
        });
    }, [doctores, busqueda, estadoFiltro]);

    const serviciosFiltrados = useMemo(() => {
        const texto = normalizarTexto(busqueda.trim());

        return servicios.filter((servicio) => {
            const coincideEstado =
                estadoFiltro === "Todos" || servicio.estado === estadoFiltro;

            const coincideTexto =
                !texto ||
                normalizarTexto(servicio.nombre).includes(texto) ||
                normalizarTexto(servicio.categoria).includes(texto) ||
                normalizarTexto(servicio.descripcion).includes(texto) ||
                String(servicio.precio).includes(texto) ||
                String(servicio.duracionMinutos).includes(texto);

            return coincideEstado && coincideTexto;
        });
    }, [servicios, busqueda, estadoFiltro]);

    const serviciosPorCategoria = useMemo(() => {
        return serviciosFiltrados.reduce<Record<string, Servicio[]>>(
            (grupos, servicio) => {
                const categoria = servicio.categoria || "Sin categoría";

                if (!grupos[categoria]) grupos[categoria] = [];
                grupos[categoria].push(servicio);

                return grupos;
            },
            {}
        );
    }, [serviciosFiltrados]);

    const totalResultados =
        vistaActiva === "Doctores"
            ? doctoresFiltrados.length
            : serviciosFiltrados.length;

    return (
        <AppShell
            titulo="Doctores y Servicios"
            descripcion="Catálogo clínico conectado con Supabase, agenda, presupuestos y caja"
            moduloActivo="Doctores y Servicios"
        >
            {!puedeEditar && (
                <section className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Modo consulta
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Tu rol puede ver doctores y servicios, pero solo el
                                administrador puede registrar, editar o desactivar datos.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {errorCarga && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudieron cargar los datos
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {errorCarga}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="overflow-hidden rounded-[30px] border border-white bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <div className="relative p-6 text-white md:p-7">
                    <Sparkles className="absolute right-8 top-8 h-24 w-24 text-white opacity-10" />

                    <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-300">
                                Catálogo clínico en Supabase
                            </p>
                            <h2 className="mt-2 text-3xl font-black">
                                Doctores y servicios
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
                                Administrá los profesionales y tratamientos que se usan
                                en Agenda, presupuestos, odontograma y Caja. Los datos ya
                                se guardan en Supabase por clínica.
                            </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                            <button
                                type="button"
                                onClick={cargarDatos}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-[12px] font-black text-white hover:bg-white/15"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Recargar
                            </button>

                            <button
                                type="button"
                                onClick={abrirNuevoDoctor}
                                disabled={!puedeEditar || cargandoDatos}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-[12px] font-black text-slate-900 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo doctor
                            </button>

                            <button
                                type="button"
                                onClick={abrirNuevoServicio}
                                disabled={!puedeEditar || cargandoDatos}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-5 py-3 text-[12px] font-black text-white shadow-sm hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo servicio
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {cargandoDatos && (
                <section className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4">
                    <p className="flex items-center gap-2 text-sm font-black text-teal-800">
                        <Activity className="h-4 w-4 animate-pulse" />
                        Cargando doctores y servicios desde Supabase...
                    </p>
                </section>
            )}

            <section className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Users className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Doctores
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {doctoresActivos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Doctores activos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <BriefcaseMedical className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Servicios
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {serviciosActivos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Servicios activos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <BadgeDollarSign className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Promedio
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(precioPromedio)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Precio promedio
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                            <Clock className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            Tiempo
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {Math.round(duracionPromedio)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Minutos promedio
                    </p>
                </div>
            </section>

            <section className="mt-4 rounded-[28px] border border-white bg-white/80 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="grid gap-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-2">
                        {(["Doctores", "Servicios"] as VistaActiva[]).map((vista) => (
                            <button
                                key={vista}
                                type="button"
                                onClick={() => {
                                    setVistaActiva(vista);
                                    setBusqueda("");
                                    setEstadoFiltro("Todos");
                                }}
                                className={`rounded-xl px-5 py-3 text-[12px] font-black ${vistaActiva === vista
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:bg-white"
                                    }`}
                            >
                                {vista}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px] xl:w-[640px]">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder={
                                    vistaActiva === "Doctores"
                                        ? "Buscar doctor, especialidad, teléfono..."
                                        : "Buscar servicio, categoría, precio..."
                                }
                                className="w-full bg-transparent text-[13px] font-medium outline-none"
                            />
                        </div>

                        <select
                            value={estadoFiltro}
                            onChange={(event) =>
                                setEstadoFiltro(
                                    event.target.value as "Todos" | EstadoRegistroClinico
                                )
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        >
                            <option>Todos</option>
                            <option>Activo</option>
                            <option>Inactivo</option>
                        </select>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">
                        Mostrando{" "}
                        <strong className="text-slate-900">{totalResultados}</strong>{" "}
                        resultado(s).
                    </p>

                    {(busqueda || estadoFiltro !== "Todos") && (
                        <button
                            type="button"
                            onClick={() => {
                                setBusqueda("");
                                setEstadoFiltro("Todos");
                            }}
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </section>

            {vistaActiva === "Doctores" && (
                <section className="mt-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        {doctoresFiltrados.map((doctor) => (
                            <div
                                key={doctor.id}
                                className="rounded-[28px] border border-white bg-white/80 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-sm font-black text-white">
                                        {iniciales(doctor.nombre)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-lg font-black text-slate-900">
                                                {doctor.nombre}
                                            </h4>

                                            <span
                                                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${colorEstado(
                                                    doctor.estado
                                                )}`}
                                            >
                                                {doctor.estado}
                                            </span>
                                        </div>

                                        <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-teal-700">
                                            <BriefcaseMedical className="h-4 w-4" />
                                            {doctor.especialidad || "Sin especialidad"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                            <Phone className="h-3.5 w-3.5" />
                                            Teléfono
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-800">
                                            {doctor.telefono || "No registrado"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                            <Mail className="h-3.5 w-3.5" />
                                            Correo
                                        </p>
                                        <p className="mt-1 truncate text-sm font-black text-slate-800">
                                            {doctor.correo || "No registrado"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            Horario
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-sm font-black text-slate-800">
                                            {doctor.horario || "No registrado"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => editarDoctor(doctor)}
                                        disabled={!puedeEditar || guardando}
                                        className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Edit3 className="h-3.5 w-3.5" />
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => cambiarEstadoDoctor(doctor)}
                                        disabled={!puedeEditar || guardando}
                                        className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {doctor.estado === "Activo"
                                            ? "Desactivar"
                                            : "Activar"}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {doctoresFiltrados.length === 0 && (
                            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-10 text-center xl:col-span-2">
                                <UserRound className="mx-auto h-10 w-10 text-slate-300" />
                                <h4 className="mt-3 text-sm font-black text-slate-700">
                                    No encontramos doctores
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    Probá cambiar la búsqueda o registrar uno nuevo.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {vistaActiva === "Servicios" && (
                <section className="mt-4 space-y-4">
                    {Object.entries(serviciosPorCategoria).map(
                        ([categoria, listaServicios]) => (
                            <div
                                key={categoria}
                                className="rounded-[28px] border border-white bg-white/80 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]"
                            >
                                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <span
                                            className={`w-fit rounded-full px-3 py-1 text-[10px] font-black ${colorCategoria(
                                                categoria
                                            )}`}
                                        >
                                            {categoria}
                                        </span>
                                        <h3 className="mt-2 text-lg font-black text-slate-900">
                                            {listaServicios.length} servicio(s)
                                        </h3>
                                    </div>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                    {listaServicios.map((servicio) => (
                                        <div
                                            key={servicio.id}
                                            className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="text-sm font-black text-slate-900">
                                                            {servicio.nombre}
                                                        </h4>

                                                        <span
                                                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${colorEstado(
                                                                servicio.estado
                                                            )}`}
                                                        >
                                                            {servicio.estado}
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                                        {servicio.descripcion ||
                                                            "Sin descripción registrada"}
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
                                                    <p className="mono text-[9px] text-white/40">
                                                        Precio
                                                    </p>
                                                    <p className="text-sm font-black">
                                                        {formatoMoneda(servicio.precio)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                <div className="rounded-2xl bg-slate-50 p-4">
                                                    <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Duración
                                                    </p>
                                                    <p className="mt-1 text-sm font-black text-slate-800">
                                                        {servicio.duracionMinutos} minutos
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl bg-emerald-50 p-4">
                                                    <p className="flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Uso
                                                    </p>
                                                    <p className="mt-1 text-sm font-black text-emerald-700">
                                                        Agenda / Caja
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => editarServicio(servicio)}
                                                    disabled={!puedeEditar || guardando}
                                                    className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                    Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        cambiarEstadoServicio(servicio)
                                                    }
                                                    disabled={!puedeEditar || guardando}
                                                    className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    {servicio.estado === "Activo"
                                                        ? "Desactivar"
                                                        : "Activar"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}

                    {serviciosFiltrados.length === 0 && (
                        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                            <Activity className="mx-auto h-10 w-10 text-slate-300" />
                            <h4 className="mt-3 text-sm font-black text-slate-700">
                                No encontramos servicios
                            </h4>
                            <p className="mt-1 text-xs text-slate-400">
                                Probá cambiar la búsqueda o registrar uno nuevo.
                            </p>
                        </div>
                    )}
                </section>
            )}

            <section className="mt-4 overflow-hidden rounded-[28px] border border-white bg-white/80 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-6 text-white">
                    <Sparkles className="absolute right-8 top-1/2 h-24 w-24 -translate-y-1/2 opacity-10" />

                    <div className="relative z-10">
                        <h3 className="text-xl font-black">
                            Conexión con Agenda Médica
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
                            Los doctores y servicios activos aparecerán al crear citas.
                            Cuando seleccionés un servicio en Agenda, el sistema podrá cargar
                            duración y precio para facilitar el cobro en Caja.
                        </p>
                    </div>
                </div>
            </section>

            {modalActivo === "doctor" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    {doctorEditandoId
                                        ? "Editar doctor"
                                        : "Nuevo doctor"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Datos del profesional que se usará en agenda médica.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarModal}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={guardarDoctor}
                            className="max-h-[calc(92vh-92px)] overflow-y-auto p-6"
                        >
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Nombre completo
                                </label>
                                <input
                                    value={formularioDoctor.nombre}
                                    onChange={(event) =>
                                        actualizarDoctor("nombre", event.target.value)
                                    }
                                    placeholder="Ejemplo: Dra. Ana Martínez"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Especialidad
                                </label>
                                <input
                                    value={formularioDoctor.especialidad}
                                    onChange={(event) =>
                                        actualizarDoctor(
                                            "especialidad",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Odontología general, Endodoncia..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Teléfono
                                    </label>
                                    <input
                                        value={formularioDoctor.telefono}
                                        onChange={(event) =>
                                            actualizarDoctor(
                                                "telefono",
                                                event.target.value
                                            )
                                        }
                                        placeholder="8888-0000"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Correo
                                    </label>
                                    <input
                                        value={formularioDoctor.correo}
                                        onChange={(event) =>
                                            actualizarDoctor(
                                                "correo",
                                                event.target.value
                                            )
                                        }
                                        placeholder="doctor@clinica.com"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Horario
                                </label>
                                <textarea
                                    value={formularioDoctor.horario}
                                    onChange={(event) =>
                                        actualizarDoctor("horario", event.target.value)
                                    }
                                    rows={3}
                                    placeholder="Lunes a viernes 8:00 AM - 5:00 PM"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="sticky bottom-0 -mx-6 mt-6 flex flex-col gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur md:flex-row md:justify-end">
                                <button
                                    type="button"
                                    onClick={cerrarModal}
                                    disabled={guardando}
                                    className="rounded-xl bg-slate-100 px-5 py-3 text-[12px] font-bold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={guardando}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Plus className="h-4 w-4" />
                                    {guardando
                                        ? "Guardando..."
                                        : doctorEditandoId
                                            ? "Guardar cambios"
                                            : "Registrar doctor"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalActivo === "servicio" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    {servicioEditandoId
                                        ? "Editar servicio"
                                        : "Nuevo servicio"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Catálogo usado en agenda, presupuestos y caja.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarModal}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={guardarServicio}
                            className="max-h-[calc(92vh-92px)] overflow-y-auto p-6"
                        >
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Nombre del servicio
                                </label>
                                <input
                                    value={formularioServicio.nombre}
                                    onChange={(event) =>
                                        actualizarServicio("nombre", event.target.value)
                                    }
                                    placeholder="Ejemplo: Limpieza dental"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Categoría
                                </label>
                                <input
                                    value={formularioServicio.categoria}
                                    onChange={(event) =>
                                        actualizarServicio(
                                            "categoria",
                                            event.target.value
                                        )
                                    }
                                    list="categorias-servicios"
                                    placeholder="Prevención, Cirugía, Ortodoncia..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />

                                <datalist id="categorias-servicios">
                                    {categoriasServicios.map((categoria) => (
                                        <option key={categoria} value={categoria} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Duración en minutos
                                    </label>
                                    <input
                                        value={formularioServicio.duracionMinutos}
                                        onChange={(event) =>
                                            actualizarServicio(
                                                "duracionMinutos",
                                                event.target.value
                                            )
                                        }
                                        type="number"
                                        placeholder="45"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Precio
                                    </label>
                                    <input
                                        value={formularioServicio.precio}
                                        onChange={(event) =>
                                            actualizarServicio("precio", event.target.value)
                                        }
                                        type="number"
                                        placeholder="1200"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Descripción
                                </label>
                                <textarea
                                    value={formularioServicio.descripcion}
                                    onChange={(event) =>
                                        actualizarServicio(
                                            "descripcion",
                                            event.target.value
                                        )
                                    }
                                    rows={4}
                                    placeholder="Descripción corta del procedimiento..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="sticky bottom-0 -mx-6 mt-6 flex flex-col gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur md:flex-row md:justify-end">
                                <button
                                    type="button"
                                    onClick={cerrarModal}
                                    disabled={guardando}
                                    className="rounded-xl bg-slate-100 px-5 py-3 text-[12px] font-bold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={guardando}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Plus className="h-4 w-4" />
                                    {guardando
                                        ? "Guardando..."
                                        : servicioEditandoId
                                            ? "Guardar cambios"
                                            : "Registrar servicio"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}