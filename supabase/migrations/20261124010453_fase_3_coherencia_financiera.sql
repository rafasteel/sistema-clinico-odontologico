-- Fase 3: A04 (reversion de abonos), A05 (ventas frente a cobros), A12 (cierres).
-- Se conservan las instantaneas anteriores y la idempotencia de fase 2.
alter table public.cierres_caja drop constraint cierre_caja_fecha_unica_por_clinica;
create unique index fase3_cierre_activo_por_fecha on public.cierres_caja(clinica_id,fecha) where estado<>'Anulado';
alter table public.cierres_caja
    add column cobros_cantidad integer,
    add column abonos_cobrados numeric(12,2),
    add column total_cobrado numeric(12,2),
    add column resumen_version integer not null default 1,
    add column motivo_reapertura text,
    add column reabierto_por uuid references public.usuarios_perfiles(id) on delete restrict,
    add column reabierto_en timestamptz;
create unique index fase3_abono_por_comprobante on public.abonos_cuentas_cobrar(venta_id) where venta_id is not null;

-- SECURITY INVOKER: la lectura desde el navegador conserva RLS. El
-- despachador privado llama al mismo calculo para la clinica verificada.
create function clinica_privada.fase3_resumen_caja(clinica uuid,dia date)
returns jsonb language sql stable security invoker set search_path='' as $$
    with movimientos as (
        select v.*, (v.tipo_cobro='Abono a cuenta' or exists(
            select 1 from public.abonos_cuentas_cobrar a where a.venta_id=v.id and a.clinica_id=v.clinica_id
        )) as es_abono from public.ventas v where v.clinica_id=clinica and v.fecha=dia and v.estado<>'Anulada'
    ), ingresos as (
        select count(*) filter(where not es_abono) as ventas_cantidad,count(*) as cobros_cantidad,
            coalesce(sum(total) filter(where not es_abono),0) as ventas_brutas,
            coalesce(sum(efectivo+tarjeta+transferencia) filter(where es_abono),0) as abonos_cobrados,
            coalesce(sum(efectivo+tarjeta+transferencia),0) as total_cobrado,
            coalesce(sum(efectivo),0) as efectivo_sistema,coalesce(sum(tarjeta),0) as tarjeta_sistema,
            coalesce(sum(transferencia),0) as transferencia_sistema,
            coalesce(sum(credito) filter(where not es_abono),0) as credito_generado,
            coalesce(sum(comision_pos_monto),0) as comision_pos,coalesce(sum(neto_tarjeta),0) as neto_tarjeta
        from movimientos
    ), egresos as (
        select coalesce(sum(monto) filter(where metodo_pago='Efectivo'),0) as gastos_efectivo,
            coalesce(sum(monto) filter(where metodo_pago='Tarjeta'),0) as gastos_tarjeta,
            coalesce(sum(monto) filter(where metodo_pago='Transferencia'),0) as gastos_transferencia,
            coalesce(sum(monto),0) as gastos_total
        from public.gastos where clinica_id=clinica and fecha=dia and estado='Activo'
    ), resumen as (
        select jsonb_build_object('fecha',dia)||to_jsonb(i.*)||to_jsonb(e.*)||jsonb_build_object(
            'efectivo_esperado',i.efectivo_sistema-e.gastos_efectivo,
            'tarjeta_esperada',i.tarjeta_sistema-e.gastos_tarjeta,
            'transferencia_esperada',i.transferencia_sistema-e.gastos_transferencia) as datos
        from ingresos i cross join egresos e
    ) select datos||jsonb_build_object('huella',md5(datos::text)) from resumen;
$$;
revoke all on function clinica_privada.fase3_resumen_caja(uuid,date) from public,anon,service_role;
grant execute on function clinica_privada.fase3_resumen_caja(uuid,date) to authenticated;
create function public.obtener_resumen_caja(p_fecha date)
returns jsonb language sql stable security invoker set search_path='' as $$
    select clinica_privada.fase3_resumen_caja(public.mi_clinica_id(),p_fecha)
    where public.mi_rol()::text in ('ADMIN','CAJA') and clinica_privada.acceso_permitido();
