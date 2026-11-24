import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as crypto from "node:crypto";
import ts from "typescript";

// Ejecuta el handler real con proveedores aislados. Nunca usa una base real
// ni crea cuentas. Una mutación inesperada hace fallar la prueba.
const source = fs.readFileSync(new URL("../src/app/api/administracion/usuarios/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const perfil = {
    id: "perfil-admin", auth_user_id: "auth-admin", clinica_id: "clinica-A",
    nombre: "Administrador", usuario: "admin", correo: "admin@example.invalid",
    rol: "ADMIN", estado: "Activo",
};

function preparar({ solicitante = perfil, objetivo = perfil, sesionValida = true,
    acceso = { permitido: true }, falloLicencia = false } = {}) {
    let mutaciones = 0;
    let consultasLicencia = 0;
    const prohibirMutacion = () => { mutaciones++; throw new Error("Mutación no esperada"); };
    const cliente = {
        auth: {
            getUser: async () => ({ data: { user: sesionValida ? { id: perfil.auth_user_id } : null }, error: null }),
            admin: { createUser: prohibirMutacion, updateUserById: prohibirMutacion, deleteUser: prohibirMutacion },
        },
        from: () => {
            const filtros = {};
            const consulta = {
                select: () => consulta,
                eq: (campo, valor) => { filtros[campo] = valor; return consulta; },
                maybeSingle: async () => {
                    const encontrado = filtros.auth_user_id ? solicitante : objetivo;
                    const coincide = encontrado && Object.entries(filtros).every(([campo, valor]) => encontrado[campo] === valor);
                    return { data: coincide ? encontrado : null, error: null };
                },
                insert: prohibirMutacion, update: prohibirMutacion, delete: prohibirMutacion,
            };
            return consulta;
        },
    };
    const modulo = { exports: {} };
    vm.runInNewContext(compiled, {
        exports: modulo.exports, module: modulo,
        require: (nombre) => {
            if (nombre === "next/server") return { NextResponse: { json: Response.json } };
            if (nombre === "node:crypto") return crypto;
            if (nombre === "@/lib/supabase/serverAdmin") return {
                crearClienteSupabaseAdmin: () => cliente,
                crearClienteSupabaseSesion: () => ({ rpc: async () => {
                    consultasLicencia++;
                    return { data: acceso, error: falloLicencia ? { message: "No disponible" } : null };
                } }),
            };
            throw new Error(`Import inesperado: ${nombre}`);
        },
    });
    return {
        enviar: async (body = { accion: "prueba_sin_mutacion" }, authorization = "Bearer sesion") => {
            const respuesta = await modulo.exports.POST(new Request("http://localhost/api/administracion/usuarios", {
                method: "POST", headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
                body: JSON.stringify(body),
            }));
            assert.equal(mutaciones, 0, "Una solicitud rechazada no debe modificar Auth ni la base");
            return { status: respuesta.status, body: await respuesta.json() };
        },
        consultasLicencia: () => consultasLicencia,
    };
}

for (const token of ["", "sesion", "Basic sesion", "Bearer uno dos"]) {
    test(`Rechaza cabecera de sesión inválida: ${token || "ausente"}`, async () => {
        assert.equal((await preparar().enviar(undefined, token)).status, 401);
    });
}
test("Rechaza token no verificado por Auth", async () => {
    assert.equal((await preparar({ sesionValida: false }).enviar()).status, 401);
});
for (const rol of ["DOCTOR", "RECEPCION", "CAJA", "SUPER_ADMIN"]) {
    test(`${rol} no administra usuarios desde la API de clínica`, async () => {
        assert.equal((await preparar({ solicitante: { ...perfil, rol } }).enviar()).status, 403);
    });
}
for (const solicitante of [null, { ...perfil, estado: "Inactivo" }, { ...perfil, clinica_id: null }]) {
    test(`Rechaza perfil sin autorización: ${JSON.stringify(solicitante)}`, async () => {
        const api = preparar({ solicitante });
        assert.equal((await api.enviar()).status, 403);
        assert.equal(api.consultasLicencia(), 0);
    });
}
for (const estadoAcceso of ["Suspendido", "Cancelado", "SinClinica", "SinPerfil"]) {
    test(`No usa service_role cuando la licencia deniega ${estadoAcceso}`, async () => {
        assert.equal((await preparar({ acceso: { permitido: false, estadoAcceso } }).enviar()).status, 403);
    });
}
test("Fallo de verificación de licencia cierra el acceso", async () => {
    assert.equal((await preparar({ falloLicencia: true }).enviar()).status, 503);
});
test("ADMIN activo consulta la licencia antes de despachar acciones", async () => {
    const api = preparar();
    const respuesta = await api.enviar();
    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.mensaje, "Acción no reconocida.");
    assert.equal(api.consultasLicencia(), 1);
});
const datos = { usuario: perfil.usuario, correo: perfil.correo, nombre: perfil.nombre, rol: "ADMIN", estado: "Activo" };
test("No crea SUPER_ADMIN aunque el cliente envíe ese rol", async () => {
    const respuesta = await preparar().enviar({ ...datos, accion: "crear", password: "solo-prueba-aislada", rol: "SUPER_ADMIN" });
    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.mensaje, "Rol inválido.");
});
test("No convierte un perfil existente en SUPER_ADMIN", async () => {
    const respuesta = await preparar().enviar({ ...datos, id: perfil.id, accion: "actualizar", rol: "SUPER_ADMIN" });
    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.body.mensaje, "Rol inválido.");
});
for (const cambio of [{ estado: "Inactivo" }, { rol: "DOCTOR" }]) {
    test(`ADMIN no pierde su acceso mediante actualizar: ${JSON.stringify(cambio)}`, async () => {
        const respuesta = await preparar().enviar({ ...datos, ...cambio, id: perfil.id, accion: "actualizar" });
        assert.equal(respuesta.status, 400);
        assert.match(respuesta.body.mensaje, /propio usuario/);
    });
}
test("ADMIN no se desactiva mediante cambiar_estado", async () => {
    const respuesta = await preparar().enviar({ id: perfil.id, accion: "cambiar_estado", estado: "Inactivo" });
    assert.equal(respuesta.status, 400);
    assert.match(respuesta.body.mensaje, /propio usuario/);
});
for (const accion of ["actualizar", "cambiar_estado", "generar_password"]) {
    test(`${accion} no permite elegir un usuario de otra clínica`, async () => {
        const otro = { ...perfil, id: "otro-perfil", clinica_id: "clinica-B" };
        const respuesta = await preparar({ objetivo: otro }).enviar({ ...datos, id: otro.id, accion });
        assert.equal(respuesta.status, 400);
        assert.equal(respuesta.body.mensaje, "No se encontró el usuario seleccionado.");
    });
}
