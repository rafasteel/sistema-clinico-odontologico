import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type TablaRespaldoSupabase = {
    tabla: string;
    nombre: string;
    modulo: string;
    descripcion: string;
};

export type ItemRespaldoSupabase = TablaRespaldoSupabase & {
    datos: unknown[];
    registros: number;
    error?: string;
};

export type RespaldoSistemaSupabase = {
    tipo: "SISTEMA_CLINICO_RESPALDO_SUPABASE";
    version: string;
    generadoEn: string;
    generadoPor: string;
    generadoPorId: string;
    clinicaId: string;
    clinica: string;
    totalModulos: number;
    totalRegistros: number;
    items: ItemRespaldoSupabase[];
};

export type HistorialRespaldoSupabase = {
    id: string;
    clinica_id: string;
    generado_por: string | null;
    usuario_nombre: string;
    tipo: string;
    version: string;
    nombre_archivo: string;
    total_modulos: number;
    total_registros: number;
    tamano_bytes: number;
    observaciones: string;
    creado_en: string;
};

export type ResumenRespaldoSupabase = {
    respaldo: RespaldoSistemaSupabase;
    historial: HistorialRespaldoSupabase[];
    errores: string[];
};

export const tablasRespaldoSupabase: TablaRespaldoSupabase[] = [
    {
        tabla: "clinicas",
        nombre: "Clínica",
        modulo: "Sistema",
        descripcion: "Datos principales de la clínica.",
    },
    {
        tabla: "configuraciones_clinicas",
        nombre: "Configuración de clínica",
        modulo: "Configuración",
        descripcion: "Datos generales, moneda, mensajes y parámetros.",
    },
    {
        tabla: "pos_clinica",
        nombre: "POS de clínica",
        modulo: "Configuración",
        descripcion: "Terminales POS y comisiones.",
    },
    {
        tabla: "usuarios_perfiles",
        nombre: "Usuarios y perfiles",
        modulo: "Administración",
        descripcion: "Usuarios, roles, estado y relación con Supabase Auth.",
    },
    {
        tabla: "pacientes",
        nombre: "Pacientes",
        modulo: "Pacientes",
        descripcion: "Directorio clínico, alertas médicas y datos generales.",
    },
    {
        tabla: "doctores",
        nombre: "Doctores",
        modulo: "Doctores y Servicios",
        descripcion: "Profesionales disponibles para agenda.",
    },
    {
        tabla: "servicios",
        nombre: "Servicios",
        modulo: "Doctores y Servicios",
        descripcion: "Catálogo de tratamientos, duración y precios.",
    },
    {
        tabla: "citas",
        nombre: "Agenda médica",
        modulo: "Agenda",
        descripcion: "Citas, estados, doctores, pacientes y servicios.",
    },
    {
        tabla: "notas_clinicas",
        nombre: "Notas clínicas",
        modulo: "Perfil del paciente",
        descripcion: "Notas, diagnósticos y procedimientos clínicos.",
    },
    {
        tabla: "tratamientos",
        nombre: "Tratamientos",
        modulo: "Perfil del paciente",
        descripcion: "Planes de tratamiento y estados.",
    },
    {
        tabla: "recetas",
        nombre: "Recetas",
        modulo: "Perfil del paciente",
        descripcion: "Medicamentos e indicaciones.",
    },
    {
        tabla: "odontogramas",
        nombre: "Odontogramas",
        modulo: "Odontograma",
        descripcion: "Encabezado de odontograma por paciente.",
    },
    {
        tabla: "odontograma_piezas",
        nombre: "Piezas del odontograma",
        modulo: "Odontograma",
        descripcion: "Estado dental por pieza y cara.",
    },
    {
        tabla: "odontograma_historial",
        nombre: "Historial de odontograma",
        modulo: "Odontograma",
        descripcion: "Cambios registrados del odontograma.",
    },
    {
        tabla: "presupuestos",
        nombre: "Presupuestos",
        modulo: "Presupuestos",
        descripcion: "Cotizaciones y estados por paciente.",
    },
    {
        tabla: "presupuesto_items",
        nombre: "Items de presupuestos",
        modulo: "Presupuestos",
        descripcion: "Tratamientos incluidos en presupuestos.",
    },
    {
        tabla: "ventas",
        nombre: "Ventas",
        modulo: "Caja",
        descripcion: "Cobros, recibos, créditos, productos y abonos.",
    },
    {
        tabla: "cuentas_cobrar",
        nombre: "Cuentas por cobrar",
        modulo: "Caja",
        descripcion: "Créditos pendientes de pacientes o clientes.",
    },
    {
        tabla: "abonos_cuentas_cobrar",
        nombre: "Abonos por cobrar",
        modulo: "Caja",
        descripcion: "Pagos realizados a cuentas por cobrar.",
    },
    {
        tabla: "gastos",
        nombre: "Gastos",
        modulo: "Control de Gastos",
        descripcion: "Gastos activos, anulados y pagos a proveedores.",
    },
    {
        tabla: "cierres_caja",
        nombre: "Cierres de caja",
        modulo: "Cierre de Caja",
        descripcion: "Cuadres diarios de caja.",
    },
    {
        tabla: "productos_inventario",
        nombre: "Inventario",
        modulo: "Inventario",
        descripcion: "Productos, stock, costos, precios y vencimientos.",
    },
    {
        tabla: "movimientos_inventario",
        nombre: "Movimientos de inventario",
        modulo: "Inventario",
        descripcion: "Entradas, salidas, ajustes, pérdidas y uso clínico.",
    },
    {
        tabla: "proveedores",
        nombre: "Proveedores",
        modulo: "Proveedores",
        descripcion: "Directorio comercial de proveedores.",
    },
    {
        tabla: "compras_proveedores",
        nombre: "Compras a proveedores",
        modulo: "Proveedores",
        descripcion: "Compras, pagos, créditos y relación con inventario.",
    },
    {
        tabla: "cuentas_pagar",
        nombre: "Cuentas por pagar",
        modulo: "Proveedores",
        descripcion: "Deudas pendientes con proveedores.",
    },
    {
        tabla: "abonos_cuentas_pagar",
        nombre: "Abonos por pagar",
        modulo: "Proveedores",
        descripcion: "Pagos realizados a proveedores.",
    },
    {
        tabla: "documentos_pacientes",
        nombre: "Documentos de pacientes",
        modulo: "Documentos",
        descripcion: "Metadatos de archivos guardados en Supabase Storage.",
    },
    {
        tabla: "ordenes_estudio",
        nombre: "Órdenes de estudio",
        modulo: "Órdenes de estudio",
        descripcion: "Órdenes emitidas para estudios odontológicos.",
    },
    {
        tabla: "auditoria",
        nombre: "Auditoría",
        modulo: "Auditoría",
        descripcion: "Eventos reales de auditoría.",
    },
    {
        tabla: "respaldos_historial",
        nombre: "Historial de respaldos",
        modulo: "Respaldo",
        descripcion: "Historial de respaldos generados.",
    },
];

