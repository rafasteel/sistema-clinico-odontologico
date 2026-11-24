-- Ejecutar COMPLETO como postgres. Solo fixtures aislados, todo con ROLLBACK.
begin;
create temporary table fase2_ids(nombre text primary key,id uuid default gen_random_uuid());
create temporary table fase2_datos(nombre text primary key,datos jsonb);
create temporary table fase2_resultados(nombre text);
grant select on fase2_ids to authenticated;
grant all on fase2_datos,fase2_resultados to authenticated;
create function pg_temp.id(text) returns uuid language sql stable as $$ select id from pg_temp.fase2_ids where nombre=$1; $$;
create function pg_temp.dato(text) returns jsonb language sql stable as $$ select datos from pg_temp.fase2_datos where nombre=$1; $$;
create function pg_temp.operar(text,jsonb,uuid default gen_random_uuid()) returns jsonb language sql as
$$ select public.ejecutar_operacion_clinica($1,$2,$3); $$;
create function pg_temp.comprobar(ok boolean,nombre text) returns void language plpgsql as $$
begin
    if ok is distinct from true then raise exception 'FALLO: %',nombre; end if;
    insert into pg_temp.fase2_resultados values(nombre);
end; $$;
create function pg_temp.denegado(consulta text,codigo text,nombre text) returns void language plpgsql as $$
declare rechazado boolean := false;
begin
    begin execute consulta;
    exception when others then if sqlstate<>codigo then raise; end if; rechazado:=true; end;
    perform pg_temp.comprobar(rechazado,nombre);
end; $$;
insert into fase2_ids(nombre) select unnest(array['clinica','otra','auth','perfil','paciente','ajeno','producto','proveedor','pos','solicitud']);
insert into public.clinicas(id,nombre,fecha_vencimiento)
values(pg_temp.id('clinica'),'Fixture fase 2','2099-01-01'),(pg_temp.id('otra'),'Fixture fase 2 ajena','2099-01-01');
insert into auth.users(id,email) values(pg_temp.id('auth'),pg_temp.id('auth')||'@fase2.invalid');
insert into public.usuarios_perfiles(id,auth_user_id,clinica_id,nombre,usuario,correo,rol)
values(pg_temp.id('perfil'),pg_temp.id('auth'),pg_temp.id('clinica'),'Autor fase 2','fase2',pg_temp.id('auth')||'@fase2.invalid','ADMIN');
insert into public.pacientes(id,clinica_id,nombre) values
(pg_temp.id('paciente'),pg_temp.id('clinica'),'Paciente fase 2'),(pg_temp.id('ajeno'),pg_temp.id('otra'),'Paciente ajeno');
insert into public.productos_inventario(id,clinica_id,nombre,categoria,unidad,stock,costo_compra)
values(pg_temp.id('producto'),pg_temp.id('clinica'),'Producto fase 2','Prueba','Unidad',10,5);
insert into public.proveedores(id,clinica_id,nombre) values(pg_temp.id('proveedor'),pg_temp.id('clinica'),'Proveedor fase 2');
insert into public.pos_clinica(id,clinica_id,codigo,nombre,comision) values(pg_temp.id('pos'),pg_temp.id('clinica'),'POS-FASE2','POS',4);
select set_config('request.jwt.claim.sub',pg_temp.id('auth')::text,true);
set local role authenticated;

