import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type NivelAuditoriaSupabase = "Info" | "Éxito" | "Advertencia" | "Crítico";

export type ModuloAuditoriaSupabase =
    | "Agenda"
    | "Pacientes"
    | "Caja"
    | "Gastos"
    | "Inventario"
    | "Proveedores"
    | "Cierre de Caja"
    | "Administración"
    | "Respaldo"
    | "Cuentas por Cobrar"
    | "Cuentas por Pagar"
    | "Sistema"
    | "Documentos"
    | "Odontograma"
    | "Presupuestos"
    | "Órdenes de estudio";

export type EventoAuditoriaSupabase = {
    id: string;
    fecha: string;
    hora: string;
    modulo: ModuloAuditoriaSupabase;
    accion: string;
    detalle: string;
    usuarioNombre: string;
    nivel: NivelAuditoriaSupabase;
    referencia: string;
    monto: number;
    origen: "Real" | "Derivado";
};

export type FormularioAuditoriaSupabase = {
    modulo: ModuloAuditoriaSupabase;
    accion: string;
    detalle?: string;
    nivel?: NivelAuditoriaSupabase;
    referencia?: string;
    referencia_id?: string;
    monto?: number;
    metadata?: Record<string, unknown>;
};

type RegistroGenerico = Record<string, unknown>;

type ResultadoAuditoria = {
    eventos: EventoAuditoriaSupabase[];
    errores: string[];
};

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function texto(valor: unknown, respaldo = "") {
    const convertido = String(valor ?? "").trim();

    return convertido || respaldo;
}

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function fechaDe(registro: RegistroGenerico) {
    const fecha = texto(registro.fecha);

    if (fecha) return fecha.slice(0, 10);

    const creadoEn = texto(registro.creado_en || registro.creada_en || registro.actualizado_en);

    if (creadoEn && creadoEn.length >= 10) return creadoEn.slice(0, 10);

    return fechaHoyLocal();
}

function horaDe(registro: RegistroGenerico) {
    const hora = texto(registro.hora);

    if (hora) return hora.slice(0, 5);

    const creadoEn = texto(registro.creado_en || registro.creada_en || registro.actualizado_en);

    if (creadoEn && creadoEn.includes("T")) {
        return creadoEn.slice(11, 16);
    }

    return "00:00";
}

function estadoVisualCuenta(fechaVencimiento: string, estado: string) {
    if (estado === "Pagada" || estado === "Anulada") return estado;

    if (fechaVencimiento && fechaVencimiento < fechaHoyLocal()) {
        return "Vencida";
    }

    return estado || "Pendiente";
}

function normalizarModulo(valor: unknown): ModuloAuditoriaSupabase {
    const modulo = texto(valor, "Sistema");

    const modulos: ModuloAuditoriaSupabase[] = [
        "Agenda",
        "Pacientes",
        "Caja",
        "Gastos",
        "Inventario",
        "Proveedores",
        "Cierre de Caja",
        "Administración",
        "Respaldo",
        "Cuentas por Cobrar",
        "Cuentas por Pagar",
        "Sistema",
        "Documentos",
        "Odontograma",
        "Presupuestos",
        "Órdenes de estudio",
    ];

    return modulos.includes(modulo as ModuloAuditoriaSupabase)
        ? (modulo as ModuloAuditoriaSupabase)
        : "Sistema";
}

function normalizarNivel(valor: unknown): NivelAuditoriaSupabase {
    const nivel = texto(valor, "Info");

    if (
        nivel === "Info" ||
        nivel === "Éxito" ||
        nivel === "Advertencia" ||
        nivel === "Crítico"
    ) {
        return nivel;
    }

    return "Info";
}

