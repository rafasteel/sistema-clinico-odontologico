"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Archive,
    CheckCircle2,
    Clock,
    Database,
    Download,
    FileJson,
    FolderArchive,
    HardDriveDownload,
    HardDriveUpload,
    Info,
    RefreshCcw,
    ShieldAlert,
    Trash2,
    Upload,
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

type ClaveRespaldo = {
    clave: string;
    nombre: string;
    modulo: string;
    descripcion: string;
};

type ItemRespaldo = {
    clave: string;
    nombre: string;
    modulo: string;
    descripcion: string;
    raw: string | null;
    datos: unknown;
    registros: number;
};

type RespaldoSistema = {
    tipo: "SISTEMA_CLINICO_RESPALDO";
    version: string;
    generadoEn: string;
    generadoPor: string;
    clinica: string;
    items: ItemRespaldo[];
};

const ULTIMO_RESPALDO_KEY = "ultimo_respaldo_sistema_clinico";

const clavesRespaldo: ClaveRespaldo[] = [
    {
        clave: "configuracion_clinica_sistema_clinico",
        nombre: "Configuración de clínica",
        modulo: "Configuración",
        descripcion: "Datos generales, moneda, comisión POS y mensajes.",
    },
    {
        clave: "usuarios_app_sistema_clinico",
        nombre: "Usuarios del sistema",
        modulo: "Administración",
        descripcion: "Usuarios, roles y estados de acceso.",
    },
    {
        clave: "pacientes_sistema_clinico",
        nombre: "Pacientes",
        modulo: "Pacientes",
        descripcion: "Directorio clínico, alertas médicas y datos generales.",
    },
    {
        clave: "doctores_sistema_clinico",
        nombre: "Doctores",
        modulo: "Doctores y Servicios",
        descripcion: "Profesionales disponibles para agenda.",
    },
    {
        clave: "servicios_sistema_clinico",
        nombre: "Servicios",
        modulo: "Doctores y Servicios",
        descripcion: "Catálogo de tratamientos, duración y precios.",
    },
    {
        clave: "citas_sistema_clinico",
        nombre: "Agenda médica",
        modulo: "Agenda",
        descripcion: "Citas, estados, doctores, pacientes y servicios.",
    },
    {
        clave: "odontogramas_sistema_clinico",
        nombre: "Odontogramas",
        modulo: "Odontograma",
        descripcion: "Registros dentales por paciente.",
    },
    {
        clave: "presupuestos_sistema_clinico",
        nombre: "Presupuestos",
        modulo: "Presupuestos",
        descripcion: "Cotizaciones, tratamientos y presupuestos por paciente.",
    },
    {
        clave: "ventas_sistema_clinico",
        nombre: "Ventas",
        modulo: "Caja",
        descripcion: "Cobros, recibos, créditos, productos y abonos.",
    },
    {
        clave: "cuentas_cobrar_sistema_clinico",
        nombre: "Cuentas por cobrar",
        modulo: "Caja",
        descripcion: "Créditos pendientes de pacientes o clientes.",
    },
    {
        clave: "gastos_sistema_clinico",
        nombre: "Gastos",
        modulo: "Control de Gastos",
        descripcion: "Gastos activos, anulados y pagos a proveedores.",
    },
    {
        clave: "productos_sistema_clinico",
        nombre: "Inventario",
        modulo: "Inventario",
        descripcion: "Productos, stock, costos, precios y vencimientos.",
    },
    {
        clave: "movimientos_inventario_sistema_clinico",
        nombre: "Movimientos de inventario",
        modulo: "Inventario",
        descripcion: "Entradas, salidas, ajustes, pérdidas y uso clínico.",
    },
    {
        clave: "proveedores_sistema_clinico",
        nombre: "Proveedores",
        modulo: "Proveedores",
        descripcion: "Directorio comercial de proveedores.",
    },
    {
        clave: "compras_proveedores_sistema_clinico",
        nombre: "Compras a proveedores",
        modulo: "Proveedores",
        descripcion: "Compras, pagos, créditos y relación con inventario.",
    },
    {
        clave: "cuentas_pagar_sistema_clinico",
        nombre: "Cuentas por pagar",
        modulo: "Proveedores",
        descripcion: "Deudas pendientes con proveedores.",
    },
    {
        clave: "cierres_caja_sistema_clinico",
        nombre: "Cierres de caja",
        modulo: "Cierre de Caja",
        descripcion: "Cuadres diarios de caja.",
    },
    {
        clave: ULTIMO_RESPALDO_KEY,
        nombre: "Último respaldo",
        modulo: "Respaldo",
        descripcion: "Fecha del último respaldo generado o restaurado.",
    },
];

