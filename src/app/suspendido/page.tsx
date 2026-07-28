"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarClock,
    CreditCard,
    LogOut,
    ShieldAlert,
} from "lucide-react";
import { crearClienteSupabase } from "@/lib/supabase/client";
import { verificarLicenciaClinica, type LicenciaClinica } from "@/lib/supabase/licencia";

function fechaLegible(fecha?: string | null) {
    if (!fecha) return "Sin fecha registrada";

    try {
        return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-NI", {
            year: "numeric",
            month: "long",
            day: "2-digit",
        });
    } catch {
        return fecha;
    }
}

export default function SuspendidoPage() {
    const router = useRouter();
    const supabase = useMemo(() => crearClienteSupabase(), []);

    const [licencia, setLicencia] = useState<LicenciaClinica | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        async function cargarLicencia() {
            const resultado = await verificarLicenciaClinica();
            setLicencia(resultado);
            setCargando(false);
        }

        cargarLicencia();
    }, []);

    async function cerrarSesion() {
        await supabase.auth.signOut();
        localStorage.removeItem("usuario_sistema_clinico");
        router.replace("/login");
    }

    if (cargando) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="rounded-[32px] bg-white p-8 text-center shadow-xl">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-red-100 border-t-red-600" />
                    <h1 className="mt-5 text-xl font-black text-slate-900">
                        Verificando acceso
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Revisando el estado de la suscripción...
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#f4f7fa] px-4 py-8">
            <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-red-300/25 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] h-[420px] w-[420px] rounded-full bg-amber-300/25 blur-3xl" />

            <section className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl items-center justify-center">
                <div className="w-full overflow-hidden rounded-[40px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
                    <div className="bg-slate-950 p-8 text-white md:p-10">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/15 text-red-300">
                            <ShieldAlert className="h-8 w-8" />
                        </div>

                        <h1 className="mt-6 text-3xl font-black md:text-4xl">
                            Acceso temporalmente suspendido
                        </h1>

                        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
                            El sistema detectó que la cuenta de esta clínica no está activa.
                            Para reactivar el servicio, comuníquese con soporte o regularice
                            el pago pendiente.
                        </p>
                    </div>

                    <div className="grid gap-5 p-6 md:grid-cols-3 md:p-8">
                        <div className="rounded-3xl bg-slate-50 p-5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-xs font-bold text-slate-400">
                                Clínica
                            </p>
                            <h3 className="mt-1 text-sm font-black text-slate-900">
                                {licencia?.clinica?.nombre || "No identificada"}
                            </h3>
                        </div>

                        <div className="rounded-3xl bg-red-50 p-5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-xs font-bold text-red-700">
                                Estado
                            </p>
                            <h3 className="mt-1 text-sm font-black text-red-800">
                                {licencia?.estadoAcceso || "Suspendido"}
                            </h3>
                        </div>

                        <div className="rounded-3xl bg-amber-50 p-5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white">
                                <CalendarClock className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-xs font-bold text-amber-700">
                                Vencimiento
                            </p>
                            <h3 className="mt-1 text-sm font-black text-amber-800">
                                {fechaLegible(
                                    licencia?.suscripcion?.fecha_vencimiento ||
                                    licencia?.clinica?.fecha_vencimiento
                                )}
                            </h3>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 p-6 md:p-8">
                        <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                            <div className="flex items-start gap-3">
                                <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                                <div>
                                    <h2 className="text-sm font-black text-red-800">
                                        Motivo del bloqueo
                                    </h2>
                                    <p className="mt-1 text-xs leading-6 text-red-700">
                                        {licencia?.mensaje ||
                                            "La cuenta no está activa para continuar usando el sistema."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-between gap-3">
                            {licencia?.perfil?.rol === "SUPER_ADMIN" && (
                                <button
                                    onClick={() => router.push("/super-admin")}
                                    className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Ir a SUPER_ADMIN
                                </button>
                            )}

                            <button
                                onClick={cerrarSesion}
                                className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700"
                            >
                                <LogOut className="h-4 w-4" />
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}