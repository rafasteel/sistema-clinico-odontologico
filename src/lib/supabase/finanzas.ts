import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";
import { cambiarEstadoCitaSupabase } from "@/lib/supabase/citas";

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

function texto(valor: unknown) {
    return String(valor || "").trim();
}

function numero(valor: unknown, valorInicial = 0) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return valorInicial;

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

function sumarDias(fechaISO: string, dias: number) {
    const fecha = new Date(`${fechaISO}T12:00:00`);

    fecha.setDate(fecha.getDate() + dias);

    return fecha.toISOString().slice(0, 10);
}

function calcularMetodoPago(
    efectivo: number,
    tarjeta: number,
    transferencia: number,
    credito = 0,
    metodoManual?: string
) {
    if (texto(metodoManual)) return texto(metodoManual);

    const metodos: string[] = [];

    if (efectivo > 0) metodos.push("Efectivo");
    if (tarjeta > 0) metodos.push("Tarjeta");
    if (transferencia > 0) metodos.push("Transferencia");
    if (credito > 0) metodos.push("Crédito");

    if (metodos.length === 0) return "No especificado";
    if (metodos.length === 1) return metodos[0];

    return "Mixto";
}

function calcularEstadoVenta(total: number, credito: number) {
    if (credito <= 0) return "Pagada" as EstadoVentaSupabase;
    if (credito >= total) return "Crédito" as EstadoVentaSupabase;

    return "Parcial" as EstadoVentaSupabase;
}

function calcularEstadoCuenta(saldo: number, abonado: number) {
    if (saldo <= 0) return "Pagada" as EstadoCuentaCobrarSupabase;
    if (abonado > 0) return "Parcial" as EstadoCuentaCobrarSupabase;

    return "Pendiente" as EstadoCuentaCobrarSupabase;
}

