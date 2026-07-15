"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Download,
    Eye,
    FileText,
    ImageIcon,
    Paperclip,
    Plus,
    Save,
    Search,
    ShieldAlert,
    Trash2,
    Upload,
    UserRound,
    XCircle,
    ClipboardList,
} from "lucide-react";
import AppShell from "@/components/AppShell";

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
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

type CategoriaDocumento =
    | "Cédula / identificación"
    | "Radiografía"
    | "Consentimiento firmado"
    | "Examen / estudio"
    | "Fotografía clínica"
    | "Receta externa"
    | "Documento administrativo"
    | "Otro";

type DocumentoPaciente = {
    id: string;
    pacienteId: string;
    pacienteNombre: string;
    fecha: string;
    hora: string;
    nombreArchivo: string;
    tipoArchivo: string;
    tamanoBytes: number;
    categoria: CategoriaDocumento;
    descripcion: string;
    dataUrl: string;
    usuarioNombre: string;
};

type FormularioDocumento = {
    categoria: CategoriaDocumento;
    descripcion: string;
};

const PACIENTES_KEY = "pacientes_sistema_clinico";
const DOCUMENTOS_KEY = "documentos_pacientes_sistema_clinico";
const USUARIO_KEY = "usuario_sistema_clinico";

const formularioVacio: FormularioDocumento = {
    categoria: "Otro",
    descripcion: "",
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

function guardarLocalStorage<T>(clave: string, valor: T) {
    if (typeof window === "undefined") return;
    localStorage.setItem(clave, JSON.stringify(valor));
}

function fechaLegible(fecha: string) {
    if (!fecha) return "No registrada";

    const partes = fecha.split("-");
    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatoTamano(bytes: number) {
    if (!bytes) return "0 KB";

    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
}

function esImagen(tipo: string) {
    return tipo.startsWith("image/");
}

function esPdf(tipo: string) {
    return tipo === "application/pdf";
}

function iconoDocumento(tipo: string) {
    if (esImagen(tipo)) {
        return <ImageIcon className="h-5 w-5 text-blue-700" />;
    }

    return <FileText className="h-5 w-5 text-slate-700" />;
}

function colorCategoria(categoria: CategoriaDocumento) {
    if (categoria === "Radiografía") return "bg-indigo-50 text-indigo-700";
    if (categoria === "Consentimiento firmado") return "bg-emerald-50 text-emerald-700";
    if (categoria === "Cédula / identificación") return "bg-blue-50 text-blue-700";
    if (categoria === "Fotografía clínica") return "bg-purple-50 text-purple-700";
    if (categoria === "Examen / estudio") return "bg-amber-50 text-amber-700";

    return "bg-slate-100 text-slate-600";
}

export default function DocumentosPacientePage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);
    const [formulario, setFormulario] =
        useState<FormularioDocumento>(formularioVacio);
    const [archivo, setArchivo] = useState<File | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [categoriaFiltro, setCategoriaFiltro] = useState<"Todas" | CategoriaDocumento>(
        "Todas"
    );
    const [subiendo, setSubiendo] = useState(false);

    useEffect(() => {
        const pacientes = leerLocalStorage<Paciente[]>(PACIENTES_KEY, []);
        const documentosGuardados = leerLocalStorage<DocumentoPaciente[]>(
            DOCUMENTOS_KEY,
            []
        );
        const usuarioGuardado = leerLocalStorage<UsuarioSistema | null>(
            USUARIO_KEY,
            null
        );

        setPaciente(pacientes.find((item) => item.id === pacienteId) || null);
        setDocumentos(documentosGuardados);
        setUsuario(usuarioGuardado);
    }, [pacienteId]);

    function actualizarCampo<K extends keyof FormularioDocumento>(
        campo: K,
        valor: FormularioDocumento[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function seleccionarArchivo(event: ChangeEvent<HTMLInputElement>) {
        const archivoSeleccionado = event.target.files?.[0] || null;

        if (!archivoSeleccionado) {
            setArchivo(null);
            return;
        }

        const limiteMb = 2.5;
        const limiteBytes = limiteMb * 1024 * 1024;

        if (archivoSeleccionado.size > limiteBytes) {
            alert(`El archivo es muy pesado. Usá archivos menores a ${limiteMb} MB.`);
            event.target.value = "";
            setArchivo(null);
            return;
        }

        setArchivo(archivoSeleccionado);
    }

    function convertirArchivoADataUrl(file: File) {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                resolve(String(reader.result || ""));
            };

            reader.onerror = () => {
                reject(new Error("No se pudo leer el archivo."));
            };

            reader.readAsDataURL(file);
        });
    }

    async function guardarDocumento(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!paciente) return;

        if (!archivo) {
            alert("Seleccioná un archivo para adjuntar.");
            return;
        }

        setSubiendo(true);

        try {
            const dataUrl = await convertirArchivoADataUrl(archivo);

            const nuevoDocumento: DocumentoPaciente = {
                id: `DOC-${Date.now()}`,
                pacienteId: paciente.id,
                pacienteNombre: paciente.nombre,
                fecha: fechaHoyLocal(),
                hora: horaActualLocal(),
                nombreArchivo: archivo.name,
                tipoArchivo: archivo.type || "application/octet-stream",
                tamanoBytes: archivo.size,
                categoria: formulario.categoria,
                descripcion: formulario.descripcion.trim(),
                dataUrl,
                usuarioNombre: usuario?.nombre || "Usuario no identificado",
            };

            const nuevaLista = [nuevoDocumento, ...documentos];

            setDocumentos(nuevaLista);
            guardarLocalStorage(DOCUMENTOS_KEY, nuevaLista);

            setArchivo(null);
            setFormulario(formularioVacio);

            const input = document.getElementById("archivo-documento") as HTMLInputElement | null;
            if (input) input.value = "";

            alert("Documento adjuntado correctamente.");
        } catch {
            alert("No se pudo guardar el archivo. Intentá con un archivo más liviano.");
        } finally {
            setSubiendo(false);
        }
    }

    function eliminarDocumento(id: string) {
        const confirmar = window.confirm("¿Seguro que deseas eliminar este documento?");
        if (!confirmar) return;

        const nuevaLista = documentos.filter((documento) => documento.id !== id);

        setDocumentos(nuevaLista);
        guardarLocalStorage(DOCUMENTOS_KEY, nuevaLista);
    }

    function abrirDocumento(documento: DocumentoPaciente) {
        const nuevaVentana = window.open();
        if (!nuevaVentana) {
            alert("El navegador bloqueó la ventana emergente.");
            return;
        }

        nuevaVentana.document.write(`
      <html>
        <head>
          <title>${documento.nombreArchivo}</title>
          <style>
            body {
              margin: 0;
              background: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            img {
              max-width: 96vw;
              max-height: 96vh;
              border-radius: 18px;
              background: white;
            }
            iframe {
              width: 100vw;
              height: 100vh;
              border: none;
              background: white;
            }
            .box {
              background: white;
              padding: 28px;
              border-radius: 24px;
              text-align: center;
              max-width: 520px;
            }
            a {
              display: inline-block;
              margin-top: 16px;
              background: #0f172a;
              color: white;
              padding: 12px 18px;
              border-radius: 14px;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${esImagen(documento.tipoArchivo)
                ? `<img src="${documento.dataUrl}" alt="${documento.nombreArchivo}" />`
                : esPdf(documento.tipoArchivo)
                    ? `<iframe src="${documento.dataUrl}"></iframe>`
                    : `<div class="box">
                  <h2>Vista previa no disponible</h2>
                  <p>Este tipo de archivo no se puede previsualizar aquí.</p>
                  <a href="${documento.dataUrl}" download="${documento.nombreArchivo}">Descargar archivo</a>
                </div>`
            }
        </body>
      </html>
    `);

        nuevaVentana.document.close();
    }

    const documentosPaciente = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return documentos
            .filter((documento) => documento.pacienteId === pacienteId)
            .filter((documento) => {
                const coincideTexto =
                    !texto ||
                    documento.nombreArchivo.toLowerCase().includes(texto) ||
                    documento.descripcion.toLowerCase().includes(texto) ||
                    documento.categoria.toLowerCase().includes(texto);

                const coincideCategoria =
                    categoriaFiltro === "Todas" || documento.categoria === categoriaFiltro;

                return coincideTexto && coincideCategoria;
            })
            .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
    }, [documentos, pacienteId, busqueda, categoriaFiltro]);

    const totalDocumentosPaciente = documentos.filter(
        (documento) => documento.pacienteId === pacienteId
    ).length;

    const totalRadiografias = documentos.filter(
        (documento) =>
            documento.pacienteId === pacienteId && documento.categoria === "Radiografía"
    ).length;

    const totalImagenes = documentos.filter(
        (documento) => documento.pacienteId === pacienteId && esImagen(documento.tipoArchivo)
    ).length;

    const totalPdfs = documentos.filter(
        (documento) => documento.pacienteId === pacienteId && esPdf(documento.tipoArchivo)
    ).length;

    if (!paciente) {
        return (
            <AppShell
                titulo="Documentos del paciente"
                descripcion="No se encontró el paciente solicitado"
                moduloActivo="Pacientes"
            >
                <section className="glass-card rounded-3xl p-10 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700">
                        <UserRound className="h-8 w-8" />
                    </div>

                    <h2 className="mt-5 text-2xl font-black text-slate-900">
                        Paciente no encontrado
                    </h2>

                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Puede que el paciente haya sido eliminado o que el enlace no sea válido.
                    </p>

                    <Link
                        href="/pacientes"
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a pacientes
                    </Link>
                </section>
            </AppShell>
        );
    }

    return (
        <AppShell
            titulo={`Documentos: ${paciente.nombre}`}
            descripcion="Adjuntos clínicos y administrativos del expediente"
            moduloActivo="Pacientes"
        >
            <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Link
                    href={`/pacientes/${paciente.id}`}
                    className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al perfil
                </Link>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/expediente/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-[12px] font-bold text-teal-700 hover:bg-teal-100"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Expediente
                    </Link>

                    <Link
                        href={`/ordenes-estudio/${paciente.id}`}
                        className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-[12px] font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                        <FileText className="h-4 w-4" />
                        Orden de estudio
                    </Link>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                            <Paperclip className="h-7 w-7 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">Documentos adjuntos</h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                            Guardá radiografías, fotografías clínicas, consentimientos firmados,
                            cédula, estudios y archivos administrativos del paciente.
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Paciente
                        </p>
                        <h3 className="mt-2 text-xl font-black">{paciente.nombre}</h3>
                        <p className="mt-1 text-xs text-white/50">
                            Cédula: {paciente.cedula || "No registrada"}
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Paperclip className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalDocumentosPaciente}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Documentos totales
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <FileText className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalRadiografias}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Radiografías
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <ImageIcon className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalImagenes}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Imágenes
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                        <FileText className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {totalPdfs}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        PDF guardados
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="glass-card overflow-hidden rounded-3xl">
                    <div className="border-b border-black/[0.04] px-6 py-5">
                        <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-teal-700" />
                            <h3 className="text-[18px] font-black text-slate-800">
                                Adjuntar documento
                            </h3>
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                            Recomendado: PDF, JPG, PNG o WEBP menores a 2.5 MB.
                        </p>
                    </div>

                    <form onSubmit={guardarDocumento} className="space-y-4 p-6">
                        <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                Archivo
                            </label>

                            <input
                                id="archivo-documento"
                                type="file"
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={seleccionarArchivo}
                                className="w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-600 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:border-teal-300"
                            />

                            {archivo && (
                                <div className="mt-3 rounded-2xl bg-teal-50 p-4">
                                    <p className="text-sm font-black text-teal-800">
                                        {archivo.name}
                                    </p>
                                    <p className="mt-1 text-xs text-teal-700">
                                        {archivo.type || "Tipo desconocido"} · {formatoTamano(archivo.size)}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                Categoría
                            </label>

                            <select
                                value={formulario.categoria}
                                onChange={(event) =>
                                    actualizarCampo(
                                        "categoria",
                                        event.target.value as CategoriaDocumento
                                    )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            >
                                <option>Cédula / identificación</option>
                                <option>Radiografía</option>
                                <option>Consentimiento firmado</option>
                                <option>Examen / estudio</option>
                                <option>Fotografía clínica</option>
                                <option>Receta externa</option>
                                <option>Documento administrativo</option>
                                <option>Otro</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                                Descripción
                            </label>

                            <textarea
                                value={formulario.descripcion}
                                onChange={(event) =>
                                    actualizarCampo("descripcion", event.target.value)
                                }
                                rows={4}
                                placeholder="Ejemplo: Radiografía panorámica inicial, consentimiento firmado, cédula del paciente..."
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            />
                        </div>

                        <button
                            disabled={subiendo}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {subiendo ? (
                                <>
                                    <Upload className="h-4 w-4 animate-pulse" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Guardar documento
                                </>
                            )}
                        </button>
                    </form>

                    <div className="border-t border-black/[0.04] bg-amber-50 p-5">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                            <div>
                                <h4 className="text-sm font-black text-amber-800">
                                    Nota técnica
                                </h4>
                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    Este guardado es temporal en el navegador. Más adelante lo
                                    pasaremos a Supabase Storage para hacerlo profesional y seguro.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card overflow-hidden rounded-3xl">
                    <div className="border-b border-black/[0.04] px-6 py-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Archivos del expediente
                                </h3>
                                <p className="mono mt-1 text-[10px] text-slate-400">
                                    {documentosPaciente.length} documento(s) encontrado(s)
                                </p>
                            </div>

                            <span className="flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                                <Paperclip className="h-3.5 w-3.5" />
                                Adjuntos
                            </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_190px]">
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                    value={busqueda}
                                    onChange={(event) => setBusqueda(event.target.value)}
                                    placeholder="Buscar documento..."
                                    className="w-full bg-transparent text-[13px] font-medium outline-none"
                                />
                            </div>

                            <select
                                value={categoriaFiltro}
                                onChange={(event) =>
                                    setCategoriaFiltro(
                                        event.target.value as "Todas" | CategoriaDocumento
                                    )
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                            >
                                <option>Todas</option>
                                <option>Cédula / identificación</option>
                                <option>Radiografía</option>
                                <option>Consentimiento firmado</option>
                                <option>Examen / estudio</option>
                                <option>Fotografía clínica</option>
                                <option>Receta externa</option>
                                <option>Documento administrativo</option>
                                <option>Otro</option>
                            </select>
                        </div>
                    </div>

                    <div className="max-h-[760px] overflow-y-auto p-4">
                        <div className="space-y-3">
                            {documentosPaciente.map((documento) => (
                                <div
                                    key={documento.id}
                                    className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="flex gap-3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                                                {iconoDocumento(documento.tipoArchivo)}
                                            </div>

                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-[10px] font-black ${colorCategoria(
                                                            documento.categoria
                                                        )}`}
                                                    >
                                                        {documento.categoria}
                                                    </span>

                                                    <span className="mono rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                        {fechaLegible(documento.fecha)} · {documento.hora}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 break-all text-sm font-black text-slate-800">
                                                    {documento.nombreArchivo}
                                                </h4>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {documento.tipoArchivo || "Tipo desconocido"} ·{" "}
                                                    {formatoTamano(documento.tamanoBytes)}
                                                </p>

                                                {documento.descripcion && (
                                                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                                                        {documento.descripcion}
                                                    </p>
                                                )}

                                                <p className="mt-2 text-[11px] font-bold text-slate-400">
                                                    Subido por: {documento.usuarioNombre}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => abrirDocumento(documento)}
                                                className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Ver
                                            </button>

                                            <a
                                                href={documento.dataUrl}
                                                download={documento.nombreArchivo}
                                                className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                Descargar
                                            </a>

                                            <button
                                                type="button"
                                                onClick={() => eliminarDocumento(documento.id)}
                                                className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {documentosPaciente.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                    <XCircle className="mx-auto h-10 w-10 text-slate-300" />
                                    <h4 className="mt-3 text-sm font-black text-slate-700">
                                        Sin documentos adjuntos
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Adjuntá radiografías, fotos clínicas, PDFs o documentos del
                                        paciente.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}