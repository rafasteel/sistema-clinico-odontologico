import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import { ejecutarOperacionClinica } from "@/lib/supabase/operaciones";

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

function siguienteMes(mes: string) {
    const [year, month] = mes.split("-").map(Number);
    const fecha = new Date(year, month, 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`;
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
    return ejecutarOperacionClinica<CompraProveedorSupabase>("compra.registrar", formulario);
}

export async function registrarAbonoCuentaPagarSupabase(formulario: FormularioAbonoCuentaPagarSupabase) {
    return ejecutarOperacionClinica<AbonoCuentaPagarSupabase>("abono.pagar", formulario);
}

export async function anularCompraProveedorSupabase(id: string) {
    return ejecutarOperacionClinica<CompraProveedorSupabase>("compra.anular", { id });
}
