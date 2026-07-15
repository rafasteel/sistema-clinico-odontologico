"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Crown,
    Edit3,
    Eye,
    EyeOff,
    KeyRound,
    LockKeyhole,
    Plus,
    RefreshCcw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Stethoscope,
    Trash2,
    UserCog,
    UserRound,
    Users,
    WalletCards,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
    EstadoUsuarioSistema,
    guardarUsuariosSistema,
    obtenerUsuariosSistema,
    RolUsuario,
    SESION_KEY,
    UsuarioApp,
    UsuarioSesion,
} from "@/lib/usuariosSistema";

type FormularioUsuario = {
    usuario: string;
    password: string;
    nombre: string;
    rol: RolUsuario;
    estado: EstadoUsuarioSistema;
};

const formularioVacio: FormularioUsuario = {
    usuario: "",
    password: "",
    nombre: "",
    rol: "RECEPCION",
    estado: "Activo",
};

const roles: RolUsuario[] = ["ADMIN", "DOCTOR", "RECEPCION", "CAJA"];

function fechaHoyLocal() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function iniciales(nombre: string) {
    const partes = nombre.trim().split(" ").filter(Boolean);

    if (partes.length === 0) return "US";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function colorRol(rol: RolUsuario) {
    if (rol === "ADMIN") return "bg-slate-900 text-white";
    if (rol === "DOCTOR") return "bg-teal-50 text-teal-700 border border-teal-100";
    if (rol === "RECEPCION")
        return "bg-indigo-50 text-indigo-700 border border-indigo-100";

    return "bg-emerald-50 text-emerald-700 border border-emerald-100";
}

function colorEstado(estado: EstadoUsuarioSistema) {
    if (estado === "Activo") {
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    }

    return "bg-red-50 text-red-700 border border-red-100";
}

function descripcionRol(rol: RolUsuario) {
    if (rol === "ADMIN") {
        return "Acceso completo a administración, reportes, respaldo, caja, inventario y configuración.";
    }

    if (rol === "DOCTOR") {
        return "Acceso clínico a agenda, pacientes, historial, odontograma y servicios.";
    }

    if (rol === "RECEPCION") {
        return "Acceso a agenda, pacientes, doctores, servicios y apoyo en caja.";
    }

    return "Acceso operativo a caja, ventas, cierres y cobros.";
}

function iconoRol(rol: RolUsuario) {
    if (rol === "ADMIN") return Crown;
    if (rol === "DOCTOR") return Stethoscope;
    if (rol === "RECEPCION") return UserRound;

    return WalletCards;
}

export default function AdministracionPage() {
    const [sesion, setSesion] = useState<UsuarioSesion | null>(null);
    const [usuarios, setUsuarios] = useState<UsuarioApp[]>([]);
    const [formulario, setFormulario] =
        useState<FormularioUsuario>(formularioVacio);
    const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(
        null
    );

    const [busqueda, setBusqueda] = useState("");
    const [filtroRol, setFiltroRol] = useState<RolUsuario | "Todos">("Todos");
    const [filtroEstado, setFiltroEstado] = useState<
        EstadoUsuarioSistema | "Todos"
    >("Todos");
    const [mostrarPassword, setMostrarPassword] = useState(false);

    useEffect(() => {
        const sesionGuardada = localStorage.getItem(SESION_KEY);

        if (sesionGuardada) {
            setSesion(JSON.parse(sesionGuardada) as UsuarioSesion);
        }

        setUsuarios(obtenerUsuariosSistema());
    }, []);

    const puedeEditar = sesion?.rol === "ADMIN";

    function guardarListaUsuarios(nuevaLista: UsuarioApp[]) {
        setUsuarios(nuevaLista);
        guardarUsuariosSistema(nuevaLista);
    }

    function actualizarCampo<K extends keyof FormularioUsuario>(
        campo: K,
        valor: FormularioUsuario[K]
    ) {
        setFormulario((datosActuales) => ({
            ...datosActuales,
            [campo]: valor,
        }));
    }

    function limpiarFormulario() {
        setFormulario(formularioVacio);
        setUsuarioEditandoId(null);
        setMostrarPassword(false);
    }

    function guardarUsuario(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!puedeEditar) {
            alert("Solo el administrador puede modificar usuarios.");
            return;
        }

        if (!formulario.usuario.trim()) {
            alert("El usuario es obligatorio.");
            return;
        }

        if (!formulario.nombre.trim()) {
            alert("El nombre completo es obligatorio.");
            return;
        }

        if (!formulario.password.trim()) {
            alert("La contraseña es obligatoria.");
            return;
        }

        const usuarioNormalizado = formulario.usuario.trim().toLowerCase();

        const usuarioDuplicado = usuarios.some(
            (item) =>
                item.usuario.toLowerCase() === usuarioNormalizado &&
                item.id !== usuarioEditandoId
        );

        if (usuarioDuplicado) {
            alert("Ya existe un usuario con ese nombre de acceso.");
            return;
        }

        if (usuarioEditandoId) {
            const nuevaLista = usuarios.map((usuario) =>
                usuario.id === usuarioEditandoId
                    ? {
                        ...usuario,
                        usuario: usuarioNormalizado,
                        password: formulario.password.trim(),
                        nombre: formulario.nombre.trim(),
                        rol: formulario.rol,
                        estado: formulario.estado,
                    }
                    : usuario
            );

            guardarListaUsuarios(nuevaLista);
            limpiarFormulario();

            alert("Usuario actualizado correctamente.");
            return;
        }

        const nuevoUsuario: UsuarioApp = {
            id: `USER-${Date.now()}`,
            usuario: usuarioNormalizado,
            password: formulario.password.trim(),
            nombre: formulario.nombre.trim(),
            rol: formulario.rol,
            estado: formulario.estado,
            creadoEn: fechaHoyLocal(),
        };

        guardarListaUsuarios([nuevoUsuario, ...usuarios]);
        limpiarFormulario();

        alert("Usuario registrado correctamente.");
    }

    function editarUsuario(usuario: UsuarioApp) {
        if (!puedeEditar) {
            alert("Solo el administrador puede modificar usuarios.");
            return;
        }

        setUsuarioEditandoId(usuario.id);
        setFormulario({
            usuario: usuario.usuario,
            password: usuario.password,
            nombre: usuario.nombre,
            rol: usuario.rol,
            estado: usuario.estado,
        });
    }

    function cambiarEstadoUsuario(usuario: UsuarioApp) {
        if (!puedeEditar) {
            alert("Solo el administrador puede modificar usuarios.");
            return;
        }

        if (sesion?.usuario === usuario.usuario && usuario.estado === "Activo") {
            alert("No podés desactivar tu propio usuario mientras estás conectado.");
            return;
        }

        const confirmar = window.confirm(
            `¿Seguro que deseas ${usuario.estado === "Activo" ? "desactivar" : "activar"
            } este usuario?`
        );

        if (!confirmar) return;

        const nuevaLista = usuarios.map((item) =>
            item.id === usuario.id
                ? {
                    ...item,
                    estado: item.estado === "Activo" ? "Inactivo" : "Activo",
                }
                : item
        );

        guardarListaUsuarios(nuevaLista);
    }

    function generarPasswordTemporal(usuario: UsuarioApp) {
        if (!puedeEditar) {
            alert("Solo el administrador puede modificar contraseñas.");
            return;
        }

        const confirmar = window.confirm(
            `¿Generar nueva contraseña temporal para ${usuario.nombre}?`
        );

        if (!confirmar) return;

        const nuevaPassword = `Temp${Math.floor(100000 + Math.random() * 900000)}`;

        const nuevaLista = usuarios.map((item) =>
            item.id === usuario.id
                ? {
                    ...item,
                    password: nuevaPassword,
                }
                : item
        );

        guardarListaUsuarios(nuevaLista);

        alert(`Nueva contraseña temporal: ${nuevaPassword}`);
    }

    function restaurarUsuariosIniciales() {
        if (!puedeEditar) {
            alert("Solo el administrador puede restaurar usuarios.");
            return;
        }

        const confirmar = window.confirm(
            "Esto restaurará los usuarios demo iniciales si fueron eliminados o modificados. ¿Deseas continuar?"
        );

        if (!confirmar) return;

        localStorage.removeItem("usuarios_app_sistema_clinico");
        const usuariosRestaurados = obtenerUsuariosSistema();

        setUsuarios(usuariosRestaurados);
        limpiarFormulario();

        alert("Usuarios iniciales restaurados correctamente.");
    }

    const usuariosFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();

        return usuarios.filter((usuario) => {
            const coincideTexto =
                !texto ||
                usuario.usuario.toLowerCase().includes(texto) ||
                usuario.nombre.toLowerCase().includes(texto) ||
                usuario.rol.toLowerCase().includes(texto) ||
                usuario.estado.toLowerCase().includes(texto);

            const coincideRol = filtroRol === "Todos" || usuario.rol === filtroRol;

            const coincideEstado =
                filtroEstado === "Todos" || usuario.estado === filtroEstado;

            return coincideTexto && coincideRol && coincideEstado;
        });
    }, [usuarios, busqueda, filtroRol, filtroEstado]);

    const usuariosActivos = usuarios.filter(
        (usuario) => usuario.estado === "Activo"
    ).length;

    const usuariosInactivos = usuarios.filter(
        (usuario) => usuario.estado === "Inactivo"
    ).length;

    const administradores = usuarios.filter(
        (usuario) => usuario.rol === "ADMIN"
    ).length;

    const usuariosClinicos = usuarios.filter(
        (usuario) => usuario.rol === "DOCTOR" || usuario.rol === "RECEPCION"
    ).length;

    return (
        <AppShell
            titulo="Administración"
            descripcion="Gestión de usuarios, roles, accesos y seguridad del sistema"
            moduloActivo="Administración"
        >
            {!puedeEditar && (
                <section className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                            <h3 className="text-sm font-black text-amber-800">
                                Modo consulta
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Tu rol puede ver esta información, pero solo ADMIN puede crear,
                                editar, activar, desactivar o cambiar contraseñas.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid gap-4 lg:grid-cols-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <Users className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                            Total
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {usuarios.length}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Usuarios registrados
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Activos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {usuariosActivos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Usuarios con acceso
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <Crown className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            Admin
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {administradores}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Administradores
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                            <LockKeyhole className="h-[18px] w-[18px]" />
                        </div>
                        <span className="mono rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Inactivos
                        </span>
                    </div>

                    <h3 className="mt-4 text-[30px] font-bold leading-none text-slate-800">
                        {usuariosInactivos}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">
                        Accesos bloqueados
                    </p>
                </div>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        {usuarioEditandoId ? "Editar usuario" : "Nuevo usuario"}
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Acceso interno por rol del sistema
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                    <UserCog className="h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </div>

                        <form onSubmit={guardarUsuario} className="p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-600">
                                    Nombre completo
                                </label>
                                <input
                                    value={formulario.nombre}
                                    onChange={(event) =>
                                        actualizarCampo("nombre", event.target.value)
                                    }
                                    disabled={!puedeEditar}
                                    placeholder="Ejemplo: Ana Martínez"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Usuario
                                    </label>
                                    <input
                                        value={formulario.usuario}
                                        onChange={(event) =>
                                            actualizarCampo("usuario", event.target.value)
                                        }
                                        disabled={!puedeEditar}
                                        placeholder="usuario"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Contraseña
                                    </label>

                                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                                        <input
                                            value={formulario.password}
                                            onChange={(event) =>
                                                actualizarCampo("password", event.target.value)
                                            }
                                            disabled={!puedeEditar}
                                            type={mostrarPassword ? "text" : "password"}
                                            placeholder="Contraseña temporal"
                                            className="w-full bg-transparent text-[13px] font-medium outline-none disabled:text-slate-400"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setMostrarPassword((valor) => !valor)}
                                            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                        >
                                            {mostrarPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Rol
                                    </label>
                                    <select
                                        value={formulario.rol}
                                        onChange={(event) =>
                                            actualizarCampo("rol", event.target.value as RolUsuario)
                                        }
                                        disabled={!puedeEditar}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        {roles.map((rol) => (
                                            <option key={rol}>{rol}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Estado
                                    </label>
                                    <select
                                        value={formulario.estado}
                                        onChange={(event) =>
                                            actualizarCampo(
                                                "estado",
                                                event.target.value as EstadoUsuarioSistema
                                            )
                                        }
                                        disabled={!puedeEditar}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option>Activo</option>
                                        <option>Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                                <h4 className="text-sm font-black text-slate-800">
                                    Permisos del rol seleccionado
                                </h4>
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    {descripcionRol(formulario.rol)}
                                </p>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    disabled={!puedeEditar}
                                    className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(13,148,136,0.35)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    {usuarioEditandoId ? "Guardar cambios" : "Registrar usuario"}
                                </button>

                                <button
                                    type="button"
                                    onClick={limpiarFormulario}
                                    className="rounded-xl bg-white px-5 py-3 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Limpiar
                                </button>

                                <button
                                    type="button"
                                    onClick={restaurarUsuariosIniciales}
                                    disabled={!puedeEditar}
                                    className="flex items-center gap-2 rounded-xl bg-amber-50 px-5 py-3 text-[12px] font-bold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Restaurar demo
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                            <div>
                                <h3 className="text-sm font-black text-amber-800">
                                    Seguridad temporal
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    En esta etapa las contraseñas se guardan localmente en este
                                    navegador. Cuando migremos a Supabase, el login usará
                                    autenticación real y segura.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h3 className="text-[16px] font-bold text-slate-800">
                                        Usuarios del sistema
                                    </h3>
                                    <p className="mono mt-0.5 text-[10px] text-slate-400">
                                        Accesos internos, roles y estados
                                    </p>
                                </div>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                                    {usuariosFiltrados.length} resultado(s)
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_150px_150px]">
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                    <Search className="h-4 w-4 text-slate-400" />
                                    <input
                                        value={busqueda}
                                        onChange={(event) => setBusqueda(event.target.value)}
                                        placeholder="Buscar usuario..."
                                        className="w-full bg-transparent text-[13px] font-medium outline-none"
                                    />
                                </div>

                                <select
                                    value={filtroRol}
                                    onChange={(event) =>
                                        setFiltroRol(event.target.value as RolUsuario | "Todos")
                                    }
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option>Todos</option>
                                    {roles.map((rol) => (
                                        <option key={rol}>{rol}</option>
                                    ))}
                                </select>

                                <select
                                    value={filtroEstado}
                                    onChange={(event) =>
                                        setFiltroEstado(
                                            event.target.value as EstadoUsuarioSistema | "Todos"
                                        )
                                    }
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                >
                                    <option>Todos</option>
                                    <option>Activo</option>
                                    <option>Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="max-h-[820px] overflow-y-auto p-4">
                            <div className="space-y-3">
                                {usuariosFiltrados.map((usuario) => {
                                    const Icono = iconoRol(usuario.rol);
                                    const esSesionActual = sesion?.usuario === usuario.usuario;

                                    return (
                                        <div
                                            key={usuario.id}
                                            className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-sm font-black text-white">
                                                    {iniciales(usuario.nombre)}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="text-sm font-black text-slate-800">
                                                            {usuario.nombre}
                                                        </h4>

                                                        {esSesionActual && (
                                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                                                                Sesión actual
                                                            </span>
                                                        )}

                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorEstado(
                                                                usuario.estado
                                                            )}`}
                                                        >
                                                            {usuario.estado}
                                                        </span>
                                                    </div>

                                                    <p className="mono mt-1 text-[11px] text-slate-400">
                                                        Usuario: {usuario.usuario}
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <span
                                                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black ${colorRol(
                                                                usuario.rol
                                                            )}`}
                                                        >
                                                            <Icono className="h-3.5 w-3.5" />
                                                            {usuario.rol}
                                                        </span>

                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                            Creado: {usuario.creadoEn || "Sin fecha"}
                                                        </span>

                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                                                            Clave: {usuario.password}
                                                        </span>
                                                    </div>

                                                    <p className="mt-3 text-xs leading-5 text-slate-500">
                                                        {descripcionRol(usuario.rol)}
                                                    </p>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => editarUsuario(usuario)}
                                                            disabled={!puedeEditar}
                                                            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                            Editar
                                                        </button>

                                                        <button
                                                            onClick={() => generarPasswordTemporal(usuario)}
                                                            disabled={!puedeEditar}
                                                            className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <KeyRound className="h-3.5 w-3.5" />
                                                            Nueva clave
                                                        </button>

                                                        <button
                                                            onClick={() => cambiarEstadoUsuario(usuario)}
                                                            disabled={!puedeEditar}
                                                            className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            {usuario.estado === "Activo"
                                                                ? "Desactivar"
                                                                : "Activar"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {usuariosFiltrados.length === 0 && (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                                        <Users className="mx-auto h-10 w-10 text-slate-300" />
                                        <h4 className="mt-3 text-sm font-black text-slate-700">
                                            No encontramos usuarios
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Probá cambiar filtros o registrar uno nuevo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl">
                        <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-6 text-white">
                            <ShieldCheck className="absolute right-8 top-1/2 h-24 w-24 -translate-y-1/2 opacity-10" />

                            <div className="relative z-10">
                                <h3 className="text-xl font-black">Mapa de roles</h3>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
                                    Cada rol controla qué módulos aparecen en el menú principal.
                                    Esto ayuda a separar funciones clínicas, administrativas y de
                                    caja.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 p-4 md:grid-cols-2">
                            {roles.map((rol) => {
                                const Icono = iconoRol(rol);
                                const cantidad = usuarios.filter(
                                    (usuario) => usuario.rol === rol
                                ).length;

                                return (
                                    <div
                                        key={rol}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                                    <Icono className="h-5 w-5" />
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800">
                                                        {rol}
                                                    </h4>
                                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                                        {cantidad} usuario(s)
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colorRol(
                                                    rol
                                                )}`}
                                            >
                                                Rol
                                            </span>
                                        </div>

                                        <p className="mt-3 text-xs leading-5 text-slate-500">
                                            {descripcionRol(rol)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}