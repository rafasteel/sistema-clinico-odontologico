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
    Upload,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import {
    crearRespaldoSupabase,
    nombreArchivoRespaldoSupabase,
    registrarHistorialRespaldoSupabase,
    tamanoBytesObjeto,
    validarArchivoRespaldoSupabase,
    type HistorialRespaldoSupabase,
    type ItemRespaldoSupabase,
    type RespaldoSistemaSupabase,
} from "@/lib/supabase/respaldo";

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

function fechaLegible(valor: string | null | undefined) {
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

export default function RespaldoPage() {
    const inputArchivoRef = useRef<HTMLInputElement | null>(null);

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );

    const [items, setItems] = useState<ItemRespaldoSupabase[]>([]);
    const [historial, setHistorial] = useState<HistorialRespaldoSupabase[]>([]);
    const [erroresLectura, setErroresLectura] = useState<string[]>([]);
    const [archivoNombre, setArchivoNombre] = useState("");
    const [respaldoImportado, setRespaldoImportado] =
        useState<RespaldoSistemaSupabase | null>(null);

    const [cargando, setCargando] = useState(true);
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState("");

    async function cargarEstado() {
        setCargando(true);
        setError("");

        try {
            let config = CONFIGURACION_PREDETERMINADA;

            try {
                config = await obtenerConfiguracionClinicaSupabase();
            } catch {
                config = obtenerConfiguracionClinica();
            }

            setConfiguracion(config);

            const resultado = await crearRespaldoSupabase(config.nombreClinica);

            setItems(resultado.respaldo.items);
            setHistorial(resultado.historial);
            setErroresLectura(resultado.errores);
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el estado de respaldo desde Supabase.";

            setError(mensaje);
            setItems([]);
            setHistorial([]);
            setErroresLectura([]);
        } finally {
            setCargando(false);
        }
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
        return tamanoBytesObjeto({
            tipo: "SISTEMA_CLINICO_RESPALDO_SUPABASE",
            items,
        });
    }, [items]);

    const itemsConDatos = items.filter((item) => item.registros > 0);

    const itemsSinDatos = items.filter((item) => item.registros === 0);

    const ultimoRespaldo = historial[0]?.creado_en || null;

    const registrosImportados =
        respaldoImportado?.items.reduce(
            (total, item) => total + contarRegistros(item.datos),
            0
        ) || 0;

    async function generarRespaldo() {
        setGenerando(true);
        setError("");

        try {
            const resultado = await crearRespaldoSupabase(
                configuracion.nombreClinica
            );
            const nombre = nombreArchivoRespaldoSupabase();
            const contenido = JSON.stringify(resultado.respaldo, null, 2);
            const tamano = new Blob([contenido]).size;

            descargarArchivo(nombre, contenido);

            try {
                const registro = await registrarHistorialRespaldoSupabase({
                    nombreArchivo: nombre,
                    totalModulos: resultado.respaldo.totalModulos,
                    totalRegistros: resultado.respaldo.totalRegistros,
                    tamanoBytes: tamano,
                });

                if (registro) {
                    setHistorial((actual) => [registro, ...actual]);
                }
            } catch (errorHistorial) {
                console.error(errorHistorial);
            }

            setItems(resultado.respaldo.items);
            setErroresLectura(resultado.errores);

            alert("Respaldo Supabase generado correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo generar el respaldo.";

            setError(mensaje);
            alert(mensaje);
        } finally {
            setGenerando(false);
        }
    }

    function seleccionarArchivo(event: ChangeEvent<HTMLInputElement>) {
        const archivo = event.target.files?.[0];

        if (!archivo) return;

        setArchivoNombre(archivo.name);

        const lector = new FileReader();

        lector.onload = () => {
            try {
                const contenido = String(lector.result || "");
                const datos = JSON.parse(contenido);
                const validacion = validarArchivoRespaldoSupabase(datos);

                if (!validacion.valido || !validacion.respaldo) {
                    alert(validacion.mensaje);
                    setRespaldoImportado(null);
                    return;
                }

                setRespaldoImportado(validacion.respaldo);
            } catch {
                alert("No se pudo leer el archivo. Verificá que sea un JSON válido.");
                setRespaldoImportado(null);
            }
        };

        lector.readAsText(archivo);
    }

    function limpiarArchivoImportado() {
        setRespaldoImportado(null);
        setArchivoNombre("");

        if (inputArchivoRef.current) {
            inputArchivoRef.current.value = "";
        }
    }

    return (
        <AppShell
            titulo="Respaldo"
            descripcion="Copia de seguridad JSON desde la base de datos real de Supabase"
            moduloActivo="Respaldo"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo procesar Respaldo
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {erroresLectura.length > 0 && (
                <section className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Algunas tablas no devolvieron datos
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                El respaldo se puede generar con las tablas disponibles. Esto puede pasar si una tabla todavía no existe o si no tiene permisos.
                            </p>

                            <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-black text-amber-800">
                                    Ver detalle técnico
                                </summary>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
                                    {erroresLectura.slice(0, 10).map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </details>
                        </div>
                    </div>
                </section>
            )}

            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
                        Respaldo conectado a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Genera una copia JSON de las tablas reales de la clínica. No depende de localStorage.
                    </p>
                </div>

                <button
                    onClick={cargarEstado}
                    disabled={cargando || generando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    {cargando ? "Cargando..." : "Recargar estado"}
                </button>
            </section>

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
                            Descarga un archivo JSON con la información actual de Supabase:
                            pacientes, agenda, caja, gastos, inventario, proveedores, documentos,
                            odontograma, presupuestos, órdenes de estudio, auditoría y configuración.
                        </p>

                        <button
                            onClick={generarRespaldo}
                            disabled={cargando || generando}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-teal-500/20 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Download className="h-5 w-5" />
                            {generando ? "Generando respaldo..." : "Descargar respaldo JSON"}
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
                                        Verificar respaldo
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Lee un JSON generado por este módulo
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
                                    Debe ser un respaldo Supabase del Sistema Clínico
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
                                                Módulos incluidos:{" "}
                                                <strong>{respaldoImportado.totalModulos}</strong>
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
                                    Restauración automática desactivada
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-red-700">
                                    Este módulo genera y verifica respaldos reales de Supabase. No reemplaza datos automáticamente para evitar borrar o duplicar información clínica por accidente.
                                </p>
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
                                        Estado de datos Supabase
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Tablas incluidas en el respaldo
                                    </p>
                                </div>

                                <button
                                    onClick={cargarEstado}
                                    disabled={cargando || generando}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                                    Recargar
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[880px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {itemsConDatos.map((item) => (
                                    <div
                                        key={item.tabla}
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
                                                    {item.modulo} · {item.tabla}
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
                                                            {formatoBytes(tamanoBytesObjeto(item.datos))}
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
                                            {cargando ? "Cargando datos..." : "No hay datos disponibles"}
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {cargando
                                                ? "Consultando Supabase."
                                                : "Cuando registres información, aparecerá aquí."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h3 className="text-[16px] font-bold text-slate-800">
                                Historial de respaldos
                            </h3>
                            <p className="mono mt-0.5 text-[10px] text-slate-400">
                                Últimos respaldos registrados en Supabase
                            </p>
                        </div>

                        <div className="max-h-[320px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {historial.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl bg-slate-50 p-4"
                                    >
                                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <p className="text-sm font-black text-slate-800">
                                                    {item.nombre_archivo}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {fechaLegible(item.creado_en)} · {item.usuario_nombre}
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                                                {formatoBytes(item.tamano_bytes)}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-xs text-slate-500">
                                            {item.total_modulos} módulo(s), {item.total_registros} registro(s)
                                        </p>
                                    </div>
                                ))}

                                {historial.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                        <Clock className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-3 text-xs text-slate-400">
                                            Todavía no hay respaldos registrados.
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
                                    Tablas sin datos
                                </h3>
                                <p className="mono mt-0.5 text-[10px] text-slate-400">
                                    Se incluirán en el respaldo como vacías
                                </p>
                            </div>

                            <div className="grid gap-2 p-4 md:grid-cols-2">
                                {itemsSinDatos.map((item) => (
                                    <div
                                        key={item.tabla}
                                        className="rounded-2xl bg-slate-50 px-4 py-3"
                                    >
                                        <p className="text-xs font-black text-slate-700">
                                            {item.nombre}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                            {item.modulo} · {item.tabla}
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
                            Este respaldo es una copia JSON de datos de Supabase. Los archivos físicos de Supabase Storage, como imágenes o PDFs de documentos, no se descargan dentro del JSON; sí se respaldan sus metadatos.
                        </p>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}