"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Archive,
    BadgeDollarSign,
    Boxes,
    CalendarClock,
    CheckCircle2,
    Edit3,
    Filter,
    Package,
    PackageCheck,
    PackageMinus,
    PackagePlus,
    Plus,
    Search,
    ShieldAlert,
    Trash2,
    TrendingUp,
    Warehouse,
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

type FormularioProducto = {
    codigo: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stock: string;
    stockMinimo: string;
    costoCompra: string;
    precioVenta: string;
    proveedor: string;
    vencimiento: string;
};

type FormularioMovimiento = {
    productoId: string;
    tipo: TipoMovimiento;
    cantidad: string;
    costoUnitario: string;
    motivo: string;
};

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

const formularioProductoVacio: FormularioProducto = {
    codigo: "",
    nombre: "",
    categoria: "",
    unidad: "",
    stock: "",
    stockMinimo: "",
    costoCompra: "",
    precioVenta: "",
    proveedor: "",
    vencimiento: "",
};

const formularioMovimientoVacio: FormularioMovimiento = {
    productoId: "",
    tipo: "Entrada",
    cantidad: "",
    costoUnitario: "",
    motivo: "",
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

function diasParaVencer(fecha: string) {
    if (!fecha) return null;

    const hoy = new Date(fechaHoyLocal());
    const vencimiento = new Date(fecha);

    const diferencia = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

function colorEstadoProducto(estado: EstadoProducto) {
    if (estado === "Activo") {
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    }

    return "bg-slate-100 text-slate-500 border border-slate-200";
}

function colorMovimiento(tipo: TipoMovimiento) {
    if (tipo === "Entrada") return "bg-emerald-50 text-emerald-700";
    if (tipo === "Salida") return "bg-blue-50 text-blue-700";
    if (tipo === "Uso clínico") return "bg-indigo-50 text-indigo-700";
    if (tipo === "Pérdida") return "bg-red-50 text-red-700";

    return "bg-amber-50 text-amber-700";
}

export default function InventarioPage() {
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [productos, setProductos] = useState<Producto[]>([]);
    const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);

    const [formularioProducto, setFormularioProducto] =
        useState<FormularioProducto>(formularioProductoVacio);

    const [formularioMovimiento, setFormularioMovimiento] =
        useState<FormularioMovimiento>(formularioMovimientoVacio);

    const [productoEditandoId, setProductoEditandoId] = useState<string | null>(
        null
    );

    const [busqueda, setBusqueda] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("Todas");
    const [filtroEstado, setFiltroEstado] = useState<
        "Todos" | "Activo" | "Inactivo"
    >("Todos");

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
        const productosGuardados = localStorage.getItem("productos_sistema_clinico");
        const movimientosGuardados = localStorage.getItem(
            "movimientos_inventario_sistema_clinico"
        );

        if (usuarioGuardado) {
            setUsuario(JSON.parse(usuarioGuardado) as UsuarioSistema);
        }

        setConfiguracion(obtenerConfiguracionClinica());

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
    }, []);

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

    function actualizarProducto<K extends keyof FormularioProducto>(
        campo: K,
        valor: FormularioProducto[K]
    ) {
        setFormularioProducto((datos) => ({
            ...datos,
            [campo]: valor,
        }));
    }

    function actualizarMovimiento<K extends keyof FormularioMovimiento>(
        campo: K,
        valor: FormularioMovimiento[K]
    ) {
        setFormularioMovimiento((datos) => ({
            ...datos,
            [campo]: valor,
        }));
    }

    function limpiarProducto() {
        setFormularioProducto(formularioProductoVacio);
        setProductoEditandoId(null);
    }

    function limpiarMovimiento() {
        setFormularioMovimiento(formularioMovimientoVacio);
    }

    function guardarProducto(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!formularioProducto.nombre.trim()) {
            alert("El nombre del producto es obligatorio.");
            return;
        }

        if (!formularioProducto.categoria.trim()) {
            alert("La categoría es obligatoria.");
            return;
        }

        if (!formularioProducto.unidad.trim()) {
            alert("La unidad es obligatoria.");
            return;
        }

        if (numero(formularioProducto.stock) < 0) {
            alert("El stock no puede ser negativo.");
            return;
        }

        if (numero(formularioProducto.stockMinimo) < 0) {
            alert("El stock mínimo no puede ser negativo.");
            return;
        }

        if (numero(formularioProducto.costoCompra) < 0) {
            alert("El costo de compra no puede ser negativo.");
            return;
        }

        if (numero(formularioProducto.precioVenta) < 0) {
            alert("El precio de venta no puede ser negativo.");
            return;
        }

        if (productoEditandoId) {
            const productoAnterior = productos.find(
                (producto) => producto.id === productoEditandoId
            );

            const nuevaLista = productos.map((producto) =>
                producto.id === productoEditandoId
                    ? {
                        ...producto,
                        codigo: formularioProducto.codigo.trim(),
                        nombre: formularioProducto.nombre.trim(),
                        categoria: formularioProducto.categoria.trim(),
                        unidad: formularioProducto.unidad.trim(),
                        stock: numero(formularioProducto.stock),
                        stockMinimo: numero(formularioProducto.stockMinimo),
                        costoCompra: numero(formularioProducto.costoCompra),
                        precioVenta: numero(formularioProducto.precioVenta),
                        proveedor: formularioProducto.proveedor.trim(),
                        vencimiento: formularioProducto.vencimiento,
                    }
                    : producto
            );

            guardarProductos(nuevaLista);

            if (
                productoAnterior &&
                productoAnterior.stock !== numero(formularioProducto.stock)
            ) {
                const nuevoMovimiento: MovimientoInventario = {
                    id: `MOV-${Date.now()}`,
                    fecha: fechaHoyLocal(),
                    hora: horaActualLocal(),
                    productoId: productoAnterior.id,
                    productoNombre: formularioProducto.nombre.trim(),
                    tipo: "Ajuste",
                    cantidad: numero(formularioProducto.stock),
                    stockAnterior: productoAnterior.stock,
                    stockNuevo: numero(formularioProducto.stock),
                    costoUnitario: numero(formularioProducto.costoCompra),
                    motivo: "Ajuste automático por edición del producto",
                    usuarioNombre: usuario?.nombre || "Usuario no identificado",
                };

                guardarMovimientos([nuevoMovimiento, ...movimientos]);
            }

            limpiarProducto();
            alert("Producto actualizado correctamente.");
            return;
        }

        const nuevoProducto: Producto = {
            id: `PROD-${Date.now()}`,
            codigo: formularioProducto.codigo.trim() || `PROD-${Date.now()}`,
            nombre: formularioProducto.nombre.trim(),
            categoria: formularioProducto.categoria.trim(),
            unidad: formularioProducto.unidad.trim(),
            stock: numero(formularioProducto.stock),
            stockMinimo: numero(formularioProducto.stockMinimo),
            costoCompra: numero(formularioProducto.costoCompra),
            precioVenta: numero(formularioProducto.precioVenta),
            proveedor: formularioProducto.proveedor.trim(),
            vencimiento: formularioProducto.vencimiento,
            estado: "Activo",
        };

        guardarProductos([nuevoProducto, ...productos]);

        const nuevoMovimiento: MovimientoInventario = {
            id: `MOV-${Date.now()}`,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            productoId: nuevoProducto.id,
            productoNombre: nuevoProducto.nombre,
            tipo: "Entrada",
            cantidad: nuevoProducto.stock,
            stockAnterior: 0,
            stockNuevo: nuevoProducto.stock,
            costoUnitario: nuevoProducto.costoCompra,
            motivo: "Registro inicial del producto",
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        guardarMovimientos([nuevoMovimiento, ...movimientos]);
        limpiarProducto();

        alert("Producto registrado correctamente.");
    }

    function editarProducto(producto: Producto) {
        setProductoEditandoId(producto.id);
        setFormularioProducto({
            codigo: producto.codigo,
            nombre: producto.nombre,
            categoria: producto.categoria,
            unidad: producto.unidad,
            stock: producto.stock.toString(),
            stockMinimo: producto.stockMinimo.toString(),
            costoCompra: producto.costoCompra.toString(),
            precioVenta: producto.precioVenta.toString(),
            proveedor: producto.proveedor,
            vencimiento: producto.vencimiento,
        });
    }

    function cambiarEstadoProducto(producto: Producto) {
        const confirmar = window.confirm(
            `¿Seguro que deseas ${producto.estado === "Activo" ? "desactivar" : "activar"
            } este producto?`
        );

        if (!confirmar) return;

        const nuevaLista = productos.map((item) =>
            item.id === producto.id
                ? {
                    ...item,
                    estado: item.estado === "Activo" ? "Inactivo" : "Activo",
                }
                : item
        );

        guardarProductos(nuevaLista);
    }

    function registrarMovimiento(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const producto = productos.find(
            (item) => item.id === formularioMovimiento.productoId
        );

        if (!producto) {
            alert("Selecciona un producto.");
            return;
        }

        const cantidad = numero(formularioMovimiento.cantidad);

        if (cantidad < 0) {
            alert("La cantidad no puede ser negativa.");
            return;
        }

        if (formularioMovimiento.tipo !== "Ajuste" && cantidad <= 0) {
            alert("La cantidad debe ser mayor que cero.");
            return;
        }

        const stockAnterior = producto.stock;
        let stockNuevo = stockAnterior;

        if (formularioMovimiento.tipo === "Entrada") {
            stockNuevo = stockAnterior + cantidad;
        }

        if (
            formularioMovimiento.tipo === "Salida" ||
            formularioMovimiento.tipo === "Uso clínico" ||
            formularioMovimiento.tipo === "Pérdida"
        ) {
            if (cantidad > stockAnterior) {
                alert("No hay suficiente stock disponible para este movimiento.");
                return;
            }

            stockNuevo = stockAnterior - cantidad;
        }

        if (formularioMovimiento.tipo === "Ajuste") {
            stockNuevo = cantidad;
        }

        const nuevaListaProductos = productos.map((item) =>
            item.id === producto.id
                ? {
                    ...item,
                    stock: stockNuevo,
                    costoCompra:
                        formularioMovimiento.tipo === "Entrada" &&
                            numero(formularioMovimiento.costoUnitario) > 0
                            ? numero(formularioMovimiento.costoUnitario)
                            : item.costoCompra,
                }
                : item
        );

        const nuevoMovimiento: MovimientoInventario = {
            id: `MOV-${Date.now()}`,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            productoId: producto.id,
            productoNombre: producto.nombre,
            tipo: formularioMovimiento.tipo,
            cantidad,
            stockAnterior,
            stockNuevo,
            costoUnitario:
                numero(formularioMovimiento.costoUnitario) || producto.costoCompra,
            motivo:
                formularioMovimiento.motivo.trim() ||
                `Movimiento de inventario: ${formularioMovimiento.tipo}`,
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        guardarProductos(nuevaListaProductos);
        guardarMovimientos([nuevoMovimiento, ...movimientos]);
        limpiarMovimiento();

        alert("Movimiento registrado correctamente.");
    }

    const categorias = useMemo(() => {
        const lista = productos
            .map((producto) => producto.categoria)
            .filter(Boolean);

        return ["Todas", ...Array.from(new Set(lista))];
    }, [productos]);

    const productosFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();

        return productos.filter((producto) => {
            const coincideTexto =
                !texto ||
                producto.nombre.toLowerCase().includes(texto) ||
                producto.codigo.toLowerCase().includes(texto) ||
                producto.categoria.toLowerCase().includes(texto) ||
                producto.proveedor.toLowerCase().includes(texto);

            const coincideCategoria =
                filtroCategoria === "Todas" || producto.categoria === filtroCategoria;

            const coincideEstado =
                filtroEstado === "Todos" || producto.estado === filtroEstado;

            return coincideTexto && coincideCategoria && coincideEstado;
        });
    }, [productos, busqueda, filtroCategoria, filtroEstado]);

    const productosActivos = productos.filter(
        (producto) => producto.estado === "Activo"
    );

    const productosBajoStock = productosActivos.filter(
        (producto) => producto.stock <= producto.stockMinimo
    );

    const productosPorVencer = productosActivos.filter((producto) => {
        const dias = diasParaVencer(producto.vencimiento);
        return dias !== null && dias >= 0 && dias <= 60;
    });

    const productosVencidos = productosActivos.filter((producto) => {
        const dias = diasParaVencer(producto.vencimiento);
        return dias !== null && dias < 0;
    });

    const valorInventario = productosActivos.reduce(
        (total, producto) => total + producto.stock * producto.costoCompra,
        0
    );

    const valorVentaEstimado = productosActivos.reduce(
        (total, producto) => total + producto.stock * producto.precioVenta,
        0
    );

    const productoMovimiento = productos.find(
        (producto) => producto.id === formularioMovimiento.productoId
    );

    return (
        <AppShell
            titulo="Almacén e Inventario"
            descripcion="Control de productos, stock, movimientos, vencimientos y disponibilidad para venta"
            moduloActivo="Almacén e Inventario"
        >
            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Boxes className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Activos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {productosActivos.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Productos activos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Stock
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {productosBajoStock.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Productos bajo stock
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <BadgeDollarSign className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Costo
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(valorInventario, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Valor inventario
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                            <TrendingUp className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            Venta
                        </span>
                    </div>

                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">
                        {formatoMoneda(valorVentaEstimado, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Venta estimada
                    </p>
                </div>
            </section>

            {(productosBajoStock.length > 0 ||
                productosPorVencer.length > 0 ||
                productosVencidos.length > 0) && (
                    <section className="mt-4 grid gap-4 lg:grid-cols-3">
                        {productosBajoStock.length > 0 && (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
                                    <div>
                                        <h3 className="text-sm font-black text-amber-800">
                                            Productos bajo stock
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-amber-700">
                                            Hay {productosBajoStock.length} producto(s) que necesitan
                                            reposición.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {productosPorVencer.length > 0 && (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                                <div className="flex items-start gap-3">
                                    <CalendarClock className="mt-0.5 h-5 w-5 text-blue-700" />
                                    <div>
                                        <h3 className="text-sm font-black text-blue-800">
                                            Próximos a vencer
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-blue-700">
                                            Hay {productosPorVencer.length} producto(s) que vencen en
                                            los próximos 60 días.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {productosVencidos.length > 0 && (
                            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 text-red-700" />
                                    <div>
                                        <h3 className="text-sm font-black text-red-800">
                                            Productos vencidos
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-red-700">
                                            Hay {productosVencidos.length} producto(s) vencido(s). Revisar
                                            antes de usar o vender.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Productos del inventario
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Insumos, medicamentos y productos para venta
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:w-80">
                                    <Search className="h-4 w-4 text-slate-400" />
                                    <input
                                        value={busqueda}
                                        onChange={(event) => setBusqueda(event.target.value)}
                                        placeholder="Buscar producto..."
                                        className="w-full bg-transparent text-[13px] font-medium outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <select
                                    value={filtroCategoria}
                                    onChange={(event) => setFiltroCategoria(event.target.value)}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    {categorias.map((categoria) => (
                                        <option key={categoria}>{categoria}</option>
                                    ))}
                                </select>

                                <select
                                    value={filtroEstado}
                                    onChange={(event) =>
                                        setFiltroEstado(
                                            event.target.value as "Todos" | "Activo" | "Inactivo"
                                        )
                                    }
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option>Todos</option>
                                    <option>Activo</option>
                                    <option>Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="max-h-[900px] overflow-y-auto p-4">
                            <div className="grid gap-3">
                                {productosFiltrados.map((producto) => {
                                    const bajoStock = producto.stock <= producto.stockMinimo;
                                    const diasVencimiento = diasParaVencer(producto.vencimiento);
                                    const vencido =
                                        diasVencimiento !== null && diasVencimiento < 0;
                                    const porVencer =
                                        diasVencimiento !== null &&
                                        diasVencimiento >= 0 &&
                                        diasVencimiento <= 60;

                                    return (
                                        <div
                                            key={producto.id}
                                            className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                <div className="flex gap-3">
                                                    <div
                                                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${bajoStock || vencido
                                                                ? "bg-red-50 text-red-700"
                                                                : "bg-teal-50 text-teal-700"
                                                            }`}
                                                    >
                                                        <Package className="h-6 w-6" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-sm font-black text-slate-800">
                                                                {producto.nombre}
                                                            </h4>

                                                            <span
                                                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoProducto(
                                                                    producto.estado
                                                                )}`}
                                                            >
                                                                {producto.estado}
                                                            </span>
                                                        </div>

                                                        <p className="mono mt-1 text-[10px] text-slate-400">
                                                            {producto.codigo || "Sin código"} ·{" "}
                                                            {producto.categoria}
                                                        </p>

                                                        <p className="mt-2 text-xs font-medium text-slate-500">
                                                            Proveedor: {producto.proveedor || "No registrado"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
                                                    <p className="mono text-[9px] text-white/40">Stock</p>
                                                    <p className="text-lg font-black">
                                                        {producto.stock}
                                                    </p>
                                                    <p className="text-[10px] text-white/45">
                                                        {producto.unidad}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid gap-3 md:grid-cols-4">
                                                <div className="rounded-2xl bg-slate-50 p-4">
                                                    <p className="text-[11px] font-bold text-slate-400">
                                                        Stock mínimo
                                                    </p>
                                                    <p
                                                        className={`mt-1 text-sm font-black ${bajoStock ? "text-red-600" : "text-slate-800"
                                                            }`}
                                                    >
                                                        {producto.stockMinimo}
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl bg-emerald-50 p-4">
                                                    <p className="text-[11px] font-bold text-emerald-700">
                                                        Costo compra
                                                    </p>
                                                    <p className="mt-1 text-sm font-black text-emerald-700">
                                                        {formatoMoneda(
                                                            producto.costoCompra,
                                                            configuracion.simboloMoneda
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl bg-blue-50 p-4">
                                                    <p className="text-[11px] font-bold text-blue-700">
                                                        Precio venta
                                                    </p>
                                                    <p className="mt-1 text-sm font-black text-blue-700">
                                                        {formatoMoneda(
                                                            producto.precioVenta,
                                                            configuracion.simboloMoneda
                                                        )}
                                                    </p>
                                                </div>

                                                <div
                                                    className={`rounded-2xl p-4 ${vencido
                                                            ? "bg-red-50"
                                                            : porVencer
                                                                ? "bg-amber-50"
                                                                : "bg-slate-50"
                                                        }`}
                                                >
                                                    <p
                                                        className={`text-[11px] font-bold ${vencido
                                                                ? "text-red-700"
                                                                : porVencer
                                                                    ? "text-amber-700"
                                                                    : "text-slate-400"
                                                            }`}
                                                    >
                                                        Vencimiento
                                                    </p>
                                                    <p
                                                        className={`mt-1 text-sm font-black ${vencido
                                                                ? "text-red-700"
                                                                : porVencer
                                                                    ? "text-amber-700"
                                                                    : "text-slate-800"
                                                            }`}
                                                    >
                                                        {producto.vencimiento || "No aplica"}
                                                    </p>
                                                </div>
                                            </div>

                                            {(bajoStock || vencido || porVencer) && (
                                                <div className="mt-3 rounded-2xl bg-amber-50 p-4">
                                                    <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        {bajoStock && "Bajo stock. "}
                                                        {vencido && "Producto vencido. "}
                                                        {porVencer &&
                                                            !vencido &&
                                                            `Vence en ${diasVencimiento} día(s).`}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => editarProducto(producto)}
                                                    className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                    Editar
                                                </button>

                                                <button
                                                    onClick={() => cambiarEstadoProducto(producto)}
                                                    className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    {producto.estado === "Activo"
                                                        ? "Desactivar"
                                                        : "Activar"}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {productosFiltrados.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <Archive className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            No encontramos productos
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Probá cambiar filtros o registrar un nuevo producto.
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
                                        {productoEditandoId ? "Editar producto" : "Nuevo producto"}
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Registro de insumos, medicamentos o productos de venta
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                    <PackagePlus className="h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </div>

                        <form onSubmit={guardarProducto} className="p-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Código
                                    </label>
                                    <input
                                        value={formularioProducto.codigo}
                                        onChange={(event) =>
                                            actualizarProducto("codigo", event.target.value)
                                        }
                                        placeholder="PROD-001"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Nombre
                                    </label>
                                    <input
                                        value={formularioProducto.nombre}
                                        onChange={(event) =>
                                            actualizarProducto("nombre", event.target.value)
                                        }
                                        placeholder="Nombre del producto"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Categoría
                                    </label>
                                    <input
                                        value={formularioProducto.categoria}
                                        onChange={(event) =>
                                            actualizarProducto("categoria", event.target.value)
                                        }
                                        placeholder="Insumos, Medicamento, Producto venta..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Unidad
                                    </label>
                                    <input
                                        value={formularioProducto.unidad}
                                        onChange={(event) =>
                                            actualizarProducto("unidad", event.target.value)
                                        }
                                        placeholder="Unidad, caja, frasco..."
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Stock actual
                                    </label>
                                    <input
                                        value={formularioProducto.stock}
                                        onChange={(event) =>
                                            actualizarProducto("stock", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Stock mínimo
                                    </label>
                                    <input
                                        value={formularioProducto.stockMinimo}
                                        onChange={(event) =>
                                            actualizarProducto("stockMinimo", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Costo compra
                                    </label>
                                    <input
                                        value={formularioProducto.costoCompra}
                                        onChange={(event) =>
                                            actualizarProducto("costoCompra", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Precio venta
                                    </label>
                                    <input
                                        value={formularioProducto.precioVenta}
                                        onChange={(event) =>
                                            actualizarProducto("precioVenta", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Proveedor
                                </label>
                                <input
                                    value={formularioProducto.proveedor}
                                    onChange={(event) =>
                                        actualizarProducto("proveedor", event.target.value)
                                    }
                                    placeholder="Nombre del proveedor"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Fecha de vencimiento
                                </label>
                                <input
                                    value={formularioProducto.vencimiento}
                                    onChange={(event) =>
                                        actualizarProducto("vencimiento", event.target.value)
                                    }
                                    type="date"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                    <Plus className="h-4 w-4" />
                                    {productoEditandoId ? "Guardar cambios" : "Registrar producto"}
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarProducto}
                                    className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Movimiento de inventario
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Entradas, salidas, uso clínico, pérdidas o ajustes
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <PackageCheck className="h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </div>

                        <form onSubmit={registrarMovimiento} className="p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Producto
                                </label>
                                <select
                                    value={formularioMovimiento.productoId}
                                    onChange={(event) =>
                                        actualizarMovimiento("productoId", event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option value="">Seleccionar producto</option>
                                    {productos
                                        .filter((producto) => producto.estado === "Activo")
                                        .map((producto) => (
                                            <option key={producto.id} value={producto.id}>
                                                {producto.nombre} · Stock {producto.stock}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Tipo de movimiento
                                    </label>
                                    <select
                                        value={formularioMovimiento.tipo}
                                        onChange={(event) =>
                                            actualizarMovimiento(
                                                "tipo",
                                                event.target.value as TipoMovimiento
                                            )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option>Entrada</option>
                                        <option>Salida</option>
                                        <option>Uso clínico</option>
                                        <option>Pérdida</option>
                                        <option>Ajuste</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        {formularioMovimiento.tipo === "Ajuste"
                                            ? "Nuevo stock"
                                            : "Cantidad"}
                                    </label>
                                    <input
                                        value={formularioMovimiento.cantidad}
                                        onChange={(event) =>
                                            actualizarMovimiento("cantidad", event.target.value)
                                        }
                                        type="number"
                                        placeholder="0"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Costo unitario
                                </label>
                                <input
                                    value={formularioMovimiento.costoUnitario}
                                    onChange={(event) =>
                                        actualizarMovimiento("costoUnitario", event.target.value)
                                    }
                                    type="number"
                                    placeholder={
                                        productoMovimiento
                                            ? productoMovimiento.costoCompra.toString()
                                            : "0.00"
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            {productoMovimiento && (
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-[11px] font-bold text-slate-400">
                                            Stock actual
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-800">
                                            {productoMovimiento.stock}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-teal-50 p-4">
                                        <p className="text-[11px] font-bold text-teal-700">
                                            Unidad
                                        </p>
                                        <p className="mt-1 text-sm font-black text-teal-700">
                                            {productoMovimiento.unidad}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-blue-50 p-4">
                                        <p className="text-[11px] font-bold text-blue-700">
                                            Costo actual
                                        </p>
                                        <p className="mt-1 text-sm font-black text-blue-700">
                                            {formatoMoneda(
                                                productoMovimiento.costoCompra,
                                                configuracion.simboloMoneda
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Motivo
                                </label>
                                <textarea
                                    value={formularioMovimiento.motivo}
                                    onChange={(event) =>
                                        actualizarMovimiento("motivo", event.target.value)
                                    }
                                    rows={3}
                                    placeholder="Compra, uso en clínica, ajuste físico, pérdida..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800">
                                    <PackageMinus className="h-4 w-4" />
                                    Registrar movimiento
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarMovimiento}
                                    className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-teal-700" />
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Historial de movimientos
                        </h3>
                    </div>
                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                        Entradas, salidas, usos clínicos, pérdidas y ajustes de stock
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px]">
                        <thead>
                            <tr className="border-b border-black/[0.04]">
                                {[
                                    "Fecha",
                                    "Producto",
                                    "Tipo",
                                    "Cantidad",
                                    "Stock",
                                    "Costo",
                                    "Motivo",
                                    "Usuario",
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
                            {movimientos.slice(0, 80).map((movimiento) => (
                                <tr key={movimiento.id} className="border-b border-black/[0.03]">
                                    <td className="px-6 py-4">
                                        <p className="text-[12px] font-bold text-slate-700">
                                            {movimiento.fecha}
                                        </p>
                                        <p className="mono mt-0.5 text-[10px] text-slate-400">
                                            {movimiento.hora}
                                        </p>
                                    </td>

                                    <td className="px-4 py-4 text-[12px] font-medium text-slate-700">
                                        {movimiento.productoNombre}
                                    </td>

                                    <td className="px-4 py-4">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorMovimiento(
                                                movimiento.tipo
                                            )}`}
                                        >
                                            {movimiento.tipo}
                                        </span>
                                    </td>

                                    <td className="px-4 py-4 text-[12px] font-black text-slate-800">
                                        {movimiento.cantidad}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] text-slate-500">
                                        {movimiento.stockAnterior} → {movimiento.stockNuevo}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] text-slate-500">
                                        {formatoMoneda(
                                            movimiento.costoUnitario,
                                            configuracion.simboloMoneda
                                        )}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] text-slate-500">
                                        {movimiento.motivo}
                                    </td>

                                    <td className="px-4 py-4 text-[12px] text-slate-500">
                                        {movimiento.usuarioNombre}
                                    </td>
                                </tr>
                            ))}

                            {movimientos.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-6 py-10 text-center text-[12px] text-slate-400"
                                    >
                                        Todavía no hay movimientos de inventario.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-6 text-white">
                    <Warehouse className="absolute right-8 top-1/2 h-24 w-24 -translate-y-1/2 opacity-10" />

                    <div className="relative z-10">
                        <h3 className="text-xl font-black">Conexión con Caja y Venta</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
                            Los productos activos con precio de venta aparecerán en Caja. Al
                            venderlos, el sistema descuenta stock y registra automáticamente el
                            movimiento de salida.
                        </p>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}