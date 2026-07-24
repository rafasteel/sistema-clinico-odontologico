export type RolUsuario = "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "RECEPCION" | "CAJA";

export type EstadoUsuarioSistema = "Activo" | "Inactivo";

export type UsuarioApp = {
    id: string;
    usuario: string;
    password: string;
    nombre: string;
    rol: RolUsuario;
    estado: EstadoUsuarioSistema;
    creadoEn: string;
};

export type UsuarioSesion = {
    usuario: string;
    nombre: string;
    rol: RolUsuario;
};

export const USUARIOS_KEY = "usuarios_app_sistema_clinico";
export const SESION_KEY = "usuario_sistema_clinico";

export const usuariosIniciales: UsuarioApp[] = [
    {
        id: "1",
        usuario: "admin",
        password: "admin123",
        nombre: "Administrador",
        rol: "ADMIN",
        estado: "Activo",
        creadoEn: "2026-01-01",
    },
    {
        id: "2",
        usuario: "doctor",
        password: "doctor123",
        nombre: "Doctor Demo",
        rol: "DOCTOR",
        estado: "Activo",
        creadoEn: "2026-01-01",
    },
    {
        id: "3",
        usuario: "recepcion",
        password: "recepcion123",
        nombre: "Recepción Demo",
        rol: "RECEPCION",
        estado: "Activo",
        creadoEn: "2026-01-01",
    },
    {
        id: "4",
        usuario: "caja",
        password: "caja123",
        nombre: "Caja Demo",
        rol: "CAJA",
        estado: "Activo",
        creadoEn: "2026-01-01",
    },
];

export function obtenerUsuariosSistema(): UsuarioApp[] {
    if (typeof window === "undefined") {
        return usuariosIniciales;
    }

    const usuariosGuardados = localStorage.getItem(USUARIOS_KEY);

    if (!usuariosGuardados) {
        localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuariosIniciales));
        return usuariosIniciales;
    }

    try {
        return JSON.parse(usuariosGuardados) as UsuarioApp[];
    } catch {
        localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuariosIniciales));
        return usuariosIniciales;
    }
}

export function guardarUsuariosSistema(usuarios: UsuarioApp[]) {
    if (typeof window === "undefined") return;

    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
}

export function guardarSesion(usuario: UsuarioSesion) {
    if (typeof window === "undefined") return;

    localStorage.setItem(SESION_KEY, JSON.stringify(usuario));
}

export function cerrarSesion() {
    if (typeof window === "undefined") return;

    localStorage.removeItem(SESION_KEY);
}

export function validarLogin(usuarioTexto: string, passwordTexto: string) {
    const usuarios = obtenerUsuariosSistema();

    const usuarioEncontrado = usuarios.find(
        (item) =>
            item.usuario.toLowerCase() === usuarioTexto.trim().toLowerCase() &&
            item.password === passwordTexto.trim()
    );

    if (!usuarioEncontrado) {
        return {
            ok: false,
            mensaje: "Usuario o contraseña incorrectos.",
            usuario: null,
        };
    }

    if (usuarioEncontrado.estado !== "Activo") {
        return {
            ok: false,
            mensaje: "Este usuario está inactivo. Contacta al administrador.",
            usuario: null,
        };
    }

    const usuarioSesion: UsuarioSesion = {
        usuario: usuarioEncontrado.usuario,
        nombre: usuarioEncontrado.nombre,
        rol: usuarioEncontrado.rol,
    };

    return {
        ok: true,
        mensaje: "Inicio de sesión correcto.",
        usuario: usuarioSesion,
    };
}