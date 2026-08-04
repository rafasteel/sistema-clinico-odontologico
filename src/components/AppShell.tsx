"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    Bell,
    Calendar,
    CreditCard,
    FileSearch,
    Gauge,
    Home,
    LayoutDashboard,
    LogOut,
    Menu,
    Package,
    ReceiptText,
    Settings,
    Shield,
    Stethoscope,
    Truck,
    Upload,
    Users,
    Wallet,
    X,
    BarChart3,
    ClipboardList,
    Database,
    Search,
    Plus,
    HandCoins,
    FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import { generarNotificacionesSistema } from "@/lib/notificacionesSistema";
import { crearClienteSupabase } from "@/lib/supabase/client";
import {
    verificarLicenciaClinica,
    type LicenciaClinica,
} from "@/lib/supabase/licencia";

type RolUsuario = "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "RECEPCION" | "CAJA";
type RolUsuarioClinica = Exclude<RolUsuario, "SUPER_ADMIN">;

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: RolUsuario;
};

type AppShellProps = {
    titulo: string;
    descripcion: string;
    moduloActivo: string;
    children: ReactNode;
};

type ModuloSistema = {
    nombre: string;
    href: string;
    roles: RolUsuario[];
    icono: LucideIcon;
    grupo: string;
};

const modulos: ModuloSistema[] = [
    {
        nombre: "Inicio",
        href: "/inicio",
        roles: ["ADMIN", "DOCTOR", "RECEPCION", "CAJA"],
        icono: Home,
        grupo: "Principal",
    },
    {
        nombre: "Calendario",
        href: "/calendario",
        roles: ["ADMIN", "DOCTOR", "RECEPCION"],
        icono: Calendar,
        grupo: "Principal",
    },
    {
        nombre: "Notificaciones",
        href: "/notificaciones",
        roles: ["ADMIN", "DOCTOR", "RECEPCION", "CAJA"],
        icono: Bell,
        grupo: "Principal",
    },
    {
        nombre: "Dashboard",
        href: "/dashboard",
        roles: ["ADMIN", "DOCTOR", "RECEPCION", "CAJA"],
        icono: LayoutDashboard,
        grupo: "Principal",
    },
    {
        nombre: "Agenda Médica",
        href: "/agenda",
        roles: ["ADMIN", "DOCTOR", "RECEPCION"],
        icono: Calendar,
        grupo: "Clínica",
    },
    {
        nombre: "Pacientes",
        href: "/pacientes",
        roles: ["ADMIN", "DOCTOR", "RECEPCION"],
        icono: Users,
        grupo: "Clínica",
    },
    {
        nombre: "Presupuestos",
        href: "/presupuestos",
        roles: ["ADMIN", "DOCTOR", "RECEPCION"],
        icono: FileText,
        grupo: "Clínica",
    },
    {
        nombre: "Doctores y Servicios",
        href: "/doctores-servicios",
        roles: ["ADMIN", "DOCTOR", "RECEPCION"],
        icono: Stethoscope,
        grupo: "Clínica",
    },
    {
        nombre: "Caja y Venta",
        href: "/caja",
        roles: ["ADMIN", "CAJA", "RECEPCION"],
        icono: CreditCard,
        grupo: "Finanzas",
    },
    {
        nombre: "Cuentas por Cobrar",
        href: "/cuentas-cobrar",
        roles: ["ADMIN", "CAJA", "RECEPCION"],
        icono: HandCoins,
        grupo: "Finanzas",
    },
    {
        nombre: "Reporte de Créditos",
        href: "/reporte-creditos",
        roles: ["ADMIN", "CAJA", "RECEPCION"],
        icono: FileText,
        grupo: "Finanzas",
    },
    {
        nombre: "Cierre de Caja",
        href: "/cierre-caja",
        roles: ["ADMIN", "CAJA"],
        icono: ReceiptText,
        grupo: "Finanzas",
    },
    {
        nombre: "Control de Gastos",
        href: "/gastos",
        roles: ["ADMIN", "CAJA"],
        icono: Wallet,
        grupo: "Finanzas",
    },
    {
        nombre: "Reportes Financieros",
        href: "/reportes",
        roles: ["ADMIN"],
        icono: BarChart3,
        grupo: "Finanzas",
    },
    {
        nombre: "Exportaciones",
        href: "/exportaciones",
        roles: ["ADMIN"],
        icono: Upload,
        grupo: "Administración",
    },
    {
        nombre: "Respaldo",
        href: "/respaldo",
        roles: ["ADMIN"],
        icono: Shield,
        grupo: "Administración",
    },
    {
        nombre: "Almacén e Inventario",
        href: "/inventario",
        roles: ["ADMIN"],
        icono: Package,
        grupo: "Operaciones",
    },
    {
        nombre: "Proveedores",
        href: "/proveedores",
        roles: ["ADMIN"],
        icono: Truck,
        grupo: "Operaciones",
    },
    {
        nombre: "Administración",
        href: "/administracion",
        roles: ["ADMIN"],
        icono: Settings,
        grupo: "Administración",
    },
    {
        nombre: "Auditoría",
        href: "/auditoria",
        roles: ["ADMIN"],
        icono: FileSearch,
        grupo: "Administración",
    },
    {
        nombre: "Configuración General",
        href: "/configuracion",
        roles: ["ADMIN"],
        icono: Database,
        grupo: "Administración",
    },
];