function texto(valor: unknown, respaldo = "") {
    const convertido = String(valor ?? "").trim();

    return convertido || respaldo;
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();

    if (error || !perfil) {
        throw new Error("No se encontró el perfil activo del usuario.");
    }

    if (!perfil.clinica_id && perfil.rol !== "SUPER_ADMIN") {
        throw new Error("Este usuario no tiene clínica asignada.");
    }

    return {
        perfil,
        clinicaId: perfil.clinica_id || null,
        esSuperAdmin: perfil.rol === "SUPER_ADMIN",
    };
}

async function consultarTabla(tabla: TablaRespaldoSupabase, clinicaId: string | null) {
    const supabase = crearClienteSupabase();

    try {
        let consulta = supabase.from(tabla.tabla).select("*");

        if (clinicaId) {
            consulta = consulta.eq("clinica_id", clinicaId);
        }

        const { data, error } = await consulta.limit(20000);

        if (error) {
            return {
                ...tabla,
                datos: [] as unknown[],
                registros: 0,
                error: error.message,
            };
        }

        return {
            ...tabla,
            datos: data || [],
            registros: (data || []).length,
        };
    } catch (errorActual) {
        return {
            ...tabla,
            datos: [] as unknown[],
            registros: 0,
            error:
                errorActual instanceof Error
                    ? errorActual.message
                    : "Error desconocido al consultar la tabla.",
        };
    }
}

