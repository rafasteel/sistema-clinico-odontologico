import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let db;
let f;
const sql = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
before(async () => {
    db = await PGlite.create();
    await db.exec(sql("./fixtures/esquema-antes-fase2.sql"));
    await db.exec(sql("../supabase/migrations/20261124003536_fase_2_integridad_transacciones.sql"));
    await db.exec(sql("../supabase/migrations/20261124004018_fase_2_conflictos_version.sql"));
    await db.exec(sql("../supabase/migrations/20261124004329_fase_2_cita_cobro_unico.sql"));
    await db.exec(sql("../supabase/migrations/20261124010453_fase_3_coherencia_financiera.sql"));
    await db.exec(sql("../supabase/migrations/20261124011213_fase_3_validacion_solicitud.sql"));
});
after(async () => { await db?.close(); });
beforeEach(async () => {
    f = Object.fromEntries(["clinica", "otra", "auth", "perfil", "paciente", "pacienteAjeno", "producto", "proveedor", "pos"]
        .map((key) => [key, randomUUID()]));
    await db.exec("begin");
    f.hoy = (await db.query("select (statement_timestamp() at time zone 'America/Guatemala')::date::text as hoy")).rows[0].hoy;
    await db.query("insert into public.clinicas(id,nombre,fecha_vencimiento) values ($1,'Prueba','2099-01-01'),($2,'Otra','2099-01-01')", [f.clinica, f.otra]);
    await db.query("insert into auth.users(id,email) values ($1,'prueba@example.invalid')", [f.auth]);
    await db.query("insert into public.usuarios_perfiles(id,auth_user_id,clinica_id,nombre,usuario,correo,rol) values($1,$2,$3,'Admin prueba','prueba','prueba@example.invalid','ADMIN')", [f.perfil,f.auth,f.clinica]);
    await db.query("insert into public.pacientes(id,clinica_id,nombre) values($1,$2,'Paciente'),($3,$4,'Ajeno')", [f.paciente,f.clinica,f.pacienteAjeno,f.otra]);
    await db.query("insert into public.productos_inventario(id,clinica_id,nombre,categoria,unidad,stock,costo_compra) values($1,$2,'Producto','Prueba','Unidad',10,5)", [f.producto,f.clinica]);
    await db.query("insert into public.proveedores(id,clinica_id,nombre) values($1,$2,'Proveedor')", [f.proveedor,f.clinica]);
    await db.query("insert into public.pos_clinica(id,clinica_id,codigo,nombre,comision) values($1,$2,'POS-PRUEBA','POS',4)", [f.pos,f.clinica]);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [f.auth]);
    await db.exec("set local role authenticated");
});
afterEach(async () => { await db.exec("reset role; rollback"); });

async function rpc(operacion, datos, id = randomUUID()) {
    await db.exec("savepoint solicitud");
    try {
        const { rows } = await db.query("select public.ejecutar_operacion_clinica($1,$2::jsonb,$3::uuid) as resultado", [operacion,JSON.stringify(datos),id]);
        await db.exec("release savepoint solicitud");
        return rows[0].resultado;
    } catch (error) {
        await db.exec("rollback to savepoint solicitud; release savepoint solicitud");
        throw error;
    }
}
async function adminQuery(query, params = []) {
    await db.exec("reset role");
    try { return await db.query(query, params); }
    finally { await db.exec("set local role authenticated"); }
}
async function count(table) {
    return Number((await adminQuery(`select count(*) as n from ${table}`)).rows[0].n);
}
const venta = (extras = {}) => ({ cliente_nombre: "Paciente", concepto: "Tratamiento", total: 100, efectivo: 40, credito: 60, ...extras });
const compra = (extras = {}) => ({ proveedor_id:f.proveedor, producto_id:f.producto, cantidad:3, costo_unitario:5, pago_ahora:5, metodo_pago:"Efectivo", fecha_vencimiento:"2099-01-01", ...extras });
const pieza = (estado = "Caries") => ({ codigo:"11",numeroLegacy:1,nombre:"Incisivo",tipo:"Incisivo",arcada:"Superior",cuadrante:"Superior derecho",denticion:"Permanente",
    caras:{sup:estado,der:"Sano",inf:"Sano",izq:"Sano",centro:"Sano"},nota:"Prueba",actualizadoEn:"Ahora" });
