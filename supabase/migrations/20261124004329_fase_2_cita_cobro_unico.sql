-- Una cita puede tener un solo cobro activo; los pagos posteriores son abonos.
CREATE OR REPLACE FUNCTION clinica_privada.fase2_venta(p usuarios_perfiles, d jsonb, es_abono boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare total numeric := clinica_privada.fase2_numero(d,'total');
    efectivo numeric := clinica_privada.fase2_numero(d,'efectivo');
    tarjeta numeric := clinica_privada.fase2_numero(d,'tarjeta');
    transferencia numeric := clinica_privada.fase2_numero(d,'transferencia');
    credito numeric; comision numeric := 0; comision_monto numeric;
    pos public.pos_clinica%rowtype; cita public.citas%rowtype; producto public.productos_inventario%rowtype;
    fecha date := coalesce(nullif(d->>'fecha','')::date,(statement_timestamp() at time zone 'America/Guatemala')::date);
    venta jsonb; cuenta jsonb := 'null'; estado text; metodo text; tipo text := coalesce(nullif(d->>'tipo_cobro',''),'Venta');
begin
    if total<=0 or coalesce(btrim(d->>'cliente_nombre'),'')='' or coalesce(btrim(d->>'concepto'),'')='' then
        raise exception 'La venta requiere cliente, concepto y un total mayor que cero.' using errcode='22023';
    end if;
    if tipo='Abono a cuenta' and not es_abono then raise exception 'Los abonos se registran desde su cuenta.' using errcode='22023'; end if;
    credito := clinica_privada.fase2_numero(d,'credito',total-efectivo-tarjeta-transferencia);
    if credito<0 or efectivo+tarjeta+transferencia+credito<>total then
        raise exception 'La suma de pagos y crédito debe coincidir con el total.' using errcode='22023';
    end if;
    if es_abono and credito<>0 then raise exception 'Un abono no puede generar otro crédito.' using errcode='22023'; end if;
    if nullif(d->>'paciente_id','') is not null and not exists(select 1 from public.pacientes
        where id=(d->>'paciente_id')::uuid and clinica_id=p.clinica_id) then
        raise exception 'El paciente no pertenece a tu clínica.' using errcode='42501';
    end if;
    if nullif(d->>'cita_id','') is not null then
        select * into cita from public.citas where id=(d->>'cita_id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'La cita no pertenece a tu clínica.' using errcode='42501'; end if;
        if nullif(d->>'paciente_id','')::uuid is distinct from cita.paciente_id then
            raise exception 'La cita y el paciente no coinciden.' using errcode='22023';
        end if;
        if cita.estado::text='Cobrada' or exists(select 1 from public.ventas v where v.cita_id=cita.id and v.clinica_id=p.clinica_id and v.estado<>'Anulada') then raise exception 'Esta cita ya fue cobrada.' using errcode='22023'; end if;
    end if;
    if tarjeta>0 then
        select * into pos from public.pos_clinica where clinica_id=p.clinica_id and activo
        and (codigo=d->>'pos_id' or id::text=d->>'pos_id') order by id limit 1 for share;
        if not found then raise exception 'Seleccioná un POS activo de tu clínica.' using errcode='22023'; end if;
        comision := pos.comision;
        if comision::text in ('NaN','Infinity','-Infinity') or comision<0 or comision>100 then
            raise exception 'La comisión del POS debe estar entre 0 y 100.' using errcode='22023';
        end if;
        if d ? 'comision_pos_porcentaje' and clinica_privada.fase2_numero(d,'comision_pos_porcentaje')<>comision then
            raise exception 'La comisión del POS cambió. Actualizá los datos e intentá de nuevo.' using errcode='22023';
        end if;
    elsif clinica_privada.fase2_numero(d,'comision_pos_porcentaje')>100 then
        raise exception 'La comisión debe estar entre 0 y 100.' using errcode='22023';
    end if;
    comision_monto := round(tarjeta*comision/100,2);
    estado := case when credito=0 then 'Pagada' when credito=total then 'Crédito' else 'Parcial' end;
    metodo := case when (efectivo>0)::int+(tarjeta>0)::int+(transferencia>0)::int+(credito>0)::int>1 then 'Mixto'
        when efectivo>0 then 'Efectivo' when tarjeta>0 then 'Tarjeta' when transferencia>0 then 'Transferencia' else 'Crédito' end;
    venta := clinica_privada.fase2_insertar('ventas',jsonb_build_object(
        'clinica_id',p.clinica_id,'fecha',fecha,'hora',coalesce(nullif(d->>'hora','')::time,(statement_timestamp() at time zone 'America/Guatemala')::time),
        'tipo_cobro',tipo,'cita_id',cita.id,'paciente_id',nullif(d->>'paciente_id','')::uuid,
        'cliente_nombre',btrim(d->>'cliente_nombre'),'concepto',btrim(d->>'concepto'),
        'total',total,'efectivo',efectivo,'tarjeta',tarjeta,'transferencia',transferencia,'credito',credito,
        'metodo_pago',metodo,'es_pago_mixto',metodo='Mixto','estado',estado,
        'pos_id',case when tarjeta>0 then coalesce(nullif(pos.codigo,''),pos.id::text) end,
        'pos_nombre',coalesce(pos.nombre,''),'pos_banco',coalesce(pos.banco,''),
        'comision_pos_porcentaje',comision,'comision_pos_monto',comision_monto,'neto_tarjeta',tarjeta-comision_monto,
        'usuario_nombre',p.nombre,'observaciones',coalesce(d->>'observaciones',''),'creado_por',p.id));
    if credito>0 then
        cuenta := clinica_privada.fase2_insertar('cuentas_cobrar',jsonb_build_object(
            'clinica_id',p.clinica_id,'venta_id',venta->>'id','paciente_id',venta->'paciente_id',
            'paciente_nombre',venta->>'cliente_nombre','concepto',venta->>'concepto',
            'total',total,'abonado',total-credito,'saldo',credito,'fecha',fecha,
            'fecha_vencimiento',coalesce(nullif(d->>'fecha_vencimiento_credito','')::date,fecha+30),
            'estado',case when credito=total then 'Pendiente' else 'Parcial' end,'creado_por',p.id));
    end if;
    if tipo='Producto' or nullif(d->>'producto_id','') is not null then
        select prod.* into producto from public.productos_inventario prod where prod.id=(d->>'producto_id')::uuid
        and prod.clinica_id=p.clinica_id and prod.estado='Activo' for update;
        if not found then raise exception 'Seleccioná un producto activo de tu clínica.' using errcode='22023'; end if;
        perform clinica_privada.fase2_movimiento(p,jsonb_build_object('producto_id',producto.id,
            'tipo','Salida','cantidad',d->'cantidad_producto','motivo','Venta en caja','referencia',venta->>'id'));
    end if;
    if cita.id is not null then
        update public.citas set estado=case when credito=0 then 'Cobrada'::public.estado_cita_medica else 'Atendida'::public.estado_cita_medica end where id=cita.id;
    end if;
    return jsonb_build_object('venta',venta,'cuenta',cuenta);
end; $function$
;
create unique index fase2_venta_por_cita_activa on public.ventas(cita_id) where cita_id is not null and estado<>'Anulada';