export function tamanoBytesObjeto(objeto: unknown) {
    return new Blob([JSON.stringify(objeto)]).size;
}

export function nombreArchivoRespaldoSupabase() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    const hour = String(fecha.getHours()).padStart(2, "0");
    const minute = String(fecha.getMinutes()).padStart(2, "0");

    return `respaldo-supabase-sistema-clinico-${year}-${month}-${day}-${hour}${minute}.json`;
}

export async function crearRespaldoSupabase(
    clinicaNombre = "Clínica no especificada"
): Promise<ResumenRespaldoSupabase> {
    const { perfil, clinicaId, esSuperAdmin } = await obtenerContextoClinica();

    const tablas = esSuperAdmin
        ? tablasRespaldoSupabase
        : tablasRespaldoSupabase.filter((tabla) => tabla.tabla !== "clinicas");

    const items = await Promise.all(
        tablas.map((tabla) => consultarTabla(tabla, clinicaId))
    );

    const respaldo: RespaldoSistemaSupabase = {
        tipo: "SISTEMA_CLINICO_RESPALDO_SUPABASE",
        version: "2.0-supabase",
        generadoEn: new Date().toISOString(),
        generadoPor: texto(perfil.nombre, "Usuario no identificado"),
        generadoPorId: perfil.id,
        clinicaId: clinicaId || "",
        clinica: clinicaNombre,
        totalModulos: items.filter((item) => item.registros > 0).length,
        totalRegistros: items.reduce((total, item) => total + item.registros, 0),
        items,
    };

    const historial = await listarHistorialRespaldosSupabase();

    return {
        respaldo,
        historial,
        errores: items
            .map((item) =>
                "error" in item && item.error
                    ? `${item.nombre}: ${item.error}`
                    : ""
            )
            .filter(Boolean),
    };
}

export async function listarHistorialRespaldosSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId, esSuperAdmin } = await obtenerContextoClinica();

    let consulta = supabase
        .from("respaldos_historial")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(25);

    if (clinicaId && !esSuperAdmin) {
        consulta = consulta.eq("clinica_id", clinicaId);
    }

    const { data, error } = await consulta;

    if (error) {
        return [] as HistorialRespaldoSupabase[];
    }

    return (data || []) as HistorialRespaldoSupabase[];
}

export async function registrarHistorialRespaldoSupabase({
    nombreArchivo,
    totalModulos,
    totalRegistros,
    tamanoBytes,
    observaciones,
}: {
    nombreArchivo: string;
    totalModulos: number;
    totalRegistros: number;
    tamanoBytes: number;
    observaciones?: string;
}) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    if (!clinicaId) return null;

    const { data, error } = await supabase
        .from("respaldos_historial")
        .insert({
            clinica_id: clinicaId,
            generado_por: perfil.id,
            usuario_nombre: texto(perfil.nombre, "Usuario no identificado"),
            tipo: "JSON",
            version: "2.0-supabase",
            nombre_archivo: nombreArchivo,
            total_modulos: totalModulos,
            total_registros: totalRegistros,
            tamano_bytes: tamanoBytes,
            observaciones: observaciones || "Respaldo JSON generado desde Supabase.",
        })
        .select("*")
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as HistorialRespaldoSupabase;
}

export function validarArchivoRespaldoSupabase(datos: unknown) {
    const respaldo = datos as Partial<RespaldoSistemaSupabase> | null;

    if (!respaldo || typeof respaldo !== "object") {
        return {
            valido: false,
            mensaje: "El archivo no contiene un objeto JSON válido.",
        };
    }

    if (respaldo.tipo !== "SISTEMA_CLINICO_RESPALDO_SUPABASE") {
        return {
            valido: false,
            mensaje: "El archivo no corresponde a un respaldo Supabase del Sistema Clínico.",
        };
    }

    if (!Array.isArray(respaldo.items)) {
        return {
            valido: false,
            mensaje: "El respaldo no contiene la lista de módulos respaldados.",
        };
    }

    return {
        valido: true,
        mensaje: "Respaldo válido.",
        respaldo: respaldo as RespaldoSistemaSupabase,
    };
}