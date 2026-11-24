-- Rechazar operacion nula antes de consultar el cache de reintentos.
CREATE OR REPLACE FUNCTION clinica_privada.fase2_ejecutar(operacion text, datos jsonb, solicitud uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
<<fase3>>
declare p public.usuarios_perfiles%rowtype; previo clinica_privada.solicitudes_operacion%rowtype;
    cierre public.cierres_caja%rowtype; cuenta public.cuentas_cobrar%rowtype; abono public.abonos_cuentas_cobrar%rowtype;
    gasto public.gastos%rowtype; resumen jsonb; resultado jsonb; fecha date; monto numeric;
    contado numeric; reportado_tarjeta numeric; reportado_transferencia numeric; estado_cierre public.estado_cierre_caja;
    propia boolean := operacion in ('venta.anular','abono.anular','cuenta.anular','cierre.crear','cierre.reabrir','gasto.crear','gasto.actualizar','gasto.anular');
begin
    if auth.uid() is null or solicitud is null or operacion is null or jsonb_typeof(datos) is distinct from 'object' then raise exception 'Solicitud o sesión inválida.' using errcode='42501'; end if;
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
end; $function$
;
