import { crearClienteSupabase } from "@/lib/supabase/client";
import { obtenerPerfilActual } from "@/lib/supabase/perfil";

export type CaraDentalSupabase = "sup" | "der" | "inf" | "izq" | "centro";
export type DenticionSupabase = "Permanente" | "Temporal";

export type EstadoDentalSupabase =
    | "Sano"
    | "Caries"
    | "Resina"
    | "Corona"
    | "Ausente"
    | "Extracción"
    | "Endodoncia"
    | "Implante"
    | "Fractura"
    | "Sellante"
    | "Observación";

export type CarasDentalesSupabase = Record<CaraDentalSupabase, EstadoDentalSupabase>;

export type PiezaDentalSupabase = {
    codigo: string;
    numeroLegacy: number;
    nombre: string;
    tipo: "Incisivo" | "Canino" | "Premolar" | "Molar";
    arcada: "Superior" | "Inferior";
    cuadrante: string;
    denticion: DenticionSupabase;
    caras: CarasDentalesSupabase;
    nota: string;
    actualizadoEn: string;
};

export type HistorialOdontogramaSupabase = {
    id: string;
    fecha: string;
    hora: string;
    piezaCodigo: string;
    piezaNumeroLegacy?: number;
    cara: CaraDentalSupabase | "todas";
    estado: EstadoDentalSupabase;
    nota: string;
    usuarioNombre: string;
};

export type OdontogramaPacienteSupabase = {
    pacienteId: string;
    actualizadoEn: string;
    piezas: PiezaDentalSupabase[];
    historial: HistorialOdontogramaSupabase[];
};

type OdontogramaRow = {
    id: string;
    clinica_id: string;
    paciente_id: string;
    actualizado_texto: string;
};

type PiezaRow = {
    codigo: string;
    numero_legacy: number;
    nombre: string;
    tipo: "Incisivo" | "Canino" | "Premolar" | "Molar";
    arcada: "Superior" | "Inferior";
    cuadrante: string;
    denticion: DenticionSupabase;
    cara_sup: EstadoDentalSupabase;
    cara_der: EstadoDentalSupabase;
    cara_inf: EstadoDentalSupabase;
    cara_izq: EstadoDentalSupabase;
    cara_centro: EstadoDentalSupabase;
    nota: string;
    actualizado_texto: string;
};

type HistorialRow = {
    id: string;
    codigo_local: string;
    fecha: string;
    hora: string;
    pieza_codigo: string;
    pieza_numero_legacy: number | null;
    cara: CaraDentalSupabase | "todas";
    estado: EstadoDentalSupabase;
    nota: string;
    usuario_nombre: string;
};

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

function horaCorta(valor: unknown) {
    return String(valor || "").slice(0, 5);
}

function convertirPieza(row: PiezaRow): PiezaDentalSupabase {
    return {
        codigo: row.codigo,
        numeroLegacy: row.numero_legacy,
        nombre: row.nombre,
        tipo: row.tipo,
        arcada: row.arcada,
        cuadrante: row.cuadrante,
        denticion: row.denticion,
        caras: {
            sup: row.cara_sup,
            der: row.cara_der,
            inf: row.cara_inf,
            izq: row.cara_izq,
            centro: row.cara_centro,
        },
        nota: row.nota || "",
        actualizadoEn: row.actualizado_texto || "",
    };
}

function convertirHistorial(row: HistorialRow): HistorialOdontogramaSupabase {
    return {
        id: row.codigo_local || row.id,
        fecha: row.fecha,
        hora: horaCorta(row.hora),
        piezaCodigo: row.pieza_codigo,
        piezaNumeroLegacy: row.pieza_numero_legacy || undefined,
        cara: row.cara,
        estado: row.estado,
        nota: row.nota || "",
        usuarioNombre: row.usuario_nombre || "Usuario no identificado",
    };
}

