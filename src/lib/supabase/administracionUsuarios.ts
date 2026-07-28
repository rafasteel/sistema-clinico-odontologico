import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type RolUsuarioAdministracion = "ADMIN" | "DOCTOR" | "RECEPCION" | "CAJA";
export type EstadoUsuarioAdministracion = "Activo" | "Inactivo";

export type UsuarioAdministracionSupabase = {
    id: string;
    auth_user_id: string | null;
    clinica_id: string | null;
    usuario: string;
    correo: string;
    nombre: string;
    rol: RolUsuarioAdministracion;
    estado: EstadoUsuarioAdministracion;
    creado_en: string;
    actualizado_en: string;
};

export type SesionAdministracionSupabase = {
    id: string;
    usuario: string;
    correo: string;
    nombre: string;
    rol: string;
    estado: EstadoUsuarioAdministracion;
    clinica_id: string | null;
    auth_user_id: string | null;
};

export type FormularioUsuarioAdministracionSupabase = {
    id?: string | null;
    usuario: string;
    correo: string;
    password?: string;
    nombre: string;
    rol: RolUsuarioAdministracion;
    estado: EstadoUsuarioAdministracion;
};

type RespuestaApi<T> = {
    ok: boolean;
    mensaje?: string;
    data?: T;
};

function limpiarTexto(valor: unknown, respaldo = "") {
    const convertido = String(valor ?? "").trim();
    return convertido || respaldo;
}

function normalizarUsuario(valor: string) {
    return limpiarTexto(valor)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9._-]/g, "");
}

function validarRol(rol: string): rol is RolUsuarioAdministracion {
    return rol === "ADMIN" || rol === "DOCTOR" || rol === "RECEPCION" || rol === "CAJA";
}

function convertirUsuario(data: Record<string, unknown>): UsuarioAdministracionSupabase {
    const rol = limpiarTexto(data.rol, "RECEPCION");

    return {
        id: limpiarTexto(data.id),
        auth_user_id: data.auth_user_id ? String(data.auth_user_id) : null,
        clinica_id: data.clinica_id ? String(data.clinica_id) : null,
        usuario: limpiarTexto(data.usuario),
        correo: limpiarTexto(data.correo),
        nombre: limpiarTexto(data.nombre),
        rol: validarRol(rol) ? rol : "RECEPCION",
        estado: limpiarTexto(data.estado, "Activo") === "Inactivo" ? "Inactivo" : "Activo",
        creado_en: limpiarTexto(data.creado_en),
        actualizado_en: limpiarTexto(data.actualizado_en),
    };
}

async function obtenerAccessToken() {
    const supabase = crearClienteSupabase();
    const { data, error } = await supabase.auth.getSession();

    if (error) throw new Error(error.message);

    const token = data.session?.access_token;

    if (!token) throw new Error("No hay sesión activa de Supabase.");

    return token;
}

async function llamarApiAdministracion<T>(payload: Record<string, unknown>): Promise<T> {
    const token = await obtenerAccessToken();

    const respuesta = await fetch("/api/administracion/usuarios", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const resultado = (await respuesta.json()) as RespuestaApi<T>;

    if (!respuesta.ok || !resultado.ok) {
        throw new Error(resultado.mensaje || "No se pudo procesar la solicitud.");
    }

    return resultado.data as T;
}

export async function obtenerSesionAdministracionSupabase() {
    const { perfil, error } = await obtenerPerfilActual();

    if (error || !perfil) throw new Error("No se encontró la sesión activa.");

    return {
        id: perfil.id,
        usuario: perfil.usuario || "",
        correo: perfil.correo || "",
        nombre: perfil.nombre || "",
        rol: perfil.rol || "",
        estado: perfil.estado || "Activo",
        clinica_id: perfil.clinica_id || null,
        auth_user_id: perfil.auth_user_id || null,
    } as SesionAdministracionSupabase;
}

export async function listarUsuariosAdministracionSupabase() {
    const supabase = crearClienteSupabase();
    const sesion = await obtenerSesionAdministracionSupabase();

    if (!sesion.clinica_id) return [];

    const { data, error } = await supabase
        .from("usuarios_perfiles")
        .select("id, auth_user_id, clinica_id, usuario, correo, nombre, rol, estado, creado_en, actualizado_en")
        .eq("clinica_id", sesion.clinica_id)
        .neq("rol", "SUPER_ADMIN")
        .order("creado_en", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((item) => convertirUsuario(item as Record<string, unknown>));
}

export async function crearUsuarioAdministracionSupabase(formulario: FormularioUsuarioAdministracionSupabase) {
    return llamarApiAdministracion<UsuarioAdministracionSupabase>({
        accion: "crear",
        usuario: normalizarUsuario(formulario.usuario),
        correo: limpiarTexto(formulario.correo).toLowerCase(),
        password: limpiarTexto(formulario.password),
        nombre: limpiarTexto(formulario.nombre),
        rol: formulario.rol,
        estado: formulario.estado,
    });
}

export async function actualizarUsuarioAdministracionSupabase(id: string, formulario: FormularioUsuarioAdministracionSupabase) {
    return llamarApiAdministracion<UsuarioAdministracionSupabase>({
        accion: "actualizar",
        id,
        usuario: normalizarUsuario(formulario.usuario),
        correo: limpiarTexto(formulario.correo).toLowerCase(),
        password: limpiarTexto(formulario.password),
        nombre: limpiarTexto(formulario.nombre),
        rol: formulario.rol,
        estado: formulario.estado,
    });
}

export async function cambiarEstadoUsuarioAdministracionSupabase(id: string, estado: EstadoUsuarioAdministracion) {
    return llamarApiAdministracion<UsuarioAdministracionSupabase>({
        accion: "cambiar_estado",
        id,
        estado,
    });
}

export async function generarPasswordTemporalUsuarioSupabase(id: string) {
    return llamarApiAdministracion<{ password: string }>({
        accion: "generar_password",
        id,
    });
}