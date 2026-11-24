-- Ejecutar completo como postgres en el SQL Editor. Todo se revierte.
-- No utiliza credenciales ni modifica registros existentes.
begin;
create temporary table fase1_ids (nombre text primary key, id uuid not null default gen_random_uuid());
create temporary table fase1_resultados (prueba text);
grant select on fase1_ids to authenticated, service_role, anon;
grant insert, select on fase1_resultados to authenticated, service_role, anon;
create function pg_temp.id(text) returns uuid language sql stable as
$$ select id from pg_temp.fase1_ids where nombre=$1; $$;
create function pg_temp.comprobar(ok boolean, nombre text) returns void language plpgsql as $$
begin
    if ok is distinct from true then raise exception 'FALLO: %', nombre; end if;
    insert into pg_temp.fase1_resultados values (nombre);
end; $$;
create function pg_temp.denegado(consulta text, codigo text, nombre text) returns void language plpgsql as $$
declare rechazado boolean := false;
begin
    begin execute consulta;
    exception when others then
        if sqlstate <> codigo then raise; end if;
        rechazado := true;
    end;
    perform pg_temp.comprobar(rechazado, nombre);
end; $$;
insert into fase1_ids(nombre) select unnest(array['clinica_A','clinica_B','audit',
'auth_ADMIN','auth_DOCTOR','auth_RECEPCION','auth_CAJA','auth_SUPER_ADMIN','auth_INACTIVO',
'perfil_ADMIN','perfil_DOCTOR','perfil_RECEPCION','perfil_CAJA','perfil_SUPER_ADMIN','perfil_INACTIVO']);
insert into public.clinicas(id,nombre,fecha_vencimiento,dias_gracia)
select id, 'Prueba Fase 1 ' || id, current_date + 30, 7 from fase1_ids where nombre like 'clinica_%';
insert into auth.users(id,email)
select id, id || '@fase1.invalid' from fase1_ids where nombre like 'auth_%';
insert into public.usuarios_perfiles(id,auth_user_id,clinica_id,nombre,usuario,correo,rol,estado)
select pg_temp.id('perfil_' || rol), pg_temp.id('auth_' || rol),
    case when rol='SUPER_ADMIN' then null else pg_temp.id('clinica_A') end,
    'Prueba '||rol, 'fase1_'||pg_temp.id('perfil_'||rol),
    pg_temp.id('perfil_'||rol)||'@fase1.invalid',
    case when rol='INACTIVO' then 'ADMIN' else rol end::public.rol_usuario_sistema,
    case when rol='INACTIVO' then 'Inactivo' else 'Activo' end::public.estado_usuario_sistema
