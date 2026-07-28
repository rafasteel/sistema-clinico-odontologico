"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Banknote,
    Building2,
    CheckCircle2,
    Edit3,
    PackagePlus,
    Phone,
    Plus,
    ReceiptText,
    RefreshCcw,
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
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    listarProductosInventarioSupabase,
    type ProductoInventarioSupabase,
} from "@/lib/supabase/inventario";
import {
    actualizarProveedorSupabase,
    anularCompraProveedorSupabase,
    cambiarEstadoProveedorSupabase,
    crearProveedorSupabase,
    listarComprasProveedoresSupabase,
    listarCuentasPagarSupabase,
    listarProveedoresSupabase,
    registrarAbonoCuentaPagarSupabase,
    registrarCompraProveedorSupabase,
    type CompraProveedorSupabase,
    type CuentaPagarSupabase,
    type EstadoCompraProveedorSupabase,
    type EstadoCuentaPagarSupabase,
    type EstadoProveedorSupabase,
    type MetodoPagoProveedorSupabase,
    type ProveedorSupabase,
} from "@/lib/supabase/proveedores";

type UsuarioSistema = { usuario: string; nombre: string; rol: string };

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
    estado: EstadoProveedorSupabase;
    observaciones: string;
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
    metodoPago: MetodoPagoProveedorSupabase;
    fechaVencimiento: string;
    estado: EstadoCompraProveedorSupabase;
    usuarioNombre: string;
    observaciones: string;
    gastoId: string;
    cuentaPagarId: string;
};

type CuentaPorPagar = {
    id: string;
    compraId: string;
    proveedorId: string;
    proveedorNombre: string;
    concepto: string;
    total: number;
    abonado: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuentaPagarSupabase;
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
    metodoPago: MetodoPagoProveedorSupabase;
    fechaVencimiento: string;
    observaciones: string;
};

type FormularioAbono = {
    cuentaId: string;
    monto: string;
    metodo: MetodoPagoProveedorSupabase;
};

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

function mesActualLocal() {
    return fechaHoyLocal().slice(0, 7);
}

function numero(valor: string | number | null | undefined) {
    const convertido = Number(valor || 0);
    if (Number.isNaN(convertido)) return 0;
    return convertido;
}

function horaCorta(valor: string) {
    return String(valor || "").slice(0, 5);
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI")}`;
}

