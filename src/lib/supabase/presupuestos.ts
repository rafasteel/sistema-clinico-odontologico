import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type CaraDentalSupabase = "sup" | "der" | "inf" | "izq" | "centro";
export type EstadoDentalSupabase = "Sano" | "Caries" | "Resina" | "Corona" | "Ausente" | "Extracción" | "Endodoncia" | "Implante" | "Fractura" | "Sellante" | "Observación";
export type EstadoPresupuestoSupabase = "Pendiente" | "Aprobado" | "Rechazado" | "Convertido a venta";

export type ItemPresupuestoSupabase = {
    id: string;
    presupuesto_id: string;
    clinica_id: string;
    paciente_id: string;
    orden: number;
    pieza_codigo: string;
    pieza_numero: string;
    cara: CaraDentalSupabase | null;
    estado_dental: EstadoDentalSupabase | null;
    nombre: string;
    tratamiento: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    precio: number;
    subtotal: number;
    total: number;
    estado: string;
    creado_en: string;
    actualizado_en: string;
};

export type PresupuestoSupabase = {
    id: string;
    clinica_id: string;
    paciente_id: string;
    paciente_nombre: string;
    fecha: string;
    hora: string;
    estado: EstadoPresupuestoSupabase;
    subtotal: number;
    descuento: number;
    total: number;
    observaciones: string;
    origen: string;
    pieza_codigo: string;
    cara: CaraDentalSupabase | null;
    estado_dental: EstadoDentalSupabase | null;
    usuario_nombre: string;
    venta_id: string | null;
    cuenta_cobrar_id: string | null;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
    items: ItemPresupuestoSupabase[];
};

export type FormularioItemPresupuestoSupabase = {
    pieza_codigo?: string;
    pieza_numero?: string;
    cara?: CaraDentalSupabase | "";
    estado_dental?: EstadoDentalSupabase | "";
    nombre: string;
    tratamiento?: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    estado?: string;
};

export type FormularioPresupuestoSupabase = {
    paciente_id: string;
    fecha?: string;
    hora?: string;
    estado?: EstadoPresupuestoSupabase;
    descuento?: number;
    observaciones?: string;
    origen?: string;
    pieza_codigo?: string;
    cara?: CaraDentalSupabase | "";
    estado_dental?: EstadoDentalSupabase | "";
    items: FormularioItemPresupuestoSupabase[];
};

function fechaHoyLocal() {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function horaActualLocal() {
    const fecha = new Date();
    return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

function sumarDias(fechaTexto: string, dias: number) {
    const [year, month, day] = fechaTexto.split("-").map(Number);
    const fecha = new Date(year, month - 1, day);
    fecha.setDate(fecha.getDate() + dias);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);
    return Number.isNaN(convertido) ? 0 : convertido;
}

function limpiarTexto(valor: unknown, respaldo = "") {
    const convertido = String(valor ?? "").trim();
    return convertido || respaldo;
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();
    if (error || !perfil) throw new Error("No se encontró el perfil activo del usuario.");
    if (!perfil.clinica_id) throw new Error("Este usuario no tiene clínica asignada.");
    return { perfil, clinicaId: perfil.clinica_id };
}

async function obtenerNombrePaciente(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { data, error } = await supabase.from("pacientes").select("nombre").eq("id", pacienteId).maybeSingle();
    if (error) throw new Error(error.message);
    return limpiarTexto(data?.nombre, "Paciente no especificado");
}

function normalizarItems(items: FormularioItemPresupuestoSupabase[]) {
    if (!items.length) throw new Error("El presupuesto debe tener al menos un tratamiento.");

    return items.map((item, index) => {
        const cantidad = numero(item.cantidad || 1);
        const precioUnitario = numero(item.precio_unitario);
        const subtotal = cantidad * precioUnitario;

        if (!limpiarTexto(item.nombre)) throw new Error("Todos los tratamientos deben tener nombre.");
        if (cantidad <= 0) throw new Error("La cantidad debe ser mayor que cero.");
        if (precioUnitario < 0) throw new Error("El precio unitario no puede ser negativo.");

        return {
            orden: index + 1,
            pieza_codigo: limpiarTexto(item.pieza_codigo),
            pieza_numero: limpiarTexto(item.pieza_numero || item.pieza_codigo),
            cara: item.cara || null,
            estado_dental: item.estado_dental || null,
            nombre: limpiarTexto(item.nombre, "Tratamiento odontológico"),
            tratamiento: limpiarTexto(item.tratamiento || item.nombre, "Tratamiento odontológico"),
            descripcion: limpiarTexto(item.descripcion, "Sin descripción"),
            cantidad,
            precio_unitario: precioUnitario,
            precio: precioUnitario,
            subtotal,
            total: subtotal,
            estado: limpiarTexto(item.estado, "Pendiente"),
        };
    });
}

async function adjuntarItems(presupuestos: PresupuestoSupabase[]) {
    if (presupuestos.length === 0) return [];
    const supabase = crearClienteSupabase();
    const ids = presupuestos.map((p) => p.id);
    const { data, error } = await supabase.from("presupuesto_items").select("*").in("presupuesto_id", ids).order("orden", { ascending: true });
    if (error) throw new Error(error.message);
    const items = (data || []) as ItemPresupuestoSupabase[];
    return presupuestos.map((p) => ({ ...p, items: items.filter((i) => i.presupuesto_id === p.id) }));
}

export async function listarPresupuestosSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const { data, error } = await supabase.from("presupuestos").select("*").eq("clinica_id", clinicaId).order("fecha", { ascending: false }).order("hora", { ascending: false });
    if (error) throw new Error(error.message);
    return adjuntarItems((data || []) as PresupuestoSupabase[]);
}

