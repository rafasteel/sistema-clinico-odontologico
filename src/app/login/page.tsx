"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    CreditCard,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Sparkles,
    Stethoscope,
    Users,
} from "lucide-react";
import { crearClienteSupabase } from "@/lib/supabase/client";
import {
    guardarSesionLocal,
    limpiarSesionLocal,
    obtenerPerfilActual,
} from "@/lib/supabase/perfil";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

function colorRol(rol: string) {
    if (rol === "SUPER_ADMIN") return "bg-purple-50 text-purple-700 border border-purple-100";
    if (rol === "ADMIN") return "bg-slate-900 text-white";
    if (rol === "DOCTOR") return "bg-teal-50 text-teal-700 border border-teal-100";
    if (rol === "RECEPCION") return "bg-indigo-50 text-indigo-700 border border-indigo-100";

    return "bg-emerald-50 text-emerald-700 border border-emerald-100";
}

export default function LoginPage() {
    const router = useRouter();

    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [verificandoSesion, setVerificandoSesion] = useState(true);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    useEffect(() => {
        let componenteActivo = true;

        const tiempoMaximo = window.setTimeout(() => {
            if (!componenteActivo) return;
            limpiarSesionLocal();
            setVerificandoSesion(false);
        }, 3500);

        async function revisarSesionActiva() {
            try {
                setConfiguracion(obtenerConfiguracionClinica());

                const { perfil } = await obtenerPerfilActual();

                if (!componenteActivo) return;

                if (perfil && perfil.estado === "Activo") {
                    guardarSesionLocal(perfil);
                    router.replace(perfil.rol === "SUPER_ADMIN" ? "/super-admin" : "/inicio");
                    return;
                }

                limpiarSesionLocal();
            } catch (errorRevision) {
                console.error("Error revisando sesión Supabase:", errorRevision);
                limpiarSesionLocal();
            } finally {
                window.clearTimeout(tiempoMaximo);

                if (componenteActivo) {
                    setVerificandoSesion(false);
                }
            }
        }

        revisarSesionActiva();

        return () => {
            componenteActivo = false;
            window.clearTimeout(tiempoMaximo);
        };
    }, [router]);

    async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const correoLimpio = correo.trim().toLowerCase();
        const passwordLimpio = password.trim();

        if (!correoLimpio || !passwordLimpio) {
            setError("Escribí tu correo y contraseña.");
            return;
        }

        setError("");
        setCargando(true);

        try {
            const supabase = crearClienteSupabase();

            const { error: errorLogin } = await supabase.auth.signInWithPassword({
                email: correoLimpio,
                password: passwordLimpio,
            });

            if (errorLogin) {
                setError("Correo o contraseña incorrectos.");
                return;
            }

            const { perfil, error: errorPerfil } = await obtenerPerfilActual();

            if (errorPerfil || !perfil) {
                await supabase.auth.signOut();
                limpiarSesionLocal();
                setError(
                    errorPerfil ||
                    "El usuario inició sesión, pero no tiene perfil registrado en usuarios_perfiles."
                );
                return;
            }

            if (perfil.estado !== "Activo") {
                await supabase.auth.signOut();
                limpiarSesionLocal();
                setError("Este usuario está inactivo. Contactá al administrador.");
                return;
            }

            guardarSesionLocal(perfil);
            router.push(perfil.rol === "SUPER_ADMIN" ? "/super-admin" : "/inicio");
        } catch (errorLoginGeneral) {
            console.error("Error iniciando sesión Supabase:", errorLoginGeneral);
            limpiarSesionLocal();
            setError(
                "No se pudo conectar con Supabase. Revisá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local."
            );
        } finally {
            setCargando(false);
        }
    }

    if (verificandoSesion) {
        return (
            <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F7FA] px-4 text-slate-900">
                <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-teal-400/20 blur-3xl" />
                <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-3xl" />

                <div className="glass-panel rounded-[32px] bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
                    <Loader2 className="mx-auto h-9 w-9 animate-spin text-teal-600" />
                    <h1 className="mt-4 text-lg font-black text-slate-900">
                        Verificando sesión
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        Validando acceso con Supabase Auth...
                    </p>
                </div>
            </main>
        );
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
                                    <h3 className="mt-4 font-bold">Seguridad real</h3>
                                    <p className="mt-2 text-sm leading-6 text-white/45">
                                        Acceso con Supabase Auth, roles y multi-clínica.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-10 flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                                <div>
                                    <p className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                                        Estado del sistema
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-white">
                                        Conectado a Supabase
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
                                        Inicia sesión con tu correo y contraseña.
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
                                        Correo electrónico
                                    </label>

                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-teal-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-100">
                                        <Mail className="h-5 w-5 shrink-0 text-slate-400" />
                                        <input
                                            value={correo}
                                            onChange={(event) => setCorreo(event.target.value)}
                                            type="email"
                                            placeholder="correo@clinica.com"
                                            autoComplete="email"
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
                                            autoComplete="current-password"
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
                                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                                            <p className="text-sm font-bold leading-6 text-red-700">
                                                {error}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={cargando}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-teal-500/25 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {cargando ? "Validando acceso..." : "Entrar al sistema"}
                                    {cargando ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                </button>
                            </form>

                            <div className="mt-8">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-black text-slate-800">
                                        Acceso configurado
                                    </p>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                                        Supabase
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3">
                                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                                <ShieldCheck className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-slate-800">
                                                    Usuarios reales
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    El acceso ahora se valida con Supabase Auth y la
                                                    tabla usuarios_perfiles.
                                                </p>
                                            </div>

                                            <span className={`rounded-full px-3 py-1 text-[10px] font-black ${colorRol("SUPER_ADMIN")}`}>
                                                SUPER_ADMIN
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                                                <LockKeyhole className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-slate-800">
                                                    Redirección automática
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    SUPER_ADMIN entra a /super-admin. Los usuarios de
                                                    clínica entran a /inicio.
                                                </p>
                                            </div>

                                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                                <p className="text-xs font-semibold leading-5 text-blue-800">
                                    Etapa Supabase: las contraseñas ya no se guardan en localStorage.
                                    El sistema mantiene una sesión local temporal solo para que los
                                    módulos actuales sigan funcionando mientras migramos todo a base
                                    de datos.
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