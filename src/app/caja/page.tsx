"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    BadgeDollarSign,
    Banknote,
    CheckCircle2,
    CreditCard,
    FileText,
    Package,
    ReceiptText,
    RefreshCcw,
    RotateCcw,
    Search,
    ShieldAlert,
    Trash2,
    Wallet,
    X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
    POSClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    listarCitasSupabase,
    type CitaSupabase,
    type EstadoCitaSupabase,
} from "@/lib/supabase/citas";
import {
    anularVentaSupabase,
    listarCuentasCobrarSupabase,
    listarVentasSupabase,
    registrarAbonoCuentaSupabase,
    registrarVentaSupabase,
    type CuentaCobrarSupabase,
    type EstadoCuentaCobrarSupabase,
    type EstadoVentaSupabase,
    type VentaSupabase,
} from "@/lib/supabase/finanzas";
import {
    listarProductosActivosVentaSupabase,
    type ProductoInventarioSupabase,
} from "@/lib/supabase/inventario";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
};

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
    estado: EstadoCitaSupabase;
    observaciones: string;
    creadaEn: string;
};

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
    estado: EstadoVentaSupabase;
    usuarioNombre: string;
    observaciones: string;
    posId?: string;
    posNombre?: string;
    posBanco?: string;
    posComision?: number;
    comisionTarjeta?: number;
    netoTarjeta?: number;
};

type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia" | "Mixto";

type AbonoCuenta = {
    id: string;
    fecha: string;
    hora: string;
    monto: number;
    metodo: MetodoPago;
    efectivo?: number;
    tarjeta?: number;
    transferencia?: number;
    posId?: string;
    posNombre?: string;
    posBanco?: string;
    posComision?: number;
    comisionTarjeta?: number;
    netoTarjeta?: number;
};

