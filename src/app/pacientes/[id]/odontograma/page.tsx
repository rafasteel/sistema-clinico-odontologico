"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    CalendarPlus,
    CheckCircle2,
    CircleDot,
    FileText,
    HeartPulse,
    Info,
    RefreshCcw,
    Save,
    Sparkles,
    Stethoscope,
    BadgeDollarSign,
    ClipboardList,
    Plus,
    X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    obtenerConfiguracionClinica,
} from "@/lib/configuracionClinica";
import { obtenerConfiguracionClinicaSupabase } from "@/lib/supabase/configuracionClinica";
import { obtenerPacienteSupabase, type PacienteSupabase } from "@/lib/supabase/pacientes";
import {
    listarDoctoresSupabase,
    listarServiciosSupabase,
    type DoctorSupabase,
    type ServicioSupabase,
} from "@/lib/supabase/doctoresServicios";
import { crearCitasSupabase } from "@/lib/supabase/citas";
import { crearTratamientoSupabase } from "@/lib/supabase/perfilPaciente";
import { crearPresupuestoSupabase } from "@/lib/supabase/presupuestos";
import {
    guardarOdontogramaSupabase,
    obtenerOdontogramaSupabase,
} from "@/lib/supabase/odontograma";

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

type UsuarioSistema = {
    usuario: string;
    nombre: string;
    rol: string;
};

type CaraDental = "sup" | "der" | "inf" | "izq" | "centro";

type EstadoDental =
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

type CarasDentales = Record<CaraDental, EstadoDental>;

type Denticion = "Permanente" | "Temporal";

type PiezaDental = {
    codigo: string;
    numeroLegacy: number;
    nombre: string;
    tipo: "Incisivo" | "Canino" | "Premolar" | "Molar";
    arcada: "Superior" | "Inferior";
    cuadrante: string;
    denticion: Denticion;
    caras: CarasDentales;
    nota: string;
    actualizadoEn: string;
};

type HistorialOdontograma = {
    id: string;
    fecha: string;
    hora: string;
    piezaCodigo: string;
    piezaNumeroLegacy?: number;
    cara: CaraDental | "todas";
    estado: EstadoDental;
    nota: string;
    usuarioNombre: string;
};

type OdontogramaPaciente = {
    pacienteId: string;
    version?: number;
    actualizadoEn: string;
    piezas: PiezaDental[];
    historial: HistorialOdontograma[];
};

type EstadoCita =
    | "Programada"
    | "Confirmada"
    | "En espera"
    | "En atención"
    | "Atendida"
    | "Cobrada"
    | "Reagendada"
    | "Cancelada"
    | "No asistió";

type DoctorAgenda = {
    id: string;
    nombre: string;
    especialidad: string;
    telefono: string;
    correo: string;
    horario: string;
    estado: "Activo" | "Inactivo";
};

type ServicioAgenda = {
    id: string;
    nombre: string;
    categoria: string;
    duracionMinutos: number;
    precio: number;
    descripcion: string;
    estado: "Activo" | "Inactivo";
};

type FormularioCitaTratamiento = {
    doctorId: string;
    servicioId: string;
    servicioNombre: string;
    fecha: string;
    hora: string;
    costo: string;
    observaciones: string;
};

type TratamientoPendienteAgenda = {
    tratamientoId: string;
    presupuestoId: string;
    nombreTratamiento: string;
    descripcion: string;
    total: number;
    piezaCodigo: string;
    cara: CaraDental;
    estadoDental: EstadoDental;
};

type OdontogramaLegacy = {
    pacienteId?: string;
    version?: number;
    actualizadoEn?: string;
    piezas?: {
        numero?: number;
        codigo?: string;
        denticion?: Denticion;
        caras?: Partial<Record<CaraDental, EstadoDental>>;
        nota?: string;
        actualizadoEn?: string;
    }[];
    historial?: {
        id?: string;
        fecha?: string;
        hora?: string;
        piezaNumero?: number;
        piezaCodigo?: string;
        cara?: CaraDental | "todas";
        estado?: EstadoDental;
        nota?: string;
        usuarioNombre?: string;
    }[];
};

const formularioCitaVacio: FormularioCitaTratamiento = {
    doctorId: "",
    servicioId: "",
    servicioNombre: "",
    fecha: "",
    hora: "",
    costo: "0",
    observaciones: "",
};

const PROCEDIMIENTOS_SUGERIDOS: Record<
    EstadoDental,
    { nombre: string; descripcion: string; costo: number }
> = {
    Sano: {
        nombre: "Evaluación odontológica",
        descripcion: "Revisión clínica preventiva de pieza dental.",
        costo: 0,
    },
    Caries: {
        nombre: "Restauración por caries",
        descripcion: "Restauración dental indicada por hallazgo de caries.",
        costo: 1200,
    },
    Resina: {
        nombre: "Control de resina",
        descripcion: "Evaluación o reparación de restauración con resina.",
        costo: 900,
    },
    Corona: {
        nombre: "Corona dental",
        descripcion: "Tratamiento protésico con corona dental.",
        costo: 8500,
    },
    Ausente: {
        nombre: "Reposición de pieza ausente",
        descripcion: "Evaluación para prótesis, puente o implante.",
        costo: 0,
    },
    Extracción: {
        nombre: "Extracción dental",
        descripcion: "Extracción indicada desde odontograma.",
        costo: 1500,
    },
    Endodoncia: {
        nombre: "Endodoncia",
        descripcion: "Tratamiento de conducto indicado para la pieza.",
        costo: 5500,
    },
    Implante: {
        nombre: "Implante dental",
        descripcion: "Planificación de implante dental.",
        costo: 18000,
    },
    Fractura: {
        nombre: "Reconstrucción dental",
        descripcion: "Tratamiento por fractura dental.",
        costo: 2500,
    },
    Sellante: {
        nombre: "Sellante dental",
        descripcion: "Aplicación de sellante preventivo.",
        costo: 700,
    },
    Observación: {
        nombre: "Seguimiento clínico",
        descripcion: "Control o seguimiento de pieza en observación.",
        costo: 0,
    },
};

const CARAS_LABELS: Record<CaraDental, string> = {
    sup: "Superior",
    der: "Derecha",
    inf: "Inferior",
    izq: "Izquierda",
    centro: "Oclusal / Centro",
};

