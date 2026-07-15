"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BadgeDollarSign,
    Banknote,
    CalendarDays,
    CheckCircle2,
    CreditCard,
    Database,
    Download,
    FileText,
    FolderArchive,
    Package,
    ReceiptText,
    RefreshCcw,
    Search,
    ShieldAlert,
    Table2,
    Truck,
    Users,
    Wallet,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

type TipoColumnaExcel = "texto" | "numero" | "moneda" | "fecha" | "estado";

type ColumnaExcel = {
    encabezado: string;
    key: string;
    ancho?: number;
    tipo?: TipoColumnaExcel;
    total?: boolean;
};

type DataSetExcel = {
    id: string;
    titulo: string;
    hoja: string;
    descripcion: string;
    columnas: ColumnaExcel[];
    filas: Record<string, string | number | null | undefined>[];
};

type ResumenItem = {
    seccion: string;
    indicador: string;
    valor: string | number;
    comentario: string;
};

type Paciente = {
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
    estado: "Activo" | "Inactivo";
    saldoPendiente: number;
    ultimaCita: string;
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
    productoId?: string;
    productoNombre?: string;
    cantidadProducto?: number;
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

type EstadoProducto = "Activo" | "Inactivo";

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
    estado: EstadoProducto;
};

type Proveedor = {
    id: string;
    nombre: string;
    ruc: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    direccion: string;
    categoria: string;
    contacto: string;
    estado: "Activo" | "Inactivo";
    observaciones: string;
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

type EstadoCuenta = "Pendiente" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

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
    abonos: unknown[];
};

type EstadoCuentaPagar =
    | "Pendiente"
    | "Parcial"
    | "Pagada"
    | "Vencida"
    | "Anulada";

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
    estado: EstadoCuentaPagar;
    abonos: unknown[];
};

type EstadoCompra = "Activa" | "Anulada";

type CompraProveedor = {
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
    estado: EstadoCompra;
    usuarioNombre: string;
    observaciones: string;
    gastoId: string;
    cuentaPagarId: string;
};

type CierreCaja = {
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
    estado: "Cuadrado" | "Con diferencia";
    observaciones: string;
};

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function mesActualLocal() {
    return fechaHoyLocal().slice(0, 7);
}

