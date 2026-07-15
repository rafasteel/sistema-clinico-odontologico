"use client";

import { FormEvent, useEffect, useState } from "react";
import {
    AlertTriangle,
    BadgeDollarSign,
    Building2,
    CheckCircle2,
    CreditCard,
    Eye,
    FileText,
    Mail,
    MapPin,
    MessageCircle,
    Percent,
    Phone,
    Plus,
    ReceiptText,
    RotateCcw,
    Save,
    Settings,
    ShieldCheck,
    Sparkles,
    Trash2,
    Wallet,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    ConfiguracionClinica,
    CONFIGURACION_PREDETERMINADA,
    guardarConfiguracionClinica,
    obtenerConfiguracionClinica,
    POSClinica,
} from "@/lib/configuracionClinica";

type FormularioConfiguracion = {
    nombreClinica: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    direccion: string;
    ruc: string;
    moneda: string;
    simboloMoneda: string;
    comisionPOS: string;
    poses: POSClinica[];
    mensajeRecibo: string;
};

type FormularioPOS = {
    nombre: string;
    banco: string;
    comision: string;
};

const monedasSugeridas = [
    {
        moneda: "Córdoba nicaragüense",
        simbolo: "C$",
    },
    {
        moneda: "Dólar estadounidense",
        simbolo: "$",
    },
    {
        moneda: "Euro",
        simbolo: "€",
    },
];

const formularioPOSVacio: FormularioPOS = {
    nombre: "",
    banco: "",
    comision: "",
};

function numero(valor: string | number) {
    const convertido = Number(valor || 0);

    if (Number.isNaN(convertido)) return 0;

    return convertido;
}

