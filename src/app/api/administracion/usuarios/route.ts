import { NextRequest, NextResponse } from "next/server";
import { crearClienteSupabaseAdmin, crearClienteSupabaseSesion } from "@/lib/supabase/serverAdmin";
import { randomBytes } from "node:crypto";

class ErrorAcceso extends Error {
    constructor(mensaje: string, public status: number) { super(mensaje); }
}

type RolUsuarioAdministracion = "ADMIN" | "DOCTOR" | "RECEPCION" | "CAJA";
type EstadoUsuarioAdministracion = "Activo" | "Inactivo";

type PerfilUsuario = {
    id: string;
    auth_user_id: string | null;
    clinica_id: string | null;
    usuario: string;
    correo: string;
    nombre: string;
    rol: string;
    estado: string;
};

function respuestaError(mensaje: string, status = 400) {
    return NextResponse.json({ ok: false, mensaje }, { status });
}

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

function validarEmail(correo: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function validarRol(rol: string): rol is RolUsuarioAdministracion {
    return rol === "ADMIN" || rol === "DOCTOR" || rol === "RECEPCION" || rol === "CAJA";
}

function validarEstado(estado: string): estado is EstadoUsuarioAdministracion {
    return estado === "Activo" || estado === "Inactivo";
}

function generarPasswordTemporal() {
    return randomBytes(18).toString("base64url");
}

async function obtenerPerfilAdmin(request: NextRequest) {
    const supabase = crearClienteSupabaseAdmin();
    const authorization = request.headers.get("authorization") || "";
    const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];

    if (!token) throw new ErrorAcceso("No se recibió token de sesión.", 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) throw new ErrorAcceso("Sesión inválida o vencida.", 401);

    const { data: perfil, error: perfilError } = await supabase
        .from("usuarios_perfiles")
        .select("*")
        .eq("auth_user_id", userData.user.id)
        .maybeSingle();

    if (perfilError || !perfil) throw new ErrorAcceso("No se encontró el perfil del usuario actual.", 403);
    if (perfil.rol !== "ADMIN" || perfil.estado !== "Activo") {
        throw new ErrorAcceso("Solo un usuario ADMIN activo puede administrar usuarios.", 403);
    }
    if (!perfil.clinica_id) throw new ErrorAcceso("El usuario ADMIN no tiene clínica asignada.", 403);

    const { data: acceso, error: errorAcceso } = await crearClienteSupabaseSesion(token)
        .rpc("verificar_acceso_clinica");
    if (errorAcceso) throw new ErrorAcceso("No se pudo verificar el acceso de la clínica.", 503);
    if (!acceso?.permitido) throw new ErrorAcceso(acceso?.mensaje || "Acceso de la clínica suspendido.", 403);

    return {
        supabase,
        perfil: perfil as PerfilUsuario,
        clinicaId: String(perfil.clinica_id),
    };
}

async function verificarDuplicados({
    clinicaId,
    usuario,
    correo,
    excluirId,
}: {
    clinicaId: string;
    usuario: string;
    correo: string;
    excluirId?: string;
}) {
    const supabase = crearClienteSupabaseAdmin();

    let consultaUsuario = supabase
        .from("usuarios_perfiles")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("usuario", usuario)
        .limit(1);

    if (excluirId) consultaUsuario = consultaUsuario.neq("id", excluirId);

    const { data: usuarioDuplicado, error: errorUsuario } = await consultaUsuario;
    if (errorUsuario) throw new Error(errorUsuario.message);
    if ((usuarioDuplicado || []).length > 0) {
        throw new Error("Ya existe un usuario con ese nombre de acceso.");
    }

    let consultaCorreo = supabase
        .from("usuarios_perfiles")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("correo", correo)
        .limit(1);

    if (excluirId) consultaCorreo = consultaCorreo.neq("id", excluirId);

    const { data: correoDuplicado, error: errorCorreo } = await consultaCorreo;
    if (errorCorreo) throw new Error(errorCorreo.message);
    if ((correoDuplicado || []).length > 0) {
        throw new Error("Ya existe un usuario con ese correo.");
    }
}