const evento = (id = randomUUID()) => ({ id,piezaCodigo:"11",cara:"sup",estado:"Caries",nota:"Hallazgo",usuarioNombre:"Autor falso" });
const odontograma = (extras = {}) => ({ pacienteId:f.paciente,version:0,piezas:[pieza()],historial:[evento()],actualizadoEn:"Ahora", ...extras });

test("Venta y crédito se guardan juntos con saldo coherente", async () => {
    const r = await rpc("venta.registrar", venta({paciente_id:f.paciente}));
    assert.equal(r.venta.total,100); assert.equal(r.cuenta.saldo,60); assert.equal(r.cuenta.abonado,40);
    assert.equal(r.cuenta.venta_id,r.venta.id); assert.equal(r.venta.creado_por,f.perfil);
});
test("Una falla al crear la cuenta revierte la venta y el identificador de solicitud", async () => {
    await assert.rejects(rpc("venta.registrar",venta({fecha_vencimiento_credito:"fecha-invalida"})));
    assert.equal(await count("public.ventas"),0); assert.equal(await count("public.cuentas_cobrar"),0);
    assert.equal(await count("clinica_privada.solicitudes_operacion"),0);
});
test("Reintentar la misma solicitud devuelve los mismos registros", async () => {
    const id = randomUUID(); const datos = venta();
    const a = await rpc("venta.registrar",datos,id); const b = await rpc("venta.registrar",datos,id);
    assert.deepEqual(a,b); assert.equal(await count("public.ventas"),1); assert.equal(await count("public.cuentas_cobrar"),1);
});
test("No se reutiliza el identificador de solicitud con otros datos", async () => {
    const id = randomUUID(); await rpc("venta.registrar",venta(),id);
    await assert.rejects(rpc("venta.registrar",venta({concepto:"Otro"}),id),{code:"22023"});
    assert.equal(await count("public.ventas"),1);
});
for (const cambio of [{total:-1},{total:"NaN"},{efectivo:"Infinity"},{credito:50},{efectivo:110,credito:0},{comision_pos_porcentaje:101}]) {
    test(`Rechaza importes incoherentes: ${JSON.stringify(cambio)}`, async () => {
        await assert.rejects(rpc("venta.registrar",venta(cambio)),{code:"22023"});
        assert.equal(await count("public.ventas"),0);
    });
}
test("La comisión se obtiene del POS y se calcula en centavos", async () => {
    const r = await rpc("venta.registrar",venta({total:10.01,efectivo:0,tarjeta:10.01,credito:0,pos_id:"POS-PRUEBA",comision_pos_porcentaje:4}));
    assert.equal(r.venta.comision_pos_monto,0.4); assert.equal(r.venta.neto_tarjeta,9.61);
    await assert.rejects(rpc("venta.registrar",venta({efectivo:0,tarjeta:100,credito:0,pos_id:"POS-PRUEBA",comision_pos_porcentaje:0})),{code:"22023"});
});
test("Un producto sin stock revierte también venta y crédito", async () => {
    await assert.rejects(rpc("venta.registrar",venta({tipo_cobro:"Producto",producto_id:f.producto,cantidad_producto:11})),{code:"22023"});
    assert.equal(await count("public.ventas"),0); assert.equal(await count("public.cuentas_cobrar"),0); assert.equal(await count("public.movimientos_inventario"),0);
    assert.equal(Number((await adminQuery("select stock from public.productos_inventario where id=$1",[f.producto])).rows[0].stock),10);
});
test("Venta de producto mueve stock una vez y su anulación lo repone una vez", async () => {
    const r = await rpc("venta.registrar",venta({tipo_cobro:"Producto",producto_id:f.producto,cantidad_producto:3}));
    assert.equal(Number((await adminQuery("select stock from public.productos_inventario where id=$1",[f.producto])).rows[0].stock),7);
    await rpc("venta.anular",{id:r.venta.id}); await rpc("venta.anular",{id:r.venta.id});
    assert.equal(Number((await adminQuery("select stock from public.productos_inventario where id=$1",[f.producto])).rows[0].stock),10);
    assert.equal(await count("public.movimientos_inventario"),2);
});
test("Abono, comprobante y saldo se confirman juntos; no hay sobreabono", async () => {
    const {cuenta} = await rpc("venta.registrar",venta());
    const d = {cuenta_id:cuenta.id,efectivo:40}; const id = randomUUID();
    const a = await rpc("abono.cobrar",d,id); const b = await rpc("abono.cobrar",d,id);
    assert.deepEqual(a,b); assert.equal(a.cuenta.saldo,20); assert.equal(a.cuenta.abonado,80);
    await assert.rejects(rpc("abono.cobrar",d),{code:"22023"});
    assert.equal(await count("public.abonos_cuentas_cobrar"),1); assert.equal(await count("public.ventas"),2);
});
test("Un abono con pagos distintos del monto no escribe comprobantes", async () => {
    const {cuenta} = await rpc("venta.registrar",venta());
    await assert.rejects(rpc("abono.cobrar",{cuenta_id:cuenta.id,monto:40,efectivo:30}),{code:"22023"});
    assert.equal(await count("public.ventas"),1); assert.equal(await count("public.abonos_cuentas_cobrar"),0);
});
test("Compra, entrada, gasto y deuda se confirman juntos", async () => {
    const r = await rpc("compra.registrar",compra());
    assert.ok(r.gasto_id); assert.ok(r.cuenta_pagar_id); assert.equal(r.total,15); assert.equal(r.credito,10);
    assert.equal(await count("public.gastos"),1); assert.equal(await count("public.cuentas_pagar"),1);
    assert.equal(Number((await adminQuery("select stock from public.productos_inventario where id=$1",[f.producto])).rows[0].stock),13);
});
test("Falla tardía en una compra no deja entrada, gasto, deuda ni compra", async () => {
    await assert.rejects(rpc("compra.registrar",compra({fecha_vencimiento:"invalida"})));
    for (const t of ["compras_proveedores","movimientos_inventario","gastos","cuentas_pagar"]) assert.equal(await count("public."+t),0);
});
test("Abonos a proveedor no duplican gasto ni exceden saldo", async () => {
    const c = await rpc("compra.registrar",compra());
    const id = randomUUID(); const d = {cuenta_id:c.cuenta_pagar_id,monto:7,metodo:"Efectivo"};
    assert.deepEqual(await rpc("abono.pagar",d,id),await rpc("abono.pagar",d,id));
    await assert.rejects(rpc("abono.pagar",d),{code:"22023"});
    assert.equal(await count("public.abonos_cuentas_pagar"),1); assert.equal(await count("public.gastos"),2);
});
test("Anular compra no repite stock y cancela sus gastos vinculados", async () => {
    const c = await rpc("compra.registrar",compra());
    await rpc("abono.pagar",{cuenta_id:c.cuenta_pagar_id,monto:3,metodo:"Efectivo"});
    await rpc("compra.anular",{id:c.id}); await rpc("compra.anular",{id:c.id});
    assert.equal(Number((await adminQuery("select stock from public.productos_inventario where id=$1",[f.producto])).rows[0].stock),10);
    assert.equal(Number((await adminQuery("select count(*) as n from public.gastos where estado='Activo'")).rows[0].n),0);
});
test("Movimiento lee el stock más reciente y rechaza salida excedida", async () => {
    await rpc("inventario.movimiento",{producto_id:f.producto,tipo:"Salida",cantidad:7});
    await assert.rejects(rpc("inventario.movimiento",{producto_id:f.producto,tipo:"Salida",cantidad:7}),{code:"22023"});
    assert.equal(await count("public.movimientos_inventario"),1);
});
test("Crear producto con stock registra su movimiento dentro de la transacción", async () => {
    const r = await rpc("producto.crear",{nombre:"Nuevo",categoria:"Clínica",unidad:"Unidad",stock:5,stock_minimo:1,costo_compra:4,precio_venta:7});
    assert.equal(r.stock,5); assert.equal(await count("public.movimientos_inventario"),1);
});
test("Editar producto con una versión anterior no pisa otro movimiento", async () => {
    const original = (await adminQuery("select * from public.productos_inventario where id=$1",[f.producto])).rows[0];
    await rpc("inventario.movimiento",{producto_id:f.producto,tipo:"Salida",cantidad:1});
    await assert.rejects(rpc("producto.actualizar",{...original,actualizado_en_esperado:"2000-01-01",stock:10}),{code:"PT409"});
});
const presupuesto = () => ({paciente_id:f.paciente,items:[{nombre:"Resina",descripcion:"Prueba",cantidad:2,precio_unitario:20}],descuento:5});
test("Presupuesto e ítems se guardan juntos; convertir no duplica venta ni cuenta", async () => {
    const p = await rpc("presupuesto.crear",presupuesto()); assert.equal(p.total,35);
    const a = await rpc("presupuesto.convertir",{id:p.id}); const b = await rpc("presupuesto.convertir",{id:p.id});
    assert.deepEqual(a,b); assert.equal(await count("public.ventas"),1); assert.equal(await count("public.cuentas_cobrar"),1);
});
test("Ítem inválido revierte la cabecera de presupuesto", async () => {
    const d = presupuesto(); d.items.push({nombre:"Inválido",descripcion:"",cantidad:1,precio_unitario:5,cara:"invalida"});
    await assert.rejects(rpc("presupuesto.crear",d));
    assert.equal(await count("public.presupuestos"),0); assert.equal(await count("public.presupuesto_items"),0);
});
test("Piezas se actualizan conservando ID y el historial de más de 200 eventos", async () => {
    const h = Array.from({length:205},()=>evento());
    await rpc("odontograma.guardar",odontograma({historial:h}));
    const id = (await adminQuery("select id from public.odontograma_piezas")).rows[0].id;
    await rpc("odontograma.guardar",odontograma({version:1,piezas:[pieza("Resina")],historial:[evento()]}));
    assert.equal((await adminQuery("select id from public.odontograma_piezas")).rows[0].id,id);
    assert.equal(await count("public.odontograma_historial"),206);
    const completo = (await db.query("select public.obtener_odontograma_completo($1) as r",[f.paciente])).rows[0].r;
    assert.equal(completo.historial.length,206); assert.equal(completo.version,2);
    assert.equal(completo.historial[0].usuario_nombre,"Admin prueba");
});
test("Una versión vieja del odontograma no sobrescribe piezas ni agrega historial", async () => {
    await rpc("odontograma.guardar",odontograma());
    await assert.rejects(rpc("odontograma.guardar",odontograma({piezas:[pieza("Sano")]})),{code:"PT409"});
    assert.equal(await count("public.odontograma_historial"),1);
    assert.equal((await adminQuery("select cara_sup from public.odontograma_piezas")).rows[0].cara_sup,"Caries");
});
test("Falla al insertar historial revierte las piezas y la versión", async () => {
    await rpc("odontograma.guardar",odontograma());
    await assert.rejects(rpc("odontograma.guardar",odontograma({version:1,piezas:[pieza("Resina")],historial:[{...evento(),estado:"Inválido"}]})));
    assert.equal((await adminQuery("select version from public.odontogramas")).rows[0].version,1);
    assert.equal((await adminQuery("select cara_sup from public.odontograma_piezas")).rows[0].cara_sup,"Caries");
});
test("Un reintento de odontograma no repite eventos ni aumenta versión", async () => {
    const d = odontograma(); const id = randomUUID();
    assert.deepEqual(await rpc("odontograma.guardar",d,id),await rpc("odontograma.guardar",d,id));
    assert.equal(await count("public.odontograma_historial"),1);
});
test("No se puede registrar una venta con paciente de otra clínica", async () => {
    await assert.rejects(rpc("venta.registrar",venta({paciente_id:f.pacienteAjeno})),{code:"42501"});
});
for (const rol of ["DOCTOR","CAJA","RECEPCION"]) {
    test(`Se respetan los permisos de ${rol}`, async () => {
        await adminQuery("update public.usuarios_perfiles set rol=$1::public.rol_usuario_sistema where id=$2",[rol,f.perfil]);
        if (rol==="DOCTOR") {
            await assert.rejects(rpc("venta.registrar",venta()),{code:"42501"});
            await rpc("odontograma.guardar",odontograma());
        } else {
            await rpc("venta.registrar",venta());
            await assert.rejects(rpc("producto.crear",{nombre:"Sin permiso"}),{code:"42501"});
        }
    });
}
test("Una licencia suspendida bloquea también las funciones privilegiadas", async () => {
    await adminQuery("update public.clinicas set estado='Suspendida' where id=$1",[f.clinica]);
    await assert.rejects(rpc("venta.registrar",venta()),{code:"42501"});
});
test("La API directa no puede saltarse las transacciones", async () => {
    await db.exec("savepoint acceso");
    await assert.rejects(db.query("update public.productos_inventario set stock=999 where id=$1",[f.producto]),{code:"42501"});
    await db.exec("rollback to savepoint acceso; release savepoint acceso");
    await assert.rejects(rpc("operacion.desconocida",{}),{code:"42501"});
});