function normalizarTexto(valor: unknown) {
    return String(valor || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function colorEstadoProveedor(estado: EstadoProveedorSupabase) {
    if (estado === "Activo") return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    return "bg-slate-100 text-slate-500 border border-slate-200";
}

function colorEstadoCuenta(estado: EstadoCuentaPagarSupabase) {
    if (estado === "Pagada") return "bg-emerald-50 text-emerald-700";
    if (estado === "Parcial") return "bg-amber-50 text-amber-700";
    if (estado === "Pendiente") return "bg-blue-50 text-blue-700";
    if (estado === "Vencida") return "bg-red-50 text-red-700";
    return "bg-slate-100 text-slate-500";
}

function estadoVisualCuenta(cuenta: CuentaPorPagar): EstadoCuentaPagarSupabase {
    if (cuenta.estado === "Pagada" || cuenta.estado === "Anulada") return cuenta.estado;
    if (cuenta.fechaVencimiento && cuenta.fechaVencimiento < fechaHoyLocal()) return "Vencida";
    return cuenta.estado;
}

function convertirProveedor(proveedor: ProveedorSupabase): Proveedor {
    return {
        id: proveedor.id,
        nombre: proveedor.nombre || "",
        ruc: proveedor.ruc || "",
        telefono: proveedor.telefono || "",
        whatsapp: proveedor.whatsapp || "",
        correo: proveedor.correo || "",
        direccion: proveedor.direccion || "",
        categoria: proveedor.categoria || "",
        contacto: proveedor.contacto || "",
        estado: proveedor.estado || "Activo",
        observaciones: proveedor.observaciones || "",
    };
}

function convertirProducto(producto: ProductoInventarioSupabase): Producto {
    return {
        id: producto.id,
        codigo: producto.codigo || "",
        nombre: producto.nombre || "",
        categoria: producto.categoria || "",
        unidad: producto.unidad || "",
        stock: Number(producto.stock || 0),
        stockMinimo: Number(producto.stock_minimo || 0),
        costoCompra: Number(producto.costo_compra || 0),
        precioVenta: Number(producto.precio_venta || 0),
        proveedor: producto.proveedor || "",
        vencimiento: producto.vencimiento || "",
        estado: producto.estado || "Activo",
    };
}

function convertirCompra(compra: CompraProveedorSupabase): CompraProveedor {
    return {
        id: compra.id,
        fecha: compra.fecha,
        hora: horaCorta(compra.hora),
        proveedorId: compra.proveedor_id || "",
        proveedorNombre: compra.proveedor_nombre || "",
        productoId: compra.producto_id || "",
        productoNombre: compra.producto_nombre || "",
        cantidad: Number(compra.cantidad || 0),
        costoUnitario: Number(compra.costo_unitario || 0),
        total: Number(compra.total || 0),
        pagoAhora: Number(compra.pago_ahora || 0),
        credito: Number(compra.credito || 0),
        metodoPago: compra.metodo_pago || "Efectivo",
        fechaVencimiento: compra.fecha_vencimiento || "",
        estado: compra.estado || "Activa",
        usuarioNombre: compra.usuario_nombre || "",
        observaciones: compra.observaciones || "",
        gastoId: compra.gasto_id || "",
        cuentaPagarId: compra.cuenta_pagar_id || "",
    };
}

function convertirCuenta(cuenta: CuentaPagarSupabase): CuentaPorPagar {
    return {
        id: cuenta.id,
        compraId: cuenta.compra_id || "",
        proveedorId: cuenta.proveedor_id || "",
        proveedorNombre: cuenta.proveedor_nombre || "",
        concepto: cuenta.concepto || "",
        total: Number(cuenta.total || 0),
        abonado: Number(cuenta.abonado || 0),
        saldo: Number(cuenta.saldo || 0),
        fecha: cuenta.fecha,
        fechaVencimiento: cuenta.fecha_vencimiento || "",
        estado: cuenta.estado || "Pendiente",
    };
}

export default function ProveedoresPage() {
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(CONFIGURACION_PREDETERMINADA);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [compras, setCompras] = useState<CompraProveedor[]>([]);
    const [cuentasPagar, setCuentasPagar] = useState<CuentaPorPagar[]>([]);
    const [formularioProveedor, setFormularioProveedor] = useState<FormularioProveedor>(formularioProveedorVacio);
    const [formularioCompra, setFormularioCompra] = useState<FormularioCompra>(formularioCompraVacio);
    const [formularioAbono, setFormularioAbono] = useState<FormularioAbono>(formularioAbonoVacio);
    const [proveedorEditandoId, setProveedorEditandoId] = useState<string | null>(null);
    const [busquedaProveedor, setBusquedaProveedor] = useState("");
    const [busquedaCompra, setBusquedaCompra] = useState("");
    const [mesSeleccionado, setMesSeleccionado] = useState(mesActualLocal());
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setCargando(true);
        setError("");
        try {
            const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
            if (usuarioGuardado) setUsuario(JSON.parse(usuarioGuardado) as UsuarioSistema);
            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }
            const [proveedoresSupabase, productosSupabase, comprasSupabase, cuentasPagarSupabase] = await Promise.all([
                listarProveedoresSupabase(),
                listarProductosInventarioSupabase(),
                listarComprasProveedoresSupabase(mesSeleccionado),
                listarCuentasPagarSupabase(),
            ]);
            setProveedores(proveedoresSupabase.map(convertirProveedor));
            setProductos(productosSupabase.map(convertirProducto));
            setCompras(comprasSupabase.map(convertirCompra));
            setCuentasPagar(cuentasPagarSupabase.map(convertirCuenta));
        } catch (errorActual) {
            const mensaje = errorActual instanceof Error ? errorActual.message : "No se pudieron cargar proveedores desde Supabase.";
            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mesSeleccionado]);

    function actualizarProveedor<K extends keyof FormularioProveedor>(campo: K, valor: FormularioProveedor[K]) {
        setFormularioProveedor((datos) => ({ ...datos, [campo]: valor }));
    }

    function actualizarCompra<K extends keyof FormularioCompra>(campo: K, valor: FormularioCompra[K]) {
        setFormularioCompra((datos) => ({ ...datos, [campo]: valor }));
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
        setFormularioCompra((datos) => ({ ...datos, productoId, costoUnitario: producto ? producto.costoCompra.toString() : "" }));
    }

    async function guardarProveedor(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!formularioProveedor.nombre.trim()) return alert("El nombre del proveedor es obligatorio.");
        if (!formularioProveedor.telefono.trim()) return alert("El teléfono del proveedor es obligatorio.");
        if (!formularioProveedor.categoria.trim()) return alert("La categoría del proveedor es obligatoria.");
        setGuardando(true);
        try {
            const datos = {
                nombre: formularioProveedor.nombre.trim(),
                ruc: formularioProveedor.ruc.trim(),
                telefono: formularioProveedor.telefono.trim(),
                whatsapp: formularioProveedor.whatsapp.trim(),
                correo: formularioProveedor.correo.trim(),
                direccion: formularioProveedor.direccion.trim(),
                categoria: formularioProveedor.categoria.trim(),
                contacto: formularioProveedor.contacto.trim(),
                observaciones: formularioProveedor.observaciones.trim(),
            };
            if (proveedorEditandoId) {
                await actualizarProveedorSupabase(proveedorEditandoId, datos);
                alert("Proveedor actualizado correctamente.");
            } else {
                await crearProveedorSupabase(datos);
                alert("Proveedor registrado correctamente.");
            }
            limpiarProveedor();
            await cargarDatos();
        } catch (errorActual) {
            alert(errorActual instanceof Error ? errorActual.message : "No se pudo guardar el proveedor.");
        } finally {
            setGuardando(false);
        }
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

    async function cambiarEstadoProveedor(proveedor: Proveedor) {
        const confirmar = window.confirm(`¿Seguro que deseas ${proveedor.estado === "Activo" ? "desactivar" : "activar"} este proveedor?`);
        if (!confirmar) return;
        setGuardando(true);
        try {
            await cambiarEstadoProveedorSupabase(proveedor.id);
            await cargarDatos();
        } catch (errorActual) {
            alert(errorActual instanceof Error ? errorActual.message : "No se pudo cambiar el estado del proveedor.");
        } finally {
            setGuardando(false);
        }
    }

    async function registrarCompra(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const proveedor = proveedores.find((item) => item.id === formularioCompra.proveedorId);
        const producto = productos.find((item) => item.id === formularioCompra.productoId);
        const cantidad = numero(formularioCompra.cantidad);
        const costoUnitario = numero(formularioCompra.costoUnitario);
        const pagoAhora = numero(formularioCompra.pagoAhora);
        const total = cantidad * costoUnitario;
        const credito = total - pagoAhora;
        if (!proveedor) return alert("Selecciona un proveedor.");
        if (!producto) return alert("Selecciona un producto.");
        if (cantidad <= 0) return alert("La cantidad debe ser mayor que cero.");
        if (costoUnitario <= 0) return alert("El costo unitario debe ser mayor que cero.");
        if (pagoAhora < 0) return alert("El pago ahora no puede ser negativo.");
        if (pagoAhora > total) return alert("El pago ahora no puede ser mayor que el total.");
        if (credito > 0 && !formularioCompra.fechaVencimiento) return alert("Si queda crédito, debes indicar fecha de vencimiento.");
        setGuardando(true);
        try {
            await registrarCompraProveedorSupabase({
                proveedor_id: proveedor.id,
                producto_id: producto.id,
                cantidad,
                costo_unitario: costoUnitario,
                pago_ahora: pagoAhora,
                metodo_pago: formularioCompra.metodoPago,
                fecha_vencimiento: formularioCompra.fechaVencimiento,
                observaciones: formularioCompra.observaciones.trim(),
                usuario_nombre: usuario?.nombre || "Usuario no identificado",
            });
            limpiarCompra();
            await cargarDatos();
            alert("Compra registrada correctamente.");
        } catch (errorActual) {
            alert(errorActual instanceof Error ? errorActual.message : "No se pudo registrar la compra.");
        } finally {
            setGuardando(false);
        }
    }

    async function registrarAbono(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const cuenta = cuentasPagar.find((item) => item.id === formularioAbono.cuentaId);
        const monto = numero(formularioAbono.monto);
        if (!cuenta) return alert("Selecciona una cuenta por pagar.");
        if (monto <= 0) return alert("El monto debe ser mayor que cero.");
        if (monto > cuenta.saldo) return alert("El abono no puede ser mayor que el saldo.");
        setGuardando(true);
        try {
            await registrarAbonoCuentaPagarSupabase({
                cuenta_id: cuenta.id,
                monto,
                metodo: formularioAbono.metodo,
                usuario_nombre: usuario?.nombre || "Usuario no identificado",
                observaciones: `Abono aplicado a cuenta ${cuenta.id}`,
            });
            setFormularioAbono(formularioAbonoVacio);
            await cargarDatos();
            alert("Abono registrado correctamente.");
        } catch (errorActual) {
            alert(errorActual instanceof Error ? errorActual.message : "No se pudo registrar el abono.");
        } finally {
            setGuardando(false);
        }
    }

    async function anularCompra(compra: CompraProveedor) {
        if (compra.estado === "Anulada") return;
        const confirmar = window.confirm("¿Seguro que deseas anular esta compra? Se revertirá el stock y se anularán el gasto/cuenta relacionada.");
        if (!confirmar) return;
        setGuardando(true);
        try {
            await anularCompraProveedorSupabase(compra.id, usuario?.nombre || "Usuario no identificado");
            await cargarDatos();
            alert("Compra anulada correctamente.");
        } catch (errorActual) {
            alert(errorActual instanceof Error ? errorActual.message : "No se pudo anular la compra.");
        } finally {
            setGuardando(false);
        }
    }

    const proveedoresActivos = proveedores.filter((proveedor) => proveedor.estado === "Activo");
    const productosActivos = productos.filter((producto) => producto.estado === "Activo");
    const comprasActivas = compras.filter((compra) => compra.estado !== "Anulada");
    const totalCompradoMes = comprasActivas.reduce((total, compra) => total + compra.total, 0);
    const pagadoMes = comprasActivas.reduce((total, compra) => total + compra.pagoAhora, 0);
    const cuentasPendientes = cuentasPagar.filter((cuenta) => cuenta.estado !== "Pagada" && cuenta.estado !== "Anulada" && cuenta.saldo > 0);
    const saldoPorPagar = cuentasPendientes.reduce((total, cuenta) => total + cuenta.saldo, 0);
    const cuentasVencidas = cuentasPendientes.filter((cuenta) => estadoVisualCuenta(cuenta) === "Vencida");

    const proveedoresFiltrados = useMemo(() => {
        const texto = normalizarTexto(busquedaProveedor);
        return proveedores.filter((proveedor) => !texto || normalizarTexto(proveedor.nombre).includes(texto) || normalizarTexto(proveedor.categoria).includes(texto) || normalizarTexto(proveedor.telefono).includes(texto) || normalizarTexto(proveedor.correo).includes(texto) || normalizarTexto(proveedor.contacto).includes(texto));
    }, [proveedores, busquedaProveedor]);

    const comprasFiltradas = useMemo(() => {
        const texto = normalizarTexto(busquedaCompra);
        return compras.filter((compra) => !texto || normalizarTexto(compra.proveedorNombre).includes(texto) || normalizarTexto(compra.productoNombre).includes(texto) || normalizarTexto(compra.estado).includes(texto) || normalizarTexto(compra.id).includes(texto));
    }, [compras, busquedaCompra]);

    const proveedorCompra = proveedores.find((proveedor) => proveedor.id === formularioCompra.proveedorId);
    const productoCompra = productos.find((producto) => producto.id === formularioCompra.productoId);
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
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">No se pudo cargar proveedores</h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">{error}</p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">Proveedores conectados a Supabase</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Compras aumentan inventario real, crean gastos y cuentas por pagar en Supabase.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input value={mesSeleccionado} onChange={(event) => setMesSeleccionado(event.target.value)} type="month" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-bold text-slate-700 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" />
                    <button type="button" onClick={cargarDatos} disabled={cargando || guardando} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                        <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                        Recargar
                    </button>
                </div>
            </section>

            {cuentasVencidas.length > 0 && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">Cuentas vencidas</h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">Hay {cuentasVencidas.length} cuenta(s) por pagar vencida(s). Revisá los pagos pendientes a proveedores.</p>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Truck className="h-[18px] w-[18px]" /></div><span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">Activos</span></div>
                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">{proveedoresActivos.length}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Proveedores activos</p>
                </div>
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShoppingCart className="h-[18px] w-[18px]" /></div><span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Mes</span></div>
                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">{formatoMoneda(totalCompradoMes, configuracion.simboloMoneda)}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Compras del mes</p>
                </div>
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Banknote className="h-[18px] w-[18px]" /></div><span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Pagado</span></div>
                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">{formatoMoneda(pagadoMes, configuracion.simboloMoneda)}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Pagado este mes</p>
                </div>
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><BadgeDollarSignFallback /></div><span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">CxP</span></div>
                    <h3 className="mt-4 text-[24px] font-bold leading-none text-slate-800">{formatoMoneda(saldoPorPagar, configuracion.simboloMoneda)}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Saldo por pagar</p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div><h3 className="text-[16px] font-bold text-slate-800">{proveedorEditandoId ? "Editar proveedor" : "Nuevo proveedor"}</h3><p className="mono mt-0.5 text-[10px] text-slate-400">Datos comerciales y contacto principal</p></div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Building2 className="h-[18px] w-[18px]" /></div>
                            </div>
                        </div>
                        <form onSubmit={guardarProveedor} className="p-6">
                            <div><label className="mb-2 block text-xs font-bold text-slate-600">Nombre del proveedor</label><input value={formularioProveedor.nombre} onChange={(event) => actualizarProveedor("nombre", event.target.value)} placeholder="Ejemplo: Dental Supply Nicaragua" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-slate-600">RUC</label><input value={formularioProveedor.ruc} onChange={(event) => actualizarProveedor("ruc", event.target.value)} placeholder="RUC / identificación fiscal" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div><div><label className="mb-2 block text-xs font-bold text-slate-600">Categoría</label><input value={formularioProveedor.categoria} onChange={(event) => actualizarProveedor("categoria", event.target.value)} placeholder="Insumos, medicamentos..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div></div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-slate-600">Teléfono</label><input value={formularioProveedor.telefono} onChange={(event) => actualizarProveedor("telefono", event.target.value)} placeholder="2222-0000" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div><div><label className="mb-2 block text-xs font-bold text-slate-600">WhatsApp</label><input value={formularioProveedor.whatsapp} onChange={(event) => actualizarProveedor("whatsapp", event.target.value)} placeholder="8888-0000" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div></div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-slate-600">Correo</label><input value={formularioProveedor.correo} onChange={(event) => actualizarProveedor("correo", event.target.value)} placeholder="ventas@proveedor.com" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div><div><label className="mb-2 block text-xs font-bold text-slate-600">Contacto</label><input value={formularioProveedor.contacto} onChange={(event) => actualizarProveedor("contacto", event.target.value)} placeholder="Nombre del contacto" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div></div>
                            <div className="mt-4"><label className="mb-2 block text-xs font-bold text-slate-600">Dirección</label><textarea value={formularioProveedor.direccion} onChange={(event) => actualizarProveedor("direccion", event.target.value)} rows={2} placeholder="Dirección del proveedor" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div>
                            <div className="mt-4"><label className="mb-2 block text-xs font-bold text-slate-600">Observaciones</label><textarea value={formularioProveedor.observaciones} onChange={(event) => actualizarProveedor("observaciones", event.target.value)} rows={3} placeholder="Condiciones, días de entrega, notas..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div>
                            <div className="mt-5 flex flex-wrap gap-2"><button disabled={guardando} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:opacity-60"><Plus className="h-4 w-4" />{guardando ? "Guardando..." : proveedorEditandoId ? "Guardar cambios" : "Registrar proveedor"}</button><button type="button" onClick={limpiarProveedor} className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50">Limpiar</button></div>
                        </form>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="text-[16px] font-bold text-slate-800">Directorio de proveedores</h3><p className="mono mt-0.5 text-[10px] text-slate-400">Contactos comerciales activos e inactivos</p></div><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-72"><Search className="h-4 w-4 text-slate-400" /><input value={busquedaProveedor} onChange={(event) => setBusquedaProveedor(event.target.value)} placeholder="Buscar proveedor..." className="w-full bg-transparent text-[13px] font-medium outline-none" /></div></div></div>
                        <div className="max-h-[720px] overflow-y-auto p-4"><div className="space-y-3">
                            {proveedoresFiltrados.map((proveedor) => (<div key={proveedor.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white"><Store className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-black text-slate-800">{proveedor.nombre}</h4><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoProveedor(proveedor.estado)}`}>{proveedor.estado}</span></div><p className="mt-1 text-xs font-semibold text-teal-700">{proveedor.categoria}</p><div className="mt-3 grid gap-2 text-xs text-slate-500"><p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" />{proveedor.telefono || "Sin teléfono"}</p><p>{proveedor.correo || "Sin correo"}</p><p>{proveedor.direccion || "Sin dirección"}</p></div>{proveedor.observaciones && <div className="mt-3 rounded-2xl bg-slate-50 p-3"><p className="text-xs leading-5 text-slate-500">{proveedor.observaciones}</p></div>}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => editarProveedor(proveedor)} disabled={guardando} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><Edit3 className="h-3.5 w-3.5" />Editar</button><button onClick={() => cambiarEstadoProveedor(proveedor)} disabled={guardando} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" />{proveedor.estado === "Activo" ? "Desactivar" : "Activar"}</button></div></div></div></div>))}
                            {proveedoresFiltrados.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center"><Truck className="mx-auto h-10 w-10 text-slate-300" /><h4 className="mt-3 text-sm font-black text-slate-700">No encontramos proveedores</h4><p className="mt-1 text-xs text-slate-400">{cargando ? "Cargando proveedores desde Supabase..." : "Probá cambiar la búsqueda o registrar uno nuevo."}</p></div>}
                        </div></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-[16px] font-bold text-slate-800">Registrar compra</h3><p className="mono mt-0.5 text-[10px] text-slate-400">Aumenta inventario, crea gasto y cuentas por pagar</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><PackagePlus className="h-[18px] w-[18px]" /></div></div></div>
                        <form onSubmit={registrarCompra} className="p-6">
                            <div><label className="mb-2 block text-xs font-bold text-slate-600">Proveedor</label><select value={formularioCompra.proveedorId} onChange={(event) => actualizarCompra("proveedorId", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"><option value="">Seleccionar proveedor</option>{proveedoresActivos.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre} · {proveedor.categoria}</option>)}</select></div>
                            <div className="mt-4"><label className="mb-2 block text-xs font-bold text-slate-600">Producto</label><select value={formularioCompra.productoId} onChange={(event) => seleccionarProducto(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"><option value="">Seleccionar producto</option>{productosActivos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} · Stock {producto.stock}</option>)}</select></div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-slate-600">Cantidad</label><input value={formularioCompra.cantidad} onChange={(event) => actualizarCompra("cantidad", event.target.value)} type="number" placeholder="0" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div><div><label className="mb-2 block text-xs font-bold text-slate-600">Costo unitario</label><input value={formularioCompra.costoUnitario} onChange={(event) => actualizarCompra("costoUnitario", event.target.value)} type="number" placeholder="0.00" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div></div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-slate-600">Pago ahora</label><input value={formularioCompra.pagoAhora} onChange={(event) => actualizarCompra("pagoAhora", event.target.value)} type="number" placeholder="0.00" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div><div><label className="mb-2 block text-xs font-bold text-slate-600">Método de pago</label><select value={formularioCompra.metodoPago} onChange={(event) => actualizarCompra("metodoPago", event.target.value as MetodoPagoProveedorSupabase)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select></div></div>
                            {creditoCompra > 0 && <div className="mt-4"><label className="mb-2 block text-xs font-bold text-slate-600">Fecha vencimiento del crédito</label><input value={formularioCompra.fechaVencimiento} onChange={(event) => actualizarCompra("fechaVencimiento", event.target.value)} type="date" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div>}
                            <div className="mt-4"><label className="mb-2 block text-xs font-bold text-slate-600">Observaciones</label><textarea value={formularioCompra.observaciones} onChange={(event) => actualizarCompra("observaciones", event.target.value)} rows={3} placeholder="Factura, referencia, condiciones..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div>
                            <div className="mt-5 rounded-3xl bg-slate-50 p-5"><h4 className="text-sm font-black text-slate-800">Resumen de compra</h4><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-white p-4"><p className="text-[11px] font-bold text-slate-400">Total</p><p className="mt-1 text-sm font-black text-slate-800">{formatoMoneda(totalCompra, configuracion.simboloMoneda)}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[11px] font-bold text-emerald-700">Pago ahora</p><p className="mt-1 text-sm font-black text-emerald-700">{formatoMoneda(pagoAhoraCompra, configuracion.simboloMoneda)}</p></div><div className={`rounded-2xl p-4 ${creditoCompra > 0 ? "bg-amber-50" : "bg-slate-100"}`}><p className={`text-[11px] font-bold ${creditoCompra > 0 ? "text-amber-700" : "text-slate-500"}`}>Crédito</p><p className={`mt-1 text-sm font-black ${creditoCompra > 0 ? "text-amber-700" : "text-slate-600"}`}>{formatoMoneda(Math.max(creditoCompra, 0), configuracion.simboloMoneda)}</p></div></div>{(proveedorCompra || productoCompra) && <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{proveedorCompra?.nombre || "Proveedor"} · {productoCompra?.nombre || "Producto"} · Cantidad {cantidadCompra || 0}</p>}</div>
                            <div className="mt-5 flex flex-wrap gap-2"><button disabled={guardando} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />{guardando ? "Guardando..." : "Registrar compra"}</button><button type="button" onClick={limpiarCompra} className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50">Limpiar</button></div>
                        </form>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4"><h3 className="text-[16px] font-bold text-slate-800">Abonar a proveedor</h3><p className="mono mt-0.5 text-[10px] text-slate-400">Pagos parciales a cuentas pendientes</p></div>
                        <form onSubmit={registrarAbono} className="p-6"><div><label className="mb-2 block text-xs font-bold text-slate-600">Cuenta por pagar</label><select value={formularioAbono.cuentaId} onChange={(event) => setFormularioAbono((datos) => ({ ...datos, cuentaId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"><option value="">Seleccionar cuenta</option>{cuentasPendientes.map((cuenta) => <option key={cuenta.id} value={cuenta.id}>{cuenta.proveedorNombre} · Saldo {formatoMoneda(cuenta.saldo, configuracion.simboloMoneda)}</option>)}</select></div><div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-slate-600">Monto</label><input value={formularioAbono.monto} onChange={(event) => setFormularioAbono((datos) => ({ ...datos, monto: event.target.value }))} type="number" placeholder="0.00" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" /></div><div><label className="mb-2 block text-xs font-bold text-slate-600">Método</label><select value={formularioAbono.metodo} onChange={(event) => setFormularioAbono((datos) => ({ ...datos, metodo: event.target.value as MetodoPagoProveedorSupabase }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select></div></div><button disabled={guardando} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:opacity-60"><WalletCards className="h-4 w-4" />{guardando ? "Guardando..." : "Registrar abono"}</button></form>
                    </div>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="text-[16px] font-bold text-slate-800">Historial de compras</h3><p className="mono mt-0.5 text-[10px] text-slate-400">Compras registradas, pagos, créditos y anulaciones</p></div><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-80"><Search className="h-4 w-4 text-slate-400" /><input value={busquedaCompra} onChange={(event) => setBusquedaCompra(event.target.value)} placeholder="Buscar compra..." className="w-full bg-transparent text-[13px] font-medium outline-none" /></div></div></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[1150px]"><thead><tr className="border-b border-black/[0.04]">{["Fecha", "Proveedor", "Producto", "Cantidad", "Total", "Pagado", "Crédito", "Estado", "Acciones"].map((titulo) => <th key={titulo} className="mono px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pl-6">{titulo}</th>)}</tr></thead><tbody>{comprasFiltradas.map((compra) => <tr key={compra.id} className="border-b border-black/[0.03]"><td className="px-6 py-4"><p className="text-[12px] font-bold text-slate-700">{compra.fecha}</p><p className="mono mt-0.5 text-[10px] text-slate-400">{compra.hora}</p></td><td className="px-4 py-4 text-[12px] font-medium text-slate-700">{compra.proveedorNombre}</td><td className="px-4 py-4"><p className="text-[12px] font-bold text-slate-700">{compra.productoNombre}</p><p className="mono mt-0.5 text-[10px] text-slate-400">Costo unitario {formatoMoneda(compra.costoUnitario, configuracion.simboloMoneda)}</p></td><td className="px-4 py-4 text-[12px] font-black text-slate-800">{compra.cantidad}</td><td className="px-4 py-4 text-[12px] font-black text-slate-800">{formatoMoneda(compra.total, configuracion.simboloMoneda)}</td><td className="px-4 py-4 text-[12px] text-emerald-700">{formatoMoneda(compra.pagoAhora, configuracion.simboloMoneda)}</td><td className="px-4 py-4 text-[12px] text-amber-700">{formatoMoneda(compra.credito, configuracion.simboloMoneda)}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${compra.estado === "Activa" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{compra.estado}</span></td><td className="px-4 py-4">{compra.estado !== "Anulada" ? <button onClick={() => anularCompra(compra)} disabled={guardando} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" />Anular</button> : <span className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-400">Anulada</span>}</td></tr>)}{comprasFiltradas.length === 0 && <tr><td colSpan={9} className="px-6 py-10 text-center text-[12px] text-slate-400">{cargando ? "Cargando compras desde Supabase..." : "No hay compras registradas o no coinciden con la búsqueda."}</td></tr>}</tbody></table></div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4"><h3 className="text-[16px] font-bold text-slate-800">Cuentas por pagar</h3><p className="mono mt-0.5 text-[10px] text-slate-400">Créditos pendientes, parciales, pagados, vencidos o anulados</p></div>
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{cuentasPagar.map((cuenta) => { const estadoVisual = estadoVisualCuenta(cuenta); return <div key={cuenta.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-black text-slate-800">{cuenta.proveedorNombre}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{cuenta.concepto}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoCuenta(estadoVisual)}`}>{estadoVisual}</span></div><div className="mt-4 grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">Total</p><p className="mt-1 text-xs font-black text-slate-800">{formatoMoneda(cuenta.total, configuracion.simboloMoneda)}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold text-emerald-700">Abonado</p><p className="mt-1 text-xs font-black text-emerald-700">{formatoMoneda(cuenta.abonado, configuracion.simboloMoneda)}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] font-bold text-amber-700">Saldo</p><p className="mt-1 text-xs font-black text-amber-700">{formatoMoneda(cuenta.saldo, configuracion.simboloMoneda)}</p></div></div><p className="mono mt-3 text-[10px] text-slate-400">Vence: {cuenta.fechaVencimiento || "Sin fecha"}</p></div>; })}{cuentasPagar.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center md:col-span-2 xl:col-span-3"><ReceiptText className="mx-auto h-8 w-8 text-slate-300" /><h4 className="mt-3 text-sm font-black text-slate-700">No hay cuentas por pagar</h4><p className="mt-1 text-xs text-slate-400">Las cuentas aparecerán cuando registres compras a crédito.</p></div>}</div>
            </section>
        </AppShell>
    );
}

function BadgeDollarSignFallback() {
    return <span className="text-sm font-black">CxP</span>;
}