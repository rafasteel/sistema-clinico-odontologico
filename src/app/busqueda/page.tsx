"use client";

import { resumirVentas } from "@/lib/resumenFinanciero";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BadgeDollarSign,
    CalendarClock,
    ClipboardList,
    CreditCard,
    FileText,
    Package,
    Paperclip,
    Pill,
    ReceiptText,
    RefreshCcw,
    Search,
    Stethoscope,
    Truck,
    UserRound,
    WalletCards,
    XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    listarPacientesSupabase,
    type PacienteSupabase,
} from "@/lib/supabase/pacientes";
import {
    listarCitasSupabase,
    type CitaSupabase,
    type EstadoCitaSupabase,
} from "@/lib/supabase/citas";
import {
    listarNotasClinicasPacienteSupabase,
    listarRecetasPacienteSupabase,
    listarTratamientosPacienteSupabase,
    type NotaClinicaSupabase,
    type RecetaSupabase,
    type TratamientoSupabase,
} from "@/lib/supabase/perfilPaciente";
import {
    listarCuentasCobrarSupabase,
    listarVentasSupabase,
    type CuentaCobrarSupabase,
    type EstadoCuentaCobrarSupabase,
    type EstadoVentaSupabase,
    type VentaSupabase,
} from "@/lib/supabase/finanzas";
import {
    listarDoctoresSupabase,
    listarServiciosSupabase,
    type DoctorSupabase,
    type ServicioSupabase,
} from "@/lib/supabase/doctoresServicios";
import {
    listarProductosInventarioSupabase,
    type ProductoInventarioSupabase,
} from "@/lib/supabase/inventario";
import {
    listarProveedoresSupabase,
    type ProveedorSupabase,
} from "@/lib/supabase/proveedores";
import {
    listarPresupuestosSupabase,
    type PresupuestoSupabase,
} from "@/lib/supabase/presupuestos";
import {
    listarDocumentosSupabase,
    type DocumentoPacienteSupabase,
} from "@/lib/supabase/documentosPacientes";

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

type EstadoCita = EstadoCitaSupabase;

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

type NotaClinica = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora: string;
    doctor: string;
    servicio: string;
    diagnostico: string;
    procedimiento: string;
    observaciones: string;
    proximaCita: string;
    usuarioNombre: string;
    estado: "Activa" | "Anulada";
};

type Tratamiento = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    nombre: string;
    descripcion: string;
    total: number;
    abonado: number;
    estado: "Planificado" | "En proceso" | "Completado" | "Suspendido";
};

type Receta = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora: string;
    doctor: string;
    doctorNombre: string;
    diagnostico: string;
    medicamento: string;
    indicaciones: string;
    duracion: string;
    observaciones: string;
    estado: "Activa" | "Anulada";
};

type EstadoVenta = EstadoVentaSupabase;

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

type EstadoCuenta = EstadoCuentaCobrarSupabase;

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

type Presupuesto = {
    id: string;
    pacienteId: string;
    pacienteNombre?: string;
    fecha: string;
    hora?: string;
    total: number;
    estado: string;
    origen?: string;
    observaciones?: string;
};

type DocumentoPaciente = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora: string;
    nombreArchivo: string;
    tipoArchivo: string;
    tamanoBytes: number;
    categoria: string;
    descripcion: string;
    urlFirmada?: string;
    usuarioNombre: string;
};

type Doctor = {
    id: string;
    nombre: string;
    especialidad: string;
    telefono: string;
    correo: string;
    estado: "Activo" | "Inactivo";
};