$$;
revoke all on function public.obtener_resumen_caja(date) from public,anon;
grant execute on function public.obtener_resumen_caja(date) to authenticated;

create function clinica_privada.fase3_exigir_fecha_abierta(clinica uuid,dia date)
returns void language plpgsql set search_path='' as $$
begin
    if dia is null then raise exception 'La fecha es obligatoria.' using errcode='22023'; end if;
    perform pg_advisory_xact_lock(hashtextextended('operacion-clinica:'||clinica,0));
    if exists(select 1 from public.cierres_caja where clinica_id=clinica and fecha=dia and estado<>'Anulado') then
        raise exception 'La fecha % tiene un cierre activo. Un ADMIN debe reabrirla con motivo antes de modificarla.',dia using errcode='PT409';
    end if;
end; $$;
create function clinica_privada.fase3_proteger_periodo()
returns trigger language plpgsql set search_path='' as $$
begin
    if tg_op in ('UPDATE','DELETE') then perform clinica_privada.fase3_exigir_fecha_abierta(old.clinica_id,old.fecha); end if;
    if tg_op in ('INSERT','UPDATE') then perform clinica_privada.fase3_exigir_fecha_abierta(new.clinica_id,new.fecha); end if;
    if tg_op='DELETE' then return old; else return new; end if;
end; $$;
create trigger fase3_ventas_periodo before insert or update or delete on public.ventas
for each row execute function clinica_privada.fase3_proteger_periodo();
create trigger fase3_gastos_periodo before insert or update or delete on public.gastos
for each row execute function clinica_privada.fase3_proteger_periodo();
create trigger fase3_compras_periodo before insert or update or delete on public.compras_proveedores
for each row execute function clinica_privada.fase3_proteger_periodo();

create function clinica_privada.fase3_conservar_cierre()
returns trigger language plpgsql set search_path='' as $$
begin
    if tg_op='UPDATE' and old.estado<>'Anulado' and new.estado='Anulado'
        and coalesce(btrim(new.motivo_reapertura),'')<>'' and new.reabierto_en is not null
        and exists(select 1 from public.usuarios_perfiles where id=new.reabierto_por
            and auth_user_id=auth.uid() and clinica_id=old.clinica_id and rol='ADMIN' and estado='Activo')
        and (to_jsonb(new)-array['estado','motivo_reapertura','reabierto_por','reabierto_en','actualizado_en'])
            =(to_jsonb(old)-array['estado','motivo_reapertura','reabierto_por','reabierto_en','actualizado_en']) then
        return new;
    end if;
    raise exception 'La instantánea del cierre se conserva. Solo un ADMIN puede reabrirla con motivo.' using errcode='42501';
end; $$;
create trigger fase3_cierre_conservar before update or delete on public.cierres_caja
for each row execute function clinica_privada.fase3_conservar_cierre();
create trigger fase3_cierre_no_truncate before truncate on public.cierres_caja
for each statement execute function clinica_privada.fase3_conservar_cierre();
create trigger fase3_ventas_no_truncate before truncate on public.ventas
for each statement execute function clinica_privada.fase3_conservar_cierre();
create trigger fase3_gastos_no_truncate before truncate on public.gastos
for each statement execute function clinica_privada.fase3_conservar_cierre();

create function clinica_privada.fase3_anular_venta(p public.usuarios_perfiles,venta_id uuid)
returns jsonb language plpgsql set search_path='' as $$
declare venta public.ventas%rowtype; abono public.abonos_cuentas_cobrar%rowtype; cuenta public.cuentas_cobrar%rowtype;
    estado_nuevo public.estado_cuenta_cobrar;
