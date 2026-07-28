import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type EstadoGeneral = "Activo" | "Inactivo";

export type PacienteExportacion = {
    id: string;
    nombre: string;
    telefono: string;
    cedula: string;
    fechaNacimiento: string;
    direccion: string;
    alergias: string;
    enfermedades: string;
    medicamentos: string;
    observaciones: string;
    estado: EstadoGeneral;
    saldoPendiente: number;
    ultimaCita: string;
};

export type VentaExportacion = {
    id: string;
    fecha: string;
    hora: string;
    tipoCobro: string;
    citaId: string;
    pacienteId: string;
    clienteNombre: string;
    concepto: string;
    total: number;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    credito: number;
    estado: string;
    usuarioNombre: string;
    observaciones: string;
    productoId?: string;
    productoNombre?: string;
    cantidadProducto?: number;
};

export type GastoExportacion = {
    id: string;
    fecha: string;
    hora: string;
    categoria: string;
    descripcion: string;
    monto: number;
    metodoPago: string;
    proveedor: string;
    usuarioNombre: string;
    observaciones: string;
    estado: string;
};

export type ProductoExportacion = {
    id: string;
    codigo: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stock: number;
    stockMinimo: number;
    costoCompra: number;
    precioVenta: number;
    proveedor: string;
    vencimiento: string;
    estado: string;
};

export type ProveedorExportacion = {
    id: string;
    nombre: string;
    ruc: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    direccion: string;
    categoria: string;
    contacto: string;
    estado: EstadoGeneral;
    observaciones: string;
};

export type CitaExportacion = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    doctorId: string;
    doctorNombre: string;
    servicioId: string;
    servicioNombre: string;
    costo: number;
    fecha: string;
    hora: string;
    recurrencia: string;
    estado: string;
    observaciones: string;
    creadaEn: string;
};

export type CuentaPorCobrarExportacion = {
    id: string;
    ventaId: string;
    pacienteId: string;
    pacienteNombre: string;
    concepto: string;
    total: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: string;
    abonos: unknown[];
};

export type CuentaPorPagarExportacion = {
    id: string;
    compraId: string;
    proveedorId: string;
    proveedorNombre: string;
    concepto: string;
    total: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: string;
    abonos: unknown[];
};

export type CompraProveedorExportacion = {
    id: string;
    fecha: string;
    hora: string;
    proveedorId: string;
    proveedorNombre: string;
    productoId: string;
    productoNombre: string;
    cantidad: number;
    costoUnitario: number;
    total: number;
    pagoAhora: number;
    credito: number;
    metodoPago: string;
    fechaVencimiento: string;
    estado: string;
    usuarioNombre: string;
    observaciones: string;
    gastoId: string;
    cuentaPagarId: string;
};

export type CierreCajaExportacion = {
    id: string;
    fecha: string;
    hora: string;
    usuarioNombre: string;
    ventasCantidad: number;
    ventasBrutas: number;
    efectivoSistema: number;
    tarjetaSistema: number;
    transferenciaSistema: number;
    creditoGenerado: number;
    gastosEfectivo: number;
    gastosTarjeta: number;
    gastosTransferencia: number;
    gastosTotal: number;
    comisionPOS: number;
    netoTarjeta: number;
    efectivoEsperado: number;
    efectivoContado: number;
    tarjetaReportada: number;
    transferenciaReportada: number;
    diferenciaEfectivo: number;
    diferenciaTarjeta: number;
    diferenciaTransferencia: number;
    estado: string;
    observaciones: string;
};

export type DatosExportacionesSupabase = {
    pacientes: PacienteExportacion[];
    ventas: VentaExportacion[];
    gastos: GastoExportacion[];
    productos: ProductoExportacion[];
    proveedores: ProveedorExportacion[];
    citas: CitaExportacion[];
    cuentasCobrar: CuentaPorCobrarExportacion[];
    cuentasPagar: CuentaPorPagarExportacion[];
    compras: CompraProveedorExportacion[];
    cierres: CierreCajaExportacion[];
    errores: string[];
};

type Registro = Record<string, unknown>;