export async function listarPresupuestosPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const { data, error } = await supabase.from("presupuestos").select("*").eq("clinica_id", clinicaId).eq("paciente_id", pacienteId).order("fecha", { ascending: false }).order("hora", { ascending: false });
    if (error) throw new Error(error.message);
    return adjuntarItems((data || []) as PresupuestoSupabase[]);
}

export async function obtenerPresupuestoSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const { data, error } = await supabase.from("presupuestos").select("*").eq("clinica_id", clinicaId).eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const [presupuesto] = await adjuntarItems([data as PresupuestoSupabase]);
    return presupuesto;
}

export async function crearPresupuestoSupabase(formulario: FormularioPresupuestoSupabase) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();
    const pacienteId = limpiarTexto(formulario.paciente_id);
    if (!pacienteId) throw new Error("No se recibió el paciente para el presupuesto.");

    const pacienteNombre = await obtenerNombrePaciente(pacienteId);
    const items = normalizarItems(formulario.items);
    const subtotal = items.reduce((total, item) => total + numero(item.subtotal), 0);
    const descuento = numero(formulario.descuento);
    const total = Math.max(subtotal - descuento, 0);
    if (descuento < 0) throw new Error("El descuento no puede ser negativo.");
    if (descuento > subtotal) throw new Error("El descuento no puede ser mayor que el subtotal.");

    const itemPrincipal = items[0];
    const { data, error } = await supabase.from("presupuestos").insert({
        clinica_id: clinicaId,
        paciente_id: pacienteId,
        paciente_nombre: pacienteNombre,
        fecha: formulario.fecha || fechaHoyLocal(),
        hora: formulario.hora || horaActualLocal(),
        estado: formulario.estado || "Pendiente",
        subtotal,
        descuento,
        total,
        observaciones: limpiarTexto(formulario.observaciones),
        origen: limpiarTexto(formulario.origen, "Manual"),
        pieza_codigo: limpiarTexto(formulario.pieza_codigo) || limpiarTexto(itemPrincipal.pieza_codigo),
        cara: formulario.cara || itemPrincipal.cara || null,
        estado_dental: formulario.estado_dental || itemPrincipal.estado_dental || null,
        usuario_nombre: limpiarTexto(perfil.nombre, "Usuario no identificado"),
        creado_por: perfil.id,
    }).select("*").single();
    if (error) throw new Error(error.message);

    const presupuesto = data as PresupuestoSupabase;
    const { error: errorItems } = await supabase.from("presupuesto_items").insert(items.map((item) => ({ ...item, presupuesto_id: presupuesto.id, clinica_id: clinicaId, paciente_id: pacienteId })));
    if (errorItems) {
        await supabase.from("presupuestos").delete().eq("id", presupuesto.id);
        throw new Error(errorItems.message);
    }

    return obtenerPresupuestoSupabase(presupuesto.id);
}

