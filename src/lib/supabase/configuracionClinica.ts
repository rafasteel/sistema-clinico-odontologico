import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import {
    CONFIGURACION_PREDETERMINADA,
    guardarConfiguracionClinica,
    type ConfiguracionClinica,
    type POSClinica,
} from "@/lib/configuracionClinica";

export type ConfiguracionClinicaSupabase = {
    id: string;
    clinica_id: string;

    nombre_clinica: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    direccion: string;
    ruc: string;
    moneda: string;
    simbolo_moneda: string;
    comision_pos: number;
    mensaje_recibo: string;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type POSClinicaSupabase = {
    id: string;
    clinica_id: string;

    codigo: string;
    nombre: string;
    banco: string;
    comision: number;
    activo: boolean;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

function texto(valor: unknown, valorInicial = "") {
    const convertido = String(valor ?? "").trim();

    return convertido || valorInicial;
}

function numero(valor: unknown, valorInicial = 0) {
    const convertido = Number(valor ?? valorInicial);

    if (Number.isNaN(convertido)) return valorInicial;

    return convertido;
}


function normalizarConfig(
    configuracion?: Partial<ConfiguracionClinica>,
    poses?: POSClinica[]
): ConfiguracionClinica {
    const config = {
        ...CONFIGURACION_PREDETERMINADA,
        ...(configuracion || {}),
    };

    const posesNormalizados =
        poses && poses.length > 0
            ? poses.map((pos, index) => ({
                id: texto(pos.id, `POS-${Date.now()}-${index}`),
                nombre: texto(pos.nombre, `POS ${index + 1}`),
                banco: texto(pos.banco, "Banco no especificado"),
                comision: numero(pos.comision, config.comisionPOS),
                activo: typeof pos.activo === "boolean" ? pos.activo : true,
            }))
            : config.poses && config.poses.length > 0
                ? config.poses
                : CONFIGURACION_PREDETERMINADA.poses;

    const primerPOSActivo =
        posesNormalizados.find((pos) => pos.activo) || posesNormalizados[0];

    return {
        nombreClinica: texto(
            config.nombreClinica,
            CONFIGURACION_PREDETERMINADA.nombreClinica
        ),
        telefono: texto(config.telefono, CONFIGURACION_PREDETERMINADA.telefono),
        whatsapp: texto(config.whatsapp, CONFIGURACION_PREDETERMINADA.whatsapp),
        correo: texto(config.correo, CONFIGURACION_PREDETERMINADA.correo),
        direccion: texto(config.direccion, CONFIGURACION_PREDETERMINADA.direccion),
        ruc: texto(config.ruc, CONFIGURACION_PREDETERMINADA.ruc),
        moneda: texto(config.moneda, CONFIGURACION_PREDETERMINADA.moneda),
        simboloMoneda: texto(
            config.simboloMoneda,
            CONFIGURACION_PREDETERMINADA.simboloMoneda
        ),
        comisionPOS: numero(
            primerPOSActivo?.comision,
            CONFIGURACION_PREDETERMINADA.comisionPOS
        ),
        poses: posesNormalizados,
        mensajeRecibo: texto(
            config.mensajeRecibo,
            CONFIGURACION_PREDETERMINADA.mensajeRecibo
        ),
    };
}

function convertirDesdeSupabase(
    configuracion: ConfiguracionClinicaSupabase | null,
    poses: POSClinicaSupabase[]
): ConfiguracionClinica {
    const posesConvertidos: POSClinica[] = poses.map((pos) => ({
        id: pos.codigo || pos.id,
        nombre: pos.nombre || "POS",
        banco: pos.banco || "Banco no especificado",
        comision: Number(pos.comision || 0),
        activo: Boolean(pos.activo),
    }));

    return normalizarConfig(
        {
            nombreClinica:
                configuracion?.nombre_clinica ||
                CONFIGURACION_PREDETERMINADA.nombreClinica,
            telefono:
                configuracion?.telefono || CONFIGURACION_PREDETERMINADA.telefono,
            whatsapp:
                configuracion?.whatsapp || CONFIGURACION_PREDETERMINADA.whatsapp,
            correo: configuracion?.correo || CONFIGURACION_PREDETERMINADA.correo,
            direccion:
                configuracion?.direccion || CONFIGURACION_PREDETERMINADA.direccion,
            ruc: configuracion?.ruc || CONFIGURACION_PREDETERMINADA.ruc,
            moneda: configuracion?.moneda || CONFIGURACION_PREDETERMINADA.moneda,
            simboloMoneda:
                configuracion?.simbolo_moneda ||
                CONFIGURACION_PREDETERMINADA.simboloMoneda,
            comisionPOS: Number(
                configuracion?.comision_pos ??
                CONFIGURACION_PREDETERMINADA.comisionPOS
            ),
            mensajeRecibo:
                configuracion?.mensaje_recibo ||
                CONFIGURACION_PREDETERMINADA.mensajeRecibo,
        },
        posesConvertidos
    );
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();

    if (error || !perfil) {
        throw new Error("No se encontró el perfil activo del usuario.");
    }

    if (!perfil.clinica_id) {
        throw new Error("Este usuario no tiene clínica asignada.");
    }

    return {
        perfil,
        clinicaId: perfil.clinica_id,
    };
}

export async function obtenerConfiguracionClinicaSupabase() {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const { data: configuracionData, error: errorConfig } = await supabase
        .from("configuraciones_clinicas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .maybeSingle();

    if (errorConfig) throw new Error(errorConfig.message);

    let configuracion = configuracionData as ConfiguracionClinicaSupabase | null;

    if (!configuracion) {
        const configInicial = CONFIGURACION_PREDETERMINADA;

        const { data: nuevaConfig, error: errorInsert } = await supabase
            .from("configuraciones_clinicas")
            .insert({
                clinica_id: clinicaId,
                nombre_clinica: configInicial.nombreClinica,
                telefono: configInicial.telefono,
                whatsapp: configInicial.whatsapp,
                correo: configInicial.correo,
                direccion: configInicial.direccion,
                ruc: configInicial.ruc,
                moneda: configInicial.moneda,
                simbolo_moneda: configInicial.simboloMoneda,
                comision_pos: configInicial.comisionPOS,
                mensaje_recibo: configInicial.mensajeRecibo,
                creado_por: perfil.id,
            })
            .select("*")
            .single();

        if (errorInsert) throw new Error(errorInsert.message);

        configuracion = nuevaConfig as ConfiguracionClinicaSupabase;
    }

    const { data: posesData, error: errorPOS } = await supabase
        .from("pos_clinica")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("nombre", { ascending: true });

    if (errorPOS) throw new Error(errorPOS.message);

    let poses = (posesData || []) as POSClinicaSupabase[];

    if (poses.length === 0) {
        const posPredeterminado = CONFIGURACION_PREDETERMINADA.poses[0];

        const { data: nuevoPOS, error: errorInsertPOS } = await supabase
            .from("pos_clinica")
            .insert({
                clinica_id: clinicaId,
                codigo: posPredeterminado.id,
                nombre: posPredeterminado.nombre,
                banco: posPredeterminado.banco,
                comision: posPredeterminado.comision,
                activo: posPredeterminado.activo,
                creado_por: perfil.id,
            })
            .select("*");

        if (errorInsertPOS) throw new Error(errorInsertPOS.message);

        poses = (nuevoPOS || []) as POSClinicaSupabase[];
    }

    const configuracionFinal = convertirDesdeSupabase(configuracion, poses);
    guardarConfiguracionClinica(configuracionFinal);

    return configuracionFinal;
}

export async function guardarConfiguracionClinicaSupabase(
    configuracion: ConfiguracionClinica
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const configuracionNormalizada = normalizarConfig(configuracion);

    const { error: errorConfig } = await supabase
        .from("configuraciones_clinicas")
        .upsert(
            {
                clinica_id: clinicaId,
                nombre_clinica: configuracionNormalizada.nombreClinica,
                telefono: configuracionNormalizada.telefono,
                whatsapp: configuracionNormalizada.whatsapp,
                correo: configuracionNormalizada.correo,
                direccion: configuracionNormalizada.direccion,
                ruc: configuracionNormalizada.ruc,
                moneda: configuracionNormalizada.moneda,
                simbolo_moneda: configuracionNormalizada.simboloMoneda,
                comision_pos: configuracionNormalizada.comisionPOS,
                mensaje_recibo: configuracionNormalizada.mensajeRecibo,
                creado_por: perfil.id,
            },
            { onConflict: "clinica_id" }
        );

    if (errorConfig) throw new Error(errorConfig.message);

    const { error: errorDeletePOS } = await supabase
        .from("pos_clinica")
        .delete()
        .eq("clinica_id", clinicaId);

    if (errorDeletePOS) throw new Error(errorDeletePOS.message);

    const posesAInsertar = configuracionNormalizada.poses.map((pos, index) => ({
        clinica_id: clinicaId,
        codigo: texto(pos.id, `POS-${Date.now()}-${index}`),
        nombre: texto(pos.nombre, `POS ${index + 1}`),
        banco: texto(pos.banco, "Banco no especificado"),
        comision: numero(pos.comision, configuracionNormalizada.comisionPOS),
        activo: Boolean(pos.activo),
        creado_por: perfil.id,
    }));

    if (posesAInsertar.length > 0) {
        const { error: errorInsertPOS } = await supabase
            .from("pos_clinica")
            .insert(posesAInsertar);

        if (errorInsertPOS) throw new Error(errorInsertPOS.message);
    }

    const configuracionFinal = await obtenerConfiguracionClinicaSupabase();
    guardarConfiguracionClinica(configuracionFinal);

    return configuracionFinal;
}

export async function obtenerPOSActivosSupabase() {
    const configuracion = await obtenerConfiguracionClinicaSupabase();

    return configuracion.poses.filter((pos) => pos.activo);
}

export async function obtenerPOSPorIdSupabase(posId: string) {
    const configuracion = await obtenerConfiguracionClinicaSupabase();

    return configuracion.poses.find((pos) => pos.id === posId) || null;
}