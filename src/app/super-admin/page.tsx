"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    BadgeDollarSign,
    Building2,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    LogOut,
    PauseCircle,
    Plus,
    RefreshCcw,
    ShieldCheck,
    Stethoscope,
    Unlock,
    Users,
    WalletCards,
    X,
} from "lucide-react";
import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual, type PerfilUsuarioSupabase } from "@/lib/supabase/perfil";

type EstadoClinica =
    | "Activa"
    | "Vencida"
    | "Restringida"
    | "Suspendida"
    | "Cancelada";

type Clinica = {
    id: string;
    nombre: string;
    telefono: string | null;
    whatsapp: string | null;
    correo: string | null;
    direccion: string | null;
    estado: EstadoClinica;
    plan: string;
    fecha_inicio: string | null;
    fecha_vencimiento: string | null;
    creada_en: string;
};

type Suscripcion = {
    id: string;
    clinica_id: string;
    plan: string;
    estado: EstadoClinica;
    precio_mensual: number;
    moneda: string;
    fecha_inicio: string;
    fecha_vencimiento: string;
    ultimo_pago: string | null;
};

type PagoSuscripcion = {
    id: string;
    clinica_id: string;
    fecha_pago: string;
    monto: number;
    moneda: string;
    metodo_pago: string | null;
    referencia: string | null;
    estado: string;
};

type UsuarioPerfil = {
    id: string;
    clinica_id: string | null;
    nombre: string;
    usuario: string;
    correo: string;
    rol: string;
    estado: string;
    creado_en: string;
};

type FormularioClinica = {
    nombreClinica: string;
    telefono: string;
    whatsapp: string;
    correoClinica: string;
    direccion: string;
    ruc: string;
    plan: string;
    precioMensual: string;
    monedaSuscripcion: string;
    fechaVencimiento: string;
    diasGracia: string;
    adminNombre: string;
    adminUsuario: string;
    adminCorreo: string;
    adminPassword: string;
};

type FormularioPago = {
    clinicaId: string;
    monto: string;
    moneda: string;
    metodoPago: string;
    referencia: string;
    meses: string;
    notas: string;
};

const formularioClinicaInicial: FormularioClinica = {
    nombreClinica: "",
    telefono: "",
    whatsapp: "",
    correoClinica: "",
    direccion: "",
    ruc: "",
    plan: "Profesional",
    precioMensual: "100",
    monedaSuscripcion: "USD",
    fechaVencimiento: "",
    diasGracia: "7",
    adminNombre: "",
    adminUsuario: "",
    adminCorreo: "",
    adminPassword: "",
};

const formularioPagoInicial: FormularioPago = {
    clinicaId: "",
    monto: "",
    moneda: "USD",
    metodoPago: "Transferencia",
    referencia: "",
    meses: "1",
    notas: "",
};

function fechaEn30Dias() {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().slice(0, 10);
}

