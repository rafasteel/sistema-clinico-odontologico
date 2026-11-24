-- Ejecutar COMPLETO como postgres. Solo fixtures aislados, todo con ROLLBACK.
begin;
create temporary table fase3_ids(nombre text primary key,id uuid default gen_random_uuid());
create temporary table fase3_datos(nombre text primary key,datos jsonb);
create temporary table fase3_resultados(nombre text);
grant select on fase3_ids to authenticated;
grant all on fase3_datos,fase3_resultados to authenticated;
create function pg_temp.id(text) returns uuid language sql stable as $$ select id from pg_temp.fase3_ids where nombre=$1; $$;
create function pg_temp.dato(text) returns jsonb language sql stable as $$ select datos from pg_temp.fase3_datos where nombre=$1; $$;
create function pg_temp.operar(text,jsonb,uuid default gen_random_uuid()) returns jsonb language sql as
$$ select public.ejecutar_operacion_clinica($1,$2,$3); $$;
create function pg_temp.comprobar(ok boolean,nombre text) returns void language plpgsql as $$
begin
    if ok is distinct from true then raise exception 'FALLO: %',nombre; end if;
    insert into pg_temp.fase3_resultados values(nombre);
end; $$;
create function pg_temp.denegado(consulta text,codigo text,nombre text) returns void language plpgsql as $$
declare rechazado boolean := false;
begin
    begin execute consulta;
    exception when others then if sqlstate<>codigo then raise; end if; rechazado:=true; end;
    perform pg_temp.comprobar(rechazado,nombre);
end; $$;
insert into fase3_ids(nombre) select unnest(array['clinica','otra','auth','perfil','paciente','ajeno','producto','proveedor','pos','solicitud']);
insert into public.clinicas(id,nombre,fecha_vencimiento)
values(pg_temp.id('clinica'),'Fixture fase 3','2099-01-01'),(pg_temp.id('otra'),'Fixture fase 3 ajena','2099-01-01');
insert into auth.users(id,email) values(pg_temp.id('auth'),pg_temp.id('auth')||'@fase3.invalid');
insert into public.usuarios_perfiles(id,auth_user_id,clinica_id,nombre,usuario,correo,rol)
values(pg_temp.id('perfil'),pg_temp.id('auth'),pg_temp.id('clinica'),'Autor fase 3','fase3',pg_temp.id('auth')||'@fase3.invalid','ADMIN');
insert into public.pacientes(id,clinica_id,nombre) values
(pg_temp.id('paciente'),pg_temp.id('clinica'),'Paciente fase 3'),(pg_temp.id('ajeno'),pg_temp.id('otra'),'Paciente ajeno');
insert into public.productos_inventario(id,clinica_id,nombre,categoria,unidad,stock,costo_compra)
values(pg_temp.id('producto'),pg_temp.id('clinica'),'Producto fase 3','Prueba','Unidad',10,5);
insert into public.proveedores(id,clinica_id,nombre) values(pg_temp.id('proveedor'),pg_temp.id('clinica'),'Proveedor fase 3');
insert into public.pos_clinica(id,clinica_id,codigo,nombre,comision) values(pg_temp.id('pos'),pg_temp.id('clinica'),'POS-FASE2','POS',4);
select set_config('request.jwt.claim.sub',pg_temp.id('auth')::text,true);
set local role authenticated;