type CuentaPorCobrar = {
    id: string;
    ventaId: string;
    pacienteId: string;
    pacienteNombre: string;
    concepto: string;
    total: number;
    abonado: number;
    saldo: number;
    fecha: string;
    fechaVencimiento: string;
    estado: EstadoCuentaCobrarSupabase;
    abonos: AbonoCuenta[];
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

type FormularioCaja = {
    citaId: string;
    pacienteId: string;
    clienteNombre: string;
    tipoCobro: string;
    concepto: string;
    total: string;
    efectivo: string;
    tarjeta: string;
    posId: string;
    transferencia: string;
    credito: string;
    fechaVencimiento: string;
    observaciones: string;
    productoId: string;
    cantidadProducto: string;
};

type FormularioAbono = {
    cuentaId: string;
    efectivo: string;
    tarjeta: string;
    transferencia: string;
    posId: string;
};

const formularioCajaVacio: FormularioCaja = {
    citaId: "",
    pacienteId: "",
    clienteNombre: "",
    tipoCobro: "Consulta",
    concepto: "",
    total: "",
    efectivo: "",
    tarjeta: "",
    posId: "",
    transferencia: "",
    credito: "",
    fechaVencimiento: "",
    observaciones: "",
    productoId: "",
    cantidadProducto: "1",
};

const formularioAbonoVacio: FormularioAbono = {
    cuentaId: "",
    efectivo: "",
    tarjeta: "",
    transferencia: "",
    posId: "",
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
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function colorEstadoVenta(estado: EstadoVentaSupabase) {
    if (estado === "Pagada") return "bg-emerald-50 text-emerald-700";
    if (estado === "Parcial") return "bg-amber-50 text-amber-700";
    if (estado === "Crédito") return "bg-blue-50 text-blue-700";
    return "bg-red-50 text-red-700";
}

function colorEstadoCuenta(estado: EstadoCuentaCobrarSupabase) {
    if (estado === "Pagada") return "bg-emerald-50 text-emerald-700";
    if (estado === "Parcial") return "bg-amber-50 text-amber-700";
    if (estado === "Pendiente") return "bg-blue-50 text-blue-700";
    if (estado === "Vencida") return "bg-red-50 text-red-700";
    return "bg-slate-100 text-slate-500";
}

function convertirCita(cita: CitaSupabase): Cita {
    return {
        id: cita.id,
        pacienteId: cita.paciente_id || "",
        pacienteNombre: cita.paciente_nombre || "",
        doctorId: cita.doctor_id || "",
        doctorNombre: cita.doctor_nombre || "",
        servicioId: cita.servicio_id || "",
        servicioNombre: cita.servicio_nombre || "",
        costo: Number(cita.costo || 0),
        fecha: cita.fecha,
        hora: horaCorta(cita.hora),
        recurrencia: cita.recurrencia || "No repetir",
        estado: cita.estado || "Programada",
        observaciones: cita.observaciones || "",
        creadaEn: cita.creado_en || "",
    };
}

function convertirVenta(venta: VentaSupabase): Venta {
    return {
        id: venta.id,
        fecha: venta.fecha,
        hora: horaCorta(venta.hora),
        tipoCobro: venta.tipo_cobro || "Venta",
        citaId: venta.cita_id || "",
        pacienteId: venta.paciente_id || "",
        clienteNombre: venta.cliente_nombre || "",
        concepto: venta.concepto || "",
        total: Number(venta.total || 0),
        efectivo: Number(venta.efectivo || 0),
        tarjeta: Number(venta.tarjeta || 0),
        transferencia: Number(venta.transferencia || 0),
        credito: Number(venta.credito || 0),
        estado: venta.estado || "Pagada",
        usuarioNombre: venta.usuario_nombre || "",
        observaciones: venta.observaciones || "",
        posId: venta.pos_id || "",
        posNombre: venta.pos_nombre || "",
        posBanco: venta.pos_banco || "",
        posComision: Number(venta.comision_pos_porcentaje || 0),
        comisionTarjeta: Number(venta.comision_pos_monto || 0),
        netoTarjeta: Number(venta.neto_tarjeta || 0),
    };
}

function convertirCuenta(cuenta: CuentaCobrarSupabase): CuentaPorCobrar {
    return {
        id: cuenta.id,
        ventaId: cuenta.venta_id || "",
        pacienteId: cuenta.paciente_id || "",
        pacienteNombre: cuenta.paciente_nombre || "",
        concepto: cuenta.concepto || "",
        total: Number(cuenta.total || 0),
        abonado: Number(cuenta.abonado || 0),
        saldo: Number(cuenta.saldo || 0),
        fecha: cuenta.fecha,
        fechaVencimiento: cuenta.fecha_vencimiento || "",
        estado: cuenta.estado || "Pendiente",
        abonos: [],
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

export default function CajaPage() {
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [citas, setCitas] = useState<Cita[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);

    const [formulario, setFormulario] =
        useState<FormularioCaja>(formularioCajaVacio);
    const [formularioAbono, setFormularioAbono] =
        useState<FormularioAbono>(formularioAbonoVacio);
    const [busqueda, setBusqueda] = useState("");
    const [busquedaCitaCobro, setBusquedaCitaCobro] = useState("");
    const [busquedaCuentaAbono, setBusquedaCuentaAbono] = useState("");
    const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
    const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    const posesActivos: POSClinica[] = (configuracion.poses || []).filter(
        (pos) => pos.activo
    );

    const posPredeterminadoId = posesActivos[0]?.id || "";

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
            if (usuarioGuardado) {
                setUsuario(JSON.parse(usuarioGuardado) as UsuarioSistema);
            }

            let configuracionActual: ConfiguracionClinica;

            try {
                configuracionActual = await obtenerConfiguracionClinicaSupabase();
            } catch {
                configuracionActual = obtenerConfiguracionClinica();
            }

            const posInicial =
                (configuracionActual.poses || []).find((pos) => pos.activo) ||
                (configuracionActual.poses || [])[0];

            setConfiguracion(configuracionActual);
            setFormulario((datosActuales) => ({
                ...datosActuales,
                posId: datosActuales.posId || posInicial?.id || "",
            }));
            setFormularioAbono((datosActuales) => ({
                ...datosActuales,
                posId: datosActuales.posId || posInicial?.id || "",
            }));

            const [
                citasSupabase,
                ventasSupabase,
                cuentasSupabase,
                productosSupabase,
            ] = await Promise.all([
                listarCitasSupabase(),
                listarVentasSupabase(),
                listarCuentasCobrarSupabase(),
                listarProductosActivosVentaSupabase(),
            ]);

            setCitas(citasSupabase.map(convertirCita));
            setVentas(ventasSupabase.map(convertirVenta));
            setCuentas(cuentasSupabase.map(convertirCuenta));
            setProductos(productosSupabase.map(convertirProducto));
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar caja desde Supabase.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    function actualizarCampo<K extends keyof FormularioCaja>(
        campo: K,
        valor: FormularioCaja[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function seleccionarCita(citaId: string) {
        const cita = citas.find((item) => item.id === citaId);

        if (!cita) {
            setBusquedaCitaCobro("");
            setFormulario((datosActuales) => ({
                ...datosActuales,
                citaId: "",
                pacienteId: "",
                clienteNombre: "",
                concepto: "",
                total: "",
            }));
            return;
        }

        setBusquedaCitaCobro(
            `${cita.pacienteNombre} · ${cita.servicioNombre} · ${cita.fecha} ${cita.hora}`
        );

        setFormulario((datosActuales) => ({
            ...datosActuales,
            citaId: cita.id,
            pacienteId: cita.pacienteId,
            clienteNombre: cita.pacienteNombre,
            tipoCobro: "Tratamiento",
            concepto: cita.servicioNombre,
            total: cita.costo.toString(),
            productoId: "",
            cantidadProducto: "1",
        }));
    }

    function seleccionarProducto(productoId: string) {
        const producto = productos.find((item) => item.id === productoId);

        if (!producto) {
            setFormulario((datosActuales) => ({
                ...datosActuales,
                productoId: "",
                cantidadProducto: "1",
                concepto: "",
                total: "",
            }));
            return;
        }

        setFormulario((datosActuales) => ({
            ...datosActuales,
            citaId: "",
            pacienteId: "",
            tipoCobro: "Producto",
            productoId: producto.id,
            cantidadProducto: "1",
            concepto: producto.nombre,
            total: producto.precioVenta.toString(),
        }));
    }

    function cambiarCantidadProducto(valor: string) {
        const cantidad = numero(valor);
        const producto = productos.find((item) => item.id === formulario.productoId);
        const totalProducto = producto ? producto.precioVenta * cantidad : 0;

        setFormulario((datosActuales) => ({
            ...datosActuales,
            cantidadProducto: valor,
            total: totalProducto > 0 ? totalProducto.toString() : "",
        }));
    }

    const total = numero(formulario.total);
    const efectivo = numero(formulario.efectivo);
    const tarjeta = numero(formulario.tarjeta);
    const credito = numero(formulario.credito);
    const transferenciaReal = numero(formulario.transferencia);

    const posSeleccionado =
        posesActivos.find((pos) => pos.id === formulario.posId) ||
        (tarjeta > 0 ? posesActivos[0] : null);

    const comisionPOSAplicada =
        posSeleccionado?.comision ?? configuracion.comisionPOS ?? 0;

    const pagadoAhora = efectivo + tarjeta + transferenciaReal;
    const sumaCobro = pagadoAhora + credito;
    const diferencia = total - sumaCobro;
    const comisionTarjeta = tarjeta * (comisionPOSAplicada / 100);
    const netoTarjeta = tarjeta - comisionTarjeta;

    const efectivoAbono = numero(formularioAbono.efectivo);
    const tarjetaAbono = numero(formularioAbono.tarjeta);
    const transferenciaAbono = numero(formularioAbono.transferencia);
    const montoAbono = efectivoAbono + tarjetaAbono + transferenciaAbono;
    const posAbonoSeleccionado =
        posesActivos.find((pos) => pos.id === formularioAbono.posId) ||
        (tarjetaAbono > 0 ? posesActivos[0] : null);
    const comisionAbonoTarjeta =
        tarjetaAbono * ((posAbonoSeleccionado?.comision || 0) / 100);
    const netoAbonoTarjeta = tarjetaAbono - comisionAbonoTarjeta;
    const cuentaAbonoActual =
        cuentas.find((item) => item.id === formularioAbono.cuentaId) || null;
    const diferenciaAbono = cuentaAbonoActual
        ? cuentaAbonoActual.saldo - montoAbono
        : 0;

    const productoSeleccionado = productos.find(
        (item) => item.id === formulario.productoId
    );

    const citaSeleccionadaCobro =
        citas.find((item) => item.id === formulario.citaId) || null;

    const citasPendientesCobro = useMemo(() => {
        return citas.filter((cita) => {
            const tieneVentaActiva = ventas.some(
                (venta) => venta.citaId === cita.id && venta.estado !== "Anulada"
            );

            return (
                !tieneVentaActiva &&
                cita.estado !== "Cobrada" &&
                cita.estado !== "Cancelada" &&
                cita.estado !== "No asistió"
            );
        });
    }, [citas, ventas]);

    const citasPendientesFiltradas = useMemo(() => {
        const texto = normalizarTexto(busquedaCitaCobro);

        const lista = citasPendientesCobro.filter((cita) => {
            if (!texto) return true;

            return (
                normalizarTexto(cita.pacienteNombre).includes(texto) ||
                normalizarTexto(cita.servicioNombre).includes(texto) ||
                normalizarTexto(cita.doctorNombre).includes(texto) ||
                normalizarTexto(cita.fecha).includes(texto) ||
                normalizarTexto(cita.hora).includes(texto) ||
                normalizarTexto(cita.estado).includes(texto) ||
                normalizarTexto(cita.id).includes(texto)
            );
        });

        return lista.slice(0, 8);
    }, [citasPendientesCobro, busquedaCitaCobro]);

    const productosVenta = productos.filter(
        (producto) =>
            producto.estado === "Activo" &&
            producto.precioVenta > 0 &&
            producto.stock > 0
    );

    async function registrarCobro(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!formulario.clienteNombre.trim() && formulario.tipoCobro !== "Producto") {
            alert("Indica el nombre del paciente o cliente.");
            return;
        }

        if (!formulario.concepto.trim()) {
            alert("Indica el concepto del cobro.");
            return;
        }

        if (total <= 0) {
            alert("El total debe ser mayor que cero.");
            return;
        }

        if (Math.abs(diferencia) > 0.01) {
            alert(
                "La suma de efectivo, tarjeta, transferencia y crédito debe coincidir con el total."
            );
            return;
        }

        if (tarjeta > 0 && !posSeleccionado) {
            alert("Selecciona el POS utilizado para el pago con tarjeta.");
            return;
        }

        if (credito > 0 && !formulario.fechaVencimiento) {
            alert("Si hay crédito, debes indicar fecha de vencimiento.");
            return;
        }

        if (formulario.tipoCobro === "Producto") {
            if (!productoSeleccionado) {
                alert("Selecciona un producto.");
                return;
            }

            const cantidad = numero(formulario.cantidadProducto);

            if (cantidad <= 0) {
                alert("La cantidad del producto debe ser mayor que cero.");
                return;
            }

            if (cantidad > productoSeleccionado.stock) {
                alert("No hay suficiente stock disponible.");
                return;
            }
        }

        setGuardando(true);

        try {
            await registrarVentaSupabase({
                tipo_cobro: formulario.tipoCobro,
                cita_id: formulario.citaId || null,
                paciente_id: formulario.pacienteId || null,
                cliente_nombre:
                    formulario.clienteNombre.trim() ||
                    productoSeleccionado?.nombre ||
                    "Cliente general",
                concepto: formulario.concepto.trim(),
                total,
                efectivo,
                tarjeta,
                transferencia: transferenciaReal,
                credito,
                metodo_pago: "",
                pos_id: tarjeta > 0 ? posSeleccionado?.id || null : null,
                pos_nombre: tarjeta > 0 ? posSeleccionado?.nombre || "" : "",
                pos_banco: tarjeta > 0 ? posSeleccionado?.banco || "" : "",
                comision_pos_porcentaje: tarjeta > 0 ? comisionPOSAplicada : 0,
                fecha_vencimiento_credito: formulario.fechaVencimiento,
                observaciones: formulario.observaciones.trim(),
                usuario_nombre: usuario?.nombre || "Usuario no identificado",
                producto_id: formulario.tipoCobro === "Producto" ? productoSeleccionado?.id : undefined,
                cantidad_producto: formulario.tipoCobro === "Producto" ? numero(formulario.cantidadProducto) : undefined,
            });

            setFormulario({
                ...formularioCajaVacio,
                posId: posPredeterminadoId,
            });
            setBusquedaCitaCobro("");
            setModalCobroAbierto(false);

            await cargarDatos();

            alert("Cobro registrado correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo registrar el cobro.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function registrarAbono(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const cuenta = cuentas.find((item) => item.id === formularioAbono.cuentaId);

        if (!cuenta) {
            alert("Selecciona una cuenta por cobrar.");
            return;
        }

        if (montoAbono <= 0) {
            alert("El abono debe ser mayor que cero.");
            return;
        }

        if (montoAbono > cuenta.saldo) {
            alert("El abono no puede ser mayor que el saldo.");
            return;
        }

        if (tarjetaAbono > 0 && !posAbonoSeleccionado) {
            alert("Selecciona el POS utilizado para el pago con tarjeta.");
            return;
        }

        setGuardando(true);

        try {
            await registrarAbonoCuentaSupabase({
                cuenta_id: cuenta.id,
                paciente_id: cuenta.pacienteId || null,
                efectivo: efectivoAbono,
                tarjeta: tarjetaAbono,
                transferencia: transferenciaAbono,
                pos_id: tarjetaAbono > 0 ? posAbonoSeleccionado?.id || null : null,
                pos_nombre: tarjetaAbono > 0 ? posAbonoSeleccionado?.nombre || "" : "",
                pos_banco: tarjetaAbono > 0 ? posAbonoSeleccionado?.banco || "" : "",
                comision_pos_porcentaje:
                    tarjetaAbono > 0 ? posAbonoSeleccionado?.comision || 0 : 0,
                usuario_nombre: usuario?.nombre || "Usuario no identificado",
                observaciones: `Abono aplicado a cuenta ${cuenta.id}`,
            });

            setFormularioAbono({
                ...formularioAbonoVacio,
                posId: posPredeterminadoId,
            });
            setBusquedaCuentaAbono("");
            setModalAbonoAbierto(false);

            await cargarDatos();

            alert("Abono registrado correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo registrar el abono.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function anularVenta(venta: Venta) {
        if (venta.estado === "Anulada") return;

        const confirmar = window.confirm(
            "¿Seguro que deseas anular esta venta? Si tenía crédito, también se anulará la cuenta por cobrar relacionada."
        );

        if (!confirmar) return;

        setGuardando(true);

        try {
            await anularVentaSupabase(venta.id);

            await cargarDatos();

            alert("Venta anulada correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo anular la venta.";

            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    const hoy = fechaHoyLocal();

    const ventasHoy = ventas.filter(
        (venta) => venta.fecha === hoy && venta.estado !== "Anulada"
    );

    const efectivoHoy = ventasHoy.reduce(
        (totalActual, venta) => totalActual + (venta.efectivo || 0),
        0
    );

    const tarjetaHoy = ventasHoy.reduce(
        (totalActual, venta) => totalActual + (venta.tarjeta || 0),
        0
    );

    const transferenciaHoy = ventasHoy.reduce(
        (totalActual, venta) => totalActual + (venta.transferencia || 0),
        0
    );

    const creditoHoy = ventasHoy.reduce(
        (totalActual, venta) => totalActual + (venta.credito || 0),
        0
    );

    const totalCobradoHoy = efectivoHoy + tarjetaHoy + transferenciaHoy;
    const totalBrutoHoy = totalCobradoHoy + creditoHoy;
    const comisionTarjetaHoy = ventasHoy.reduce((totalActual, venta) => {
        if (typeof venta.comisionTarjeta === "number") {
            return totalActual + venta.comisionTarjeta;
        }

        return (
            totalActual +
            (venta.tarjeta || 0) *
            ((venta.posComision ?? configuracion.comisionPOS ?? 0) / 100)
        );
    }, 0);

    const netoEstimadoHoy = totalCobradoHoy - comisionTarjetaHoy;

    const resumenTarjetasPorPOS = posesActivos
        .map((pos) => {
            const ventasPOS = ventasHoy.filter((venta) => venta.posId === pos.id);
            const monto = ventasPOS.reduce(
                (totalActual, venta) => totalActual + (venta.tarjeta || 0),
                0
            );
            const comision = ventasPOS.reduce((totalActual, venta) => {
                if (typeof venta.comisionTarjeta === "number") {
                    return totalActual + venta.comisionTarjeta;
                }

                return totalActual + (venta.tarjeta || 0) * (pos.comision / 100);
            }, 0);

            return {
                ...pos,
                monto,
                comision,
                neto: monto - comision,
            };
        })
        .filter((item) => item.monto > 0);

    const cuentasPendientes = cuentas.filter(
        (cuenta) =>
            cuenta.estado !== "Pagada" &&
            cuenta.estado !== "Anulada" &&
            cuenta.saldo > 0
    );

    const cuentasPendientesFiltradas = cuentasPendientes
        .filter((cuenta) => {
            const texto = normalizarTexto(busquedaCuentaAbono);

            if (!texto) return true;

            return (
                normalizarTexto(cuenta.pacienteNombre).includes(texto) ||
                normalizarTexto(cuenta.concepto).includes(texto) ||
                normalizarTexto(cuenta.id).includes(texto) ||
                normalizarTexto(cuenta.ventaId).includes(texto)
            );
        })
        .slice(0, 8);

    const cuentaAbonoSeleccionada = cuentaAbonoActual;

    const saldoPendiente = cuentasPendientes.reduce(
        (totalActual, cuenta) => totalActual + cuenta.saldo,
        0
    );

    const ventasFiltradas = ventas.filter((venta) => {
        const texto = normalizarTexto(busqueda);

        if (!texto) return true;

        return (
            normalizarTexto(venta.clienteNombre).includes(texto) ||
            normalizarTexto(venta.concepto).includes(texto) ||
            normalizarTexto(venta.tipoCobro).includes(texto) ||
            normalizarTexto(venta.estado).includes(texto) ||
            normalizarTexto(venta.id).includes(texto) ||
            normalizarTexto(venta.posNombre).includes(texto) ||
            normalizarTexto(venta.posBanco).includes(texto)
        );
    });

    return (
        <AppShell
            titulo="Caja y venta"
            descripcion="Punto de venta, cobros, productos, créditos, abonos, recibos y anulaciones"
            moduloActivo="Caja y Venta"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo cargar caja
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
                        Caja conectada a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Ventas, cuentas por cobrar, abonos e inventario ya trabajan con Supabase.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarDatos}
                    disabled={cargando || guardando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    Recargar
                </button>
            </section>

            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Banknote className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Hoy
                        </span>
                    </div>

                    <h3 className="mt-4 text-[26px] font-bold leading-none text-slate-800">
                        {formatoMoneda(totalCobradoHoy, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Cobrado hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <CreditCard className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            POS
                        </span>
                    </div>

                    <h3 className="mt-4 text-[26px] font-bold leading-none text-slate-800">
                        {formatoMoneda(tarjetaHoy, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Tarjeta hoy
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ShieldAlert className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Crédito
                        </span>
                    </div>

                    <h3 className="mt-4 text-[26px] font-bold leading-none text-slate-800">
                        {formatoMoneda(saldoPendiente, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pendiente por cobrar
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Wallet className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Neto
                        </span>
                    </div>

                    <h3 className="mt-4 text-[26px] font-bold leading-none text-slate-800">
                        {formatoMoneda(netoEstimadoHoy, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Neto después POS
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
                <div className="glass-card overflow-hidden rounded-3xl">
                    <div className="border-b border-black/[0.04] px-6 py-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-[18px] font-black text-slate-900">
                                    Acciones rápidas de caja
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Abrí una ventana limpia para cobrar una cita, vender un producto o registrar un abono.
                                </p>
                            </div>

                            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                                {ventasHoy.length} movimiento(s) hoy
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-4 p-6 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setModalCobroAbierto(true)}
                            className="group rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 text-left hover:border-teal-200 hover:shadow-[0_12px_34px_rgba(13,148,136,0.12)]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
                                    <ReceiptText className="h-5 w-5" />
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-teal-700 shadow-sm">
                                    Cobrar
                                </span>
                            </div>

                            <h4 className="mt-5 text-xl font-black text-slate-900">
                                Registrar cobro
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Buscar cita por paciente, cobro manual, producto, crédito o pago mixto.
                            </p>

                            <div className="mt-5 grid gap-2 sm:grid-cols-3">
                                <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Citas pendientes
                                    </p>
                                    <p className="mt-1 text-lg font-black text-teal-700">
                                        {citasPendientesCobro.length}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Productos
                                    </p>
                                    <p className="mt-1 text-lg font-black text-slate-800">
                                        {productosVenta.length}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400">
                                        POS activos
                                    </p>
                                    <p className="mt-1 text-lg font-black text-blue-700">
                                        {posesActivos.length}
                                    </p>
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setModalAbonoAbierto(true)}
                            className="group rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 text-left hover:border-amber-200 hover:shadow-[0_12px_34px_rgba(245,158,11,0.12)]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                                    <BadgeDollarSign className="h-5 w-5" />
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-amber-700 shadow-sm">
                                    Abonar
                                </span>
                            </div>

                            <h4 className="mt-5 text-xl font-black text-slate-900">
                                Abonar a cuenta
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Buscar por paciente o concepto y aplicar abonos a cuentas pendientes.
                            </p>

                            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Cuentas pendientes
                                    </p>
                                    <p className="mt-1 text-lg font-black text-amber-700">
                                        {cuentasPendientes.length}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Saldo total
                                    </p>
                                    <p className="mt-1 text-lg font-black text-rose-700">
                                        {formatoMoneda(saldoPendiente, configuracion.simboloMoneda)}
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="glass-card rounded-3xl p-5">
                    <h3 className="text-[16px] font-black text-slate-800">
                        Resumen de caja
                    </h3>

                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                            <span className="text-[11px] font-medium text-emerald-700">
                                Efectivo
                            </span>
                            <strong className="mono text-[12px] text-emerald-700">
                                {formatoMoneda(efectivoHoy, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                            <span className="text-[11px] font-medium text-blue-700">
                                Tarjeta
                            </span>
                            <strong className="mono text-[12px] text-blue-700">
                                {formatoMoneda(tarjetaHoy, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3">
                            <span className="text-[11px] font-medium text-indigo-700">
                                Transferencia
                            </span>
                            <strong className="mono text-[12px] text-indigo-700">
                                {formatoMoneda(transferenciaHoy, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
                            <span className="text-[11px] font-medium text-amber-700">
                                Crédito generado
                            </span>
                            <strong className="mono text-[12px] text-amber-700">
                                {formatoMoneda(creditoHoy, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
                            <span className="text-[11px] font-medium text-rose-700">
                                Comisión POS
                            </span>
                            <strong className="mono text-[12px] text-rose-700">
                                {formatoMoneda(comisionTarjetaHoy, configuracion.simboloMoneda)}
                            </strong>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3">
                            <span className="text-[11px] font-medium text-white/70">
                                Total bruto
                            </span>
                            <strong className="mono text-[12px] text-white">
                                {formatoMoneda(totalBrutoHoy, configuracion.simboloMoneda)}
                            </strong>
                        </div>
                    </div>
                </div>
            </section>

            {resumenTarjetasPorPOS.length > 0 && (
                <section className="mt-4 glass-card rounded-3xl p-5">
                    <div>
                        <h3 className="text-[16px] font-black text-slate-800">
                            Tarjetas por POS
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Resumen de bancos, comisión y neto recibido.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {resumenTarjetasPorPOS.map((pos) => (
                            <div
                                key={pos.id}
                                className="rounded-2xl border border-blue-100 bg-blue-50 p-4"
                            >
                                <p className="text-sm font-black text-slate-800">
                                    {pos.nombre}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {pos.banco} · {pos.comision}%
                                </p>

                                <div className="mt-3 grid gap-2 text-xs">
                                    <div className="flex justify-between rounded-xl bg-white px-3 py-2">
                                        <span className="text-slate-500">Monto</span>
                                        <strong className="text-blue-700">
                                            {formatoMoneda(pos.monto, configuracion.simboloMoneda)}
                                        </strong>
                                    </div>
                                    <div className="flex justify-between rounded-xl bg-white px-3 py-2">
                                        <span className="text-slate-500">Comisión</span>
                                        <strong className="text-rose-600">
                                            {formatoMoneda(pos.comision, configuracion.simboloMoneda)}
                                        </strong>
                                    </div>
                                    <div className="flex justify-between rounded-xl bg-white px-3 py-2">
                                        <span className="text-slate-500">Neto</span>
                                        <strong className="text-emerald-700">
                                            {formatoMoneda(pos.neto, configuracion.simboloMoneda)}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="mt-4 glass-card overflow-hidden rounded-2xl">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Historial de ventas
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Ventas, créditos, abonos y anulaciones
                            </p>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:w-80">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar venta..."
                                className="w-full bg-transparent text-[13px] font-medium outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px]">
                        <thead>
                            <tr className="border-b border-black/[0.04]">
                                {[
                                    "Fecha",
                                    "Cliente",
                                    "Concepto",
                                    "Total",
                                    "Pagos",
                                    "Crédito",
                                    "POS",
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
                            {ventasFiltradas.map((venta) => {
                                const pagado =
                                    (venta.efectivo || 0) +
                                    (venta.tarjeta || 0) +
                                    (venta.transferencia || 0);

                                return (
                                    <tr
                                        key={venta.id}
                                        className="border-b border-black/[0.03]"
                                    >
                                        <td className="px-6 py-4">
                                            <p className="text-[12px] font-bold text-slate-700">
                                                {venta.fecha}
                                            </p>
                                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                                {venta.hora}
                                            </p>
                                        </td>

                                        <td className="px-4 py-4 text-[12px] font-medium text-slate-700">
                                            {venta.clienteNombre}
                                        </td>

                                        <td className="px-4 py-4">
                                            <p className="text-[12px] font-bold text-slate-700">
                                                {venta.concepto}
                                            </p>
                                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                                {venta.tipoCobro}
                                            </p>
                                        </td>

                                        <td className="px-4 py-4 text-[12px] font-black text-slate-800">
                                            {formatoMoneda(venta.total, configuracion.simboloMoneda)}
                                        </td>

                                        <td className="px-4 py-4 text-[12px] text-slate-500">
                                            {formatoMoneda(pagado, configuracion.simboloMoneda)}
                                        </td>

                                        <td className="px-4 py-4 text-[12px] text-amber-700">
                                            {formatoMoneda(venta.credito || 0, configuracion.simboloMoneda)}
                                        </td>

                                        <td className="px-4 py-4">
                                            {venta.tarjeta > 0 ? (
                                                <div>
                                                    <p className="text-[12px] font-bold text-blue-700">
                                                        {venta.posNombre || "POS no registrado"}
                                                    </p>
                                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                                        {venta.posBanco || "Banco no registrado"} ·{" "}
                                                        {venta.posComision ?? configuracion.comisionPOS}%
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-[12px] text-slate-400">
                                                    No aplica
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-4">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoVenta(
                                                    venta.estado
                                                )}`}
                                            >
                                                {venta.estado}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <Link
                                                    href={`/recibos/${venta.id}`}
                                                    className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Recibo
                                                </Link>

                                                {venta.estado !== "Anulada" ? (
                                                    <button
                                                        type="button"
                                                        disabled={guardando}
                                                        onClick={() => anularVenta(venta)}
                                                        className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Anular
                                                    </button>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-400">
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        Anulada
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {ventasFiltradas.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-6 py-10 text-center text-[12px] text-slate-400"
                                    >
                                        {cargando
                                            ? "Cargando ventas..."
                                            : "No hay ventas registradas o no coinciden con la búsqueda."}
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
                        Cuentas por cobrar
                    </h3>
                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                        Créditos pendientes, parciales, pagados o anulados
                    </p>
                </div>

                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {cuentas.map((cuenta) => (
                        <div
                            key={cuenta.id}
                            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-black text-slate-800">
                                        {cuenta.pacienteNombre}
                                    </h4>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        {cuenta.concepto}
                                    </p>
                                </div>

                                <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstadoCuenta(
                                        cuenta.estado
                                    )}`}
                                >
                                    {cuenta.estado}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Total
                                    </p>
                                    <p className="mt-1 text-xs font-black text-slate-800">
                                        {formatoMoneda(cuenta.total, configuracion.simboloMoneda)}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-emerald-50 p-3">
                                    <p className="text-[10px] font-bold text-emerald-700">
                                        Abonado
                                    </p>
                                    <p className="mt-1 text-xs font-black text-emerald-700">
                                        {formatoMoneda(cuenta.abonado, configuracion.simboloMoneda)}
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
                        </div>
                    ))}

                    {cuentas.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center md:col-span-2 xl:col-span-3">
                            <ReceiptText className="mx-auto h-8 w-8 text-slate-300" />
                            <h4 className="mt-3 text-sm font-black text-slate-700">
                                No hay cuentas por cobrar
                            </h4>
                            <p className="mt-1 text-xs text-slate-400">
                                Las cuentas aparecerán cuando registres ventas a crédito.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {modalCobroAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    Registrar cobro
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Cobrá una cita, registrá venta manual, producto, crédito o pago mixto.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setModalCobroAbierto(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={registrarCobro}
                            className="max-h-[calc(92vh-92px)] overflow-y-auto p-6"
                        >
                            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                                <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <label className="block text-xs font-bold text-slate-600">
                                            Buscar cita pendiente
                                        </label>

                                        {formulario.citaId && (
                                            <button
                                                type="button"
                                                onClick={() => seleccionarCita("")}
                                                className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                                            >
                                                Cobro manual
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                                        <Search className="h-4 w-4 text-slate-400" />
                                        <input
                                            value={busquedaCitaCobro}
                                            onChange={(event) => {
                                                const valor = event.target.value;
                                                setBusquedaCitaCobro(valor);
                                                if (formulario.citaId) {
                                                    setFormulario((datosActuales) => ({
                                                        ...datosActuales,
                                                        citaId: "",
                                                        pacienteId: "",
                                                        clienteNombre: "",
                                                        concepto: "",
                                                        total: "",
                                                    }));
                                                }
                                            }}
                                            placeholder="Escribí el nombre del paciente..."
                                            className="w-full bg-transparent text-[13px] font-medium outline-none"
                                        />
                                    </div>

                                    <div className="mt-3 max-h-[300px] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2">
                                        {citasPendientesFiltradas.map((cita) => {
                                            const seleccionada = formulario.citaId === cita.id;

                                            return (
                                                <button
                                                    key={cita.id}
                                                    type="button"
                                                    onClick={() => seleccionarCita(cita.id)}
                                                    className={`mb-2 w-full rounded-xl border p-3 text-left last:mb-0 ${seleccionada
                                                        ? "border-teal-200 bg-teal-50"
                                                        : "border-slate-100 bg-white hover:border-slate-200"
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-[13px] font-black text-slate-800">
                                                                {cita.pacienteNombre}
                                                            </p>
                                                            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                                                                {cita.fecha} · {cita.hora} · {cita.servicioNombre}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] text-slate-400">
                                                                Dr/a. {cita.doctorNombre || "No especificado"}
                                                            </p>
                                                        </div>

                                                        <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-teal-700">
                                                            {formatoMoneda(cita.costo, configuracion.simboloMoneda)}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {citasPendientesFiltradas.length === 0 && (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
                                                <p className="text-xs font-bold text-slate-500">
                                                    No hay citas pendientes con esa búsqueda.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {citaSeleccionadaCobro && (
                                        <p className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-700">
                                            Cita seleccionada: {citaSeleccionadaCobro.pacienteNombre} ·{" "}
                                            {citaSeleccionadaCobro.servicioNombre}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Tipo de cobro
                                            </label>
                                            <select
                                                value={formulario.tipoCobro}
                                                onChange={(event) =>
                                                    actualizarCampo("tipoCobro", event.target.value)
                                                }
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            >
                                                <option>Consulta</option>
                                                <option>Tratamiento</option>
                                                <option>Producto</option>
                                                <option>Presupuesto de tratamiento</option>
                                                <option>Abono a crédito</option>
                                                <option>Otro</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Total a cobrar
                                            </label>
                                            <input
                                                value={formulario.total}
                                                onChange={(event) =>
                                                    actualizarCampo("total", event.target.value)
                                                }
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>
                                    </div>

                                    {formulario.tipoCobro === "Producto" && (
                                        <div className="rounded-3xl border border-teal-100 bg-teal-50/60 p-5">
                                            <div className="mb-4 flex items-center gap-2">
                                                <Package className="h-4 w-4 text-teal-700" />
                                                <h4 className="text-sm font-black text-teal-800">
                                                    Venta de producto
                                                </h4>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-teal-800">
                                                        Producto
                                                    </label>
                                                    <select
                                                        value={formulario.productoId}
                                                        onChange={(event) =>
                                                            seleccionarProducto(event.target.value)
                                                        }
                                                        className="w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    >
                                                        <option value="">Seleccionar producto</option>
                                                        {productosVenta.map((producto) => (
                                                            <option key={producto.id} value={producto.id}>
                                                                {producto.nombre} · Stock {producto.stock} ·{" "}
                                                                {formatoMoneda(
                                                                    producto.precioVenta,
                                                                    configuracion.simboloMoneda
                                                                )}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-teal-800">
                                                        Cantidad
                                                    </label>
                                                    <input
                                                        value={formulario.cantidadProducto}
                                                        onChange={(event) =>
                                                            cambiarCantidadProducto(event.target.value)
                                                        }
                                                        type="number"
                                                        className="w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                                    />
                                                </div>
                                            </div>

                                            {productoSeleccionado && (
                                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                                    <div className="rounded-2xl bg-white p-4">
                                                        <p className="text-[11px] font-bold text-slate-400">
                                                            Precio unitario
                                                        </p>
                                                        <p className="mt-1 text-sm font-black text-slate-800">
                                                            {formatoMoneda(
                                                                productoSeleccionado.precioVenta,
                                                                configuracion.simboloMoneda
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-white p-4">
                                                        <p className="text-[11px] font-bold text-slate-400">
                                                            Stock actual
                                                        </p>
                                                        <p className="mt-1 text-sm font-black text-slate-800">
                                                            {productoSeleccionado.stock}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-white p-4">
                                                        <p className="text-[11px] font-bold text-slate-400">
                                                            Stock después
                                                        </p>
                                                        <p className="mt-1 text-sm font-black text-teal-700">
                                                            {productoSeleccionado.stock -
                                                                numero(formulario.cantidadProducto)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-[11px] font-bold text-teal-700">
                                                Nota: inventario conectado a Supabase. Al vender, se descuenta stock real y se registra movimiento automático.
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Paciente / cliente
                                            </label>
                                            <input
                                                value={formulario.clienteNombre}
                                                onChange={(event) =>
                                                    actualizarCampo("clienteNombre", event.target.value)
                                                }
                                                placeholder="Nombre del paciente o cliente"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Concepto
                                            </label>
                                            <input
                                                value={formulario.concepto}
                                                onChange={(event) =>
                                                    actualizarCampo("concepto", event.target.value)
                                                }
                                                placeholder="Consulta, limpieza, producto..."
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Efectivo
                                            </label>
                                            <input
                                                value={formulario.efectivo}
                                                onChange={(event) =>
                                                    actualizarCampo("efectivo", event.target.value)
                                                }
                                                type="number"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Tarjeta
                                            </label>
                                            <input
                                                value={formulario.tarjeta}
                                                onChange={(event) =>
                                                    actualizarCampo("tarjeta", event.target.value)
                                                }
                                                type="number"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                POS tarjeta
                                            </label>
                                            <select
                                                value={formulario.posId || posPredeterminadoId}
                                                onChange={(event) =>
                                                    actualizarCampo("posId", event.target.value)
                                                }
                                                disabled={tarjeta <= 0}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
                                            >
                                                <option value="">Seleccionar POS</option>
                                                {posesActivos.map((pos) => (
                                                    <option key={pos.id} value={pos.id}>
                                                        {pos.nombre} · {pos.banco} · {pos.comision}%
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Transferencia
                                            </label>
                                            <input
                                                value={formulario.transferencia}
                                                onChange={(event) =>
                                                    actualizarCampo("transferencia", event.target.value)
                                                }
                                                type="number"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Crédito
                                            </label>
                                            <input
                                                value={formulario.credito}
                                                onChange={(event) =>
                                                    actualizarCampo("credito", event.target.value)
                                                }
                                                type="number"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>
                                    </div>

                                    {credito > 0 && (
                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Fecha vencimiento del crédito
                                            </label>
                                            <input
                                                value={formulario.fechaVencimiento}
                                                onChange={(event) =>
                                                    actualizarCampo(
                                                        "fechaVencimiento",
                                                        event.target.value
                                                    )
                                                }
                                                type="date"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-2 block text-xs font-bold text-slate-600">
                                            Observaciones
                                        </label>
                                        <textarea
                                            value={formulario.observaciones}
                                            onChange={(event) =>
                                                actualizarCampo("observaciones", event.target.value)
                                            }
                                            rows={3}
                                            placeholder="Referencia, notas del pago, autorización..."
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="sticky bottom-0 -mx-6 mt-6 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
                                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                                    <div className="grid gap-3 md:grid-cols-4">
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Total
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-800">
                                                {formatoMoneda(total, configuracion.simboloMoneda)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-emerald-50 p-3">
                                            <p className="text-[10px] font-bold text-emerald-700">
                                                Pagado ahora
                                            </p>
                                            <p className="mt-1 text-sm font-black text-emerald-700">
                                                {formatoMoneda(pagadoAhora, configuracion.simboloMoneda)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-rose-50 p-3">
                                            <p className="text-[10px] font-bold text-rose-700">
                                                Comisión POS
                                            </p>
                                            <p className="mt-1 text-sm font-black text-rose-700">
                                                {formatoMoneda(comisionTarjeta, configuracion.simboloMoneda)}
                                            </p>
                                        </div>

                                        <div
                                            className={`rounded-2xl p-3 ${Math.abs(diferencia) < 0.01
                                                ? "bg-emerald-50"
                                                : "bg-rose-50"
                                                }`}
                                        >
                                            <p
                                                className={`text-[10px] font-bold ${Math.abs(diferencia) < 0.01
                                                    ? "text-emerald-700"
                                                    : "text-rose-700"
                                                    }`}
                                            >
                                                Diferencia
                                            </p>
                                            <p
                                                className={`mt-1 text-sm font-black ${Math.abs(diferencia) < 0.01
                                                    ? "text-emerald-700"
                                                    : "text-rose-700"
                                                    }`}
                                            >
                                                {formatoMoneda(diferencia, configuracion.simboloMoneda)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setModalCobroAbierto(false)}
                                            className="rounded-xl bg-slate-100 px-5 py-3 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormulario({
                                                    ...formularioCajaVacio,
                                                    posId: posPredeterminadoId,
                                                });
                                                setBusquedaCitaCobro("");
                                            }}
                                            className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                        >
                                            Limpiar
                                        </button>

                                        <button
                                            disabled={guardando}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            {guardando ? "Guardando..." : "Registrar cobro"}
                                        </button>
                                    </div>
                                </div>

                                {tarjeta > 0 && (
                                    <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700">
                                        POS aplicado:{" "}
                                        {posSeleccionado
                                            ? `${posSeleccionado.nombre} · ${posSeleccionado.banco} · ${posSeleccionado.comision}%`
                                            : "No seleccionado"}{" "}
                                        · Neto tarjeta:{" "}
                                        {formatoMoneda(netoTarjeta, configuracion.simboloMoneda)}
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalAbonoAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">
                                    Abonar a cuenta
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Buscá una cuenta pendiente y aplicá el abono correspondiente.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setModalAbonoAbierto(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={registrarAbono}
                            className="max-h-[calc(92vh-92px)] overflow-y-auto p-6"
                        >
                            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Buscar cuenta pendiente
                                    </label>

                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                                        <Search className="h-4 w-4 text-slate-400" />
                                        <input
                                            value={busquedaCuentaAbono}
                                            onChange={(event) => {
                                                const valor = event.target.value;
                                                setBusquedaCuentaAbono(valor);
                                                if (formularioAbono.cuentaId) {
                                                    setFormularioAbono((datos) => ({
                                                        ...datos,
                                                        cuentaId: "",
                                                    }));
                                                }
                                            }}
                                            placeholder="Escribí nombre del paciente, concepto o ID..."
                                            className="w-full bg-transparent text-[13px] font-medium outline-none"
                                        />
                                    </div>

                                    <div className="mt-3 max-h-[330px] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-2">
                                        {cuentasPendientesFiltradas.map((cuenta) => {
                                            const seleccionada =
                                                formularioAbono.cuentaId === cuenta.id;

                                            return (
                                                <button
                                                    key={cuenta.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormularioAbono((datos) => ({
                                                            ...datos,
                                                            cuentaId: cuenta.id,
                                                        }));
                                                        setBusquedaCuentaAbono(
                                                            `${cuenta.pacienteNombre} · ${cuenta.concepto}`
                                                        );
                                                    }}
                                                    className={`mb-2 w-full rounded-xl border p-3 text-left last:mb-0 ${seleccionada
                                                        ? "border-amber-200 bg-amber-50"
                                                        : "border-white bg-white hover:border-slate-200"
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-[13px] font-black text-slate-800">
                                                                {cuenta.pacienteNombre}
                                                            </p>
                                                            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                                                                {cuenta.concepto}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] text-slate-400">
                                                                Vence: {cuenta.fechaVencimiento || "Sin fecha"}
                                                            </p>
                                                        </div>

                                                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-amber-700">
                                                            {formatoMoneda(cuenta.saldo, configuracion.simboloMoneda)}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {cuentasPendientesFiltradas.length === 0 && (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
                                                <p className="text-xs font-bold text-slate-500">
                                                    No hay cuentas pendientes con esa búsqueda.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                                    <h4 className="text-sm font-black text-slate-800">
                                        Datos del abono
                                    </h4>

                                    {cuentaAbonoSeleccionada && (
                                        <div className="mt-3 rounded-2xl bg-white p-4">
                                            <p className="text-[11px] font-bold text-slate-400">
                                                Cuenta seleccionada
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-800">
                                                {cuentaAbonoSeleccionada.pacienteNombre}
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                {cuentaAbonoSeleccionada.concepto}
                                            </p>
                                            <p className="mt-2 text-xs font-black text-amber-700">
                                                Saldo:{" "}
                                                {formatoMoneda(
                                                    cuentaAbonoSeleccionada.saldo,
                                                    configuracion.simboloMoneda
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-4 grid gap-3">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Efectivo
                                            </label>
                                            <input
                                                value={formularioAbono.efectivo}
                                                onChange={(event) =>
                                                    setFormularioAbono((datos) => ({
                                                        ...datos,
                                                        efectivo: event.target.value,
                                                    }))
                                                }
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Tarjeta
                                            </label>
                                            <input
                                                value={formularioAbono.tarjeta}
                                                onChange={(event) =>
                                                    setFormularioAbono((datos) => ({
                                                        ...datos,
                                                        tarjeta: event.target.value,
                                                    }))
                                                }
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                Transferencia
                                            </label>
                                            <input
                                                value={formularioAbono.transferencia}
                                                onChange={(event) =>
                                                    setFormularioAbono((datos) => ({
                                                        ...datos,
                                                        transferencia: event.target.value,
                                                    }))
                                                }
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            />
                                        </div>
                                    </div>

                                    {tarjetaAbono > 0 && (
                                        <div className="mt-4">
                                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                                POS del abono con tarjeta
                                            </label>
                                            <select
                                                value={formularioAbono.posId || posPredeterminadoId}
                                                onChange={(event) =>
                                                    setFormularioAbono((datos) => ({
                                                        ...datos,
                                                        posId: event.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                            >
                                                <option value="">Seleccionar POS</option>
                                                {posesActivos.map((pos) => (
                                                    <option key={pos.id} value={pos.id}>
                                                        {pos.nombre} · {pos.banco} · {pos.comision}%
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="mt-4 rounded-2xl bg-white p-4">
                                        <h5 className="text-xs font-black text-slate-800">
                                            Resumen del abono
                                        </h5>

                                        <div className="mt-3 space-y-2 text-[12px]">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-slate-500">Total abono</span>
                                                <strong className="text-slate-900">
                                                    {formatoMoneda(montoAbono, configuracion.simboloMoneda)}
                                                </strong>
                                            </div>

                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-slate-500">Saldo después</span>
                                                <strong
                                                    className={
                                                        diferenciaAbono < 0
                                                            ? "text-rose-600"
                                                            : "text-amber-700"
                                                    }
                                                >
                                                    {formatoMoneda(
                                                        Math.max(diferenciaAbono, 0),
                                                        configuracion.simboloMoneda
                                                    )}
                                                </strong>
                                            </div>

                                            {tarjetaAbono > 0 && (
                                                <>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-slate-500">
                                                            Comisión POS
                                                        </span>
                                                        <strong className="text-rose-600">
                                                            {formatoMoneda(
                                                                comisionAbonoTarjeta,
                                                                configuracion.simboloMoneda
                                                            )}
                                                        </strong>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-slate-500">
                                                            Neto tarjeta
                                                        </span>
                                                        <strong className="text-blue-700">
                                                            {formatoMoneda(
                                                                netoAbonoTarjeta,
                                                                configuracion.simboloMoneda
                                                            )}
                                                        </strong>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {cuentaAbonoSeleccionada &&
                                            montoAbono > cuentaAbonoSeleccionada.saldo && (
                                                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">
                                                    El abono no puede ser mayor que el saldo pendiente.
                                                </p>
                                            )}
                                    </div>

                                    <div className="mt-5 flex flex-col gap-2">
                                        <button
                                            type="submit"
                                            disabled={guardando}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <BadgeDollarSign className="h-4 w-4" />
                                            {guardando ? "Guardando..." : "Registrar abono"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setModalAbonoAbierto(false)}
                                            className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