const moduloBusquedaGlobal: ModuloSistema = {
    nombre: "Búsqueda Global",
    href: "/busqueda",
    roles: ["ADMIN", "DOCTOR", "RECEPCION", "CAJA"],
    icono: Search,
    grupo: "Principal",
};

function iniciales(nombre: string) {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "US";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function fechaActual() {
    return new Date().toLocaleDateString("es-NI", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

const USUARIO_SESION_KEY = "usuario_sistema_clinico";
const MENU_COLAPSADO_KEY = "menu_colapsado_sistema_clinico";
const NOTIFICACIONES_REVISADAS_KEY = "notificaciones_revisadas_sistema_clinico";

function esRolUsuario(valor: unknown): valor is RolUsuario {
    return (
        valor === "SUPER_ADMIN" ||
        valor === "ADMIN" ||
        valor === "DOCTOR" ||
        valor === "RECEPCION" ||
        valor === "CAJA"
    );
}

function obtenerUsuarioSesionRapida(): UsuarioSistema | null {
    if (typeof window === "undefined") return null;

    try {
        const usuarioGuardado = localStorage.getItem(USUARIO_SESION_KEY);
        if (!usuarioGuardado) return null;

        const usuarioActual = JSON.parse(usuarioGuardado) as Partial<UsuarioSistema>;

        if (
            !usuarioActual.usuario ||
            !usuarioActual.nombre ||
            !esRolUsuario(usuarioActual.rol)
        ) {
            return null;
        }

        return {
            usuario: usuarioActual.usuario,
            nombre: usuarioActual.nombre,
            rol: usuarioActual.rol,
        };
    } catch {
        return null;
    }
}

function obtenerAvisoLicencia(licencia: LicenciaClinica | null) {
    if (!licencia) return null;

    if (licencia.estadoAcceso === "Vencido") {
        return {
            titulo: "Suscripción vencida",
            descripcion:
                licencia.mensaje ||
                "La suscripción está vencida, pero todavía está dentro del período de gracia.",
            clases: "border-amber-100 bg-amber-50 text-amber-800",
            icono: "text-amber-700",
        };
    }

    if (licencia.estadoAcceso === "Restringido") {
        return {
            titulo: "Cuenta en modo restringido",
            descripcion:
                licencia.mensaje ||
                "La cuenta tiene restricciones administrativas. Regularizá el pago para mantener acceso completo.",
            clases: "border-orange-100 bg-orange-50 text-orange-800",
            icono: "text-orange-700",
        };
    }

    return null;
}

export default function AppShell({
    titulo,
    descripcion,
    moduloActivo,
    children,
}: AppShellProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [usuario, setUsuario] = useState<UsuarioSistema | null>(() =>
        obtenerUsuarioSesionRapida()
    );
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(() => {
        if (typeof window === "undefined") return CONFIGURACION_PREDETERMINADA;

        return obtenerConfiguracionClinica();
    });
    const [cargando, setCargando] = useState(() => {
        if (typeof window === "undefined") return true;

        return !obtenerUsuarioSesionRapida();
    });
    const [menuMovil, setMenuMovil] = useState(false);
    const [menuColapsado, setMenuColapsado] = useState(() => {
        if (typeof window === "undefined") return false;

        return localStorage.getItem(MENU_COLAPSADO_KEY) === "true";
    });
    const [notificacionesPendientes, setNotificacionesPendientes] = useState(0);
    const [busquedaGlobal, setBusquedaGlobal] = useState("");
    const [licenciaClinica, setLicenciaClinica] =
        useState<LicenciaClinica | null>(null);

    useEffect(() => {
        let componenteActivo = true;

        async function cargarSistema() {
            const usuarioActual = obtenerUsuarioSesionRapida();

            if (!usuarioActual) {
                localStorage.removeItem(USUARIO_SESION_KEY);
                setUsuario(null);
                setCargando(false);
                router.replace("/login");
                return;
            }

            if (usuarioActual.rol === "SUPER_ADMIN") {
                setUsuario(usuarioActual);
                setCargando(false);
                router.replace("/super-admin");
                return;
            }

            // Pintamos el sistema de inmediato usando la sesión local ya validada.
            // Luego se confirma licencia/configuración con Supabase en segundo plano.
            setUsuario(usuarioActual);
            setMenuColapsado(localStorage.getItem(MENU_COLAPSADO_KEY) === "true");
            setCargando(false);

            try {
                const licencia = await verificarLicenciaClinica();

                if (!componenteActivo) return;

                if (
                    licencia.estadoAcceso === "SinPerfil" ||
                    licencia.estadoAcceso === "Error"
                ) {
                    localStorage.removeItem(USUARIO_SESION_KEY);
                    setCargando(false);
                    router.replace("/login");
                    return;
                }

                if (!licencia.permitido) {
                    setUsuario(usuarioActual);
                    setLicenciaClinica(licencia);
                    setCargando(false);
                    router.replace("/suspendido");
                    return;
                }

                setUsuario(usuarioActual);
                setLicenciaClinica(licencia);

                let configuracionActual = obtenerConfiguracionClinica();

                try {
                    configuracionActual = await obtenerConfiguracionClinicaSupabase();
                } catch {
                    // Si Supabase no responde, usamos la configuración local como respaldo.
                }

                if (!componenteActivo) return;

                setConfiguracion({
                    ...configuracionActual,
                    nombreClinica:
                        configuracionActual.nombreClinica ||
                        licencia.clinica?.nombre ||
                        configuracionActual.nombreClinica,
                });

                try {
                    const notificaciones = generarNotificacionesSistema({
                        usuario: usuarioActual.usuario,
                        nombre: usuarioActual.nombre,
                        rol: usuarioActual.rol as RolUsuarioClinica,
                    });
                    const revisadasRaw = localStorage.getItem(
                        NOTIFICACIONES_REVISADAS_KEY
                    );

                    let revisadas: string[] = [];

                    if (revisadasRaw) {
                        revisadas = JSON.parse(revisadasRaw) as string[];
                    }

                    const pendientes = notificaciones.filter(
                        (item) => !revisadas.includes(item.id)
                    );

                    setNotificacionesPendientes(pendientes.length);
                } catch {
                    setNotificacionesPendientes(0);
                }

                setCargando(false);
            } catch {
                localStorage.removeItem(USUARIO_SESION_KEY);
                setCargando(false);
                router.replace("/login");
            }
        }

        cargarSistema();

        return () => {
            componenteActivo = false;
        };
    }, [router]);

    const modulosPermitidos = useMemo(() => {
        if (!usuario) return [];
        return modulos.filter((modulo) => modulo.roles.includes(usuario.rol));
    }, [usuario]);

    const grupos = useMemo(() => {
        const resultado: Record<string, ModuloSistema[]> = {};

        modulosPermitidos.forEach((modulo) => {
            if (!resultado[modulo.grupo]) resultado[modulo.grupo] = [];
            resultado[modulo.grupo].push(modulo);
        });

        return resultado;
    }, [modulosPermitidos]);

    const moduloActual = useMemo(() => {
        if (moduloActivo === "Búsqueda Global" || pathname.startsWith("/busqueda")) {
            return moduloBusquedaGlobal;
        }

        const porNombre = modulos.find((modulo) => modulo.nombre === moduloActivo);

        if (porNombre) return porNombre;

        const porRuta = [...modulos]
            .sort((a, b) => b.href.length - a.href.length)
            .find(
                (modulo) =>
                    pathname === modulo.href || pathname.startsWith(`${modulo.href}/`)
            );

        return porRuta || modulos[0];
    }, [moduloActivo, pathname]);

    const IconoModulo = moduloActual.icono;
    const avisoLicencia = obtenerAvisoLicencia(licenciaClinica);

    async function cerrarSesion() {
        try {
            const supabase = crearClienteSupabase();
            await supabase.auth.signOut();
        } catch {
            // Si Supabase no responde, limpiamos la sesión local igual.
        }

        localStorage.removeItem(USUARIO_SESION_KEY);
        router.replace("/login");
    }

    function alternarMenuColapsado() {
        setMenuColapsado((valorActual) => {
            const nuevoValor = !valorActual;
            localStorage.setItem(
                MENU_COLAPSADO_KEY,
                String(nuevoValor)
            );
            return nuevoValor;
        });
    }

    function buscar(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const texto = busquedaGlobal.trim();

        if (!texto) {
            router.push("/busqueda");
            return;
        }

        router.push(`/busqueda?q=${encodeURIComponent(texto)}`);
    }

    if (cargando) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F4F7FA] px-4">
                <div className="glass-panel rounded-[32px] p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white">
                        <Activity className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-500">
                        Cargando sistema...
                    </p>
                </div>
            </main>
        );
    }

    if (!usuario) return null;

    return (
        <div className="min-h-screen w-full overflow-hidden">
            <div className="hidden h-screen w-full gap-4 p-4 md:flex">
                <aside
                    className={`flex h-full shrink-0 flex-col overflow-hidden rounded-[32px] bg-[#0B0F19] shadow-[0_8px_48px_rgba(0,0,0,0.22)] ${menuColapsado ? "w-[92px]" : "w-[280px]"
                        }`}
                >
                    <div
                        className={`flex items-center border-b border-white/5 p-4 ${menuColapsado ? "justify-center" : "gap-3"
                            }`}
                    >
                        <Link
                            href="/inicio"
                            className={`flex min-w-0 items-center ${menuColapsado ? "justify-center" : "gap-3"
                                }`}
                            title={configuracion.nombreClinica}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600">
                                <Activity className="h-[18px] w-[18px] text-white" />
                            </div>

                            {!menuColapsado && (
                                <div className="min-w-0">
                                    <h1 className="truncate text-sm font-bold leading-tight text-white">
                                        {configuracion.nombreClinica}
                                    </h1>
                                    <p className="text-[10px] leading-tight text-white/30">
                                        Sistema Clínico
                                    </p>
                                </div>
                            )}
                        </Link>

                        {!menuColapsado && (
                            <div className="ml-auto flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                <span className="mono text-[9px] font-medium text-white/25">
                                    LIVE
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="border-b border-white/5 p-3">
                        <button
                            type="button"
                            onClick={alternarMenuColapsado}
                            className={`flex w-full items-center rounded-2xl bg-white/[0.04] px-3 py-2.5 text-white/45 hover:bg-white/[0.07] hover:text-white/80 ${menuColapsado ? "justify-center" : "gap-3"
                                }`}
                            title={menuColapsado ? "Mostrar menú" : "Ocultar menú"}
                        >
                            <Menu className="h-4 w-4 shrink-0" />
                            {!menuColapsado && (
                                <span className="text-[12px] font-bold">
                                    Ocultar menú
                                </span>
                            )}
                        </button>
                    </div>

                    <nav
                        className={`flex-1 overflow-y-auto ${menuColapsado ? "space-y-2 p-3" : "space-y-5 p-4"
                            }`}
                    >
                        {Object.entries(grupos).map(([grupo, items]) => (
                            <div key={grupo}>
                                {!menuColapsado && (
                                    <p className="mono mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
                                        {grupo}
                                    </p>
                                )}

                                <div className={menuColapsado ? "space-y-2" : "space-y-0.5"}>
                                    {items.map((modulo) => {
                                        const Icono = modulo.icono;
                                        const activo =
                                            modulo.nombre === moduloActivo ||
                                            pathname === modulo.href ||
                                            pathname.startsWith(`${modulo.href}/`);
                                        const esNotificaciones =
                                            modulo.href === "/notificaciones";

                                        return (
                                            <Link
                                                key={modulo.href}
                                                href={modulo.href}
                                                title={modulo.nombre}
                                                className={`group relative flex w-full items-center rounded-xl text-left transition-all duration-200 ${menuColapsado
                                                    ? "justify-center px-3 py-3"
                                                    : "gap-3 px-3 py-2.5"
                                                    } ${activo
                                                        ? "bg-teal-500/15 text-teal-200"
                                                        : "text-white/40 hover:bg-white/[0.04] hover:text-white/75"
                                                    }`}
                                            >
                                                <Icono className="h-[16px] w-[16px] shrink-0" />

                                                {!menuColapsado && (
                                                    <span className="flex-1 truncate text-[12px] font-medium tracking-[0.01em]">
                                                        {modulo.nombre}
                                                    </span>
                                                )}

                                                {esNotificaciones &&
                                                    notificacionesPendientes > 0 && (
                                                        <span
                                                            className={
                                                                menuColapsado
                                                                    ? "absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"
                                                                    : "rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white"
                                                            }
                                                        >
                                                            {!menuColapsado &&
                                                                notificacionesPendientes}
                                                        </span>
                                                    )}

                                                {activo && !menuColapsado && (
                                                    <span className="h-[5px] w-[5px] rounded-full bg-teal-500" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    <div className="border-t border-white/5 p-4">
                        <div
                            className={`flex items-center ${menuColapsado ? "justify-center" : "gap-3"
                                }`}
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-[11px] font-bold text-white">
                                {iniciales(usuario.nombre)}
                            </div>

                            {!menuColapsado && (
                                <>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[11px] font-semibold leading-tight text-white">
                                            {usuario.nombre}
                                        </p>
                                        <p className="mt-0.5 text-[9px] text-white/30">
                                            {usuario.rol}
                                        </p>
                                    </div>

                                    <button
                                        onClick={cerrarSesion}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.06] hover:text-white/70"
                                        title="Cerrar sesión"
                                    >
                                        <LogOut className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            )}
                        </div>

                        {menuColapsado && (
                            <button
                                onClick={cerrarSesion}
                                className="mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-200 hover:bg-red-500/15"
                                title="Cerrar sesión"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
                    <header className="glass-card flex shrink-0 items-center gap-4 rounded-2xl px-6 py-4">
                        <div className="min-w-0">
                            <p className="mono mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                {fechaActual()}
                            </p>

                            <h2 className="truncate text-[18px] font-bold leading-none text-slate-800">
                                {titulo}
                            </h2>
                        </div>

                        <span className="mono rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-bold tracking-wide text-teal-700">
                            {usuario.rol}
                        </span>

                        <form
                            onSubmit={buscar}
                            className="ml-auto hidden max-w-md flex-1 items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-2 lg:flex"
                        >
                            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <input
                                value={busquedaGlobal}
                                onChange={(event) =>
                                    setBusquedaGlobal(event.target.value)
                                }
                                className="w-full bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
                                placeholder="Buscar paciente, cédula, medicamento, venta..."
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800"
                            >
                                Buscar
                            </button>
                        </form>

                        <Link
                            href="/busqueda"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 hover:bg-slate-200/80 lg:hidden"
                            title="Búsqueda global"
                        >
                            <Search className="h-4 w-4" />
                        </Link>

                        <Link
                            href="/notificaciones"
                            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 hover:bg-slate-200/80"
                        >
                            <Bell className="h-4 w-4" />
                            {notificacionesPendientes > 0 && (
                                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-[1.5px] border-white bg-red-500" />
                            )}
                        </Link>

                        <Link
                            href="/pacientes"
                            className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo paciente
                        </Link>
                    </header>

                    <main className="flex-1 space-y-4 overflow-y-auto pb-2">
                        {avisoLicencia && (
                            <section
                                className={`rounded-2xl border px-5 py-4 ${avisoLicencia.clases}`}
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle
                                        className={`mt-0.5 h-5 w-5 shrink-0 ${avisoLicencia.icono}`}
                                    />
                                    <div>
                                        <h3 className="text-sm font-black">
                                            {avisoLicencia.titulo}
                                        </h3>
                                        <p className="mt-1 text-xs leading-5">
                                            {avisoLicencia.descripcion}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        <section className="relative overflow-hidden rounded-2xl border border-teal-200/50 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 px-7 py-5">
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-teal-700 shadow-sm">
                                    <IconoModulo className="h-5 w-5" />
                                </div>

                                <div>
                                    <p className="mono mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-teal-700">
                                        Módulo activo
                                    </p>
                                    <h1 className="mb-1 text-[22px] font-bold leading-tight text-slate-800">
                                        {titulo}
                                    </h1>
                                    <p className="max-w-2xl text-[12px] leading-relaxed text-slate-500">
                                        {descripcion}
                                    </p>
                                </div>

                                <div className="ml-auto hidden items-center gap-2 rounded-xl border border-teal-200/60 bg-white/65 px-3.5 py-2 text-[11px] font-semibold text-teal-700 lg:flex">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                    Sistema operativo
                                </div>
                            </div>

                            <Gauge className="pointer-events-none absolute right-8 top-1/2 h-32 w-32 -translate-y-1/2 text-teal-600 opacity-[0.06]" />
                        </section>

                        <div>{children}</div>
                    </main>
                </div>
            </div>

            <div className="flex h-screen flex-col md:hidden">
                <header className="glass-card flex shrink-0 items-center justify-between border-b border-white/80 px-4 pb-4 pt-10">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setMenuMovil(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white"
                        >
                            <Menu className="h-4 w-4" />
                        </button>

                        <div>
                            <h1 className="text-[14px] font-bold leading-tight text-slate-800">
                                {configuracion.nombreClinica}
                            </h1>
                            <p className="text-[9px] text-slate-400">{titulo}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/busqueda"
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                        >
                            <Search className="h-4 w-4" />
                        </Link>

                        <Link
                            href="/notificaciones"
                            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                        >
                            <Bell className="h-4 w-4" />
                            {notificacionesPendientes > 0 && (
                                <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-red-500" />
                            )}
                        </Link>

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-[10px] font-bold text-white">
                            {iniciales(usuario.nombre)}
                        </div>
                    </div>
                </header>

                {menuMovil && (
                    <div className="fixed inset-0 z-50 bg-slate-950/50 p-3 backdrop-blur-sm">
                        <aside className="flex h-full flex-col overflow-hidden rounded-[32px] bg-[#0B0F19] shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/5 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600">
                                        <Activity className="h-[18px] w-[18px] text-white" />
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            {configuracion.nombreClinica}
                                        </p>
                                        <p className="text-[10px] text-white/30">
                                            Menú principal
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setMenuMovil(false)}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/60"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="border-b border-white/5 p-4">
                                <Link
                                    href="/busqueda"
                                    onClick={() => setMenuMovil(false)}
                                    className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/70"
                                >
                                    <Search className="h-4 w-4" />
                                    Búsqueda global
                                </Link>
                            </div>

                            <nav className="flex-1 space-y-5 overflow-y-auto p-4">
                                {Object.entries(grupos).map(([grupo, items]) => (
                                    <div key={grupo}>
                                        <p className="mono mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
                                            {grupo}
                                        </p>

                                        <div className="space-y-1">
                                            {items.map((modulo) => {
                                                const Icono = modulo.icono;
                                                const activo =
                                                    modulo.nombre === moduloActivo ||
                                                    pathname === modulo.href ||
                                                    pathname.startsWith(`${modulo.href}/`);
                                                const esNotificaciones =
                                                    modulo.href === "/notificaciones";

                                                return (
                                                    <Link
                                                        key={modulo.href}
                                                        href={modulo.href}
                                                        onClick={() => setMenuMovil(false)}
                                                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${activo
                                                            ? "bg-teal-500/15 text-teal-200"
                                                            : "text-white/45"
                                                            }`}
                                                    >
                                                        <Icono className="h-4 w-4" />
                                                        <span className="flex-1">
                                                            {modulo.nombre}
                                                        </span>

                                                        {esNotificaciones &&
                                                            notificacionesPendientes > 0 && (
                                                                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                                                                    {
                                                                        notificacionesPendientes
                                                                    }
                                                                </span>
                                                            )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </nav>

                            <button
                                onClick={cerrarSesion}
                                className="m-4 flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200"
                            >
                                <LogOut className="h-4 w-4" />
                                Cerrar sesión
                            </button>
                        </aside>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
                    {avisoLicencia && (
                        <section
                            className={`mb-4 rounded-2xl border px-4 py-3 ${avisoLicencia.clases}`}
                        >
                            <div className="flex items-start gap-3">
                                <AlertTriangle
                                    className={`mt-0.5 h-4 w-4 shrink-0 ${avisoLicencia.icono}`}
                                />
                                <div>
                                    <h3 className="text-xs font-black">
                                        {avisoLicencia.titulo}
                                    </h3>
                                    <p className="mt-1 text-[11px] leading-5">
                                        {avisoLicencia.descripcion}
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="mb-4 overflow-hidden rounded-2xl border border-teal-200/50 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 px-5 py-4">
                        <p className="mono mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-teal-700">
                            Módulo activo
                        </p>
                        <h1 className="text-[20px] font-bold text-slate-800">
                            {titulo}
                        </h1>
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                            {descripcion}
                        </p>
                    </section>

                    {children}
                </main>

                <nav className="fixed bottom-4 left-4 right-4 z-40 rounded-2xl bg-[#0B0F19]/95 px-3 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
                    <div className="flex items-center justify-around">
                        {[
                            { href: "/inicio", icono: Home, texto: "Inicio" },
                            { href: "/agenda", icono: Calendar, texto: "Agenda" },
                            { href: "/pacientes", icono: Users, texto: "Pacientes" },
                            { href: "/busqueda", icono: Search, texto: "Buscar" },
                            { href: "/notificaciones", icono: Bell, texto: "Alertas" },
                        ]
                            .filter((item) => {
                                if (item.href === "/busqueda") return true;

                                return modulosPermitidos.some(
                                    (modulo) => modulo.href === item.href
                                );
                            })
                            .map((item) => {
                                const Icono = item.icono;
                                const activo =
                                    pathname === item.href ||
                                    pathname.startsWith(`${item.href}/`);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex flex-col items-center gap-1 px-2"
                                    >
                                        <div
                                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${activo ? "bg-teal-500/20" : ""
                                                }`}
                                        >
                                            <Icono
                                                className={`h-[17px] w-[17px] ${activo
                                                    ? "text-teal-200"
                                                    : "text-white/35"
                                                    }`}
                                            />
                                        </div>

                                        <span
                                            className={`text-[9px] font-medium ${activo
                                                ? "text-teal-200"
                                                : "text-white/30"
                                                }`}
                                        >
                                            {item.texto}
                                        </span>
                                    </Link>
                                );
                            })}
                    </div>
                </nav>
            </div>
        </div>
    );
}