function crearEvento(
    data: Omit<EventoAuditoriaSupabase, "fecha" | "hora" | "origen"> & {
        fecha?: string;
        hora?: string;
        origen?: "Real" | "Derivado";
    }
): EventoAuditoriaSupabase {
    return {
        ...data,
        fecha: data.fecha || fechaHoyLocal(),
        hora: data.hora || "00:00",
        origen: data.origen || "Derivado",
    };
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();

    if (error || !perfil) {
        throw new Error("No se encontró el perfil activo del usuario.");
    }

    return {
        perfil,
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

        const { data, error } = await consulta.limit(3000);

        if (error) {
            return {
                data: [] as RegistroGenerico[],
                error: `${tabla}: ${error.message}`,
            };
        }

        return {
            data: (data || []) as RegistroGenerico[],
            error: "",
        };
    } catch (errorActual) {
        return {
            data: [] as RegistroGenerico[],
            error:
                errorActual instanceof Error
                    ? `${tabla}: ${errorActual.message}`
                    : `${tabla}: error desconocido`,
        };
    }
}

function eventosAuditoriaReal(registros: RegistroGenerico[]) {
    return registros.map((registro) =>
        crearEvento({
            id: `AUD-REAL-${texto(registro.id, crypto.randomUUID())}`,
            fecha: fechaDe(registro),
            hora: horaDe(registro),
            modulo: normalizarModulo(registro.modulo),
            accion: texto(registro.accion, "Evento registrado"),
            detalle: texto(registro.detalle, "Sin detalle registrado."),
            usuarioNombre: texto(registro.usuario_nombre, "Usuario no identificado"),
            nivel: normalizarNivel(registro.nivel),
            referencia: texto(registro.referencia || registro.referencia_id || registro.id),
            monto: numero(registro.monto),
            origen: "Real",
        })
    );
}

function eventosVentas(ventas: RegistroGenerico[]) {
    return ventas.map((venta) => {
        const estado = texto(venta.estado, "Pagada");
        const credito = numero(venta.credito);

        return crearEvento({
            id: `AUD-VENTA-${texto(venta.id)}`,
            fecha: fechaDe(venta),
            hora: horaDe(venta),
            modulo: "Caja",
            accion:
                estado === "Anulada"
                    ? "Venta anulada"
                    : credito > 0
                        ? "Venta con crédito"
                        : "Venta registrada",
            detalle: `${texto(venta.cliente_nombre || venta.clienteNombre, "Cliente no registrado")} · ${texto(venta.concepto, "Sin concepto")}`,
            usuarioNombre: texto(venta.usuario_nombre || venta.usuarioNombre, "Usuario no identificado"),
            nivel:
                estado === "Anulada"
                    ? "Crítico"
                    : credito > 0
                        ? "Advertencia"
                        : "Éxito",
            referencia: texto(venta.id),
            monto: numero(venta.total),
        });
    });
}

function eventosGastos(gastos: RegistroGenerico[]) {
    return gastos.map((gasto) => {
        const estado = texto(gasto.estado, "Activo");

        return crearEvento({
            id: `AUD-GASTO-${texto(gasto.id)}`,
            fecha: fechaDe(gasto),
            hora: horaDe(gasto),
            modulo: "Gastos",
            accion: estado === "Anulado" ? "Gasto anulado" : "Gasto registrado",
            detalle: `${texto(gasto.categoria, "Gasto")} · ${texto(gasto.descripcion, "Sin descripción")}`,
            usuarioNombre: texto(gasto.usuario_nombre || gasto.usuarioNombre, "Usuario no identificado"),
            nivel: estado === "Anulado" ? "Crítico" : "Info",
            referencia: texto(gasto.id),
            monto: numero(gasto.monto),
        });
    });
}

function eventosMovimientosInventario(movimientos: RegistroGenerico[]) {
    return movimientos.map((movimiento) => {
        const tipo = texto(movimiento.tipo, "Movimiento");
        const cantidad = numero(movimiento.cantidad);
        const costoUnitario = numero(movimiento.costo_unitario || movimiento.costoUnitario);

        return crearEvento({
            id: `AUD-MOV-${texto(movimiento.id)}`,
            fecha: fechaDe(movimiento),
            hora: horaDe(movimiento),
            modulo: "Inventario",
            accion: `Movimiento de inventario: ${tipo}`,
            detalle: `${texto(movimiento.producto_nombre || movimiento.productoNombre, "Producto")} · Stock ${numero(movimiento.stock_anterior || movimiento.stockAnterior)} → ${numero(movimiento.stock_nuevo || movimiento.stockNuevo)}. ${texto(movimiento.motivo)}`,
            usuarioNombre: texto(movimiento.usuario_nombre || movimiento.usuarioNombre, "Usuario no identificado"),
            nivel:
                tipo === "Pérdida"
                    ? "Crítico"
                    : tipo === "Ajuste"
                        ? "Advertencia"
                        : "Info",
            referencia: texto(movimiento.id),
            monto: cantidad * costoUnitario,
        });
    });
}

