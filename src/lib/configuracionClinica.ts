export type POSClinica = {
    id: string;
    nombre: string;
    banco: string;
    comision: number;
    activo: boolean;
};

export type ConfiguracionClinica = {
    nombreClinica: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    direccion: string;
    ruc: string;
    moneda: string;
    simboloMoneda: string;

    /*
     * Se mantiene para compatibilidad con lo que ya existe.
     * Algunas pantallas antiguas todavía pueden leer comisionPOS.
     */
    comisionPOS: number;

    /*
     * Nueva configuración para manejar varios POS / bancos.
     */
    poses: POSClinica[];

    mensajeRecibo: string;
};

export const CONFIGURACION_KEY = "configuracion_clinica_sistema_clinico";

export const POS_PREDETERMINADOS: POSClinica[] = [
    {
        id: "POS-DEFAULT-1",
        nombre: "POS Principal",
        banco: "Banco principal",
        comision: 4,
        activo: true,
    },
];

export const CONFIGURACION_PREDETERMINADA: ConfiguracionClinica = {
    nombreClinica: "Clínica Odontológica",
    telefono: "0000-0000",
    whatsapp: "0000-0000",
    correo: "clinica@correo.com",
    direccion: "Managua, Nicaragua",
    ruc: "No registrado",
    moneda: "Córdoba nicaragüense",
    simboloMoneda: "C$",
    comisionPOS: 4,
    poses: POS_PREDETERMINADOS,
    mensajeRecibo: "Gracias por su preferencia.",
};

function normalizarNumero(valor: unknown, valorInicial: number) {
    const convertido = Number(valor);

    if (Number.isNaN(convertido)) return valorInicial;

    return convertido;
}

function normalizarConfiguracion(
    configuracion: Partial<ConfiguracionClinica>
): ConfiguracionClinica {
    const comisionAnterior =
        configuracion.comisionPOS === undefined
            ? CONFIGURACION_PREDETERMINADA.comisionPOS
            : normalizarNumero(
                configuracion.comisionPOS,
                CONFIGURACION_PREDETERMINADA.comisionPOS
            );

    const posesNormalizados: POSClinica[] =
        Array.isArray(configuracion.poses) && configuracion.poses.length > 0
            ? configuracion.poses.map((pos, index) => ({
                id: pos.id || `POS-${Date.now()}-${index}`,
                nombre: pos.nombre || `POS ${index + 1}`,
                banco: pos.banco || "Banco no especificado",
                comision: normalizarNumero(pos.comision, comisionAnterior),
                activo: typeof pos.activo === "boolean" ? pos.activo : true,
            }))
            : [
                {
                    id: "POS-MIGRADO-1",
                    nombre: "POS Principal",
                    banco: "Banco principal",
                    comision: comisionAnterior,
                    activo: true,
                },
            ];

    const primerPOSActivo =
        posesNormalizados.find((pos) => pos.activo) || posesNormalizados[0];

    return {
        nombreClinica:
            configuracion.nombreClinica ||
            CONFIGURACION_PREDETERMINADA.nombreClinica,
        telefono:
            configuracion.telefono || CONFIGURACION_PREDETERMINADA.telefono,
        whatsapp:
            configuracion.whatsapp || CONFIGURACION_PREDETERMINADA.whatsapp,
        correo: configuracion.correo || CONFIGURACION_PREDETERMINADA.correo,
        direccion:
            configuracion.direccion || CONFIGURACION_PREDETERMINADA.direccion,
        ruc: configuracion.ruc || CONFIGURACION_PREDETERMINADA.ruc,
        moneda: configuracion.moneda || CONFIGURACION_PREDETERMINADA.moneda,
        simboloMoneda:
            configuracion.simboloMoneda ||
            CONFIGURACION_PREDETERMINADA.simboloMoneda,
        comisionPOS: primerPOSActivo?.comision ?? comisionAnterior,
        poses: posesNormalizados,
        mensajeRecibo:
            configuracion.mensajeRecibo ||
            CONFIGURACION_PREDETERMINADA.mensajeRecibo,
    };
}

export function obtenerConfiguracionClinica(): ConfiguracionClinica {
    if (typeof window === "undefined") {
        return CONFIGURACION_PREDETERMINADA;
    }

    const guardada = localStorage.getItem(CONFIGURACION_KEY);

    if (!guardada) {
        localStorage.setItem(
            CONFIGURACION_KEY,
            JSON.stringify(CONFIGURACION_PREDETERMINADA)
        );

        return CONFIGURACION_PREDETERMINADA;
    }

    try {
        const configuracion = JSON.parse(
            guardada
        ) as Partial<ConfiguracionClinica>;

        const configuracionNormalizada = normalizarConfiguracion({
            ...CONFIGURACION_PREDETERMINADA,
            ...configuracion,
        });

        localStorage.setItem(
            CONFIGURACION_KEY,
            JSON.stringify(configuracionNormalizada)
        );

        return configuracionNormalizada;
    } catch {
        return CONFIGURACION_PREDETERMINADA;
    }
}

export function guardarConfiguracionClinica(
    configuracion: ConfiguracionClinica
) {
    if (typeof window === "undefined") return;

    const configuracionNormalizada = normalizarConfiguracion(configuracion);

    localStorage.setItem(
        CONFIGURACION_KEY,
        JSON.stringify(configuracionNormalizada)
    );
}

export function obtenerPOSActivos(): POSClinica[] {
    const configuracion = obtenerConfiguracionClinica();

    return configuracion.poses.filter((pos) => pos.activo);
}

export function obtenerPOSPorId(posId: string): POSClinica | null {
    const configuracion = obtenerConfiguracionClinica();

    return configuracion.poses.find((pos) => pos.id === posId) || null;
}