const FDI_PIEZAS: Omit<PiezaDental, "caras" | "nota" | "actualizadoEn">[] = [
    { codigo: "18", numeroLegacy: 1, nombre: "Tercer molar superior derecho", tipo: "Molar", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Permanente" },
    { codigo: "17", numeroLegacy: 2, nombre: "Segundo molar superior derecho", tipo: "Molar", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Permanente" },
    { codigo: "16", numeroLegacy: 3, nombre: "Primer molar superior derecho", tipo: "Molar", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Permanente" },
    { codigo: "15", numeroLegacy: 4, nombre: "Segundo premolar superior derecho", tipo: "Premolar", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Permanente" },
    { codigo: "14", numeroLegacy: 5, nombre: "Primer premolar superior derecho", tipo: "Premolar", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Permanente" },
    { codigo: "13", numeroLegacy: 6, nombre: "Canino superior derecho", tipo: "Canino", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Permanente" },
    { codigo: "12", numeroLegacy: 7, nombre: "Incisivo lateral superior derecho", tipo: "Incisivo", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Permanente" },
    { codigo: "11", numeroLegacy: 8, nombre: "Incisivo central superior derecho", tipo: "Incisivo", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Permanente" },
    { codigo: "21", numeroLegacy: 9, nombre: "Incisivo central superior izquierdo", tipo: "Incisivo", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Permanente" },
    { codigo: "22", numeroLegacy: 10, nombre: "Incisivo lateral superior izquierdo", tipo: "Incisivo", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Permanente" },
    { codigo: "23", numeroLegacy: 11, nombre: "Canino superior izquierdo", tipo: "Canino", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Permanente" },
    { codigo: "24", numeroLegacy: 12, nombre: "Primer premolar superior izquierdo", tipo: "Premolar", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Permanente" },
    { codigo: "25", numeroLegacy: 13, nombre: "Segundo premolar superior izquierdo", tipo: "Premolar", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Permanente" },
    { codigo: "26", numeroLegacy: 14, nombre: "Primer molar superior izquierdo", tipo: "Molar", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Permanente" },
    { codigo: "27", numeroLegacy: 15, nombre: "Segundo molar superior izquierdo", tipo: "Molar", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Permanente" },
    { codigo: "28", numeroLegacy: 16, nombre: "Tercer molar superior izquierdo", tipo: "Molar", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Permanente" },

    { codigo: "48", numeroLegacy: 17, nombre: "Tercer molar inferior derecho", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Permanente" },
    { codigo: "47", numeroLegacy: 18, nombre: "Segundo molar inferior derecho", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Permanente" },
    { codigo: "46", numeroLegacy: 19, nombre: "Primer molar inferior derecho", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Permanente" },
    { codigo: "45", numeroLegacy: 20, nombre: "Segundo premolar inferior derecho", tipo: "Premolar", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Permanente" },
    { codigo: "44", numeroLegacy: 21, nombre: "Primer premolar inferior derecho", tipo: "Premolar", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Permanente" },
    { codigo: "43", numeroLegacy: 22, nombre: "Canino inferior derecho", tipo: "Canino", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Permanente" },
    { codigo: "42", numeroLegacy: 23, nombre: "Incisivo lateral inferior derecho", tipo: "Incisivo", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Permanente" },
    { codigo: "41", numeroLegacy: 24, nombre: "Incisivo central inferior derecho", tipo: "Incisivo", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Permanente" },
    { codigo: "31", numeroLegacy: 25, nombre: "Incisivo central inferior izquierdo", tipo: "Incisivo", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Permanente" },
    { codigo: "32", numeroLegacy: 26, nombre: "Incisivo lateral inferior izquierdo", tipo: "Incisivo", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Permanente" },
    { codigo: "33", numeroLegacy: 27, nombre: "Canino inferior izquierdo", tipo: "Canino", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Permanente" },
    { codigo: "34", numeroLegacy: 28, nombre: "Primer premolar inferior izquierdo", tipo: "Premolar", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Permanente" },
    { codigo: "35", numeroLegacy: 29, nombre: "Segundo premolar inferior izquierdo", tipo: "Premolar", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Permanente" },
    { codigo: "36", numeroLegacy: 30, nombre: "Primer molar inferior izquierdo", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Permanente" },
    { codigo: "37", numeroLegacy: 31, nombre: "Segundo molar inferior izquierdo", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Permanente" },
    { codigo: "38", numeroLegacy: 32, nombre: "Tercer molar inferior izquierdo", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Permanente" },

    { codigo: "55", numeroLegacy: 33, nombre: "Segundo molar temporal superior derecho", tipo: "Molar", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Temporal" },
    { codigo: "54", numeroLegacy: 34, nombre: "Primer molar temporal superior derecho", tipo: "Molar", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Temporal" },
    { codigo: "53", numeroLegacy: 35, nombre: "Canino temporal superior derecho", tipo: "Canino", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Temporal" },
    { codigo: "52", numeroLegacy: 36, nombre: "Incisivo lateral temporal superior derecho", tipo: "Incisivo", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Temporal" },
    { codigo: "51", numeroLegacy: 37, nombre: "Incisivo central temporal superior derecho", tipo: "Incisivo", arcada: "Superior", cuadrante: "Superior derecho", denticion: "Temporal" },
    { codigo: "61", numeroLegacy: 38, nombre: "Incisivo central temporal superior izquierdo", tipo: "Incisivo", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Temporal" },
    { codigo: "62", numeroLegacy: 39, nombre: "Incisivo lateral temporal superior izquierdo", tipo: "Incisivo", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Temporal" },
    { codigo: "63", numeroLegacy: 40, nombre: "Canino temporal superior izquierdo", tipo: "Canino", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Temporal" },
    { codigo: "64", numeroLegacy: 41, nombre: "Primer molar temporal superior izquierdo", tipo: "Molar", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Temporal" },
    { codigo: "65", numeroLegacy: 42, nombre: "Segundo molar temporal superior izquierdo", tipo: "Molar", arcada: "Superior", cuadrante: "Superior izquierdo", denticion: "Temporal" },

    { codigo: "85", numeroLegacy: 43, nombre: "Segundo molar temporal inferior derecho", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Temporal" },
    { codigo: "84", numeroLegacy: 44, nombre: "Primer molar temporal inferior derecho", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Temporal" },
    { codigo: "83", numeroLegacy: 45, nombre: "Canino temporal inferior derecho", tipo: "Canino", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Temporal" },
    { codigo: "82", numeroLegacy: 46, nombre: "Incisivo lateral temporal inferior derecho", tipo: "Incisivo", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Temporal" },
    { codigo: "81", numeroLegacy: 47, nombre: "Incisivo central temporal inferior derecho", tipo: "Incisivo", arcada: "Inferior", cuadrante: "Inferior derecho", denticion: "Temporal" },
    { codigo: "71", numeroLegacy: 48, nombre: "Incisivo central temporal inferior izquierdo", tipo: "Incisivo", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Temporal" },
    { codigo: "72", numeroLegacy: 49, nombre: "Incisivo lateral temporal inferior izquierdo", tipo: "Incisivo", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Temporal" },
    { codigo: "73", numeroLegacy: 50, nombre: "Canino temporal inferior izquierdo", tipo: "Canino", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Temporal" },
    { codigo: "74", numeroLegacy: 51, nombre: "Primer molar temporal inferior izquierdo", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Temporal" },
    { codigo: "75", numeroLegacy: 52, nombre: "Segundo molar temporal inferior izquierdo", tipo: "Molar", arcada: "Inferior", cuadrante: "Inferior izquierdo", denticion: "Temporal" },
];

const ESTADOS_DENTALES: {
    valor: EstadoDental;
    etiqueta: string;
    fill: string;
    stroke: string;
    boton: string;
    descripcion: string;
}[] = [
        {
            valor: "Sano",
            etiqueta: "Sano",
            fill: "#dcfce7",
            stroke: "#86efac",
            boton: "bg-emerald-50 text-emerald-700 border-emerald-200",
            descripcion: "Pieza o cara sin hallazgos clínicos.",
        },
        {
            valor: "Caries",
            etiqueta: "Caries",
            fill: "#fee2e2",
            stroke: "#fca5a5",
            boton: "bg-red-50 text-red-700 border-red-200",
            descripcion: "Lesión cariosa visible.",
        },
        {
            valor: "Resina",
            etiqueta: "Resina",
            fill: "#dbeafe",
            stroke: "#93c5fd",
            boton: "bg-blue-50 text-blue-700 border-blue-200",
            descripcion: "Restauración con resina.",
        },
        {
            valor: "Corona",
            etiqueta: "Corona",
            fill: "#ede9fe",
            stroke: "#c4b5fd",
            boton: "bg-purple-50 text-purple-700 border-purple-200",
            descripcion: "Pieza con corona.",
        },
        {
            valor: "Ausente",
            etiqueta: "Ausente",
            fill: "#e2e8f0",
            stroke: "#94a3b8",
            boton: "bg-slate-100 text-slate-700 border-slate-200",
            descripcion: "Pieza ausente.",
        },
        {
            valor: "Extracción",
            etiqueta: "Extracción",
            fill: "#ffe4e6",
            stroke: "#fda4af",
            boton: "bg-rose-50 text-rose-700 border-rose-200",
            descripcion: "Extracción indicada o realizada.",
        },
        {
            valor: "Endodoncia",
            etiqueta: "Endodoncia",
            fill: "#fef3c7",
            stroke: "#fcd34d",
            boton: "bg-amber-50 text-amber-700 border-amber-200",
            descripcion: "Tratamiento endodóntico.",
        },
        {
            valor: "Implante",
            etiqueta: "Implante",
            fill: "#cffafe",
            stroke: "#67e8f9",
            boton: "bg-cyan-50 text-cyan-700 border-cyan-200",
            descripcion: "Pieza con implante.",
        },
        {
            valor: "Fractura",
            etiqueta: "Fractura",
            fill: "#ffedd5",
            stroke: "#fdba74",
            boton: "bg-orange-50 text-orange-700 border-orange-200",
            descripcion: "Fractura dental.",
        },
        {
            valor: "Sellante",
            etiqueta: "Sellante",
            fill: "#ecfccb",
            stroke: "#bef264",
            boton: "bg-lime-50 text-lime-700 border-lime-200",
            descripcion: "Sellante aplicado.",
        },
        {
            valor: "Observación",
            etiqueta: "Observación",
            fill: "#fef9c3",
            stroke: "#fde047",
            boton: "bg-yellow-50 text-yellow-700 border-yellow-200",
            descripcion: "Requiere seguimiento clínico.",
        },
    ];

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

function fechaHoraCompleta() {
    return `${fechaHoyLocal()} ${horaActualLocal()}`;
}

function numeroSeguro(valor: string) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}
function fechaLegible(fecha: string) {
    if (!fecha) return "No registrada";

    const partes = fecha.split("-");
    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function normalizarTexto(texto: string) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function colorEstado(estado: EstadoDental) {
    return (
        ESTADOS_DENTALES.find((item) => item.valor === estado) ||
        ESTADOS_DENTALES[0]
    );
}

function crearCarasVacias(): CarasDentales {
    return {
        sup: "Sano",
        der: "Sano",
        inf: "Sano",
        izq: "Sano",
        centro: "Sano",
    };
}

function estadoSeguro(valor: unknown): EstadoDental {
    const existe = ESTADOS_DENTALES.some((item) => item.valor === valor);

    return existe ? (valor as EstadoDental) : "Sano";
}

function inferirDenticionPorCodigo(codigo: string): Denticion {
    return ["5", "6", "7", "8"].includes(codigo.charAt(0))
        ? "Temporal"
        : "Permanente";
}

function crearPiezaBase(
    definicion: Omit<PiezaDental, "caras" | "nota" | "actualizadoEn">
): PiezaDental {
    return {
        ...definicion,
        denticion: definicion.denticion || inferirDenticionPorCodigo(definicion.codigo),
        caras: crearCarasVacias(),
        nota: "",
        actualizadoEn: "",
    };
}

function crearOdontogramaBase(pacienteId: string): OdontogramaPaciente {
    return {
        pacienteId,
        actualizadoEn: "",
        piezas: FDI_PIEZAS.map(crearPiezaBase),
        historial: [],
    };
}

function normalizarOdontograma(
    pacienteId: string,
    odontograma?: OdontogramaLegacy | null
): OdontogramaPaciente {
    const base = crearOdontogramaBase(pacienteId);

    if (!odontograma) return base;

    const piezasLegacy = odontograma.piezas || [];

    const piezasNormalizadas = base.piezas.map((piezaBase) => {
        const legacy = piezasLegacy.find(
            (pieza) =>
                pieza.codigo === piezaBase.codigo ||
                pieza.numero === piezaBase.numeroLegacy
        );

        if (!legacy) return piezaBase;

        return {
            ...piezaBase,
            denticion:
                legacy.denticion ||
                (legacy.codigo
                    ? inferirDenticionPorCodigo(legacy.codigo)
                    : piezaBase.denticion),
            caras: {
                sup: estadoSeguro(legacy.caras?.sup),
                der: estadoSeguro(legacy.caras?.der),
                inf: estadoSeguro(legacy.caras?.inf),
                izq: estadoSeguro(legacy.caras?.izq),
                centro: estadoSeguro(legacy.caras?.centro),
            },
            nota: legacy.nota || "",
            actualizadoEn: legacy.actualizadoEn || "",
        };
    });

    const historialNormalizado: HistorialOdontograma[] = (
        odontograma.historial || []
    ).map((item) => {
        const piezaCodigo =
            item.piezaCodigo ||
            FDI_PIEZAS.find((pieza) => pieza.numeroLegacy === item.piezaNumero)
                ?.codigo ||
            "11";

        return {
            id: item.id || `HIST-${Date.now()}-${Math.random()}`,
            fecha: item.fecha || fechaHoyLocal(),
            hora: item.hora || "00:00",
            piezaCodigo,
            piezaNumeroLegacy: item.piezaNumero,
            cara: item.cara || "todas",
            estado: estadoSeguro(item.estado),
            nota: item.nota || "",
            usuarioNombre: item.usuarioNombre || "Usuario no identificado",
        };
    });

    return {
        pacienteId,
        version: odontograma.version ?? 0,
        actualizadoEn: odontograma.actualizadoEn || "",
        piezas: piezasNormalizadas,
        historial: historialNormalizado,
    };
}

function convertirPacienteSupabase(paciente: PacienteSupabase): Paciente {
    return {
        id: paciente.id,
        nombre: paciente.nombre || "",
        telefono: paciente.telefono || paciente.whatsapp || "",
        cedula: paciente.cedula || "",
        fechaNacimiento: paciente.fecha_nacimiento || "",
        direccion: paciente.direccion || "",
        alergias: paciente.alergias || "",
        enfermedades:
            paciente.enfermedades_sistemicas || paciente.antecedentes || "",
        medicamentos: paciente.medicamentos_actuales || "",
        observaciones: paciente.observaciones || "",
        estado: paciente.estado || "Activo",
        saldoPendiente: 0,
        ultimaCita: "",
    };
}

function convertirDoctorSupabase(doctor: DoctorSupabase): DoctorAgenda {
    return {
        id: doctor.id,
        nombre: doctor.nombre || "",
        especialidad: doctor.especialidad || "",
        telefono: doctor.telefono || "",
        correo: doctor.correo || "",
        horario: doctor.observaciones || "",
        estado: doctor.estado || "Activo",
    };
}

function convertirServicioSupabase(servicio: ServicioSupabase): ServicioAgenda {
    return {
        id: servicio.id,
        nombre: servicio.nombre || "",
        categoria: servicio.categoria || "",
        duracionMinutos: Number(servicio.duracion_minutos || 30),
        precio: Number(servicio.precio || 0),
        descripcion: servicio.descripcion || "",
        estado: servicio.estado || "Activo",
    };
}

export default function OdontogramaPage() {
    const params = useParams();
    const pacienteId = String(params.id || "");

    const [configuracion, setConfiguracion] = useState<ConfiguracionClinica>(
        CONFIGURACION_PREDETERMINADA
    );
    const [usuario, setUsuario] = useState<UsuarioSistema | null>(null);
    const [guardandoOdontograma, setGuardandoOdontograma] = useState(false);
    const guardadoEnCursoRef = useRef(false);
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [odontograma, setOdontograma] = useState<OdontogramaPaciente | null>(
        null
    );

    const [denticionActiva, setDenticionActiva] =
        useState<Denticion>("Permanente");
    const [piezaSeleccionada, setPiezaSeleccionada] = useState("11");
    const [caraSeleccionada, setCaraSeleccionada] =
        useState<CaraDental>("centro");
    const [estadoSeleccionado, setEstadoSeleccionado] =
        useState<EstadoDental>("Caries");
    const [notaEdicion, setNotaEdicion] = useState("");
    const [procedimientoNombre, setProcedimientoNombre] = useState("");
    const [procedimientoDescripcion, setProcedimientoDescripcion] = useState("");
    const [procedimientoCosto, setProcedimientoCosto] = useState("0");
    const [doctores, setDoctores] = useState<DoctorAgenda[]>([]);
    const [servicios, setServicios] = useState<ServicioAgenda[]>([]);
    const [modalCitaAbierto, setModalCitaAbierto] = useState(false);
    const [tratamientoPendienteAgenda, setTratamientoPendienteAgenda] =
        useState<TratamientoPendienteAgenda | null>(null);
    const [formularioCita, setFormularioCita] =
        useState<FormularioCitaTratamiento>(formularioCitaVacio);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    async function cargarDatos() {
        setCargando(true);
        setError("");

        try {
            try {
                setConfiguracion(await obtenerConfiguracionClinicaSupabase());
            } catch {
                setConfiguracion(obtenerConfiguracionClinica());
            }

            const usuarioGuardado = localStorage.getItem("usuario_sistema_clinico");
            if (usuarioGuardado) {
                setUsuario(JSON.parse(usuarioGuardado) as UsuarioSistema);
            }

            const [pacienteSupabase, doctoresSupabase, serviciosSupabase] =
                await Promise.all([
                    obtenerPacienteSupabase(pacienteId),
                    listarDoctoresSupabase(),
                    listarServiciosSupabase(),
                ]);

            setPaciente(
                pacienteSupabase ? convertirPacienteSupabase(pacienteSupabase) : null
            );
            setDoctores(doctoresSupabase.map(convertirDoctorSupabase));
            setServicios(serviciosSupabase.map(convertirServicioSupabase));

            const odontogramaSupabase = await obtenerOdontogramaSupabase(pacienteId);
            const odontogramaBase =
                odontogramaSupabase && odontogramaSupabase.piezas.length > 0
                    ? normalizarOdontograma(pacienteId, odontogramaSupabase as OdontogramaLegacy)
                    : crearOdontogramaBase(pacienteId);

            setOdontograma(odontogramaBase);
            setDenticionActiva("Permanente");
            setPiezaSeleccionada(
                odontogramaBase.piezas.find((pieza) => pieza.codigo === "11")?.codigo ||
                "11"
            );
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo cargar el odontograma desde Supabase.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, [pacienteId]);

    useEffect(() => {
        const sugerido = PROCEDIMIENTOS_SUGERIDOS[estadoSeleccionado];

        setProcedimientoNombre(sugerido.nombre);
        setProcedimientoDescripcion(sugerido.descripcion);
        setProcedimientoCosto(String(sugerido.costo));
    }, [estadoSeleccionado, piezaSeleccionada]);

    const piezaActiva = useMemo(() => {
        return (
            odontograma?.piezas.find((pieza) => pieza.codigo === piezaSeleccionada) ||
            null
        );
    }, [odontograma, piezaSeleccionada]);

    const piezasDenticionActual = useMemo(() => {
        return (
            odontograma?.piezas.filter(
                (pieza) => pieza.denticion === denticionActiva
            ) || []
        );
    }, [odontograma, denticionActiva]);

    const piezasSuperiores = useMemo(() => {
        return piezasDenticionActual.filter((pieza) => pieza.arcada === "Superior");
    }, [piezasDenticionActual]);

    const piezasInferiores = useMemo(() => {
        return piezasDenticionActual.filter((pieza) => pieza.arcada === "Inferior");
    }, [piezasDenticionActual]);

    const piezasConHallazgos = useMemo(() => {
        return piezasDenticionActual.filter((pieza) =>
            Object.values(pieza.caras).some((cara) => cara !== "Sano")
        ).length;
    }, [piezasDenticionActual]);

    const carasAlteradas = useMemo(() => {
        return piezasDenticionActual.reduce((total, pieza) => {
            return (
                total +
                Object.values(pieza.caras).filter((cara) => cara !== "Sano").length
            );
        }, 0);
    }, [piezasDenticionActual]);

    const observacionesActivas = useMemo(() => {
        return piezasDenticionActual.reduce((total, pieza) => {
            return (
                total +
                Object.values(pieza.caras).filter((cara) => cara === "Observación")
                    .length
            );
        }, 0);
    }, [piezasDenticionActual]);

    const cantidadPiezasDenticion = denticionActiva === "Permanente" ? 32 : 20;
    const columnasOdontograma = denticionActiva === "Permanente" ? 8 : 5;

    const doctoresActivos = useMemo(() => {
        return doctores.filter((doctor) => doctor.estado === "Activo");
    }, [doctores]);

    const serviciosActivos = useMemo(() => {
        return servicios.filter((servicio) => servicio.estado === "Activo");
    }, [servicios]);

    function actualizarFormularioCita<K extends keyof FormularioCitaTratamiento>(
        campo: K,
        valor: FormularioCitaTratamiento[K]
    ) {
        setFormularioCita((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function cerrarModalCita() {
        setModalCitaAbierto(false);
        setTratamientoPendienteAgenda(null);
        setFormularioCita(formularioCitaVacio);
    }

    function cambiarServicioCita(servicioId: string) {
        const servicio = serviciosActivos.find((item) => item.id === servicioId);

        if (!servicio) {
            setFormularioCita((datosActuales) => ({
                ...datosActuales,
                servicioId: "",
            }));
            return;
        }

        setFormularioCita((datosActuales) => ({
            ...datosActuales,
            servicioId: servicio.id,
            servicioNombre: servicio.nombre,
            costo: String(servicio.precio || datosActuales.costo || 0),
        }));
    }

    function abrirModalCitaDesdeTratamiento(
        datos: TratamientoPendienteAgenda
    ) {
        const doctorInicial = doctoresActivos[0] || null;
        const textoProcedimiento = normalizarTexto(datos.nombreTratamiento);

        const servicioSugerido =
            serviciosActivos.find((servicio) => {
                const nombreServicio = normalizarTexto(servicio.nombre);
                return (
                    nombreServicio.includes(textoProcedimiento) ||
                    textoProcedimiento.includes(nombreServicio)
                );
            }) || null;

        setTratamientoPendienteAgenda(datos);
        setFormularioCita({
            doctorId: doctorInicial?.id || "",
            servicioId: servicioSugerido?.id || "",
            servicioNombre: servicioSugerido?.nombre || datos.nombreTratamiento,
            fecha: fechaHoyLocal(),
            hora: "",
            costo: String(servicioSugerido?.precio || datos.total || 0),
            observaciones: `Cita generada desde odontograma. Tratamiento ${datos.tratamientoId}. Presupuesto ${datos.presupuestoId}. Pieza ${datos.piezaCodigo}, cara ${CARAS_LABELS[datos.cara]}, estado ${datos.estadoDental}. ${datos.descripcion}`,
        });
        setModalCitaAbierto(true);
    }

    async function guardarCitaDesdeTratamiento(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!paciente || !tratamientoPendienteAgenda) return;

        if (!formularioCita.fecha) {
            alert("Seleccioná la fecha de la cita.");
            return;
        }

        if (!formularioCita.hora) {
            alert("Seleccioná la hora de la cita.");
            return;
        }

        if (!formularioCita.servicioNombre.trim()) {
            alert("Indicá el servicio o tratamiento de la cita.");
            return;
        }

        const costo = numeroSeguro(formularioCita.costo);

        if (costo < 0) {
            alert("El costo no puede ser negativo.");
            return;
        }

        const doctorSeleccionado = doctoresActivos.find(
            (doctor) => doctor.id === formularioCita.doctorId
        );
        const servicioSeleccionado = serviciosActivos.find(
            (servicio) => servicio.id === formularioCita.servicioId
        );

        setGuardando(true);
        setError("");

        try {
            await crearCitasSupabase({
                paciente_id: paciente.id,
                doctor_id: doctorSeleccionado?.id || null,
                servicio_id: servicioSeleccionado?.id || null,
                paciente_nombre: paciente.nombre,
                doctor_nombre: doctorSeleccionado?.nombre || "Doctor por asignar",
                servicio_nombre: formularioCita.servicioNombre.trim(),
                fecha: formularioCita.fecha,
                hora: formularioCita.hora,
                duracion_minutos: servicioSeleccionado?.duracionMinutos || 30,
                costo,
                estado: "Programada",
                observaciones: formularioCita.observaciones.trim(),
                recurrencia: "No repetir",
                tratamiento_id: tratamientoPendienteAgenda.tratamientoId,
                presupuesto_id: tratamientoPendienteAgenda.presupuestoId,
            });

            cerrarModalCita();
            alert("Cita creada y conectada con el tratamiento correctamente.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo crear la cita desde odontograma.";

            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    function cambiarDenticion(nuevaDenticion: Denticion) {
        if (!odontograma) return;

        setDenticionActiva(nuevaDenticion);

        const piezaInicial =
            odontograma.piezas.find(
                (pieza) =>
                    pieza.denticion === nuevaDenticion &&
                    pieza.codigo === (nuevaDenticion === "Permanente" ? "11" : "51")
            ) ||
            odontograma.piezas.find((pieza) => pieza.denticion === nuevaDenticion);

        if (!piezaInicial) return;

        setPiezaSeleccionada(piezaInicial.codigo);
        setCaraSeleccionada("centro");
        setEstadoSeleccionado(piezaInicial.caras.centro);
        setNotaEdicion(piezaInicial.nota || "");
    }

    async function guardarOdontogramaActual(nuevoOdontograma: OdontogramaPaciente) {
        if (guardadoEnCursoRef.current) return;
        guardadoEnCursoRef.current = true;
        setGuardandoOdontograma(true);
        setError("");
        try {
            const guardado = await guardarOdontogramaSupabase(nuevoOdontograma);
            if (!guardado) throw new Error("No se pudo confirmar el odontograma guardado.");
            setOdontograma(normalizarOdontograma(nuevoOdontograma.pacienteId, guardado as OdontogramaLegacy));
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo guardar el odontograma en Supabase.";
            setError(mensaje);
            alert(mensaje);
        } finally {
            guardadoEnCursoRef.current = false;
            setGuardandoOdontograma(false);
        }
    }

    function seleccionarPieza(codigo: string) {
        const pieza = odontograma?.piezas.find((item) => item.codigo === codigo);

        setPiezaSeleccionada(codigo);
        setCaraSeleccionada("centro");

        if (pieza) {
            setDenticionActiva(pieza.denticion);
            setEstadoSeleccionado(pieza.caras.centro);
            setNotaEdicion(pieza.nota || "");
        }
    }

    function seleccionarCara(codigo: string, cara: CaraDental) {
        const pieza = odontograma?.piezas.find((item) => item.codigo === codigo);

        setPiezaSeleccionada(codigo);
        setCaraSeleccionada(cara);

        if (pieza) {
            setDenticionActiva(pieza.denticion);
            setEstadoSeleccionado(pieza.caras[cara]);
            setNotaEdicion(pieza.nota || "");
        }
    }

    function aplicarEstadoEnCara() {
        if (!odontograma || !piezaActiva) return;

        const nuevasPiezas = odontograma.piezas.map((pieza) => {
            if (pieza.codigo !== piezaSeleccionada) return pieza;

            return {
                ...pieza,
                caras: {
                    ...pieza.caras,
                    [caraSeleccionada]: estadoSeleccionado,
                },
                nota: notaEdicion.trim() || pieza.nota,
                actualizadoEn: fechaHoraCompleta(),
            };
        });

        const nuevoHistorial: HistorialOdontograma = {
            id: crypto.randomUUID(),
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            piezaCodigo: piezaSeleccionada,
            piezaNumeroLegacy: piezaActiva.numeroLegacy,
            cara: caraSeleccionada,
            estado: estadoSeleccionado,
            nota: notaEdicion.trim(),
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        const nuevoOdontograma: OdontogramaPaciente = {
            ...odontograma,
            piezas: nuevasPiezas,
            historial: [nuevoHistorial, ...odontograma.historial],
            actualizadoEn: fechaHoraCompleta(),
        };

        guardarOdontogramaActual(nuevoOdontograma);
    }

    function aplicarEstadoEnTodaLaPieza() {
        if (!odontograma || !piezaActiva) return;

        const nuevasPiezas = odontograma.piezas.map((pieza) => {
            if (pieza.codigo !== piezaSeleccionada) return pieza;

            return {
                ...pieza,
                caras: {
                    sup: estadoSeleccionado,
                    der: estadoSeleccionado,
                    inf: estadoSeleccionado,
                    izq: estadoSeleccionado,
                    centro: estadoSeleccionado,
                },
                nota: notaEdicion.trim() || pieza.nota,
                actualizadoEn: fechaHoraCompleta(),
            };
        });

        const nuevoHistorial: HistorialOdontograma = {
            id: crypto.randomUUID(),
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            piezaCodigo: piezaSeleccionada,
            piezaNumeroLegacy: piezaActiva.numeroLegacy,
            cara: "todas",
            estado: estadoSeleccionado,
            nota: notaEdicion.trim(),
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        const nuevoOdontograma: OdontogramaPaciente = {
            ...odontograma,
            piezas: nuevasPiezas,
            historial: [nuevoHistorial, ...odontograma.historial],
            actualizadoEn: fechaHoraCompleta(),
        };

        guardarOdontogramaActual(nuevoOdontograma);
    }

    function limpiarPiezaSeleccionada() {
        if (!odontograma || !piezaActiva) return;

        const confirmar = window.confirm(
            `¿Seguro que deseas limpiar la pieza ${piezaActiva.codigo}?`
        );

        if (!confirmar) return;

        const nuevasPiezas = odontograma.piezas.map((pieza) => {
            if (pieza.codigo !== piezaSeleccionada) return pieza;

            return {
                ...pieza,
                caras: crearCarasVacias(),
                nota: "",
                actualizadoEn: fechaHoraCompleta(),
            };
        });

        const nuevoHistorial: HistorialOdontograma = {
            id: crypto.randomUUID(),
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            piezaCodigo: piezaSeleccionada,
            piezaNumeroLegacy: piezaActiva.numeroLegacy,
            cara: "todas",
            estado: "Sano",
            nota: "Pieza restablecida a estado sano.",
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        const nuevoOdontograma: OdontogramaPaciente = {
            ...odontograma,
            piezas: nuevasPiezas,
            historial: [nuevoHistorial, ...odontograma.historial],
            actualizadoEn: fechaHoraCompleta(),
        };

        guardarOdontogramaActual(nuevoOdontograma);
        setNotaEdicion("");
    }

    function limpiarOdontogramaCompleto() {
        if (!odontograma) return;

        const confirmar = window.confirm(
            "¿Seguro que deseas restablecer todo el odontograma a sano? Esta acción agregará un registro al historial."
        );

        if (!confirmar) return;

        const nuevoHistorial: HistorialOdontograma = {
            id: crypto.randomUUID(),
            fecha: fechaHoyLocal(),
            hora: horaActualLocal(),
            piezaCodigo: "TODAS",
            cara: "todas",
            estado: "Sano",
            nota: "Odontograma completo restablecido a estado sano.",
            usuarioNombre: usuario?.nombre || "Usuario no identificado",
        };

        const nuevoOdontograma: OdontogramaPaciente = {
            ...odontograma,
            piezas: FDI_PIEZAS.map(crearPiezaBase),
            historial: [nuevoHistorial, ...odontograma.historial],
            actualizadoEn: fechaHoraCompleta(),
        };

        guardarOdontogramaActual(nuevoOdontograma);
        setDenticionActiva("Permanente");
        setPiezaSeleccionada("11");
        setCaraSeleccionada("centro");
        setEstadoSeleccionado("Sano");
        setNotaEdicion("");
    }
    async function crearTratamientoDesdePieza() {
        if (!paciente || !piezaActiva) return;

        if (!procedimientoNombre.trim()) {
            alert("Indicá el nombre del tratamiento.");
            return;
        }

        const total = numeroSeguro(procedimientoCosto);

        if (total < 0) {
            alert("El costo no puede ser negativo.");
            return;
        }

        const descripcionTratamiento =
            procedimientoDescripcion.trim() ||
            `Tratamiento generado desde odontograma. Pieza ${piezaActiva.codigo}, cara ${CARAS_LABELS[caraSeleccionada]}, estado ${estadoSeleccionado}.`;

        setGuardando(true);
        setError("");

        try {
            const tratamiento = await crearTratamientoSupabase({
                paciente_id: paciente.id,
                nombre: `${procedimientoNombre.trim()} · Pieza ${piezaActiva.codigo}`,
                descripcion: descripcionTratamiento,
                total,
                abonado: 0,
                estado: "Planificado",
            });

            const presupuesto = await crearPresupuestoSupabase({
                paciente_id: paciente.id,
                descuento: 0,
                observaciones: `Presupuesto generado automáticamente al crear tratamiento desde odontograma. Tratamiento ${tratamiento.id}. Pieza ${piezaActiva.codigo}, cara ${CARAS_LABELS[caraSeleccionada]}, estado dental ${estadoSeleccionado}.`,
                origen: "Odontograma",
                pieza_codigo: piezaActiva.codigo,
                cara: caraSeleccionada,
                estado_dental: estadoSeleccionado,
                items: [
                    {
                        pieza_codigo: piezaActiva.codigo,
                        pieza_numero: piezaActiva.codigo,
                        cara: caraSeleccionada,
                        estado_dental: estadoSeleccionado,
                        nombre: procedimientoNombre.trim(),
                        tratamiento: procedimientoNombre.trim(),
                        descripcion:
                            procedimientoDescripcion.trim() ||
                            `Procedimiento sugerido desde odontograma para pieza ${piezaActiva.codigo}.`,
                        cantidad: 1,
                        precio_unitario: total,
                        estado: "Pendiente",
                    },
                ],
            });

            abrirModalCitaDesdeTratamiento({
                tratamientoId: tratamiento.id,
                presupuestoId: presupuesto?.id || "",
                nombreTratamiento: procedimientoNombre.trim(),
                descripcion: descripcionTratamiento,
                total,
                piezaCodigo: piezaActiva.codigo,
                cara: caraSeleccionada,
                estadoDental: estadoSeleccionado,
            });
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo crear tratamiento y presupuesto desde odontograma.";

            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    async function crearPresupuestoDesdePieza() {
        if (!paciente || !piezaActiva) return;

        if (!procedimientoNombre.trim()) {
            alert("Indicá el nombre del procedimiento.");
            return;
        }

        const total = numeroSeguro(procedimientoCosto);

        if (total < 0) {
            alert("El costo no puede ser negativo.");
            return;
        }

        setGuardando(true);
        setError("");

        try {
            await crearPresupuestoSupabase({
                paciente_id: paciente.id,
                descuento: 0,
                observaciones: `Presupuesto generado desde odontograma. Pieza ${piezaActiva.codigo}, cara ${CARAS_LABELS[caraSeleccionada]}, estado dental ${estadoSeleccionado}.`,
                origen: "Odontograma",
                pieza_codigo: piezaActiva.codigo,
                cara: caraSeleccionada,
                estado_dental: estadoSeleccionado,
                items: [
                    {
                        pieza_codigo: piezaActiva.codigo,
                        pieza_numero: piezaActiva.codigo,
                        cara: caraSeleccionada,
                        estado_dental: estadoSeleccionado,
                        nombre: procedimientoNombre.trim(),
                        tratamiento: procedimientoNombre.trim(),
                        descripcion:
                            procedimientoDescripcion.trim() ||
                            `Procedimiento sugerido desde odontograma para pieza ${piezaActiva.codigo}.`,
                        cantidad: 1,
                        precio_unitario: total,
                        estado: "Pendiente",
                    },
                ],
            });

            alert("Presupuesto creado desde odontograma correctamente en Supabase.");
        } catch (errorActual) {
            const mensaje =
                errorActual instanceof Error
                    ? errorActual.message
                    : "No se pudo crear el presupuesto desde odontograma.";

            setError(mensaje);
            alert(mensaje);
        } finally {
            setGuardando(false);
        }
    }

    function renderCaraCuadrado(pieza: PiezaDental, cara: CaraDental, points: string) {
        const estado = pieza.caras[cara];
        const color = colorEstado(estado);
        const seleccionada =
            pieza.codigo === piezaSeleccionada && cara === caraSeleccionada;
        const esSano = estado === "Sano";

        return (
            <polygon
                key={`${pieza.codigo}-${cara}`}
                points={points}
                fill={esSano ? "#ffffff" : color.fill}
                stroke={seleccionada ? "#0f766e" : esSano ? "#cbd5e1" : color.stroke}
                strokeWidth={seleccionada ? 2.3 : 1.15}
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={(event) => {
                    event.stopPropagation();
                    seleccionarCara(pieza.codigo, cara);
                }}
            />
        );
    }

    function renderPiezaCuadro(pieza: PiezaDental) {
        const seleccionada = pieza.codigo === piezaSeleccionada;
        const tieneHallazgos = Object.values(pieza.caras).some(
            (cara) => cara !== "Sano"
        );

        return (
            <div
                key={pieza.codigo}
                className={`rounded-2xl border p-2 transition-all ${seleccionada
                    ? "border-teal-300 bg-teal-50 shadow-[0_10px_24px_rgba(20,184,166,0.16)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
            >
                <button
                    type="button"
                    onClick={() => seleccionarPieza(pieza.codigo)}
                    className="mb-2 flex w-full items-center justify-between gap-2"
                >
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black text-white">
                        {pieza.codigo}
                    </span>

                    <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black ${tieneHallazgos
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                            }`}
                    >
                        {tieneHallazgos ? "Hallazgo" : "Sano"}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => seleccionarPieza(pieza.codigo)}
                    className="mx-auto block h-[68px] w-[68px]"
                    title={`Pieza ${pieza.codigo}`}
                >
                    <svg
                        viewBox="0 0 72 72"
                        className="h-full w-full"
                        role="img"
                        aria-label={`Superficies de la pieza ${pieza.codigo}`}
                    >
                        <rect
                            x="6"
                            y="6"
                            width="60"
                            height="60"
                            rx="10"
                            fill="#ffffff"
                            stroke={seleccionada ? "#0f766e" : "#cbd5e1"}
                            strokeWidth={seleccionada ? 2.2 : 1.2}
                        />

                        {renderCaraCuadrado(pieza, "sup", "12,12 60,12 48,26 24,26")}
                        {renderCaraCuadrado(pieza, "der", "60,12 60,60 48,48 48,26")}
                        {renderCaraCuadrado(pieza, "inf", "12,60 60,60 48,48 24,48")}
                        {renderCaraCuadrado(pieza, "izq", "12,12 24,26 24,48 12,60")}
                        {renderCaraCuadrado(pieza, "centro", "24,26 48,26 48,48 24,48")}

                        {pieza.caras.centro === "Ausente" && (
                            <>
                                <line
                                    x1="15"
                                    y1="15"
                                    x2="57"
                                    y2="57"
                                    stroke="#334155"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1="57"
                                    y1="15"
                                    x2="15"
                                    y2="57"
                                    stroke="#334155"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />
                            </>
                        )}
                    </svg>
                </button>

                <p className="mt-2 truncate text-center text-[10px] font-bold text-slate-400">
                    {pieza.nombre}
                </p>
            </div>
        );
    }

    if (!paciente || !odontograma) {
        return (
            <AppShell
                titulo="Odontograma"
                descripcion="Cargando información del paciente"
                moduloActivo="Pacientes"
            >
                <section className="glass-card rounded-3xl p-10 text-center">
                    <h2 className="text-2xl font-black text-slate-900">
                        Cargando odontograma...
                    </h2>
                </section>
            </AppShell>
        );
    }

    return (
        <AppShell
            titulo="Odontograma"
            descripcion="Mapa dental SVG interactivo, visual y profesional"
            moduloActivo="Pacientes"
        >
            {error && (
                <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                        <div>
                            <h3 className="text-sm font-black text-red-800">
                                No se pudo sincronizar odontograma
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
                        Odontograma conectado a Supabase
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        {guardandoOdontograma ? "Guardando cambios del odontograma..." : "Hallazgos, superficies e historial se guardan por paciente en la base de datos."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarDatos}
                    disabled={cargando || guardando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
                    {cargando ? "Cargando..." : "Recargar"}
                </button>
            </section>

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
                        href="/agenda"
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <Stethoscope className="h-4 w-4" />
                        Agenda
                    </Link>

                    <Link
                        href={`/pacientes/${paciente.id}/presupuestos`}
                        className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                    >
                        <FileText className="h-4 w-4" />
                        Presupuestos
                    </Link>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
                <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
                    <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <Sparkles className="h-6 w-6 text-teal-300" />
                        </div>

                        <h2 className="mt-5 text-3xl font-black">
                            Odontograma SVG de {paciente.nombre}
                        </h2>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
                            Vista clínica interactiva con numeración FDI, selección por caras en cuadritos, dentición permanente e infantil.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Clínica: {configuracion.nombreClinica}
                            </span>
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Cédula: {paciente.cedula || "No registrada"}
                            </span>
                            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                                Última actualización:{" "}
                                {odontograma.actualizadoEn || "Sin cambios"}
                            </span>
                            <span className="rounded-xl bg-teal-400/20 px-3 py-2 text-xs font-bold text-teal-100">
                                Dentición activa: {denticionActiva}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                            Resumen clínico
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white/10 p-4">
                                <p className="text-[11px] font-bold text-white/45">
                                    Piezas con hallazgos
                                </p>
                                <p className="mt-1 text-2xl font-black text-teal-300">
                                    {piezasConHallazgos}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <p className="text-[11px] font-bold text-white/45">
                                    Caras alteradas
                                </p>
                                <p className="mt-1 text-2xl font-black text-amber-300">
                                    {carasAlteradas}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {(paciente.alergias || paciente.enfermedades || paciente.medicamentos) && (
                <section className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Alertas clínicas del paciente
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Alergias: {paciente.alergias || "No refiere"} · Enfermedades:{" "}
                                {paciente.enfermedades || "No registra"} · Medicamentos:{" "}
                                {paciente.medicamentos || "Ninguno"}.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {cantidadPiezasDenticion - piezasConHallazgos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Piezas sanas
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <CircleDot className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[30px] font-black text-slate-800">
                        {piezaSeleccionada}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Pieza FDI seleccionada
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <HeartPulse className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {CARAS_LABELS[caraSeleccionada]}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Cara activa
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <Info className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="mt-4 text-[24px] font-black text-slate-800">
                        {observacionesActivas}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Observaciones activas
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-4">
                    <div className="glass-card rounded-3xl p-5">
                        <div>
                            <h3 className="text-[18px] font-black text-slate-800">
                                Paleta clínica
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Seleccioná un estado y luego hacé clic sobre una cara del cuadrito.
                            </p>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {ESTADOS_DENTALES.map((estado) => (
                                <button
                                    key={estado.valor}
                                    type="button"
                                    onClick={() => setEstadoSeleccionado(estado.valor)}
                                    className={`rounded-2xl border p-4 text-left transition-all ${estadoSeleccionado === estado.valor
                                        ? "ring-2 ring-teal-500 ring-offset-1"
                                        : ""
                                        } ${estado.boton}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-4 w-4 rounded-md border"
                                            style={{
                                                backgroundColor: estado.fill,
                                                borderColor: estado.stroke,
                                            }}
                                        />
                                        <p className="text-sm font-black">{estado.etiqueta}</p>
                                    </div>
                                    <p className="mt-1 text-xs leading-5 opacity-80">
                                        {estado.descripcion}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Odontograma por superficies
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Vista por arcadas con numeración FDI. Cambiá entre permanente y niños; cada pieza se trabaja desde el cuadrito.
                            </p>
                        </div>

                        <div className="p-5">
                            <div className="mb-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => cambiarDenticion("Permanente")}
                                    className={`rounded-xl px-4 py-2 text-[12px] font-black transition ${denticionActiva === "Permanente"
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                >
                                    Permanente · 32 piezas
                                </button>

                                <button
                                    type="button"
                                    onClick={() => cambiarDenticion("Temporal")}
                                    className={`rounded-xl px-4 py-2 text-[12px] font-black transition ${denticionActiva === "Temporal"
                                        ? "bg-teal-600 text-white"
                                        : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                                        }`}
                                >
                                    Niños / temporal · 20 piezas
                                </button>
                            </div>

                            <div className="rounded-[36px] border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
                                <div className="mb-5 flex items-center justify-between">
                                    <h4 className="text-sm font-black text-slate-800">
                                        Arcada superior
                                    </h4>
                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm">
                                        {denticionActiva === "Permanente" ? "18 → 11 · 21 → 28" : "55 → 51 · 61 → 65"}
                                    </span>
                                </div>

                                <div className="overflow-x-auto pb-2">
                                    <div
                                        className="grid gap-3"
                                        style={{
                                            gridTemplateColumns: `repeat(${columnasOdontograma}, minmax(84px, 1fr))`,
                                            minWidth: denticionActiva === "Permanente" ? "760px" : "480px",
                                        }}
                                    >
                                        {piezasSuperiores.map((pieza) =>
                                            renderPiezaCuadro(pieza)
                                        )}
                                    </div>
                                </div>

                                <div className="my-4 flex items-center justify-center">
                                    <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                                    <span className="mx-4 whitespace-nowrap rounded-full bg-slate-900 px-5 py-2 text-[11px] font-black text-white shadow-sm">
                                        Línea de oclusión
                                    </span>
                                    <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                                </div>

                                <div className="mb-5 flex items-center justify-between">
                                    <h4 className="text-sm font-black text-slate-800">
                                        Arcada inferior
                                    </h4>
                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm">
                                        {denticionActiva === "Permanente" ? "48 → 41 · 31 → 38" : "85 → 81 · 71 → 75"}
                                    </span>
                                </div>

                                <div className="overflow-x-auto pt-2">
                                    <div
                                        className="grid gap-3"
                                        style={{
                                            gridTemplateColumns: `repeat(${columnasOdontograma}, minmax(84px, 1fr))`,
                                            minWidth: denticionActiva === "Permanente" ? "760px" : "480px",
                                        }}
                                    >
                                        {piezasInferiores.map((pieza) =>
                                            renderPiezaCuadro(pieza)
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Leyenda clínica
                            </h3>
                        </div>

                        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                            {ESTADOS_DENTALES.map((item) => (
                                <div
                                    key={item.valor}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-5 w-5 rounded-md border"
                                            style={{
                                                backgroundColor: item.fill,
                                                borderColor: item.stroke,
                                            }}
                                        />
                                        <p className="text-sm font-black text-slate-800">
                                            {item.etiqueta}
                                        </p>
                                    </div>

                                    <p className="mt-2 text-xs leading-5 text-slate-500">
                                        {item.descripcion}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Panel clínico
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Panel fijo y compacto para editar sin perder de vista el odontograma.
                            </p>
                        </div>

                        <div className="space-y-3 p-4">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                    Pieza seleccionada
                                </p>
                                <p className="mt-2 text-3xl font-black text-slate-900">
                                    {piezaActiva?.codigo}
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-500">
                                    {piezaActiva?.nombre}
                                </p>
                                <p className="mt-1 text-xs font-bold text-slate-400">
                                    {piezaActiva?.cuadrante}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                    Cara activa
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-900">
                                    {CARAS_LABELS[caraSeleccionada]}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Estado actual:{" "}
                                    <span className="font-black text-slate-700">
                                        {piezaActiva?.caras[caraSeleccionada]}
                                    </span>
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                    Estado a aplicar
                                </p>

                                <span
                                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[12px] font-black ${colorEstado(estadoSeleccionado).boton
                                        }`}
                                >
                                    {estadoSeleccionado}
                                </span>

                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    {colorEstado(estadoSeleccionado).descripcion}
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-black text-slate-700">
                                    Nota clínica de la pieza
                                </label>

                                <textarea
                                    value={notaEdicion}
                                    onChange={(event) => setNotaEdicion(event.target.value)}
                                    rows={3}
                                    placeholder="Observaciones de la pieza, hallazgos, plan, indicaciones..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="grid gap-2">
                                <button
                                    type="button"
                                    onClick={aplicarEstadoEnCara}
                                    disabled={guardandoOdontograma || guardando}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Save className="h-4 w-4" />
                                    Aplicar en cara seleccionada
                                </button>

                                <button
                                    type="button"
                                    onClick={aplicarEstadoEnTodaLaPieza}
                                    disabled={guardandoOdontograma || guardando}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Aplicar a toda la pieza
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarPiezaSeleccionada}
                                    disabled={guardandoOdontograma}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Limpiar pieza seleccionada
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarOdontogramaCompleto}
                                    disabled={guardandoOdontograma}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-[12px] font-bold text-red-700 hover:bg-red-100"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Restablecer odontograma
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-teal-700" />
                                <h3 className="text-[18px] font-black text-slate-800">
                                    Tratamiento y presupuesto
                                </h3>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                                Generá un tratamiento o presupuesto a partir de la pieza seleccionada.
                            </p>
                        </div>

                        <div className="space-y-4 p-5">
                            <div className="rounded-2xl bg-teal-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-teal-700">
                                    Origen clínico
                                </p>

                                <p className="mt-2 text-sm font-black text-teal-800">
                                    Pieza {piezaActiva?.codigo} · {CARAS_LABELS[caraSeleccionada]}
                                </p>

                                <p className="mt-1 text-xs leading-5 text-teal-700">
                                    Estado dental detectado: {estadoSeleccionado}
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-black text-slate-700">
                                    Procedimiento sugerido
                                </label>

                                <input
                                    value={procedimientoNombre}
                                    onChange={(event) => setProcedimientoNombre(event.target.value)}
                                    placeholder="Ejemplo: Restauración por caries"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-black text-slate-700">
                                    Descripción clínica
                                </label>

                                <textarea
                                    value={procedimientoDescripcion}
                                    onChange={(event) => setProcedimientoDescripcion(event.target.value)}
                                    rows={4}
                                    placeholder="Descripción del procedimiento sugerido..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-black text-slate-700">
                                    Costo estimado
                                </label>

                                <input
                                    value={procedimientoCosto}
                                    onChange={(event) => setProcedimientoCosto(event.target.value)}
                                    type="number"
                                    placeholder="0"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="grid gap-3">
                                <button
                                    type="button"
                                    onClick={crearTratamientoDesdePieza}
                                    disabled={guardando}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Plus className="h-4 w-4" />
                                    {guardando ? "Guardando..." : "Crear tratamiento + presupuesto"}
                                </button>

                                <button
                                    type="button"
                                    onClick={crearPresupuestoDesdePieza}
                                    disabled={guardando}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <BadgeDollarSign className="h-4 w-4" />
                                    {guardando ? "Guardando..." : "Crear presupuesto"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Resumen de pieza
                            </h3>
                        </div>

                        <div className="space-y-3 p-5">
                            {piezaActiva &&
                                (Object.keys(CARAS_LABELS) as CaraDental[]).map((cara) => {
                                    const estado = piezaActiva.caras[cara];
                                    const color = colorEstado(estado);

                                    return (
                                        <button
                                            type="button"
                                            key={cara}
                                            onClick={() => seleccionarCara(piezaActiva.codigo, cara)}
                                            className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm hover:bg-slate-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="h-5 w-5 rounded-md border"
                                                    style={{
                                                        backgroundColor: color.fill,
                                                        borderColor: color.stroke,
                                                    }}
                                                />

                                                <div>
                                                    <p className="text-sm font-black text-slate-800">
                                                        {CARAS_LABELS[cara]}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{estado}</p>
                                                </div>
                                            </div>

                                            {cara === caraSeleccionada && (
                                                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black text-teal-700">
                                                    Activa
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}

                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                                    <div>
                                        <h4 className="text-sm font-black text-blue-800">
                                            Nota guardada
                                        </h4>
                                        <p className="mt-1 text-xs leading-5 text-blue-700">
                                            {piezaActiva?.nota ||
                                                "Esta pieza aún no tiene nota clínica."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-3xl">
                        <div className="border-b border-black/[0.04] px-6 py-5">
                            <h3 className="text-[18px] font-black text-slate-800">
                                Historial odontológico
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Últimos cambios del odontograma.
                            </p>
                        </div>

                        <div className="max-h-[620px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {odontograma.historial.slice(0, 24).map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                                                Pieza {item.piezaCodigo}
                                            </span>

                                            <span
                                                className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${colorEstado(item.estado).boton
                                                    }`}
                                            >
                                                {item.estado}
                                            </span>
                                        </div>

                                        <p className="mt-3 text-sm font-black text-slate-800">
                                            {item.cara === "todas"
                                                ? "Aplicado a toda la pieza"
                                                : `Cara ${CARAS_LABELS[item.cara]}`}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            {fechaLegible(item.fecha)} · {item.hora} ·{" "}
                                            {item.usuarioNombre}
                                        </p>

                                        {item.nota && (
                                            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                                                {item.nota}
                                            </p>
                                        )}
                                    </div>
                                ))}

                                {odontograma.historial.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
                                        <FileText className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            Sin historial todavía
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Cuando edites piezas o caras dentales aparecerá aquí.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </section>

            {modalCitaAbierto && tratamientoPendienteAgenda && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
                                    Tratamiento y presupuesto creados
                                </p>
                                <h3 className="mt-1 text-xl font-black text-slate-900">
                                    ¿Deseás agendar una cita?
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Ya se creó el tratamiento y el presupuesto. Ahora podés
                                    dejar programada la cita para continuar el flujo clínico.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={cerrarModalCita}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={guardarCitaDesdeTratamiento}
                            className="max-h-[calc(92vh-92px)] overflow-y-auto p-6"
                        >
                            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                                <div className="rounded-3xl border border-teal-100 bg-teal-50 p-5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">
                                        Origen odontograma
                                    </p>

                                    <h4 className="mt-2 text-lg font-black text-teal-900">
                                        {tratamientoPendienteAgenda.nombreTratamiento}
                                    </h4>

                                    <p className="mt-2 text-sm leading-6 text-teal-800">
                                        Pieza {tratamientoPendienteAgenda.piezaCodigo} ·{" "}
                                        {CARAS_LABELS[tratamientoPendienteAgenda.cara]} ·{" "}
                                        {tratamientoPendienteAgenda.estadoDental}
                                    </p>

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        <div className="rounded-2xl bg-white p-4">
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Paciente
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-800">
                                                {paciente.nombre}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-white p-4">
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Presupuesto
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-800">
                                                {tratamientoPendienteAgenda.presupuestoId}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-white p-4">
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Monto
                                            </p>
                                            <p className="mt-1 text-sm font-black text-teal-800">
                                                {configuracion.simboloMoneda}{" "}
                                                {tratamientoPendienteAgenda.total.toLocaleString(
                                                    "es-NI"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                                    <div className="flex items-center gap-2">
                                        <CalendarPlus className="h-5 w-5 text-slate-700" />
                                        <h4 className="text-sm font-black text-slate-900">
                                            Datos de la cita
                                        </h4>
                                    </div>

                                    <p className="mt-2 text-xs leading-5 text-slate-500">
                                        La cita se guardará en Agenda Médica como programada.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Doctor
                                    </label>
                                    <select
                                        value={formularioCita.doctorId}
                                        onChange={(event) =>
                                            actualizarFormularioCita(
                                                "doctorId",
                                                event.target.value
                                            )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option value="">Doctor por asignar</option>
                                        {doctoresActivos.map((doctor) => (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctor.nombre} · {doctor.especialidad}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Servicio sugerido
                                    </label>
                                    <select
                                        value={formularioCita.servicioId}
                                        onChange={(event) =>
                                            cambiarServicioCita(event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    >
                                        <option value="">Usar nombre del tratamiento</option>
                                        {serviciosActivos.map((servicio) => (
                                            <option key={servicio.id} value={servicio.id}>
                                                {servicio.nombre} ·{" "}
                                                {configuracion.simboloMoneda}{" "}
                                                {servicio.precio.toLocaleString("es-NI")}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Nombre del servicio / tratamiento en agenda
                                </label>
                                <input
                                    value={formularioCita.servicioNombre}
                                    onChange={(event) =>
                                        actualizarFormularioCita(
                                            "servicioNombre",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ejemplo: Restauración por caries"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Fecha
                                    </label>
                                    <input
                                        value={formularioCita.fecha}
                                        onChange={(event) =>
                                            actualizarFormularioCita(
                                                "fecha",
                                                event.target.value
                                            )
                                        }
                                        type="date"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Hora
                                    </label>
                                    <input
                                        value={formularioCita.hora}
                                        onChange={(event) =>
                                            actualizarFormularioCita(
                                                "hora",
                                                event.target.value
                                            )
                                        }
                                        type="time"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Costo
                                    </label>
                                    <input
                                        value={formularioCita.costo}
                                        onChange={(event) =>
                                            actualizarFormularioCita(
                                                "costo",
                                                event.target.value
                                            )
                                        }
                                        type="number"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Observaciones de la cita
                                </label>
                                <textarea
                                    value={formularioCita.observaciones}
                                    onChange={(event) =>
                                        actualizarFormularioCita(
                                            "observaciones",
                                            event.target.value
                                        )
                                    }
                                    rows={4}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="sticky bottom-0 -mx-6 mt-6 flex flex-col gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur md:flex-row md:justify-end">
                                <button
                                    type="button"
                                    onClick={cerrarModalCita}
                                    className="rounded-xl bg-slate-100 px-5 py-3 text-[12px] font-bold text-slate-600 hover:bg-slate-200"
                                >
                                    Omitir por ahora
                                </button>

                                <button
                                    type="submit"
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[12px] font-bold text-white hover:bg-slate-800"
                                >
                                    <CalendarPlus className="h-4 w-4" />
                                    Crear cita
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AppShell>
    );
}
