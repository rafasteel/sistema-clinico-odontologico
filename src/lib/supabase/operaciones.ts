import { crearClienteSupabase } from "@/lib/supabase/client";

export class ErrorOperacionClinica extends Error {
    constructor(mensaje: string, public codigo?: string) { super(mensaje); }
}

const solicitudes = new Map<string, string>();
const enCurso = new Map<string, Promise<unknown>>();

function normalizar(valor: unknown): unknown {
    if (typeof valor === "number" && !Number.isFinite(valor)) {
        throw new Error("Los importes y cantidades deben ser números finitos.");
    }
    if (Array.isArray(valor)) return valor.map(normalizar);
    if (valor && typeof valor === "object") {
        return Object.fromEntries(Object.entries(valor).filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normalizar(v)]));
    }
    return valor;
}

function leerPendiente(clave: string) {
    try { return typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(clave); }
    catch { return null; }
}

function guardarPendiente(clave: string, id: string | null) {
    if (id) solicitudes.set(clave, id); else solicitudes.delete(clave);
    try {
        if (typeof sessionStorage !== "undefined") {
            if (id) sessionStorage.setItem(clave, id); else sessionStorage.removeItem(clave);
        }
    } catch { /* La memoria conserva el identificador si el almacenamiento no está disponible. */ }
}

// Un fallo de transporte conserva la misma solicitud, incluso tras recargar
// la pestaña. Una respuesta confirmada permite otra operación intencional
// con los mismos datos. Los envíos simultáneos comparten la misma promesa.
export async function ejecutarOperacionClinica<T>(operacion: string, datos: object, solicitudId?: string): Promise<T> {
    const normalizados = normalizar(datos);
    const supabase = crearClienteSupabase();
    const { data: sesion, error: errorSesion } = await supabase.auth.getSession();
    if (errorSesion || !sesion.session?.user.id) throw new Error("No hay una sesión activa.");
    const bytes = new TextEncoder().encode(JSON.stringify(normalizados));
    const huella = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const clave = `operacion-clinica:${sesion.session.user.id}:${operacion}:${huella}:${solicitudId || ""}`;
    const existente = enCurso.get(clave);
    if (existente) return existente as Promise<T>;
    const id = solicitudId || solicitudes.get(clave) || leerPendiente(clave) || crypto.randomUUID();
    guardarPendiente(clave, id);
    const promesa = (async () => {
        const { data, error } = await supabase.rpc("ejecutar_operacion_clinica", {
            p_operacion: operacion, p_datos: normalizados, p_solicitud: id,
        });
        if (error) {
            // Un código SQL/PostgREST confirma el rechazo. Sin código puede
            // haberse confirmado la transacción y perdido solo la respuesta.
            if (error.code) guardarPendiente(clave, null);
            throw new ErrorOperacionClinica(error.message || "No se pudo completar la operación.", error.code);
        }
        guardarPendiente(clave, null);
        return data as T;
    })();
    enCurso.set(clave, promesa);
    try { return await promesa; } finally { enCurso.delete(clave); }
}