function texto(valor: unknown, respaldo = "") {
    const convertido = String(valor ?? "").trim();

    return convertido || respaldo;
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function fecha(valor: unknown) {
    const convertido = texto(valor);

    if (convertido.length >= 10) return convertido.slice(0, 10);

    return "";
}

function hora(valor: unknown) {
    const convertido = texto(valor);

    if (!convertido) return "00:00";

    if (convertido.includes("T")) return convertido.slice(11, 16);

    return convertido.slice(0, 5);
}

function valor(registro: Registro, snake: string, camel?: string) {
    return registro[snake] ?? (camel ? registro[camel] : undefined);
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();

    if (error || !perfil) {
        throw new Error("No se encontró el perfil activo.");
    }

    return {
        clinicaId: perfil.clinica_id || null,
        esSuperAdmin: perfil.rol === "SUPER_ADMIN",
    };
}

async function consultarTabla(
    tabla: string,
    clinicaId: string | null,
    esSuperAdmin: boolean
) {
    const supabase = crearClienteSupabase();

    try {
        let consulta = supabase.from(tabla).select("*");

        if (clinicaId && !esSuperAdmin) {
            consulta = consulta.eq("clinica_id", clinicaId);
        }

        const { data, error } = await consulta.limit(10000);

        if (error) {
            return {
                data: [] as Registro[],
                error: `${tabla}: ${error.message}`,
            };
        }

        return {
            data: (data || []) as Registro[],
            error: "",
        };
    } catch (errorActual) {
        return {
            data: [] as Registro[],
            error:
                errorActual instanceof Error
                    ? `${tabla}: ${errorActual.message}`
                    : `${tabla}: error desconocido`,
        };
    }
}

function convertirPaciente(registro: Registro): PacienteExportacion {
    return {
        id: texto(registro.id),
        nombre: texto(registro.nombre),
        telefono: texto(registro.telefono || registro.whatsapp),
        cedula: texto(registro.cedula),
        fechaNacimiento: fecha(valor(registro, "fecha_nacimiento", "fechaNacimiento")),
        direccion: texto(registro.direccion),
        alergias: texto(registro.alergias),
        enfermedades: texto(
            registro.enfermedades_sistemicas ||
            registro.enfermedades ||
            registro.antecedentes
        ),
        medicamentos: texto(
            registro.medicamentos_actuales || registro.medicamentos
        ),
        observaciones: texto(registro.observaciones),
        estado: texto(registro.estado, "Activo") === "Inactivo" ? "Inactivo" : "Activo",
        saldoPendiente: 0,
        ultimaCita: "",
    };
}

function convertirVenta(registro: Registro): VentaExportacion {
    return {
        id: texto(registro.id),
        fecha: fecha(registro.fecha),
        hora: hora(registro.hora || registro.creado_en),
        tipoCobro: texto(valor(registro, "tipo_cobro", "tipoCobro"), "Venta"),
        citaId: texto(valor(registro, "cita_id", "citaId")),
        pacienteId: texto(valor(registro, "paciente_id", "pacienteId")),
        clienteNombre: texto(
            valor(registro, "cliente_nombre", "clienteNombre"),
            "Cliente no registrado"
        ),
        concepto: texto(registro.concepto),
        total: numero(registro.total),
        efectivo: numero(registro.efectivo),
        tarjeta: numero(registro.tarjeta),
        transferencia: numero(registro.transferencia),
        credito: numero(registro.credito),
        estado: texto(registro.estado, "Pagada"),
        usuarioNombre: texto(
            valor(registro, "usuario_nombre", "usuarioNombre"),
            "Usuario no identificado"
        ),
        observaciones: texto(registro.observaciones),
        productoId: texto(valor(registro, "producto_id", "productoId")),
        productoNombre: texto(valor(registro, "producto_nombre", "productoNombre")),
        cantidadProducto: numero(
            valor(registro, "cantidad_producto", "cantidadProducto")
        ),
    };
}

function convertirGasto(registro: Registro): GastoExportacion {
    return {
        id: texto(registro.id),
        fecha: fecha(registro.fecha),
        hora: hora(registro.hora || registro.creado_en),
        categoria: texto(registro.categoria, "Gasto"),
        descripcion: texto(registro.descripcion),
        monto: numero(registro.monto),
        metodoPago: texto(valor(registro, "metodo_pago", "metodoPago")),
        proveedor: texto(registro.proveedor || registro.proveedor_nombre),
        usuarioNombre: texto(
            valor(registro, "usuario_nombre", "usuarioNombre"),
            "Usuario no identificado"
        ),
        observaciones: texto(registro.observaciones),
        estado: texto(registro.estado, "Activo"),
    };
}

function convertirProducto(registro: Registro): ProductoExportacion {
    return {
        id: texto(registro.id),
        codigo: texto(registro.codigo),
        nombre: texto(registro.nombre),
        categoria: texto(registro.categoria),
        unidad: texto(registro.unidad),
        stock: numero(registro.stock),
        stockMinimo: numero(valor(registro, "stock_minimo", "stockMinimo")),
        costoCompra: numero(valor(registro, "costo_compra", "costoCompra")),
        precioVenta: numero(valor(registro, "precio_venta", "precioVenta")),
        proveedor: texto(registro.proveedor || registro.proveedor_nombre),
        vencimiento: fecha(registro.vencimiento || registro.fecha_vencimiento),
        estado: texto(registro.estado, "Activo"),
    };
}

function convertirProveedor(registro: Registro): ProveedorExportacion {
    return {
        id: texto(registro.id),
        nombre: texto(registro.nombre),
        ruc: texto(registro.ruc),
        telefono: texto(registro.telefono),
        whatsapp: texto(registro.whatsapp),
        correo: texto(registro.correo),
        direccion: texto(registro.direccion),
        categoria: texto(registro.categoria),
        contacto: texto(registro.contacto),
        estado: texto(registro.estado, "Activo") === "Inactivo" ? "Inactivo" : "Activo",
        observaciones: texto(registro.observaciones),
    };
}

function convertirCita(registro: Registro): CitaExportacion {
    return {
        id: texto(registro.id),
        pacienteId: texto(valor(registro, "paciente_id", "pacienteId")),
        pacienteNombre: texto(
            valor(registro, "paciente_nombre", "pacienteNombre"),
            "Paciente no registrado"
        ),
        doctorId: texto(valor(registro, "doctor_id", "doctorId")),
        doctorNombre: texto(
            valor(registro, "doctor_nombre", "doctorNombre"),
            "Doctor no registrado"
        ),
        servicioId: texto(valor(registro, "servicio_id", "servicioId")),
        servicioNombre: texto(
            valor(registro, "servicio_nombre", "servicioNombre"),
            "Servicio no registrado"
        ),
        costo: numero(registro.costo),
        fecha: fecha(registro.fecha),
        hora: hora(registro.hora || registro.creado_en),
        recurrencia: texto(registro.recurrencia, "No repetir"),
        estado: texto(registro.estado, "Programada"),
        observaciones: texto(registro.observaciones),
        creadaEn: texto(valor(registro, "creado_en", "creadaEn")),
    };
}

function convertirCuentaCobrar(registro: Registro): CuentaPorCobrarExportacion {
    return {
        id: texto(registro.id),
        ventaId: texto(valor(registro, "venta_id", "ventaId")),
        pacienteId: texto(valor(registro, "paciente_id", "pacienteId")),
        pacienteNombre: texto(
            valor(registro, "paciente_nombre", "pacienteNombre"),
            "Paciente no registrado"
        ),
        concepto: texto(registro.concepto),
        total: numero(registro.total),
        saldo: numero(registro.saldo),
        fecha: fecha(registro.fecha),
        fechaVencimiento: fecha(valor(registro, "fecha_vencimiento", "fechaVencimiento")),
        estado: texto(registro.estado, "Pendiente"),
        abonos: [],
    };
}

function convertirCuentaPagar(registro: Registro): CuentaPorPagarExportacion {
    return {
        id: texto(registro.id),
        compraId: texto(valor(registro, "compra_id", "compraId")),
        proveedorId: texto(valor(registro, "proveedor_id", "proveedorId")),
        proveedorNombre: texto(
            valor(registro, "proveedor_nombre", "proveedorNombre"),
            "Proveedor no registrado"
        ),
        concepto: texto(registro.concepto),
        total: numero(registro.total),
        saldo: numero(registro.saldo),
        fecha: fecha(registro.fecha),
        fechaVencimiento: fecha(valor(registro, "fecha_vencimiento", "fechaVencimiento")),
        estado: texto(registro.estado, "Pendiente"),
        abonos: [],
    };
}

function convertirCompra(registro: Registro): CompraProveedorExportacion {
    return {
        id: texto(registro.id),
        fecha: fecha(registro.fecha),
        hora: hora(registro.hora || registro.creado_en),
        proveedorId: texto(valor(registro, "proveedor_id", "proveedorId")),
        proveedorNombre: texto(
            valor(registro, "proveedor_nombre", "proveedorNombre"),
            "Proveedor no registrado"
        ),
        productoId: texto(valor(registro, "producto_id", "productoId")),
        productoNombre: texto(
            valor(registro, "producto_nombre", "productoNombre"),
            "Compra"
        ),
        cantidad: numero(registro.cantidad),
        costoUnitario: numero(valor(registro, "costo_unitario", "costoUnitario")),
        total: numero(registro.total),
        pagoAhora: numero(valor(registro, "pago_ahora", "pagoAhora")),
        credito: numero(registro.credito),
        metodoPago: texto(valor(registro, "metodo_pago", "metodoPago")),
        fechaVencimiento: fecha(valor(registro, "fecha_vencimiento", "fechaVencimiento")),
        estado: texto(registro.estado, "Activa"),
        usuarioNombre: texto(
            valor(registro, "usuario_nombre", "usuarioNombre"),
            "Usuario no identificado"
        ),
        observaciones: texto(registro.observaciones),
        gastoId: texto(valor(registro, "gasto_id", "gastoId")),
        cuentaPagarId: texto(valor(registro, "cuenta_pagar_id", "cuentaPagarId")),
    };
}

function convertirCierre(registro: Registro): CierreCajaExportacion {
    return {
        id: texto(registro.id),
        fecha: fecha(registro.fecha),
        hora: hora(registro.hora || registro.creado_en),
        usuarioNombre: texto(
            valor(registro, "usuario_nombre", "usuarioNombre"),
            "Usuario no identificado"
        ),
        ventasCantidad: numero(valor(registro, "ventas_cantidad", "ventasCantidad")),
        ventasBrutas: numero(valor(registro, "ventas_brutas", "ventasBrutas")),
        efectivoSistema: numero(valor(registro, "efectivo_sistema", "efectivoSistema")),
        tarjetaSistema: numero(valor(registro, "tarjeta_sistema", "tarjetaSistema")),
        transferenciaSistema: numero(
            valor(registro, "transferencia_sistema", "transferenciaSistema")
        ),
        creditoGenerado: numero(valor(registro, "credito_generado", "creditoGenerado")),
        gastosEfectivo: numero(valor(registro, "gastos_efectivo", "gastosEfectivo")),
        gastosTarjeta: numero(valor(registro, "gastos_tarjeta", "gastosTarjeta")),
        gastosTransferencia: numero(
            valor(registro, "gastos_transferencia", "gastosTransferencia")
        ),
        gastosTotal: numero(valor(registro, "gastos_total", "gastosTotal")),
        comisionPOS: numero(valor(registro, "comision_pos", "comisionPOS")),
        netoTarjeta: numero(valor(registro, "neto_tarjeta", "netoTarjeta")),
        efectivoEsperado: numero(
            valor(registro, "efectivo_esperado", "efectivoEsperado")
        ),
        efectivoContado: numero(valor(registro, "efectivo_contado", "efectivoContado")),
        tarjetaReportada: numero(
            valor(registro, "tarjeta_reportada", "tarjetaReportada")
        ),
        transferenciaReportada: numero(
            valor(registro, "transferencia_reportada", "transferenciaReportada")
        ),
        diferenciaEfectivo: numero(
            valor(registro, "diferencia_efectivo", "diferenciaEfectivo")
        ),
        diferenciaTarjeta: numero(
            valor(registro, "diferencia_tarjeta", "diferenciaTarjeta")
        ),
        diferenciaTransferencia: numero(
            valor(registro, "diferencia_transferencia", "diferenciaTransferencia")
        ),
        estado: texto(registro.estado, "Cuadrado"),
        observaciones: texto(registro.observaciones),
    };
}

function aplicarSaldosPacientes(
    pacientes: PacienteExportacion[],
    cuentasCobrar: CuentaPorCobrarExportacion[],
    citas: CitaExportacion[]
) {
    const saldoPorPaciente = new Map<string, number>();
    const ultimaCitaPorPaciente = new Map<string, string>();

    cuentasCobrar.forEach((cuenta) => {
        if (
            cuenta.pacienteId &&
            cuenta.estado !== "Pagada" &&
            cuenta.estado !== "Anulada" &&
            cuenta.saldo > 0
        ) {
            saldoPorPaciente.set(
                cuenta.pacienteId,
                (saldoPorPaciente.get(cuenta.pacienteId) || 0) + cuenta.saldo
            );
        }
    });

    citas.forEach((cita) => {
        if (!cita.pacienteId || !cita.fecha) return;

        const actual = ultimaCitaPorPaciente.get(cita.pacienteId);
        if (!actual || cita.fecha > actual) {
            ultimaCitaPorPaciente.set(cita.pacienteId, cita.fecha);
        }
    });

    return pacientes.map((paciente) => ({
        ...paciente,
        saldoPendiente: saldoPorPaciente.get(paciente.id) || 0,
        ultimaCita: ultimaCitaPorPaciente.get(paciente.id) || "",
    }));
}

export async function cargarDatosExportacionesSupabase(): Promise<DatosExportacionesSupabase> {
    const { clinicaId, esSuperAdmin } = await obtenerContextoClinica();

    const [
        pacientesRaw,
        ventasRaw,
        gastosRaw,
        productosRaw,
        proveedoresRaw,
        citasRaw,
        cuentasCobrarRaw,
        cuentasPagarRaw,
        comprasRaw,
        cierresRaw,
    ] = await Promise.all([
        consultarTabla("pacientes", clinicaId, esSuperAdmin),
        consultarTabla("ventas", clinicaId, esSuperAdmin),
        consultarTabla("gastos", clinicaId, esSuperAdmin),
        consultarTabla("productos_inventario", clinicaId, esSuperAdmin),
        consultarTabla("proveedores", clinicaId, esSuperAdmin),
        consultarTabla("citas", clinicaId, esSuperAdmin),
        consultarTabla("cuentas_cobrar", clinicaId, esSuperAdmin),
        consultarTabla("cuentas_pagar", clinicaId, esSuperAdmin),
        consultarTabla("compras_proveedores", clinicaId, esSuperAdmin),
        consultarTabla("cierres_caja", clinicaId, esSuperAdmin),
    ]);

    const ventas = ventasRaw.data.map(convertirVenta);
    const gastos = gastosRaw.data.map(convertirGasto);
    const productos = productosRaw.data.map(convertirProducto);
    const proveedores = proveedoresRaw.data.map(convertirProveedor);
    const citas = citasRaw.data.map(convertirCita);
    const cuentasCobrar = cuentasCobrarRaw.data.map(convertirCuentaCobrar);
    const cuentasPagar = cuentasPagarRaw.data.map(convertirCuentaPagar);
    const compras = comprasRaw.data.map(convertirCompra);
    const cierres = cierresRaw.data.map(convertirCierre);
    const pacientes = aplicarSaldosPacientes(
        pacientesRaw.data.map(convertirPaciente),
        cuentasCobrar,
        citas
    );

    return {
        pacientes,
        ventas,
        gastos,
        productos,
        proveedores,
        citas,
        cuentasCobrar,
        cuentasPagar,
        compras,
        cierres,
        errores: [
            pacientesRaw.error,
            ventasRaw.error,
            gastosRaw.error,
            productosRaw.error,
            proveedoresRaw.error,
            citasRaw.error,
            cuentasCobrarRaw.error,
            cuentasPagarRaw.error,
            comprasRaw.error,
            cierresRaw.error,
        ].filter(Boolean),
    };
}