test("Falla de gasto posterior al movimiento revierte toda la compra", async () => {
    await adminQuery("create function pg_temp.fallar_gasto() returns trigger language plpgsql as $$ begin raise exception 'Falla inyectada'; end; $$");
    await adminQuery("create trigger falla_prueba before insert on public.gastos for each row execute function pg_temp.fallar_gasto()");
    await assert.rejects(rpc("compra.registrar",compra()),/Falla inyectada/);
    for (const t of ["compras_proveedores","movimientos_inventario","gastos","cuentas_pagar"]) assert.equal(await count("public."+t),0);
    assert.equal(Number((await adminQuery("select stock from public.productos_inventario where id=$1",[f.producto])).rows[0].stock),10);
});
test("Falla de saldo posterior al comprobante revierte abono y venta", async () => {
    const {cuenta} = await rpc("venta.registrar",venta());
    await adminQuery("create function pg_temp.fallar_saldo() returns trigger language plpgsql as $$ begin raise exception 'Falla inyectada'; end; $$");
    await adminQuery("create trigger falla_prueba before update on public.cuentas_cobrar for each row execute function pg_temp.fallar_saldo()");
    await assert.rejects(rpc("abono.cobrar",{cuenta_id:cuenta.id,efectivo:10}),/Falla inyectada/);
    assert.equal(await count("public.abonos_cuentas_cobrar"),0); assert.equal(await count("public.ventas"),1);
    assert.equal(Number((await adminQuery("select saldo from public.cuentas_cobrar where id=$1",[cuenta.id])).rows[0].saldo),60);
});
test("Cambiar estado de producto y editar con versión vigente funciona", async () => {
    const inactivo = await rpc("producto.estado",{id:f.producto}); assert.equal(inactivo.estado,"Inactivo");
    const activo = await rpc("producto.estado",{id:f.producto,estado:"Activo"}); assert.equal(activo.estado,"Activo");
    const actualizado = await rpc("producto.actualizar",{...activo,actualizado_en_esperado:activo.actualizado_en,nombre:"Nuevo nombre",stock:12});
    assert.equal(actualizado.nombre,"Nuevo nombre"); assert.equal(actualizado.stock,12); assert.equal(await count("public.movimientos_inventario"),1);
});
test("Cuenta manual valida total, abonado y saldo; su anulación no se reactiva", async () => {
    const datos={paciente_id:f.paciente,paciente_nombre:"Paciente",concepto:"Saldo inicial",total:100,abonado:10,saldo:90};
    const c=await rpc("cuenta.crear",datos); assert.equal(c.estado,"Parcial");
    await assert.rejects(rpc("cuenta.crear",{...datos,saldo:100}),{code:"22023"});
    assert.equal((await rpc("cuenta.anular",{id:c.id})).estado,"Anulada");
    assert.equal((await rpc("cuenta.estado",{id:c.id})).estado,"Anulada");
});
test("Presupuesto puede cambiar estado y eliminarse antes de convertirse", async () => {
    const p=await rpc("presupuesto.crear",presupuesto());
    assert.equal((await rpc("presupuesto.estado",{id:p.id,estado:"Aprobado"})).estado,"Aprobado");
    await rpc("presupuesto.eliminar",{id:p.id});
    assert.equal(await count("public.presupuestos"),0); assert.equal(await count("public.presupuesto_items"),0);
});
test("Una cita cobrada no genera una segunda venta con otra solicitud", async () => {
    const cita=randomUUID();
    await adminQuery("insert into public.citas(id,clinica_id,paciente_id,fecha,hora) values($1,$2,$3,current_date,'09:00')",[cita,f.clinica,f.paciente]);
    const d=venta({paciente_id:f.paciente,cita_id:cita,efectivo:100,credito:0});
    await rpc("venta.registrar",d);
    await assert.rejects(rpc("venta.registrar",d),{code:"22023"});
    assert.equal(await count("public.ventas"),1);
});
test("Una cita parcialmente cobrada tampoco duplica su crédito", async () => {
    const cita=randomUUID();
    await adminQuery("insert into public.citas(id,clinica_id,paciente_id,fecha,hora) values($1,$2,$3,current_date,'10:00')",[cita,f.clinica,f.paciente]);
    const d=venta({paciente_id:f.paciente,cita_id:cita});
    await rpc("venta.registrar",d);
    await assert.rejects(rpc("venta.registrar",d),{code:"22023"});
    assert.equal(await count("public.ventas"),1); assert.equal(await count("public.cuentas_cobrar"),1);
});