insert into fase2_datos values('venta_base','{"cliente_nombre":"Fixture","concepto":"Prueba","total":100,"efectivo":40,"credito":60}');
insert into fase2_datos values('venta',pg_temp.operar('venta.registrar',pg_temp.dato('venta_base'),pg_temp.id('solicitud')));
select pg_temp.comprobar((pg_temp.dato('venta')->'cuenta'->>'saldo')::numeric=60,'Venta y crédito coherentes');
select pg_temp.comprobar(pg_temp.operar('venta.registrar',pg_temp.dato('venta_base'),pg_temp.id('solicitud'))=pg_temp.dato('venta'),'Reintento devuelve los mismos registros');
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar',pg_temp.dato('venta_base')||'{"total":90}',pg_temp.id('solicitud'))$q$,'22023','Identificador no reutilizable con otro payload');
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar',pg_temp.dato('venta_base')||'{"total":"NaN"}')$q$,'22023','NaN rechazado');
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar',pg_temp.dato('venta_base')||'{"efectivo":-1}')$q$,'22023','Negativos rechazados');
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar',pg_temp.dato('venta_base')||'{"credito":50}')$q$,'22023','Suma incoherente rechazada');
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar',pg_temp.dato('venta_base')||jsonb_build_object('paciente_id',pg_temp.id('ajeno')))$q$,'42501','Paciente ajeno rechazado');
insert into fase2_datos values('abono',pg_temp.operar('abono.cobrar',jsonb_build_object('cuenta_id',pg_temp.dato('venta')->'cuenta'->>'id','efectivo',40)));
select pg_temp.comprobar((pg_temp.dato('abono')->'cuenta'->>'saldo')::numeric=20,'Abono actualiza saldo');
select pg_temp.denegado($q$select pg_temp.operar('abono.cobrar',jsonb_build_object('cuenta_id',pg_temp.dato('venta')->'cuenta'->>'id','efectivo',40))$q$,'22023','Abono excedido no deja comprobante');
select pg_temp.comprobar((select count(*)=1 from public.abonos_cuentas_cobrar where clinica_id=pg_temp.id('clinica')),'Un solo abono persistido');
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar',pg_temp.dato('venta_base')||jsonb_build_object('tipo_cobro','Producto','producto_id',pg_temp.id('producto'),'cantidad_producto',11))$q$,'22023','Falla de stock revierte venta y cuenta');
select pg_temp.comprobar((select count(*)=2 from public.ventas where clinica_id=pg_temp.id('clinica')),'Sin venta parcial tras fallo');
select pg_temp.comprobar((select stock=10 from public.productos_inventario where id=pg_temp.id('producto')),'Stock intacto tras fallo');
insert into fase2_datos values('producto_venta',pg_temp.operar('venta.registrar',pg_temp.dato('venta_base')||jsonb_build_object('tipo_cobro','Producto','producto_id',pg_temp.id('producto'),'cantidad_producto',3)));
select pg_temp.comprobar((select stock=7 from public.productos_inventario where id=pg_temp.id('producto')),'Venta descuenta stock en la transacción');
select pg_temp.operar('venta.anular',jsonb_build_object('id',pg_temp.dato('producto_venta')->'venta'->>'id'));
select pg_temp.operar('venta.anular',jsonb_build_object('id',pg_temp.dato('producto_venta')->'venta'->>'id'));
select pg_temp.comprobar((select stock=10 from public.productos_inventario where id=pg_temp.id('producto')),'Anulación repetida repone stock una vez');
insert into fase2_datos values('tarjeta',pg_temp.operar('venta.registrar','{"cliente_nombre":"Fixture","concepto":"POS","total":10.01,"tarjeta":10.01,"credito":0,"pos_id":"POS-FASE2","comision_pos_porcentaje":4}'));
select pg_temp.comprobar((pg_temp.dato('tarjeta')->'venta'->>'comision_pos_monto')::numeric=0.40,'Comisión redondeada en servidor');
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar','{"cliente_nombre":"Fixture","concepto":"POS","total":10,"tarjeta":10,"credito":0,"pos_id":"POS-FASE2","comision_pos_porcentaje":0}')$q$,'22023','Comisión manipulada rechazada');
insert into fase2_datos values('compra',pg_temp.operar('compra.registrar',jsonb_build_object('proveedor_id',pg_temp.id('proveedor'),'producto_id',pg_temp.id('producto'),'cantidad',3,'costo_unitario',5,'pago_ahora',5,'metodo_pago','Efectivo','fecha_vencimiento','2099-01-01')));
select pg_temp.comprobar(pg_temp.dato('compra')->>'gasto_id' is not null and pg_temp.dato('compra')->>'cuenta_pagar_id' is not null,'Compra con gasto y deuda');
select pg_temp.comprobar((select stock=13 from public.productos_inventario where id=pg_temp.id('producto')),'Entrada de compra confirmada');
select pg_temp.operar('abono.pagar',jsonb_build_object('cuenta_id',pg_temp.dato('compra')->>'cuenta_pagar_id','monto',7,'metodo','Efectivo'));
select pg_temp.denegado($q$select pg_temp.operar('abono.pagar',jsonb_build_object('cuenta_id',pg_temp.dato('compra')->>'cuenta_pagar_id','monto',7,'metodo','Efectivo'))$q$,'22023','Abono a proveedor excedido rechazado');
select pg_temp.comprobar((select saldo=3 from public.cuentas_pagar where id=(pg_temp.dato('compra')->>'cuenta_pagar_id')::uuid),'Saldo de proveedor actualizado');
insert into fase2_datos values('presupuesto',pg_temp.operar('presupuesto.crear',jsonb_build_object('paciente_id',pg_temp.id('paciente'),'descuento',5,'items','[{"nombre":"Resina","descripcion":"Prueba","cantidad":2,"precio_unitario":20}]'::jsonb)));
select pg_temp.comprobar((pg_temp.dato('presupuesto')->>'total')::numeric=35,'Presupuesto e ítems coherentes');
insert into fase2_datos values('conversion',pg_temp.operar('presupuesto.convertir',jsonb_build_object('id',pg_temp.dato('presupuesto')->>'id')));
select pg_temp.comprobar(pg_temp.operar('presupuesto.convertir',jsonb_build_object('id',pg_temp.dato('presupuesto')->>'id'))=pg_temp.dato('conversion'),'Conversión repetida no duplica venta');

