export type RolUsuarioNotificacion = "ADMIN" | "DOCTOR" | "RECEPCION" | "CAJA";

export type UsuarioSesionNotificacion = {
    usuario: string;
    nombre: string;
    rol: RolUsuarioNotificacion;
};

export type PrioridadNotificacion = "Baja" | "Media" | "Alta" | "Urgente";

export type TipoNotificacion =
    | "Cita"
    | "Caja"
    | "Cobranza"
    | "Proveedor"
    | "Inventario"
    | "Respaldo"
    | "Presupuesto"
    | "Sistema";

export type NotificacionInterna = {
    id: string;
    titulo: string;
    descripcion: string;
    modulo: string;
    tipo: TipoNotificacion;
    prioridad: PrioridadNotificacion;
    fecha: string;
    href: string;
    roles: RolUsuarioNotificacion[];
};

type EstadoCita =
    | "Programada"
    | "Confirmada"
    | "En espera"
    | "En atención"
    | "Atendida"
    | "Cobrada"
    | "Reagendada"
    | "Cancelada"
    | "No asistió";

type Cita = {
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
    estado: EstadoCita;
    observaciones: string;
    creadaEn: string;
};

type EstadoVenta = "Pagada" | "Parcial" | "Crédito" | "Anulada";

type Venta = {
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
    estado: EstadoVenta;
    usuarioNombre: string;
    observaciones: string;
};

type EstadoGasto = "Activo" | "Anulado";

type Gasto = {
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
    estado: EstadoGasto;
};

type EstadoCuenta =
    | "Pendiente"
    | "Parcial"
    | "Pagada"
    | "Vencida"
    | "Anulada";

type CuentaPorCobrar = {
    id: string;
    ventaId: string;
    pacienteId: string;
    pacienteNombre: string;
    concepto: string;
    total: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuenta;
};

type CuentaPorPagar = {
    id: string;
    compraId: string;
    proveedorId: string;
    proveedorNombre: string;
    concepto: string;
    total: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuenta;
};

type Producto = {
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
    estado: "Activo" | "Inactivo";
};

type EstadoCierre = "Cuadrado" | "Con diferencia" | "Anulado";

type CierreCaja = {
    id: string;
    fecha: string;
    hora: string;
    usuarioNombre: string;
    estado: EstadoCierre;
};

type EstadoPresupuesto =
    | "Borrador"
    | "Aprobado"
    | "Rechazado"
    | "Cobrado"
    | "Anulado";

type Presupuesto = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora: string;
    total: number;
    estado: EstadoPresupuesto;
    usuarioNombre: string;
    ventaId: string;
    cuentaPorCobrarId: string;
};

type UltimoRespaldo = {
    fechaISO: string;
    generadoEn: string;
    generadoPor: string;
};

export const PRIORIDADES_NOTIFICACION: PrioridadNotificacion[] = [
    "Urgente",
    "Alta",
    "Media",
    "Baja",
];

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function sumarDias(fechaTexto: string, dias: number) {
    const [year, month, day] = fechaTexto.split("-").map(Number);
    const fecha = new Date(year, month - 1, day);
    fecha.setDate(fecha.getDate() + dias);

    const nuevoYear = fecha.getFullYear();
    const nuevoMonth = String(fecha.getMonth() + 1).padStart(2, "0");
    const nuevoDay = String(fecha.getDate()).padStart(2, "0");

    return `${nuevoYear}-${nuevoMonth}-${nuevoDay}`;
}

