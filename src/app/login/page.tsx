"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    ArrowRight,
    Calendar,
    CheckCircle2,
    CreditCard,
    Eye,
    EyeOff,
    Lock,
    ShieldCheck,
    Sparkles,
    Stethoscope,
    User,
    Users,
} from "lucide-react";
import {
    guardarSesion,
    obtenerUsuariosSistema,
    UsuarioApp,
    validarLogin,
} from "@/lib/usuariosSistema";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

function colorRol(rol: string) {
    if (rol === "ADMIN") return "bg-slate-900 text-white";
    if (rol === "DOCTOR") return "bg-teal-50 text-teal-700 border border-teal-100";
    if (rol === "RECEPCION")
        return "bg-indigo-50 text-indigo-700 border border-indigo-100";

    return "bg-emerald-50 text-emerald-700 border border-emerald-100";
}

function iniciales(nombre: string) {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "US";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

export default function LoginPage() {
    const router = useRouter();

    const [usuario, setUsuario] = useState("");
    const [password, setPassword] = useState("");
    const [usuariosDemo, setUsuariosDemo] = useState<UsuarioApp[]>([]);
    const [error, setError] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    useEffect(() => {
        setUsuariosDemo(obtenerUsuariosSistema());
        setConfiguracion(obtenerConfiguracionClinica());

        const sesionActiva = localStorage.getItem("usuario_sistema_clinico");

        if (!sesionActiva) return;

        try {
            const usuarioSesion = JSON.parse(sesionActiva);

            const rolValido =
                usuarioSesion.rol === "ADMIN" ||
                usuarioSesion.rol === "DOCTOR" ||
                usuarioSesion.rol === "RECEPCION" ||
                usuarioSesion.rol === "CAJA";

            if (
                usuarioSesion.usuario &&
                usuarioSesion.nombre &&
                rolValido
            ) {
                router.replace("/inicio");
                return;
            }

            localStorage.removeItem("usuario_sistema_clinico");
        } catch {
            localStorage.removeItem("usuario_sistema_clinico");
        }
    }, []);

    function iniciarSesion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setCargando(true);

        setTimeout(() => {
            const resultado = validarLogin(usuario, password);

            if (!resultado.ok || !resultado.usuario) {
                setError(resultado.mensaje);
                setCargando(false);
                return;
            }

            guardarSesion(resultado.usuario);
            router.push("/inicio");
        }, 450);
    }

    function llenarDemo(usuarioDemo: UsuarioApp) {
        setUsuario(usuarioDemo.usuario);
        setPassword(usuarioDemo.password);
        setError("");
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#F4F7FA] px-4 py-6 md:px-8 md:py-8">
            <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-teal-400/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[300px] rounded-full bg-indigo-400/10 blur-3xl" />

            <section className="relative mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-7xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="hidden lg:block">
                    <div className="relative overflow-hidden rounded-[40px] bg-[#0B0F19] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
                        <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
                        <div className="pointer-events-none absolute bottom-[-120px] left-[-80px] h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30">
                                    <Activity className="h-7 w-7" />
                                </div>

                                <div>
                                    <h1 className="text-xl font-black">
                                        {configuracion.nombreClinica}
                                    </h1>
                                    <p className="mono mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                                        Sistema clínico odontológico
                                    </p>
                                </div>
                            </div>

                            <div className="mt-14 max-w-xl">
                                <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                                    <Sparkles className="h-4 w-4 text-teal-300" />
                                    <span className="text-sm font-semibold text-teal-100">
                                        Gestión clínica moderna
                                    </span>
                                </div>

                                <h2 className="text-5xl font-black leading-[1.03] tracking-tight">
                                    Control total de tu clínica en una sola plataforma.
                                </h2>

                                <p className="mt-6 max-w-lg text-base leading-8 text-white/55">
                                    Administra agenda, pacientes, odontograma, caja, inventario,
                                    proveedores, reportes, respaldos y auditoría desde un sistema
                                    visual, rápido y fácil de usar.
                                </p>
                            </div>

                            <div className="mt-10 grid gap-4 md:grid-cols-2">
                                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                                    <Calendar className="h-6 w-6 text-teal-300" />
                                    <h3 className="mt-4 font-bold">Agenda inteligente</h3>
                                    <p className="mt-2 text-sm leading-6 text-white/45">
                                        Control de citas, estados, doctores y servicios.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                                    <Users className="h-6 w-6 text-cyan-300" />
                                    <h3 className="mt-4 font-bold">Expediente clínico</h3>
                                    <p className="mt-2 text-sm leading-6 text-white/45">
                                        Pacientes, historial, recetas y odontograma.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                                    <CreditCard className="h-6 w-6 text-emerald-300" />
                                    <h3 className="mt-4 font-bold">Caja y finanzas</h3>
                                    <p className="mt-2 text-sm leading-6 text-white/45">
                                        Ventas, créditos, cierre de caja y reportes.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                                    <ShieldCheck className="h-6 w-6 text-indigo-300" />
                                    <h3 className="mt-4 font-bold">Respaldo y seguridad</h3>
                                    <p className="mt-2 text-sm leading-6 text-white/45">
                                        Usuarios, auditoría, exportaciones y copias.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-10 flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                                <div>
                                    <p className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                                        Estado del sistema
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-white">
                                        Plataforma lista para operar
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                                    Online
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-xl">
                    <div className="glass-panel overflow-hidden rounded-[40px] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] md:p-7">
                        <div className="rounded-[32px] bg-white p-6 shadow-sm md:p-8">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                                        <Stethoscope className="h-7 w-7" />
                                    </div>

                                    <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
                                        Bienvenido
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Inicia sesión para entrar al sistema clínico.
                                    </p>
                                </div>

                                <div className="hidden rounded-2xl bg-teal-50 px-4 py-3 text-right md:block">
                                    <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
                                        Acceso
                                    </p>
                                    <p className="mt-1 text-sm font-black text-teal-800">
                                        Seguro
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={iniciarSesion} className="mt-8 space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Usuario
                                    </label>

                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-teal-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-100">
                                        <User className="h-5 w-5 shrink-0 text-slate-400" />
                                        <input
                                            value={usuario}
                                            onChange={(event) => setUsuario(event.target.value)}
                                            placeholder="Ejemplo: admin"
                                            className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-medium"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Contraseña
                                    </label>

                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-teal-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-100">
                                        <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                                        <input
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            type={mostrarPassword ? "text" : "password"}
                                            placeholder="Contraseña"
                                            className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-medium"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setMostrarPassword((actual) => !actual)}
                                            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                        >
                                            {mostrarPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={cargando}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-teal-500/25 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {cargando ? "Validando acceso..." : "Entrar al sistema"}
                                    {!cargando && <ArrowRight className="h-4 w-4" />}
                                </button>
                            </form>

                            <div className="mt-8">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-black text-slate-800">
                                        Usuarios disponibles
                                    </p>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                                        Demo
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3">
                                    {usuariosDemo.map((usuarioDemo) => (
                                        <button
                                            key={usuarioDemo.id}
                                            type="button"
                                            onClick={() => llenarDemo(usuarioDemo)}
                                            className="group flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-teal-200 hover:bg-teal-50/40 hover:shadow-md"
                                        >
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-black text-white group-hover:bg-gradient-to-br group-hover:from-teal-600 group-hover:to-cyan-600">
                                                {iniciales(usuarioDemo.nombre)}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-black text-slate-800">
                                                    {usuarioDemo.nombre}
                                                </p>
                                                <p className="mt-0.5 text-xs font-medium text-slate-400">
                                                    {usuarioDemo.usuario} · {usuarioDemo.password}
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full px-3 py-1 text-[10px] font-black ${colorRol(
                                                    usuarioDemo.rol
                                                )}`}
                                            >
                                                {usuarioDemo.rol}
                                            </span>

                                            {usuarioDemo.estado === "Activo" ? (
                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                            ) : (
                                                <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                                                    Inactivo
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50 p-4">
                                <p className="text-xs font-semibold leading-5 text-amber-800">
                                    Etapa de desarrollo: las contraseñas se guardan localmente en
                                    este navegador. Cuando conectemos Supabase, usaremos
                                    autenticación segura real.
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-5 text-center text-xs font-medium text-slate-400">
                        © Sistema Clínico Odontológico · Diseño moderno para gestión clínica
                    </p>
                </div>
            </section>
        </main>
    );
}