export async function obtenerOdontogramaSupabase(pacienteId: string) {
    const supabase = crearClienteSupabase();
    const { clinicaId } = await obtenerContextoClinica();

    const { data: odontogramaData, error: errorOdontograma } = await supabase
        .from("odontogramas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("paciente_id", pacienteId)
        .maybeSingle();

    if (errorOdontograma) throw new Error(errorOdontograma.message);

    if (!odontogramaData) return null;

    const odontograma = odontogramaData as OdontogramaRow;

    const [{ data: piezasData, error: errorPiezas }, { data: historialData, error: errorHistorial }] =
        await Promise.all([
            supabase
                .from("odontograma_piezas")
                .select("*")
                .eq("odontograma_id", odontograma.id)
                .order("numero_legacy", { ascending: true }),
            supabase
                .from("odontograma_historial")
                .select("*")
                .eq("odontograma_id", odontograma.id)
                .order("creado_en", { ascending: false })
                .limit(200),
        ]);

    if (errorPiezas) throw new Error(errorPiezas.message);
    if (errorHistorial) throw new Error(errorHistorial.message);

    return {
        pacienteId: odontograma.paciente_id,
        actualizadoEn: odontograma.actualizado_texto || "",
        piezas: ((piezasData || []) as PiezaRow[]).map(convertirPieza),
        historial: ((historialData || []) as HistorialRow[]).map(convertirHistorial),
    } satisfies OdontogramaPacienteSupabase;
}

export async function guardarOdontogramaSupabase(
    odontograma: OdontogramaPacienteSupabase
) {
    const supabase = crearClienteSupabase();
    const { perfil, clinicaId } = await obtenerContextoClinica();

    const pacienteId = odontograma.pacienteId;

    if (!pacienteId) {
        throw new Error("No se recibió el paciente del odontograma.");
    }

    const { data: odontogramaData, error: errorUpsert } = await supabase
        .from("odontogramas")
        .upsert(
            {
                clinica_id: clinicaId,
                paciente_id: pacienteId,
                actualizado_texto: odontograma.actualizadoEn || "",
                creado_por: perfil.id,
            },
            { onConflict: "paciente_id" }
        )
        .select("*")
        .single();

    if (errorUpsert) throw new Error(errorUpsert.message);

    const odontogramaId = (odontogramaData as OdontogramaRow).id;

    const { error: errorDeletePiezas } = await supabase
        .from("odontograma_piezas")
        .delete()
        .eq("odontograma_id", odontogramaId);

    if (errorDeletePiezas) throw new Error(errorDeletePiezas.message);

    const piezasInsertar = odontograma.piezas.map((pieza) => ({
        odontograma_id: odontogramaId,
        clinica_id: clinicaId,
        paciente_id: pacienteId,
        codigo: pieza.codigo,
        numero_legacy: pieza.numeroLegacy,
        nombre: pieza.nombre,
        tipo: pieza.tipo,
        arcada: pieza.arcada,
        cuadrante: pieza.cuadrante,
        denticion: pieza.denticion,
        cara_sup: pieza.caras.sup,
        cara_der: pieza.caras.der,
        cara_inf: pieza.caras.inf,
        cara_izq: pieza.caras.izq,
        cara_centro: pieza.caras.centro,
        nota: pieza.nota || "",
        actualizado_texto: pieza.actualizadoEn || "",
    }));

    if (piezasInsertar.length > 0) {
        const { error: errorInsertPiezas } = await supabase
            .from("odontograma_piezas")
            .insert(piezasInsertar);

        if (errorInsertPiezas) throw new Error(errorInsertPiezas.message);
    }

    const { error: errorDeleteHistorial } = await supabase
        .from("odontograma_historial")
        .delete()
        .eq("odontograma_id", odontogramaId);

    if (errorDeleteHistorial) throw new Error(errorDeleteHistorial.message);

    const historialInsertar = odontograma.historial.slice(0, 200).map((item) => ({
        odontograma_id: odontogramaId,
        clinica_id: clinicaId,
        paciente_id: pacienteId,
        codigo_local: item.id,
        fecha: item.fecha,
        hora: item.hora,
        pieza_codigo: item.piezaCodigo,
        pieza_numero_legacy: item.piezaNumeroLegacy || null,
        cara: item.cara,
        estado: item.estado,
        nota: item.nota || "",
        usuario_nombre: item.usuarioNombre || "Usuario no identificado",
    }));

    if (historialInsertar.length > 0) {
        const { error: errorInsertHistorial } = await supabase
            .from("odontograma_historial")
            .insert(historialInsertar);

        if (errorInsertHistorial) throw new Error(errorInsertHistorial.message);
    }

    return obtenerOdontogramaSupabase(pacienteId);
}