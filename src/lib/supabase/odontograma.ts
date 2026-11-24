import { crearClienteSupabase } from "@/lib/supabase/client";
import { ejecutarOperacionClinica } from "@/lib/supabase/operaciones";

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
    version?: number;
    actualizadoEn: string;
    piezas: PiezaDentalSupabase[];
    historial: HistorialOdontogramaSupabase[];
};

type OdontogramaRow = {
    id: string;
    clinica_id: string;
    paciente_id: string;
    actualizado_texto: string;
    version: number;
    piezas: PiezaRow[];
    historial: HistorialRow[];
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
    const { data, error } = await crearClienteSupabase().rpc("obtener_odontograma_completo", { p_paciente_id: pacienteId });
    if (error) throw new Error(error.message);
    if (!data) return null;
    const odontograma = data as OdontogramaRow;
    return {
        pacienteId: odontograma.paciente_id, version: odontograma.version,
        actualizadoEn: odontograma.actualizado_texto || "",
        piezas: odontograma.piezas.map(convertirPieza),
        historial: odontograma.historial.map(convertirHistorial),
    } satisfies OdontogramaPacienteSupabase;
}

export async function guardarOdontogramaSupabase(odontograma: OdontogramaPacienteSupabase) {
    await ejecutarOperacionClinica<{ id: string; version: number }>("odontograma.guardar", {
        ...odontograma, version: odontograma.version ?? 0,
    });
    return obtenerOdontogramaSupabase(odontograma.pacienteId);
}