async function obtenerPerfilObjetivo(clinicaId: string, id: string) {
    const supabase = crearClienteSupabaseAdmin();

    const { data, error } = await supabase
        .from("usuarios_perfiles")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("id", id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("No se encontró el usuario seleccionado.");
    if (data.rol === "SUPER_ADMIN") throw new Error("No se puede modificar un SUPER_ADMIN desde este módulo.");

    return data as PerfilUsuario;
}

async function registrarAuditoria({
    clinicaId,
    perfilAdmin,
    accion,
    detalle,
    nivel = "Info",
    referencia = "",
}: {
    clinicaId: string;
    perfilAdmin: PerfilUsuario;
    accion: string;
    detalle: string;
    nivel?: "Info" | "Éxito" | "Advertencia" | "Crítico";
    referencia?: string;
}) {
    const supabase = crearClienteSupabaseAdmin();

    const { error } = await supabase.from("auditoria").insert({
        clinica_id: clinicaId,
        usuario_perfil_id: perfilAdmin.id,
        usuario_nombre: perfilAdmin.nombre || "Administrador",
        rol_usuario: perfilAdmin.rol || "ADMIN",
        modulo: "Administración",
        accion,
        detalle,
        nivel,
        referencia,
        referencia_id: referencia,
        monto: 0,
        metadata: {},
    });
    if (error) throw new Error(`No se pudo registrar la auditoría: ${error.message}`);
}

function obtenerDatosUsuario(body: Record<string, unknown>, requierePassword: boolean) {
    const usuario = normalizarUsuario(String(body.usuario || ""));
    const correo = limpiarTexto(body.correo).toLowerCase();
    const password = limpiarTexto(body.password);
    const nombre = limpiarTexto(body.nombre);
    const rol = limpiarTexto(body.rol, "RECEPCION");
    const estado = limpiarTexto(body.estado, "Activo");

    if (!usuario) throw new Error("El usuario es obligatorio.");
    if (!validarEmail(correo)) throw new Error("Ingresá un correo válido.");
    if (requierePassword && (!password || password.length < 6)) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }
    if (password && password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }
    if (!nombre) throw new Error("El nombre completo es obligatorio.");
    if (!validarRol(rol)) throw new Error("Rol inválido.");
    if (!validarEstado(estado)) throw new Error("Estado inválido.");

    return { usuario, correo, password, nombre, rol, estado };
}