function eventosCompras(compras: RegistroGenerico[]) {
    return compras.map((compra) => {
        const estado = texto(compra.estado, "Activa");
        const credito = numero(compra.credito);

        return crearEvento({
            id: `AUD-COMPRA-${texto(compra.id)}`,
            fecha: fechaDe(compra),
            hora: horaDe(compra),
            modulo: "Proveedores",
            accion:
                estado === "Anulada"
                    ? "Compra anulada"
                    : credito > 0
                        ? "Compra a crédito"
                        : "Compra registrada",
            detalle: `${texto(compra.proveedor_nombre || compra.proveedorNombre, "Proveedor")} · ${texto(compra.producto_nombre || compra.productoNombre, "Producto")} · Cantidad ${numero(compra.cantidad)}`,
            usuarioNombre: texto(compra.usuario_nombre || compra.usuarioNombre, "Usuario no identificado"),
            nivel:
                estado === "Anulada"
                    ? "Crítico"
                    : credito > 0
                        ? "Advertencia"
                        : "Éxito",
            referencia: texto(compra.id),
            monto: numero(compra.total),
        });
    });
}

function eventosCierres(cierres: RegistroGenerico[]) {
    return cierres.map((cierre) => {
        const estado = texto(cierre.estado, "Cuadrado");
        const diferencia =
            numero(cierre.diferencia_efectivo || cierre.diferenciaEfectivo) +
            numero(cierre.diferencia_tarjeta || cierre.diferenciaTarjeta) +
            numero(cierre.diferencia_transferencia || cierre.diferenciaTransferencia);

        return crearEvento({
            id: `AUD-CIERRE-${texto(cierre.id)}`,
            fecha: fechaDe(cierre),
            hora: horaDe(cierre),
            modulo: "Cierre de Caja",
            accion: estado === "Cuadrado" ? "Cierre cuadrado" : "Cierre con diferencia",
            detalle: `Ventas: ${numero(cierre.ventas_cantidad || cierre.ventasCantidad)}. Bruto: ${numero(cierre.ventas_brutas || cierre.ventasBrutas)}. Gastos: ${numero(cierre.gastos_total || cierre.gastosTotal)}. Diferencia: ${diferencia}`,
            usuarioNombre: texto(cierre.usuario_nombre || cierre.usuarioNombre, "Usuario no identificado"),
            nivel: estado === "Cuadrado" ? "Éxito" : "Advertencia",
            referencia: texto(cierre.id),
            monto: diferencia,
        });
    });
}

function eventosCitas(citas: RegistroGenerico[]) {
    return citas.map((cita) => {
        const estado = texto(cita.estado, "Programada");

        return crearEvento({
            id: `AUD-CITA-${texto(cita.id)}`,
            fecha: fechaDe(cita),
            hora: horaDe(cita),
            modulo: "Agenda",
            accion:
                estado === "Cancelada" || estado === "No asistió"
                    ? `Cita ${estado.toLowerCase()}`
                    : `Cita en estado ${estado}`,
            detalle: `${texto(cita.paciente_nombre || cita.pacienteNombre, "Paciente")} · ${texto(cita.servicio_nombre || cita.servicioNombre, "Servicio")} · ${texto(cita.doctor_nombre || cita.doctorNombre, "Doctor")}`,
            usuarioNombre: texto(cita.usuario_nombre || cita.usuarioNombre, "Sistema"),
            nivel:
                estado === "Cancelada" || estado === "No asistió"
                    ? "Advertencia"
                    : estado === "Cobrada" || estado === "Atendida"
                        ? "Éxito"
                        : "Info",
            referencia: texto(cita.id),
            monto: numero(cita.costo),
        });
    });
}