function formatoMoneda(valor: number, simbolo = "C$") {
    return `${simbolo} ${(valor || 0).toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function convertirAFormulario(
    configuracion: ConfiguracionClinica
): FormularioConfiguracion {
    const poses =
        Array.isArray(configuracion.poses) && configuracion.poses.length > 0
            ? configuracion.poses
            : [
                {
                    id: "POS-MIGRADO-1",
                    nombre: "POS Principal",
                    banco: "Banco principal",
                    comision: configuracion.comisionPOS || 4,
                    activo: true,
                },
            ];

    return {
        nombreClinica: configuracion.nombreClinica,
        telefono: configuracion.telefono,
        whatsapp: configuracion.whatsapp,
        correo: configuracion.correo,
        direccion: configuracion.direccion,
        ruc: configuracion.ruc,
        moneda: configuracion.moneda,
        simboloMoneda: configuracion.simboloMoneda,
        comisionPOS: configuracion.comisionPOS.toString(),
        poses,
        mensajeRecibo: configuracion.mensajeRecibo,
    };
}

function totalPOSActivos(poses: POSClinica[]) {
    return poses.filter((pos) => pos.activo).length;
}

export default function ConfiguracionPage() {
    const [formulario, setFormulario] = useState<FormularioConfiguracion>(
        convertirAFormulario(CONFIGURACION_PREDETERMINADA)
    );

    const [nuevoPOS, setNuevoPOS] =
        useState<FormularioPOS>(formularioPOSVacio);

    const [guardado, setGuardado] = useState(false);

    useEffect(() => {
        const configuracionActual = obtenerConfiguracionClinica();
        setFormulario(convertirAFormulario(configuracionActual));
    }, []);

    function actualizarCampo<K extends keyof FormularioConfiguracion>(
        campo: K,
        valor: FormularioConfiguracion[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));

        setGuardado(false);
    }

    function actualizarNuevoPOS<K extends keyof FormularioPOS>(
        campo: K,
        valor: FormularioPOS[K]
    ) {
        setNuevoPOS((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));

        setGuardado(false);
    }

    function aplicarMoneda(moneda: string, simbolo: string) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            moneda,
            simboloMoneda: simbolo,
        }));

        setGuardado(false);
    }

    function actualizarPOS<K extends keyof POSClinica>(
        posId: string,
        campo: K,
        valor: POSClinica[K]
    ) {
        setFormulario((datosActuales) => {
            const posesActualizados = datosActuales.poses.map((pos) =>
                pos.id === posId
                    ? {
                        ...pos,
                        [campo]: valor,
                    }
                    : pos
            );

            const primerActivo =
                posesActualizados.find((pos) => pos.activo) ||
                posesActualizados[0];

            return {
                ...datosActuales,
                poses: posesActualizados,
                comisionPOS: primerActivo
                    ? primerActivo.comision.toString()
                    : datosActuales.comisionPOS,
            };
        });

        setGuardado(false);
    }

    function agregarPOS() {
        if (!nuevoPOS.nombre.trim()) {
            alert("Escribí el nombre del POS.");
            return;
        }

        if (!nuevoPOS.banco.trim()) {
            alert("Escribí el banco o proveedor del POS.");
            return;
        }

        const comision = numero(nuevoPOS.comision);

        if (comision < 0) {
            alert("La comisión POS no puede ser negativa.");
            return;
        }

        if (comision > 100) {
            alert("La comisión POS no puede ser mayor al 100%.");
            return;
        }

        const pos: POSClinica = {
            id: `POS-${Date.now()}`,
            nombre: nuevoPOS.nombre.trim(),
            banco: nuevoPOS.banco.trim(),
            comision,
            activo: true,
        };

        setFormulario((datosActuales) => ({
            ...datosActuales,
            poses: [...datosActuales.poses, pos],
            comisionPOS: datosActuales.comisionPOS || comision.toString(),
        }));

        setNuevoPOS(formularioPOSVacio);
        setGuardado(false);
    }

    function eliminarPOS(posId: string) {
        if (formulario.poses.length <= 1) {
            alert("Debe quedar al menos un POS configurado.");
            return;
        }

        const confirmar = window.confirm("¿Seguro que deseas eliminar este POS?");
        if (!confirmar) return;

        setFormulario((datosActuales) => {
            let posesActualizados = datosActuales.poses.filter(
                (pos) => pos.id !== posId
            );

            if (!posesActualizados.some((pos) => pos.activo)) {
                posesActualizados = posesActualizados.map((pos, index) =>
                    index === 0
                        ? {
                            ...pos,
                            activo: true,
                        }
                        : pos
                );
            }

            const primerActivo =
                posesActualizados.find((pos) => pos.activo) ||
                posesActualizados[0];

            return {
                ...datosActuales,
                poses: posesActualizados,
                comisionPOS: primerActivo
                    ? primerActivo.comision.toString()
                    : datosActuales.comisionPOS,
            };
        });

        setGuardado(false);
    }

    function alternarPOS(posId: string) {
        const posActual = formulario.poses.find((pos) => pos.id === posId);

        if (!posActual) return;

        if (posActual.activo && totalPOSActivos(formulario.poses) <= 1) {
            alert("Debe quedar al menos un POS activo.");
            return;
        }

        actualizarPOS(posId, "activo", !posActual.activo);
    }

    function validarPOS() {
        if (formulario.poses.length === 0) {
            alert("Debés configurar al menos un POS.");
            return false;
        }

        const activos = formulario.poses.filter((pos) => pos.activo);

        if (activos.length === 0) {
            alert("Debés tener al menos un POS activo.");
            return false;
        }

        for (const pos of formulario.poses) {
            if (!pos.nombre.trim()) {
                alert("Todos los POS deben tener nombre.");
                return false;
            }

            if (!pos.banco.trim()) {
                alert("Todos los POS deben tener banco o proveedor.");
                return false;
            }

            if (pos.comision < 0) {
                alert("La comisión POS no puede ser negativa.");
                return false;
            }

            if (pos.comision > 100) {
                alert("La comisión POS no puede ser mayor al 100%.");
                return false;
            }
        }

        return true;
    }

    function guardarConfiguracion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!formulario.nombreClinica.trim()) {
            alert("El nombre de la clínica es obligatorio.");
            return;
        }

        if (!formulario.telefono.trim()) {
            alert("El teléfono de la clínica es obligatorio.");
            return;
        }

        if (!formulario.simboloMoneda.trim()) {
            alert("El símbolo de moneda es obligatorio.");
            return;
        }

        if (!validarPOS()) return;

        const primerPOSActivo =
            formulario.poses.find((pos) => pos.activo) || formulario.poses[0];

        const nuevaConfiguracion: ConfiguracionClinica = {
            nombreClinica: formulario.nombreClinica.trim(),
            telefono: formulario.telefono.trim(),
            whatsapp: formulario.whatsapp.trim(),
            correo: formulario.correo.trim(),
            direccion: formulario.direccion.trim(),
            ruc: formulario.ruc.trim(),
            moneda: formulario.moneda.trim(),
            simboloMoneda: formulario.simboloMoneda.trim(),
            comisionPOS: primerPOSActivo.comision,
            poses: formulario.poses.map((pos) => ({
                ...pos,
                nombre: pos.nombre.trim(),
                banco: pos.banco.trim(),
                comision: numero(pos.comision),
            })),
            mensajeRecibo: formulario.mensajeRecibo.trim(),
        };

        guardarConfiguracionClinica(nuevaConfiguracion);

        setFormulario(convertirAFormulario(nuevaConfiguracion));
        setGuardado(true);

        alert("Configuración guardada correctamente.");
    }

    function restaurarConfiguracion() {
        const confirmar = window.confirm(
            "¿Seguro que deseas restaurar la configuración predeterminada?"
        );

        if (!confirmar) return;

        guardarConfiguracionClinica(CONFIGURACION_PREDETERMINADA);
        setFormulario(convertirAFormulario(CONFIGURACION_PREDETERMINADA));
        setNuevoPOS(formularioPOSVacio);
        setGuardado(true);

        alert("Configuración predeterminada restaurada.");
    }

    const ventaEjemplo = 2500;

    const posEjemplo =
        formulario.poses.find((pos) => pos.activo) || formulario.poses[0];

    const comisionPOSPrincipal = posEjemplo?.comision || 0;
    const comisionEjemplo = ventaEjemplo * (comisionPOSPrincipal / 100);
    const netoEjemplo = ventaEjemplo - comisionEjemplo;
    const cantidadPOSActivos = totalPOSActivos(formulario.poses);

    return (
        <AppShell
            titulo="Configuración General"
            descripcion="Datos de clínica, moneda, POS por banco, contacto y textos para recibos"
            moduloActivo="Configuración General"
        >
            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Building2 className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Clínica
                        </span>
                    </div>

                    <h3 className="mt-4 truncate text-[20px] font-black leading-none text-slate-800">
                        {formulario.nombreClinica || "Sin nombre"}
                    </h3>
                    <p className="mt-2 text-[12px] font-semibold text-slate-500">
                        Nombre comercial activo
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Wallet className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Moneda
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {formulario.simboloMoneda || "C$"}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        {formulario.moneda || "No configurada"}
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

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {cantidadPOSActivos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        POS activos configurados
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ShieldCheck className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Estado
                        </span>
                    </div>

                    <h3 className="mt-4 text-[20px] font-black leading-none text-slate-800">
                        {guardado ? "Guardado" : "Editable"}
                    </h3>
                    <p className="mt-2 text-[12px] font-semibold text-slate-500">
                        Configuración local
                    </p>
                </div>
            </section>

            {guardado && (
                <section className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <div>
                            <h3 className="text-sm font-black text-emerald-800">
                                Configuración actualizada
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-emerald-700">
                                Los módulos de Caja, Cierre, Reportes, Recibos y
                                Exportaciones usarán estos datos.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Datos generales de la clínica
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Información principal usada en recibos y documentos
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                    <Settings className="h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </div>

                        <form onSubmit={guardarConfiguracion} className="p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Nombre de la clínica
                                </label>
                                <input
                                    value={formulario.nombreClinica}
                                    onChange={(event) =>
                                        actualizarCampo(
                                            "nombreClinica",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ejemplo: Clínica Odontológica Hernández"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Teléfono
                                    </label>
                                    <input
                                        value={formulario.telefono}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "telefono",
                                                event.target.value
                                            )
                                        }
                                        placeholder="0000-0000"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        WhatsApp
                                    </label>
                                    <input
                                        value={formulario.whatsapp}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "whatsapp",
                                                event.target.value
                                            )
                                        }
                                        placeholder="0000-0000"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Correo
                                    </label>
                                    <input
                                        value={formulario.correo}
                                        onChange={(event) =>
                                            actualizarCampo("correo", event.target.value)
                                        }
                                        placeholder="clinica@correo.com"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        RUC / Identificación fiscal
                                    </label>
                                    <input
                                        value={formulario.ruc}
                                        onChange={(event) =>
                                            actualizarCampo("ruc", event.target.value)
                                        }
                                        placeholder="No registrado"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Dirección
                                </label>
                                <textarea
                                    value={formulario.direccion}
                                    onChange={(event) =>
                                        actualizarCampo(
                                            "direccion",
                                            event.target.value
                                        )
                                    }
                                    rows={3}
                                    placeholder="Dirección completa de la clínica"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
                                    <BadgeDollarSign className="h-4 w-4 text-teal-700" />
                                    Moneda
                                </h4>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold text-slate-600">
                                            Moneda
                                        </label>
                                        <input
                                            value={formulario.moneda}
                                            onChange={(event) =>
                                                actualizarCampo(
                                                    "moneda",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Córdoba nicaragüense"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-bold text-slate-600">
                                            Símbolo
                                        </label>
                                        <input
                                            value={formulario.simboloMoneda}
                                            onChange={(event) =>
                                                actualizarCampo(
                                                    "simboloMoneda",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="C$"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {monedasSugeridas.map((item) => (
                                        <button
                                            key={item.moneda}
                                            type="button"
                                            onClick={() =>
                                                aplicarMoneda(item.moneda, item.simbolo)
                                            }
                                            className="rounded-xl bg-white px-4 py-2 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-teal-50 hover:text-teal-700"
                                        >
                                            {item.simbolo} {item.moneda}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 rounded-3xl bg-blue-50 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="flex items-center gap-2 text-sm font-black text-blue-900">
                                            <CreditCard className="h-4 w-4 text-blue-700" />
                                            POS / Bancos
                                        </h4>
                                        <p className="mt-1 text-xs leading-5 text-blue-700">
                                            Configurá varios POS con comisiones distintas.
                                            Después en Caja se podrá elegir cuál POS se usó
                                            en cada venta con tarjeta.
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-blue-700">
                                        {cantidadPOSActivos} activo(s)
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3">
                                    {formulario.poses.map((pos) => (
                                        <div
                                            key={pos.id}
                                            className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm"
                                        >
                                            <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px]">
                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                                        Nombre POS
                                                    </label>
                                                    <input
                                                        value={pos.nombre}
                                                        onChange={(event) =>
                                                            actualizarPOS(
                                                                pos.id,
                                                                "nombre",
                                                                event.target.value
                                                            )
                                                        }
                                                        placeholder="POS BAC"
                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                                        Banco / Proveedor
                                                    </label>
                                                    <input
                                                        value={pos.banco}
                                                        onChange={(event) =>
                                                            actualizarPOS(
                                                                pos.id,
                                                                "banco",
                                                                event.target.value
                                                            )
                                                        }
                                                        placeholder="BAC, Banpro, Lafise..."
                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                                        Comisión %
                                                    </label>
                                                    <input
                                                        value={pos.comision}
                                                        onChange={(event) =>
                                                            actualizarPOS(
                                                                pos.id,
                                                                "comision",
                                                                numero(event.target.value)
                                                            )
                                                        }
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        placeholder="4"
                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => alternarPOS(pos.id)}
                                                    className={`rounded-xl px-4 py-2 text-[11px] font-black ${pos.activo
                                                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                        }`}
                                                >
                                                    {pos.activo ? "Activo" : "Inactivo"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => eliminarPOS(pos.id)}
                                                    className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-[11px] font-black text-red-700 hover:bg-red-100"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 rounded-3xl border border-dashed border-blue-200 bg-white/70 p-4">
                                    <h5 className="text-sm font-black text-slate-800">
                                        Agregar nuevo POS
                                    </h5>

                                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_140px]">
                                        <input
                                            value={nuevoPOS.nombre}
                                            onChange={(event) =>
                                                actualizarNuevoPOS(
                                                    "nombre",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Nombre. Ej: POS BAC"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        />

                                        <input
                                            value={nuevoPOS.banco}
                                            onChange={(event) =>
                                                actualizarNuevoPOS(
                                                    "banco",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Banco. Ej: BAC"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        />

                                        <input
                                            value={nuevoPOS.comision}
                                            onChange={(event) =>
                                                actualizarNuevoPOS(
                                                    "comision",
                                                    event.target.value
                                                )
                                            }
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            placeholder="4"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={agregarPOS}
                                        className="mt-3 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] hover:bg-blue-700"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Agregar POS
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Mensaje para recibos
                                </label>
                                <textarea
                                    value={formulario.mensajeRecibo}
                                    onChange={(event) =>
                                        actualizarCampo(
                                            "mensajeRecibo",
                                            event.target.value
                                        )
                                    }
                                    rows={4}
                                    placeholder="Gracias por su preferencia."
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90">
                                    <Save className="h-4 w-4" />
                                    Guardar configuración
                                </button>

                                <button
                                    type="button"
                                    onClick={restaurarConfiguracion}
                                    className="flex items-center gap-2 rounded-xl bg-amber-50 px-5 py-3 text-[12px] font-bold text-amber-700 hover:bg-amber-100"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Restaurar predeterminada
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                            <div>
                                <h3 className="text-sm font-black text-amber-800">
                                    Configuración local
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    Estos datos se guardan en este navegador. Cuando
                                    migremos a Supabase, esta configuración se guardará
                                    en la base de datos real de la clínica.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-6 text-white">
                            <Sparkles className="absolute right-8 top-1/2 h-24 w-24 -translate-y-1/2 opacity-10" />

                            <div className="relative z-10 flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                                    <Eye className="h-6 w-6" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-black">
                                        Vista previa
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-white/75">
                                        Así se verán los datos principales en recibos,
                                        reportes y documentos.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                                <div className="text-center">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 text-white">
                                        <ReceiptText className="h-8 w-8" />
                                    </div>

                                    <h3 className="mt-4 text-xl font-black text-slate-900">
                                        {formulario.nombreClinica ||
                                            "Nombre de la clínica"}
                                    </h3>

                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                        {formulario.direccion ||
                                            "Dirección no registrada"}
                                    </p>

                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                        RUC: {formulario.ruc || "No registrado"}
                                    </p>
                                </div>

                                <div className="mt-6 grid gap-3">
                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                                        <Phone className="h-4 w-4 text-teal-700" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Teléfono
                                            </p>
                                            <p className="text-sm font-black text-slate-800">
                                                {formulario.telefono || "No registrado"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                                        <MessageCircle className="h-4 w-4 text-emerald-700" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                WhatsApp
                                            </p>
                                            <p className="text-sm font-black text-slate-800">
                                                {formulario.whatsapp || "No registrado"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                                        <Mail className="h-4 w-4 text-blue-700" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Correo
                                            </p>
                                            <p className="text-sm font-black text-slate-800">
                                                {formulario.correo || "No registrado"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                                        <MapPin className="h-4 w-4 text-red-700" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                Dirección
                                            </p>
                                            <p className="text-sm font-black text-slate-800">
                                                {formulario.direccion || "No registrada"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 rounded-3xl bg-slate-900 p-5 text-white">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                                                Ejemplo de venta con tarjeta
                                            </p>
                                            <h4 className="mt-2 text-2xl font-black">
                                                {formatoMoneda(
                                                    ventaEjemplo,
                                                    formulario.simboloMoneda || "C$"
                                                )}
                                            </h4>
                                            <p className="mt-1 text-xs text-white/45">
                                                POS ejemplo:{" "}
                                                {posEjemplo
                                                    ? `${posEjemplo.nombre} · ${posEjemplo.banco}`
                                                    : "No configurado"}
                                            </p>
                                        </div>

                                        <FileText className="h-8 w-8 text-teal-300" />
                                    </div>

                                    <div className="mt-5 space-y-2 text-sm">
                                        <div className="flex justify-between gap-3">
                                            <span className="text-white/50">
                                                Comisión POS
                                            </span>
                                            <span className="font-bold">
                                                {formatoMoneda(
                                                    comisionEjemplo,
                                                    formulario.simboloMoneda || "C$"
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex justify-between gap-3">
                                            <span className="text-white/50">
                                                Neto tarjeta
                                            </span>
                                            <span className="font-bold text-teal-300">
                                                {formatoMoneda(
                                                    netoEjemplo,
                                                    formulario.simboloMoneda || "C$"
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="mt-5 rounded-2xl bg-white/10 p-4 text-xs leading-5 text-white/65">
                                        {formulario.mensajeRecibo ||
                                            "Gracias por su preferencia."}
                                    </p>
                                </div>

                                <div className="mt-5 rounded-3xl bg-blue-50 p-5">
                                    <h4 className="flex items-center gap-2 text-sm font-black text-blue-900">
                                        <CreditCard className="h-4 w-4 text-blue-700" />
                                        POS configurados
                                    </h4>

                                    <div className="mt-4 space-y-2">
                                        {formulario.poses.map((pos) => (
                                            <div
                                                key={pos.id}
                                                className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 text-xs"
                                            >
                                                <div>
                                                    <p className="font-black text-slate-800">
                                                        {pos.nombre}
                                                    </p>
                                                    <p className="mt-0.5 text-slate-500">
                                                        {pos.banco}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p className="font-black text-blue-700">
                                                        {pos.comision}%
                                                    </p>
                                                    <p
                                                        className={`mt-0.5 font-bold ${pos.activo
                                                                ? "text-emerald-600"
                                                                : "text-slate-400"
                                                            }`}
                                                    >
                                                        {pos.activo
                                                            ? "Activo"
                                                            : "Inactivo"}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="text-[16px] font-bold text-slate-800">
                            Impacto en módulos
                        </h3>

                        <div className="mt-4 grid gap-3">
                            <div className="rounded-2xl bg-teal-50 p-4">
                                <p className="flex items-center gap-2 text-xs font-bold text-teal-700">
                                    <ReceiptText className="h-4 w-4" />
                                    Recibos
                                </p>
                                <p className="mt-2 text-xs leading-5 text-slate-600">
                                    Usan nombre de clínica, teléfono, dirección, RUC
                                    y mensaje.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-blue-50 p-4">
                                <p className="flex items-center gap-2 text-xs font-bold text-blue-700">
                                    <CreditCard className="h-4 w-4" />
                                    Caja y Cierre
                                </p>
                                <p className="mt-2 text-xs leading-5 text-slate-600">
                                    Usarán el POS seleccionado para calcular la comisión
                                    real de tarjeta.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-amber-50 p-4">
                                <p className="flex items-center gap-2 text-xs font-bold text-amber-700">
                                    <Percent className="h-4 w-4" />
                                    Reportes
                                </p>
                                <p className="mt-2 text-xs leading-5 text-slate-600">
                                    Podrán diferenciar ingresos por banco/POS y comisión.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-50 p-4">
                                <p className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                                    <ShieldCheck className="h-4 w-4" />
                                    Exportaciones
                                </p>
                                <p className="mt-2 text-xs leading-5 text-slate-600">
                                    Incluirán nombre de clínica, moneda y datos del POS.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}