// Fase 3: la misma base y las mismas operaciones, con reglas de coherencia.
const cerrar = (extras={}) => rpc("cierre.crear",{fecha:f.hoy,efectivo_contado:0,tarjeta_reportada:0,transferencia_reportada:0,...extras});
const resumenCaja = async(fecha=f.hoy) => (await db.query("select public.obtener_resumen_caja($1) as r",[fecha])).rows[0].r;
const gastoManual = (extras={}) => ({fecha:f.hoy,categoria:"Prueba",descripcion:"Gasto manual",monto:10,metodo_pago:"Efectivo",...extras});

test("Anular comprobante de abono restituye deuda y conserva estado Anulado",async()=>{
    const {cuenta}=await rpc("venta.registrar",venta());
    const a=await rpc("abono.cobrar",{cuenta_id:cuenta.id,efectivo:60});
    assert.equal(a.cuenta.estado,"Pagada");
    await rpc("venta.anular",{id:a.venta.id});
    const c=(await adminQuery("select * from public.cuentas_cobrar where id=$1",[cuenta.id])).rows[0];
    assert.equal(Number(c.saldo),60);assert.equal(Number(c.abonado),40);assert.equal(c.estado,"Parcial");
    assert.equal((await adminQuery("select estado from public.abonos_cuentas_cobrar where id=$1",[a.abono.id])).rows[0].estado,"Anulado");
    await rpc("venta.anular",{id:a.venta.id});
    assert.equal(Number((await adminQuery("select saldo from public.cuentas_cobrar where id=$1",[cuenta.id])).rows[0].saldo),60);
});
test("Anular por ID de abono también anula comprobante y es idempotente",async()=>{
    const {cuenta}=await rpc("venta.registrar",venta());const a=await rpc("abono.cobrar",{cuenta_id:cuenta.id,efectivo:10});
    const id=randomUUID();const d={id:a.abono.id};
    const r=await rpc("abono.anular",d,id);assert.equal(r.estado,"Anulado");assert.deepEqual(await rpc("abono.anular",d,id),r);
    assert.equal((await adminQuery("select estado from public.ventas where id=$1",[a.venta.id])).rows[0].estado,"Anulada");
});
test("No se anula la venta original ni su cuenta con abonos activos",async()=>{
    const v=await rpc("venta.registrar",venta());const a=await rpc("abono.cobrar",{cuenta_id:v.cuenta.id,efectivo:10});
    await assert.rejects(rpc("venta.anular",{id:v.venta.id}),{code:"22023"});
    await assert.rejects(rpc("cuenta.anular",{id:v.cuenta.id}),{code:"22023"});
    await rpc("abono.anular",{id:a.abono.id});await rpc("cuenta.anular",{id:v.cuenta.id});
    assert.equal((await adminQuery("select estado from public.ventas where id=$1",[v.venta.id])).rows[0].estado,"Anulada");
});
test("Venta 100 y abono 40 siguen siendo 100 vendidos; se cobran ambos pagos",async()=>{
    const v=await rpc("venta.registrar",venta());await rpc("abono.cobrar",{cuenta_id:v.cuenta.id,efectivo:40});
    const r=await resumenCaja();assert.equal(r.ventas_brutas,100);assert.equal(r.abonos_cobrados,40);assert.equal(r.total_cobrado,80);
    assert.equal(r.ventas_cantidad,1);assert.equal(r.cobros_cantidad,2);assert.equal(r.credito_generado,60);
});
test("Cierre se calcula en servidor e ignora totales y estado falsificados",async()=>{
    await rpc("venta.registrar",venta());
    const c=await cerrar({efectivo_contado:40,ventas_brutas:999,efectivo_sistema:999,estado:"Con diferencia"});
    assert.equal(c.ventas_brutas,100);assert.equal(c.efectivo_sistema,40);assert.equal(c.estado,"Cuadrado");assert.equal(c.resumen_version,2);
});
test("Cierre diferencia cada medio de pago, aunque las diferencias se compensen",async()=>{
    await rpc("venta.registrar",venta({efectivo:50,transferencia:50,credito:0}));
    const c=await cerrar({efectivo_contado:60,transferencia_reportada:40});
    assert.equal(c.diferencia_efectivo,10);assert.equal(c.diferencia_transferencia,-10);assert.equal(c.estado,"Con diferencia");
});
test("Huella desactualizada no permite cerrar con un resumen viejo",async()=>{
    const r=await resumenCaja();await rpc("venta.registrar",venta());
    await assert.rejects(cerrar({resumen_esperado:r.huella}),{code:"PT409"});assert.equal(await count("public.cierres_caja"),0);
});
test("Cierre repetido con la misma solicitud devuelve la instantánea; otro ID no duplica",async()=>{
    const id=randomUUID(),d={fecha:f.hoy,efectivo_contado:0,tarjeta_reportada:0,transferencia_reportada:0};
    const c=await rpc("cierre.crear",d,id);assert.deepEqual(await rpc("cierre.crear",d,id),c);
    await assert.rejects(rpc("cierre.crear",d),{code:"PT409"});assert.equal(await count("public.cierres_caja"),1);
});
test("No se crean ni anulan ventas o abonos en una fecha cerrada",async()=>{
    const v=await rpc("venta.registrar",venta());const a=await rpc("abono.cobrar",{cuenta_id:v.cuenta.id,efectivo:10});
    await cerrar();
    await assert.rejects(rpc("venta.registrar",venta()),{code:"PT409"});
    await assert.rejects(rpc("venta.anular",{id:a.venta.id}),{code:"PT409"});
    await assert.rejects(rpc("abono.cobrar",{cuenta_id:v.cuenta.id,efectivo:10}),{code:"PT409"});
    assert.equal(Number((await adminQuery("select saldo from public.cuentas_cobrar where id=$1",[v.cuenta.id])).rows[0].saldo),50);
});
test("Un abono nuevo puede cobrar una deuda de una fecha anterior ya cerrada",async()=>{
    const v=await rpc("venta.registrar",venta({fecha:"2020-01-01",efectivo:0,credito:100}));
    await cerrar({fecha:"2020-01-01"});
    const a=await rpc("abono.cobrar",{cuenta_id:v.cuenta.id,efectivo:20});assert.equal(a.cuenta.saldo,80);
    await rpc("abono.anular",{id:a.abono.id});assert.equal(Number((await adminQuery("select saldo from public.cuentas_cobrar where id=$1",[v.cuenta.id])).rows[0].saldo),100);
    await assert.rejects(rpc("venta.anular",{id:v.venta.id}),{code:"PT409"});
});
test("Gasto no puede moverse desde o hacia una fecha cerrada",async()=>{
    const viejo=await rpc("gasto.crear",gastoManual({fecha:"2020-01-01"}));const actual=await rpc("gasto.crear",gastoManual());
    await cerrar({fecha:"2020-01-01"});
    await assert.rejects(rpc("gasto.actualizar",{...gastoManual(),id:viejo.id}),{code:"PT409"});
    await assert.rejects(rpc("gasto.actualizar",{...gastoManual({fecha:"2020-01-01"}),id:actual.id}),{code:"PT409"});
    await assert.rejects(rpc("gasto.anular",{id:viejo.id}),{code:"PT409"});
});
test("Compra a crédito y anulación de compra respetan el período cerrado",async()=>{
    const c=await rpc("compra.registrar",compra());await cerrar();
    await assert.rejects(rpc("compra.anular",{id:c.id}),{code:"PT409"});
    await assert.rejects(rpc("compra.registrar",compra({pago_ahora:0})),{code:"PT409"});
    assert.equal(Number((await adminQuery("select stock from public.productos_inventario where id=$1",[f.producto])).rows[0].stock),13);
});
test("Solo ADMIN reabre con motivo y conserva instantánea al volver a cerrar",async()=>{
    await rpc("venta.registrar",venta());const c=await cerrar({efectivo_contado:40});
    await assert.rejects(rpc("cierre.reabrir",{id:c.id,motivo:""}),{code:"22023"});
    await adminQuery("update public.usuarios_perfiles set rol='CAJA' where id=$1",[f.perfil]);
    await assert.rejects(rpc("cierre.reabrir",{id:c.id,motivo:"Corregir"}),{code:"42501"});
    await adminQuery("update public.usuarios_perfiles set rol='ADMIN' where id=$1",[f.perfil]);
    const anterior=await rpc("cierre.reabrir",{id:c.id,motivo:"Corrección autorizada"});
    assert.equal(anterior.ventas_brutas,c.ventas_brutas);assert.equal(anterior.motivo_reapertura,"Corrección autorizada");
    await rpc("venta.registrar",venta({total:10,efectivo:10,credito:0}));
    const nuevo=await cerrar({efectivo_contado:50});assert.notEqual(c.id,nuevo.id);assert.equal(nuevo.ventas_brutas,110);
    assert.equal(await count("public.cierres_caja"),2);assert.equal(await count("public.auditoria"),3);
});
test("No se altera ni elimina una instantánea de cierre con SQL privilegiado",async()=>{
    const c=await cerrar();
    for(const query of ["update public.cierres_caja set ventas_brutas=999 where id=$1","delete from public.cierres_caja where id=$1"]){
        await db.exec("reset role; savepoint proteger");
        await assert.rejects(db.query(query,[c.id]),{code:"42501"});
        await db.exec("rollback to savepoint proteger; release savepoint proteger; set local role authenticated");
    }
});
test("Gasto vinculado a una compra no se anula manualmente",async()=>{
    const c=await rpc("compra.registrar",compra());await assert.rejects(rpc("gasto.anular",{id:c.gasto_id}),{code:"22023"});
});
test("Fallo posterior a revertir saldo no deja una anulación parcial",async()=>{
    const v=await rpc("venta.registrar",venta());const a=await rpc("abono.cobrar",{cuenta_id:v.cuenta.id,efectivo:10});
    await adminQuery("create function pg_temp.fallar_anulacion() returns trigger language plpgsql as $$ begin raise exception 'Falla de comprobante'; end; $$");
    await adminQuery("create trigger falla_prueba before update on public.ventas for each row execute function pg_temp.fallar_anulacion()");
    await assert.rejects(rpc("abono.anular",{id:a.abono.id}),/Falla de comprobante/);
    assert.equal(Number((await adminQuery("select saldo from public.cuentas_cobrar where id=$1",[v.cuenta.id])).rows[0].saldo),50);
    assert.equal((await adminQuery("select estado from public.abonos_cuentas_cobrar where id=$1",[a.abono.id])).rows[0].estado,"Activo");
});
test("Una operación nula no permite saltarse el rol al recuperar una solicitud",async()=>{
    const id=randomUUID(),d=venta();await rpc("venta.registrar",d,id);
    await adminQuery("update public.usuarios_perfiles set rol='DOCTOR' where id=$1",[f.perfil]);
    await assert.rejects(rpc(null,d,id),{code:"42501"});
    await assert.rejects(rpc("venta.registrar",d,id),{code:"42501"});
});
test("Revertir un abono de una deuda vencida restituye el estado Vencida",async()=>{
    const v=await rpc("venta.registrar",venta({fecha:"2020-01-01",efectivo:0,credito:100,fecha_vencimiento_credito:"2020-02-01"}));
    const a=await rpc("abono.cobrar",{cuenta_id:v.cuenta.id,efectivo:100});
    await rpc("abono.anular",{id:a.abono.id});
    const c=(await adminQuery("select estado,saldo from public.cuentas_cobrar where id=$1",[v.cuenta.id])).rows[0];
    assert.equal(c.estado,"Vencida");assert.equal(Number(c.saldo),100);
});