insert into fase2_datos values('pieza','{"codigo":"11","numeroLegacy":1,"nombre":"Incisivo","tipo":"Incisivo","arcada":"Superior","cuadrante":"Superior derecho","denticion":"Permanente","caras":{"sup":"Caries","der":"Sano","inf":"Sano","izq":"Sano","centro":"Sano"},"nota":"Prueba","actualizadoEn":"Ahora"}');
insert into fase2_datos values('odonto',jsonb_build_object('pacienteId',pg_temp.id('paciente'),'version',0,'piezas',jsonb_build_array(pg_temp.dato('pieza')),'historial',
(select jsonb_agg(jsonb_build_object('id','H-'||n,'piezaCodigo','11','cara','sup','estado','Caries','nota','Hallazgo','usuarioNombre','Autor falso')) from generate_series(1,205) n)));
select pg_temp.operar('odontograma.guardar',pg_temp.dato('odonto'));
insert into fase2_datos values('pieza_id',(select to_jsonb(id) from public.odontograma_piezas where clinica_id=pg_temp.id('clinica')));
select pg_temp.comprobar((select count(*)=205 from public.odontograma_historial where clinica_id=pg_temp.id('clinica')),'Se conservan más de 200 eventos');
select pg_temp.denegado($q$select pg_temp.operar('odontograma.guardar',pg_temp.dato('odonto'))$q$,'PT409','Versión obsoleta rechazada');
select pg_temp.operar('odontograma.guardar',pg_temp.dato('odonto')||'{"version":1,"historial":[]}');
select pg_temp.comprobar((select to_jsonb(id)=pg_temp.dato('pieza_id') from public.odontograma_piezas where clinica_id=pg_temp.id('clinica')),'Pieza conserva su identificador');
select pg_temp.comprobar((select count(*)=205 and bool_and(usuario_nombre='Autor fase 2') from public.odontograma_historial where clinica_id=pg_temp.id('clinica')),'Historial acumulado y autor verificado');
select pg_temp.comprobar(jsonb_array_length(public.obtener_odontograma_completo(pg_temp.id('paciente'))->'historial')=205,'Lectura sin truncar historial');
select pg_temp.denegado($q$update public.odontograma_historial set nota='Falso' where clinica_id=pg_temp.id('clinica')$q$,'42501','API no modifica historial');
select pg_temp.denegado($q$update public.productos_inventario set stock=999 where id=pg_temp.id('producto')$q$,'42501','API no omite transacción de stock');
select pg_temp.denegado($q$select clinica_privada.fase2_insertar('ventas','{}')$q$,'42501','Auxiliares no ejecutables por el API');
reset role;
select pg_temp.denegado($q$delete from public.odontograma_historial where clinica_id=pg_temp.id('clinica')$q$,'42501','Incluso SQL privilegiado conserva historial');
select pg_temp.denegado($q$update public.cuentas_cobrar set saldo=999 where id=(pg_temp.dato('venta')->'cuenta'->>'id')::uuid$q$,'23514','Restricción de saldo protege integraciones privilegiadas');
select pg_temp.comprobar((select count(*)=0 from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('ejecutar_operacion_clinica','obtener_odontograma_completo') and p.prosecdef),'RPC públicos sin SECURITY DEFINER');
update public.clinicas set estado='Suspendida' where id=pg_temp.id('clinica');
set local role authenticated;
select pg_temp.denegado($q$select pg_temp.operar('venta.registrar',pg_temp.dato('venta_base'))$q$,'42501','Licencia bloquea también las funciones transaccionales');
reset role;
select count(*) as pruebas_correctas from fase2_resultados;
rollback;
