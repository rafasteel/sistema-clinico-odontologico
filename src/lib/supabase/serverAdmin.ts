import { createClient } from "@supabase/supabase-js";

// Cliente con la identidad del solicitante: conserva RLS y las restricciones
// de licencia, a diferencia del cliente administrativo.
export function crearClienteSupabaseSesion(token: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Falta la configuración pública de Supabase.");
    return createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export function crearClienteSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en las variables de entorno.");
    }

    if (!serviceRoleKey) {
        throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