export async function POST(request: NextRequest) {
    try {
        const { supabase, perfil, clinicaId } = await obtenerPerfilAdmin(request);
        const body = (await request.json()) as Record<string, unknown>;
        const accion = limpiarTexto(body.accion);

        if (accion === "crear") {
            const datos = obtenerDatosUsuario(body, true);

            await verificarDuplicados({
                clinicaId,
                usuario: datos.usuario,
                correo: datos.correo,
            });

            const { data: authData, error: authError } =
                await supabase.auth.admin.createUser({
                    email: datos.correo,
                    password: datos.password,
                    email_confirm: true,
                    user_metadata: {
                        nombre: datos.nombre,
                        usuario: datos.usuario,
                    },
                });

            if (authError || !authData.user) {
                throw new Error(authError?.message || "No se pudo crear el usuario Auth.");
            }

            const { data: perfilCreado, error: perfilError } = await supabase
                .from("usuarios_perfiles")
                .insert({
                    auth_user_id: authData.user.id,
                    clinica_id: clinicaId,
                    nombre: datos.nombre,
                    usuario: datos.usuario,
                    correo: datos.correo,
                    rol: datos.rol,
                    estado: datos.estado,
                })
                .select("id, auth_user_id, clinica_id, usuario, correo, nombre, rol, estado, creado_en, actualizado_en")
                .single();

            if (perfilError) {
                await supabase.auth.admin.deleteUser(authData.user.id);
                throw new Error(perfilError.message);
            }

            await registrarAuditoria({
                clinicaId,
                perfilAdmin: perfil,
                accion: "Usuario creado",
                detalle: `${datos.nombre} · ${datos.correo} · Rol ${datos.rol}`,
                nivel: "Éxito",
                referencia: String(perfilCreado.id),
            });

            return NextResponse.json({ ok: true, data: perfilCreado });
        }

        if (accion === "actualizar") {
            const id = limpiarTexto(body.id);
            if (!id) throw new Error("No se recibió el usuario a actualizar.");

            const perfilObjetivo = await obtenerPerfilObjetivo(clinicaId, id);
            const datos = obtenerDatosUsuario(body, false);

            if (perfilObjetivo.id === perfil.id && (datos.estado !== "Activo" || datos.rol !== "ADMIN")) {
                throw new Error("No podés desactivar ni cambiar el rol de tu propio usuario.");
            }

            await verificarDuplicados({
                clinicaId,
                usuario: datos.usuario,
                correo: datos.correo,
                excluirId: id,
            });

            if (perfilObjetivo.auth_user_id) {
                const updatePayload: {
                    email: string;
                    user_metadata: Record<string, unknown>;
                    password?: string;
                } = {
                    email: datos.correo,
                    user_metadata: {
                        nombre: datos.nombre,
                        usuario: datos.usuario,
                    },
                };

                if (datos.password) updatePayload.password = datos.password;

                const { error: authError } =
                    await supabase.auth.admin.updateUserById(
                        perfilObjetivo.auth_user_id,
                        updatePayload
                    );

                if (authError) throw new Error(authError.message);
            }

            const { data: perfilActualizado, error: updateError } = await supabase
                .from("usuarios_perfiles")
                .update({
                    usuario: datos.usuario,
                    correo: datos.correo,
                    nombre: datos.nombre,
                    rol: datos.rol,
                    estado: datos.estado,
                })
                .eq("clinica_id", clinicaId)
                .eq("id", id)
                .select("id, auth_user_id, clinica_id, usuario, correo, nombre, rol, estado, creado_en, actualizado_en")
                .single();

            if (updateError) throw new Error(updateError.message);

            await registrarAuditoria({
                clinicaId,
                perfilAdmin: perfil,
                accion: "Usuario actualizado",
                detalle: `${datos.nombre} · ${datos.correo} · Rol ${datos.rol} · Estado ${datos.estado}`,
                nivel: "Info",
                referencia: id,
            });

            return NextResponse.json({ ok: true, data: perfilActualizado });
        }

        if (accion === "cambiar_estado") {
            const id = limpiarTexto(body.id);
            const estado = limpiarTexto(body.estado);

            if (!id) throw new Error("No se recibió el usuario.");
            if (!validarEstado(estado)) throw new Error("Estado inválido.");

            const perfilObjetivo = await obtenerPerfilObjetivo(clinicaId, id);

            if (
                perfilObjetivo.auth_user_id &&
                perfilObjetivo.auth_user_id === perfil.auth_user_id &&
                estado === "Inactivo"
            ) {
                throw new Error("No podés desactivar tu propio usuario mientras estás conectado.");
            }

            const { data: perfilActualizado, error: updateError } = await supabase
                .from("usuarios_perfiles")
                .update({ estado })
                .eq("clinica_id", clinicaId)
                .eq("id", id)
                .select("id, auth_user_id, clinica_id, usuario, correo, nombre, rol, estado, creado_en, actualizado_en")
                .single();

            if (updateError) throw new Error(updateError.message);

            await registrarAuditoria({
                clinicaId,
                perfilAdmin: perfil,
                accion: estado === "Activo" ? "Usuario activado" : "Usuario desactivado",
                detalle: `${perfilObjetivo.nombre} · ${perfilObjetivo.correo}`,
                nivel: estado === "Activo" ? "Éxito" : "Advertencia",
                referencia: id,
            });

            return NextResponse.json({ ok: true, data: perfilActualizado });
        }

        if (accion === "generar_password") {
            const id = limpiarTexto(body.id);
            if (!id) throw new Error("No se recibió el usuario.");

            const perfilObjetivo = await obtenerPerfilObjetivo(clinicaId, id);

            if (!perfilObjetivo.auth_user_id) {
                throw new Error("Este perfil no tiene usuario Auth asociado.");
            }

            const password = generarPasswordTemporal();

            const { error: authError } = await supabase.auth.admin.updateUserById(
                perfilObjetivo.auth_user_id,
                {
                    password,
                    user_metadata: {
                        nombre: perfilObjetivo.nombre,
                        usuario: perfilObjetivo.usuario,
                    },
                }
            );

            if (authError) throw new Error(authError.message);

            await registrarAuditoria({
                clinicaId,
                perfilAdmin: perfil,
                accion: "Contraseña temporal generada",
                detalle: `${perfilObjetivo.nombre} · ${perfilObjetivo.correo}`,
                nivel: "Advertencia",
                referencia: id,
            });

            return NextResponse.json({ ok: true, data: { password } });
        }

        return respuestaError("Acción no reconocida.", 400);
    } catch (errorActual) {
        const mensaje =
            errorActual instanceof Error
                ? errorActual.message
                : "No se pudo procesar la administración de usuarios.";

        return respuestaError(mensaje, errorActual instanceof ErrorAcceso ? errorActual.status : 400);
    }
}
