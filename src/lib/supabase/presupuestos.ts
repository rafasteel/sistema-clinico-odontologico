import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import { ejecutarOperacionClinica } from "@/lib/supabase/operaciones";

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

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();
    if (error || !perfil) throw new Error("No se encontró el perfil activo del usuario.");
    if (!perfil.clinica_id) throw new Error("Este usuario no tiene clínica asignada.");
    return { perfil, clinicaId: perfil.clinica_id };
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
    const presupuesto = await ejecutarOperacionClinica<PresupuestoSupabase>("presupuesto.crear", formulario);
    return obtenerPresupuestoSupabase(presupuesto.id);
}

export async function actualizarEstadoPresupuestoSupabase(id: string, estado: EstadoPresupuestoSupabase) {
    await ejecutarOperacionClinica<PresupuestoSupabase>("presupuesto.estado", { id, estado });
    return obtenerPresupuestoSupabase(id);
}

export async function eliminarPresupuestoSupabase(id: string) {
    await ejecutarOperacionClinica<null>("presupuesto.eliminar", { id });
}

export async function convertirPresupuestoAVentaSupabase(id: string) {
    return ejecutarOperacionClinica<{ venta_id: string; cuenta_cobrar_id: string }>("presupuesto.convertir", { id });
}