begin
    select * into venta from public.ventas where id=venta_id and clinica_id=p.clinica_id for update;
    if not found then raise exception 'No se encontró el cobro en tu clínica.' using errcode='42501'; end if;
    select * into abono from public.abonos_cuentas_cobrar where abonos_cuentas_cobrar.venta_id=venta.id and clinica_id=p.clinica_id for update;
    if found then
        if abono.estado='Anulado' then return to_jsonb(venta); end if;
        select * into cuenta from public.cuentas_cobrar where id=abono.cuenta_id and clinica_id=p.clinica_id for update;
        if not found or cuenta.estado='Anulada' then raise exception 'La cuenta está anulada o no existe. Revisá su venta original antes de anular este abono.' using errcode='22023'; end if;
        if cuenta.abonado<abono.monto or cuenta.saldo+abono.monto>cuenta.total then
            raise exception 'El saldo de la cuenta requiere revisión antes de revertir el abono.' using errcode='22023';
        end if;
        perform clinica_privada.fase3_exigir_fecha_abierta(p.clinica_id,venta.fecha);
        estado_nuevo := case when cuenta.fecha_vencimiento<(statement_timestamp() at time zone 'America/Guatemala')::date
            then 'Vencida'::public.estado_cuenta_cobrar when cuenta.abonado-abono.monto>0
            then 'Parcial'::public.estado_cuenta_cobrar else 'Pendiente'::public.estado_cuenta_cobrar end;
        update public.cuentas_cobrar set abonado=abonado-abono.monto,saldo=saldo+abono.monto,estado=estado_nuevo where id=cuenta.id;
        update public.abonos_cuentas_cobrar set estado='Anulado' where id=abono.id;
        update public.ventas set estado='Anulada' where id=venta.id returning * into venta;
    else
        if venta.tipo_cobro='Abono a cuenta' then raise exception 'El comprobante no tiene un abono vinculado. Revisá la cuenta antes de anularlo.' using errcode='22023'; end if;
        if venta.estado='Anulada' then return to_jsonb(venta); end if;
        if exists(select 1 from public.abonos_cuentas_cobrar a join public.cuentas_cobrar c on c.id=a.cuenta_id
            where c.venta_id=venta.id and a.estado='Activo' and c.clinica_id=p.clinica_id) then
            raise exception 'Anulá primero los abonos activos de esta venta para no dejar cobros sin cuenta.' using errcode='22023';
        end if;
        perform clinica_privada.fase3_exigir_fecha_abierta(p.clinica_id,venta.fecha);
        update public.ventas set estado='Anulada' where id=venta.id returning * into venta;
        update public.cuentas_cobrar set estado='Anulada' where cuentas_cobrar.venta_id=venta.id and clinica_id=p.clinica_id;
        if venta.cita_id is not null then update public.citas set estado='Atendida' where id=venta.cita_id and clinica_id=p.clinica_id; end if;
        perform clinica_privada.fase2_revertir_stock(p,venta.id::text);
    end if;
    insert into public.auditoria(clinica_id,modulo,accion,detalle,referencia_id,datos_anteriores,datos_nuevos)
    values(p.clinica_id,'Caja',case when abono.id is null then 'Venta anulada' else 'Abono anulado' end,
        case when abono.id is null then 'Anulación de venta y sus vínculos.' else 'Se revierte el abono y se restituye el saldo de la cuenta.' end,
        venta.id::text,case when abono.id is null then null else to_jsonb(cuenta) end,to_jsonb(venta));
    return to_jsonb(venta);
end; $$;

