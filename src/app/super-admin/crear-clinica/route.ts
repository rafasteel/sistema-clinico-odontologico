import { NextRequest, NextResponse } from "next/server";
import { crearClienteSupabaseAdmin } from "@/lib/supabase/serverAdmin";

type CrearClinicaPayload = {
    nombreClinica: string;
    telefono?: string;
    whatsapp?: string;
    correoClinica?: string;
    direccion?: string;
    ruc?: string;
    plan?: string;
    precioMensual?: number;
    monedaSuscripcion?: string;
    fechaVencimiento?: string;
    diasGracia?: number;
    adminNombre: string;
    adminUsuario?: string;
    adminCorreo: string;
    adminPassword: string;
};

function respuestaError(mensaje: string, estado = 400) {
    return NextResponse.json({ ok: false, mensaje }, { status: estado });
}

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown, valorInicial: number) {
    const convertido = Number(valor);

    if (Number.isNaN(convertido)) return valorInicial;

    return convertido;
}

function fechaVencimientoInicial(valor?: string) {
    if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return valor;
    }

    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);

    return fecha.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

        if (!token) {
            return respuestaError("No se recibió token de sesión.", 401);
        }

        const payload = (await request.json()) as CrearClinicaPayload;

        const nombreClinica = texto(payload.nombreClinica);
        const adminNombre = texto(payload.adminNombre);
        const adminCorreo = texto(payload.adminCorreo).toLowerCase();
        const adminPassword = texto(payload.adminPassword);

        if (!nombreClinica) {
            return respuestaError("El nombre de la clínica es obligatorio.");
        }

        if (!adminNombre) {
            return respuestaError("El nombre del administrador es obligatorio.");
        }

        if (!adminCorreo || !adminCorreo.includes("@")) {
            return respuestaError("El correo del administrador no es válido.");
        }

        if (!adminPassword || adminPassword.length < 8) {
            return respuestaError("La contraseña del administrador debe tener al menos 8 caracteres.");
        }

        const supabaseAdmin = crearClienteSupabaseAdmin();

        const {
            data: { user },
            error: errorUsuarioSesion,
        } = await supabaseAdmin.auth.getUser(token);

        if (errorUsuarioSesion || !user) {
            return respuestaError("Sesión inválida o vencida.", 401);
        }

        const { data: perfilSolicitante, error: errorPerfil } = await supabaseAdmin
            .from("usuarios_perfiles")
            .select("id, rol, estado")
            .eq("auth_user_id", user.id)
            .single();

        if (errorPerfil || !perfilSolicitante) {
            return respuestaError("No se encontró el perfil del usuario solicitante.", 403);
        }

        if (
            perfilSolicitante.rol !== "SUPER_ADMIN" ||
            perfilSolicitante.estado !== "Activo"
        ) {
            return respuestaError("No tenés permiso para crear clínicas.", 403);
        }

        const fechaVencimiento = fechaVencimientoInicial(payload.fechaVencimiento);
        const plan = texto(payload.plan) || "Profesional";
        const precioMensual = numero(payload.precioMensual, 100);
        const monedaSuscripcion = texto(payload.monedaSuscripcion) || "USD";
        const diasGracia = numero(payload.diasGracia, 7);

        const { data: clinica, error: errorClinica } = await supabaseAdmin
            .from("clinicas")
            .insert({
                nombre: nombreClinica,
                telefono: texto(payload.telefono),
                whatsapp: texto(payload.whatsapp),
                correo: texto(payload.correoClinica),
                direccion: texto(payload.direccion),
                ruc: texto(payload.ruc) || "No registrado",
                moneda: "Córdoba nicaragüense",
                simbolo_moneda: "C$",
                estado: "Activa",
                plan,
                fecha_vencimiento: fechaVencimiento,
                dias_gracia: diasGracia,
            })
            .select("*")
            .single();

        if (errorClinica || !clinica) {
            return respuestaError(
                errorClinica?.message || "No se pudo crear la clínica.",
                500
            );
        }

        const { data: suscripcion, error: errorSuscripcion } = await supabaseAdmin
            .from("suscripciones")
            .insert({
                clinica_id: clinica.id,
                plan,
                estado: "Activa",
                precio_mensual: precioMensual,
                moneda: monedaSuscripcion,
                fecha_vencimiento: fechaVencimiento,
                dias_gracia: diasGracia,
                notas: "Suscripción creada desde panel SUPER_ADMIN.",
            })
            .select("*")
            .single();

        if (errorSuscripcion || !suscripcion) {
            await supabaseAdmin.from("clinicas").delete().eq("id", clinica.id);

            return respuestaError(
                errorSuscripcion?.message || "No se pudo crear la suscripción.",
                500
            );
        }

        const { data: authCreado, error: errorAuth } =
            await supabaseAdmin.auth.admin.createUser({
                email: adminCorreo,
                password: adminPassword,
                email_confirm: true,
                user_metadata: {
                    nombre: adminNombre,
                    rol: "ADMIN",
                    clinica_id: clinica.id,
                },
            });

        if (errorAuth || !authCreado.user) {
            await supabaseAdmin.from("suscripciones").delete().eq("id", suscripcion.id);
            await supabaseAdmin.from("clinicas").delete().eq("id", clinica.id);

            return respuestaError(
                errorAuth?.message || "No se pudo crear el usuario Auth del administrador.",
                500
            );
        }

        const { data: perfilAdmin, error: errorPerfilAdmin } = await supabaseAdmin
            .from("usuarios_perfiles")
            .insert({
                auth_user_id: authCreado.user.id,
                clinica_id: clinica.id,
                nombre: adminNombre,
                usuario:
                    texto(payload.adminUsuario) ||
                    adminCorreo.split("@")[0].replaceAll(".", "_"),
                correo: adminCorreo,
                rol: "ADMIN",
                estado: "Activo",
            })
            .select("*")
            .single();

        if (errorPerfilAdmin || !perfilAdmin) {
            await supabaseAdmin.auth.admin.deleteUser(authCreado.user.id);
            await supabaseAdmin.from("suscripciones").delete().eq("id", suscripcion.id);
            await supabaseAdmin.from("clinicas").delete().eq("id", clinica.id);

            return respuestaError(
                errorPerfilAdmin?.message ||
                "No se pudo crear el perfil del administrador.",
                500
            );
        }

        await supabaseAdmin.from("auditoria").insert({
            clinica_id: clinica.id,
            usuario_id: perfilSolicitante.id,
            modulo: "SUPER_ADMIN",
            accion: "Clínica creada",
            detalle: `Se creó la clínica ${clinica.nombre} con usuario ADMIN ${adminCorreo}.`,
            registro_id: clinica.id,
            datos_nuevos: {
                clinica,
                suscripcion,
                perfilAdmin,
            },
            nivel: "Éxito",
        });

        return NextResponse.json({
            ok: true,
            mensaje: "Clínica, suscripción y usuario ADMIN creados correctamente.",
            clinica,
            suscripcion,
            perfilAdmin,
        });
    } catch (error) {
        const mensaje =
            error instanceof Error
                ? error.message
                : "Error interno al crear la clínica.";

        return respuestaError(mensaje, 500);
    }
}