function eventosUsuarios(usuarios: RegistroGenerico[]) {
    return usuarios.map((usuario) => {
        const estado = texto(usuario.estado, "Activo");

        return crearEvento({
            id: `AUD-USUARIO-${texto(usuario.id)}`,
            fecha: fechaDe(usuario),
            hora: horaDe(usuario),
            modulo: "Administración",
            accion:
                estado === "Activo"
                    ? "Usuario activo registrado"
                    : "Usuario inactivo registrado",
            detalle: `${texto(usuario.nombre, "Usuario")} · Rol ${texto(usuario.rol)} · Acceso ${texto(usuario.usuario || usuario.correo)}`,
            usuarioNombre: "Administrador",
            nivel: estado === "Activo" ? "Info" : "Advertencia",
            referencia: texto(usuario.id),
            monto: 0,
        });
    });
}

function eventosCuentasCobrar(cuentas: RegistroGenerico[]) {
    return cuentas.map((cuenta) => {
        const estadoVisual = estadoVisualCuenta(
            texto(cuenta.fecha_vencimiento || cuenta.fechaVencimiento),
            texto(cuenta.estado, "Pendiente")
        );

        return crearEvento({
            id: `AUD-CXC-${texto(cuenta.id)}`,
            fecha: fechaDe(cuenta),
            hora: horaDe(cuenta),
            modulo: "Cuentas por Cobrar",
            accion: `Cuenta por cobrar ${estadoVisual.toLowerCase()}`,
            detalle: `${texto(cuenta.paciente_nombre || cuenta.pacienteNombre, "Paciente")} · ${texto(cuenta.concepto, "Cuenta por cobrar")}`,
            usuarioNombre: texto(cuenta.usuario_nombre || cuenta.usuarioNombre, "Sistema"),
            nivel:
                estadoVisual === "Vencida"
                    ? "Crítico"
                    : estadoVisual === "Pagada"
                        ? "Éxito"
                        : "Advertencia",
            referencia: texto(cuenta.id),
            monto: numero(cuenta.saldo),
        });
    });
}

function eventosCuentasPagar(cuentas: RegistroGenerico[]) {
    return cuentas.map((cuenta) => {
        const estadoVisual = estadoVisualCuenta(
            texto(cuenta.fecha_vencimiento || cuenta.fechaVencimiento),
            texto(cuenta.estado, "Pendiente")
        );

        return crearEvento({
            id: `AUD-CXP-${texto(cuenta.id)}`,
            fecha: fechaDe(cuenta),
            hora: horaDe(cuenta),
            modulo: "Cuentas por Pagar",
            accion: `Cuenta por pagar ${estadoVisual.toLowerCase()}`,
            detalle: `${texto(cuenta.proveedor_nombre || cuenta.proveedorNombre, "Proveedor")} · ${texto(cuenta.concepto, "Cuenta por pagar")}`,
            usuarioNombre: texto(cuenta.usuario_nombre || cuenta.usuarioNombre, "Sistema"),
            nivel:
                estadoVisual === "Vencida"
                    ? "Crítico"
                    : estadoVisual === "Pagada"
                        ? "Éxito"
                        : "Advertencia",
            referencia: texto(cuenta.id),
            monto: numero(cuenta.saldo),
        });
    });
}

function eventosAbonosCobrar(abonos: RegistroGenerico[]) {
    return abonos.map((abono) =>
        crearEvento({
            id: `AUD-ABONO-CXC-${texto(abono.id)}`,
            fecha: fechaDe(abono),
            hora: horaDe(abono),
            modulo: "Cuentas por Cobrar",
            accion: "Abono recibido",
            detalle: `${texto(abono.paciente_nombre || abono.pacienteNombre, "Paciente")} · Método ${texto(abono.metodo, "No registrado")}. ${texto(abono.observaciones)}`,
            usuarioNombre: texto(abono.usuario_nombre || abono.usuarioNombre, "Usuario no identificado"),
            nivel: texto(abono.estado) === "Anulado" ? "Crítico" : "Éxito",
            referencia: texto(abono.id),
            monto: numero(abono.monto),
        })
    );
}