function fechaLocalAFecha(fechaTexto: string) {
    const [year, month, day] = fechaTexto.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function diasHasta(fechaTexto: string) {
    if (!fechaTexto) return 9999;

    const hoy = fechaLocalAFecha(fechaHoyLocal());
    const fecha = fechaLocalAFecha(fechaTexto);
    const diferencia = fecha.getTime() - hoy.getTime();

    return Math.round(diferencia / 86400000);
}

function leerLocalStorage<T>(clave: string): T[] {
    if (typeof window === "undefined") return [];

    const datos = localStorage.getItem(clave);

    if (!datos) return [];

    try {
        return JSON.parse(datos) as T[];
    } catch {
        return [];
    }
}

function leerObjetoLocalStorage<T>(clave: string): T | null {
    if (typeof window === "undefined") return null;

    const datos = localStorage.getItem(clave);

    if (!datos) return null;

    try {
        return JSON.parse(datos) as T;
    } catch {
        return null;
    }
}

function formatoMoneda(valor: number) {
    return `C$ ${(valor || 0).toLocaleString("es-NI")}`;
}

function pesoPrioridad(prioridad: PrioridadNotificacion) {
    if (prioridad === "Urgente") return 4;
    if (prioridad === "Alta") return 3;
    if (prioridad === "Media") return 2;
    return 1;
}

export function generarNotificacionesSistema(
    usuario: UsuarioSesionNotificacion | null
): NotificacionInterna[] {
    if (!usuario) return [];

    const hoy = fechaHoyLocal();
    const manana = sumarDias(hoy, 1);

    const citas = leerLocalStorage<Cita>("citas_sistema_clinico");
    const ventas = leerLocalStorage<Venta>("ventas_sistema_clinico");
    const gastos = leerLocalStorage<Gasto>("gastos_sistema_clinico");
    const cuentasCobrar = leerLocalStorage<CuentaPorCobrar>(
        "cuentas_cobrar_sistema_clinico"
    );
    const cuentasPagar = leerLocalStorage<CuentaPorPagar>(
        "cuentas_pagar_sistema_clinico"
    );
    const productos = leerLocalStorage<Producto>("productos_sistema_clinico");
    const cierres = leerLocalStorage<CierreCaja>("cierres_caja_sistema_clinico");
    const presupuestos = leerLocalStorage<Presupuesto>(
        "presupuestos_sistema_clinico"
    );
    const ultimoRespaldo = leerObjetoLocalStorage<UltimoRespaldo>(
        "ultimo_respaldo_sistema_clinico"
    );

    const notificaciones: NotificacionInterna[] = [];

    const ventasActivas = ventas.filter((venta) => venta.estado !== "Anulada");

    citas
        .filter(
            (cita) =>
                cita.fecha === hoy &&
                cita.estado !== "Cancelada" &&
                cita.estado !== "No asistió" &&
                cita.estado !== "Cobrada"
        )
        .forEach((cita) => {
            notificaciones.push({
                id: `CITA-HOY-${cita.id}`,
                titulo: `Cita hoy a las ${cita.hora}`,
                descripcion: `${cita.pacienteNombre} · ${cita.servicioNombre} con ${cita.doctorNombre}. Estado: ${cita.estado}.`,
                modulo: "Agenda Médica",
                tipo: "Cita",
                prioridad:
                    cita.estado === "En espera" || cita.estado === "En atención"
                        ? "Alta"
                        : "Media",
                fecha: cita.fecha,
                href: "/agenda",
                roles: ["ADMIN", "DOCTOR", "RECEPCION"],
            });
        });

    citas
        .filter(
            (cita) =>
                cita.fecha === manana &&
                cita.estado !== "Cancelada" &&
                cita.estado !== "No asistió"
        )
        .slice(0, 6)
        .forEach((cita) => {
            notificaciones.push({
                id: `CITA-MANANA-${cita.id}`,
                titulo: `Cita mañana a las ${cita.hora}`,
                descripcion: `${cita.pacienteNombre} · ${cita.servicioNombre}. Puedes confirmarla con anticipación.`,
                modulo: "Agenda Médica",
                tipo: "Cita",
                prioridad: "Baja",
                fecha: cita.fecha,
                href: "/agenda",
                roles: ["ADMIN", "DOCTOR", "RECEPCION"],
            });
        });

    citas
        .filter((cita) => cita.estado === "Atendida")
        .filter((cita) => {
            const yaTieneVenta = ventasActivas.some((venta) => venta.citaId === cita.id);
            return !yaTieneVenta;
        })
        .forEach((cita) => {
            notificaciones.push({
                id: `CITA-SIN-COBRO-${cita.id}`,
                titulo: "Cita atendida pendiente de cobro",
                descripcion: `${cita.pacienteNombre} fue atendido por ${cita.servicioNombre}. Costo: ${formatoMoneda(
                    cita.costo
                )}.`,
                modulo: "Caja y Venta",
                tipo: "Caja",
                prioridad: "Alta",
                fecha: cita.fecha,
                href: "/caja",
                roles: ["ADMIN", "RECEPCION", "CAJA"],
            });
        });

    cuentasCobrar
        .filter(
            (cuenta) =>
                cuenta.estado !== "Pagada" &&
                cuenta.estado !== "Anulada" &&
                cuenta.fechaVencimiento &&
                cuenta.fechaVencimiento < hoy
        )
        .forEach((cuenta) => {
            notificaciones.push({
                id: `CXC-VENCIDA-${cuenta.id}`,
                titulo: "Cuenta por cobrar vencida",
                descripcion: `${cuenta.pacienteNombre} debe ${formatoMoneda(
                    cuenta.saldo
                )}. Venció el ${cuenta.fechaVencimiento}.`,
                modulo: "Cuentas por cobrar",
                tipo: "Cobranza",
                prioridad: "Urgente",
                fecha: cuenta.fechaVencimiento,
                href: "/reportes",
                roles: ["ADMIN", "RECEPCION", "CAJA"],
            });
        });

    cuentasPagar
        .filter(
            (cuenta) =>
                cuenta.estado !== "Pagada" &&
                cuenta.estado !== "Anulada" &&
                cuenta.fechaVencimiento &&
                cuenta.fechaVencimiento < hoy
        )
        .forEach((cuenta) => {
            notificaciones.push({
                id: `CXP-VENCIDA-${cuenta.id}`,
                titulo: "Cuenta por pagar vencida",
                descripcion: `${cuenta.proveedorNombre} tiene saldo pendiente de ${formatoMoneda(
                    cuenta.saldo
                )}. Venció el ${cuenta.fechaVencimiento}.`,
                modulo: "Proveedores",
                tipo: "Proveedor",
                prioridad: "Urgente",
                fecha: cuenta.fechaVencimiento,
                href: "/proveedores",
                roles: ["ADMIN"],
            });
        });

    productos
        .filter(
            (producto) =>
                producto.estado === "Activo" && producto.stock <= producto.stockMinimo
        )
        .forEach((producto) => {
            notificaciones.push({
                id: `BAJO-STOCK-${producto.id}`,
                titulo: "Producto con bajo stock",
                descripcion: `${producto.nombre} tiene ${producto.stock} ${producto.unidad}. Stock mínimo: ${producto.stockMinimo}.`,
                modulo: "Inventario",
                tipo: "Inventario",
                prioridad: producto.stock <= 0 ? "Urgente" : "Alta",
                fecha: hoy,
                href: "/inventario",
                roles: ["ADMIN"],
            });
        });

    productos
        .filter((producto) => {
            if (producto.estado !== "Activo") return false;
            if (!producto.vencimiento) return false;

            const dias = diasHasta(producto.vencimiento);
            return dias >= 0 && dias <= 60;
        })
        .forEach((producto) => {
            const dias = diasHasta(producto.vencimiento);

            notificaciones.push({
                id: `PRODUCTO-VENCE-${producto.id}`,
                titulo: "Producto próximo a vencer",
                descripcion: `${producto.nombre} vence el ${producto.vencimiento}. Faltan ${dias} día(s).`,
                modulo: "Inventario",
                tipo: "Inventario",
                prioridad: dias <= 15 ? "Alta" : "Media",
                fecha: producto.vencimiento,
                href: "/inventario",
                roles: ["ADMIN"],
            });
        });

    const ventasHoy = ventasActivas.filter((venta) => venta.fecha === hoy);
    const gastosHoy = gastos.filter(
        (gasto) => gasto.fecha === hoy && gasto.estado !== "Anulado"
    );
    const cierreHoy = cierres.find(
        (cierre) => cierre.fecha === hoy && cierre.estado !== "Anulado"
    );

    if ((ventasHoy.length > 0 || gastosHoy.length > 0) && !cierreHoy) {
        notificaciones.push({
            id: `CIERRE-PENDIENTE-${hoy}`,
            titulo: "Cierre de caja pendiente",
            descripcion: `Hoy hay ${ventasHoy.length} venta(s) y ${gastosHoy.length} gasto(s). Aún no hay cierre de caja activo.`,
            modulo: "Cierre de Caja",
            tipo: "Caja",
            prioridad: "Alta",
            fecha: hoy,
            href: "/cierre-caja",
            roles: ["ADMIN", "CAJA"],
        });
    }

    presupuestos
        .filter((presupuesto) => presupuesto.estado === "Aprobado")
        .forEach((presupuesto) => {
            notificaciones.push({
                id: `PRESUPUESTO-APROBADO-${presupuesto.id}`,
                titulo: "Presupuesto aprobado pendiente de cobro",
                descripcion: `${presupuesto.pacienteNombre} tiene presupuesto aprobado por ${formatoMoneda(
                    presupuesto.total
                )}.`,
                modulo: "Presupuestos",
                tipo: "Presupuesto",
                prioridad: "Media",
                fecha: presupuesto.fecha,
                href: `/pacientes/${presupuesto.pacienteId}/presupuestos`,
                roles: ["ADMIN", "RECEPCION", "CAJA"],
            });
        });

    if (usuario.rol === "ADMIN") {
        if (!ultimoRespaldo?.fechaISO) {
            notificaciones.push({
                id: "RESPALDO-NUNCA",
                titulo: "Respaldo recomendado",
                descripcion:
                    "Todavía no hay registro de respaldo descargado. Haz un respaldo completo para proteger la información.",
                modulo: "Respaldo",
                tipo: "Respaldo",
                prioridad: "Alta",
                fecha: hoy,
                href: "/respaldo",
                roles: ["ADMIN"],
            });
        } else {
            const fechaUltimo = new Date(ultimoRespaldo.fechaISO);
            const ahora = new Date();
            const diasDesde =
                (ahora.getTime() - fechaUltimo.getTime()) / 86400000;

            if (diasDesde >= 1) {
                notificaciones.push({
                    id: "RESPALDO-ANTIGUO",
                    titulo: "Respaldo pendiente",
                    descripcion: `El último respaldo fue: ${ultimoRespaldo.generadoEn}. Se recomienda respaldar al finalizar cada día.`,
                    modulo: "Respaldo",
                    tipo: "Respaldo",
                    prioridad: diasDesde >= 3 ? "Alta" : "Media",
                    fecha: hoy,
                    href: "/respaldo",
                    roles: ["ADMIN"],
                });
            }
        }
    }

    return notificaciones
        .filter((notificacion) => notificacion.roles.includes(usuario.rol))
        .sort((a, b) => {
            const prioridad = pesoPrioridad(b.prioridad) - pesoPrioridad(a.prioridad);

            if (prioridad !== 0) return prioridad;

            return b.fecha.localeCompare(a.fecha);
        });
}