from unnest(array['ADMIN','DOCTOR','RECEPCION','CAJA','SUPER_ADMIN','INACTIVO']) as r(rol);
insert into fase1_ids(nombre) values ('pacientes_A'), ('pacientes_B');
insert into public.pacientes(id,clinica_id,nombre) select pg_temp.id('pacientes_' || lado),pg_temp.id('clinica_' || lado),'Prueba ' || pg_temp.id('pacientes_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('doctores_A'), ('doctores_B');
insert into public.doctores(id,clinica_id,nombre) select pg_temp.id('doctores_' || lado),pg_temp.id('clinica_' || lado),'Prueba ' || pg_temp.id('doctores_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('servicios_A'), ('servicios_B');
insert into public.servicios(id,clinica_id,nombre) select pg_temp.id('servicios_' || lado),pg_temp.id('clinica_' || lado),'Prueba ' || pg_temp.id('servicios_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('citas_A'), ('citas_B');
insert into public.citas(id,clinica_id,fecha,hora) select pg_temp.id('citas_' || lado),pg_temp.id('clinica_' || lado),current_date,'09:00' from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('ventas_A'), ('ventas_B');
insert into public.ventas(id,clinica_id) select pg_temp.id('ventas_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('cuentas_cobrar_A'), ('cuentas_cobrar_B');
insert into public.cuentas_cobrar(id,clinica_id) select pg_temp.id('cuentas_cobrar_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('productos_inventario_A'), ('productos_inventario_B');
insert into public.productos_inventario(id,clinica_id) select pg_temp.id('productos_inventario_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('gastos_A'), ('gastos_B');
insert into public.gastos(id,clinica_id) select pg_temp.id('gastos_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('proveedores_A'), ('proveedores_B');
insert into public.proveedores(id,clinica_id) select pg_temp.id('proveedores_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('compras_proveedores_A'), ('compras_proveedores_B');
insert into public.compras_proveedores(id,clinica_id) select pg_temp.id('compras_proveedores_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('cuentas_pagar_A'), ('cuentas_pagar_B');
insert into public.cuentas_pagar(id,clinica_id) select pg_temp.id('cuentas_pagar_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('suscripciones_A'), ('suscripciones_B');
insert into public.suscripciones(id,clinica_id) select pg_temp.id('suscripciones_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('presupuestos_A'), ('presupuestos_B');
insert into public.presupuestos(id,clinica_id,paciente_id) select pg_temp.id('presupuestos_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('odontogramas_A'), ('odontogramas_B');
insert into public.odontogramas(id,clinica_id,paciente_id) select pg_temp.id('odontogramas_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('pagos_suscripcion_A'), ('pagos_suscripcion_B');
insert into public.pagos_suscripcion(id,clinica_id) select pg_temp.id('pagos_suscripcion_' || lado),pg_temp.id('clinica_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('notas_clinicas_A'), ('notas_clinicas_B');
insert into public.notas_clinicas(id,clinica_id,paciente_id) select pg_temp.id('notas_clinicas_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('tratamientos_A'), ('tratamientos_B');
insert into public.tratamientos(id,clinica_id,paciente_id,nombre) select pg_temp.id('tratamientos_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado),'Prueba ' || pg_temp.id('tratamientos_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('recetas_A'), ('recetas_B');
insert into public.recetas(id,clinica_id,paciente_id,medicamento,indicaciones) select pg_temp.id('recetas_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado),'Prueba ' || pg_temp.id('recetas_' || lado),'Prueba ' || pg_temp.id('recetas_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('abonos_cuentas_cobrar_A'), ('abonos_cuentas_cobrar_B');
insert into public.abonos_cuentas_cobrar(id,clinica_id,cuenta_id) select pg_temp.id('abonos_cuentas_cobrar_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('cuentas_cobrar_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('movimientos_inventario_A'), ('movimientos_inventario_B');
insert into public.movimientos_inventario(id,clinica_id,producto_id,tipo) select pg_temp.id('movimientos_inventario_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('productos_inventario_' || lado),'Entrada' from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('abonos_cuentas_pagar_A'), ('abonos_cuentas_pagar_B');
insert into public.abonos_cuentas_pagar(id,clinica_id,cuenta_id) select pg_temp.id('abonos_cuentas_pagar_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('cuentas_pagar_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('presupuesto_items_A'), ('presupuesto_items_B');
insert into public.presupuesto_items(id,presupuesto_id,clinica_id,paciente_id) select pg_temp.id('presupuesto_items_' || lado),pg_temp.id('presupuestos_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('odontograma_piezas_A'), ('odontograma_piezas_B');
insert into public.odontograma_piezas(id,odontograma_id,clinica_id,paciente_id,codigo) select pg_temp.id('odontograma_piezas_' || lado),pg_temp.id('odontogramas_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado),'Prueba ' || pg_temp.id('odontograma_piezas_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('odontograma_historial_A'), ('odontograma_historial_B');
insert into public.odontograma_historial(id,odontograma_id,clinica_id,paciente_id) select pg_temp.id('odontograma_historial_' || lado),pg_temp.id('odontogramas_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado) from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('documentos_pacientes_A'), ('documentos_pacientes_B');
insert into public.documentos_pacientes(id,clinica_id,paciente_id,storage_path) select pg_temp.id('documentos_pacientes_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado),pg_temp.id('clinica_'||lado)||'/'||pg_temp.id('pacientes_'||lado)||'/prueba.pdf' from unnest(array['A','B']) as l(lado);
insert into fase1_ids(nombre) values ('ordenes_estudio_A'), ('ordenes_estudio_B');
insert into public.ordenes_estudio(id,clinica_id,paciente_id) select pg_temp.id('ordenes_estudio_' || lado),pg_temp.id('clinica_' || lado),pg_temp.id('pacientes_' || lado) from unnest(array['A','B']) as l(lado);

-- A07: las 40 relaciones rechazan cruces, aun usando postgres (sin RLS).
insert into fase1_ids(nombre) values ('pacientes_B_libre');
insert into public.pacientes(id,clinica_id,nombre) values(pg_temp.id('pacientes_B_libre'),pg_temp.id('clinica_B'),'Paciente B sin odontograma');
select pg_temp.denegado($q$update public.pagos_suscripcion set suscripcion_id = pg_temp.id('suscripciones_B') where id = pg_temp.id('pagos_suscripcion_A')$q$, '23503', 'pagos_suscripcion.suscripcion_id: cruce rechazado');
select pg_temp.denegado($q$update public.citas set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('citas_A')$q$, '23503', 'citas.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.citas set doctor_id = pg_temp.id('doctores_B') where id = pg_temp.id('citas_A')$q$, '23503', 'citas.doctor_id: cruce rechazado');
select pg_temp.denegado($q$update public.citas set servicio_id = pg_temp.id('servicios_B') where id = pg_temp.id('citas_A')$q$, '23503', 'citas.servicio_id: cruce rechazado');
select pg_temp.denegado($q$update public.citas set cita_origen_id = pg_temp.id('citas_B') where id = pg_temp.id('citas_A')$q$, '23503', 'citas.cita_origen_id: cruce rechazado');
select pg_temp.denegado($q$update public.notas_clinicas set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('notas_clinicas_A')$q$, '23503', 'notas_clinicas.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.notas_clinicas set doctor_id = pg_temp.id('doctores_B') where id = pg_temp.id('notas_clinicas_A')$q$, '23503', 'notas_clinicas.doctor_id: cruce rechazado');
select pg_temp.denegado($q$update public.notas_clinicas set servicio_id = pg_temp.id('servicios_B') where id = pg_temp.id('notas_clinicas_A')$q$, '23503', 'notas_clinicas.servicio_id: cruce rechazado');
select pg_temp.denegado($q$update public.tratamientos set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('tratamientos_A')$q$, '23503', 'tratamientos.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.recetas set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('recetas_A')$q$, '23503', 'recetas.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.recetas set doctor_id = pg_temp.id('doctores_B') where id = pg_temp.id('recetas_A')$q$, '23503', 'recetas.doctor_id: cruce rechazado');
select pg_temp.denegado($q$update public.ventas set cita_id = pg_temp.id('citas_B') where id = pg_temp.id('ventas_A')$q$, '23503', 'ventas.cita_id: cruce rechazado');
select pg_temp.denegado($q$update public.ventas set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('ventas_A')$q$, '23503', 'ventas.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.cuentas_cobrar set venta_id = pg_temp.id('ventas_B') where id = pg_temp.id('cuentas_cobrar_A')$q$, '23503', 'cuentas_cobrar.venta_id: cruce rechazado');
select pg_temp.denegado($q$update public.cuentas_cobrar set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('cuentas_cobrar_A')$q$, '23503', 'cuentas_cobrar.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.abonos_cuentas_cobrar set cuenta_id = pg_temp.id('cuentas_cobrar_B') where id = pg_temp.id('abonos_cuentas_cobrar_A')$q$, '23503', 'abonos_cuentas_cobrar.cuenta_id: cruce rechazado');
select pg_temp.denegado($q$update public.abonos_cuentas_cobrar set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('abonos_cuentas_cobrar_A')$q$, '23503', 'abonos_cuentas_cobrar.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.abonos_cuentas_cobrar set venta_id = pg_temp.id('ventas_B') where id = pg_temp.id('abonos_cuentas_cobrar_A')$q$, '23503', 'abonos_cuentas_cobrar.venta_id: cruce rechazado');
select pg_temp.denegado($q$update public.compras_proveedores set producto_id = pg_temp.id('productos_inventario_B') where id = pg_temp.id('compras_proveedores_A')$q$, '23503', 'compras_proveedores.producto_id: cruce rechazado');
select pg_temp.denegado($q$update public.compras_proveedores set gasto_id = pg_temp.id('gastos_B') where id = pg_temp.id('compras_proveedores_A')$q$, '23503', 'compras_proveedores.gasto_id: cruce rechazado');
select pg_temp.denegado($q$update public.movimientos_inventario set producto_id = pg_temp.id('productos_inventario_B') where id = pg_temp.id('movimientos_inventario_A')$q$, '23503', 'movimientos_inventario.producto_id: cruce rechazado');
select pg_temp.denegado($q$update public.compras_proveedores set proveedor_id = pg_temp.id('proveedores_B') where id = pg_temp.id('compras_proveedores_A')$q$, '23503', 'compras_proveedores.proveedor_id: cruce rechazado');
select pg_temp.denegado($q$update public.cuentas_pagar set compra_id = pg_temp.id('compras_proveedores_B') where id = pg_temp.id('cuentas_pagar_A')$q$, '23503', 'cuentas_pagar.compra_id: cruce rechazado');
select pg_temp.denegado($q$update public.cuentas_pagar set proveedor_id = pg_temp.id('proveedores_B') where id = pg_temp.id('cuentas_pagar_A')$q$, '23503', 'cuentas_pagar.proveedor_id: cruce rechazado');
select pg_temp.denegado($q$update public.abonos_cuentas_pagar set cuenta_id = pg_temp.id('cuentas_pagar_B') where id = pg_temp.id('abonos_cuentas_pagar_A')$q$, '23503', 'abonos_cuentas_pagar.cuenta_id: cruce rechazado');
select pg_temp.denegado($q$update public.abonos_cuentas_pagar set compra_id = pg_temp.id('compras_proveedores_B') where id = pg_temp.id('abonos_cuentas_pagar_A')$q$, '23503', 'abonos_cuentas_pagar.compra_id: cruce rechazado');
select pg_temp.denegado($q$update public.abonos_cuentas_pagar set proveedor_id = pg_temp.id('proveedores_B') where id = pg_temp.id('abonos_cuentas_pagar_A')$q$, '23503', 'abonos_cuentas_pagar.proveedor_id: cruce rechazado');
select pg_temp.denegado($q$update public.abonos_cuentas_pagar set gasto_id = pg_temp.id('gastos_B') where id = pg_temp.id('abonos_cuentas_pagar_A')$q$, '23503', 'abonos_cuentas_pagar.gasto_id: cruce rechazado');
select pg_temp.denegado($q$update public.presupuestos set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('presupuestos_A')$q$, '23503', 'presupuestos.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.presupuestos set venta_id = pg_temp.id('ventas_B') where id = pg_temp.id('presupuestos_A')$q$, '23503', 'presupuestos.venta_id: cruce rechazado');
select pg_temp.denegado($q$update public.presupuestos set cuenta_cobrar_id = pg_temp.id('cuentas_cobrar_B') where id = pg_temp.id('presupuestos_A')$q$, '23503', 'presupuestos.cuenta_cobrar_id: cruce rechazado');
select pg_temp.denegado($q$update public.presupuesto_items set presupuesto_id = pg_temp.id('presupuestos_B') where id = pg_temp.id('presupuesto_items_A')$q$, '23503', 'presupuesto_items.presupuesto_id: cruce rechazado');
select pg_temp.denegado($q$update public.presupuesto_items set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('presupuesto_items_A')$q$, '23503', 'presupuesto_items.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.odontogramas set paciente_id = pg_temp.id('pacientes_B_libre') where id = pg_temp.id('odontogramas_A')$q$, '23503', 'odontogramas.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.odontograma_piezas set odontograma_id = pg_temp.id('odontogramas_B') where id = pg_temp.id('odontograma_piezas_A')$q$, '23503', 'odontograma_piezas.odontograma_id: cruce rechazado');
select pg_temp.denegado($q$update public.odontograma_piezas set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('odontograma_piezas_A')$q$, '23503', 'odontograma_piezas.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.odontograma_historial set odontograma_id = pg_temp.id('odontogramas_B') where id = pg_temp.id('odontograma_historial_A')$q$, '23503', 'odontograma_historial.odontograma_id: cruce rechazado');
select pg_temp.denegado($q$update public.odontograma_historial set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('odontograma_historial_A')$q$, '23503', 'odontograma_historial.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.documentos_pacientes set paciente_id = pg_temp.id('pacientes_B'), storage_path = pg_temp.id('clinica_A')||'/'||pg_temp.id('pacientes_B')||'/prueba.pdf' where id = pg_temp.id('documentos_pacientes_A')$q$, '23503', 'documentos_pacientes.paciente_id: cruce rechazado');
select pg_temp.denegado($q$update public.ordenes_estudio set paciente_id = pg_temp.id('pacientes_B') where id = pg_temp.id('ordenes_estudio_A')$q$, '23503', 'ordenes_estudio.paciente_id: cruce rechazado');

select pg_temp.denegado($q$update public.documentos_pacientes set storage_path='otra-clinica/otro-paciente/file' where id=pg_temp.id('documentos_pacientes_A')$q$,
'23514', 'Documento: ruta ajena rechazada');
-- A01: todos los roles de navegador, incluido SUPER_ADMIN, usan la API.
set local role authenticated;
do $$
declare rol text;
begin
    foreach rol in array array['ADMIN','DOCTOR','RECEPCION','CAJA','SUPER_ADMIN'] loop
        perform set_config('request.jwt.claim.sub', pg_temp.id('auth_'||rol)::text, true);
        perform pg_temp.denegado('update public.usuarios_perfiles set rol=''SUPER_ADMIN'' where id=pg_temp.id(''perfil_ADMIN'')', '42501', rol||': no puede escalar rol');
        perform pg_temp.denegado('update public.usuarios_perfiles set clinica_id=pg_temp.id(''clinica_B'') where id=pg_temp.id(''perfil_ADMIN'')', '42501', rol||': no puede cambiar clinica');
        perform pg_temp.denegado('update public.usuarios_perfiles set auth_user_id=pg_temp.id(''auth_DOCTOR'') where id=pg_temp.id(''perfil_ADMIN'')', '42501', rol||': no puede cambiar identidad');
    end loop;
end; $$;
select set_config('request.jwt.claim.sub', pg_temp.id('auth_ADMIN')::text, true);
select pg_temp.comprobar((public.verificar_acceso_clinica()->>'permitido')::boolean, 'ADMIN activo con licencia valida');
select pg_temp.comprobar((select count(*)=1 from public.pacientes where id in (pg_temp.id('pacientes_A'),pg_temp.id('pacientes_B'))), 'RLS solo permite pacientes de su clinica');
insert into public.citas(clinica_id,paciente_id,fecha,hora,creado_por)
values(pg_temp.id('clinica_A'),pg_temp.id('pacientes_A'),current_date,'10:00',pg_temp.id('perfil_ADMIN'));
select pg_temp.comprobar(true, 'Escritura legitima de ADMIN permitida');
select pg_temp.denegado($q$insert into public.citas(clinica_id,paciente_id,fecha,hora,creado_por)
values(pg_temp.id('clinica_A'),pg_temp.id('pacientes_B'),current_date,'10:00',pg_temp.id('perfil_ADMIN'))$q$,
'23503', 'INSERT autenticado con paciente ajeno rechazado');

-- A08: autor y fechas no se toman del cliente.
insert into public.auditoria(id,clinica_id,usuario_id,usuario_perfil_id,usuario_nombre,rol_usuario,modulo,accion,creada_en,creado_en)
values(pg_temp.id('audit'),pg_temp.id('clinica_A'),pg_temp.id('perfil_DOCTOR'),pg_temp.id('perfil_SUPER_ADMIN'),
'Autor falso','SUPER_ADMIN','Pruebas','Fase 1','2000-01-01','2000-01-01');
select pg_temp.comprobar((select usuario_id=pg_temp.id('perfil_ADMIN') and usuario_perfil_id=pg_temp.id('perfil_ADMIN')
and usuario_nombre='Prueba ADMIN' and rol_usuario='ADMIN' and creado_en=statement_timestamp() and creada_en=creado_en
from public.auditoria where id=pg_temp.id('audit')), 'Auditoria fija autor, rol y fechas desde la sesion');
select pg_temp.denegado($q$update public.auditoria set accion='Falso' where id=pg_temp.id('audit')$q$, '42501', 'ADMIN no edita auditoria');
select pg_temp.denegado($q$delete from public.auditoria where id=pg_temp.id('audit')$q$, '42501', 'ADMIN no borra auditoria');
select pg_temp.denegado($q$insert into public.auditoria(clinica_id,modulo,accion) values(pg_temp.id('clinica_B'),'Pruebas','Ajena')$q$, '42501', 'No se inserta auditoria en otra clinica');

-- Storage mantiene la comprobacion de licencia incluso usando el API directo.
insert into storage.objects(bucket_id,name) values('documentos-pacientes',pg_temp.id('clinica_A')||'/'||pg_temp.id('pacientes_A')||'/fase1-test');
select pg_temp.comprobar((select count(*)=1 from storage.objects where name=pg_temp.id('clinica_A')||'/'||pg_temp.id('pacientes_A')||'/fase1-test'), 'Storage permite clinica habilitada');

-- A06: cada estado se somete a la fecha, sin saltarse el periodo de gracia.
reset role;
do $$
declare estado_prueba text;
begin
    foreach estado_prueba in array array['Activa','Vencida','Restringida'] loop
        update public.clinicas set estado=estado_prueba::public.estado_clinica where id=pg_temp.id('clinica_A');
        update public.suscripciones set estado=estado_prueba::public.estado_suscripcion,
        fecha_vencimiento=(statement_timestamp() at time zone 'America/Guatemala')::date-8, dias_gracia=7
        where id=pg_temp.id('suscripciones_A');
        perform pg_temp.comprobar(not (public.verificar_acceso_clinica()->>'permitido')::boolean, estado_prueba||': vencimiento fuera de gracia bloqueado');
    end loop;
end; $$;
set local role authenticated;
select pg_temp.comprobar((select count(*)=0 from public.pacientes where id=pg_temp.id('pacientes_A')), 'RLS no lee pacientes vencidos');
select pg_temp.comprobar((select count(*)=0 from storage.objects where name=pg_temp.id('clinica_A')||'/'||pg_temp.id('pacientes_A')||'/fase1-test'), 'Storage no lee archivos con licencia vencida');
select pg_temp.denegado($q$insert into public.pacientes(clinica_id,nombre,creado_por) values(pg_temp.id('clinica_A'),'Bloqueado',pg_temp.id('perfil_ADMIN'))$q$, '42501', 'RLS rechaza escritura con licencia vencida');
select pg_temp.denegado($q$insert into storage.objects(bucket_id,name) values('documentos-pacientes',pg_temp.id('clinica_A')||'/nuevo')$q$, '42501', 'Storage rechaza upload con licencia vencida');
select pg_temp.comprobar((select count(*)=1 from public.usuarios_perfiles where id=pg_temp.id('perfil_ADMIN')), 'Perfil propio disponible para explicar bloqueo');

reset role;
update public.clinicas set estado='Activa' where id=pg_temp.id('clinica_A');
update public.suscripciones set estado='Activa',fecha_vencimiento=(statement_timestamp() at time zone 'America/Guatemala')::date-7,dias_gracia=7 where id=pg_temp.id('suscripciones_A');
select pg_temp.comprobar((public.verificar_acceso_clinica()->>'permitido')::boolean, 'Ultimo dia de gracia permitido');
update public.suscripciones set fecha_vencimiento=(statement_timestamp() at time zone 'America/Guatemala')::date-1,dias_gracia=0 where id=pg_temp.id('suscripciones_A');
select pg_temp.comprobar(not (public.verificar_acceso_clinica()->>'permitido')::boolean, 'Cero dias de gracia no se convierte en siete');
update public.suscripciones set fecha_vencimiento=(statement_timestamp() at time zone 'America/Guatemala')::date,dias_gracia=0 where id=pg_temp.id('suscripciones_A');
select pg_temp.comprobar((public.verificar_acceso_clinica()->>'permitido')::boolean, 'Fecha de vencimiento inclusive');

-- Suspension/cancelacion prevalecen aunque el vencimiento este en el futuro.
update public.suscripciones set fecha_vencimiento=current_date+30,estado='Suspendida' where id=pg_temp.id('suscripciones_A');
select pg_temp.comprobar(not (public.verificar_acceso_clinica()->>'permitido')::boolean, 'Suscripcion suspendida bloqueada');
update public.suscripciones set estado='Cancelada' where id=pg_temp.id('suscripciones_A');
select pg_temp.comprobar(not (public.verificar_acceso_clinica()->>'permitido')::boolean, 'Suscripcion cancelada bloqueada');
update public.suscripciones set estado='Activa' where id=pg_temp.id('suscripciones_A');
update public.clinicas set estado='Suspendida' where id=pg_temp.id('clinica_A');
select pg_temp.comprobar(not (public.verificar_acceso_clinica()->>'permitido')::boolean, 'Clinica suspendida bloqueada');
update public.clinicas set estado='Cancelada' where id=pg_temp.id('clinica_A');
select pg_temp.comprobar(not (public.verificar_acceso_clinica()->>'permitido')::boolean, 'Clinica cancelada bloqueada');
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.id('auth_SUPER_ADMIN')::text,true);
select pg_temp.comprobar((public.verificar_acceso_clinica()->>'permitido')::boolean, 'SUPER_ADMIN activo puede gestionar clinicas bloqueadas');
select pg_temp.denegado($q$delete from public.auditoria where id=pg_temp.id('audit')$q$,'42501','SUPER_ADMIN tampoco borra auditoria');
select set_config('request.jwt.claim.sub',pg_temp.id('auth_INACTIVO')::text,true);
select pg_temp.comprobar(not (public.verificar_acceso_clinica()->>'permitido')::boolean, 'Usuario inactivo bloqueado');
select pg_temp.comprobar((select count(*)=0 from public.pacientes where id=pg_temp.id('pacientes_A')), 'RLS bloquea usuario inactivo');

-- La clave de servicio puede administrar perfiles, pero no borrar auditoria.
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
update public.usuarios_perfiles set nombre='Prueba ADMIN verificada' where id=pg_temp.id('perfil_ADMIN');
select pg_temp.comprobar((select nombre='Prueba ADMIN verificada' from public.usuarios_perfiles where id=pg_temp.id('perfil_ADMIN')), 'Servidor puede actualizar perfil');
insert into public.auditoria(clinica_id,usuario_id,modulo,accion)
values(pg_temp.id('clinica_A'),pg_temp.id('perfil_SUPER_ADMIN'),'Pruebas','Servicio');
select pg_temp.comprobar(true,'Auditoria de SUPER_ADMIN por servidor conserva autor');
select pg_temp.denegado($q$delete from public.auditoria where id=pg_temp.id('audit')$q$,'42501','service_role no borra auditoria');
reset role;
select pg_temp.denegado($q$delete from public.auditoria where id=pg_temp.id('audit')$q$,'42501','Trigger impide borrado incluso con privilegios SQL');
select pg_temp.denegado($q$update public.auditoria set accion='Falso' where id=pg_temp.id('audit')$q$,'42501','Trigger impide modificacion incluso con privilegios SQL');
select pg_temp.denegado($q$truncate public.auditoria$q$,'42501','Trigger impide TRUNCATE');
select pg_temp.denegado($q$delete from public.clinicas where id=pg_temp.id('clinica_A')$q$,'23503','Borrar clinica no destruye auditoria');
select pg_temp.denegado($q$delete from public.usuarios_perfiles where id=pg_temp.id('perfil_ADMIN')$q$,'23503','Borrar perfil no destruye autor de auditoria');
set local role anon;
select pg_temp.denegado($q$select public.verificar_acceso_clinica()$q$,'42501','Anonimo no consulta licencia');
reset role;
select count(*) as pruebas_correctas from fase1_resultados;
rollback;