insert into fase3_datos values('base','{"cliente_nombre":"Fixture","concepto":"Prueba fase 3","total":100,"efectivo":40,"credito":60}');
insert into fase3_datos values('venta',pg_temp.operar('venta.registrar',pg_temp.dato('base')));
insert into fase3_datos values('abono',pg_temp.operar('abono.cobrar',jsonb_build_object('cuenta_id',pg_temp.dato('venta')->'cuenta'->>'id','efectivo',40)));
insert into fase3_datos values('antes',public.obtener_resumen_caja((statement_timestamp() at time zone 'America/Guatemala')::date));
select pg_temp.comprobar((pg_temp.dato('antes')->>'ventas_brutas')::numeric=100,'100 vendidos mas abono 40 siguen siendo 100 vendidos');
select pg_temp.comprobar((pg_temp.dato('antes')->>'total_cobrado')::numeric=80,'Cobrado incluye pago inicial y abono');
select pg_temp.comprobar((pg_temp.dato('antes')->>'ventas_cantidad')::int=1 and (pg_temp.dato('antes')->>'cobros_cantidad')::int=2,'Ventas y comprobantes separados');
select pg_temp.denegado($q$select pg_temp.operar('venta.anular',jsonb_build_object('id',pg_temp.dato('venta')->'venta'->>'id'))$q$,'22023','No se anula origen con abonos activos');
select pg_temp.operar('venta.anular',jsonb_build_object('id',pg_temp.dato('abono')->'venta'->>'id'));
select pg_temp.comprobar((select saldo=60 and abonado=40 from public.cuentas_cobrar where id=(pg_temp.dato('venta')->'cuenta'->>'id')::uuid),'Anulacion de comprobante restaura deuda');
select pg_temp.comprobar((select estado='Anulado' from public.abonos_cuentas_cobrar where id=(pg_temp.dato('abono')->'abono'->>'id')::uuid),'Abono queda anulado');
select pg_temp.operar('abono.anular',jsonb_build_object('id',pg_temp.dato('abono')->'abono'->>'id'));
select pg_temp.comprobar((select saldo=60 from public.cuentas_cobrar where id=(pg_temp.dato('venta')->'cuenta'->>'id')::uuid),'Repetir anulacion no repite la reversion');
insert into fase3_datos values('activo',pg_temp.operar('abono.cobrar',jsonb_build_object('cuenta_id',pg_temp.dato('venta')->'cuenta'->>'id','efectivo',10)));
insert into fase3_datos values('cierre_base',jsonb_build_object('fecha',(statement_timestamp() at time zone 'America/Guatemala')::date,'efectivo_contado',50,'tarjeta_reportada',0,'transferencia_reportada',0,'ventas_brutas',999,'estado','Con diferencia'));
select pg_temp.denegado($q$select pg_temp.operar('cierre.crear',pg_temp.dato('cierre_base')||jsonb_build_object('resumen_esperado',pg_temp.dato('antes')->>'huella'))$q$,'PT409','Vista previa vieja no se confirma');
insert into fase3_datos values('cierre',pg_temp.operar('cierre.crear',pg_temp.dato('cierre_base'),pg_temp.id('solicitud')));
select pg_temp.comprobar((pg_temp.dato('cierre')->>'ventas_brutas')::numeric=100,'Cierre ignora total falsificado');
select pg_temp.comprobar((pg_temp.dato('cierre')->>'total_cobrado')::numeric=50 and (pg_temp.dato('cierre')->>'abonos_cobrados')::numeric=10,'Cierre desglosa cobros y abonos');
select pg_temp.comprobar(pg_temp.dato('cierre')->>'estado'='Cuadrado','Estado se calcula en servidor');
select pg_temp.comprobar(pg_temp.operar('cierre.crear',pg_temp.dato('cierre_base'),pg_temp.id('solicitud'))=pg_temp.dato('cierre'),'Reintento de cierre devuelve la misma instantanea');
select pg_temp.denegado($q$select pg_temp.operar('cierre.crear',pg_temp.dato('cierre_base'))$q$,'PT409','No se duplica cierre activo');
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar',pg_temp.dato('base'))$q$,'PT409','Venta bloqueada en fecha cerrada');
select pg_temp.denegado($q$select pg_temp.operar('abono.cobrar',jsonb_build_object('cuenta_id',pg_temp.dato('venta')->'cuenta'->>'id','efectivo',10))$q$,'PT409','Abono bloqueado en fecha cerrada');
select pg_temp.denegado($q$select pg_temp.operar('abono.anular',jsonb_build_object('id',pg_temp.dato('activo')->'abono'->>'id'))$q$,'PT409','Reversion bloqueada en fecha cerrada');
select pg_temp.denegado($q$select pg_temp.operar('gasto.crear',jsonb_build_object('fecha',pg_temp.dato('cierre')->>'fecha','categoria','Prueba','descripcion','Prueba','monto',10,'metodo_pago','Efectivo'))$q$,'PT409','Gasto bloqueado en fecha cerrada');
select pg_temp.comprobar((select saldo=50 from public.cuentas_cobrar where id=(pg_temp.dato('venta')->'cuenta'->>'id')::uuid),'Intentos bloqueados no alteran saldo');
select pg_temp.denegado($q$select pg_temp.operar('cierre.reabrir',jsonb_build_object('id',pg_temp.dato('cierre')->>'id','motivo',''))$q$,'22023','Reapertura requiere motivo');
reset role;
select pg_temp.denegado($q$update public.ventas set concepto='Alterado' where id=(pg_temp.dato('venta')->'venta'->>'id')::uuid$q$,'PT409','Integracion privilegiada tambien respeta fecha');
select pg_temp.denegado($q$delete from public.cierres_caja where id=(pg_temp.dato('cierre')->>'id')::uuid$q$,'42501','No se borra la instantanea');
select pg_temp.denegado($q$update public.cierres_caja set ventas_brutas=999 where id=(pg_temp.dato('cierre')->>'id')::uuid$q$,'42501','No se modifica la instantanea');
update public.usuarios_perfiles set rol='CAJA' where id=pg_temp.id('perfil');
set local role authenticated;
select pg_temp.denegado($q$select pg_temp.operar('cierre.reabrir',jsonb_build_object('id',pg_temp.dato('cierre')->>'id','motivo','Corregir'))$q$,'42501','CAJA no reabre cierres');
reset role;
update public.usuarios_perfiles set rol='ADMIN' where id=pg_temp.id('perfil');
set local role authenticated;
insert into fase3_datos values('reabierto',pg_temp.operar('cierre.reabrir',jsonb_build_object('id',pg_temp.dato('cierre')->>'id','motivo','Correccion autorizada')));
select pg_temp.comprobar(pg_temp.dato('reabierto')->>'estado'='Anulado' and pg_temp.dato('reabierto')->>'motivo_reapertura'='Correccion autorizada','ADMIN reabre con motivo');
select pg_temp.comprobar(pg_temp.dato('reabierto')->>'ventas_brutas'=pg_temp.dato('cierre')->>'ventas_brutas','Reapertura conserva valores originales');
select pg_temp.operar('abono.anular',jsonb_build_object('id',pg_temp.dato('activo')->'abono'->>'id'));
select pg_temp.comprobar((select saldo=60 from public.cuentas_cobrar where id=(pg_temp.dato('venta')->'cuenta'->>'id')::uuid),'Fecha reabierta permite reversion');
insert into fase3_datos values('cierre_nuevo',pg_temp.operar('cierre.crear',pg_temp.dato('cierre_base')||'{"efectivo_contado":40}'));
select pg_temp.comprobar(pg_temp.dato('cierre_nuevo')->>'id'<>pg_temp.dato('cierre')->>'id','Nuevo cierre conserva otra identidad');
select pg_temp.comprobar((select count(*)=2 from public.cierres_caja where clinica_id=pg_temp.id('clinica')),'Se conservan ambos cierres');
select pg_temp.comprobar((select count(*)>=3 from public.auditoria where clinica_id=pg_temp.id('clinica') and modulo='Cierre de Caja'),'Cierre y reapertura auditados');
select pg_temp.denegado($q$select clinica_privada.fase2_ejecutar_base('venta.registrar',pg_temp.dato('base'),gen_random_uuid())$q$,'42501','No se omite fase 3 invocando funcion anterior');
reset role;
select count(*) as pruebas_correctas from fase3_resultados;
rollback;
