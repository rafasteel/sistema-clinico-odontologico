-- Fase 1: A01, A06, A07, A08. Ejecutar sobre el esquema existente.
-- Las politicas restrictivas se suman a los permisos por rol existentes.
create schema if not exists clinica_privada;
revoke all on schema clinica_privada from public, anon;
grant usage on schema clinica_privada to authenticated, service_role;

-- Un solo criterio de licencia para RLS, Storage, navegador y servidor.
-- SECURITY DEFINER es necesario para consultar perfil/licencia sin recursion RLS.
-- No acepta identidad ni clinica del cliente; siempre usa auth.uid().
create function clinica_privada.acceso_actual()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
    perfil public.usuarios_perfiles%rowtype;
    clinica public.clinicas%rowtype;
    suscripcion public.suscripciones%rowtype;
    vencimiento date;
    gracia integer;
    hoy date := (statement_timestamp() at time zone 'America/Guatemala')::date;
    estado text := 'Permitido';
    permitido boolean := false;
    mensaje text := 'Acceso permitido.';
begin
    select * into perfil from public.usuarios_perfiles where auth_user_id = auth.uid();
    if perfil.id is null or perfil.estado::text <> 'Activo' then
        estado := 'SinPerfil'; mensaje := 'No se encontró un perfil activo para este usuario.';
    elsif perfil.rol::text = 'SUPER_ADMIN' then
        permitido := true;
    elsif perfil.clinica_id is null then
        estado := 'SinClinica'; mensaje := 'Este usuario no tiene clínica asignada.';
    else
        select * into clinica from public.clinicas where id = perfil.clinica_id;
        select * into suscripcion from public.suscripciones
        where clinica_id = perfil.clinica_id order by creada_en desc, id desc limit 1;
        vencimiento := coalesce(suscripcion.fecha_vencimiento, clinica.fecha_vencimiento);
        gracia := greatest(coalesce(suscripcion.dias_gracia, clinica.dias_gracia, 0), 0);
        if clinica.id is null then
            estado := 'SinClinica'; mensaje := 'No se encontró la clínica asignada.';
        elsif clinica.estado::text = 'Cancelada' or suscripcion.estado::text = 'Cancelada' then
            estado := 'Cancelado'; mensaje := 'La cuenta de esta clínica fue cancelada.';
        elsif clinica.estado::text = 'Suspendida' or suscripcion.estado::text = 'Suspendida' then
            estado := 'Suspendido'; mensaje := 'La cuenta de esta clínica está suspendida.';
        elsif vencimiento is null or hoy > vencimiento + gracia then
            estado := 'Suspendido'; mensaje := 'La suscripción superó el período de gracia.';
        else
            permitido := true;
            if hoy > vencimiento or clinica.estado::text = 'Vencida' or suscripcion.estado::text = 'Vencida' then
                estado := 'Vencido'; mensaje := 'La suscripción está vencida y dentro del período de gracia.';
            elsif clinica.estado::text = 'Restringida' or suscripcion.estado::text = 'Restringida' then
                estado := 'Restringido'; mensaje := 'La cuenta tiene una restricción administrativa.';
            end if;
        end if;
    end if;
    return jsonb_build_object(
        'permitido', permitido, 'estadoAcceso', estado, 'mensaje', mensaje,
        'clinica', case when clinica.id is null then null else jsonb_build_object(
            'id', clinica.id, 'nombre', clinica.nombre, 'estado', clinica.estado,
            'plan', clinica.plan, 'fecha_vencimiento', clinica.fecha_vencimiento,
            'dias_gracia', clinica.dias_gracia) end,
        'suscripcion', case when suscripcion.id is null then null else jsonb_build_object(
            'id', suscripcion.id, 'estado', suscripcion.estado, 'plan', suscripcion.plan,
            'fecha_vencimiento', suscripcion.fecha_vencimiento, 'dias_gracia', suscripcion.dias_gracia,
            'precio_mensual', suscripcion.precio_mensual, 'moneda', suscripcion.moneda) end
    );
end;
$$;
revoke all on function clinica_privada.acceso_actual() from public, anon;
grant execute on function clinica_privada.acceso_actual() to authenticated, service_role;

create function public.verificar_acceso_clinica()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select clinica_privada.acceso_actual(); $$;
revoke all on function public.verificar_acceso_clinica() from public, anon;
grant execute on function public.verificar_acceso_clinica() to authenticated, service_role;

create function clinica_privada.acceso_permitido()
returns boolean language sql stable security invoker set search_path = ''
as $$ select coalesce((clinica_privada.acceso_actual()->>'permitido')::boolean, false); $$;
revoke all on function clinica_privada.acceso_permitido() from public, anon;
grant execute on function clinica_privada.acceso_permitido() to authenticated, service_role;

