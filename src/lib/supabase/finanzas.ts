import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import { ejecutarOperacionClinica } from "@/lib/supabase/operaciones";

export type EstadoVentaSupabase = "Pagada" | "Parcial" | "Crédito" | "Anulada";

export type EstadoCuentaCobrarSupabase =
    | "Pendiente"
    | "Parcial"
    | "Pagada"
    | "Vencida"
    | "Anulada";

export type EstadoAbonoCuentaSupabase = "Activo" | "Anulado";

export type VentaSupabase = {
    id: string;
    clinica_id: string;

    fecha: string;
    hora: string;

    tipo_cobro: string;
    cita_id: string | null;
    paciente_id: string | null;

    cliente_nombre: string;
    concepto: string;

    total: number;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    credito: number;

    metodo_pago: string;
    es_pago_mixto: boolean;

    pos_id: string | null;
    pos_nombre: string;
    pos_banco: string;
    comision_pos_porcentaje: number;
    comision_pos_monto: number;
    neto_tarjeta: number;

    estado: EstadoVentaSupabase;

    usuario_nombre: string;
    observaciones: string;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type CuentaCobrarSupabase = {
    id: string;
    clinica_id: string;

    venta_id: string | null;
    paciente_id: string | null;

    paciente_nombre: string;
    concepto: string;

    total: number;
    abonado: number;
    saldo: number;

    fecha: string;
    fecha_vencimiento: string | null;

    estado: EstadoCuentaCobrarSupabase;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type AbonoCuentaSupabase = {
    id: string;
    clinica_id: string;

    cuenta_id: string;
    paciente_id: string | null;
    venta_id: string | null;

    fecha: string;
    hora: string;

    monto: number;
    efectivo: number;
    tarjeta: number;
    transferencia: number;

    metodo: string;
    es_pago_mixto: boolean;

    pos_id: string | null;
    pos_nombre: string;
    pos_banco: string;
    comision_pos_porcentaje: number;
    comision_pos_monto: number;
    neto_tarjeta: number;

    referencia: string;
    observaciones: string;
    usuario_nombre: string;

    estado: EstadoAbonoCuentaSupabase;

    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;
};

export type FormularioVentaSupabase = {
    fecha?: string;
    hora?: string;

    tipo_cobro?: string;
    cita_id?: string | null;
    paciente_id?: string | null;

    cliente_nombre: string;
    concepto: string;

    total: number | string;
    efectivo?: number | string;
    tarjeta?: number | string;
    transferencia?: number | string;
    credito?: number | string;

    metodo_pago?: string;

    pos_id?: string | null;
    pos_nombre?: string;
    pos_banco?: string;
    comision_pos_porcentaje?: number | string;

    observaciones?: string;
    usuario_nombre?: string;

    fecha_vencimiento_credito?: string;
    producto_id?: string;
    cantidad_producto?: number | string;
};

export type FormularioCuentaCobrarSupabase = {
    venta_id?: string | null;
    paciente_id?: string | null;
    paciente_nombre: string;
    concepto: string;
    total: number | string;
    abonado?: number | string;
    saldo?: number | string;
    fecha?: string;
    fecha_vencimiento?: string;
    estado?: EstadoCuentaCobrarSupabase;
};

export type FormularioAbonoCuentaSupabase = {
    cuenta_id: string;
    paciente_id?: string | null;

    monto?: number | string;
    efectivo?: number | string;
    tarjeta?: number | string;
    transferencia?: number | string;

    metodo?: string;

    pos_id?: string | null;
    pos_nombre?: string;
    pos_banco?: string;
    comision_pos_porcentaje?: number | string;

    referencia?: string;
    observaciones?: string;
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

export async function listarVentasSupabase(fechaInicio?: string, fechaFin?: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    let consulta = supabase
        .from("ventas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (fechaInicio) {
        consulta = consulta.gte("fecha", fechaInicio);
    }

    if (fechaFin) {
        consulta = consulta.lte("fecha", fechaFin);
    }

    const { data, error } = await consulta;

    if (error) throw new Error(error.message);

    return (data || []) as VentaSupabase[];
}

export async function listarVentasPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("ventas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as VentaSupabase[];
}

export async function obtenerVentaSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("ventas")
        .select("*")
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .single();

    if (error) throw new Error(error.message);

    return data as VentaSupabase;
}

export async function registrarVentaSupabase(formulario: FormularioVentaSupabase) {
    return ejecutarOperacionClinica<{ venta: VentaSupabase; cuenta: CuentaCobrarSupabase | null }>("venta.registrar", formulario);
}

export async function anularVentaSupabase(id: string) {
    return ejecutarOperacionClinica<VentaSupabase>("venta.anular", { id });
}

export async function anularAbonoCuentaSupabase(id: string) {
    return ejecutarOperacionClinica<AbonoCuentaSupabase>("abono.anular", { id });
}

export async function listarCuentasCobrarSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("cuentas_cobrar")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("fecha", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as CuentaCobrarSupabase[];
}

export async function listarCuentasPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("cuentas_cobrar")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as CuentaCobrarSupabase[];
}

export async function obtenerCuentaCobrarSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("cuentas_cobrar")
        .select("*")
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .single();

    if (error) throw new Error(error.message);

    return data as CuentaCobrarSupabase;
}

export async function crearCuentaCobrarSupabase(formulario: FormularioCuentaCobrarSupabase) {
    return ejecutarOperacionClinica<CuentaCobrarSupabase>("cuenta.crear", formulario);
}

export async function actualizarEstadoCuentaPorSaldoSupabase(id: string) {
    return ejecutarOperacionClinica<CuentaCobrarSupabase>("cuenta.estado", { id });
}

export async function anularCuentaCobrarSupabase(id: string) {
    return ejecutarOperacionClinica<CuentaCobrarSupabase>("cuenta.anular", { id });
}

export async function listarAbonosCuentaSupabase(cuentaId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("abonos_cuentas_cobrar")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("cuenta_id", cuentaId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as AbonoCuentaSupabase[];
}

export async function listarAbonosPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("abonos_cuentas_cobrar")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as AbonoCuentaSupabase[];
}

export async function registrarAbonoCuentaSupabase(formulario: FormularioAbonoCuentaSupabase) {
    return ejecutarOperacionClinica<{ abono: AbonoCuentaSupabase; venta: VentaSupabase; cuenta: CuentaCobrarSupabase }>("abono.cobrar", formulario);
}
