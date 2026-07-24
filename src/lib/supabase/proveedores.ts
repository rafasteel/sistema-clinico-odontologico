import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import { anularGastoSupabase, crearGastoSupabase, type MetodoGastoSupabase } from "@/lib/supabase/gastos";
import { registrarMovimientoInventarioSupabase, type ProductoInventarioSupabase } from "@/lib/supabase/inventario";

export type EstadoProveedorSupabase = "Activo" | "Inactivo";
export type MetodoPagoProveedorSupabase = "Efectivo" | "Tarjeta" | "Transferencia";
export type EstadoCompraProveedorSupabase = "Activa" | "Anulada";
export type EstadoCuentaPagarSupabase = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";
export type EstadoAbonoCuentaPagarSupabase = "Activo" | "Anulado";

export type ProveedorSupabase = {
    id: string;
    clinica_id: string;
    nombre: string;
    ruc: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    direccion: string;
    categoria: string;
    contacto: string;
    estado: EstadoProveedorSupabase;
    observaciones: string;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type CompraProveedorSupabase = {
    id: string;
    clinica_id: string;
    fecha: string;
    hora: string;
    proveedor_id: string | null;
    proveedor_nombre: string;
    producto_id: string | null;
    producto_nombre: string;
    cantidad: number;
    costo_unitario: number;
    total: number;
    pago_ahora: number;
    credito: number;
    metodo_pago: MetodoPagoProveedorSupabase;
    fecha_vencimiento: string | null;
    estado: EstadoCompraProveedorSupabase;
    usuario_nombre: string;
    observaciones: string;
    gasto_id: string | null;
    cuenta_pagar_id: string | null;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type CuentaPagarSupabase = {
    id: string;
    clinica_id: string;
    compra_id: string | null;
    proveedor_id: string | null;
    proveedor_nombre: string;
    concepto: string;
    total: number;
    abonado: number;
    saldo: number;
    fecha: string;
    fecha_vencimiento: string | null;
    estado: EstadoCuentaPagarSupabase;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type AbonoCuentaPagarSupabase = {
    id: string;
    clinica_id: string;
    cuenta_id: string;
    compra_id: string | null;
    proveedor_id: string | null;
    gasto_id: string | null;
    fecha: string;
    hora: string;
    monto: number;
    metodo: MetodoPagoProveedorSupabase;
    estado: EstadoAbonoCuentaPagarSupabase;
    usuario_nombre: string;
    observaciones: string;
    creado_por: string | null;
    creado_en: string;
};

export type FormularioProveedorSupabase = {
    nombre: string;
    ruc?: string;
    telefono: string;
    whatsapp?: string;
    correo?: string;
    direccion?: string;
    categoria: string;
    contacto?: string;
    observaciones?: string;
};

export type FormularioCompraProveedorSupabase = {
    proveedor_id: string;
    producto_id: string;
    cantidad: number | string;
    costo_unitario: number | string;
    pago_ahora: number | string;
    metodo_pago: MetodoPagoProveedorSupabase;
    fecha_vencimiento?: string;
    observaciones?: string;
    usuario_nombre?: string;
};

export type FormularioAbonoCuentaPagarSupabase = {
    cuenta_id: string;
    monto: number | string;
    metodo: MetodoPagoProveedorSupabase;
    usuario_nombre?: string;
    observaciones?: string;
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
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function horaActualLocal() {
    const fecha = new Date();
    return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

function siguienteMes(mes: string) {
    const [year, month] = mes.split("-").map(Number);
    const fecha = new Date(year, month, 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`;
}

function metodoGasto(metodo: MetodoPagoProveedorSupabase): MetodoGastoSupabase {
    if (metodo === "Tarjeta") return "Tarjeta";
    if (metodo === "Transferencia") return "Transferencia";
    return "Efectivo";
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();
    if (error || !perfil) throw new Error("No se encontró el perfil activo del usuario.");
    if (!perfil.clinica_id) throw new Error("Este usuario no tiene clínica asignada.");
    return { perfil, clinicaId: perfil.clinica_id };
}

export async function listarProveedoresSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const { data, error } = await supabase.from("proveedores").select("*").eq("clinica_id", clinicaId).order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as ProveedorSupabase[];
}

export async function crearProveedorSupabase(formulario: FormularioProveedorSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();
    const nombre = texto(formulario.nombre);
    const telefono = texto(formulario.telefono);
    const categoria = texto(formulario.categoria);
    if (!nombre) throw new Error("El nombre del proveedor es obligatorio.");
    if (!telefono) throw new Error("El teléfono del proveedor es obligatorio.");
    if (!categoria) throw new Error("La categoría del proveedor es obligatoria.");
    const { data, error } = await supabase.from("proveedores").insert({
        clinica_id: clinicaId,
        nombre,
        ruc: texto(formulario.ruc),
        telefono,
        whatsapp: texto(formulario.whatsapp),
        correo: texto(formulario.correo),
        direccion: texto(formulario.direccion),
        categoria,
        contacto: texto(formulario.contacto),
        estado: "Activo",
        observaciones: texto(formulario.observaciones),
        creado_por: perfil.id,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return data as ProveedorSupabase;
}

export async function actualizarProveedorSupabase(id: string, formulario: FormularioProveedorSupabase) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const nombre = texto(formulario.nombre);
    const telefono = texto(formulario.telefono);
    const categoria = texto(formulario.categoria);
    if (!nombre) throw new Error("El nombre del proveedor es obligatorio.");
    if (!telefono) throw new Error("El teléfono del proveedor es obligatorio.");
    if (!categoria) throw new Error("La categoría del proveedor es obligatoria.");
    const { data, error } = await supabase.from("proveedores").update({
        nombre,
        ruc: texto(formulario.ruc),
        telefono,
        whatsapp: texto(formulario.whatsapp),
        correo: texto(formulario.correo),
        direccion: texto(formulario.direccion),
        categoria,
        contacto: texto(formulario.contacto),
        observaciones: texto(formulario.observaciones),
    }).eq("id", id).eq("clinica_id", clinicaId).select("*").single();
    if (error) throw new Error(error.message);
    return data as ProveedorSupabase;
}

export async function cambiarEstadoProveedorSupabase(id: string, estado?: EstadoProveedorSupabase) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    let estadoFinal = estado;
    if (!estadoFinal) {
        const { data: proveedor, error: errorProveedor } = await supabase.from("proveedores").select("estado").eq("id", id).eq("clinica_id", clinicaId).single();
        if (errorProveedor) throw new Error(errorProveedor.message);
        estadoFinal = proveedor.estado === "Activo" ? "Inactivo" : "Activo";
    }
    const { data, error } = await supabase.from("proveedores").update({ estado: estadoFinal }).eq("id", id).eq("clinica_id", clinicaId).select("*").single();
    if (error) throw new Error(error.message);
    return data as ProveedorSupabase;
}

export async function listarComprasProveedoresSupabase(mes?: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    let consulta = supabase.from("compras_proveedores").select("*").eq("clinica_id", clinicaId).order("fecha", { ascending: false }).order("hora", { ascending: false });
    if (mes) consulta = consulta.gte("fecha", `${mes}-01`).lt("fecha", siguienteMes(mes));
    const { data, error } = await consulta;
    if (error) throw new Error(error.message);
    return (data || []) as CompraProveedorSupabase[];
}

export async function listarCuentasPagarSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const { data, error } = await supabase.from("cuentas_pagar").select("*").eq("clinica_id", clinicaId).order("fecha_vencimiento", { ascending: true, nullsFirst: false }).order("fecha", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as CuentaPagarSupabase[];
}

export async function listarAbonosCuentaPagarSupabase(cuentaId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const { data, error } = await supabase.from("abonos_cuentas_pagar").select("*").eq("clinica_id", clinicaId).eq("cuenta_id", cuentaId).order("fecha", { ascending: false }).order("hora", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as AbonoCuentaPagarSupabase[];
}

export async function registrarCompraProveedorSupabase(formulario: FormularioCompraProveedorSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();
    const proveedorId = texto(formulario.proveedor_id);
    const productoId = texto(formulario.producto_id);
    const cantidad = numero(formulario.cantidad);
    const costoUnitario = numero(formulario.costo_unitario);
    const pagoAhora = numero(formulario.pago_ahora);
    if (!proveedorId) throw new Error("Selecciona un proveedor.");
    if (!productoId) throw new Error("Selecciona un producto.");
    if (cantidad <= 0) throw new Error("La cantidad debe ser mayor que cero.");
    if (costoUnitario <= 0) throw new Error("El costo unitario debe ser mayor que cero.");
    if (pagoAhora < 0) throw new Error("El pago ahora no puede ser negativo.");
    const total = cantidad * costoUnitario;
    const credito = Math.max(total - pagoAhora, 0);
    if (pagoAhora > total) throw new Error("El pago ahora no puede ser mayor que el total.");
    if (credito > 0 && !texto(formulario.fecha_vencimiento)) throw new Error("Si queda crédito, debes indicar fecha de vencimiento.");

    const { data: proveedorData, error: errorProveedor } = await supabase.from("proveedores").select("*").eq("id", proveedorId).eq("clinica_id", clinicaId).single();
    if (errorProveedor) throw new Error(errorProveedor.message);
    const proveedor = proveedorData as ProveedorSupabase;

    const { data: productoData, error: errorProducto } = await supabase.from("productos_inventario").select("*").eq("id", productoId).eq("clinica_id", clinicaId).single();
    if (errorProducto) throw new Error(errorProducto.message);
    const producto = productoData as ProductoInventarioSupabase;

    const { data: compraData, error: errorCompra } = await supabase.from("compras_proveedores").insert({
        clinica_id: clinicaId,
        fecha: fechaHoyLocal(),
        hora: horaActualLocal(),
        proveedor_id: proveedor.id,
        proveedor_nombre: proveedor.nombre,
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        cantidad,
        costo_unitario: costoUnitario,
        total,
        pago_ahora: pagoAhora,
        credito,
        metodo_pago: formulario.metodo_pago,
        fecha_vencimiento: texto(formulario.fecha_vencimiento) || null,
        estado: "Activa",
        usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "Usuario no identificado",
        observaciones: texto(formulario.observaciones),
        creado_por: perfil.id,
    }).select("*").single();
    if (errorCompra) throw new Error(errorCompra.message);
    let compra = compraData as CompraProveedorSupabase;

    await registrarMovimientoInventarioSupabase({
        producto_id: producto.id,
        tipo: "Entrada",
        cantidad,
        costo_unitario: costoUnitario,
        motivo: `Compra a proveedor ${proveedor.nombre}. Compra: ${compra.id}`,
        referencia: compra.id,
        usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "Usuario no identificado",
    });

    await supabase.from("productos_inventario").update({ proveedor: proveedor.nombre, costo_compra: costoUnitario }).eq("id", producto.id).eq("clinica_id", clinicaId);

    let gastoId: string | null = null;
    let cuentaPagarId: string | null = null;

    if (pagoAhora > 0) {
        const gasto = await crearGastoSupabase({
            fecha: fechaHoyLocal(),
            categoria: "Compra a proveedor",
            descripcion: `Compra de ${producto.nombre} a ${proveedor.nombre}`,
            monto: pagoAhora,
            metodo_pago: metodoGasto(formulario.metodo_pago),
            proveedor: proveedor.nombre,
            usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "Usuario no identificado",
            observaciones: `Compra relacionada: ${compra.id}`,
        });
        gastoId = gasto.id;
    }

    if (credito > 0) {
        const { data: cuentaData, error: errorCuenta } = await supabase.from("cuentas_pagar").insert({
            clinica_id: clinicaId,
            compra_id: compra.id,
            proveedor_id: proveedor.id,
            proveedor_nombre: proveedor.nombre,
            concepto: `Compra de ${producto.nombre}`,
            total: credito,
            abonado: 0,
            saldo: credito,
            fecha: fechaHoyLocal(),
            fecha_vencimiento: texto(formulario.fecha_vencimiento) || null,
            estado: pagoAhora > 0 ? "Parcial" : "Pendiente",
            creado_por: perfil.id,
        }).select("*").single();
        if (errorCuenta) throw new Error(errorCuenta.message);
        cuentaPagarId = (cuentaData as CuentaPagarSupabase).id;
    }

    const { data: compraActualizada, error: errorActualizacion } = await supabase.from("compras_proveedores").update({ gasto_id: gastoId, cuenta_pagar_id: cuentaPagarId }).eq("id", compra.id).eq("clinica_id", clinicaId).select("*").single();
    if (errorActualizacion) throw new Error(errorActualizacion.message);
    compra = compraActualizada as CompraProveedorSupabase;
    return compra;
}

export async function registrarAbonoCuentaPagarSupabase(formulario: FormularioAbonoCuentaPagarSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();
    const cuentaId = texto(formulario.cuenta_id);
    const monto = numero(formulario.monto);
    if (!cuentaId) throw new Error("Selecciona una cuenta por pagar.");
    if (monto <= 0) throw new Error("El monto debe ser mayor que cero.");
    const { data: cuentaData, error: errorCuenta } = await supabase.from("cuentas_pagar").select("*").eq("id", cuentaId).eq("clinica_id", clinicaId).single();
    if (errorCuenta) throw new Error(errorCuenta.message);
    const cuenta = cuentaData as CuentaPagarSupabase;
    if (cuenta.estado === "Anulada") throw new Error("No se puede abonar una cuenta anulada.");
    if (monto > Number(cuenta.saldo || 0)) throw new Error("El abono no puede ser mayor que el saldo.");

    const gasto = await crearGastoSupabase({
        fecha: fechaHoyLocal(),
        categoria: "Abono a proveedor",
        descripcion: `Abono a ${cuenta.proveedor_nombre}: ${cuenta.concepto}`,
        monto,
        metodo_pago: metodoGasto(formulario.metodo),
        proveedor: cuenta.proveedor_nombre,
        usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "Usuario no identificado",
        observaciones: texto(formulario.observaciones) || `Abono aplicado a cuenta ${cuenta.id}`,
    });

    const { data: abonoData, error: errorAbono } = await supabase.from("abonos_cuentas_pagar").insert({
        clinica_id: clinicaId,
        cuenta_id: cuenta.id,
        compra_id: cuenta.compra_id,
        proveedor_id: cuenta.proveedor_id,
        gasto_id: gasto.id,
        fecha: fechaHoyLocal(),
        hora: horaActualLocal(),
        monto,
        metodo: formulario.metodo,
        estado: "Activo",
        usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "Usuario no identificado",
        observaciones: texto(formulario.observaciones) || `Abono aplicado a cuenta ${cuenta.id}`,
        creado_por: perfil.id,
    }).select("*").single();
    if (errorAbono) throw new Error(errorAbono.message);

    const nuevoAbonado = Number(cuenta.abonado || 0) + monto;
    const nuevoSaldo = Math.max(Number(cuenta.saldo || 0) - monto, 0);
    const nuevoEstado: EstadoCuentaPagarSupabase = nuevoSaldo <= 0 ? "Pagada" : "Parcial";
    const { error: errorUpdate } = await supabase.from("cuentas_pagar").update({ abonado: nuevoAbonado, saldo: nuevoSaldo, estado: nuevoEstado }).eq("id", cuenta.id).eq("clinica_id", clinicaId);
    if (errorUpdate) throw new Error(errorUpdate.message);
    return abonoData as AbonoCuentaPagarSupabase;
}

export async function anularCompraProveedorSupabase(id: string, usuarioNombre?: string) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();
    const { data: compraData, error: errorCompra } = await supabase.from("compras_proveedores").select("*").eq("id", id).eq("clinica_id", clinicaId).single();
    if (errorCompra) throw new Error(errorCompra.message);
    const compra = compraData as CompraProveedorSupabase;
    if (compra.estado === "Anulada") return compra;
    if (compra.producto_id && compra.cantidad > 0) {
        await registrarMovimientoInventarioSupabase({
            producto_id: compra.producto_id,
            tipo: "Salida",
            cantidad: compra.cantidad,
            costo_unitario: compra.costo_unitario,
            motivo: `Reversión por anulación de compra ${compra.id}`,
            referencia: `ANULACION-${compra.id}`,
            usuario_nombre: texto(usuarioNombre) || perfil.nombre || "Usuario no identificado",
        });
    }
    if (compra.cuenta_pagar_id) {
        await supabase.from("cuentas_pagar").update({ saldo: 0, estado: "Anulada" }).eq("id", compra.cuenta_pagar_id).eq("clinica_id", clinicaId);
        await supabase.from("abonos_cuentas_pagar").update({ estado: "Anulado" }).eq("cuenta_id", compra.cuenta_pagar_id).eq("clinica_id", clinicaId);
    }
    if (compra.gasto_id) {
        try {
            await anularGastoSupabase(compra.gasto_id);
        } catch {
            // Si el gasto ya no existe, no bloqueamos la anulación de compra.
        }
    }
    const { data, error } = await supabase.from("compras_proveedores").update({ estado: "Anulada" }).eq("id", compra.id).eq("clinica_id", clinicaId).select("*").single();
    if (error) throw new Error(error.message);
    return data as CompraProveedorSupabase;
}