import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

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

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function horaActualLocal() {
    const fecha = new Date();
    const hours = String(fecha.getHours()).padStart(2, "0");
    const minutes = String(fecha.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
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

function validarProducto(formulario: FormularioProductoInventarioSupabase) {
    const nombre = texto(formulario.nombre);
    const categoria = texto(formulario.categoria);
    const unidad = texto(formulario.unidad);
    const stock = numero(formulario.stock);
    const stockMinimo = numero(formulario.stock_minimo);
    const costoCompra = numero(formulario.costo_compra);
    const precioVenta = numero(formulario.precio_venta);

    if (!nombre) throw new Error("El nombre del producto es obligatorio.");
    if (!categoria) throw new Error("La categoría del producto es obligatoria.");
    if (!unidad) throw new Error("La unidad del producto es obligatoria.");
    if (stock < 0) throw new Error("El stock no puede ser negativo.");
    if (stockMinimo < 0) throw new Error("El stock mínimo no puede ser negativo.");
    if (costoCompra < 0) throw new Error("El costo de compra no puede ser negativo.");
    if (precioVenta < 0) throw new Error("El precio de venta no puede ser negativo.");

    return {
        codigo: texto(formulario.codigo),
        nombre,
        categoria,
        unidad,
        stock,
        stock_minimo: stockMinimo,
        costo_compra: costoCompra,
        precio_venta: precioVenta,
        proveedor: texto(formulario.proveedor),
        vencimiento: texto(formulario.vencimiento) || null,
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

export async function crearProductoInventarioSupabase(
    formulario: FormularioProductoInventarioSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();
    const datos = validarProducto(formulario);

    const codigoFinal = datos.codigo || `PROD-${Date.now()}`;

    const { data: producto, error } = await supabase
        .from("productos_inventario")
        .insert({
            clinica_id: clinicaId,
            ...datos,
            codigo: codigoFinal,
            estado: "Activo",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    const productoCreado = producto as ProductoInventarioSupabase;

    if (productoCreado.stock > 0) {
        await supabase.from("movimientos_inventario").insert({
            clinica_id: clinicaId,
            producto_id: productoCreado.id,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            producto_nombre: productoCreado.nombre,
            tipo: "Entrada",
            cantidad: productoCreado.stock,
            stock_anterior: 0,
            stock_nuevo: productoCreado.stock,
            costo_unitario: productoCreado.costo_compra,
            motivo: "Registro inicial del producto",
            usuario_nombre: perfil.nombre || "Usuario no identificado",
            referencia: productoCreado.id,
            creado_por: perfil.id,
        });
    }

    return productoCreado;
}

export async function actualizarProductoInventarioSupabase(
    id: string,
    formulario: FormularioProductoInventarioSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();
    const datos = validarProducto(formulario);

    const { data: productoAnterior, error: errorAnterior } = await supabase
        .from("productos_inventario")
        .select("*")
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .single();

    if (errorAnterior) throw new Error(errorAnterior.message);

    const anterior = productoAnterior as ProductoInventarioSupabase;

    const { data, error } = await supabase
        .from("productos_inventario")
        .update(datos)
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    const actualizado = data as ProductoInventarioSupabase;

    if (Number(anterior.stock || 0) !== Number(actualizado.stock || 0)) {
        await supabase.from("movimientos_inventario").insert({
            clinica_id: clinicaId,
            producto_id: actualizado.id,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            producto_nombre: actualizado.nombre,
            tipo: "Ajuste",
            cantidad: actualizado.stock,
            stock_anterior: anterior.stock,
            stock_nuevo: actualizado.stock,
            costo_unitario: actualizado.costo_compra,
            motivo: "Ajuste automático por edición del producto",
            usuario_nombre: perfil.nombre || "Usuario no identificado",
            referencia: actualizado.id,
            creado_por: perfil.id,
        });
    }

    return actualizado;
}

export async function cambiarEstadoProductoInventarioSupabase(
    id: string,
    estado?: EstadoProductoInventarioSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    let estadoFinal = estado;

    if (!estadoFinal) {
        const { data: producto, error: errorProducto } = await supabase
            .from("productos_inventario")
            .select("estado")
            .eq("id", id)
            .eq("clinica_id", clinicaId)
            .single();

        if (errorProducto) throw new Error(errorProducto.message);

        estadoFinal = producto.estado === "Activo" ? "Inactivo" : "Activo";
    }

    const { data, error } = await supabase
        .from("productos_inventario")
        .update({ estado: estadoFinal })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as ProductoInventarioSupabase;
}

export async function registrarMovimientoInventarioSupabase(
    formulario: FormularioMovimientoInventarioSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const productoId = texto(formulario.producto_id);
    const cantidad = numero(formulario.cantidad);

    if (!productoId) throw new Error("Seleccioná un producto.");
    if (cantidad < 0) throw new Error("La cantidad no puede ser negativa.");
    if (formulario.tipo !== "Ajuste" && cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor que cero.");
    }

    const { data: producto, error: errorProducto } = await supabase
        .from("productos_inventario")
        .select("*")
        .eq("id", productoId)
        .eq("clinica_id", clinicaId)
        .single();

    if (errorProducto) throw new Error(errorProducto.message);

    const productoActual = producto as ProductoInventarioSupabase;
    const stockAnterior = Number(productoActual.stock || 0);
    let stockNuevo = stockAnterior;

    if (formulario.tipo === "Entrada") {
        stockNuevo = stockAnterior + cantidad;
    }

    if (
        formulario.tipo === "Salida" ||
        formulario.tipo === "Uso clínico" ||
        formulario.tipo === "Pérdida"
    ) {
        if (cantidad > stockAnterior) {
            throw new Error("No hay suficiente stock disponible para este movimiento.");
        }

        stockNuevo = stockAnterior - cantidad;
    }

    if (formulario.tipo === "Ajuste") {
        stockNuevo = cantidad;
    }

    const costoUnitario =
        numero(formulario.costo_unitario) || Number(productoActual.costo_compra || 0);

    const { error: errorUpdate } = await supabase
        .from("productos_inventario")
        .update({
            stock: stockNuevo,
            costo_compra:
                formulario.tipo === "Entrada" && costoUnitario > 0
                    ? costoUnitario
                    : productoActual.costo_compra,
        })
        .eq("id", productoId)
        .eq("clinica_id", clinicaId);

    if (errorUpdate) throw new Error(errorUpdate.message);

    const { data: movimiento, error: errorMovimiento } = await supabase
        .from("movimientos_inventario")
        .insert({
            clinica_id: clinicaId,
            producto_id: productoId,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            producto_nombre: productoActual.nombre,
            tipo: formulario.tipo,
            cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            costo_unitario: costoUnitario,
            motivo:
                texto(formulario.motivo) ||
                `Movimiento de inventario: ${formulario.tipo}`,
            usuario_nombre:
                texto(formulario.usuario_nombre) ||
                perfil.nombre ||
                "Usuario no identificado",
            referencia: texto(formulario.referencia),
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (errorMovimiento) throw new Error(errorMovimiento.message);

    return movimiento as MovimientoInventarioSupabase;
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


export async function revertirSalidaInventarioPorReferenciaSupabase(
    referencia: string,
    motivo?: string,
    usuario_nombre?: string
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const referenciaLimpia = texto(referencia);

    if (!referenciaLimpia) {
        throw new Error("La referencia de la venta es obligatoria para revertir stock.");
    }

    const { data, error } = await supabase
        .from("movimientos_inventario")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("referencia", referenciaLimpia)
        .eq("tipo", "Salida")
        .order("creado_en", { ascending: true });

    if (error) throw new Error(error.message);

    const salidas = (data || []) as MovimientoInventarioSupabase[];

    if (salidas.length === 0) {
        return [];
    }

    const reversiones: MovimientoInventarioSupabase[] = [];

    for (const salida of salidas) {
        const reverso = await registrarMovimientoInventarioSupabase({
            producto_id: salida.producto_id,
            tipo: "Entrada",
            cantidad: salida.cantidad,
            costo_unitario: salida.costo_unitario,
            motivo:
                texto(motivo) ||
                `Reversión de stock por anulación de venta ${referenciaLimpia}`,
            referencia: `ANULACION-${referenciaLimpia}`,
            usuario_nombre,
        });

        reversiones.push(reverso);
    }

    return reversiones;
}