do $$
declare tabla record;
begin
    for tabla in select tablename from pg_tables where schemaname = 'public'
        and tablename not in ('clinicas', 'suscripciones', 'usuarios_perfiles')
    loop
        execute format('create policy fase1_licencia_activa on public.%I as restrictive for all to authenticated using ((select clinica_privada.acceso_permitido())) with check ((select clinica_privada.acceso_permitido()))', tabla.tablename);
    end loop;
end;
$$;
create policy fase1_licencia_storage on storage.objects as restrictive for all to authenticated
using (bucket_id <> 'documentos-pacientes' or (select clinica_privada.acceso_permitido()))
with check (bucket_id <> 'documentos-pacientes' or (select clinica_privada.acceso_permitido()));

-- El navegador solo consulta perfiles. Toda mutacion pasa por la API que
-- valida sesion, rol, estado, licencia y clinica con la clave del servidor.
drop policy admin_actualiza_usuarios_clinica on public.usuarios_perfiles;
drop policy super_admin_gestiona_usuarios on public.usuarios_perfiles;
revoke insert, update, delete, truncate, references, trigger on public.usuarios_perfiles from anon, authenticated;
create policy fase1_perfiles_licencia on public.usuarios_perfiles as restrictive for select to authenticated
using (auth_user_id = (select auth.uid()) or (select clinica_privada.acceso_permitido()));