export async function actualizarEstadoPresupuestoSupabase(id: string, estado: EstadoPresupuestoSupabase) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const { error } = await supabase.from("presupuestos").update({ estado }).eq("clinica_id", clinicaId).eq("id", id);
    if (error) throw new Error(error.message);
    return obtenerPresupuestoSupabase(id);
}

export async function eliminarPresupuestoSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();
    const presupuesto = await obtenerPresupuestoSupabase(id);
    if (!presupuesto) return;
    if (presupuesto.estado === "Convertido a venta") throw new Error("No se puede eliminar un presupuesto convertido a venta.");
    const { error } = await supabase.from("presupuestos").delete().eq("clinica_id", clinicaId).eq("id", id);
    if (error) throw new Error(error.message);
}

export async function convertirPresupuestoAVentaSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();
    const presupuesto = await obtenerPresupuestoSupabase(id);
    if (!presupuesto) throw new Error("No se encontró el presupuesto.");
    if (presupuesto.estado === "Convertido a venta") throw new Error("Este presupuesto ya fue convertido a venta.");
    if (presupuesto.estado === "Rechazado") throw new Error("No podés convertir un presupuesto rechazado.");
    if (numero(presupuesto.total) <= 0) throw new Error("El presupuesto debe tener un total mayor que cero.");

    const concepto = presupuesto.items.length > 0
        ? presupuesto.items.map((item) => item.pieza_codigo ? `${item.nombre} · Pieza ${item.pieza_codigo}` : item.nombre).join(", ").slice(0, 180)
        : `Presupuesto ${presupuesto.id}`;

    const fecha = fechaHoyLocal();
    const hora = horaActualLocal();
    const { data: ventaData, error: errorVenta } = await supabase.from("ventas").insert({
        clinica_id: clinicaId,
        fecha,
        hora,
        tipo_cobro: "Presupuesto convertido",
        cita_id: null,
        paciente_id: presupuesto.paciente_id,
        cliente_nombre: presupuesto.paciente_nombre,
        concepto,
        total: presupuesto.total,
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        credito: presupuesto.total,
        estado: "Crédito",
        usuario_nombre: limpiarTexto(perfil.nombre, "Usuario no identificado"),
        observaciones: `Venta generada desde presupuesto ${presupuesto.id}. Queda como crédito pendiente por cobrar.`,
        creado_por: perfil.id,
    }).select("*").single();
    if (errorVenta) throw new Error(errorVenta.message);

    const venta = ventaData as { id: string };
    const { data: cuentaData, error: errorCuenta } = await supabase.from("cuentas_cobrar").insert({
        clinica_id: clinicaId,
        venta_id: venta.id,
        paciente_id: presupuesto.paciente_id,
        paciente_nombre: presupuesto.paciente_nombre,
        concepto,
        total: presupuesto.total,
        abonado: 0,
        saldo: presupuesto.total,
        fecha,
        fecha_vencimiento: sumarDias(fecha, 30),
        estado: "Pendiente",
        creado_por: perfil.id,
    }).select("*").single();
    if (errorCuenta) {
        await supabase.from("ventas").delete().eq("id", venta.id);
        throw new Error(errorCuenta.message);
    }

    const cuenta = cuentaData as { id: string };
    const { error: errorUpdate } = await supabase.from("presupuestos").update({ estado: "Convertido a venta", venta_id: venta.id, cuenta_cobrar_id: cuenta.id }).eq("clinica_id", clinicaId).eq("id", presupuesto.id);
    if (errorUpdate) throw new Error(errorUpdate.message);
    return { venta_id: venta.id, cuenta_cobrar_id: cuenta.id };
}