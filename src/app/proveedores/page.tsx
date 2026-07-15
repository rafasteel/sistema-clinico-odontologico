"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BadgeDollarSign,
    Banknote,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    Edit3,
    FileText,
    Mail,
    MapPin,
    PackagePlus,
    Phone,
    Plus,
    ReceiptText,
    Search,
    ShieldAlert,
    ShoppingCart,
    Store,
    Trash2,
    Truck,
    WalletCards,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
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

type TipoMovimiento =
    | "Entrada"
    | "Salida"
    | "Uso clínico"
    | "Pérdida"
    | "Ajuste";

type MovimientoInventario = {
    id: string;
    fecha: string;
    hora: string;
    productoId: string;
    productoNombre: string;
    tipo: TipoMovimiento;
    cantidad: number;
    stockAnterior: number;
    stockNuevo: number;
    costoUnitario: number;
    motivo: string;
    usuarioNombre: string;
};

type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia";

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
    metodoPago: MetodoPago;
    fechaVencimiento: string;
    estado: EstadoCompra;
    usuarioNombre: string;
    observaciones: string;
    gastoId: string;
    cuentaPagarId: string;
};

type EstadoCuentaPagar =
    | "Pendiente"
    | "Parcial"
    | "Pagada"
    | "Vencida"
    | "Anulada";

type AbonoCuentaPagar = {
    id: string;
    fecha: string;
    hora: string;
    monto: number;
    metodo: MetodoPago;
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
    estado: EstadoCuentaPagar;
    abonos: AbonoCuentaPagar[];
};

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
    estado: "Activo" | "Anulado";
};

type FormularioProveedor = {
    nombre: string;
    ruc: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    direccion: string;
    categoria: string;
    contacto: string;
    observaciones: string;
};

type FormularioCompra = {
    proveedorId: string;
    productoId: string;
    cantidad: string;
    costoUnitario: string;
    pagoAhora: string;
    metodoPago: MetodoPago;
    fechaVencimiento: string;
    observaciones: string;
};

type FormularioAbono = {
    cuentaId: string;
    monto: string;
    metodo: MetodoPago;
};

const proveedoresIniciales: Proveedor[] = [
    {
        id: "PROV-1",
        nombre: "Dental Supply Nicaragua",
        ruc: "J0310000000000",
        telefono: "2222-1111",
        whatsapp: "8888-1111",
        correo: "ventas@dentalsupply.com",
        direccion: "Managua, Nicaragua",
        categoria: "Insumos odontológicos",
        contacto: "Área de ventas",
        estado: "Activo",
        observaciones: "Proveedor principal de insumos clínicos.",
    },
    {
        id: "PROV-2",
        nombre: "Proveedor Médico Central",
        ruc: "J0310000000001",
        telefono: "2222-2222",
        whatsapp: "8888-2222",
        correo: "contacto@medicocentral.com",
        direccion: "Managua, Nicaragua",
        categoria: "Medicamentos",
        contacto: "Ejecutivo comercial",
        estado: "Activo",
        observaciones: "Proveedor de anestesia y medicamentos.",
    },
];

const productosIniciales: Producto[] = [
    {
        id: "1",
        codigo: "PROD-001",
        nombre: "Guantes de nitrilo",
        categoria: "Insumos",
        unidad: "Caja",
        stock: 12,
        stockMinimo: 5,
        costoCompra: 250,
        precioVenta: 0,
        proveedor: "Dental Supply Nicaragua",
        vencimiento: "",
        estado: "Activo",
    },
    {
        id: "2",
        codigo: "PROD-002",
        nombre: "Anestesia dental",
        categoria: "Medicamento",
        unidad: "Frasco",
        stock: 8,
        stockMinimo: 3,
        costoCompra: 430,
        precioVenta: 0,
        proveedor: "Proveedor Médico Central",
        vencimiento: "",
        estado: "Activo",
    },
    {
        id: "3",
        codigo: "PROD-003",
        nombre: "Cepillo dental",
        categoria: "Producto venta",
        unidad: "Unidad",
        stock: 30,
        stockMinimo: 10,
        costoCompra: 35,
        precioVenta: 80,
        proveedor: "Dental Supply Nicaragua",
        vencimiento: "",
        estado: "Activo",
    },
];

const formularioProveedorVacio: FormularioProveedor = {
    nombre: "",
    ruc: "",
    telefono: "",
    whatsapp: "",
    correo: "",
    direccion: "",
    categoria: "",
    contacto: "",
    observaciones: "",
};

const formularioCompraVacio: FormularioCompra = {
    proveedorId: "",
    productoId: "",
    cantidad: "",
    costoUnitario: "",
    pagoAhora: "",
    metodoPago: "Efectivo",
    fechaVencimiento: "",
    observaciones: "",
};

const formularioAbonoVacio: FormularioAbono = {
    cuentaId: "",
    monto: "",
    metodo: "Efectivo",
};

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

function numero(valor: string) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI")}`;
}

function colorEstadoProveedor(estado: Proveedor["estado"]) {
    if (estado === "Activo") {
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    }

    return "bg-slate-100 text-slate-500 border border-slate-200";
}