-- A07: claves compuestas para las 40 relaciones de negocio.
-- Se mantienen las acciones de borrado originales, sin anular clinica_id.
alter table public.citas add constraint citas_id_clinica_key unique (id, clinica_id);
alter table public.compras_proveedores add constraint compras_proveedores_id_clinica_key unique (id, clinica_id);
alter table public.cuentas_cobrar add constraint cuentas_cobrar_id_clinica_key unique (id, clinica_id);
alter table public.cuentas_pagar add constraint cuentas_pagar_id_clinica_key unique (id, clinica_id);
alter table public.doctores add constraint doctores_id_clinica_key unique (id, clinica_id);
alter table public.gastos add constraint gastos_id_clinica_key unique (id, clinica_id);
alter table public.odontogramas add constraint odontogramas_id_clinica_key unique (id, clinica_id);
alter table public.pacientes add constraint pacientes_id_clinica_key unique (id, clinica_id);
alter table public.presupuestos add constraint presupuestos_id_clinica_key unique (id, clinica_id);
alter table public.productos_inventario add constraint productos_inventario_id_clinica_key unique (id, clinica_id);
alter table public.proveedores add constraint proveedores_id_clinica_key unique (id, clinica_id);
alter table public.servicios add constraint servicios_id_clinica_key unique (id, clinica_id);
alter table public.suscripciones add constraint suscripciones_id_clinica_key unique (id, clinica_id);
alter table public.ventas add constraint ventas_id_clinica_key unique (id, clinica_id);
alter table public.pagos_suscripcion add constraint fase1_pagos_suscripcion_suscripcion_id_clinica_fk foreign key (suscripcion_id, clinica_id) references public.suscripciones (id, clinica_id) on delete set null (suscripcion_id);
alter table public.citas add constraint fase1_citas_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete set null (paciente_id);
alter table public.citas add constraint fase1_citas_doctor_id_clinica_fk foreign key (doctor_id, clinica_id) references public.doctores (id, clinica_id) on delete set null (doctor_id);
alter table public.citas add constraint fase1_citas_servicio_id_clinica_fk foreign key (servicio_id, clinica_id) references public.servicios (id, clinica_id) on delete set null (servicio_id);
alter table public.citas add constraint fase1_citas_cita_origen_id_clinica_fk foreign key (cita_origen_id, clinica_id) references public.citas (id, clinica_id) on delete set null (cita_origen_id);
alter table public.notas_clinicas add constraint fase1_notas_clinicas_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.notas_clinicas add constraint fase1_notas_clinicas_doctor_id_clinica_fk foreign key (doctor_id, clinica_id) references public.doctores (id, clinica_id) on delete set null (doctor_id);
alter table public.notas_clinicas add constraint fase1_notas_clinicas_servicio_id_clinica_fk foreign key (servicio_id, clinica_id) references public.servicios (id, clinica_id) on delete set null (servicio_id);
alter table public.tratamientos add constraint fase1_tratamientos_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.recetas add constraint fase1_recetas_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.recetas add constraint fase1_recetas_doctor_id_clinica_fk foreign key (doctor_id, clinica_id) references public.doctores (id, clinica_id) on delete set null (doctor_id);
alter table public.ventas add constraint fase1_ventas_cita_id_clinica_fk foreign key (cita_id, clinica_id) references public.citas (id, clinica_id) on delete set null (cita_id);
alter table public.ventas add constraint fase1_ventas_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete set null (paciente_id);
alter table public.cuentas_cobrar add constraint fase1_cuentas_cobrar_venta_id_clinica_fk foreign key (venta_id, clinica_id) references public.ventas (id, clinica_id) on delete set null (venta_id);
alter table public.cuentas_cobrar add constraint fase1_cuentas_cobrar_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete set null (paciente_id);
alter table public.abonos_cuentas_cobrar add constraint fase1_abonos_cuentas_cobrar_cuenta_id_clinica_fk foreign key (cuenta_id, clinica_id) references public.cuentas_cobrar (id, clinica_id) on delete cascade;
alter table public.abonos_cuentas_cobrar add constraint fase1_abonos_cuentas_cobrar_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete set null (paciente_id);
alter table public.abonos_cuentas_cobrar add constraint fase1_abonos_cuentas_cobrar_venta_id_clinica_fk foreign key (venta_id, clinica_id) references public.ventas (id, clinica_id) on delete set null (venta_id);
alter table public.compras_proveedores add constraint fase1_compras_proveedores_producto_id_clinica_fk foreign key (producto_id, clinica_id) references public.productos_inventario (id, clinica_id) on delete set null (producto_id);
alter table public.compras_proveedores add constraint fase1_compras_proveedores_gasto_id_clinica_fk foreign key (gasto_id, clinica_id) references public.gastos (id, clinica_id) on delete set null (gasto_id);
alter table public.movimientos_inventario add constraint fase1_movimientos_inventario_producto_id_clinica_fk foreign key (producto_id, clinica_id) references public.productos_inventario (id, clinica_id) on delete cascade;
alter table public.compras_proveedores add constraint fase1_compras_proveedores_proveedor_id_clinica_fk foreign key (proveedor_id, clinica_id) references public.proveedores (id, clinica_id) on delete set null (proveedor_id);
alter table public.cuentas_pagar add constraint fase1_cuentas_pagar_compra_id_clinica_fk foreign key (compra_id, clinica_id) references public.compras_proveedores (id, clinica_id) on delete set null (compra_id);
alter table public.cuentas_pagar add constraint fase1_cuentas_pagar_proveedor_id_clinica_fk foreign key (proveedor_id, clinica_id) references public.proveedores (id, clinica_id) on delete set null (proveedor_id);
alter table public.abonos_cuentas_pagar add constraint fase1_abonos_cuentas_pagar_cuenta_id_clinica_fk foreign key (cuenta_id, clinica_id) references public.cuentas_pagar (id, clinica_id) on delete cascade;
alter table public.abonos_cuentas_pagar add constraint fase1_abonos_cuentas_pagar_compra_id_clinica_fk foreign key (compra_id, clinica_id) references public.compras_proveedores (id, clinica_id) on delete set null (compra_id);
alter table public.abonos_cuentas_pagar add constraint fase1_abonos_cuentas_pagar_proveedor_id_clinica_fk foreign key (proveedor_id, clinica_id) references public.proveedores (id, clinica_id) on delete set null (proveedor_id);
alter table public.abonos_cuentas_pagar add constraint fase1_abonos_cuentas_pagar_gasto_id_clinica_fk foreign key (gasto_id, clinica_id) references public.gastos (id, clinica_id) on delete set null (gasto_id);
alter table public.presupuestos add constraint fase1_presupuestos_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.presupuestos add constraint fase1_presupuestos_venta_id_clinica_fk foreign key (venta_id, clinica_id) references public.ventas (id, clinica_id) on delete set null (venta_id);
alter table public.presupuestos add constraint fase1_presupuestos_cuenta_cobrar_id_clinica_fk foreign key (cuenta_cobrar_id, clinica_id) references public.cuentas_cobrar (id, clinica_id) on delete set null (cuenta_cobrar_id);
alter table public.presupuesto_items add constraint fase1_presupuesto_items_presupuesto_id_clinica_fk foreign key (presupuesto_id, clinica_id) references public.presupuestos (id, clinica_id) on delete cascade;
alter table public.presupuesto_items add constraint fase1_presupuesto_items_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.odontogramas add constraint fase1_odontogramas_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.odontograma_piezas add constraint fase1_odontograma_piezas_odontograma_id_clinica_fk foreign key (odontograma_id, clinica_id) references public.odontogramas (id, clinica_id) on delete cascade;
alter table public.odontograma_piezas add constraint fase1_odontograma_piezas_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.odontograma_historial add constraint fase1_odontograma_historial_odontograma_id_clinica_fk foreign key (odontograma_id, clinica_id) references public.odontogramas (id, clinica_id) on delete cascade;
alter table public.odontograma_historial add constraint fase1_odontograma_historial_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.documentos_pacientes add constraint fase1_documentos_pacientes_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;
alter table public.ordenes_estudio add constraint fase1_ordenes_estudio_paciente_id_clinica_fk foreign key (paciente_id, clinica_id) references public.pacientes (id, clinica_id) on delete cascade;

