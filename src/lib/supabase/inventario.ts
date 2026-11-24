import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import { ejecutarOperacionClinica } from "@/lib/supabase/operaciones";

export type EstadoProductoInventarioSupabase = "Activo" | "Inactivo";

export type TipoMovimientoInventarioSupabase =
    | "Entrada"
    | "Salida"
    | "Uso clínico"
    | "Pérdida"
    | "Ajuste";

export type ProductoInventarioSupabase = {
    id: string;
    clinica_id: string;

    codigo: string;
    nombre: string;
    categoria: string;
    unidad: string;

    stock: number;
    stock_minimo: number;
    costo_compra: number;
    precio_venta: number;

    proveedor: string;
    vencimiento: string | null;
    estado: EstadoProductoInventarioSupabase;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type MovimientoInventarioSupabase = {
    id: string;
    clinica_id: string;
    producto_id: string;

    fecha: string;
    hora: string;

    producto_nombre: string;
    tipo: TipoMovimientoInventarioSupabase;

    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
    costo_unitario: number;

    motivo: string;
    usuario_nombre: string;
    referencia: string;

    creado_por: string | null;
    creado_en: string;
};

export type FormularioProductoInventarioSupabase = {
    codigo?: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stock: number | string;
    stock_minimo: number | string;
    costo_compra: number | string;
    precio_venta: number | string;
    proveedor?: string;
    vencimiento?: string;
    actualizado_en_esperado?: string;
};

export type FormularioMovimientoInventarioSupabase = {
    producto_id: string;
    tipo: TipoMovimientoInventarioSupabase;
    cantidad: number | string;
    costo_unitario?: number | string;
    motivo?: string;
    referencia?: string;
    usuario_nombre?: string;
};

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

export async function listarProductosInventarioSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("productos_inventario")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []) as ProductoInventarioSupabase[];
}

export async function listarProductosActivosVentaSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("productos_inventario")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("estado", "Activo")
        .gt("precio_venta", 0)
        .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []) as ProductoInventarioSupabase[];
}

export async function listarMovimientosInventarioSupabase(limite = 100) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("movimientos_inventario")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })
        .limit(limite);

    if (error) throw new Error(error.message);

    return (data || []) as MovimientoInventarioSupabase[];
}

export async function crearProductoInventarioSupabase(formulario: FormularioProductoInventarioSupabase) {
    return ejecutarOperacionClinica<ProductoInventarioSupabase>("producto.crear", formulario);
}

export async function actualizarProductoInventarioSupabase(id: string, formulario: FormularioProductoInventarioSupabase) {
    return ejecutarOperacionClinica<ProductoInventarioSupabase>("producto.actualizar", { ...formulario, id });
}

export async function cambiarEstadoProductoInventarioSupabase(id: string, estado?: EstadoProductoInventarioSupabase) {
    return ejecutarOperacionClinica<ProductoInventarioSupabase>("producto.estado", { id, estado });
}

export async function registrarMovimientoInventarioSupabase(formulario: FormularioMovimientoInventarioSupabase) {
    return ejecutarOperacionClinica<MovimientoInventarioSupabase>("inventario.movimiento", formulario);
}

export async function descontarStockProductoVentaSupabase(
    productoId: string,
    cantidad: number | string,
    motivo?: string,
    referencia?: string
) {
    return registrarMovimientoInventarioSupabase({
        producto_id: productoId,
        tipo: "Salida",
        cantidad,
        motivo: motivo || "Salida por venta en caja",
        referencia,
    });
}


export async function revertirSalidaInventarioPorReferenciaSupabase(referencia: string) {
    return ejecutarOperacionClinica<MovimientoInventarioSupabase[]>("inventario.revertir", { referencia });
}