-- La funcion anterior queda como implementacion interna de fase 2; nadie
-- puede invocarla desde el API para omitir las nuevas reglas de cierre.
alter function clinica_privada.fase2_ejecutar(text,jsonb,uuid) rename to fase2_ejecutar_base;
revoke all on function clinica_privada.fase2_ejecutar_base(text,jsonb,uuid) from public,anon,authenticated,service_role;
create function clinica_privada.fase2_ejecutar(operacion text,datos jsonb,solicitud uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
<<fase3>>
declare p public.usuarios_perfiles%rowtype; previo clinica_privada.solicitudes_operacion%rowtype;
    cierre public.cierres_caja%rowtype; cuenta public.cuentas_cobrar%rowtype; abono public.abonos_cuentas_cobrar%rowtype;
    gasto public.gastos%rowtype; resumen jsonb; resultado jsonb; fecha date; monto numeric;
    contado numeric; reportado_tarjeta numeric; reportado_transferencia numeric; estado_cierre public.estado_cierre_caja;
    propia boolean := operacion in ('venta.anular','abono.anular','cuenta.anular','cierre.crear','cierre.reabrir','gasto.crear','gasto.actualizar','gasto.anular');
begin
    if auth.uid() is null or solicitud is null or jsonb_typeof(datos) is distinct from 'object' then raise exception 'Solicitud o sesión inválida.' using errcode='42501'; end if;
    select * into p from public.usuarios_perfiles where auth_user_id=auth.uid() and estado='Activo';
    if not found or p.clinica_id is null or not clinica_privada.acceso_permitido() then raise exception 'No tenés acceso activo a esta clínica.' using errcode='42501'; end if;
    if propia then
        if (operacion='cierre.reabrir' and p.rol<>'ADMIN')
            or (operacion in ('cierre.crear','gasto.crear','gasto.actualizar','gasto.anular') and p.rol::text not in ('ADMIN','CAJA'))
            or (operacion in ('venta.anular','abono.anular','cuenta.anular') and p.rol::text not in ('ADMIN','CAJA','RECEPCION')) then
            raise exception 'No tenés permiso para esta operación.' using errcode='42501';
        end if;
    end if;
    perform pg_advisory_xact_lock(hashtextextended('operacion-clinica:'||p.clinica_id,0));
    select * into previo from clinica_privada.solicitudes_operacion where clinica_id=p.clinica_id and solicitud_id=solicitud;
    if found then
        if not propia then return clinica_privada.fase2_ejecutar_base(operacion,datos,solicitud); end if;
        if previo.perfil_id<>p.id or previo.operacion<>operacion or previo.datos<>datos then raise exception 'El identificador de reintento ya se usó con otros datos.' using errcode='22023'; end if;
        return previo.resultado;
    end if;
    case operacion
    when 'venta.anular' then resultado := clinica_privada.fase3_anular_venta(p,(datos->>'id')::uuid);
    when 'abono.anular' then
        select * into abono from public.abonos_cuentas_cobrar where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found or abono.venta_id is null then raise exception 'No se encontró un abono con comprobante en tu clínica.' using errcode='42501'; end if;
        perform clinica_privada.fase3_anular_venta(p,abono.venta_id);
        select to_jsonb(a.*) into resultado from public.abonos_cuentas_cobrar a where id=abono.id;
    when 'cuenta.anular' then
        select * into cuenta from public.cuentas_cobrar where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'No se encontró la cuenta.' using errcode='42501'; end if;
        if cuenta.estado<>'Anulada' then
            if cuenta.venta_id is not null then perform clinica_privada.fase3_anular_venta(p,cuenta.venta_id);
            else
                if exists(select 1 from public.abonos_cuentas_cobrar where cuenta_id=cuenta.id and estado='Activo') then raise exception 'Anulá primero los abonos activos de la cuenta.' using errcode='22023'; end if;
                perform clinica_privada.fase3_exigir_fecha_abierta(p.clinica_id,cuenta.fecha);
                update public.cuentas_cobrar set estado='Anulada' where id=cuenta.id;
            end if;
        end if;
        select to_jsonb(c.*) into resultado from public.cuentas_cobrar c where id=cuenta.id;
    when 'cierre.crear' then
        fecha := nullif(datos->>'fecha','')::date;
        if fecha is null or fecha>(statement_timestamp() at time zone 'America/Guatemala')::date then raise exception 'Elegí una fecha de cierre válida, no futura.' using errcode='22023'; end if;
        perform clinica_privada.fase3_exigir_fecha_abierta(p.clinica_id,fecha);
        resumen := clinica_privada.fase3_resumen_caja(p.clinica_id,fecha);
        if nullif(datos->>'resumen_esperado','') is not null and datos->>'resumen_esperado'<>resumen->>'huella' then
            raise exception 'Los movimientos del día cambiaron. Actualizá el resumen y verificá los montos antes de cerrar.' using errcode='PT409';
        end if;
        contado := clinica_privada.fase2_numero(datos,'efectivo_contado');
        reportado_tarjeta := clinica_privada.fase2_numero(datos,'tarjeta_reportada');
        reportado_transferencia := clinica_privada.fase2_numero(datos,'transferencia_reportada');
        estado_cierre := case when contado=(resumen->>'efectivo_esperado')::numeric
            and reportado_tarjeta=(resumen->>'tarjeta_esperada')::numeric
            and reportado_transferencia=(resumen->>'transferencia_esperada')::numeric then 'Cuadrado'::public.estado_cierre_caja else 'Con diferencia'::public.estado_cierre_caja end;
        insert into public.cierres_caja(clinica_id,fecha,hora,usuario_nombre,creado_por,ventas_cantidad,ventas_brutas,cobros_cantidad,abonos_cobrados,total_cobrado,resumen_version,
            efectivo_sistema,tarjeta_sistema,transferencia_sistema,credito_generado,gastos_efectivo,gastos_tarjeta,gastos_transferencia,gastos_total,
            comision_pos,neto_tarjeta,efectivo_esperado,efectivo_contado,tarjeta_esperada,tarjeta_reportada,transferencia_esperada,transferencia_reportada,
            diferencia_efectivo,diferencia_tarjeta,diferencia_transferencia,estado,observaciones)
        select p.clinica_id,fase3.fecha,(statement_timestamp() at time zone 'America/Guatemala')::time,p.nombre,p.id,r.ventas_cantidad,r.ventas_brutas,
            (resumen->>'cobros_cantidad')::int,(resumen->>'abonos_cobrados')::numeric,(resumen->>'total_cobrado')::numeric,2,
            r.efectivo_sistema,r.tarjeta_sistema,r.transferencia_sistema,r.credito_generado,r.gastos_efectivo,r.gastos_tarjeta,r.gastos_transferencia,r.gastos_total,
            r.comision_pos,r.neto_tarjeta,r.efectivo_esperado,contado,r.tarjeta_esperada,reportado_tarjeta,r.transferencia_esperada,reportado_transferencia,
            contado-r.efectivo_esperado,reportado_tarjeta-r.tarjeta_esperada,reportado_transferencia-r.transferencia_esperada,estado_cierre,coalesce(datos->>'observaciones','')
        from jsonb_populate_record(null::public.cierres_caja,resumen) r returning * into cierre;
        insert into public.auditoria(clinica_id,modulo,accion,detalle,referencia_id,datos_nuevos)
        values(p.clinica_id,'Cierre de Caja','Cierre registrado','Instantánea calculada desde los movimientos de '||fecha,cierre.id::text,to_jsonb(cierre));
        resultado := to_jsonb(cierre);
    when 'cierre.reabrir' then
        if coalesce(btrim(datos->>'motivo'),'')='' then raise exception 'Indicá el motivo de la reapertura.' using errcode='22023'; end if;
        select * into cierre from public.cierres_caja where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'No se encontró el cierre en tu clínica.' using errcode='42501'; end if;
        if cierre.estado<>'Anulado' then
            update public.cierres_caja set estado='Anulado',motivo_reapertura=btrim(datos->>'motivo'),reabierto_por=p.id,reabierto_en=statement_timestamp()
            where id=cierre.id returning * into cierre;
            insert into public.auditoria(clinica_id,modulo,accion,detalle,referencia_id,datos_nuevos)
            values(p.clinica_id,'Cierre de Caja','Cierre reabierto',btrim(datos->>'motivo'),cierre.id::text,to_jsonb(cierre));
        end if;
        resultado := to_jsonb(cierre);
    when 'gasto.crear','gasto.actualizar','gasto.anular' then
        if operacion<>'gasto.crear' then
            select * into gasto from public.gastos where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
            if not found then raise exception 'No se encontró el gasto en tu clínica.' using errcode='42501'; end if;
            if exists(select 1 from public.compras_proveedores where gasto_id=gasto.id and clinica_id=p.clinica_id)
                or exists(select 1 from public.abonos_cuentas_pagar where gasto_id=gasto.id and clinica_id=p.clinica_id) then
                raise exception 'Este gasto está vinculado a una compra o abono. Gestioná su anulación desde Proveedores.' using errcode='22023';
            end if;
            if gasto.estado='Anulado' then
                if operacion='gasto.anular' then resultado := to_jsonb(gasto);
                else raise exception 'No se puede editar un gasto anulado.' using errcode='22023'; end if;
            end if;
        end if;
        if resultado is null then
            if operacion='gasto.anular' then update public.gastos set estado='Anulado' where id=gasto.id returning to_jsonb(gastos.*) into resultado;
            else
                monto := clinica_privada.fase2_numero(datos,'monto'); fecha := coalesce(nullif(datos->>'fecha','')::date,(statement_timestamp() at time zone 'America/Guatemala')::date);
                if monto<=0 or coalesce(btrim(datos->>'categoria'),'')='' or coalesce(btrim(datos->>'descripcion'),'')='' then raise exception 'Completá categoría, descripción y monto positivo.' using errcode='22023'; end if;
                if operacion='gasto.crear' then
                    insert into public.gastos(clinica_id,fecha,hora,categoria,descripcion,monto,metodo_pago,proveedor,usuario_nombre,observaciones,estado,creado_por)
                    values(p.clinica_id,fecha,(statement_timestamp() at time zone 'America/Guatemala')::time,btrim(datos->>'categoria'),btrim(datos->>'descripcion'),monto,
                        (datos->>'metodo_pago')::public.metodo_gasto,coalesce(datos->>'proveedor',''),p.nombre,coalesce(datos->>'observaciones',''),'Activo',p.id)
                    returning to_jsonb(gastos.*) into resultado;
                else
                    update public.gastos set fecha=fase3.fecha,categoria=btrim(datos->>'categoria'),descripcion=btrim(datos->>'descripcion'),monto=fase3.monto,
                        metodo_pago=(datos->>'metodo_pago')::public.metodo_gasto,proveedor=coalesce(datos->>'proveedor',''),observaciones=coalesce(datos->>'observaciones','')
                    where id=gasto.id returning to_jsonb(gastos.*) into resultado;
                end if;
            end if;
        end if;
    else
        if operacion='cuenta.crear' then perform clinica_privada.fase3_exigir_fecha_abierta(p.clinica_id,coalesce(nullif(datos->>'fecha','')::date,(statement_timestamp() at time zone 'America/Guatemala')::date)); end if;
        return clinica_privada.fase2_ejecutar_base(operacion,datos,solicitud);
    end case;
    insert into clinica_privada.solicitudes_operacion(clinica_id,solicitud_id,perfil_id,operacion,datos,resultado)
    values(p.clinica_id,solicitud,p.id,operacion,datos,resultado);
    return resultado;
end; $$;
revoke all on function clinica_privada.fase2_ejecutar(text,jsonb,uuid) from public,anon,service_role;
grant execute on function clinica_privada.fase2_ejecutar(text,jsonb,uuid) to authenticated;
create or replace function public.ejecutar_operacion_clinica(p_operacion text,p_datos jsonb,p_solicitud uuid)
returns jsonb language sql security invoker set search_path='' as $$ select clinica_privada.fase2_ejecutar(p_operacion,p_datos,p_solicitud); $$;
revoke insert,update,delete,truncate on public.gastos,public.cierres_caja from anon,authenticated;
do $$ declare f regprocedure; begin
    for f in select oid::regprocedure from pg_proc where pronamespace='clinica_privada'::regnamespace and proname like 'fase3_%' and proname<>'fase3_resumen_caja'
    loop execute format('revoke all on function %s from public,anon,authenticated,service_role',f); end loop;
end; $$;
-- La clave de servicio tambien pasa por la comprobacion de fecha del trigger.
grant execute on function clinica_privada.fase3_exigir_fecha_abierta(uuid,date) to service_role;