function formatoMoneda(valor: number, moneda = "USD") {
    return `${moneda} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function estadoColor(estado: string) {
    if (estado === "Activa") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (estado === "Vencida") return "bg-amber-50 text-amber-700 border-amber-100";
    if (estado === "Restringida") return "bg-orange-50 text-orange-700 border-orange-100";
    if (estado === "Suspendida") return "bg-red-50 text-red-700 border-red-100";
    return "bg-slate-100 text-slate-700 border-slate-200";
}

function fechaLegible(fecha?: string | null) {
    if (!fecha) return "Sin fecha";

    try {
        return new Date(fecha).toLocaleDateString("es-NI", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    } catch {
        return fecha;
    }
}

export default function SuperAdminPage() {
    const router = useRouter();
    const supabase = useMemo(() => crearClienteSupabase(), []);

    const [perfil, setPerfil] = useState<PerfilUsuarioSupabase | null>(null);
    const [clinicas, setClinicas] = useState<Clinica[]>([]);
    const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
    const [pagos, setPagos] = useState<PagoSuscripcion[]>([]);
    const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const [modalClinicaAbierto, setModalClinicaAbierto] = useState(false);
    const [guardandoClinica, setGuardandoClinica] = useState(false);
    const [formularioClinica, setFormularioClinica] =
        useState<FormularioClinica>({
            ...formularioClinicaInicial,
            fechaVencimiento: fechaEn30Dias(),
        });

    const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
    const [guardandoPago, setGuardandoPago] = useState(false);
    const [formularioPago, setFormularioPago] =
        useState<FormularioPago>(formularioPagoInicial);

    const mapaSuscripciones = useMemo(() => {
        const mapa = new Map<string, Suscripcion>();

        suscripciones.forEach((suscripcion) => {
            if (!mapa.has(suscripcion.clinica_id)) {
                mapa.set(suscripcion.clinica_id, suscripcion);
            }
        });

        return mapa;
    }, [suscripciones]);

    async function cargarDatos() {
        setError("");

        try {
            const { perfil: perfilActual, error: errorPerfil } =
                await obtenerPerfilActual();

            if (errorPerfil || !perfilActual) {
                router.replace("/login");
                return;
            }

            if (perfilActual.rol !== "SUPER_ADMIN") {
                router.replace("/inicio");
                return;
            }

            setPerfil(perfilActual);

            const [
                respuestaClinicas,
                respuestaSuscripciones,
                respuestaPagos,
                respuestaUsuarios,
            ] = await Promise.all([
                supabase
                    .from("clinicas")
                    .select("*")
                    .order("creada_en", { ascending: false }),
                supabase
                    .from("suscripciones")
                    .select("*")
                    .order("creada_en", { ascending: false }),
                supabase
                    .from("pagos_suscripcion")
                    .select("*")
                    .order("creado_en", { ascending: false })
                    .limit(12),
                supabase
                    .from("usuarios_perfiles")
                    .select("*")
                    .order("creado_en", { ascending: false }),
            ]);

            if (respuestaClinicas.error) throw respuestaClinicas.error;
            if (respuestaSuscripciones.error) throw respuestaSuscripciones.error;
            if (respuestaPagos.error) throw respuestaPagos.error;
            if (respuestaUsuarios.error) throw respuestaUsuarios.error;

            setClinicas((respuestaClinicas.data || []) as Clinica[]);
            setSuscripciones((respuestaSuscripciones.data || []) as Suscripcion[]);
            setPagos((respuestaPagos.data || []) as PagoSuscripcion[]);
            setUsuarios((respuestaUsuarios.data || []) as UsuarioPerfil[]);
        } catch (errorActual) {
            const mensajeError =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el panel SUPER_ADMIN.";

            setError(mensajeError);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function obtenerTokenSesion() {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error("Tu sesión venció. Volvé a iniciar sesión.");
        }

        return session.access_token;
    }

    async function cerrarSesion() {
        await supabase.auth.signOut();
        localStorage.removeItem("usuario_sistema_clinico");
        router.replace("/login");
    }

    function abrirModalClinica() {
        setMensaje("");
        setError("");
        setFormularioClinica({
            ...formularioClinicaInicial,
            fechaVencimiento: fechaEn30Dias(),
        });
        setModalClinicaAbierto(true);
    }

    function abrirModalPago(clinica: Clinica) {
        const suscripcion = mapaSuscripciones.get(clinica.id);

        setMensaje("");
        setError("");
        setFormularioPago({
            ...formularioPagoInicial,
            clinicaId: clinica.id,
            monto: String(suscripcion?.precio_mensual || 100),
            moneda: suscripcion?.moneda || "USD",
        });
        setModalPagoAbierto(true);
    }

    function actualizarFormularioClinica<K extends keyof FormularioClinica>(
        campo: K,
        valor: FormularioClinica[K]
    ) {
        setFormularioClinica((actual) => ({
            ...actual,
            [campo]: valor,
        }));
    }

    function actualizarFormularioPago<K extends keyof FormularioPago>(
        campo: K,
        valor: FormularioPago[K]
    ) {
        setFormularioPago((actual) => ({
            ...actual,
            [campo]: valor,
        }));
    }

    async function crearClinica(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setMensaje("");
        setGuardandoClinica(true);

        try {
            const token = await obtenerTokenSesion();

            const respuesta = await fetch("/api/super-admin/crear-clinica", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formularioClinica,
                    precioMensual: Number(formularioClinica.precioMensual || 0),
                    diasGracia: Number(formularioClinica.diasGracia || 7),
                }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                throw new Error(datos.mensaje || "No se pudo crear la clínica.");
            }

            setMensaje(datos.mensaje || "Clínica creada correctamente.");
            setModalClinicaAbierto(false);
            await cargarDatos();
        } catch (errorActual) {
            const mensajeError =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo crear la clínica.";

            setError(mensajeError);
        } finally {
            setGuardandoClinica(false);
        }
    }

    async function cambiarEstadoClinica(
        clinica: Clinica,
        estado: EstadoClinica
    ) {
        const accion =
            estado === "Activa"
                ? "reactivar"
                : estado === "Suspendida"
                    ? "suspender"
                    : `marcar como ${estado}`;

        const confirmar = window.confirm(
            `¿Seguro que deseas ${accion} la clínica ${clinica.nombre}?`
        );

        if (!confirmar) return;

        setError("");
        setMensaje("");

        try {
            const token = await obtenerTokenSesion();

            const respuesta = await fetch("/api/super-admin/cambiar-estado-clinica", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    clinicaId: clinica.id,
                    estado,
                    motivo: `Estado cambiado a ${estado} desde panel SUPER_ADMIN.`,
                }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                throw new Error(datos.mensaje || "No se pudo cambiar el estado.");
            }

            setMensaje(datos.mensaje || "Estado actualizado correctamente.");
            await cargarDatos();
        } catch (errorActual) {
            const mensajeError =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cambiar el estado.";

            setError(mensajeError);
        }
    }

    async function registrarPago(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setMensaje("");
        setGuardandoPago(true);

        try {
            const token = await obtenerTokenSesion();

            const respuesta = await fetch("/api/super-admin/registrar-pago", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    clinicaId: formularioPago.clinicaId,
                    monto: Number(formularioPago.monto || 0),
                    moneda: formularioPago.moneda,
                    metodoPago: formularioPago.metodoPago,
                    referencia: formularioPago.referencia,
                    meses: Number(formularioPago.meses || 1),
                    notas: formularioPago.notas,
                }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                throw new Error(datos.mensaje || "No se pudo registrar el pago.");
            }

            setMensaje(datos.mensaje || "Pago registrado correctamente.");
            setModalPagoAbierto(false);
            await cargarDatos();
        } catch (errorActual) {
            const mensajeError =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo registrar el pago.";

            setError(mensajeError);
        } finally {
            setGuardandoPago(false);
        }
    }

    const clinicasActivas = clinicas.filter(
        (clinica) => clinica.estado === "Activa"
    ).length;

    const clinicasSuspendidas = clinicas.filter(
        (clinica) => clinica.estado === "Suspendida"
    ).length;

    const mensualidadEstimada = suscripciones
        .filter((suscripcion) => suscripcion.estado === "Activa")
        .reduce((total, suscripcion) => total + Number(suscripcion.precio_mensual || 0), 0);

    const usuariosClinicas = usuarios.filter(
        (usuario) => usuario.rol !== "SUPER_ADMIN"
    ).length;

    const clinicaPagoSeleccionada = clinicas.find(
        (clinica) => clinica.id === formularioPago.clinicaId
    );

    if (cargando) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="rounded-[32px] bg-white p-8 text-center shadow-xl">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />
                    <h1 className="mt-5 text-xl font-black text-slate-900">
                        Cargando SUPER_ADMIN
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Validando permisos y cargando datos de Supabase...
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f4f7fa] px-4 py-6 md:px-8">
            <section className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-[36px] bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/25">
                                <ShieldCheck className="h-7 w-7" />
                            </div>

                            <h1 className="mt-6 text-3xl font-black md:text-4xl">
                                Panel SUPER_ADMIN
                            </h1>

                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                                Control general del sistema: clínicas, suscripciones,
                                usuarios y pagos. Este panel es solo para el dueño del
                                sistema.
                            </p>

                            <p className="mt-3 text-xs font-semibold text-teal-200">
                                Sesión: {perfil?.nombre} · {perfil?.correo}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={abrirModalClinica}
                                className="flex items-center gap-2 rounded-2xl bg-teal-500 px-4 py-3 text-xs font-black text-white hover:bg-teal-400"
                            >
                                <Plus className="h-4 w-4" />
                                Crear clínica
                            </button>

                            <button
                                onClick={() => {
                                    setCargando(true);
                                    cargarDatos();
                                }}
                                className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white hover:bg-white/15"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Recargar
                            </button>

                            <button
                                onClick={cerrarSesion}
                                className="flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-xs font-black text-white hover:bg-red-600"
                            >
                                <LogOut className="h-4 w-4" />
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>

                {mensaje && (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                            <span>{mensaje}</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                <section className="mt-4 grid gap-4 lg:grid-cols-4">
                    <div className="glass-card rounded-3xl p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-3xl font-black text-slate-900">
                            {clinicas.length}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                            Clínicas registradas
                        </p>
                    </div>

                    <div className="glass-card rounded-3xl p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-3xl font-black text-slate-900">
                            {clinicasActivas}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                            Clínicas activas
                        </p>
                    </div>

                    <div className="glass-card rounded-3xl p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                            <BadgeDollarSign className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-2xl font-black text-slate-900">
                            {formatoMoneda(mensualidadEstimada, "USD")}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                            Mensualidad estimada
                        </p>
                    </div>

                    <div className="glass-card rounded-3xl p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-3xl font-black text-slate-900">
                            {clinicasSuspendidas}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                            Suspendidas
                        </p>
                    </div>
                </section>

                <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-teal-700" />
                                <h2 className="text-lg font-black text-slate-900">
                                    Clínicas
                                </h2>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                                Clientes registrados en la plataforma.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px]">
                                <thead>
                                    <tr className="border-b border-black/[0.04]">
                                        {[
                                            "Clínica",
                                            "Plan",
                                            "Vencimiento",
                                            "Estado",
                                            "Contacto",
                                            "Acciones",
                                        ].map((titulo) => (
                                            <th
                                                key={titulo}
                                                className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"
                                            >
                                                {titulo}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {clinicas.map((clinica) => {
                                        const suscripcion = mapaSuscripciones.get(clinica.id);

                                        return (
                                            <tr
                                                key={clinica.id}
                                                className="border-b border-black/[0.03]"
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="text-sm font-black text-slate-800">
                                                        {clinica.nombre}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {clinica.direccion || "Sin dirección"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="text-sm font-bold text-slate-600">
                                                        {clinica.plan}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {suscripcion
                                                            ? formatoMoneda(
                                                                Number(suscripcion.precio_mensual || 0),
                                                                suscripcion.moneda
                                                            )
                                                            : "Sin suscripción"}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-sm font-bold text-slate-600">
                                                    {fechaLegible(clinica.fecha_vencimiento)}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`rounded-full border px-3 py-1 text-[11px] font-black ${estadoColor(
                                                            clinica.estado
                                                        )}`}
                                                    >
                                                        {clinica.estado}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-xs text-slate-500">
                                                    <p>{clinica.correo || "Sin correo"}</p>
                                                    <p>{clinica.telefono || clinica.whatsapp || "Sin teléfono"}</p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => abrirModalPago(clinica)}
                                                            className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 hover:bg-emerald-100"
                                                        >
                                                            <WalletCards className="h-3.5 w-3.5" />
                                                            Pago
                                                        </button>

                                                        {clinica.estado === "Suspendida" ? (
                                                            <button
                                                                onClick={() =>
                                                                    cambiarEstadoClinica(clinica, "Activa")
                                                                }
                                                                className="flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-[11px] font-black text-teal-700 hover:bg-teal-100"
                                                            >
                                                                <Unlock className="h-3.5 w-3.5" />
                                                                Reactivar
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() =>
                                                                    cambiarEstadoClinica(
                                                                        clinica,
                                                                        "Suspendida"
                                                                    )
                                                                }
                                                                className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-black text-red-700 hover:bg-red-100"
                                                            >
                                                                <PauseCircle className="h-3.5 w-3.5" />
                                                                Suspender
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {clinicas.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-6 py-12 text-center text-sm text-slate-400"
                                            >
                                                Todavía no hay clínicas registradas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="glass-card rounded-3xl p-5">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-teal-700" />
                                <h2 className="text-lg font-black text-slate-900">
                                    Usuarios
                                </h2>
                            </div>

                            <div className="mt-4 grid gap-3">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-bold text-slate-400">
                                        Usuarios de clínicas
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-slate-900">
                                        {usuariosClinicas}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-teal-50 p-4">
                                    <p className="text-xs font-bold text-teal-700">
                                        Usuarios totales
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-teal-700">
                                        {usuarios.length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-3xl p-5">
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-teal-700" />
                                <h2 className="text-lg font-black text-slate-900">
                                    Pagos recientes
                                </h2>
                            </div>

                            <div className="mt-4 space-y-3">
                                {pagos.map((pago) => (
                                    <div
                                        key={pago.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-slate-800">
                                                    {formatoMoneda(Number(pago.monto || 0), pago.moneda)}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {pago.metodo_pago || "Método no especificado"} ·{" "}
                                                    {fechaLegible(pago.fecha_pago)}
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                                                {pago.estado}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {pagos.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                        <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-3 text-xs text-slate-400">
                                            Todavía no hay pagos registrados.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-4 rounded-3xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                        <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Siguiente mejora
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Después conectamos la verificación de suscripción al AppShell
                                para que las clínicas suspendidas no puedan usar el sistema.
                            </p>
                        </div>
                    </div>
                </section>
            </section>

            {modalClinicaAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Crear nueva clínica
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Se creará la clínica, su suscripción y el usuario ADMIN.
                                </p>
                            </div>

                            <button
                                onClick={() => setModalClinicaAbierto(false)}
                                className="rounded-2xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={crearClinica} className="p-6">
                            <div className="grid gap-5 lg:grid-cols-2">
                                <div className="rounded-3xl bg-slate-50 p-5">
                                    <h3 className="text-sm font-black text-slate-900">
                                        Datos de la clínica
                                    </h3>

                                    <div className="mt-4 grid gap-4">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Nombre de la clínica *
                                            </label>
                                            <input
                                                value={formularioClinica.nombreClinica}
                                                onChange={(event) =>
                                                    actualizarFormularioClinica("nombreClinica", event.target.value)
                                                }
                                                required
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                                    Teléfono
                                                </label>
                                                <input
                                                    value={formularioClinica.telefono}
                                                    onChange={(event) =>
                                                        actualizarFormularioClinica("telefono", event.target.value)
                                                    }
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                                    WhatsApp
                                                </label>
                                                <input
                                                    value={formularioClinica.whatsapp}
                                                    onChange={(event) =>
                                                        actualizarFormularioClinica("whatsapp", event.target.value)
                                                    }
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Correo de clínica
                                            </label>
                                            <input
                                                value={formularioClinica.correoClinica}
                                                onChange={(event) =>
                                                    actualizarFormularioClinica("correoClinica", event.target.value)
                                                }
                                                type="email"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Dirección
                                            </label>
                                            <textarea
                                                value={formularioClinica.direccion}
                                                onChange={(event) =>
                                                    actualizarFormularioClinica("direccion", event.target.value)
                                                }
                                                rows={3}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                RUC
                                            </label>
                                            <input
                                                value={formularioClinica.ruc}
                                                onChange={(event) =>
                                                    actualizarFormularioClinica("ruc", event.target.value)
                                                }
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="rounded-3xl bg-teal-50 p-5">
                                        <h3 className="text-sm font-black text-teal-900">
                                            Suscripción
                                        </h3>

                                        <div className="mt-4 grid gap-4">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-teal-800">
                                                        Plan
                                                    </label>
                                                    <select
                                                        value={formularioClinica.plan}
                                                        onChange={(event) =>
                                                            actualizarFormularioClinica("plan", event.target.value)
                                                        }
                                                        className="w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    >
                                                        <option>Básico</option>
                                                        <option>Profesional</option>
                                                        <option>Premium</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-teal-800">
                                                        Precio mensual
                                                    </label>
                                                    <input
                                                        value={formularioClinica.precioMensual}
                                                        onChange={(event) =>
                                                            actualizarFormularioClinica(
                                                                "precioMensual",
                                                                event.target.value
                                                            )
                                                        }
                                                        type="number"
                                                        min="0"
                                                        className="w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-teal-800">
                                                        Moneda
                                                    </label>
                                                    <select
                                                        value={formularioClinica.monedaSuscripcion}
                                                        onChange={(event) =>
                                                            actualizarFormularioClinica(
                                                                "monedaSuscripcion",
                                                                event.target.value
                                                            )
                                                        }
                                                        className="w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    >
                                                        <option>USD</option>
                                                        <option>NIO</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-teal-800">
                                                        Vence
                                                    </label>
                                                    <input
                                                        value={formularioClinica.fechaVencimiento}
                                                        onChange={(event) =>
                                                            actualizarFormularioClinica(
                                                                "fechaVencimiento",
                                                                event.target.value
                                                            )
                                                        }
                                                        type="date"
                                                        required
                                                        className="w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-teal-800">
                                                        Días gracia
                                                    </label>
                                                    <input
                                                        value={formularioClinica.diasGracia}
                                                        onChange={(event) =>
                                                            actualizarFormularioClinica("diasGracia", event.target.value)
                                                        }
                                                        type="number"
                                                        min="0"
                                                        className="w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl bg-slate-900 p-5 text-white">
                                        <h3 className="text-sm font-black">
                                            Usuario ADMIN de la clínica
                                        </h3>

                                        <div className="mt-4 grid gap-4">
                                            <div>
                                                <label className="mb-2 block text-xs font-bold text-white/70">
                                                    Nombre administrador *
                                                </label>
                                                <input
                                                    value={formularioClinica.adminNombre}
                                                    onChange={(event) =>
                                                        actualizarFormularioClinica("adminNombre", event.target.value)
                                                    }
                                                    required
                                                    className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-white/70">
                                                        Usuario
                                                    </label>
                                                    <input
                                                        value={formularioClinica.adminUsuario}
                                                        onChange={(event) =>
                                                            actualizarFormularioClinica(
                                                                "adminUsuario",
                                                                event.target.value
                                                            )
                                                        }
                                                        placeholder="admin_clinica"
                                                        className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-white/70">
                                                        Correo *
                                                    </label>
                                                    <input
                                                        value={formularioClinica.adminCorreo}
                                                        onChange={(event) =>
                                                            actualizarFormularioClinica(
                                                                "adminCorreo",
                                                                event.target.value
                                                            )
                                                        }
                                                        type="email"
                                                        required
                                                        className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-xs font-bold text-white/70">
                                                    Contraseña temporal *
                                                </label>
                                                <input
                                                    value={formularioClinica.adminPassword}
                                                    onChange={(event) =>
                                                        actualizarFormularioClinica(
                                                            "adminPassword",
                                                            event.target.value
                                                        )
                                                    }
                                                    type="password"
                                                    required
                                                    minLength={8}
                                                    placeholder="Mínimo 8 caracteres"
                                                    className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalClinicaAbierto(false)}
                                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-200"
                                >
                                    Cancelar
                                </button>

                                <button
                                    disabled={guardandoClinica}
                                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-teal-500/20 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {guardandoClinica ? "Creando clínica..." : "Crear clínica"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalPagoAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-[32px] bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Registrar pago
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {clinicaPagoSeleccionada?.nombre || "Clínica seleccionada"}
                                </p>
                            </div>

                            <button
                                onClick={() => setModalPagoAbierto(false)}
                                className="rounded-2xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={registrarPago} className="p-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Monto *
                                    </label>
                                    <input
                                        value={formularioPago.monto}
                                        onChange={(event) =>
                                            actualizarFormularioPago("monto", event.target.value)
                                        }
                                        type="number"
                                        min="0"
                                        required
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Moneda
                                    </label>
                                    <select
                                        value={formularioPago.moneda}
                                        onChange={(event) =>
                                            actualizarFormularioPago("moneda", event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option>USD</option>
                                        <option>NIO</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Método de pago
                                    </label>
                                    <select
                                        value={formularioPago.metodoPago}
                                        onChange={(event) =>
                                            actualizarFormularioPago("metodoPago", event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option>Transferencia</option>
                                        <option>Efectivo</option>
                                        <option>Depósito</option>
                                        <option>Tarjeta</option>
                                        <option>Otro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Meses a extender
                                    </label>
                                    <input
                                        value={formularioPago.meses}
                                        onChange={(event) =>
                                            actualizarFormularioPago("meses", event.target.value)
                                        }
                                        type="number"
                                        min="1"
                                        required
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Referencia
                                </label>
                                <input
                                    value={formularioPago.referencia}
                                    onChange={(event) =>
                                        actualizarFormularioPago("referencia", event.target.value)
                                    }
                                    placeholder="Número de transferencia, recibo o comprobante"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Notas
                                </label>
                                <textarea
                                    value={formularioPago.notas}
                                    onChange={(event) =>
                                        actualizarFormularioPago("notas", event.target.value)
                                    }
                                    rows={3}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-6 flex flex-wrap justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalPagoAbierto(false)}
                                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-200"
                                >
                                    Cancelar
                                </button>

                                <button
                                    disabled={guardandoPago}
                                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-teal-500/20 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {guardandoPago ? "Registrando pago..." : "Registrar pago"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}