function colorEstadoCuenta(estado: EstadoCuentaPagar) {
    if (estado === "Pagada") return "bg-emerald-50 text-emerald-700";
    if (estado === "Parcial") return "bg-amber-50 text-amber-700";
    if (estado === "Pendiente") return "bg-blue-50 text-blue-700";
    if (estado === "Vencida") return "bg-red-50 text-red-700";
    return "bg-slate-100 text-slate-500";
}

function estadoVisualCuenta(cuenta: CuentaPorPagar): EstadoCuentaPagar {
    if (cuenta.estado === "Pagada" || cuenta.estado === "Anulada") {
        return cuenta.estado;
    }

    if (cuenta.fechaVencimiento && cuenta.fechaVencimiento < fechaHoyLocal()) {
        return "Vencida";
    }

    return cuenta.estado;
}

export default function ProveedoresPage() {
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
    const [compras, setCompras] = useState<CompraProveedor[]>([]);
    const [cuentasPagar, setCuentasPagar] = useState<CuentaPorPagar[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);

    const [formularioProveedor, setFormularioProveedor] =
        useState<FormularioProveedor>(formularioProveedorVacio);
    const [formularioCompra, setFormularioCompra] =
        useState<FormularioCompra>(formularioCompraVacio);
    const [formularioAbono, setFormularioAbono] =
        useState<FormularioAbono>(formularioAbonoVacio);

    const [proveedorEditandoId, setProveedorEditandoId] = useState<string | null>(
        null
    );
    const [busquedaProveedor, setBusquedaProveedor] = useState("");
    const [busquedaCompra, setBusquedaCompra] = useState("");

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
        const proveedoresGuardados = localStorage.getItem(
            "proveedores_sistema_clinico"
        );
        const productosGuardados = localStorage.getItem("productos_sistema_clinico");
        const movimientosGuardados = localStorage.getItem(
            "movimientos_inventario_sistema_clinico"
        );
        const comprasGuardadas = localStorage.getItem(
            "compras_proveedores_sistema_clinico"
        );
        const cuentasGuardadas = localStorage.getItem(
            "cuentas_pagar_sistema_clinico"
        );
        const gastosGuardados = localStorage.getItem("gastos_sistema_clinico");

        if (usuarioGuardado) {
            setUsuario(JSON.parse(usuarioGuardado) as UsuarioSistema);
        }

        setConfiguracion(obtenerConfiguracionClinica());

        if (proveedoresGuardados) {
            setProveedores(JSON.parse(proveedoresGuardados) as Proveedor[]);
        } else {
            setProveedores(proveedoresIniciales);
            localStorage.setItem(
                "proveedores_sistema_clinico",
                JSON.stringify(proveedoresIniciales)
            );
        }

        if (productosGuardados) {
            setProductos(JSON.parse(productosGuardados) as Producto[]);
        } else {
            setProductos(productosIniciales);
            localStorage.setItem(
                "productos_sistema_clinico",
                JSON.stringify(productosIniciales)
            );
        }

        if (movimientosGuardados) {
            setMovimientos(JSON.parse(movimientosGuardados) as MovimientoInventario[]);
        }

        if (comprasGuardadas) {
            setCompras(JSON.parse(comprasGuardadas) as CompraProveedor[]);
        }

        if (cuentasGuardadas) {
            setCuentasPagar(JSON.parse(cuentasGuardadas) as CuentaPorPagar[]);
        }

        if (gastosGuardados) {
            setGastos(JSON.parse(gastosGuardados) as Gasto[]);
        }
    }, []);

    function guardarProveedores(nuevaLista: Proveedor[]) {
        setProveedores(nuevaLista);
        localStorage.setItem(
            "proveedores_sistema_clinico",
            JSON.stringify(nuevaLista)
        );
    }

    function guardarProductos(nuevaLista: Producto[]) {
        setProductos(nuevaLista);
        localStorage.setItem("productos_sistema_clinico", JSON.stringify(nuevaLista));
    }

    function guardarMovimientos(nuevaLista: MovimientoInventario[]) {
        setMovimientos(nuevaLista);
        localStorage.setItem(
            "movimientos_inventario_sistema_clinico",
            JSON.stringify(nuevaLista)
        );
    }

    function guardarCompras(nuevaLista: CompraProveedor[]) {
        setCompras(nuevaLista);
        localStorage.setItem(
            "compras_proveedores_sistema_clinico",
            JSON.stringify(nuevaLista)
        );
    }

    function guardarCuentasPagar(nuevaLista: CuentaPorPagar[]) {
        setCuentasPagar(nuevaLista);
        localStorage.setItem(
            "cuentas_pagar_sistema_clinico",
            JSON.stringify(nuevaLista)
        );
    }

    function guardarGastos(nuevaLista: Gasto[]) {
        setGastos(nuevaLista);
        localStorage.setItem("gastos_sistema_clinico", JSON.stringify(nuevaLista));
    }

    function actualizarProveedor<K extends keyof FormularioProveedor>(
        campo: K,
        valor: FormularioProveedor[K]
    ) {
        setFormularioProveedor((datos) => ({
            ...datos,
            [campo]: valor,
        }));
    }

    function actualizarCompra<K extends keyof FormularioCompra>(
        campo: K,
        valor: FormularioCompra[K]
    ) {
        setFormularioCompra((datos) => ({
            ...datos,
            [campo]: valor,
        }));
    }

    function limpiarProveedor() {
        setFormularioProveedor(formularioProveedorVacio);
        setProveedorEditandoId(null);
    }

    function limpiarCompra() {
        setFormularioCompra(formularioCompraVacio);
    }

    function seleccionarProducto(productoId: string) {
        const producto = productos.find((item) => item.id === productoId);

        setFormularioCompra((datos) => ({
            ...datos,
            productoId,
            costoUnitario: producto ? producto.costoCompra.toString() : "",
        }));
    }

    function guardarProveedor(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!formularioProveedor.nombre.trim()) {
            alert("El nombre del proveedor es obligatorio.");
            return;
        }

        if (!formularioProveedor.telefono.trim()) {
            alert("El teléfono del proveedor es obligatorio.");
            return;
        }

        if (!formularioProveedor.categoria.trim()) {
            alert("La categoría del proveedor es obligatoria.");
            return;
        }

        if (proveedorEditandoId) {
            const nuevaLista = proveedores.map((proveedor) =>
                proveedor.id === proveedorEditandoId
                    ? {
                        ...proveedor,
                        nombre: formularioProveedor.nombre.trim(),
                        ruc: formularioProveedor.ruc.trim(),
                        telefono: formularioProveedor.telefono.trim(),
                        whatsapp: formularioProveedor.whatsapp.trim(),
                        correo: formularioProveedor.correo.trim(),
                        direccion: formularioProveedor.direccion.trim(),
                        categoria: formularioProveedor.categoria.trim(),
                        contacto: formularioProveedor.contacto.trim(),
                        observaciones: formularioProveedor.observaciones.trim(),
                    }
                    : proveedor
            );

            guardarProveedores(nuevaLista);
            limpiarProveedor();
            alert("Proveedor actualizado correctamente.");
            return;
        }

        const nuevoProveedor: Proveedor = {
            id: `PROV-${Date.now()}`,
            nombre: formularioProveedor.nombre.trim(),
            ruc: formularioProveedor.ruc.trim(),
            telefono: formularioProveedor.telefono.trim(),
            whatsapp: formularioProveedor.whatsapp.trim(),
            correo: formularioProveedor.correo.trim(),
            direccion: formularioProveedor.direccion.trim(),
            categoria: formularioProveedor.categoria.trim(),
            contacto: formularioProveedor.contacto.trim(),
            estado: "Activo",
            observaciones: formularioProveedor.observaciones.trim(),
        };

        guardarProveedores([nuevoProveedor, ...proveedores]);
        limpiarProveedor();
        alert("Proveedor registrado correctamente.");
    }

    function editarProveedor(proveedor: Proveedor) {
        setProveedorEditandoId(proveedor.id);
        setFormularioProveedor({
            nombre: proveedor.nombre,
            ruc: proveedor.ruc,
            telefono: proveedor.telefono,
            whatsapp: proveedor.whatsapp,
            correo: proveedor.correo,
            direccion: proveedor.direccion,
            categoria: proveedor.categoria,
            contacto: proveedor.contacto,
            observaciones: proveedor.observaciones,
        });
    }

    function cambiarEstadoProveedor(proveedor: Proveedor) {
        const confirmar = window.confirm(
            `¿Seguro que deseas ${proveedor.estado === "Activo" ? "desactivar" : "activar"
            } este proveedor?`
        );

        if (!confirmar) return;

        const nuevaLista = proveedores.map((item) =>
            item.id === proveedor.id
                ? {
                    ...item,
                    estado: item.estado === "Activo" ? "Inactivo" : "Activo",
                }
                : item
        );

        guardarProveedores(nuevaLista);
    }

    function registrarCompra(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const proveedor = proveedores.find(
            (item) => item.id === formularioCompra.proveedorId
        );
        const producto = productos.find(
            (item) => item.id === formularioCompra.productoId
        );

        if (!proveedor) {
            alert("Selecciona un proveedor.");
            return;
        }

        if (!producto) {
            alert("Selecciona un producto.");
            return;
        }

        const cantidad = numero(formularioCompra.cantidad);
        const costoUnitario = numero(formularioCompra.costoUnitario);
        const pagoAhora = numero(formularioCompra.pagoAhora);
        const total = cantidad * costoUnitario;
        const credito = total - pagoAhora;

        if (cantidad <= 0) {
            alert("La cantidad debe ser mayor que cero.");
            return;
        }

        if (costoUnitario <= 0) {
            alert("El costo unitario debe ser mayor que cero.");
            return;
        }

        if (pagoAhora < 0) {
            alert("El pago ahora no puede ser negativo.");
            return;
        }

        if (pagoAhora > total) {
            alert("El pago ahora no puede ser mayor que el total.");
            return;
        }

        if (credito > 0 && !formularioCompra.fechaVencimiento) {
            alert("Si queda crédito, debes indicar fecha de vencimiento.");
            return;
        }

        const fecha = fechaHoyLocal();
        const hora = horaActualLocal();
        const baseId = Date.now();
        const compraId = `COMPRA-${baseId}`;
        const gastoId = pagoAhora > 0 ? `GASTO-${baseId}` : "";
        const cuentaPagarId = credito > 0 ? `CXP-${baseId}` : "";

        const stockAnterior = producto.stock;
        const stockNuevo = producto.stock + cantidad;

        const nuevosProductos = productos.map((item) =>
            item.id === producto.id
                ? {
                    ...item,
                    stock: stockNuevo,
                    costoCompra: costoUnitario,
                    proveedor: proveedor.nombre,
                }
                : item
        );

        const nuevoMovimiento: MovimientoInventario = {
            id: `MOV-${baseId}`,
            fecha,
            hora,
            productoId: producto.id,
            productoNombre: producto.nombre,
            tipo: "Entrada",
            cantidad,
            stockAnterior,
            stockNuevo,
            costoUnitario,
            motivo: `Compra a proveedor ${proveedor.nombre}. Compra: ${compraId}`,
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        const nuevaCompra: CompraProveedor = {
            id: compraId,
            fecha,
            hora,
            proveedorId: proveedor.id,
            proveedorNombre: proveedor.nombre,
            productoId: producto.id,
            productoNombre: producto.nombre,
            cantidad,
            costoUnitario,
            total,
            pagoAhora,
            credito,
            metodoPago: formularioCompra.metodoPago,
            fechaVencimiento: formularioCompra.fechaVencimiento,
            estado: "Activa",
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
            observaciones: formularioCompra.observaciones.trim(),
            gastoId,
            cuentaPagarId,
        };

        guardarProductos(nuevosProductos);
        guardarMovimientos([nuevoMovimiento, ...movimientos]);
        guardarCompras([nuevaCompra, ...compras]);

        if (pagoAhora > 0) {
            const nuevoGasto: Gasto = {
                id: gastoId,
                fecha,
                hora,
                categoria: "Compra a proveedor",
                descripcion: `Compra de ${producto.nombre} a ${proveedor.nombre}`,
                monto: pagoAhora,
                metodoPago: formularioCompra.metodoPago,
                proveedor: proveedor.nombre,
                usuarioNombre: usuario?.nombre || "Usuario no identificado",
                observaciones: `Compra relacionada: ${compraId}`,
                estado: "Activo",
            };

            guardarGastos([nuevoGasto, ...gastos]);
        }

        if (credito > 0) {
            const nuevaCuenta: CuentaPorPagar = {
                id: cuentaPagarId,
                compraId,
                proveedorId: proveedor.id,
                proveedorNombre: proveedor.nombre,
                concepto: `Compra de ${producto.nombre}`,
                total: credito,
                saldo: credito,
                fecha,
                fechaVencimiento: formularioCompra.fechaVencimiento,
                estado: pagoAhora > 0 ? "Parcial" : "Pendiente",
                abonos: [],
            };

            guardarCuentasPagar([nuevaCuenta, ...cuentasPagar]);
        }

        limpiarCompra();
        alert("Compra registrada correctamente.");
    }

    function registrarAbono(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const cuenta = cuentasPagar.find(
            (item) => item.id === formularioAbono.cuentaId
        );

        if (!cuenta) {
            alert("Selecciona una cuenta por pagar.");
            return;
        }

        const monto = numero(formularioAbono.monto);

        if (monto <= 0) {
            alert("El monto debe ser mayor que cero.");
            return;
        }

        if (monto > cuenta.saldo) {
            alert("El abono no puede ser mayor que el saldo.");
            return;
        }

        const fecha = fechaHoyLocal();
        const hora = horaActualLocal();
        const baseId = Date.now();
        const nuevoSaldo = cuenta.saldo - monto;

        const nuevasCuentas = cuentasPagar.map((item) =>
            item.id === cuenta.id
                ? {
                    ...item,
                    saldo: nuevoSaldo,
                    estado:
                        nuevoSaldo <= 0
                            ? ("Pagada" as EstadoCuentaPagar)
                            : ("Parcial" as EstadoCuentaPagar),
                    abonos: [
                        {
                            id: `ABONO-CXP-${baseId}`,
                            fecha,
                            hora,
                            monto,
                            metodo: formularioAbono.metodo,
                        },
                        ...(item.abonos || []),
                    ],
                }
                : item
        );

        const nuevoGasto: Gasto = {
            id: `GASTO-ABONO-${baseId}`,
            fecha,
            hora,
            categoria: "Abono a proveedor",
            descripcion: `Abono a ${cuenta.proveedorNombre}: ${cuenta.concepto}`,
            monto,
            metodoPago: formularioAbono.metodo,
            proveedor: cuenta.proveedorNombre,
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
            observaciones: `Abono aplicado a cuenta ${cuenta.id}`,
            estado: "Activo",
        };

        guardarCuentasPagar(nuevasCuentas);
        guardarGastos([nuevoGasto, ...gastos]);
        setFormularioAbono(formularioAbonoVacio);

        alert("Abono registrado correctamente.");
    }

    function anularCompra(compra: CompraProveedor) {
        if (compra.estado === "Anulada") return;

        const confirmar = window.confirm(
            "¿Seguro que deseas anular esta compra? Se revertirá el stock y se anularán el gasto/cuenta relacionada."
        );

        if (!confirmar) return;

        const producto = productos.find((item) => item.id === compra.productoId);

        if (!producto) {
            alert("No se encontró el producto relacionado.");
            return;
        }

        if (producto.stock < compra.cantidad) {
            alert(
                "No se puede anular porque el stock actual es menor que la cantidad comprada."
            );
            return;
        }

        const fecha = fechaHoyLocal();
        const hora = horaActualLocal();
        const stockAnterior = producto.stock;
        const stockNuevo = producto.stock - compra.cantidad;

        const nuevosProductos = productos.map((item) =>
            item.id === producto.id
                ? {
                    ...item,
                    stock: stockNuevo,
                }
                : item
        );

        const nuevoMovimiento: MovimientoInventario = {
            id: `MOV-${Date.now()}`,
            fecha,
            hora,
            productoId: producto.id,
            productoNombre: producto.nombre,
            tipo: "Salida",
            cantidad: compra.cantidad,
            stockAnterior,
            stockNuevo,
            costoUnitario: compra.costoUnitario,
            motivo: `Reversión por anulación de compra ${compra.id}`,
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        const nuevasCompras = compras.map((item) =>
            item.id === compra.id
                ? {
                    ...item,
                    estado: "Anulada" as EstadoCompra,
                }
                : item
        );

        const nuevasCuentas = cuentasPagar.map((cuenta) =>
            cuenta.compraId === compra.id
                ? {
                    ...cuenta,
                    saldo: 0,
                    estado: "Anulada" as EstadoCuentaPagar,
                }
                : cuenta
        );

        const nuevosGastos = gastos.map((gasto) =>
            gasto.id === compra.gastoId
                ? {
                    ...gasto,
                    estado: "Anulado" as const,
                }
                : gasto
        );

        guardarProductos(nuevosProductos);
        guardarMovimientos([nuevoMovimiento, ...movimientos]);
        guardarCompras(nuevasCompras);
        guardarCuentasPagar(nuevasCuentas);
        guardarGastos(nuevosGastos);

        alert("Compra anulada correctamente.");
    }

    const proveedoresActivos = proveedores.filter(
        (proveedor) => proveedor.estado === "Activo"
    );

    const productosActivos = productos.filter(
        (producto) => producto.estado === "Activo"
    );

    const hoy = fechaHoyLocal();
    const mesActual = hoy.slice(0, 7);

    const comprasActivas = compras.filter((compra) => compra.estado !== "Anulada");

    const comprasMes = comprasActivas.filter((compra) =>
        compra.fecha.startsWith(mesActual)
    );

    const totalCompradoMes = comprasMes.reduce(
        (total, compra) => total + compra.total,
        0
    );

    const pagadoMes = comprasMes.reduce(
        (total, compra) => total + compra.pagoAhora,
        0
    );

    const creditoMes = comprasMes.reduce(
        (total, compra) => total + compra.credito,
        0
    );

    const cuentasPendientes = cuentasPagar.filter(
        (cuenta) =>
            cuenta.estado !== "Pagada" &&
            cuenta.estado !== "Anulada" &&
            cuenta.saldo > 0
    );

    const saldoPorPagar = cuentasPendientes.reduce(
        (total, cuenta) => total + cuenta.saldo,
        0
    );

    const cuentasVencidas = cuentasPendientes.filter(
        (cuenta) => estadoVisualCuenta(cuenta) === "Vencida"
    );

    const proveedoresFiltrados = useMemo(() => {
        const texto = busquedaProveedor.toLowerCase().trim();

        return proveedores.filter((proveedor) => {
            if (!texto) return true;

            return (
                proveedor.nombre.toLowerCase().includes(texto) ||
                proveedor.categoria.toLowerCase().includes(texto) ||
                proveedor.telefono.toLowerCase().includes(texto) ||
                proveedor.correo.toLowerCase().includes(texto) ||
                proveedor.contacto.toLowerCase().includes(texto)
            );
        });
    }, [proveedores, busquedaProveedor]);

    const comprasFiltradas = useMemo(() => {
        const texto = busquedaCompra.toLowerCase().trim();

        return compras.filter((compra) => {
            if (!texto) return true;

            return (
                compra.proveedorNombre.toLowerCase().includes(texto) ||
                compra.productoNombre.toLowerCase().includes(texto) ||
                compra.estado.toLowerCase().includes(texto) ||
                compra.id.toLowerCase().includes(texto)
            );
        });
    }, [compras, busquedaCompra]);

    const proveedorCompra = proveedores.find(
        (proveedor) => proveedor.id === formularioCompra.proveedorId
    );

    const productoCompra = productos.find(
        (producto) => producto.id === formularioCompra.productoId
    );

    const cantidadCompra = numero(formularioCompra.cantidad);
    const costoCompra = numero(formularioCompra.costoUnitario);
    const totalCompra = cantidadCompra * costoCompra;
    const pagoAhoraCompra = numero(formularioCompra.pagoAhora);
    const creditoCompra = totalCompra - pagoAhoraCompra;

    return (
        <AppShell
            titulo="Proveedores"
            descripcion="Directorio de proveedores, compras, inventario, gastos y cuentas por pagar"
            moduloActivo="Proveedores"
        >
            {cuentasVencidas.length > 0 && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                Cuentas vencidas
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                Hay {cuentasVencidas.length} cuenta(s) por pagar vencida(s).
                                Revisá los pagos pendientes a proveedores.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Truck className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Activos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {proveedoresActivos.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Proveedores activos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <ShoppingCart className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Mes
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(totalCompradoMes, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Compras del mes
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Banknote className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Pagado
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(pagadoMes, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pagado este mes
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ShieldAlert className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            CxP
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(saldoPorPagar, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Saldo por pagar
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        {proveedorEditandoId
                                            ? "Editar proveedor"
                                            : "Nuevo proveedor"}
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Datos comerciales y contacto principal
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                    <Building2 className="h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </div>

                        <form onSubmit={guardarProveedor} className="p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Nombre del proveedor
                                </label>
                                <input
                                    value={formularioProveedor.nombre}
                                    onChange={(event) =>
                                        actualizarProveedor("nombre", event.target.value)
                                    }
                                    placeholder="Ejemplo: Dental Supply Nicaragua"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        RUC
                                    </label>
                                    <input
                                        value={formularioProveedor.ruc}
                                        onChange={(event) =>
                                            actualizarProveedor("ruc", event.target.value)
                                        }
                                        placeholder="RUC / identificación fiscal"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Categoría
                                    </label>
                                    <input
                                        value={formularioProveedor.categoria}
                                        onChange={(event) =>
                                            actualizarProveedor("categoria", event.target.value)
                                        }
                                        placeholder="Insumos, medicamentos..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Teléfono
                                    </label>
                                    <input
                                        value={formularioProveedor.telefono}
                                        onChange={(event) =>
                                            actualizarProveedor("telefono", event.target.value)
                                        }
                                        placeholder="2222-0000"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        WhatsApp
                                    </label>
                                    <input
                                        value={formularioProveedor.whatsapp}
                                        onChange={(event) =>
                                            actualizarProveedor("whatsapp", event.target.value)
                                        }
                                        placeholder="8888-0000"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Correo
                                    </label>
                                    <input
                                        value={formularioProveedor.correo}
                                        onChange={(event) =>
                                            actualizarProveedor("correo", event.target.value)
                                        }
                                        placeholder="ventas@proveedor.com"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Contacto
                                    </label>
                                    <input
                                        value={formularioProveedor.contacto}
                                        onChange={(event) =>
                                            actualizarProveedor("contacto", event.target.value)
                                        }
                                        placeholder="Nombre del vendedor o contacto"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Dirección
                                </label>
                                <textarea
                                    value={formularioProveedor.direccion}
                                    onChange={(event) =>
                                        actualizarProveedor("direccion", event.target.value)
                                    }
                                    rows={2}
                                    placeholder="Dirección del proveedor"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Observaciones
                                </label>
                                <textarea
                                    value={formularioProveedor.observaciones}
                                    onChange={(event) =>
                                        actualizarProveedor("observaciones", event.target.value)
                                    }
                                    rows={3}
                                    placeholder="Condiciones, días de entrega, notas..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                    <Plus className="h-4 w-4" />
                                    {proveedorEditandoId
                                        ? "Guardar cambios"
                                        : "Registrar proveedor"}
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarProveedor}
                                    className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Directorio de proveedores
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Contactos comerciales activos e inactivos
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-72">
                                    <Search className="h-4 w-4 text-slate-400" />
                                    <input
                                        value={busquedaProveedor}
                                        onChange={(event) => setBusquedaProveedor(event.target.value)}
                                        placeholder="Buscar proveedor..."
                                        className="w-full bg-transparent text-[13px] font-medium outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[720px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {proveedoresFiltrados.map((proveedor) => (
                                    <div
                                        key={proveedor.id}
                                        className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white">
                                                <Store className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-black text-slate-800">
                                                        {proveedor.nombre}
                                                    </h4>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoProveedor(
                                                            proveedor.estado
                                                        )}`}
                                                    >
                                                        {proveedor.estado}
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-xs font-semibold text-teal-700">
                                                    {proveedor.categoria}
                                                </p>

                                                <div className="mt-3 grid gap-2 text-xs text-slate-500">
                                                    <p className="flex items-center gap-2">
                                                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                        {proveedor.telefono || "Sin teléfono"}
                                                    </p>

                                                    <p className="flex items-center gap-2">
                                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                        {proveedor.correo || "Sin correo"}
                                                    </p>

                                                    <p className="flex items-center gap-2">
                                                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                        {proveedor.direccion || "Sin dirección"}
                                                    </p>
                                                </div>

                                                {proveedor.observaciones && (
                                                    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                                                        <p className="text-xs leading-5 text-slate-500">
                                                            {proveedor.observaciones}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => editarProveedor(proveedor)}
                                                        className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        Editar
                                                    </button>

                                                    <button
                                                        onClick={() => cambiarEstadoProveedor(proveedor)}
                                                        className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        {proveedor.estado === "Activo"
                                                            ? "Desactivar"
                                                            : "Activar"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {proveedoresFiltrados.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <Truck className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            No encontramos proveedores
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Probá cambiar la búsqueda o registrar uno nuevo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Registrar compra
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Aumenta inventario, crea gasto y cuentas por pagar
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <PackagePlus className="h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </div>

                        <form onSubmit={registrarCompra} className="p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Proveedor
                                </label>
                                <select
                                    value={formularioCompra.proveedorId}
                                    onChange={(event) =>
                                        actualizarCompra("proveedorId", event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option value="">Seleccionar proveedor</option>
                                    {proveedoresActivos.map((proveedor) => (
                                        <option key={proveedor.id} value={proveedor.id}>
                                            {proveedor.nombre} · {proveedor.categoria}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Producto
                                </label>
                                <select
                                    value={formularioCompra.productoId}
                                    onChange={(event) => seleccionarProducto(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option value="">Seleccionar producto</option>
                                    {productosActivos.map((producto) => (
                                        <option key={producto.id} value={producto.id}>
                                            {producto.nombre} · Stock {producto.stock}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Cantidad
                                    </label>
                                    <input
                                        value={formularioCompra.cantidad}
                                        onChange={(event) =>
                                            actualizarCompra("cantidad", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Costo unitario
                                    </label>
                                    <input
                                        value={formularioCompra.costoUnitario}
                                        onChange={(event) =>
                                            actualizarCompra("costoUnitario", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Pago ahora
                                    </label>
                                    <input
                                        value={formularioCompra.pagoAhora}
                                        onChange={(event) =>
                                            actualizarCompra("pagoAhora", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Método de pago
                                    </label>
                                    <select
                                        value={formularioCompra.metodoPago}
                                        onChange={(event) =>
                                            actualizarCompra(
                                                "metodoPago",
                                                event.target.value as MetodoPago
                                            )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option>Efectivo</option>
                                        <option>Tarjeta</option>
                                        <option>Transferencia</option>
                                    </select>
                                </div>
                            </div>

                            {creditoCompra > 0 && (
                                <div className="mt-4">
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Fecha vencimiento del crédito
                                    </label>
                                    <input
                                        value={formularioCompra.fechaVencimiento}
                                        onChange={(event) =>
                                            actualizarCompra("fechaVencimiento", event.target.value)
                                        }
                                        type="date"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            )}

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Observaciones
                                </label>
                                <textarea
                                    value={formularioCompra.observaciones}
                                    onChange={(event) =>
                                        actualizarCompra("observaciones", event.target.value)
                                    }
                                    rows={3}
                                    placeholder="Factura, referencia, condiciones..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                                <h4 className="text-sm font-black text-slate-800">
                                    Resumen de compra
                                </h4>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Total
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-800">
                                            {formatoMoneda(totalCompra, configuracion.simboloMoneda)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-emerald-50 p-4">
                                        <p className="text-[11px] font-bold text-emerald-700">
                                            Pago ahora
                                        </p>
                                        <p className="mt-1 text-sm font-black text-emerald-700">
                                            {formatoMoneda(
                                                pagoAhoraCompra,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>

                                    <div
                                        className={`rounded-2xl p-4 ${creditoCompra > 0 ? "bg-amber-50" : "bg-slate-100"
                                            }`}
                                    >
                                        <p
                                            className={`text-[11px] font-bold ${creditoCompra > 0 ? "text-amber-700" : "text-slate-500"
                                                }`}
                                        >
                                            Crédito
                                        </p>
                                        <p
                                            className={`mt-1 text-sm font-black ${creditoCompra > 0 ? "text-amber-700" : "text-slate-600"
                                                }`}
                                        >
                                            {formatoMoneda(
                                                Math.max(creditoCompra, 0),
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {(proveedorCompra || productoCompra) && (
                                    <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
                                        {proveedorCompra?.nombre || "Proveedor"} ·{" "}
                                        {productoCompra?.nombre || "Producto"} · Cantidad{" "}
                                        {cantidadCompra || 0}
                                    </p>
                                )}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Registrar compra
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarCompra}
                                    className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Abonar a proveedor
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Pagos parciales a cuentas pendientes
                            </p>
                        </div>

                        <form onSubmit={registrarAbono} className="p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Cuenta por pagar
                                </label>
                                <select
                                    value={formularioAbono.cuentaId}
                                    onChange={(event) =>
                                        setFormularioAbono((datos) => ({
                                            ...datos,
                                            cuentaId: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option value="">Seleccionar cuenta</option>
                                    {cuentasPendientes.map((cuenta) => (
                                        <option key={cuenta.id} value={cuenta.id}>
                                            {cuenta.proveedorNombre} · Saldo{" "}
                                            {formatoMoneda(cuenta.saldo, configuracion.simboloMoneda)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Monto
                                    </label>
                                    <input
                                        value={formularioAbono.monto}
                                        onChange={(event) =>
                                            setFormularioAbono((datos) => ({
                                                ...datos,
                                                monto: event.target.value,
                                            }))
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Método
                                    </label>
                                    <select
                                        value={formularioAbono.metodo}
                                        onChange={(event) =>
                                            setFormularioAbono((datos) => ({
                                                ...datos,
                                                metodo: event.target.value as MetodoPago,
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option>Efectivo</option>
                                        <option>Tarjeta</option>
                                        <option>Transferencia</option>
                                    </select>
                                </div>
                            </div>

                            <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800">
                                <WalletCards className="h-4 w-4" />
                                Registrar abono
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Historial de compras
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Compras registradas, pagos, créditos y anulaciones
                            </p>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-80">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={busquedaCompra}
                                onChange={(event) => setBusquedaCompra(event.target.value)}
                                placeholder="Buscar compra..."
                                className="w-full bg-transparent text-[13px] font-medium outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1150px]">
                        <thead>
                            <tr className="border-b border-black/[0.04]">
                                {[
                                    "Fecha",
                                    "Proveedor",
                                    "Producto",
                                    "Cantidad",
                                    "Total",
                                    "Pagado",
                                    "Crédito",
                                    "Estado",
                                    "Acciones",
                                ].map((titulo) => (
                                    <th
                                        key={titulo}
                                        className="mono px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pl-6"
                                    >
                                        {titulo}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {comprasFiltradas.map((compra) => (
                                <tr key={compra.id} className="border-b border-black/[0.03]">
                                    <td className="px-6 py-4">
                                        <p className="text-[12px] font-bold text-slate-700">
                                            {compra.fecha}
                                        </p>
                                        <p className="mono mt-0.5 text-[10px] text-slate-400">
                                            {compra.hora}
                                        </p>
                                    </td>

                                    <td className="px-4 py-4 text-[12px] font-medium text-slate-700">
                                        {compra.proveedorNombre}
                                    </td>

                                    <td className="px-4 py-4">
                                        <p className="text-[12px] font-bold text-slate-700">
                                            {compra.productoNombre}
                                        </p>
                                        <p className="mono mt-0.5 text-[10px] text-slate-400">
                                            Costo unitario{" "}
                                            {formatoMoneda(
                                                compra.costoUnitario,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </td>

                                    <td className="px-4 py-4 text-[12px] font-black text-slate-800">
                                        {compra.cantidad}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] font-black text-slate-800">
                                        {formatoMoneda(compra.total, configuracion.simboloMoneda)}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] text-emerald-700">
                                        {formatoMoneda(
                                            compra.pagoAhora,
                                            configuracion.simboloMoneda
                                        )}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] text-amber-700">
                                        {formatoMoneda(compra.credito, configuracion.simboloMoneda)}
                                    </td>

                                    <td className="px-4 py-4">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${compra.estado === "Activa"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-red-50 text-red-700"
                                                }`}
                                        >
                                            {compra.estado}
                                        </span>
                                    </td>

                                    <td className="px-4 py-4">
                                        {compra.estado !== "Anulada" ? (
                                            <button
                                                onClick={() => anularCompra(compra)}
                                                className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Anular
                                            </button>
                                        ) : (
                                            <span className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-400">
                                                Anulada
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {comprasFiltradas.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-6 py-10 text-center text-[12px] text-slate-400"
                                    >
                                        No hay compras registradas o no coinciden con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <h3 className="text-[16px] font-bold text-slate-800">
                        Cuentas por pagar
                    </h3>
                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                        Créditos pendientes, parciales, pagados, vencidos o anulados
                    </p>
                </div>

                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {cuentasPagar.map((cuenta) => {
                        const estadoVisual = estadoVisualCuenta(cuenta);

                        return (
                            <div
                                key={cuenta.id}
                                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800">
                                            {cuenta.proveedorNombre}
                                        </h4>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {cuenta.concepto}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoCuenta(
                                            estadoVisual
                                        )}`}
                                    >
                                        {estadoVisual}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <p className="text-[10px] font-bold text-slate-400">
                                            Total
                                        </p>
                                        <p className="mt-1 text-xs font-black text-slate-800">
                                            {formatoMoneda(cuenta.total, configuracion.simboloMoneda)}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-amber-50 p-3">
                                        <p className="text-[10px] font-bold text-amber-700">
                                            Saldo
                                        </p>
                                        <p className="mt-1 text-xs font-black text-amber-700">
                                            {formatoMoneda(cuenta.saldo, configuracion.simboloMoneda)}
                                        </p>
                                    </div>
                                </div>

                                <p className="mono mt-3 text-[10px] text-slate-400">
                                    Vence: {cuenta.fechaVencimiento || "Sin fecha"}
                                </p>

                                {cuenta.abonos?.length > 0 && (
                                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                                        <p className="text-[10px] font-bold text-slate-400">
                                            Abonos registrados: {cuenta.abonos.length}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {cuentasPagar.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center md:col-span-2 xl:col-span-3">
                            <ReceiptText className="mx-auto h-8 w-8 text-slate-300" />
                            <h4 className="mt-3 text-sm font-black text-slate-700">
                                No hay cuentas por pagar
                            </h4>
                            <p className="mt-1 text-xs text-slate-400">
                                Las cuentas aparecerán cuando registres compras a crédito.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </AppShell>
    );
}