type Servicio = {
    id: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    precio: number;
    duracionMinutos: number;
    estado: "Activo" | "Inactivo";
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

type Proveedor = {
    id: string;
    nombre: string;
    contacto: string;
    telefono: string;
    correo: string;
    direccion: string;
    estado: "Activo" | "Inactivo";
};

type TipoResultado =
    | "Todos"
    | "Paciente"
    | "Cita"
    | "Nota clínica"
    | "Tratamiento"
    | "Receta"
    | "Venta"
    | "Cuenta por cobrar"
    | "Doctor"
    | "Servicio"
    | "Producto"
    | "Proveedor"
    | "Presupuesto"
    | "Documento";

type ResultadoBusqueda = {
    id: string;
    tipo: Exclude<TipoResultado, "Todos">;
    titulo: string;
    subtitulo: string;
    detalle: string;
    fecha: string;
    estado: string;
    monto?: number;
    href: string;
};

const tiposBusqueda: TipoResultado[] = [
    "Todos",
    "Paciente",
    "Cita",
    "Nota clínica",
    "Tratamiento",
    "Receta",
    "Venta",
    "Cuenta por cobrar",
    "Doctor",
    "Servicio",
    "Producto",
    "Proveedor",
    "Presupuesto",
    "Documento",
];

function numero(valor: unknown) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function horaCorta(valor: unknown) {
    return String(valor || "").slice(0, 5);
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function fechaLegible(fecha: string) {
    if (!fecha) return "No registrada";

    const partes = fecha.split("-");
    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function normalizar(textoValor: unknown) {
    return String(textoValor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function colorTipo(tipo: ResultadoBusqueda["tipo"]) {
    if (tipo === "Paciente") return "bg-slate-100 text-slate-700";
    if (tipo === "Cita") return "bg-blue-50 text-blue-700";
    if (tipo === "Nota clínica") return "bg-teal-50 text-teal-700";
    if (tipo === "Tratamiento") return "bg-amber-50 text-amber-700";
    if (tipo === "Receta") return "bg-purple-50 text-purple-700";
    if (tipo === "Venta") return "bg-emerald-50 text-emerald-700";
    if (tipo === "Cuenta por cobrar") return "bg-red-50 text-red-700";
    if (tipo === "Doctor") return "bg-cyan-50 text-cyan-700";
    if (tipo === "Servicio") return "bg-indigo-50 text-indigo-700";
    if (tipo === "Producto") return "bg-orange-50 text-orange-700";
    if (tipo === "Proveedor") return "bg-lime-50 text-lime-700";
    if (tipo === "Presupuesto") return "bg-indigo-50 text-indigo-700";

    return "bg-cyan-50 text-cyan-700";
}

function iconoTipo(tipo: ResultadoBusqueda["tipo"]) {
    if (tipo === "Paciente") return <UserRound className="h-5 w-5" />;
    if (tipo === "Cita") return <CalendarClock className="h-5 w-5" />;
    if (tipo === "Nota clínica") return <ClipboardList className="h-5 w-5" />;
    if (tipo === "Tratamiento") return <Activity className="h-5 w-5" />;
    if (tipo === "Receta") return <Pill className="h-5 w-5" />;
    if (tipo === "Venta") return <ReceiptText className="h-5 w-5" />;
    if (tipo === "Cuenta por cobrar") return <WalletCards className="h-5 w-5" />;
    if (tipo === "Doctor") return <Stethoscope className="h-5 w-5" />;
    if (tipo === "Servicio") return <FileText className="h-5 w-5" />;
    if (tipo === "Producto") return <Package className="h-5 w-5" />;
    if (tipo === "Proveedor") return <Truck className="h-5 w-5" />;
    if (tipo === "Presupuesto") return <FileText className="h-5 w-5" />;

    return <Paperclip className="h-5 w-5" />;
}

function convertirPaciente(paciente: PacienteSupabase, saldo = 0): Paciente {
    return {
        id: paciente.id,
        nombre: paciente.nombre || "",
        telefono: paciente.telefono || paciente.whatsapp || "",
        cedula: paciente.cedula || "",
        fechaNacimiento: paciente.fecha_nacimiento || "",
        direccion: paciente.direccion || "",
        alergias: paciente.alergias || "",
        enfermedades:
            paciente.enfermedades_sistemicas ||
            paciente.antecedentes ||
            "",
        medicamentos: paciente.medicamentos_actuales || "",
        observaciones: paciente.observaciones || "",
        estado: paciente.estado || "Activo",
        saldoPendiente: saldo,
        ultimaCita: "",
    };
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
        costo: numero(cita.costo),
        fecha: cita.fecha || "",
        hora: horaCorta(cita.hora),
        recurrencia: cita.recurrencia || "",
        estado: cita.estado || "Programada",
        observaciones: cita.observaciones || "",
        creadaEn: cita.creado_en || "",
    };
}

function convertirNota(
    nota: NotaClinicaSupabase,
    pacienteNombre: string
): NotaClinica {
    return {
        id: nota.id,
        pacienteId: nota.paciente_id || "",
        pacienteNombre,
        fecha: nota.fecha || "",
        hora: horaCorta(nota.hora),
        doctor: nota.doctor_nombre || "",
        servicio: nota.servicio_nombre || "",
        diagnostico: nota.diagnostico || "",
        procedimiento: nota.procedimiento || "",
        observaciones: nota.observaciones || "",
        proximaCita: nota.proxima_cita || "",
        usuarioNombre: "Usuario del sistema",
        estado: nota.estado || "Activa",
    };
}

function convertirTratamiento(
    tratamiento: TratamientoSupabase,
    pacienteNombre: string
): Tratamiento {
    return {
        id: tratamiento.id,
        pacienteId: tratamiento.paciente_id || "",
        pacienteNombre,
        fecha: tratamiento.fecha || "",
        nombre: tratamiento.nombre || "",
        descripcion: tratamiento.descripcion || "",
        total: numero(tratamiento.total),
        abonado: numero(tratamiento.abonado),
        estado: tratamiento.estado || "Planificado",
    };
}

function convertirReceta(
    receta: RecetaSupabase,
    pacienteNombre: string
): Receta {
    return {
        id: receta.id,
        pacienteId: receta.paciente_id || "",
        pacienteNombre,
        fecha: receta.fecha || "",
        hora: horaCorta(receta.hora),
        doctor: receta.doctor_nombre || "",
        doctorNombre: receta.doctor_nombre || "",
        diagnostico: receta.diagnostico || "",
        medicamento: receta.medicamento || "",
        indicaciones: receta.indicaciones || "",
        duracion: receta.duracion || "",
        observaciones: receta.observaciones || "",
        estado: receta.estado || "Activa",
    };
}

function convertirVenta(venta: VentaSupabase): Venta {
    return {
        id: venta.id,
        fecha: venta.fecha || "",
        hora: horaCorta(venta.hora),
        tipoCobro: venta.tipo_cobro || "Venta",
        citaId: venta.cita_id || "",
        pacienteId: venta.paciente_id || "",
        clienteNombre: venta.cliente_nombre || "",
        concepto: venta.concepto || "",
        total: numero(venta.total),
        efectivo: numero(venta.efectivo),
        tarjeta: numero(venta.tarjeta),
        transferencia: numero(venta.transferencia),
        credito: numero(venta.credito),
        estado: venta.estado || "Pagada",
        usuarioNombre: venta.usuario_nombre || "",
        observaciones: venta.observaciones || "",
    };
}

function convertirCuenta(cuenta: CuentaCobrarSupabase): CuentaPorCobrar {
    return {
        id: cuenta.id,
        ventaId: cuenta.venta_id || "",
        pacienteId: cuenta.paciente_id || "",
        pacienteNombre: cuenta.paciente_nombre || "",
        concepto: cuenta.concepto || "",
        total: numero(cuenta.total),
        saldo: numero(cuenta.saldo),
        fecha: cuenta.fecha || "",
        fechaVencimiento: cuenta.fecha_vencimiento || "",
        estado: cuenta.estado || "Pendiente",
    };
}

function convertirDoctor(doctor: DoctorSupabase): Doctor {
    return {
        id: doctor.id,
        nombre: doctor.nombre || "",
        especialidad: doctor.especialidad || "",
        telefono: doctor.telefono || "",
        correo: doctor.correo || "",
        estado: doctor.estado || "Activo",
    };
}

function convertirServicio(servicio: ServicioSupabase): Servicio {
    return {
        id: servicio.id,
        nombre: servicio.nombre || "",
        categoria: servicio.categoria || "",
        descripcion: servicio.descripcion || "",
        precio: numero(servicio.precio),
        duracionMinutos: numero(servicio.duracion_minutos),
        estado: servicio.estado || "Activo",
    };
}

function convertirProducto(producto: ProductoInventarioSupabase): Producto {
    return {
        id: producto.id,
        codigo: producto.codigo || "",
        nombre: producto.nombre || "",
        categoria: producto.categoria || "",
        unidad: producto.unidad || "",
        stock: numero(producto.stock),
        stockMinimo: numero(producto.stock_minimo),
        costoCompra: numero(producto.costo_compra),
        precioVenta: numero(producto.precio_venta),
        proveedor: producto.proveedor || "",
        vencimiento: producto.vencimiento || "",
        estado: producto.estado || "Activo",
    };
}

function convertirProveedor(proveedor: ProveedorSupabase): Proveedor {
    return {
        id: proveedor.id,
        nombre: proveedor.nombre || "",
        contacto: proveedor.contacto || "",
        telefono: proveedor.telefono || "",
        correo: proveedor.correo || "",
        direccion: proveedor.direccion || "",
        estado: proveedor.estado || "Activo",
    };
}

export default function BusquedaGlobalPage() {
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [citas, setCitas] = useState<Cita[]>([]);
    const [notas, setNotas] = useState<NotaClinica[]>([]);
    const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
    const [doctores, setDoctores] = useState<Doctor[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
    const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);

    const [busqueda, setBusqueda] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState<TipoResultado>("Todos");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            if (typeof window !== "undefined") {
                const parametros = new URLSearchParams(window.location.search);
                const busquedaUrl = parametros.get("q") || "";

                if (busquedaUrl) {
                    setBusqueda(busquedaUrl);
                }
            }

            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }

            const [
                pacientesSupabase,
                citasSupabase,
                ventasSupabase,
                cuentasSupabase,
                doctoresSupabase,
                serviciosSupabase,
                productosSupabase,
                proveedoresSupabase,
                presupuestosSupabase,
                documentosSupabase,
            ] = await Promise.all([
                listarPacientesSupabase(),
                listarCitasSupabase(),
                listarVentasSupabase(),
                listarCuentasCobrarSupabase(),
                listarDoctoresSupabase(),
                listarServiciosSupabase(),
                listarProductosInventarioSupabase(),
                listarProveedoresSupabase(),
                listarPresupuestosSupabase(),
                listarDocumentosSupabase(),
            ]);

            const cuentasConvertidas = cuentasSupabase.map(convertirCuenta);

            const saldoPorPaciente = cuentasConvertidas.reduce<Record<string, number>>(
                (mapa, cuenta) => {
                    if (
                        cuenta.estado !== "Pagada" &&
                        cuenta.estado !== "Anulada" &&
                        cuenta.saldo > 0
                    ) {
                        mapa[cuenta.pacienteId] =
                            (mapa[cuenta.pacienteId] || 0) + cuenta.saldo;
                    }

                    return mapa;
                },
                {}
            );

            const pacientesConvertidos = pacientesSupabase.map((paciente) =>
                convertirPaciente(paciente, saldoPorPaciente[paciente.id] || 0)
            );

            const nombrePacientePorId = pacientesConvertidos.reduce<
                Record<string, string>
            >((mapa, paciente) => {
                mapa[paciente.id] = paciente.nombre;
                return mapa;
            }, {});

            const datosClinicos = await Promise.all(
                pacientesConvertidos.map(async (paciente) => {
                    try {
                        const [notasPaciente, tratamientosPaciente, recetasPaciente] =
                            await Promise.all([
                                listarNotasClinicasPacienteSupabase(paciente.id),
                                listarTratamientosPacienteSupabase(paciente.id),
                                listarRecetasPacienteSupabase(paciente.id),
                            ]);

                        return {
                            notas: notasPaciente.map((nota) =>
                                convertirNota(nota, paciente.nombre)
                            ),
                            tratamientos: tratamientosPaciente.map((tratamiento) =>
                                convertirTratamiento(tratamiento, paciente.nombre)
                            ),
                            recetas: recetasPaciente.map((receta) =>
                                convertirReceta(receta, paciente.nombre)
                            ),
                        };
                    } catch {
                        return {
                            notas: [] as NotaClinica[],
                            tratamientos: [] as Tratamiento[],
                            recetas: [] as Receta[],
                        };
                    }
                })
            );

            setPacientes(pacientesConvertidos);
            setCitas(citasSupabase.map(convertirCita));
            setVentas(ventasSupabase.map(convertirVenta));
            setCuentas(cuentasConvertidas);
            setDoctores(doctoresSupabase.map(convertirDoctor));
            setServicios(serviciosSupabase.map(convertirServicio));
            setProductos(productosSupabase.map(convertirProducto));
            setProveedores(proveedoresSupabase.map(convertirProveedor));
            setNotas(datosClinicos.flatMap((item) => item.notas));
            setTratamientos(datosClinicos.flatMap((item) => item.tratamientos));
            setRecetas(datosClinicos.flatMap((item) => item.recetas));

            const presupuestosLocales = presupuestosSupabase.map(
                (presupuesto: PresupuestoSupabase) => ({
                    id: presupuesto.id,
                    pacienteId: presupuesto.paciente_id,
                    pacienteNombre:
                        presupuesto.paciente_nombre ||
                        nombrePacientePorId[presupuesto.paciente_id] ||
                        "Paciente no especificado",
                    fecha: presupuesto.fecha,
                    hora: String(presupuesto.hora || "").slice(0, 5),
                    total: numero(presupuesto.total),
                    estado: presupuesto.estado || "Pendiente",
                    origen: presupuesto.origen || "Manual",
                    observaciones: presupuesto.observaciones || "",
                })
            );

            const documentosSupabaseConvertidos = documentosSupabase.map(
                (documento: DocumentoPacienteSupabase) => ({
                    id: documento.id,
                    pacienteId: documento.paciente_id,
                    pacienteNombre:
                        documento.paciente_nombre ||
                        nombrePacientePorId[documento.paciente_id] ||
                        "Paciente no especificado",
                    fecha: documento.fecha,
                    hora: String(documento.hora || "").slice(0, 5),
                    nombreArchivo: documento.nombre_archivo,
                    tipoArchivo: documento.tipo_archivo,
                    tamanoBytes: Number(documento.tamano_bytes || 0),
                    categoria: documento.categoria,
                    descripcion: documento.descripcion || "",
                    urlFirmada: documento.url_firmada || "",
                    usuarioNombre: documento.usuario_nombre || "Usuario no identificado",
                })
            );

            setPresupuestos(presupuestosLocales);
            setDocumentos(documentosSupabaseConvertidos);
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar la búsqueda global desde Supabase.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    const resultados = useMemo<ResultadoBusqueda[]>(() => {
        const resultadosPacientes: ResultadoBusqueda[] = pacientes.map((paciente) => ({
            id: `PACIENTE-${paciente.id}`,
            tipo: "Paciente",
            titulo: paciente.nombre,
            subtitulo: `Cédula: ${paciente.cedula || "No registrada"} · Tel: ${paciente.telefono || "No registrado"
                }`,
            detalle: `Dirección: ${paciente.direccion || "No registrada"} · Estado: ${paciente.estado
                }`,
            fecha: paciente.ultimaCita || "",
            estado: paciente.estado,
            monto: paciente.saldoPendiente || 0,
            href: `/pacientes/${paciente.id}`,
        }));

        const resultadosCitas: ResultadoBusqueda[] = citas.map((cita) => ({
            id: `CITA-${cita.id}`,
            tipo: "Cita",
            titulo: cita.pacienteNombre || "Paciente no especificado",
            subtitulo: cita.servicioNombre || "Cita odontológica",
            detalle: `Doctor: ${cita.doctorNombre || "No especificado"} · ${cita.observaciones || "Sin observaciones"
                }`,
            fecha: cita.fecha,
            estado: cita.estado,
            monto: cita.costo || 0,
            href: "/agenda",
        }));

        const resultadosNotas: ResultadoBusqueda[] = notas.map((nota) => ({
            id: `NOTA-${nota.id}`,
            tipo: "Nota clínica",
            titulo: nota.servicio || "Nota clínica",
            subtitulo: `${nota.pacienteNombre || "Paciente"} · Doctor: ${nota.doctor || "No especificado"
                } · ${fechaLegible(nota.fecha)}`,
            detalle: `${nota.diagnostico || "Sin diagnóstico"} · ${nota.procedimiento || "Sin procedimiento"
                }`,
            fecha: nota.fecha,
            estado: nota.estado,
            href: `/pacientes/${nota.pacienteId}`,
        }));

        const resultadosTratamientos: ResultadoBusqueda[] = tratamientos.map(
            (tratamiento) => ({
                id: `TRAT-${tratamiento.id}`,
                tipo: "Tratamiento",
                titulo: tratamiento.nombre,
                subtitulo: `${tratamiento.pacienteNombre || "Paciente"} · ${fechaLegible(
                    tratamiento.fecha
                )}`,
                detalle: tratamiento.descripcion || "Sin descripción registrada",
                fecha: tratamiento.fecha,
                estado: tratamiento.estado,
                monto: tratamiento.total || 0,
                href: `/pacientes/${tratamiento.pacienteId}`,
            })
        );

        const resultadosRecetas: ResultadoBusqueda[] = recetas.map((receta) => ({
            id: `REC-${receta.id}`,
            tipo: "Receta",
            titulo: receta.medicamento,
            subtitulo: `${receta.pacienteNombre || "Paciente"} · Doctor: ${receta.doctor || receta.doctorNombre || "No especificado"
                } · ${fechaLegible(receta.fecha)}`,
            detalle: receta.indicaciones || "Sin indicaciones registradas",
            fecha: receta.fecha,
            estado: receta.estado,
            href: `/pacientes/${receta.pacienteId}`,
        }));

        const resultadosVentas: ResultadoBusqueda[] = ventas.map((venta) => ({
            id: `VENTA-${venta.id}`,
            tipo: "Venta",
            titulo: venta.clienteNombre || "Cliente no especificado",
            subtitulo: venta.concepto || "Venta registrada",
            detalle: `${venta.tipoCobro || "Cobro"} · Usuario: ${venta.usuarioNombre || "No identificado"
                }`,
            fecha: venta.fecha,
            estado: venta.estado,
            monto: venta.total || 0,
            href: `/recibos/${venta.id}`,
        }));

        const resultadosCuentas: ResultadoBusqueda[] = cuentas.map((cuenta) => ({
            id: `CUENTA-${cuenta.id}`,
            tipo: "Cuenta por cobrar",
            titulo: cuenta.pacienteNombre || "Paciente no especificado",
            subtitulo: cuenta.concepto || "Cuenta por cobrar",
            detalle: `Vence: ${fechaLegible(
                cuenta.fechaVencimiento
            )} · Saldo: ${formatoMoneda(
                cuenta.saldo || 0,
                configuracion.simboloMoneda
            )}`,
            fecha: cuenta.fecha,
            estado: cuenta.estado,
            monto: cuenta.saldo || 0,
            href: `/estado-cuenta/${cuenta.pacienteId}`,
        }));

        const resultadosDoctores: ResultadoBusqueda[] = doctores.map((doctor) => ({
            id: `DOCTOR-${doctor.id}`,
            tipo: "Doctor",
            titulo: doctor.nombre,
            subtitulo: doctor.especialidad || "Doctor",
            detalle: `Tel: ${doctor.telefono || "No registrado"} · Correo: ${doctor.correo || "No registrado"
                }`,
            fecha: "",
            estado: doctor.estado,
            href: "/doctores-servicios",
        }));

        const resultadosServicios: ResultadoBusqueda[] = servicios.map((servicio) => ({
            id: `SERVICIO-${servicio.id}`,
            tipo: "Servicio",
            titulo: servicio.nombre,
            subtitulo: `${servicio.categoria || "Servicio"} · ${servicio.duracionMinutos || 0
                } min`,
            detalle: servicio.descripcion || "Sin descripción registrada",
            fecha: "",
            estado: servicio.estado,
            monto: servicio.precio || 0,
            href: "/doctores-servicios",
        }));

        const resultadosProductos: ResultadoBusqueda[] = productos.map((producto) => ({
            id: `PRODUCTO-${producto.id}`,
            tipo: "Producto",
            titulo: producto.nombre,
            subtitulo: `${producto.codigo || "Sin código"} · ${producto.categoria || "Inventario"
                }`,
            detalle: `Stock: ${producto.stock} ${producto.unidad || ""} · Mínimo: ${producto.stockMinimo
                } · Proveedor: ${producto.proveedor || "No registrado"}`,
            fecha: producto.vencimiento || "",
            estado: producto.estado,
            monto: producto.precioVenta || 0,
            href: "/inventario",
        }));

        const resultadosProveedores: ResultadoBusqueda[] = proveedores.map(
            (proveedor) => ({
                id: `PROVEEDOR-${proveedor.id}`,
                tipo: "Proveedor",
                titulo: proveedor.nombre,
                subtitulo: proveedor.contacto || "Proveedor",
                detalle: `Tel: ${proveedor.telefono || "No registrado"} · Correo: ${proveedor.correo || "No registrado"
                    } · Dirección: ${proveedor.direccion || "No registrada"}`,
                fecha: "",
                estado: proveedor.estado,
                href: "/proveedores",
            })
        );

        const resultadosPresupuestos: ResultadoBusqueda[] = presupuestos.map(
            (presupuesto) => ({
                id: `PRESUP-${presupuesto.id}`,
                tipo: "Presupuesto",
                titulo: presupuesto.pacienteNombre || "Presupuesto odontológico",
                subtitulo: presupuesto.origen || "Presupuesto registrado",
                detalle: presupuesto.observaciones || "Sin observaciones",
                fecha: presupuesto.fecha,
                estado: presupuesto.estado || "Registrado",
                monto: presupuesto.total || 0,
                href: `/presupuestos/${presupuesto.id}`,
            })
        );

        const resultadosDocumentos: ResultadoBusqueda[] = documentos.map(
            (documento) => ({
                id: `DOC-${documento.id}`,
                tipo: "Documento",
                titulo: documento.nombreArchivo,
                subtitulo: documento.pacienteNombre || "Paciente no especificado",
                detalle: `${documento.categoria || "Documento"} · ${documento.descripcion || "Sin descripción"
                    }`,
                fecha: documento.fecha,
                estado: "Adjunto",
                href: `/pacientes/${documento.pacienteId}/documentos`,
            })
        );

        return [
            ...resultadosPacientes,
            ...resultadosCitas,
            ...resultadosNotas,
            ...resultadosTratamientos,
            ...resultadosRecetas,
            ...resultadosVentas,
            ...resultadosCuentas,
            ...resultadosDoctores,
            ...resultadosServicios,
            ...resultadosProductos,
            ...resultadosProveedores,
            ...resultadosPresupuestos,
            ...resultadosDocumentos,
        ].sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [
        pacientes,
        citas,
        notas,
        tratamientos,
        recetas,
        ventas,
        cuentas,
        doctores,
        servicios,
        productos,
        proveedores,
        presupuestos,
        documentos,
        configuracion.simboloMoneda,
    ]);

    const resultadosFiltrados = useMemo(() => {
        const textoBusqueda = normalizar(busqueda.trim());

        return resultados.filter((resultado) => {
            const coincideTipo = tipoFiltro === "Todos" || resultado.tipo === tipoFiltro;

            const textoResultado = normalizar(
                `${resultado.tipo} ${resultado.titulo} ${resultado.subtitulo} ${resultado.detalle} ${resultado.estado}`
            );

            const coincideBusqueda =
                !textoBusqueda || textoResultado.includes(textoBusqueda);

            return coincideTipo && coincideBusqueda;
        });
    }, [resultados, busqueda, tipoFiltro]);

    const totalPacientes = pacientes.length;
    const totalEventosClinicos =
        notas.length + tratamientos.length + recetas.length + citas.length;
    const totalFinanciero = resumirVentas(ventas).ventasBrutas;
    const totalPendiente = cuentas
        .filter(
            (cuenta) =>
                cuenta.estado !== "Pagada" &&
                cuenta.estado !== "Anulada" &&
                cuenta.saldo > 0
        )
        .reduce((total, cuenta) => total + (cuenta.saldo || 0), 0);

    return (
        <AppShell
            titulo="Búsqueda global"
            descripcion="Buscador general de pacientes, documentos, historial clínico y movimientos"
            moduloActivo="Búsqueda Global"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo cargar la búsqueda global
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
                        Búsqueda conectada a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Pacientes, citas, historial clínico, ventas, cuentas, doctores, servicios, inventario y proveedores se leen desde la base de datos.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarDatos}
                    disabled={cargando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    {cargando ? "Cargando..." : "Recargar"}
                </button>
            </section>

            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
                    <div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                            <Search className="h-7 w-7 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">
                            Buscador global del sistema
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                            Encontrá rápidamente pacientes, citas, historial clínico,
                            ventas, cuentas por cobrar, inventario y proveedores desde una
                            sola pantalla.
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Registros indexados
                        </p>

                        <h3 className="mt-3 text-4xl font-black">{resultados.length}</h3>

                        <p className="mt-2 text-sm text-white/50">
                            {cargando
                                ? "Cargando resultados desde Supabase..."
                                : "Resultados disponibles para buscar."}
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <UserRound className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalPacientes}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pacientes
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <Stethoscope className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalEventosClinicos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Eventos clínicos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <BadgeDollarSign className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[22px] font-black text-slate-800">
                        {formatoMoneda(totalFinanciero, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Total ventas
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                        <CreditCard className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[22px] font-black text-slate-800">
                        {formatoMoneda(totalPendiente, configuracion.simboloMoneda)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Saldo pendiente
                    </p>
                </div>
            </section>

            <section className="mt-4 glass-card overflow-hidden rounded-3xl">
                <div className="border-b border-black/[0.04] px-6 py-5">
                    <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                autoFocus
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar paciente, cédula, teléfono, medicamento, venta, producto, proveedor..."
                                className="w-full bg-transparent text-sm font-semibold outline-none"
                            />

                            {busqueda && (
                                <button
                                    type="button"
                                    onClick={() => setBusqueda("")}
                                    className="rounded-full bg-slate-100 p-1 text-slate-400 hover:bg-slate-200"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <select
                            value={tipoFiltro}
                            onChange={(event) => setTipoFiltro(event.target.value as TipoResultado)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        >
                            {tiposBusqueda.map((tipo) => (
                                <option key={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-slate-400">
                        Mostrando {resultadosFiltrados.length} resultado(s).
                    </p>
                </div>

                <div className="max-h-[760px] overflow-y-auto p-4">
                    <div className="space-y-3">
                        {resultadosFiltrados.map((resultado) => (
                            <Link
                                key={resultado.id}
                                href={resultado.href}
                                className="block rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:border-teal-100 hover:bg-teal-50/20"
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="flex gap-3">
                                        <div
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorTipo(
                                                resultado.tipo
                                            )}`}
                                        >
                                            {iconoTipo(resultado.tipo)}
                                        </div>

                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-[10px] font-black ${colorTipo(
                                                        resultado.tipo
                                                    )}`}
                                                >
                                                    {resultado.tipo}
                                                </span>

                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                    {resultado.estado}
                                                </span>

                                                {resultado.fecha && (
                                                    <span className="mono rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                        {fechaLegible(resultado.fecha)}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="mt-3 text-base font-black text-slate-900">
                                                {resultado.titulo}
                                            </h3>

                                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                                {resultado.subtitulo}
                                            </p>

                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                {resultado.detalle}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3">
                                        {typeof resultado.monto === "number" && resultado.monto > 0 && (
                                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                                                <p className="text-[10px] font-bold uppercase text-slate-400">
                                                    Monto
                                                </p>
                                                <p className="mt-1 text-sm font-black text-slate-800">
                                                    {formatoMoneda(
                                                        resultado.monto,
                                                        configuracion.simboloMoneda
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {resultadosFiltrados.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                <Search className="mx-auto h-10 w-10 text-slate-300" />
                                <h4 className="mt-3 text-sm font-black text-slate-700">
                                    {cargando ? "Cargando resultados..." : "Sin resultados"}
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    {cargando
                                        ? "Estamos consultando Supabase."
                                        : "Probá buscando por nombre, cédula, teléfono, medicamento, documento, tratamiento, producto, proveedor o concepto de venta."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AppShell>
    );
}
