import type { User } from "@supabase/supabase-js";
import { crearClienteSupabase } from "@/lib/supabase/client";

export type RolPerfilSupabase =
    | "SUPER_ADMIN"
    | "ADMIN"
    | "DOCTOR"
    | "RECEPCION"
    | "CAJA";

export type EstadoPerfilSupabase = "Activo" | "Inactivo";

export type PerfilUsuarioSupabase = {
    id: string;
    auth_user_id: string;
    clinica_id: string | null;
    nombre: string;
    usuario: string;
    correo: string;
    rol: RolPerfilSupabase;
    estado: EstadoPerfilSupabase;
    creado_en?: string;
    actualizado_en?: string;
};

export type ResultadoPerfilActual = {
    user: User | null;
    perfil: PerfilUsuarioSupabase | null;
    error: string | null;
};

function respuestaConTiempoMaximo<T>(
    promesa: PromiseLike<T>,
    milisegundos = 8000
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const temporizador = setTimeout(() => {
            reject(new Error("La consulta a Supabase tardó demasiado."));
        }, milisegundos);

        promesa.then(
            (resultado) => {
                clearTimeout(temporizador);
                resolve(resultado);
            },
            (error) => {
                clearTimeout(temporizador);
                reject(error);
            }
        );
    });
}

export async function obtenerPerfilActual(): Promise<ResultadoPerfilActual> {
    try {
        const supabase = crearClienteSupabase();

        const { data: sessionData, error: errorSesion } =
            await respuestaConTiempoMaximo(supabase.auth.getSession(), 8000);

        if (errorSesion) {
            return {
                user: null,
                perfil: null,
                error: errorSesion.message,
            };
        }

        const user = sessionData.session?.user || null;

        if (!user) {
            return {
                user: null,
                perfil: null,
                error: null,
            };
        }

        const { data: perfil, error: errorPerfil } =
            await respuestaConTiempoMaximo(
                supabase
                    .from("usuarios_perfiles")
                    .select(
                        "id, auth_user_id, clinica_id, nombre, usuario, correo, rol, estado, creado_en, actualizado_en"
                    )
                    .eq("auth_user_id", user.id)
                    .maybeSingle(),
                8000
            );

        if (errorPerfil) {
            return {
                user,
                perfil: null,
                error: errorPerfil.message,
            };
        }

        if (!perfil) {
            return {
                user,
                perfil: null,
                error: "No existe un perfil en usuarios_perfiles para este usuario.",
            };
        }

        return {
            user,
            perfil: perfil as PerfilUsuarioSupabase,
            error: null,
        };
    } catch (error) {
        return {
            user: null,
            perfil: null,
            error:
                error instanceof Error
                    ? error.message
                    : "No se pudo obtener el perfil del usuario.",
        };
    }
}

export function guardarSesionLocal(perfil: PerfilUsuarioSupabase) {
    if (typeof window === "undefined") return;

    localStorage.setItem(
        "usuario_sistema_clinico",
        JSON.stringify({
            usuario: perfil.usuario || perfil.correo,
            nombre: perfil.nombre,
            rol: perfil.rol,
            correo: perfil.correo,
            perfilId: perfil.id,
            authUserId: perfil.auth_user_id,
            clinicaId: perfil.clinica_id,
            origen: "supabase",
        })
    );
}

export function limpiarSesionLocal() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("usuario_sistema_clinico");
}

export async function cerrarSesionSupabase() {
    const supabase = crearClienteSupabase();
    await supabase.auth.signOut();
    limpiarSesionLocal();
}