-- El archivo referenciado tambien pertenece a la clinica y paciente.
alter table public.documentos_pacientes add constraint fase1_documento_ruta_clinica
check (storage_bucket = 'documentos-pacientes'
    and split_part(storage_path, '/', 1) = clinica_id::text
    and split_part(storage_path, '/', 2) = paciente_id::text);

-- A08: historial append-only. No hay permisos de modificar/borrar ni siquiera
-- para SUPER_ADMIN mediante el API; los triggers tambien protegen service_role.
do $$
declare politica record;
begin
    for politica in select policyname from pg_policies where schemaname='public' and tablename='auditoria' loop
        execute format('drop policy %I on public.auditoria', politica.policyname);
    end loop;
end;
$$;
create policy fase1_auditoria_lectura on public.auditoria for select to authenticated
using (public.es_super_admin() or (clinica_id = public.mi_clinica_id() and public.mi_rol()::text = 'ADMIN'));
create policy fase1_auditoria_insercion on public.auditoria for insert to authenticated
with check (
    (select clinica_privada.acceso_permitido())
    and usuario_id = public.mi_perfil_id() and usuario_perfil_id = public.mi_perfil_id()
    and (public.es_super_admin() or clinica_id = public.mi_clinica_id())
);
create policy fase1_auditoria_licencia on public.auditoria as restrictive for all to authenticated
using ((select clinica_privada.acceso_permitido()))
with check ((select clinica_privada.acceso_permitido()));
revoke update, delete, truncate, references, trigger on public.auditoria from anon, authenticated, service_role;
revoke all on public.auditoria from anon;

create function clinica_privada.fijar_autoria_auditoria()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare autor public.usuarios_perfiles%rowtype;
begin
    if auth.uid() is not null then
        select * into autor from public.usuarios_perfiles
        where auth_user_id = auth.uid() and estado::text = 'Activo';
    elsif current_user = 'service_role' then
        select * into autor from public.usuarios_perfiles
        where id = coalesce(new.usuario_perfil_id, new.usuario_id) and estado::text = 'Activo';
    end if;
    if autor.id is null then
        raise exception 'La auditoría requiere un autor activo verificado.' using errcode='42501';
    end if;
    if autor.rol::text <> 'SUPER_ADMIN' and new.clinica_id is distinct from autor.clinica_id then
        raise exception 'El evento no pertenece a la clínica del autor.' using errcode='42501';
    end if;
    new.usuario_id := autor.id;
    new.usuario_perfil_id := autor.id;
    new.usuario_nombre := autor.nombre;
    new.rol_usuario := autor.rol::text;
    new.creada_en := statement_timestamp();
    new.creado_en := new.creada_en;
    return new;
end;
$$;
create function clinica_privada.conservar_auditoria()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
    raise exception 'El historial de auditoría no se puede modificar ni eliminar.' using errcode='42501';
end;
$$;
revoke all on function clinica_privada.fijar_autoria_auditoria() from public, anon, authenticated, service_role;
revoke all on function clinica_privada.conservar_auditoria() from public, anon, authenticated, service_role;
create trigger fase1_auditoria_autor before insert on public.auditoria
for each row execute function clinica_privada.fijar_autoria_auditoria();
create trigger fase1_auditoria_inmutable before update or delete on public.auditoria
for each row execute function clinica_privada.conservar_auditoria();
create trigger fase1_auditoria_no_truncate before truncate on public.auditoria
for each statement execute function clinica_privada.conservar_auditoria();

-- Evitar que borrar una clinica/perfil borre o altere el historial por cascada.
alter table public.auditoria drop constraint auditoria_clinica_id_fkey;
alter table public.auditoria add constraint auditoria_clinica_id_fkey
foreign key (clinica_id) references public.clinicas(id) on delete restrict;
alter table public.auditoria drop constraint auditoria_usuario_id_fkey;
alter table public.auditoria add constraint auditoria_usuario_id_fkey
foreign key (usuario_id) references public.usuarios_perfiles(id) on delete restrict;
alter table public.auditoria drop constraint auditoria_usuario_perfil_id_fkey;
alter table public.auditoria add constraint auditoria_usuario_perfil_id_fkey
foreign key (usuario_perfil_id) references public.usuarios_perfiles(id) on delete restrict;