function leerJSONSeguro(raw: string | null) {
    if (!raw) return null;

    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return raw;
    }
}

function contarRegistros(datos: unknown) {
    if (Array.isArray(datos)) return datos.length;

    if (datos && typeof datos === "object") return 1;

    if (typeof datos === "string" && datos.trim()) return 1;

    return 0;
}

function formatoBytes(bytes: number) {
    if (bytes <= 0) return "0 KB";

    const kb = bytes / 1024;

    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(2)} MB`;
}

function fechaLegible(valor: string | null) {
    if (!valor) return "Nunca";

    try {
        const fecha = new Date(valor);

        if (Number.isNaN(fecha.getTime())) return valor;

        return fecha.toLocaleString("es-NI", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch {
        return valor;
    }
}

function descargarArchivo(nombre: string, contenido: string) {
    const blob = new Blob([contenido], {
        type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombre;
    enlace.click();

    URL.revokeObjectURL(url);
}

function nombreArchivoFecha() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    const hour = String(fecha.getHours()).padStart(2, "0");
    const minute = String(fecha.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}-${hour}${minute}`;
}

export default function RespaldoPage() {
    const inputArchivoRef = useRef<HTMLInputElement | null>(null);

    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [items, setItems] = useState<ItemRespaldo[]>([]);
    const [ultimoRespaldo, setUltimoRespaldo] = useState<string | null>(null);
    const [archivoNombre, setArchivoNombre] = useState("");
    const [respaldoImportado, setRespaldoImportado] =
        useState<RespaldoSistema | null>(null);

    function cargarEstado() {
        const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
        const ultimo = localStorage.getItem(ULTIMO_RESPALDO_KEY);

        if (usuarioGuardado) {
            setUsuario(leerJSONSeguro(usuarioGuardado) as UsuarioSistema);
        }

        setConfiguracion(obtenerConfiguracionClinica());
        setUltimoRespaldo(ultimo);

        const nuevosItems = clavesRespaldo.map((item) => {
            const raw = localStorage.getItem(item.clave);
            const datos = leerJSONSeguro(raw);

            return {
                ...item,
                raw,
                datos,
                registros: contarRegistros(datos),
            };
        });

        setItems(nuevosItems);
    }

    useEffect(() => {
        cargarEstado();
    }, []);

    const totalRegistros = items.reduce(
        (total, item) => total + item.registros,
        0
    );

    const modulosConDatos = items.filter((item) => item.registros > 0).length;

    const tamanoEstimado = useMemo(() => {
        return items.reduce((total, item) => {
            return total + (item.raw ? new Blob([item.raw]).size : 0);
        }, 0);
    }, [items]);

    const itemsConDatos = items.filter((item) => item.registros > 0);

    const itemsSinDatos = items.filter((item) => item.registros === 0);

    const registrosImportados =
        respaldoImportado?.items.reduce(
            (total, item) => total + (item.registros || 0),
            0
        ) || 0;

    function crearObjetoRespaldo(): RespaldoSistema {
        const itemsRespaldo = clavesRespaldo.map((item) => {
            const raw = localStorage.getItem(item.clave);
            const datos = leerJSONSeguro(raw);

            return {
                ...item,
                raw,
                datos,
                registros: contarRegistros(datos),
            };
        });

        return {
            tipo: "SISTEMA_CLINICO_RESPALDO",
            version: "1.0",
            generadoEn: new Date().toISOString(),
            generadoPor: usuario?.nombre || "Usuario no identificado",
            clinica: configuracion.nombreClinica,
            items: itemsRespaldo,
        };
    }

    function generarRespaldo() {
        const respaldo = crearObjetoRespaldo();
        const contenido = JSON.stringify(respaldo, null, 2);
        const nombre = `respaldo-sistema-clinico-${nombreArchivoFecha()}.json`;

        descargarArchivo(nombre, contenido);

        const fechaActual = new Date().toISOString();
        localStorage.setItem(ULTIMO_RESPALDO_KEY, fechaActual);

        setUltimoRespaldo(fechaActual);
        cargarEstado();

        alert("Respaldo generado correctamente.");
    }

    function seleccionarArchivo(event: ChangeEvent<HTMLInputElement>) {
        const archivo = event.target.files?.[0];

        if (!archivo) return;

        setArchivoNombre(archivo.name);

        const lector = new FileReader();

        lector.onload = () => {
            try {
                const contenido = String(lector.result || "");
                const datos = JSON.parse(contenido) as RespaldoSistema;

                if (datos.tipo !== "SISTEMA_CLINICO_RESPALDO") {
                    alert("El archivo seleccionado no parece ser un respaldo válido.");
                    setRespaldoImportado(null);
                    return;
                }

                if (!Array.isArray(datos.items)) {
                    alert("El respaldo no contiene una estructura válida de módulos.");
                    setRespaldoImportado(null);
                    return;
                }

                setRespaldoImportado(datos);
            } catch {
                alert("No se pudo leer el archivo. Verificá que sea un JSON válido.");
                setRespaldoImportado(null);
            }
        };

        lector.readAsText(archivo);
    }

    function restaurarRespaldo() {
        if (!respaldoImportado) {
            alert("Primero seleccioná un archivo de respaldo.");
            return;
        }

        const confirmar = window.confirm(
            "¿Seguro que deseas restaurar este respaldo? Los datos actuales de los módulos incluidos serán reemplazados."
        );

        if (!confirmar) return;

        respaldoImportado.items.forEach((item) => {
            if (!item.clave) return;

            if (item.raw !== null && item.raw !== undefined) {
                localStorage.setItem(item.clave, item.raw);
                return;
            }

            localStorage.setItem(item.clave, JSON.stringify(item.datos ?? null));
        });

        const fechaActual = new Date().toISOString();
        localStorage.setItem(ULTIMO_RESPALDO_KEY, fechaActual);

        setRespaldoImportado(null);
        setArchivoNombre("");

        if (inputArchivoRef.current) {
            inputArchivoRef.current.value = "";
        }

        cargarEstado();

        alert("Respaldo restaurado correctamente.");
    }

    function limpiarArchivoImportado() {
        setRespaldoImportado(null);
        setArchivoNombre("");

        if (inputArchivoRef.current) {
            inputArchivoRef.current.value = "";
        }
    }

    function borrarDatosLocales() {
        const confirmar = window.confirm(
            "¿Seguro que deseas borrar los datos locales del sistema? Esta acción no se puede deshacer si no tenés un respaldo."
        );

        if (!confirmar) return;

        const segundaConfirmacion = window.confirm(
            "Última confirmación: se borrarán pacientes, ventas, gastos, inventario, proveedores, agenda, cierres y configuración guardada en este navegador."
        );

        if (!segundaConfirmacion) return;

        clavesRespaldo.forEach((item) => {
            localStorage.removeItem(item.clave);
        });

        cargarEstado();

        alert("Datos locales borrados correctamente.");
    }

    return (
        <AppShell
            titulo="Respaldo"
            descripcion="Copia de seguridad, restauración y control de datos locales del sistema"
            moduloActivo="Respaldo"
        >
            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Database className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Módulos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {modulosConDatos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Módulos con datos
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <FileJson className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Registros
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {totalRegistros}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Registros aproximados
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Archive className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Tamaño
                        </span>
                    </div>

                    <h3 className="mt-4 text-[26px] font-bold leading-none text-slate-800">
                        {formatoBytes(tamanoEstimado)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Tamaño estimado
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <Clock className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Último
                        </span>
                    </div>

                    <h3 className="mt-4 text-[15px] font-black leading-5 text-slate-800">
                        {fechaLegible(ultimoRespaldo)}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Último respaldo
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                    <div className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <HardDriveDownload className="h-6 w-6 text-teal-300" />
                        </div>

                        <h3 className="mt-5 text-2xl font-black">
                            Crear respaldo completo
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-white/55">
                            Descarga un archivo JSON con toda la información guardada en este
                            navegador: pacientes, agenda, caja, gastos, inventario,
                            proveedores, cierres, usuarios y configuración.
                        </p>

                        <button
                            onClick={generarRespaldo}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-teal-500/20 hover:opacity-95"
                        >
                            <Download className="h-5 w-5" />
                            Descargar respaldo JSON
                        </button>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                    <HardDriveUpload className="h-[18px] w-[18px]" />
                                </div>

                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Restaurar respaldo
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Importa un respaldo generado anteriormente
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center hover:border-teal-300 hover:bg-teal-50/40">
                                <Upload className="h-10 w-10 text-slate-300" />
                                <span className="mt-3 text-sm font-black text-slate-700">
                                    Seleccionar archivo JSON
                                </span>
                                <span className="mt-1 text-xs text-slate-400">
                                    Debe ser un respaldo del Sistema Clínico
                                </span>

                                <input
                                    ref={inputArchivoRef}
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={seleccionarArchivo}
                                    className="hidden"
                                />
                            </label>

                            {archivoNombre && (
                                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs font-bold text-slate-500">
                                        Archivo seleccionado
                                    </p>
                                    <p className="mt-1 text-sm font-black text-slate-800">
                                        {archivoNombre}
                                    </p>
                                </div>
                            )}

                            {respaldoImportado && (
                                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                                        <div>
                                            <h4 className="text-sm font-black text-blue-800">
                                                Respaldo detectado correctamente
                                            </h4>
                                            <p className="mt-1 text-xs leading-5 text-blue-700">
                                                Clínica: <strong>{respaldoImportado.clinica}</strong>
                                                <br />
                                                Generado por:{" "}
                                                <strong>{respaldoImportado.generadoPor}</strong>
                                                <br />
                                                Fecha:{" "}
                                                <strong>
                                                    {fechaLegible(respaldoImportado.generadoEn)}
                                                </strong>
                                                <br />
                                                Registros incluidos:{" "}
                                                <strong>{registrosImportados}</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    onClick={restaurarRespaldo}
                                    disabled={!respaldoImportado}
                                    className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Restaurar respaldo
                                </button>

                                <button
                                    onClick={limpiarArchivoImportado}
                                    className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                            <div>
                                <h3 className="text-sm font-black text-red-800">
                                    Zona de riesgo
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-red-700">
                                    Usá esta opción solo si querés limpiar los datos de este
                                    navegador. Antes de borrar, generá un respaldo.
                                </p>

                                <button
                                    onClick={borrarDatosLocales}
                                    className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Borrar datos locales
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Estado de datos locales
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Módulos incluidos en el respaldo
                                    </p>
                                </div>

                                <button
                                    onClick={cargarEstado}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Recargar
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[880px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {itemsConDatos.map((item) => (
                                    <div
                                        key={item.clave}
                                        className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                                                <FolderArchive className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-black text-slate-800">
                                                        {item.nombre}
                                                    </h4>

                                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                                        Con datos
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-xs font-semibold text-teal-700">
                                                    {item.modulo}
                                                </p>

                                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                                    {item.descripcion}
                                                </p>

                                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                    <div className="rounded-2xl bg-slate-50 p-3">
                                                        <p className="text-[10px] font-bold text-slate-400">
                                                            Registros
                                                        </p>
                                                        <p className="mt-1 text-sm font-black text-slate-800">
                                                            {item.registros}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-blue-50 p-3">
                                                        <p className="text-[10px] font-bold text-blue-700">
                                                            Tamaño
                                                        </p>
                                                        <p className="mt-1 text-sm font-black text-blue-700">
                                                            {formatoBytes(item.raw ? new Blob([item.raw]).size : 0)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {itemsConDatos.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <Archive className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            No hay datos guardados
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Cuando registres información, aparecerá aquí.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {itemsSinDatos.length > 0 && (
                        <div className="glass-card overflow-hidden rounded-2xl">
                            <div className="border-b border-black/[0.04] px-6 py-4">
                                <h3 className="text-[16px] font-bold text-slate-800">
                                    Módulos sin datos
                                </h3>
                                <p className="mono mt-0.5 text-[10px] text-slate-400">
                                    Se incluirán en el respaldo como vacíos
                                </p>
                            </div>

                            <div className="grid gap-2 p-4 md:grid-cols-2">
                                {itemsSinDatos.map((item) => (
                                    <div
                                        key={item.clave}
                                        className="rounded-2xl bg-slate-50 px-4 py-3"
                                    >
                                        <p className="text-xs font-black text-slate-700">
                                            {item.nombre}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                            {item.modulo}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                    <div>
                        <h3 className="text-sm font-black text-amber-800">
                            Importante
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-amber-700">
                            Este respaldo corresponde a los datos guardados en este navegador
                            mediante localStorage. Cuando migremos a Supabase, el respaldo se
                            hará desde la base de datos real.
                        </p>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}