function eventosAbonosPagar(abonos: RegistroGenerico[]) {
    return abonos.map((abono) =>
        crearEvento({
            id: `AUD-ABONO-CXP-${texto(abono.id)}`,
            fecha: fechaDe(abono),
            hora: horaDe(abono),
            modulo: "Cuentas por Pagar",
            accion: "Abono a proveedor",
            detalle: `${texto(abono.proveedor_nombre || abono.proveedorNombre, "Proveedor")} · Método ${texto(abono.metodo, "No registrado")}. ${texto(abono.observaciones)}`,
            usuarioNombre: texto(abono.usuario_nombre || abono.usuarioNombre, "Usuario no identificado"),
            nivel: texto(abono.estado) === "Anulado" ? "Crítico" : "Éxito",
            referencia: texto(abono.id),
            monto: numero(abono.monto),
        })
    );
}

function eventosDocumentos(documentos: RegistroGenerico[]) {
    return documentos.map((documento) =>
        crearEvento({
            id: `AUD-DOC-${texto(documento.id)}`,
            fecha: fechaDe(documento),
            hora: horaDe(documento),
            modulo: "Documentos",
            accion: "Documento adjuntado",
            detalle: `${texto(documento.paciente_nombre || documento.pacienteNombre, "Paciente")} · ${texto(documento.categoria, "Documento")} · ${texto(documento.nombre_archivo || documento.nombreArchivo)}`,
            usuarioNombre: texto(documento.usuario_nombre || documento.usuarioNombre, "Usuario no identificado"),
            nivel: "Info",
            referencia: texto(documento.id),
            monto: 0,
        })
    );
}

function eventosPresupuestos(presupuestos: RegistroGenerico[]) {
    return presupuestos.map((presupuesto) =>
        crearEvento({
            id: `AUD-PRES-${texto(presupuesto.id)}`,
            fecha: fechaDe(presupuesto),
            hora: horaDe(presupuesto),
            modulo: "Presupuestos",
            accion: `Presupuesto ${texto(presupuesto.estado, "registrado").toLowerCase()}`,
            detalle: `${texto(presupuesto.paciente_nombre || presupuesto.pacienteNombre, "Paciente")} · ${texto(presupuesto.origen, "Manual")}`,
            usuarioNombre: texto(presupuesto.usuario_nombre || presupuesto.usuarioNombre, "Usuario no identificado"),
            nivel:
                texto(presupuesto.estado) === "Rechazado"
                    ? "Advertencia"
                    : texto(presupuesto.estado) === "Convertido a venta"
                        ? "Éxito"
                        : "Info",
            referencia: texto(presupuesto.id),
            monto: numero(presupuesto.total),
        })
    );
}

function eventosOrdenesEstudio(ordenes: RegistroGenerico[]) {
    return ordenes.map((orden) =>
        crearEvento({
            id: `AUD-ORDEN-${texto(orden.id)}`,
            fecha: fechaDe(orden),
            hora: horaDe(orden),
            modulo: "Órdenes de estudio",
            accion:
                texto(orden.estado, "Activa") === "Anulada"
                    ? "Orden de estudio anulada"
                    : "Orden de estudio emitida",
            detalle: `${texto(orden.paciente_nombre || orden.pacienteNombre, "Paciente")} · ${texto(orden.tipo_estudio || orden.tipoEstudio, "Estudio")} · ${texto(orden.zona)}`,
            usuarioNombre: texto(orden.usuario_nombre || orden.usuarioNombre || orden.doctor, "Usuario no identificado"),
            nivel: texto(orden.estado, "Activa") === "Anulada" ? "Crítico" : "Info",
            referencia: texto(orden.id),
            monto: 0,
        })
    );
}