function normalizarMontosVenta(formulario: FormularioVentaSupabase) {
    const total = Math.max(0, numero(formulario.total));
    const efectivo = Math.max(0, numero(formulario.efectivo));
    const tarjeta = Math.max(0, numero(formulario.tarjeta));
    const transferencia = Math.max(0, numero(formulario.transferencia));
    const creditoFormulario = Math.max(0, numero(formulario.credito));

    const pagado = efectivo + tarjeta + transferencia;
    const creditoCalculado = Math.max(total - pagado, 0);
    const credito = creditoFormulario > 0 ? creditoFormulario : creditoCalculado;

    return {
        total,
        efectivo,
        tarjeta,
        transferencia,
        credito,
        pagado,
    };
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
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const clienteNombre = texto(formulario.cliente_nombre);
    const concepto = texto(formulario.concepto);

    if (!clienteNombre) {
        throw new Error("El nombre del cliente o paciente es obligatorio.");
    }

    if (!concepto) {
        throw new Error("El concepto de la venta es obligatorio.");
    }

    const { total, efectivo, tarjeta, transferencia, credito, pagado } =
        normalizarMontosVenta(formulario);

    if (total <= 0) {
        throw new Error("El total debe ser mayor que cero.");
    }

    if (pagado + credito > total) {
        throw new Error("La suma de pagos y crédito no puede ser mayor que el total.");
    }

    const comisionPorcentaje = Math.max(
        0,
        numero(formulario.comision_pos_porcentaje)
    );
    const comisionMonto = tarjeta > 0 ? tarjeta * (comisionPorcentaje / 100) : 0;
    const netoTarjeta = Math.max(tarjeta - comisionMonto, 0);

    const metodoPago = calcularMetodoPago(
        efectivo,
        tarjeta,
        transferencia,
        credito,
        formulario.metodo_pago
    );

    const esPagoMixto =
        [efectivo, tarjeta, transferencia, credito].filter((monto) => monto > 0)
            .length > 1;

    const estadoVenta = calcularEstadoVenta(total, credito);

    const { data: venta, error: errorVenta } = await supabase
        .from("ventas")
        .insert({
            clinica_id: clinicaId,

            fecha: texto(formulario.fecha) || fechaHoyLocal(),
            hora: texto(formulario.hora) || horaActualLocal(),

            tipo_cobro: texto(formulario.tipo_cobro) || "Venta",
            cita_id: formulario.cita_id || null,
            paciente_id: formulario.paciente_id || null,

            cliente_nombre: clienteNombre,
            concepto,

            total,
            efectivo,
            tarjeta,
            transferencia,
            credito,

            metodo_pago: metodoPago,
            es_pago_mixto: esPagoMixto,

            pos_id: formulario.pos_id || null,
            pos_nombre: texto(formulario.pos_nombre),
            pos_banco: texto(formulario.pos_banco),
            comision_pos_porcentaje: comisionPorcentaje,
            comision_pos_monto: comisionMonto,
            neto_tarjeta: netoTarjeta,

            estado: estadoVenta,

            usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "",
            observaciones: texto(formulario.observaciones),

            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (errorVenta) throw new Error(errorVenta.message);

    let cuenta: CuentaCobrarSupabase | null = null;

    if (credito > 0) {
        cuenta = await crearCuentaCobrarSupabase({
            venta_id: venta.id,
            paciente_id: formulario.paciente_id || null,
            paciente_nombre: clienteNombre,
            concepto,
            total,
            abonado: pagado,
            saldo: credito,
            fecha: texto(formulario.fecha) || fechaHoyLocal(),
            fecha_vencimiento:
                texto(formulario.fecha_vencimiento_credito) ||
                sumarDias(texto(formulario.fecha) || fechaHoyLocal(), 30),
            estado: calcularEstadoCuenta(credito, pagado),
        });
    }

    if (formulario.cita_id && estadoVenta === "Pagada") {
        try {
            await cambiarEstadoCitaSupabase(formulario.cita_id, "Cobrada");
        } catch {
            // No bloqueamos la venta si la cita no se pudo marcar como cobrada.
        }
    }

    return {
        venta: venta as VentaSupabase,
        cuenta,
    };
}

export async function anularVentaSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("ventas")
        .update({ estado: "Anulada" })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as VentaSupabase;
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

export async function crearCuentaCobrarSupabase(
    formulario: FormularioCuentaCobrarSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const pacienteNombre = texto(formulario.paciente_nombre);
    const concepto = texto(formulario.concepto);
    const total = Math.max(0, numero(formulario.total));
    const abonado = Math.max(0, numero(formulario.abonado));
    const saldoFormulario = formulario.saldo !== undefined ? numero(formulario.saldo) : total - abonado;
    const saldo = Math.max(0, saldoFormulario);

    if (!pacienteNombre) {
        throw new Error("El nombre del paciente es obligatorio.");
    }

    if (!concepto) {
        throw new Error("El concepto de la cuenta por cobrar es obligatorio.");
    }

    if (total <= 0) {
        throw new Error("El total de la cuenta debe ser mayor que cero.");
    }

    const { data, error } = await supabase
        .from("cuentas_cobrar")
        .insert({
            clinica_id: clinicaId,
            venta_id: formulario.venta_id || null,
            paciente_id: formulario.paciente_id || null,

            paciente_nombre: pacienteNombre,
            concepto,

            total,
            abonado,
            saldo,

            fecha: texto(formulario.fecha) || fechaHoyLocal(),
            fecha_vencimiento: texto(formulario.fecha_vencimiento) || null,

            estado: formulario.estado || calcularEstadoCuenta(saldo, abonado),

            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as CuentaCobrarSupabase;
}

export async function actualizarEstadoCuentaPorSaldoSupabase(id: string) {
    const cuenta = await obtenerCuentaCobrarSupabase(id);
    const estado = calcularEstadoCuenta(Number(cuenta.saldo || 0), Number(cuenta.abonado || 0));

    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("cuentas_cobrar")
        .update({ estado })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as CuentaCobrarSupabase;
}

export async function anularCuentaCobrarSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("cuentas_cobrar")
        .update({ estado: "Anulada" })
        .eq("id", id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data as CuentaCobrarSupabase;
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

export async function registrarAbonoCuentaSupabase(
    formulario: FormularioAbonoCuentaSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const cuenta = await obtenerCuentaCobrarSupabase(formulario.cuenta_id);

    if (cuenta.estado === "Pagada") {
        throw new Error("Esta cuenta ya está pagada.");
    }

    if (cuenta.estado === "Anulada") {
        throw new Error("Esta cuenta está anulada.");
    }

    const efectivo = Math.max(0, numero(formulario.efectivo));
    const tarjeta = Math.max(0, numero(formulario.tarjeta));
    const transferencia = Math.max(0, numero(formulario.transferencia));

    const montoManual = Math.max(0, numero(formulario.monto));
    const monto = montoManual > 0 ? montoManual : efectivo + tarjeta + transferencia;

    if (monto <= 0) {
        throw new Error("El monto del abono debe ser mayor que cero.");
    }

    if (monto > Number(cuenta.saldo || 0)) {
        throw new Error("El abono no puede ser mayor que el saldo pendiente.");
    }

    const comisionPorcentaje = Math.max(
        0,
        numero(formulario.comision_pos_porcentaje)
    );
    const comisionMonto = tarjeta > 0 ? tarjeta * (comisionPorcentaje / 100) : 0;
    const netoTarjeta = Math.max(tarjeta - comisionMonto, 0);

    const metodo = calcularMetodoPago(
        efectivo,
        tarjeta,
        transferencia,
        0,
        formulario.metodo
    );

    const esPagoMixto =
        [efectivo, tarjeta, transferencia].filter((valor) => valor > 0).length > 1;

    const ventaResultado = await registrarVentaSupabase({
        tipo_cobro: "Abono a cuenta",
        paciente_id: cuenta.paciente_id,
        cliente_nombre: cuenta.paciente_nombre,
        concepto: `Abono: ${cuenta.concepto}`,
        total: monto,
        efectivo,
        tarjeta,
        transferencia,
        credito: 0,
        metodo_pago: metodo,
        pos_id: formulario.pos_id || null,
        pos_nombre: texto(formulario.pos_nombre),
        pos_banco: texto(formulario.pos_banco),
        comision_pos_porcentaje: comisionPorcentaje,
        usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "",
        observaciones: texto(formulario.observaciones),
    });

    const { data: abono, error: errorAbono } = await supabase
        .from("abonos_cuentas_cobrar")
        .insert({
            clinica_id: clinicaId,
            cuenta_id: cuenta.id,
            paciente_id: cuenta.paciente_id,
            venta_id: ventaResultado.venta.id,

            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),

            monto,
            efectivo,
            tarjeta,
            transferencia,

            metodo,
            es_pago_mixto: esPagoMixto,

            pos_id: formulario.pos_id || null,
            pos_nombre: texto(formulario.pos_nombre),
            pos_banco: texto(formulario.pos_banco),
            comision_pos_porcentaje: comisionPorcentaje,
            comision_pos_monto: comisionMonto,
            neto_tarjeta: netoTarjeta,

            referencia: texto(formulario.referencia),
            observaciones: texto(formulario.observaciones),
            usuario_nombre: texto(formulario.usuario_nombre) || perfil.nombre || "",

            estado: "Activo",
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (errorAbono) throw new Error(errorAbono.message);

    const nuevoAbonado = Number(cuenta.abonado || 0) + monto;
    const nuevoSaldo = Math.max(Number(cuenta.saldo || 0) - monto, 0);
    const nuevoEstado = calcularEstadoCuenta(nuevoSaldo, nuevoAbonado);

    const { data: cuentaActualizada, error: errorCuenta } = await supabase
        .from("cuentas_cobrar")
        .update({
            abonado: nuevoAbonado,
            saldo: nuevoSaldo,
            estado: nuevoEstado,
        })
        .eq("id", cuenta.id)
        .eq("clinica_id", clinicaId)
        .select("*")
        .single();

    if (errorCuenta) throw new Error(errorCuenta.message);

    return {
        abono: abono as AbonoCuentaSupabase,
        venta: ventaResultado.venta,
        cuenta: cuentaActualizada as CuentaCobrarSupabase,
    };
}