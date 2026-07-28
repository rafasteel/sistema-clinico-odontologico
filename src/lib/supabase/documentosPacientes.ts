import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export const BUCKET_DOCUMENTOS_PACIENTES = "documentos-pacientes";

export type CategoriaDocumentoPacienteSupabase =
    | "Cédula / identificación"
    | "Radiografía"
    | "Consentimiento firmado"
    | "Examen / estudio"
    | "Fotografía clínica"
    | "Receta externa"
    | "Documento administrativo"
    | "Otro";

export type DocumentoPacienteSupabase = {
    id: string;
    clinica_id: string;
    paciente_id: string;

    paciente_nombre: string;
    fecha: string;
    hora: string;

    nombre_archivo: string;
    tipo_archivo: string;
    tamano_bytes: number;
    categoria: CategoriaDocumentoPacienteSupabase;
    descripcion: string;

    storage_bucket: string;
    storage_path: string;

    usuario_nombre: string;
    creado_por: string | null;
    creado_en: string;
    actualizado_en: string;

    url_firmada?: string;
};

export type FormularioDocumentoPacienteSupabase = {
    paciente_id: string;
    archivo: File;
    categoria: CategoriaDocumentoPacienteSupabase;
    descripcion?: string;
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

function limpiarTexto(valor: unknown, respaldo = "") {
    const convertido = String(valor ?? "").trim();

    return convertido || respaldo;
}

function limpiarNombreArchivo(nombre: string) {
    const partes = nombre.split(".");
    const extension = partes.length > 1 ? partes.pop() : "";
    const base = partes.join(".") || "archivo";

    const limpio = base
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
        .slice(0, 80);

    return `${limpio || "archivo"}${extension ? `.${extension.toLowerCase()}` : ""}`;
}

async function obtenerContextoClinica() {
    const { perfil, error } = await obtenerPerfilActual();

    if (error || !perfil) {
        throw new Error("No se encontró el perfil activo del usuario.");
    }

    if (!perfil.clinica_id) {
        throw new Error("Este usuario no tiene clínica asignada.");
    }

    return {
        perfil,
        clinicaId: perfil.clinica_id,
    };
}

async function obtenerNombrePaciente(pacienteId: string) {
    const supabase = crearClienteSupabase();

    const { data, error } = await supabase
        .from("pacientes")
        .select("nombre")
        .eq("id", pacienteId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return limpiarTexto(data?.nombre, "Paciente no especificado");
}

async function agregarUrlFirmada(documento: DocumentoPacienteSupabase) {
    const supabase = crearClienteSupabase();

    const { data } = await supabase.storage
        .from(documento.storage_bucket || BUCKET_DOCUMENTOS_PACIENTES)
        .createSignedUrl(documento.storage_path, 60 * 60);

    return {
        ...documento,
        url_firmada: data?.signedUrl || "",
    };
}

async function agregarUrlsFirmadas(documentos: DocumentoPacienteSupabase[]) {
    return Promise.all(documentos.map(agregarUrlFirmada));
}

export async function listarDocumentosPacienteSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("documentos_pacientes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return agregarUrlsFirmadas((data || []) as DocumentoPacienteSupabase[]);
}

export async function listarDocumentosSupabase() {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("documentos_pacientes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

    if (error) throw new Error(error.message);

    return agregarUrlsFirmadas((data || []) as DocumentoPacienteSupabase[]);
}

export async function obtenerDocumentoPacienteSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data, error } = await supabase
        .from("documentos_pacientes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("id", id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return agregarUrlFirmada(data as DocumentoPacienteSupabase);
}

export async function obtenerUrlDocumentoPacienteSupabase(id: string) {
    const documento = await obtenerDocumentoPacienteSupabase(id);

    if (!documento) {
        throw new Error("No se encontró el documento.");
    }

    if (!documento.url_firmada) {
        throw new Error("No se pudo generar el enlace temporal del documento.");
    }

    return documento.url_firmada;
}

export async function subirDocumentoPacienteSupabase(
    formulario: FormularioDocumentoPacienteSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const pacienteId = limpiarTexto(formulario.paciente_id);

    if (!pacienteId) {
        throw new Error("No se recibió el paciente para el documento.");
    }

    if (!formulario.archivo) {
        throw new Error("Seleccioná un archivo para adjuntar.");
    }

    const limiteMb = 10;
    const limiteBytes = limiteMb * 1024 * 1024;

    if (formulario.archivo.size > limiteBytes) {
        throw new Error(`El archivo es muy pesado. Usá archivos menores a ${limiteMb} MB.`);
    }

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (
        formulario.archivo.type &&
        !tiposPermitidos.includes(formulario.archivo.type)
    ) {
        throw new Error(
            "Tipo de archivo no permitido. Usá PDF, JPG, PNG, WEBP, DOC o DOCX."
        );
    }

    const pacienteNombre = await obtenerNombrePaciente(pacienteId);
    const nombreLimpio = limpiarNombreArchivo(formulario.archivo.name);
    const storagePath = `${clinicaId}/${pacienteId}/${crypto.randomUUID()}-${nombreLimpio}`;

    const { error: errorUpload } = await supabase.storage
        .from(BUCKET_DOCUMENTOS_PACIENTES)
        .upload(storagePath, formulario.archivo, {
            cacheControl: "3600",
            upsert: false,
            contentType: formulario.archivo.type || "application/octet-stream",
        });

    if (errorUpload) throw new Error(errorUpload.message);

    const { data: documentoData, error: errorInsert } = await supabase
        .from("documentos_pacientes")
        .insert({
            clinica_id: clinicaId,
            paciente_id: pacienteId,
            paciente_nombre: pacienteNombre,
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            nombre_archivo: formulario.archivo.name,
            tipo_archivo:
                formulario.archivo.type || "application/octet-stream",
            tamano_bytes: formulario.archivo.size,
            categoria: formulario.categoria,
            descripcion: limpiarTexto(formulario.descripcion),
            storage_bucket: BUCKET_DOCUMENTOS_PACIENTES,
            storage_path: storagePath,
            usuario_nombre: limpiarTexto(perfil.nombre, "Usuario no identificado"),
            creado_por: perfil.id,
        })
        .select("*")
        .single();

    if (errorInsert) {
        await supabase.storage.from(BUCKET_DOCUMENTOS_PACIENTES).remove([storagePath]);
        throw new Error(errorInsert.message);
    }

    return agregarUrlFirmada(documentoData as DocumentoPacienteSupabase);
}

export async function eliminarDocumentoPacienteSupabase(id: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data: documentoData, error: errorSelect } = await supabase
        .from("documentos_pacientes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("id", id)
        .maybeSingle();

    if (errorSelect) throw new Error(errorSelect.message);
    if (!documentoData) return;

    const documento = documentoData as DocumentoPacienteSupabase;

    const { error: errorStorage } = await supabase.storage
        .from(documento.storage_bucket || BUCKET_DOCUMENTOS_PACIENTES)
        .remove([documento.storage_path]);

    if (errorStorage) throw new Error(errorStorage.message);

    const { error: errorDelete } = await supabase
        .from("documentos_pacientes")
        .delete()
        .eq("clinica_id", clinicaId)
        .eq("id", id);

    if (errorDelete) throw new Error(errorDelete.message);
}