function eventosOdontograma(historial: RegistroGenerico[]) {
    return historial.map((item) =>
        crearEvento({
            id: `AUD-ODONTO-${texto(item.id)}`,
            fecha: fechaDe(item),
            hora: horaDe(item),
            modulo: "Odontograma",
            accion: "Odontograma actualizado",
            detalle: `Pieza ${texto(item.pieza_codigo || item.piezaCodigo || item.codigo_local, "No especificada")} · ${texto(item.cara, "cara")} · ${texto(item.estado, "estado")}. ${texto(item.nota)}`,
            usuarioNombre: texto(item.usuario_nombre || item.usuarioNombre, "Usuario no identificado"),
            nivel: "Info",
            referencia: texto(item.id),
            monto: 0,
        })
    );
}

export async function listarEventosAuditoriaSupabase(): Promise<ResultadoAuditoria> {
    const { clinicaId, esSuperAdmin } = await obtenerContextoClinica();

    const consultas = await Promise.all([
        consultarTabla("auditoria", clinicaId, esSuperAdmin),
        consultarTabla("ventas", clinicaId, esSuperAdmin),
        consultarTabla("gastos", clinicaId, esSuperAdmin),
        consultarTabla("movimientos_inventario", clinicaId, esSuperAdmin),
        consultarTabla("compras_proveedores", clinicaId, esSuperAdmin),
        consultarTabla("cierres_caja", clinicaId, esSuperAdmin),
        consultarTabla("citas", clinicaId, esSuperAdmin),
        consultarTabla("usuarios_perfiles", clinicaId, esSuperAdmin),
        consultarTabla("cuentas_cobrar", clinicaId, esSuperAdmin),
        consultarTabla("cuentas_pagar", clinicaId, esSuperAdmin),
        consultarTabla("abonos_cuentas_cobrar", clinicaId, esSuperAdmin),
        consultarTabla("abonos_cuentas_pagar", clinicaId, esSuperAdmin),
        consultarTabla("documentos_pacientes", clinicaId, esSuperAdmin),
        consultarTabla("presupuestos", clinicaId, esSuperAdmin),
        consultarTabla("ordenes_estudio", clinicaId, esSuperAdmin),
        consultarTabla("odontograma_historial", clinicaId, esSuperAdmin),
    ]);

    const [
        auditoria,
        ventas,
        gastos,
        movimientos,
        compras,
        cierres,
        citas,
        usuarios,
        cuentasCobrar,
        cuentasPagar,
        abonosCobrar,
        abonosPagar,
        documentos,
        presupuestos,
        ordenesEstudio,
        odontogramaHistorial,
    ] = consultas;

    const eventos = [
        ...eventosAuditoriaReal(auditoria.data),
        ...eventosVentas(ventas.data),
        ...eventosGastos(gastos.data),
        ...eventosMovimientosInventario(movimientos.data),
        ...eventosCompras(compras.data),
        ...eventosCierres(cierres.data),
        ...eventosCitas(citas.data),
        ...eventosUsuarios(usuarios.data),
        ...eventosCuentasCobrar(cuentasCobrar.data),
        ...eventosCuentasPagar(cuentasPagar.data),
        ...eventosAbonosCobrar(abonosCobrar.data),
        ...eventosAbonosPagar(abonosPagar.data),
        ...eventosDocumentos(documentos.data),
        ...eventosPresupuestos(presupuestos.data),
        ...eventosOrdenesEstudio(ordenesEstudio.data),
        ...eventosOdontograma(odontogramaHistorial.data),
    ].sort((a, b) =>
        `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
    );

    const errores = consultas
        .map((consulta) => consulta.error)
        .filter(Boolean);

    return { eventos, errores };
}

export async function registrarEventoAuditoriaSupabase(
    formulario: FormularioAuditoriaSupabase
) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    if (!clinicaId) return null;

    const { data, error } = await supabase
        .from("auditoria")
        .insert({
            clinica_id: clinicaId,
            modulo: formulario.modulo,
            accion: texto(formulario.accion),
            detalle: texto(formulario.detalle),
            nivel: formulario.nivel || "Info",
            referencia: texto(formulario.referencia),
            referencia_id: texto(formulario.referencia_id),
            monto: numero(formulario.monto),
            metadata: formulario.metadata || {},
        })
        .select("*")
        .single();

    if (error) throw new Error(error.message);

    return data;
}