function leerLocalStorage<T>(clave: string, valorInicial: T): T {
    if (typeof window === "undefined") return valorInicial;

    try {
        const datos = localStorage.getItem(clave);

        if (!datos) return valorInicial;

        return JSON.parse(datos) as T;
    } catch {
        return valorInicial;
    }
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatoExcelMoneda(simbolo: string) {
    return `"${simbolo}" #,##0.00`;
}

function nombreHojaSeguro(nombre: string) {
    return nombre.replace(/[\\/*?:[\]]/g, " ").slice(0, 31);
}

function nombreArchivoSeguro(nombre: string) {
    return nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function columnaExcel(numeroColumna: number) {
    let resultado = "";
    let numero = numeroColumna;

    while (numero > 0) {
        const residuo = (numero - 1) % 26;
        resultado = String.fromCharCode(65 + residuo) + resultado;
        numero = Math.floor((numero - residuo) / 26);
    }

    return resultado;
}

function valorCelda(valor: unknown) {
    if (valor === null || valor === undefined || valor === "") return "No registrado";
    return valor as string | number;
}

function aplicarEstiloEstado(cell: any) {
    const valor = String(cell.value || "").toLowerCase();

    if (
        valor.includes("anulad") ||
        valor.includes("vencid") ||
        valor.includes("inactivo") ||
        valor.includes("cancelad") ||
        valor.includes("no asistió")
    ) {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEE2E2" },
        };
        cell.font = { color: { argb: "FF991B1B" }, bold: true };
        return;
    }

    if (
        valor.includes("pagad") ||
        valor.includes("activo") ||
        valor.includes("cuadrado") ||
        valor.includes("cobrada")
    ) {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDCFCE7" },
        };
        cell.font = { color: { argb: "FF166534" }, bold: true };
        return;
    }

    if (
        valor.includes("parcial") ||
        valor.includes("pendiente") ||
        valor.includes("crédito") ||
        valor.includes("diferencia")
    ) {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF3C7" },
        };
        cell.font = { color: { argb: "FF92400E" }, bold: true };
    }
}

function agregarHojaDatos(
    workbook: any,
    dataset: DataSetExcel,
    configuracion: ConfiguracionClinica,
    alcance: string,
    mesSeleccionado: string
) {
    const worksheet = workbook.addWorksheet(nombreHojaSeguro(dataset.hoja));
    const totalColumnas = Math.max(dataset.columnas.length, 1);

    worksheet.addRow([dataset.titulo]);
    worksheet.mergeCells(1, 1, 1, totalColumnas);

    const titulo = worksheet.getCell("A1");
    titulo.font = {
        bold: true,
        size: 18,
        color: { argb: "FFFFFFFF" },
    };
    titulo.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" },
    };
    titulo.alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(1).height = 30;

    worksheet.addRow([`Clínica: ${configuracion.nombreClinica}`]);
    worksheet.addRow([`Generado: ${new Date().toLocaleString("es-NI")}`]);
    worksheet.addRow([
        alcance === "Mes"
            ? `Alcance: mes seleccionado ${mesSeleccionado}`
            : "Alcance: histórico completo",
    ]);
    worksheet.addRow([dataset.descripcion]);
    worksheet.addRow([]);

    const headerRow = worksheet.addRow(
        dataset.columnas.map((columna) => columna.encabezado)
    );

    headerRow.height = 24;
    headerRow.eachCell((cell: any) => {
        cell.font = {
            bold: true,
            color: { argb: "FFFFFFFF" },
        };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF0B0F19" },
        };
        cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
        cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
    });

    const inicioDatos = headerRow.number + 1;

    if (dataset.filas.length === 0) {
        const filaVacia = worksheet.addRow(["Sin datos disponibles"]);
        worksheet.mergeCells(filaVacia.number, 1, filaVacia.number, totalColumnas);
        filaVacia.getCell(1).font = { italic: true, color: { argb: "FF64748B" } };
        filaVacia.getCell(1).alignment = { horizontal: "center" };
    } else {
        dataset.filas.forEach((fila, indice) => {
            const row = worksheet.addRow(
                dataset.columnas.map((columna) => valorCelda(fila[columna.key]))
            );

            row.eachCell((cell: any, numeroColumna: number) => {
                const columna = dataset.columnas[numeroColumna - 1];

                cell.alignment = {
                    vertical: "middle",
                    horizontal:
                        columna.tipo === "moneda" || columna.tipo === "numero"
                            ? "right"
                            : "left",
                    wrapText: true,
                };

                cell.border = {
                    top: { style: "thin", color: { argb: "FFF1F5F9" } },
                    left: { style: "thin", color: { argb: "FFF1F5F9" } },
                    bottom: { style: "thin", color: { argb: "FFF1F5F9" } },
                    right: { style: "thin", color: { argb: "FFF1F5F9" } },
                };

                if (indice % 2 === 1) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFF8FAFC" },
                    };
                }

                if (columna.tipo === "moneda") {
                    cell.numFmt = formatoExcelMoneda(configuracion.simboloMoneda);
                }

                if (columna.tipo === "numero") {
                    cell.numFmt = "#,##0";
                }

                if (columna.tipo === "fecha") {
                    cell.alignment = { vertical: "middle", horizontal: "center" };
                }

                if (columna.tipo === "estado") {
                    aplicarEstiloEstado(cell);
                    cell.alignment = { vertical: "middle", horizontal: "center" };
                }
            });
        });
    }

    const finDatos = inicioDatos + dataset.filas.length - 1;
    const columnasConTotal = dataset.columnas.filter((columna) => columna.total);

    if (dataset.filas.length > 0 && columnasConTotal.length > 0) {
        const filaTotales = worksheet.addRow(
            dataset.columnas.map((columna, index) => {
                if (index === 0) return "TOTALES";

                if (!columna.total) return "";

                const letra = columnaExcel(index + 1);
                return {
                    formula: `SUM(${letra}${inicioDatos}:${letra}${finDatos})`,
                };
            })
        );

        filaTotales.height = 24;

        filaTotales.eachCell((cell: any, numeroColumna: number) => {
            const columna = dataset.columnas[numeroColumna - 1];

            cell.font = { bold: true, color: { argb: "FF0F172A" } };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFE0F2FE" },
            };
            cell.border = {
                top: { style: "thin", color: { argb: "FF0F766E" } },
                bottom: { style: "thin", color: { argb: "FF0F766E" } },
            };

            if (columna?.tipo === "moneda") {
                cell.numFmt = formatoExcelMoneda(configuracion.simboloMoneda);
            }

            if (columna?.tipo === "numero") {
                cell.numFmt = "#,##0";
            }
        });
    }

    dataset.columnas.forEach((columna, index) => {
        worksheet.getColumn(index + 1).width = columna.ancho || 18;
    });

    worksheet.views = [{ state: "frozen", ySplit: headerRow.number }];
    worksheet.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to: { row: headerRow.number, column: totalColumnas },
    };

    worksheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
    };
}

function agregarHojaResumen(
    workbook: any,
    resumen: ResumenItem[],
    configuracion: ConfiguracionClinica,
    alcance: string,
    mesSeleccionado: string
) {
    const worksheet = workbook.addWorksheet("Resumen");

    worksheet.columns = [
        { width: 24 },
        { width: 36 },
        { width: 28 },
        { width: 56 },
    ];

    worksheet.addRow(["RESUMEN GENERAL DE EXPORTACIÓN"]);
    worksheet.mergeCells(1, 1, 1, 4);

    const titulo = worksheet.getCell("A1");
    titulo.font = {
        bold: true,
        size: 18,
        color: { argb: "FFFFFFFF" },
    };
    titulo.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" },
    };
    titulo.alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(1).height = 30;

    worksheet.addRow([`Clínica: ${configuracion.nombreClinica}`]);
    worksheet.addRow([`Generado: ${new Date().toLocaleString("es-NI")}`]);
    worksheet.addRow([
        alcance === "Mes"
            ? `Alcance: mes seleccionado ${mesSeleccionado}`
            : "Alcance: histórico completo",
    ]);
    worksheet.addRow([]);

    const header = worksheet.addRow(["Sección", "Indicador", "Valor", "Comentario"]);

    header.eachCell((cell: any) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF0B0F19" },
        };
        cell.alignment = { horizontal: "center" };
    });

    resumen.forEach((item, index) => {
        const row = worksheet.addRow([
            item.seccion,
            item.indicador,
            item.valor,
            item.comentario,
        ]);

        row.eachCell((cell: any) => {
            cell.alignment = { vertical: "middle", wrapText: true };
            cell.border = {
                top: { style: "thin", color: { argb: "FFF1F5F9" } },
                bottom: { style: "thin", color: { argb: "FFF1F5F9" } },
            };

            if (index % 2 === 1) {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF8FAFC" },
                };
            }
        });
    });

    worksheet.views = [{ state: "frozen", ySplit: 6 }];
}

async function guardarWorkbook(workbook: any, nombreArchivo: string) {
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();

    URL.revokeObjectURL(url);
}

export default function ExportacionesPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [citas, setCitas] = useState<Cita[]>([]);
    const [cuentasCobrar, setCuentasCobrar] = useState<CuentaPorCobrar[]>([]);
    const [cuentasPagar, setCuentasPagar] = useState<CuentaPorPagar[]>([]);
    const [compras, setCompras] = useState<CompraProveedor[]>([]);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);

    const [mesSeleccionado, setMesSeleccionado] = useState(mesActualLocal());
    const [alcance, setAlcance] = useState<"Mes" | "Todo">("Mes");
    const [busqueda, setBusqueda] = useState("");
    const [exportando, setExportando] = useState("");

    function cargarDatos() {
        setConfiguracion(obtenerConfiguracionClinica());

        setPacientes(leerLocalStorage<Paciente[]>("pacientes_sistema_clinico", []));
        setVentas(leerLocalStorage<Venta[]>("ventas_sistema_clinico", []));
        setGastos(leerLocalStorage<Gasto[]>("gastos_sistema_clinico", []));
        setProductos(leerLocalStorage<Producto[]>("productos_sistema_clinico", []));
        setProveedores(
            leerLocalStorage<Proveedor[]>("proveedores_sistema_clinico", [])
        );
        setCitas(leerLocalStorage<Cita[]>("citas_sistema_clinico", []));
        setCuentasCobrar(
            leerLocalStorage<CuentaPorCobrar[]>(
                "cuentas_cobrar_sistema_clinico",
                []
            )
        );
        setCuentasPagar(
            leerLocalStorage<CuentaPorPagar[]>("cuentas_pagar_sistema_clinico", [])
        );
        setCompras(
            leerLocalStorage<CompraProveedor[]>(
                "compras_proveedores_sistema_clinico",
                []
            )
        );
        setCierres(
            leerLocalStorage<CierreCaja[]>("cierres_caja_sistema_clinico", [])
        );
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    function aplicaPeriodo(fecha: string) {
        if (alcance === "Todo") return true;
        return fecha?.startsWith(mesSeleccionado);
    }

    const ventasExportar = ventas.filter(
        (venta) => aplicaPeriodo(venta.fecha) && venta.estado !== "Anulada"
    );

    const gastosExportar = gastos.filter(
        (gasto) => aplicaPeriodo(gasto.fecha) && gasto.estado === "Activo"
    );

    const citasExportar = citas.filter((cita) => aplicaPeriodo(cita.fecha));

    const comprasExportar = compras.filter(
        (compra) => aplicaPeriodo(compra.fecha) && compra.estado !== "Anulada"
    );

    const cierresExportar = cierres.filter((cierre) =>
        aplicaPeriodo(cierre.fecha)
    );

    const totalVentas = ventasExportar.reduce(
        (total, venta) => total + (venta.total || 0),
        0
    );

    const efectivo = ventasExportar.reduce(
        (total, venta) => total + (venta.efectivo || 0),
        0
    );

    const tarjeta = ventasExportar.reduce(
        (total, venta) => total + (venta.tarjeta || 0),
        0
    );

    const transferencia = ventasExportar.reduce(
        (total, venta) => total + (venta.transferencia || 0),
        0
    );

    const credito = ventasExportar.reduce(
        (total, venta) => total + (venta.credito || 0),
        0
    );

    const totalGastos = gastosExportar.reduce(
        (total, gasto) => total + (gasto.monto || 0),
        0
    );

    const totalCompras = comprasExportar.reduce(
        (total, compra) => total + (compra.total || 0),
        0
    );

    const totalInventarioCosto = productos
        .filter((producto) => producto.estado === "Activo")
        .reduce((total, producto) => total + producto.stock * producto.costoCompra, 0);

    const totalInventarioVenta = productos
        .filter((producto) => producto.estado === "Activo")
        .reduce((total, producto) => total + producto.stock * producto.precioVenta, 0);

    const totalPorCobrar = cuentasCobrar
        .filter(
            (cuenta) =>
                cuenta.estado !== "Pagada" &&
                cuenta.estado !== "Anulada" &&
                cuenta.saldo > 0
        )
        .reduce((total, cuenta) => total + cuenta.saldo, 0);

    const totalPorPagar = cuentasPagar
        .filter(
            (cuenta) =>
                cuenta.estado !== "Pagada" &&
                cuenta.estado !== "Anulada" &&
                cuenta.saldo > 0
        )
        .reduce((total, cuenta) => total + cuenta.saldo, 0);

    const utilidadEstimada =
        efectivo + tarjeta + transferencia - totalGastos - tarjeta * (configuracion.comisionPOS / 100);

    const datasets = useMemo<Record<string, DataSetExcel>>(
        () => ({
            pacientes: {
                id: "pacientes",
                titulo: "Pacientes",
                hoja: "Pacientes",
                descripcion: "Directorio de pacientes registrados en el sistema.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 18 },
                    { encabezado: "Nombre", key: "nombre", ancho: 28 },
                    { encabezado: "Teléfono", key: "telefono", ancho: 18 },
                    { encabezado: "Cédula", key: "cedula", ancho: 22 },
                    { encabezado: "Fecha nacimiento", key: "fechaNacimiento", ancho: 18, tipo: "fecha" },
                    { encabezado: "Dirección", key: "direccion", ancho: 36 },
                    { encabezado: "Alergias", key: "alergias", ancho: 28 },
                    { encabezado: "Enfermedades", key: "enfermedades", ancho: 28 },
                    { encabezado: "Medicamentos", key: "medicamentos", ancho: 28 },
                    { encabezado: "Saldo pendiente", key: "saldoPendiente", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Estado", key: "estado", ancho: 16, tipo: "estado" },
                    { encabezado: "Observaciones", key: "observaciones", ancho: 42 },
                ],
                filas: pacientes.map((paciente) => ({
                    id: paciente.id,
                    nombre: paciente.nombre,
                    telefono: paciente.telefono,
                    cedula: paciente.cedula,
                    fechaNacimiento: paciente.fechaNacimiento,
                    direccion: paciente.direccion,
                    alergias: paciente.alergias,
                    enfermedades: paciente.enfermedades,
                    medicamentos: paciente.medicamentos,
                    saldoPendiente: paciente.saldoPendiente || 0,
                    estado: paciente.estado,
                    observaciones: paciente.observaciones,
                })),
            },

            citas: {
                id: "citas",
                titulo: "Agenda médica",
                hoja: "Citas",
                descripcion:
                    alcance === "Mes"
                        ? "Citas del mes seleccionado."
                        : "Histórico completo de citas.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 20 },
                    { encabezado: "Fecha", key: "fecha", ancho: 16, tipo: "fecha" },
                    { encabezado: "Hora", key: "hora", ancho: 12 },
                    { encabezado: "Paciente", key: "pacienteNombre", ancho: 28 },
                    { encabezado: "Doctor", key: "doctorNombre", ancho: 28 },
                    { encabezado: "Servicio", key: "servicioNombre", ancho: 28 },
                    { encabezado: "Costo", key: "costo", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Estado", key: "estado", ancho: 18, tipo: "estado" },
                    { encabezado: "Recurrencia", key: "recurrencia", ancho: 18 },
                    { encabezado: "Observaciones", key: "observaciones", ancho: 42 },
                ],
                filas: citasExportar.map((cita) => ({
                    id: cita.id,
                    fecha: cita.fecha,
                    hora: cita.hora,
                    pacienteNombre: cita.pacienteNombre,
                    doctorNombre: cita.doctorNombre,
                    servicioNombre: cita.servicioNombre,
                    costo: cita.costo || 0,
                    estado: cita.estado,
                    recurrencia: cita.recurrencia,
                    observaciones: cita.observaciones,
                })),
            },

            ventas: {
                id: "ventas",
                titulo: "Ventas y caja",
                hoja: "Ventas",
                descripcion:
                    alcance === "Mes"
                        ? "Ventas activas del mes seleccionado."
                        : "Histórico completo de ventas activas.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 24 },
                    { encabezado: "Fecha", key: "fecha", ancho: 16, tipo: "fecha" },
                    { encabezado: "Hora", key: "hora", ancho: 12 },
                    { encabezado: "Cliente", key: "clienteNombre", ancho: 28 },
                    { encabezado: "Concepto", key: "concepto", ancho: 34 },
                    { encabezado: "Tipo cobro", key: "tipoCobro", ancho: 20 },
                    { encabezado: "Total", key: "total", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Efectivo", key: "efectivo", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Tarjeta", key: "tarjeta", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Transferencia", key: "transferencia", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Crédito", key: "credito", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Estado", key: "estado", ancho: 16, tipo: "estado" },
                    { encabezado: "Usuario", key: "usuarioNombre", ancho: 24 },
                    { encabezado: "Observaciones", key: "observaciones", ancho: 42 },
                ],
                filas: ventasExportar.map((venta) => ({
                    id: venta.id,
                    fecha: venta.fecha,
                    hora: venta.hora,
                    clienteNombre: venta.clienteNombre,
                    concepto: venta.concepto,
                    tipoCobro: venta.tipoCobro,
                    total: venta.total || 0,
                    efectivo: venta.efectivo || 0,
                    tarjeta: venta.tarjeta || 0,
                    transferencia: venta.transferencia || 0,
                    credito: venta.credito || 0,
                    estado: venta.estado,
                    usuarioNombre: venta.usuarioNombre,
                    observaciones: venta.observaciones,
                })),
            },

            gastos: {
                id: "gastos",
                titulo: "Control de gastos",
                hoja: "Gastos",
                descripcion:
                    alcance === "Mes"
                        ? "Gastos activos del mes seleccionado."
                        : "Histórico completo de gastos activos.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 24 },
                    { encabezado: "Fecha", key: "fecha", ancho: 16, tipo: "fecha" },
                    { encabezado: "Hora", key: "hora", ancho: 12 },
                    { encabezado: "Categoría", key: "categoria", ancho: 28 },
                    { encabezado: "Descripción", key: "descripcion", ancho: 38 },
                    { encabezado: "Monto", key: "monto", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Método pago", key: "metodoPago", ancho: 18 },
                    { encabezado: "Proveedor", key: "proveedor", ancho: 26 },
                    { encabezado: "Usuario", key: "usuarioNombre", ancho: 24 },
                    { encabezado: "Estado", key: "estado", ancho: 16, tipo: "estado" },
                    { encabezado: "Observaciones", key: "observaciones", ancho: 42 },
                ],
                filas: gastosExportar.map((gasto) => ({
                    id: gasto.id,
                    fecha: gasto.fecha,
                    hora: gasto.hora,
                    categoria: gasto.categoria,
                    descripcion: gasto.descripcion,
                    monto: gasto.monto || 0,
                    metodoPago: gasto.metodoPago,
                    proveedor: gasto.proveedor,
                    usuarioNombre: gasto.usuarioNombre,
                    estado: gasto.estado,
                    observaciones: gasto.observaciones,
                })),
            },

            inventario: {
                id: "inventario",
                titulo: "Inventario",
                hoja: "Inventario",
                descripcion: "Productos registrados, stock, costo y valor de venta estimado.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 22 },
                    { encabezado: "Código", key: "codigo", ancho: 18 },
                    { encabezado: "Producto", key: "nombre", ancho: 30 },
                    { encabezado: "Categoría", key: "categoria", ancho: 22 },
                    { encabezado: "Unidad", key: "unidad", ancho: 14 },
                    { encabezado: "Stock", key: "stock", ancho: 12, tipo: "numero", total: true },
                    { encabezado: "Stock mínimo", key: "stockMinimo", ancho: 14, tipo: "numero" },
                    { encabezado: "Costo compra", key: "costoCompra", ancho: 16, tipo: "moneda" },
                    { encabezado: "Precio venta", key: "precioVenta", ancho: 16, tipo: "moneda" },
                    { encabezado: "Valor costo", key: "valorCosto", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Valor venta", key: "valorVenta", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Proveedor", key: "proveedor", ancho: 28 },
                    { encabezado: "Vencimiento", key: "vencimiento", ancho: 16, tipo: "fecha" },
                    { encabezado: "Estado", key: "estado", ancho: 16, tipo: "estado" },
                ],
                filas: productos.map((producto) => ({
                    id: producto.id,
                    codigo: producto.codigo,
                    nombre: producto.nombre,
                    categoria: producto.categoria,
                    unidad: producto.unidad,
                    stock: producto.stock || 0,
                    stockMinimo: producto.stockMinimo || 0,
                    costoCompra: producto.costoCompra || 0,
                    precioVenta: producto.precioVenta || 0,
                    valorCosto: (producto.stock || 0) * (producto.costoCompra || 0),
                    valorVenta: (producto.stock || 0) * (producto.precioVenta || 0),
                    proveedor: producto.proveedor,
                    vencimiento: producto.vencimiento,
                    estado: producto.estado,
                })),
            },

            proveedores: {
                id: "proveedores",
                titulo: "Proveedores",
                hoja: "Proveedores",
                descripcion: "Directorio de proveedores registrados.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 22 },
                    { encabezado: "Nombre", key: "nombre", ancho: 30 },
                    { encabezado: "RUC", key: "ruc", ancho: 20 },
                    { encabezado: "Categoría", key: "categoria", ancho: 28 },
                    { encabezado: "Teléfono", key: "telefono", ancho: 18 },
                    { encabezado: "WhatsApp", key: "whatsapp", ancho: 18 },
                    { encabezado: "Correo", key: "correo", ancho: 30 },
                    { encabezado: "Contacto", key: "contacto", ancho: 24 },
                    { encabezado: "Dirección", key: "direccion", ancho: 38 },
                    { encabezado: "Estado", key: "estado", ancho: 16, tipo: "estado" },
                    { encabezado: "Observaciones", key: "observaciones", ancho: 42 },
                ],
                filas: proveedores.map((proveedor) => ({
                    id: proveedor.id,
                    nombre: proveedor.nombre,
                    ruc: proveedor.ruc,
                    categoria: proveedor.categoria,
                    telefono: proveedor.telefono,
                    whatsapp: proveedor.whatsapp,
                    correo: proveedor.correo,
                    contacto: proveedor.contacto,
                    direccion: proveedor.direccion,
                    estado: proveedor.estado,
                    observaciones: proveedor.observaciones,
                })),
            },

            compras: {
                id: "compras",
                titulo: "Compras a proveedores",
                hoja: "Compras",
                descripcion:
                    alcance === "Mes"
                        ? "Compras activas del mes seleccionado."
                        : "Histórico completo de compras activas.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 24 },
                    { encabezado: "Fecha", key: "fecha", ancho: 16, tipo: "fecha" },
                    { encabezado: "Hora", key: "hora", ancho: 12 },
                    { encabezado: "Proveedor", key: "proveedorNombre", ancho: 30 },
                    { encabezado: "Producto", key: "productoNombre", ancho: 30 },
                    { encabezado: "Cantidad", key: "cantidad", ancho: 14, tipo: "numero", total: true },
                    { encabezado: "Costo unitario", key: "costoUnitario", ancho: 16, tipo: "moneda" },
                    { encabezado: "Total", key: "total", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Pago ahora", key: "pagoAhora", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Crédito", key: "credito", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Método pago", key: "metodoPago", ancho: 18 },
                    { encabezado: "Vencimiento", key: "fechaVencimiento", ancho: 16, tipo: "fecha" },
                    { encabezado: "Estado", key: "estado", ancho: 16, tipo: "estado" },
                    { encabezado: "Usuario", key: "usuarioNombre", ancho: 24 },
                    { encabezado: "Observaciones", key: "observaciones", ancho: 42 },
                ],
                filas: comprasExportar.map((compra) => ({
                    id: compra.id,
                    fecha: compra.fecha,
                    hora: compra.hora,
                    proveedorNombre: compra.proveedorNombre,
                    productoNombre: compra.productoNombre,
                    cantidad: compra.cantidad || 0,
                    costoUnitario: compra.costoUnitario || 0,
                    total: compra.total || 0,
                    pagoAhora: compra.pagoAhora || 0,
                    credito: compra.credito || 0,
                    metodoPago: compra.metodoPago,
                    fechaVencimiento: compra.fechaVencimiento,
                    estado: compra.estado,
                    usuarioNombre: compra.usuarioNombre,
                    observaciones: compra.observaciones,
                })),
            },

            cuentasCobrar: {
                id: "cuentasCobrar",
                titulo: "Cuentas por cobrar",
                hoja: "Cuentas Cobrar",
                descripcion: "Créditos y saldos pendientes de pacientes/clientes.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 24 },
                    { encabezado: "Fecha", key: "fecha", ancho: 16, tipo: "fecha" },
                    { encabezado: "Paciente", key: "pacienteNombre", ancho: 30 },
                    { encabezado: "Concepto", key: "concepto", ancho: 34 },
                    { encabezado: "Total crédito", key: "total", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Saldo pendiente", key: "saldo", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Vencimiento", key: "fechaVencimiento", ancho: 16, tipo: "fecha" },
                    { encabezado: "Estado", key: "estado", ancho: 16, tipo: "estado" },
                    { encabezado: "Abonos", key: "abonos", ancho: 14, tipo: "numero" },
                    { encabezado: "Venta relacionada", key: "ventaId", ancho: 24 },
                ],
                filas: cuentasCobrar.map((cuenta) => ({
                    id: cuenta.id,
                    fecha: cuenta.fecha,
                    pacienteNombre: cuenta.pacienteNombre,
                    concepto: cuenta.concepto,
                    total: cuenta.total || 0,
                    saldo: cuenta.saldo || 0,
                    fechaVencimiento: cuenta.fechaVencimiento,
                    estado: cuenta.estado,
                    abonos: cuenta.abonos?.length || 0,
                    ventaId: cuenta.ventaId,
                })),
            },

            cuentasPagar: {
                id: "cuentasPagar",
                titulo: "Cuentas por pagar",
                hoja: "Cuentas Pagar",
                descripcion: "Créditos y saldos pendientes con proveedores.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 24 },
                    { encabezado: "Fecha", key: "fecha", ancho: 16, tipo: "fecha" },
                    { encabezado: "Proveedor", key: "proveedorNombre", ancho: 30 },
                    { encabezado: "Concepto", key: "concepto", ancho: 34 },
                    { encabezado: "Total crédito", key: "total", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Saldo pendiente", key: "saldo", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Vencimiento", key: "fechaVencimiento", ancho: 16, tipo: "fecha" },
                    { encabezado: "Estado", key: "estado", ancho: 16, tipo: "estado" },
                    { encabezado: "Abonos", key: "abonos", ancho: 14, tipo: "numero" },
                    { encabezado: "Compra relacionada", key: "compraId", ancho: 24 },
                ],
                filas: cuentasPagar.map((cuenta) => ({
                    id: cuenta.id,
                    fecha: cuenta.fecha,
                    proveedorNombre: cuenta.proveedorNombre,
                    concepto: cuenta.concepto,
                    total: cuenta.total || 0,
                    saldo: cuenta.saldo || 0,
                    fechaVencimiento: cuenta.fechaVencimiento,
                    estado: cuenta.estado,
                    abonos: cuenta.abonos?.length || 0,
                    compraId: cuenta.compraId,
                })),
            },

            cierres: {
                id: "cierres",
                titulo: "Cierres de caja",
                hoja: "Cierres Caja",
                descripcion:
                    alcance === "Mes"
                        ? "Cierres de caja del mes seleccionado."
                        : "Histórico completo de cierres de caja.",
                columnas: [
                    { encabezado: "ID", key: "id", ancho: 24 },
                    { encabezado: "Fecha", key: "fecha", ancho: 16, tipo: "fecha" },
                    { encabezado: "Hora", key: "hora", ancho: 12 },
                    { encabezado: "Usuario", key: "usuarioNombre", ancho: 24 },
                    { encabezado: "Ventas cantidad", key: "ventasCantidad", ancho: 16, tipo: "numero", total: true },
                    { encabezado: "Ventas brutas", key: "ventasBrutas", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Efectivo sistema", key: "efectivoSistema", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Efectivo contado", key: "efectivoContado", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Diferencia efectivo", key: "diferenciaEfectivo", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Tarjeta sistema", key: "tarjetaSistema", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Transferencia sistema", key: "transferenciaSistema", ancho: 22, tipo: "moneda", total: true },
                    { encabezado: "Gastos total", key: "gastosTotal", ancho: 18, tipo: "moneda", total: true },
                    { encabezado: "Comisión POS", key: "comisionPOS", ancho: 16, tipo: "moneda", total: true },
                    { encabezado: "Estado", key: "estado", ancho: 18, tipo: "estado" },
                    { encabezado: "Observaciones", key: "observaciones", ancho: 42 },
                ],
                filas: cierresExportar.map((cierre) => ({
                    id: cierre.id,
                    fecha: cierre.fecha,
                    hora: cierre.hora,
                    usuarioNombre: cierre.usuarioNombre,
                    ventasCantidad: cierre.ventasCantidad || 0,
                    ventasBrutas: cierre.ventasBrutas || 0,
                    efectivoSistema: cierre.efectivoSistema || 0,
                    efectivoContado: cierre.efectivoContado || 0,
                    diferenciaEfectivo: cierre.diferenciaEfectivo || 0,
                    tarjetaSistema: cierre.tarjetaSistema || 0,
                    transferenciaSistema: cierre.transferenciaSistema || 0,
                    gastosTotal: cierre.gastosTotal || 0,
                    comisionPOS: cierre.comisionPOS || 0,
                    estado: cierre.estado,
                    observaciones: cierre.observaciones,
                })),
            },
        }),
        [
            alcance,
            mesSeleccionado,
            pacientes,
            ventasExportar,
            gastosExportar,
            productos,
            proveedores,
            citasExportar,
            comprasExportar,
            cuentasCobrar,
            cuentasPagar,
            cierresExportar,
        ]
    );

    const resumenGeneral: ResumenItem[] = [
        {
            seccion: "General",
            indicador: "Clínica",
            valor: configuracion.nombreClinica,
            comentario: "Nombre configurado de la clínica.",
        },
        {
            seccion: "General",
            indicador: "Alcance",
            valor: alcance === "Mes" ? mesSeleccionado : "Histórico completo",
            comentario: "Período utilizado para movimientos transaccionales.",
        },
        {
            seccion: "Pacientes",
            indicador: "Pacientes registrados",
            valor: pacientes.length,
            comentario: "Total de pacientes en el sistema.",
        },
        {
            seccion: "Caja",
            indicador: "Ventas activas",
            valor: ventasExportar.length,
            comentario: "Ventas no anuladas dentro del alcance seleccionado.",
        },
        {
            seccion: "Caja",
            indicador: "Total vendido",
            valor: formatoMoneda(totalVentas, configuracion.simboloMoneda),
            comentario: "Suma del total de ventas.",
        },
        {
            seccion: "Caja",
            indicador: "Efectivo",
            valor: formatoMoneda(efectivo, configuracion.simboloMoneda),
            comentario: "Ingresos por efectivo.",
        },
        {
            seccion: "Caja",
            indicador: "Tarjeta",
            valor: formatoMoneda(tarjeta, configuracion.simboloMoneda),
            comentario: "Ingresos por tarjeta antes de comisión.",
        },
        {
            seccion: "Caja",
            indicador: "Transferencia",
            valor: formatoMoneda(transferencia, configuracion.simboloMoneda),
            comentario: "Ingresos por transferencia.",
        },
        {
            seccion: "Caja",
            indicador: "Crédito generado",
            valor: formatoMoneda(credito, configuracion.simboloMoneda),
            comentario: "Monto vendido a crédito.",
        },
        {
            seccion: "Gastos",
            indicador: "Gastos activos",
            valor: formatoMoneda(totalGastos, configuracion.simboloMoneda),
            comentario: "Gastos no anulados dentro del alcance seleccionado.",
        },
        {
            seccion: "Resultado",
            indicador: "Utilidad estimada",
            valor: formatoMoneda(utilidadEstimada, configuracion.simboloMoneda),
            comentario:
                "Efectivo + tarjeta + transferencia - gastos - comisión POS.",
        },
        {
            seccion: "Créditos",
            indicador: "Por cobrar",
            valor: formatoMoneda(totalPorCobrar, configuracion.simboloMoneda),
            comentario: "Saldo pendiente de clientes/pacientes.",
        },
        {
            seccion: "Proveedores",
            indicador: "Por pagar",
            valor: formatoMoneda(totalPorPagar, configuracion.simboloMoneda),
            comentario: "Saldo pendiente con proveedores.",
        },
        {
            seccion: "Inventario",
            indicador: "Valor inventario al costo",
            valor: formatoMoneda(totalInventarioCosto, configuracion.simboloMoneda),
            comentario: "Stock actual multiplicado por costo de compra.",
        },
        {
            seccion: "Inventario",
            indicador: "Valor inventario venta",
            valor: formatoMoneda(totalInventarioVenta, configuracion.simboloMoneda),
            comentario: "Stock actual multiplicado por precio de venta.",
        },
    ];

    const tarjetas = [
        {
            id: "pacientes",
            titulo: "Pacientes",
            descripcion: "Directorio clínico completo.",
            cantidad: datasets.pacientes.filas.length,
            icono: Users,
            color: "bg-teal-50 text-teal-700",
        },
        {
            id: "citas",
            titulo: "Agenda médica",
            descripcion: "Citas según el alcance seleccionado.",
            cantidad: datasets.citas.filas.length,
            icono: CalendarDays,
            color: "bg-blue-50 text-blue-700",
        },
        {
            id: "ventas",
            titulo: "Ventas",
            descripcion: "Caja, cobros y créditos generados.",
            cantidad: datasets.ventas.filas.length,
            icono: Banknote,
            color: "bg-emerald-50 text-emerald-700",
        },
        {
            id: "gastos",
            titulo: "Gastos",
            descripcion: "Gastos activos y pagos operativos.",
            cantidad: datasets.gastos.filas.length,
            icono: ReceiptText,
            color: "bg-red-50 text-red-700",
        },
        {
            id: "inventario",
            titulo: "Inventario",
            descripcion: "Productos, stock y valoración.",
            cantidad: datasets.inventario.filas.length,
            icono: Package,
            color: "bg-indigo-50 text-indigo-700",
        },
        {
            id: "proveedores",
            titulo: "Proveedores",
            descripcion: "Directorio comercial completo.",
            cantidad: datasets.proveedores.filas.length,
            icono: Truck,
            color: "bg-cyan-50 text-cyan-700",
        },
        {
            id: "compras",
            titulo: "Compras",
            descripcion: "Compras a proveedores.",
            cantidad: datasets.compras.filas.length,
            icono: CreditCard,
            color: "bg-amber-50 text-amber-700",
        },
        {
            id: "cuentasCobrar",
            titulo: "Cuentas por cobrar",
            descripcion: "Créditos pendientes de pacientes.",
            cantidad: datasets.cuentasCobrar.filas.length,
            icono: BadgeDollarSign,
            color: "bg-purple-50 text-purple-700",
        },
        {
            id: "cuentasPagar",
            titulo: "Cuentas por pagar",
            descripcion: "Créditos pendientes con proveedores.",
            cantidad: datasets.cuentasPagar.filas.length,
            icono: Wallet,
            color: "bg-orange-50 text-orange-700",
        },
        {
            id: "cierres",
            titulo: "Cierres de caja",
            descripcion: "Cuadres diarios registrados.",
            cantidad: datasets.cierres.filas.length,
            icono: FileText,
            color: "bg-slate-100 text-slate-700",
        },
    ];

    const tarjetasFiltradas = tarjetas.filter((tarjeta) => {
        const texto = busqueda.toLowerCase().trim();

        if (!texto) return true;

        return (
            tarjeta.titulo.toLowerCase().includes(texto) ||
            tarjeta.descripcion.toLowerCase().includes(texto)
        );
    });

    async function crearWorkbookBase() {
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();

        workbook.creator = "Sistema Clínico Odontológico";
        workbook.created = new Date();
        workbook.modified = new Date();

        return workbook;
    }

    async function exportarTodo() {
        try {
            setExportando("todo");

            const workbook = await crearWorkbookBase();

            agregarHojaResumen(
                workbook,
                resumenGeneral,
                configuracion,
                alcance,
                mesSeleccionado
            );

            Object.values(datasets).forEach((dataset) => {
                agregarHojaDatos(
                    workbook,
                    dataset,
                    configuracion,
                    alcance,
                    mesSeleccionado
                );
            });

            const archivo =
                alcance === "Mes"
                    ? `exportacion-general-${mesSeleccionado}.xlsx`
                    : "exportacion-general-historica.xlsx";

            await guardarWorkbook(workbook, archivo);
        } catch (error) {
            console.error(error);
            alert("No se pudo generar el archivo Excel.");
        } finally {
            setExportando("");
        }
    }

    async function exportarModulo(dataset: DataSetExcel) {
        try {
            setExportando(dataset.id);

            const workbook = await crearWorkbookBase();

            agregarHojaResumen(
                workbook,
                resumenGeneral,
                configuracion,
                alcance,
                mesSeleccionado
            );

            agregarHojaDatos(
                workbook,
                dataset,
                configuracion,
                alcance,
                mesSeleccionado
            );

            const periodo = alcance === "Mes" ? mesSeleccionado : "historico";
            const archivo = `${nombreArchivoSeguro(dataset.titulo)}-${periodo}.xlsx`;

            await guardarWorkbook(workbook, archivo);
        } catch (error) {
            console.error(error);
            alert("No se pudo generar el archivo Excel.");
        } finally {
            setExportando("");
        }
    }

    return (
        <AppShell
            titulo="Exportaciones"
            descripcion="Descarga información del sistema en Excel con formato claro, entendible y profesional"
            moduloActivo="Exportaciones"
        >
            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Database className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Datos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {Object.values(datasets).reduce(
                            (total, dataset) => total + dataset.filas.length,
                            0
                        )}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Registros exportables
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Banknote className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Ventas
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(totalVentas, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total vendido exportable
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <ReceiptText className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Gastos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(totalGastos, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total gastos exportable
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${utilidadEstimada >= 0
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                        >
                            <Wallet className="h-[18px] w-[18px]" />
                        </div>
                        <span
                            className={`mono rounded-full px-2 py-0.5 text-[10px] font-bold ${utilidadEstimada >= 0
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                        >
                            Neto
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(utilidadEstimada, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Resultado estimado
                    </p>
                </div>
            </section>

            <section className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                    <div>
                        <h3 className="text-sm font-black text-blue-800">
                            Exportación Excel con formato profesional
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-blue-700">
                            Los archivos descargados incluyen hoja de resumen, títulos,
                            filtros automáticos, encabezados con color, columnas ajustadas,
                            moneda formateada y fila de totales cuando corresponde.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 glass-card rounded-2xl p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_220px]">
                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Buscar módulo
                        </label>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar exportación..."
                                className="w-full bg-transparent text-[13px] font-medium outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Alcance
                        </label>
                        <select
                            value={alcance}
                            onChange={(event) =>
                                setAlcance(event.target.value as "Mes" | "Todo")
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        >
                            <option value="Mes">Mes seleccionado</option>
                            <option value="Todo">Histórico completo</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Mes
                        </label>
                        <input
                            value={mesSeleccionado}
                            onChange={(event) => setMesSeleccionado(event.target.value)}
                            type="month"
                            disabled={alcance === "Todo"}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Actualizar
                        </label>
                        <button
                            onClick={cargarDatos}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Recargar datos
                        </button>
                    </div>
                </div>
            </section>

            <section className="mt-4 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <FolderArchive className="h-6 w-6 text-teal-300" />
                        </div>

                        <h3 className="mt-5 text-2xl font-black">
                            Exportación general del sistema
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                            Genera un solo archivo Excel con hoja de resumen y pestañas
                            separadas para pacientes, agenda, ventas, gastos, inventario,
                            proveedores, compras, créditos y cierres de caja.
                        </p>
                    </div>

                    <button
                        onClick={exportarTodo}
                        disabled={!!exportando}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-teal-500/20 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Download className="h-5 w-5" />
                        {exportando === "todo" ? "Generando Excel..." : "Exportar todo"}
                    </button>
                </div>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tarjetasFiltradas.map((tarjeta) => {
                    const Icono = tarjeta.icono;
                    const dataset = datasets[tarjeta.id];

                    return (
                        <div key={tarjeta.id} className="glass-card rounded-2xl p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tarjeta.color}`}>
                                    <Icono className="h-5 w-5" />
                                </div>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                                    {tarjeta.cantidad} registro(s)
                                </span>
                            </div>

                            <h3 className="mt-5 text-[16px] font-black text-slate-800">
                                {tarjeta.titulo}
                            </h3>

                            <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">
                                {tarjeta.descripcion}
                            </p>

                            <button
                                onClick={() => exportarModulo(dataset)}
                                disabled={!!exportando}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Download className="h-4 w-4" />
                                {exportando === tarjeta.id ? "Generando..." : "Exportar Excel"}
                            </button>
                        </div>
                    );
                })}
            </section>

            {tarjetasFiltradas.length === 0 && (
                <section className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                    <Table2 className="mx-auto h-10 w-10 text-slate-300" />
                    <h4 className="mt-3 text-sm font-black text-slate-700">
                        No encontramos exportaciones
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                        Probá cambiar la búsqueda.
                    </p>
                </section>
            )}

            <section className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                    <div>
                        <h3 className="text-sm font-black text-amber-800">
                            Recomendación antes de exportar
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-amber-700">
                            Si acabás de registrar ventas, gastos, compras o cierres, presioná
                            primero <strong>Recargar datos</strong>. Así el Excel sale con la
                            información más reciente guardada en este navegador.
                        </p>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}