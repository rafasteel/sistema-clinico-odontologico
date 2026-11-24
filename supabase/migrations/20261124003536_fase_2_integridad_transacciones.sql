-- Fase 2: A02, A03, A10. Funciones transaccionales y escrituras controladas.
-- El unico SECURITY DEFINER es el despachador privado, con auth.uid(),
-- licencia y autorizacion explicita por operacion. Las funciones auxiliares
-- no tienen permiso de ejecucion para los roles del API.
create table clinica_privada.solicitudes_operacion (
    clinica_id uuid not null references public.clinicas(id),
    solicitud_id uuid not null,
    perfil_id uuid not null references public.usuarios_perfiles(id),
    operacion text not null,
    datos jsonb not null,
    resultado jsonb not null,
    creado_en timestamptz not null default now(),
    primary key (clinica_id, solicitud_id)
);
alter table clinica_privada.solicitudes_operacion enable row level security;
revoke all on clinica_privada.solicitudes_operacion from public, anon, authenticated, service_role;
alter table public.odontogramas add column version integer not null default 0 check (version >= 0);
alter table public.movimientos_inventario add column reversion_de uuid unique
    references public.movimientos_inventario(id) on delete restrict;
create index fase2_historial_codigo on public.odontograma_historial(odontograma_id,codigo_local);

create function clinica_privada.fase2_numero(valor jsonb, campo text, respaldo numeric default 0)
returns numeric language plpgsql immutable set search_path='' as $$
declare n numeric; t text := valor->>campo;
begin
    if t is null or t='' then return respaldo; end if;
    begin n := t::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'El campo % debe ser un número válido.', campo using errcode='22023';
    end;
    if n::text in ('NaN','Infinity','-Infinity') or n < 0 or n >= 10000000000 then
        raise exception 'El campo % debe ser finito, no negativo y menor a 10 mil millones.', campo using errcode='22023';
    end if;
    return round(n,2);
end; $$;

-- INSERT parametrizado: omite las columnas ausentes y conserva sus DEFAULT.
-- La lista de tablas es cerrada; el despachador nunca pasa el objeto del
-- cliente directamente. Cada operacion construye sus campos permitidos.
create function clinica_privada.fase2_insertar(tabla text, datos jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare columnas text; seleccion text; resultado jsonb;
begin
    if tabla not in ('ventas','cuentas_cobrar','abonos_cuentas_cobrar','productos_inventario',
        'movimientos_inventario','compras_proveedores','cuentas_pagar','abonos_cuentas_pagar',
        'gastos','presupuestos','presupuesto_items','odontogramas','odontograma_piezas','odontograma_historial') then
        raise exception 'Tabla no permitida.' using errcode='42501';
    end if;
    select string_agg(format('%I',key),',' order by key),string_agg(format('r.%I',key),',' order by key)
    into columnas,seleccion from jsonb_object_keys(datos) key;
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) r returning to_jsonb(%I.*)',
        tabla,columnas,seleccion,tabla,tabla) into resultado using datos;
    return resultado;
end; $$;

create function clinica_privada.fase2_movimiento(p public.usuarios_perfiles,d jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare producto public.productos_inventario%rowtype;
    cantidad numeric := clinica_privada.fase2_numero(d,'cantidad');
    costo numeric; nuevo numeric; tipo text := d->>'tipo';
begin
    if tipo is null or tipo not in ('Entrada','Salida','Uso clínico','Pérdida','Ajuste') then
        raise exception 'Tipo de movimiento inválido.' using errcode='22023';
    end if;
    if cantidad=0 and tipo<>'Ajuste' then raise exception 'La cantidad debe ser mayor que cero.' using errcode='22023'; end if;
    select * into producto from public.productos_inventario
    where id=(d->>'producto_id')::uuid and clinica_id=p.clinica_id for update;
    if not found then raise exception 'No se encontró el producto en tu clínica.' using errcode='42501'; end if;
    costo := clinica_privada.fase2_numero(d,'costo_unitario',producto.costo_compra);
    nuevo := case when tipo='Entrada' then producto.stock+cantidad when tipo='Ajuste' then cantidad else producto.stock-cantidad end;
    if nuevo<0 then raise exception 'No hay suficiente stock disponible.' using errcode='22023'; end if;
    update public.productos_inventario set stock=nuevo,
        costo_compra=case when tipo='Entrada' and nullif(d->>'reversion_de','') is null then costo else costo_compra end where id=producto.id;
    return clinica_privada.fase2_insertar('movimientos_inventario',jsonb_build_object(
        'clinica_id',p.clinica_id,'producto_id',producto.id,'producto_nombre',producto.nombre,
        'fecha',(statement_timestamp() at time zone 'America/Guatemala')::date,
        'hora',(statement_timestamp() at time zone 'America/Guatemala')::time,
        'tipo',tipo,'cantidad',cantidad,'stock_anterior',producto.stock,'stock_nuevo',nuevo,
        'costo_unitario',costo,'motivo',coalesce(d->>'motivo','Movimiento de inventario'),
        'referencia',coalesce(d->>'referencia',''),'usuario_nombre',p.nombre,'creado_por',p.id,
        'reversion_de',nullif(d->>'reversion_de','')::uuid));
end; $$;

create function clinica_privada.fase2_revertir_stock(p public.usuarios_perfiles,referencia text)
returns jsonb language plpgsql set search_path='' as $$
declare salida public.movimientos_inventario%rowtype; resultado jsonb := '[]';
begin
    if referencia is null or referencia='' then raise exception 'Falta la referencia.' using errcode='22023'; end if;
    for salida in select * from public.movimientos_inventario
        where clinica_id=p.clinica_id and movimientos_inventario.referencia=fase2_revertir_stock.referencia
        and tipo='Salida' order by producto_id,id for update
    loop
        if not exists(select 1 from public.movimientos_inventario where reversion_de=salida.id)
        and not exists(select 1 from public.movimientos_inventario where clinica_id=p.clinica_id
            and movimientos_inventario.referencia='ANULACION-'||fase2_revertir_stock.referencia
            and producto_id=salida.producto_id and tipo='Entrada' and reversion_de is null) then
            resultado := resultado || jsonb_build_array(clinica_privada.fase2_movimiento(p,jsonb_build_object(
                'producto_id',salida.producto_id,'tipo','Entrada','cantidad',salida.cantidad,
                'costo_unitario',salida.costo_unitario,'motivo','Reversión de venta '||referencia,
                'referencia','ANULACION-'||referencia,'reversion_de',salida.id)));
        end if;
    end loop;
    return resultado;
end; $$;

create function clinica_privada.fase2_venta(p public.usuarios_perfiles,d jsonb, es_abono boolean default false)
returns jsonb language plpgsql set search_path='' as $$
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
        if cita.estado::text='Cobrada' then raise exception 'Esta cita ya fue cobrada.' using errcode='22023'; end if;
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
end; $$;

create function clinica_privada.fase2_abono_cobrar(p public.usuarios_perfiles,d jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare cuenta public.cuentas_cobrar%rowtype; resultado jsonb; abono jsonb; monto numeric; suma numeric;
begin
    select * into cuenta from public.cuentas_cobrar where id=(d->>'cuenta_id')::uuid and clinica_id=p.clinica_id for update;
    if not found then raise exception 'No se encontró la cuenta en tu clínica.' using errcode='42501'; end if;
    if cuenta.estado in ('Anulada','Pagada') then raise exception 'Esta cuenta está pagada o anulada.' using errcode='22023'; end if;
    suma := clinica_privada.fase2_numero(d,'efectivo')+clinica_privada.fase2_numero(d,'tarjeta')+clinica_privada.fase2_numero(d,'transferencia');
    monto := clinica_privada.fase2_numero(d,'monto',suma);
    if monto<=0 or monto<>suma or monto>cuenta.saldo then raise exception 'El abono debe coincidir con sus pagos y no superar el saldo.' using errcode='22023'; end if;
    resultado := clinica_privada.fase2_venta(p,d||jsonb_build_object('tipo_cobro','Abono a cuenta',
        'total',monto,'credito',0,'paciente_id',cuenta.paciente_id,'cliente_nombre',cuenta.paciente_nombre,
        'concepto','Abono: '||cuenta.concepto,'cita_id',null,'producto_id',null),true);
    abono := clinica_privada.fase2_insertar('abonos_cuentas_cobrar',
        ((resultado->'venta') - array['id','tipo_cobro','cita_id','cliente_nombre','concepto','total','credito','metodo_pago','actualizado_en'])
        ||jsonb_build_object('cuenta_id',cuenta.id,'venta_id',resultado->'venta'->>'id','monto',monto,
            'metodo',resultado->'venta'->>'metodo_pago','estado','Activo','referencia',coalesce(d->>'referencia','')));
    update public.cuentas_cobrar set abonado=abonado+monto,saldo=saldo-monto,
        estado=case when saldo=monto then 'Pagada'::public.estado_cuenta_cobrar else 'Parcial'::public.estado_cuenta_cobrar end
        where id=cuenta.id returning * into cuenta;
    return jsonb_build_object('venta',resultado->'venta','abono',abono,'cuenta',to_jsonb(cuenta));
end; $$;

create function clinica_privada.fase2_gasto(p public.usuarios_perfiles,d jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare monto numeric := clinica_privada.fase2_numero(d,'monto');
begin
    if monto<=0 then raise exception 'El gasto debe ser mayor que cero.' using errcode='22023'; end if;
    return clinica_privada.fase2_insertar('gastos',jsonb_build_object(
        'clinica_id',p.clinica_id,'fecha',(statement_timestamp() at time zone 'America/Guatemala')::date,
        'hora',(statement_timestamp() at time zone 'America/Guatemala')::time,'categoria',d->>'categoria',
        'descripcion',d->>'descripcion','monto',monto,'metodo_pago',d->>'metodo_pago',
        'proveedor',coalesce(d->>'proveedor',''),'observaciones',coalesce(d->>'observaciones',''),
        'estado','Activo','usuario_nombre',p.nombre,'creado_por',p.id));
end; $$;

create function clinica_privada.fase2_compra(p public.usuarios_perfiles,d jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare proveedor public.proveedores%rowtype; producto public.productos_inventario%rowtype;
    cantidad numeric := clinica_privada.fase2_numero(d,'cantidad');
    costo numeric := clinica_privada.fase2_numero(d,'costo_unitario');
    pago numeric := clinica_privada.fase2_numero(d,'pago_ahora');
    total numeric; credito numeric; compra jsonb; gasto jsonb; cuenta jsonb;
begin
    total := round(cantidad*costo,2); credito := total-pago;
    if cantidad<=0 or costo<=0 or credito<0 then raise exception 'Cantidad, costo o pago de compra inválidos.' using errcode='22023'; end if;
    if credito>0 and nullif(d->>'fecha_vencimiento','') is null then raise exception 'Indicá el vencimiento del crédito.' using errcode='22023'; end if;
    select * into proveedor from public.proveedores where id=(d->>'proveedor_id')::uuid and clinica_id=p.clinica_id and estado='Activo' for share;
    if not found then raise exception 'Seleccioná un proveedor activo de tu clínica.' using errcode='42501'; end if;
    select * into producto from public.productos_inventario where id=(d->>'producto_id')::uuid and clinica_id=p.clinica_id and estado='Activo' for update;
    if not found then raise exception 'Seleccioná un producto activo de tu clínica.' using errcode='42501'; end if;
    compra := clinica_privada.fase2_insertar('compras_proveedores',jsonb_build_object(
        'clinica_id',p.clinica_id,'fecha',(statement_timestamp() at time zone 'America/Guatemala')::date,
        'hora',(statement_timestamp() at time zone 'America/Guatemala')::time,
        'proveedor_id',proveedor.id,'proveedor_nombre',proveedor.nombre,'producto_id',producto.id,'producto_nombre',producto.nombre,
        'cantidad',cantidad,'costo_unitario',costo,'total',total,'pago_ahora',pago,'credito',credito,
        'metodo_pago',d->>'metodo_pago','fecha_vencimiento',nullif(d->>'fecha_vencimiento','')::date,
        'estado','Activa','usuario_nombre',p.nombre,'observaciones',coalesce(d->>'observaciones',''),'creado_por',p.id));
    perform clinica_privada.fase2_movimiento(p,jsonb_build_object('producto_id',producto.id,'tipo','Entrada',
        'cantidad',cantidad,'costo_unitario',costo,'referencia',compra->>'id','motivo','Compra a '||proveedor.nombre));
    update public.productos_inventario set proveedor=proveedor.nombre where id=producto.id;
    if pago>0 then
        gasto := clinica_privada.fase2_gasto(p,jsonb_build_object('monto',pago,'categoria','Compra a proveedor',
            'descripcion','Compra de '||producto.nombre||' a '||proveedor.nombre,'metodo_pago',d->>'metodo_pago',
            'proveedor',proveedor.nombre,'observaciones','Compra relacionada: '||(compra->>'id')));
    end if;
    if credito>0 then
        cuenta := clinica_privada.fase2_insertar('cuentas_pagar',jsonb_build_object(
            'clinica_id',p.clinica_id,'compra_id',compra->>'id','proveedor_id',proveedor.id,
            'proveedor_nombre',proveedor.nombre,'concepto','Compra de '||producto.nombre,
            'total',credito,'abonado',0,'saldo',credito,'fecha',(statement_timestamp() at time zone 'America/Guatemala')::date,
            'fecha_vencimiento',nullif(d->>'fecha_vencimiento','')::date,
            'estado',case when pago>0 then 'Parcial' else 'Pendiente' end,'creado_por',p.id));
    end if;
    update public.compras_proveedores set gasto_id=(gasto->>'id')::uuid,cuenta_pagar_id=(cuenta->>'id')::uuid
    where id=(compra->>'id')::uuid returning to_jsonb(compras_proveedores.*) into compra;
    return compra;
end; $$;

create function clinica_privada.fase2_abono_pagar(p public.usuarios_perfiles,d jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare cuenta public.cuentas_pagar%rowtype; gasto jsonb; monto numeric := clinica_privada.fase2_numero(d,'monto');
begin
    select * into cuenta from public.cuentas_pagar where id=(d->>'cuenta_id')::uuid and clinica_id=p.clinica_id for update;
    if not found then raise exception 'La cuenta no pertenece a tu clínica.' using errcode='42501'; end if;
    if cuenta.estado in ('Anulada','Pagada') or monto<=0 or monto>cuenta.saldo then
        raise exception 'El abono debe ser positivo y no superar el saldo de una cuenta pendiente.' using errcode='22023';
    end if;
    gasto := clinica_privada.fase2_gasto(p,jsonb_build_object('monto',monto,'categoria','Abono a proveedor',
        'descripcion','Abono a '||cuenta.proveedor_nombre||': '||cuenta.concepto,'metodo_pago',d->>'metodo',
        'proveedor',cuenta.proveedor_nombre,'observaciones',coalesce(d->>'observaciones','Abono a '||cuenta.id)));
    update public.cuentas_pagar set abonado=abonado+monto,saldo=saldo-monto,
        estado=case when saldo=monto then 'Pagada'::public.estado_cuenta_pagar else 'Parcial'::public.estado_cuenta_pagar end where id=cuenta.id;
    return clinica_privada.fase2_insertar('abonos_cuentas_pagar',jsonb_build_object(
        'clinica_id',p.clinica_id,'cuenta_id',cuenta.id,'compra_id',cuenta.compra_id,'proveedor_id',cuenta.proveedor_id,
        'gasto_id',gasto->>'id','fecha',gasto->'fecha','hora',gasto->'hora','monto',monto,
        'metodo',d->>'metodo','estado','Activo','usuario_nombre',p.nombre,'creado_por',p.id,
        'observaciones',coalesce(d->>'observaciones','')));
end; $$;

create function clinica_privada.fase2_producto(p public.usuarios_perfiles,d jsonb,crear boolean)
returns jsonb language plpgsql set search_path='' as $$
declare anterior public.productos_inventario%rowtype; producto jsonb; datos jsonb;
    stock numeric := clinica_privada.fase2_numero(d,'stock');
begin
    if coalesce(btrim(d->>'nombre'),'')='' or coalesce(btrim(d->>'categoria'),'')='' or coalesce(btrim(d->>'unidad'),'')='' then
        raise exception 'El producto requiere nombre, categoría y unidad.' using errcode='22023';
    end if;
    datos := jsonb_build_object('clinica_id',p.clinica_id,
        'codigo',coalesce(nullif(btrim(d->>'codigo'),''),'PROD-'||gen_random_uuid()),
        'nombre',btrim(d->>'nombre'),'categoria',btrim(d->>'categoria'),'unidad',btrim(d->>'unidad'),
        'stock',stock,'stock_minimo',clinica_privada.fase2_numero(d,'stock_minimo'),
        'costo_compra',clinica_privada.fase2_numero(d,'costo_compra'),'precio_venta',clinica_privada.fase2_numero(d,'precio_venta'),
        'proveedor',coalesce(d->>'proveedor',''),'vencimiento',nullif(d->>'vencimiento','')::date);
    if crear then
        producto := clinica_privada.fase2_insertar('productos_inventario',datos||jsonb_build_object('creado_por',p.id,'estado','Activo','stock',0));
        anterior.stock := 0;
    else
        select * into anterior from public.productos_inventario where id=(d->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'No se encontró el producto en tu clínica.' using errcode='42501'; end if;
        if nullif(d->>'actualizado_en_esperado','') is null then
            raise exception 'Falta la versión del producto. Actualizá la lista.' using errcode='22023';
        end if;
        if anterior.actualizado_en<>(d->>'actualizado_en_esperado')::timestamptz then
            raise exception 'El producto cambió mientras lo editabas. Actualizá la lista.' using errcode='40001';
        end if;
        update public.productos_inventario t set codigo=r.codigo,nombre=r.nombre,categoria=r.categoria,unidad=r.unidad,
            stock_minimo=r.stock_minimo,costo_compra=r.costo_compra,precio_venta=r.precio_venta,proveedor=r.proveedor,vencimiento=r.vencimiento
        from jsonb_populate_record(null::public.productos_inventario,datos) r where t.id=anterior.id
        returning to_jsonb(t.*) into producto;
    end if;
    if stock<>anterior.stock then
        perform clinica_privada.fase2_movimiento(p,jsonb_build_object('producto_id',producto->>'id','tipo','Ajuste',
            'cantidad',stock,'costo_unitario',datos->'costo_compra','motivo',case when crear then 'Registro inicial' else 'Ajuste por edición' end));
    end if;
    select to_jsonb(t.*) into producto from public.productos_inventario t where id=(producto->>'id')::uuid;
    return producto;
end; $$;

create function clinica_privada.fase2_presupuesto(p public.usuarios_perfiles,d jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare paciente public.pacientes%rowtype; item jsonb; presupuesto jsonb; subtotal numeric := 0;
    descuento numeric := clinica_privada.fase2_numero(d,'descuento'); cantidad numeric; precio numeric; i integer := 0;
begin
    select * into paciente from public.pacientes where id=(d->>'paciente_id')::uuid and clinica_id=p.clinica_id for share;
    if not found then raise exception 'El paciente no pertenece a tu clínica.' using errcode='42501'; end if;
    if jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items')=0 then
        raise exception 'El presupuesto requiere al menos un tratamiento.' using errcode='22023';
    end if;
    if coalesce(d->>'estado','Pendiente') not in ('Pendiente','Aprobado','Rechazado') then
        raise exception 'Estado de presupuesto inválido.' using errcode='22023';
    end if;
    for item in select value from jsonb_array_elements(d->'items') loop
        cantidad := clinica_privada.fase2_numero(item,'cantidad'); precio := clinica_privada.fase2_numero(item,'precio_unitario');
        if cantidad<=0 or coalesce(btrim(item->>'nombre'),'')='' then raise exception 'Tratamiento o cantidad inválidos.' using errcode='22023'; end if;
        subtotal := subtotal+round(cantidad*precio,2);
    end loop;
    if descuento>subtotal then raise exception 'El descuento no puede superar el subtotal.' using errcode='22023'; end if;
    presupuesto := clinica_privada.fase2_insertar('presupuestos',jsonb_build_object(
        'clinica_id',p.clinica_id,'paciente_id',paciente.id,'paciente_nombre',paciente.nombre,
        'fecha',coalesce(nullif(d->>'fecha','')::date,(statement_timestamp() at time zone 'America/Guatemala')::date),
        'hora',coalesce(nullif(d->>'hora','')::time,(statement_timestamp() at time zone 'America/Guatemala')::time),
        'estado',coalesce(d->>'estado','Pendiente'),'subtotal',subtotal,'descuento',descuento,'total',subtotal-descuento,
        'observaciones',coalesce(d->>'observaciones',''),'origen',coalesce(d->>'origen','Manual'),
        'pieza_codigo',coalesce(d->>'pieza_codigo',d->'items'->0->>'pieza_codigo',''),
        'cara',coalesce(nullif(d->>'cara',''),nullif(d->'items'->0->>'cara','')),
        'estado_dental',coalesce(nullif(d->>'estado_dental',''),nullif(d->'items'->0->>'estado_dental','')),
        'usuario_nombre',p.nombre,'creado_por',p.id));
    for item in select value from jsonb_array_elements(d->'items') loop
        i := i+1; cantidad := clinica_privada.fase2_numero(item,'cantidad'); precio := clinica_privada.fase2_numero(item,'precio_unitario');
        perform clinica_privada.fase2_insertar('presupuesto_items',jsonb_build_object(
            'presupuesto_id',presupuesto->>'id','clinica_id',p.clinica_id,'paciente_id',paciente.id,'orden',i,
            'pieza_codigo',coalesce(item->>'pieza_codigo',''),'pieza_numero',coalesce(item->>'pieza_numero',item->>'pieza_codigo',''),
            'cara',nullif(item->>'cara',''),'estado_dental',nullif(item->>'estado_dental',''),
            'nombre',btrim(item->>'nombre'),'tratamiento',coalesce(item->>'tratamiento',item->>'nombre'),
            'descripcion',coalesce(item->>'descripcion',''),'cantidad',cantidad,'precio_unitario',precio,'precio',precio,
            'subtotal',round(cantidad*precio,2),'total',round(cantidad*precio,2),'estado',coalesce(item->>'estado','Pendiente')));
    end loop;
    return presupuesto;
end; $$;
create function clinica_privada.fase2_odontograma(p public.usuarios_perfiles,d jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare od public.odontogramas%rowtype; pieza jsonb; evento jsonb; fila public.odontograma_piezas%rowtype;
    paciente uuid := (d->>'pacienteId')::uuid; esperada integer := (d->>'version')::integer;
begin
    if esperada is null or esperada<0 then raise exception 'Falta la versión del odontograma. Actualizá el expediente.' using errcode='22023'; end if;
    if not exists(select 1 from public.pacientes where id=paciente and clinica_id=p.clinica_id) then
        raise exception 'El paciente no pertenece a tu clínica.' using errcode='42501';
    end if;
    if jsonb_typeof(d->'piezas') is distinct from 'array' or jsonb_array_length(d->'piezas')=0
    or jsonb_typeof(d->'historial') is distinct from 'array' then
        raise exception 'El odontograma requiere piezas e historial válidos.' using errcode='22023';
    end if;
    if (select count(*)<>count(distinct value->>'codigo') from jsonb_array_elements(d->'piezas')) then
        raise exception 'Hay piezas duplicadas.' using errcode='22023';
    end if;
    select * into od from public.odontogramas where paciente_id=paciente and clinica_id=p.clinica_id for update;
    if not found then
        if esperada<>0 then raise exception 'El odontograma cambió. Actualizá el expediente.' using errcode='40001'; end if;
        insert into public.odontogramas(clinica_id,paciente_id,creado_por)
        values(p.clinica_id,paciente,p.id) returning * into od;
    end if;
    if od.version<>esperada then raise exception 'Otro usuario modificó el odontograma. Actualizá el expediente antes de aplicar el cambio.' using errcode='40001'; end if;
    for pieza in select value from jsonb_array_elements(d->'piezas') loop
        if coalesce(pieza->>'codigo','') !~ '^([1-4][1-8]|[5-8][1-5])$' then
            raise exception 'Código dental inválido.' using errcode='22023';
        end if;
        select * into fila from jsonb_populate_record(null::public.odontograma_piezas,jsonb_build_object(
            'codigo',pieza->>'codigo','numero_legacy',pieza->'numeroLegacy','nombre',pieza->>'nombre',
            'tipo',pieza->>'tipo','arcada',pieza->>'arcada','cuadrante',pieza->>'cuadrante','denticion',pieza->>'denticion',
            'cara_sup',pieza->'caras'->>'sup','cara_der',pieza->'caras'->>'der','cara_inf',pieza->'caras'->>'inf',
            'cara_izq',pieza->'caras'->>'izq','cara_centro',pieza->'caras'->>'centro',
            'nota',coalesce(pieza->>'nota',''),'actualizado_texto',coalesce(pieza->>'actualizadoEn','')));
        insert into public.odontograma_piezas(odontograma_id,clinica_id,paciente_id,codigo,numero_legacy,nombre,tipo,arcada,cuadrante,denticion,
            cara_sup,cara_der,cara_inf,cara_izq,cara_centro,nota,actualizado_texto)
        values(od.id,p.clinica_id,paciente,fila.codigo,fila.numero_legacy,fila.nombre,fila.tipo,fila.arcada,fila.cuadrante,fila.denticion,
            fila.cara_sup,fila.cara_der,fila.cara_inf,fila.cara_izq,fila.cara_centro,fila.nota,fila.actualizado_texto)
        on conflict (odontograma_id,codigo) do update set numero_legacy=excluded.numero_legacy,nombre=excluded.nombre,
            tipo=excluded.tipo,arcada=excluded.arcada,cuadrante=excluded.cuadrante,denticion=excluded.denticion,
            cara_sup=excluded.cara_sup,cara_der=excluded.cara_der,cara_inf=excluded.cara_inf,cara_izq=excluded.cara_izq,
            cara_centro=excluded.cara_centro,nota=excluded.nota,actualizado_texto=excluded.actualizado_texto;
    end loop;
    for evento in select value from jsonb_array_elements(d->'historial') loop
        if coalesce(evento->>'id','')='' then raise exception 'Falta el identificador del evento clínico.' using errcode='22023'; end if;
        if not exists(select 1 from public.odontograma_historial where odontograma_id=od.id and codigo_local=evento->>'id') then
            if coalesce(evento->>'cara','') not in ('sup','der','inf','izq','centro','todas') then
                raise exception 'Cara dental inválida.' using errcode='22023';
            end if;
            perform clinica_privada.fase2_insertar('odontograma_historial',jsonb_build_object(
                'odontograma_id',od.id,'clinica_id',p.clinica_id,'paciente_id',paciente,'codigo_local',evento->>'id',
                'fecha',(statement_timestamp() at time zone 'America/Guatemala')::date,
                'hora',(statement_timestamp() at time zone 'America/Guatemala')::time,
                'pieza_codigo',evento->>'piezaCodigo','pieza_numero_legacy',evento->'piezaNumeroLegacy',
                'cara',evento->>'cara','estado',evento->>'estado','nota',coalesce(evento->>'nota',''),'usuario_nombre',p.nombre));
        end if;
    end loop;
    update public.odontogramas set version=version+1,actualizado_texto=coalesce(d->>'actualizadoEn','') where id=od.id
    returning * into od;
    return jsonb_build_object('id',od.id,'version',od.version);
end; $$;

create function clinica_privada.fase2_conservar_historial()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'El historial clínico no se puede modificar ni eliminar.' using errcode='42501'; end; $$;
create trigger fase2_historial_inmutable before update or delete on public.odontograma_historial
for each row execute function clinica_privada.fase2_conservar_historial();
create trigger fase2_historial_no_truncate before truncate on public.odontograma_historial
for each statement execute function clinica_privada.fase2_conservar_historial();

-- Lectura de una sola instantanea, sin limite de filas de PostgREST sobre el
-- historial agregado. SECURITY INVOKER conserva RLS y la licencia de fase 1.
create function public.obtener_odontograma_completo(p_paciente_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
    select to_jsonb(o.*)||jsonb_build_object(
        'piezas',coalesce((select jsonb_agg(to_jsonb(p.*) order by numero_legacy,codigo) from public.odontograma_piezas p where odontograma_id=o.id),'[]'::jsonb),
        'historial',coalesce((select jsonb_agg(to_jsonb(h.*) order by creado_en desc,id desc) from public.odontograma_historial h where odontograma_id=o.id),'[]'::jsonb)
    ) from public.odontogramas o where paciente_id=p_paciente_id and clinica_id=public.mi_clinica_id();
$$;
revoke all on function public.obtener_odontograma_completo(uuid) from public,anon;
grant execute on function public.obtener_odontograma_completo(uuid) to authenticated;

create function clinica_privada.fase2_ejecutar(operacion text,datos jsonb,solicitud uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.usuarios_perfiles%rowtype; roles text[]; previo clinica_privada.solicitudes_operacion%rowtype;
    resultado jsonb; venta public.ventas%rowtype; cuenta public.cuentas_cobrar%rowtype;
    compra public.compras_proveedores%rowtype; presupuesto public.presupuestos%rowtype;
    producto public.productos_inventario%rowtype; total numeric; abonado numeric; saldo numeric; concepto text;
begin
    if auth.uid() is null or solicitud is null or jsonb_typeof(datos) is distinct from 'object' then
        raise exception 'Solicitud o sesión inválida.' using errcode='42501';
    end if;
    select * into p from public.usuarios_perfiles where auth_user_id=auth.uid() and estado='Activo';
    if not found or p.clinica_id is null or not clinica_privada.acceso_permitido() then
        raise exception 'No tenés acceso activo a esta clínica.' using errcode='42501';
    end if;
    roles := case
        when operacion in ('venta.registrar','venta.anular','cuenta.crear','cuenta.estado','cuenta.anular',
            'abono.cobrar','inventario.movimiento','inventario.revertir','producto.actualizar','producto.estado')
            then array['ADMIN','CAJA','RECEPCION']
        when operacion in ('compra.registrar','compra.anular','abono.pagar') then array['ADMIN','CAJA']
        when operacion in ('presupuesto.crear','presupuesto.estado','odontograma.guardar') then array['ADMIN','DOCTOR','RECEPCION']
        when operacion='presupuesto.convertir' then array['ADMIN','RECEPCION']
        when operacion in ('producto.crear','presupuesto.eliminar') then array['ADMIN']
    end;
    if roles is null or not (p.rol::text=any(roles)) then raise exception 'No tenés permiso para esta operación.' using errcode='42501'; end if;
    -- Serializar escrituras breves por clinica evita ordenes de bloqueo
    -- contradictorios entre compras, cobros y anulaciones; otras clinicas
    -- continúan en paralelo. Los registros afectados tambien usan FOR UPDATE.
    perform pg_advisory_xact_lock(hashtextextended('operacion-clinica:'||p.clinica_id,0));
    select * into previo from clinica_privada.solicitudes_operacion where clinica_id=p.clinica_id and solicitud_id=solicitud;
    if found then
        if previo.perfil_id<>p.id or previo.operacion<>operacion or previo.datos<>datos then
            raise exception 'El identificador de reintento ya se usó con otros datos.' using errcode='22023';
        end if;
        return previo.resultado;
    end if;
    case operacion
    when 'venta.registrar' then resultado := clinica_privada.fase2_venta(p,datos);
    when 'abono.cobrar' then resultado := clinica_privada.fase2_abono_cobrar(p,datos);
    when 'inventario.movimiento' then resultado := clinica_privada.fase2_movimiento(p,datos - 'reversion_de');
    when 'inventario.revertir' then
        -- No se permite reponer existencias de una venta que sigue activa.
        select * into venta from public.ventas where id=(datos->>'referencia')::uuid and clinica_id=p.clinica_id for update;
        if not found or venta.estado<>'Anulada' then raise exception 'Solo se puede revertir stock de una venta anulada.' using errcode='22023'; end if;
        resultado := clinica_privada.fase2_revertir_stock(p,datos->>'referencia');
    when 'producto.crear' then resultado := clinica_privada.fase2_producto(p,datos,true);
    when 'producto.actualizar' then resultado := clinica_privada.fase2_producto(p,datos,false);
    when 'producto.estado' then
        select * into producto from public.productos_inventario where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'No se encontró el producto.' using errcode='42501'; end if;
        update public.productos_inventario set estado=coalesce(nullif(datos->>'estado','')::public.estado_producto_inventario,
            case when producto.estado='Activo' then 'Inactivo'::public.estado_producto_inventario else 'Activo'::public.estado_producto_inventario end)
        where id=producto.id returning to_jsonb(productos_inventario.*) into resultado;
    when 'compra.registrar' then resultado := clinica_privada.fase2_compra(p,datos);
    when 'abono.pagar' then resultado := clinica_privada.fase2_abono_pagar(p,datos);
    when 'compra.anular' then
        select * into compra from public.compras_proveedores where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'No se encontró la compra.' using errcode='42501'; end if;
        if compra.estado<>'Anulada' then
            if compra.producto_id is not null then
                perform clinica_privada.fase2_movimiento(p,jsonb_build_object('producto_id',compra.producto_id,
                    'tipo','Salida','cantidad',compra.cantidad,'costo_unitario',compra.costo_unitario,
                    'motivo','Anulación de compra','referencia','ANULACION-'||compra.id));
            end if;
            update public.gastos set estado='Anulado' where clinica_id=p.clinica_id and
                (id=compra.gasto_id or id in (select gasto_id from public.abonos_cuentas_pagar where cuenta_id=compra.cuenta_pagar_id and clinica_id=p.clinica_id));
            update public.abonos_cuentas_pagar set estado='Anulado' where cuenta_id=compra.cuenta_pagar_id and clinica_id=p.clinica_id;
            update public.cuentas_pagar set saldo=0,estado='Anulada' where id=compra.cuenta_pagar_id and clinica_id=p.clinica_id;
            update public.compras_proveedores set estado='Anulada' where id=compra.id returning * into compra;
        end if;
        resultado := to_jsonb(compra);
    when 'venta.anular' then
        select * into venta from public.ventas where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'No se encontró la venta.' using errcode='42501'; end if;
        if venta.estado<>'Anulada' then
            update public.ventas set estado='Anulada' where id=venta.id returning * into venta;
            update public.cuentas_cobrar set estado='Anulada' where venta_id=venta.id and clinica_id=p.clinica_id;
            if venta.cita_id is not null then update public.citas set estado='Atendida' where id=venta.cita_id and clinica_id=p.clinica_id; end if;
            perform clinica_privada.fase2_revertir_stock(p,venta.id::text);
        end if;
        resultado := to_jsonb(venta);
    when 'cuenta.crear' then
        total := clinica_privada.fase2_numero(datos,'total'); abonado := clinica_privada.fase2_numero(datos,'abonado');
        saldo := clinica_privada.fase2_numero(datos,'saldo',total-abonado);
        if total<=0 or saldo<0 or abonado+saldo<>total or coalesce(btrim(datos->>'paciente_nombre'),'')='' or coalesce(btrim(datos->>'concepto'),'')='' then
            raise exception 'Total, abonado y saldo de la cuenta no son coherentes.' using errcode='22023';
        end if;
        if nullif(datos->>'venta_id','') is not null then
            select * into venta from public.ventas where id=(datos->>'venta_id')::uuid and clinica_id=p.clinica_id for update;
            if not found or venta.estado='Anulada' or venta.total<>total or venta.credito<>saldo then
                raise exception 'La cuenta no coincide con su venta.' using errcode='22023';
            end if;
        end if;
        resultado := clinica_privada.fase2_insertar('cuentas_cobrar',jsonb_build_object(
            'clinica_id',p.clinica_id,'venta_id',nullif(datos->>'venta_id','')::uuid,'paciente_id',nullif(datos->>'paciente_id','')::uuid,
            'paciente_nombre',btrim(datos->>'paciente_nombre'),'concepto',btrim(datos->>'concepto'),'total',total,'abonado',abonado,'saldo',saldo,
            'fecha',coalesce(nullif(datos->>'fecha','')::date,(statement_timestamp() at time zone 'America/Guatemala')::date),
            'fecha_vencimiento',nullif(datos->>'fecha_vencimiento','')::date,
            'estado',case when saldo=0 then 'Pagada' when abonado>0 then 'Parcial' else 'Pendiente' end,'creado_por',p.id));
    when 'cuenta.estado','cuenta.anular' then
        select * into cuenta from public.cuentas_cobrar where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'No se encontró la cuenta.' using errcode='42501'; end if;
        update public.cuentas_cobrar set estado=case
            when operacion='cuenta.anular' or cuenta.estado='Anulada' then 'Anulada'::public.estado_cuenta_cobrar
            when cuenta.saldo=0 then 'Pagada'::public.estado_cuenta_cobrar
            when cuenta.abonado>0 then 'Parcial'::public.estado_cuenta_cobrar else 'Pendiente'::public.estado_cuenta_cobrar end
        where id=cuenta.id returning to_jsonb(cuentas_cobrar.*) into resultado;
    when 'presupuesto.crear' then resultado := clinica_privada.fase2_presupuesto(p,datos);
    when 'presupuesto.convertir','presupuesto.estado','presupuesto.eliminar' then
        select * into presupuesto from public.presupuestos where id=(datos->>'id')::uuid and clinica_id=p.clinica_id for update;
        if not found then raise exception 'No se encontró el presupuesto.' using errcode='42501'; end if;
        if operacion='presupuesto.convertir' then
            if presupuesto.estado::text='Rechazado' then raise exception 'No se puede convertir un presupuesto rechazado.' using errcode='22023'; end if;
            if presupuesto.estado::text<>'Convertido a venta' then
                select string_agg(nombre,', ' order by orden) into concepto from public.presupuesto_items where presupuesto_id=presupuesto.id;
                resultado := clinica_privada.fase2_venta(p,jsonb_build_object('tipo_cobro','Presupuesto convertido',
                    'paciente_id',presupuesto.paciente_id,'cliente_nombre',presupuesto.paciente_nombre,
                    'concepto',coalesce(nullif(left(concepto,180),''),'Presupuesto '||presupuesto.id),
                    'total',presupuesto.total,'credito',presupuesto.total,
                    'observaciones','Venta generada desde presupuesto '||presupuesto.id));
                update public.presupuestos set estado='Convertido a venta',venta_id=(resultado->'venta'->>'id')::uuid,
                    cuenta_cobrar_id=(resultado->'cuenta'->>'id')::uuid where id=presupuesto.id returning * into presupuesto;
            end if;
            resultado := jsonb_build_object('venta_id',presupuesto.venta_id,'cuenta_cobrar_id',presupuesto.cuenta_cobrar_id);
        else
            if presupuesto.estado::text='Convertido a venta' then raise exception 'Un presupuesto convertido conserva su vínculo con la venta.' using errcode='22023'; end if;
            if operacion='presupuesto.eliminar' then delete from public.presupuestos where id=presupuesto.id; resultado := 'null';
            else
                if coalesce(datos->>'estado','') not in ('Pendiente','Aprobado','Rechazado') then raise exception 'Estado inválido.' using errcode='22023'; end if;
                update public.presupuestos set estado=(datos->>'estado')::public.estado_presupuesto where id=presupuesto.id returning to_jsonb(presupuestos.*) into resultado;
            end if;
        end if;
    when 'odontograma.guardar' then resultado := clinica_privada.fase2_odontograma(p,datos);
    else raise exception 'Operación no admitida.' using errcode='22023';
    end case;
    insert into clinica_privada.solicitudes_operacion(clinica_id,solicitud_id,perfil_id,operacion,datos,resultado)
    values(p.clinica_id,solicitud,p.id,operacion,datos,coalesce(resultado,'null'::jsonb));
    return resultado;
end; $$;

create function public.ejecutar_operacion_clinica(p_operacion text,p_datos jsonb,p_solicitud uuid)
returns jsonb language sql security invoker set search_path='' as $$
    select clinica_privada.fase2_ejecutar(p_operacion,p_datos,p_solicitud);
$$;
revoke all on function public.ejecutar_operacion_clinica(text,jsonb,uuid) from public,anon;
grant execute on function public.ejecutar_operacion_clinica(text,jsonb,uuid) to authenticated;
do $$
declare f regprocedure;
begin
    for f in select p.oid::regprocedure from pg_proc p
        where p.pronamespace='clinica_privada'::regnamespace and proname like 'fase2_%'
    loop execute format('revoke all on function %s from public, anon, authenticated, service_role',f); end loop;
end; $$;
grant execute on function clinica_privada.fase2_ejecutar(text,jsonb,uuid) to authenticated;
-- Impedir saltarse las transacciones usando PATCH/POST/DELETE de tablas.
revoke insert,update,delete,truncate on public.ventas,public.cuentas_cobrar,public.abonos_cuentas_cobrar,
    public.compras_proveedores,public.cuentas_pagar,public.abonos_cuentas_pagar,
    public.productos_inventario,public.movimientos_inventario,public.presupuestos,public.presupuesto_items,
    public.odontogramas,public.odontograma_piezas,public.odontograma_historial from authenticated,anon;
-- A10: validacion permanente, tambien para integraciones privilegiadas.
alter table public.ventas add constraint fase2_ventas_importes check (total >= 0 and total::text not in ('NaN','Infinity','-Infinity') and efectivo >= 0 and efectivo::text not in ('NaN','Infinity','-Infinity') and tarjeta >= 0 and tarjeta::text not in ('NaN','Infinity','-Infinity') and transferencia >= 0 and transferencia::text not in ('NaN','Infinity','-Infinity') and credito >= 0 and credito::text not in ('NaN','Infinity','-Infinity') and comision_pos_porcentaje >= 0 and comision_pos_porcentaje::text not in ('NaN','Infinity','-Infinity') and comision_pos_monto >= 0 and comision_pos_monto::text not in ('NaN','Infinity','-Infinity') and neto_tarjeta >= 0 and neto_tarjeta::text not in ('NaN','Infinity','-Infinity'));
alter table public.cuentas_cobrar add constraint fase2_cuentas_cobrar_importes check (total >= 0 and total::text not in ('NaN','Infinity','-Infinity') and abonado >= 0 and abonado::text not in ('NaN','Infinity','-Infinity') and saldo >= 0 and saldo::text not in ('NaN','Infinity','-Infinity'));
alter table public.abonos_cuentas_cobrar add constraint fase2_abonos_cuentas_cobrar_importes check (monto >= 0 and monto::text not in ('NaN','Infinity','-Infinity') and efectivo >= 0 and efectivo::text not in ('NaN','Infinity','-Infinity') and tarjeta >= 0 and tarjeta::text not in ('NaN','Infinity','-Infinity') and transferencia >= 0 and transferencia::text not in ('NaN','Infinity','-Infinity') and comision_pos_porcentaje >= 0 and comision_pos_porcentaje::text not in ('NaN','Infinity','-Infinity') and comision_pos_monto >= 0 and comision_pos_monto::text not in ('NaN','Infinity','-Infinity') and neto_tarjeta >= 0 and neto_tarjeta::text not in ('NaN','Infinity','-Infinity'));
alter table public.compras_proveedores add constraint fase2_compras_proveedores_importes check (cantidad >= 0 and cantidad::text not in ('NaN','Infinity','-Infinity') and costo_unitario >= 0 and costo_unitario::text not in ('NaN','Infinity','-Infinity') and total >= 0 and total::text not in ('NaN','Infinity','-Infinity') and pago_ahora >= 0 and pago_ahora::text not in ('NaN','Infinity','-Infinity') and credito >= 0 and credito::text not in ('NaN','Infinity','-Infinity'));
alter table public.cuentas_pagar add constraint fase2_cuentas_pagar_importes check (total >= 0 and total::text not in ('NaN','Infinity','-Infinity') and abonado >= 0 and abonado::text not in ('NaN','Infinity','-Infinity') and saldo >= 0 and saldo::text not in ('NaN','Infinity','-Infinity'));
alter table public.abonos_cuentas_pagar add constraint fase2_abonos_cuentas_pagar_importes check (monto >= 0 and monto::text not in ('NaN','Infinity','-Infinity'));
alter table public.productos_inventario add constraint fase2_productos_inventario_importes check (stock >= 0 and stock::text not in ('NaN','Infinity','-Infinity') and stock_minimo >= 0 and stock_minimo::text not in ('NaN','Infinity','-Infinity') and costo_compra >= 0 and costo_compra::text not in ('NaN','Infinity','-Infinity') and precio_venta >= 0 and precio_venta::text not in ('NaN','Infinity','-Infinity'));
alter table public.movimientos_inventario add constraint fase2_movimientos_inventario_importes check (cantidad >= 0 and cantidad::text not in ('NaN','Infinity','-Infinity') and stock_anterior >= 0 and stock_anterior::text not in ('NaN','Infinity','-Infinity') and stock_nuevo >= 0 and stock_nuevo::text not in ('NaN','Infinity','-Infinity') and costo_unitario >= 0 and costo_unitario::text not in ('NaN','Infinity','-Infinity'));
alter table public.presupuestos add constraint fase2_presupuestos_importes check (subtotal >= 0 and subtotal::text not in ('NaN','Infinity','-Infinity') and descuento >= 0 and descuento::text not in ('NaN','Infinity','-Infinity') and total >= 0 and total::text not in ('NaN','Infinity','-Infinity'));
alter table public.presupuesto_items add constraint fase2_presupuesto_items_importes check (cantidad >= 0 and cantidad::text not in ('NaN','Infinity','-Infinity') and precio_unitario >= 0 and precio_unitario::text not in ('NaN','Infinity','-Infinity') and precio >= 0 and precio::text not in ('NaN','Infinity','-Infinity') and subtotal >= 0 and subtotal::text not in ('NaN','Infinity','-Infinity') and total >= 0 and total::text not in ('NaN','Infinity','-Infinity'));
alter table public.pos_clinica add constraint fase2_pos_clinica_importes check (comision >= 0 and comision::text not in ('NaN','Infinity','-Infinity'));
alter table public.ventas add constraint fase2_venta_sumas check (total=efectivo+tarjeta+transferencia+credito and comision_pos_porcentaje<=100 and comision_pos_monto=round(tarjeta*comision_pos_porcentaje/100,2) and neto_tarjeta=tarjeta-comision_pos_monto);
alter table public.abonos_cuentas_cobrar add constraint fase2_abono_sumas check (monto=efectivo+tarjeta+transferencia and comision_pos_porcentaje<=100 and comision_pos_monto=round(tarjeta*comision_pos_porcentaje/100,2) and neto_tarjeta=tarjeta-comision_pos_monto);
alter table public.cuentas_cobrar add constraint fase2_cuenta_cobrar_saldo check (estado='Anulada' or total=abonado+saldo);
alter table public.cuentas_pagar add constraint fase2_cuenta_pagar_saldo check (estado='Anulada' or total=abonado+saldo);
alter table public.compras_proveedores add constraint fase2_compra_sumas check (total=round(cantidad*costo_unitario,2) and total=pago_ahora+credito);
alter table public.presupuestos add constraint fase2_presupuesto_sumas check (subtotal=descuento+total);
alter table public.presupuesto_items add constraint fase2_item_sumas check (subtotal=round(cantidad*precio_unitario,2) and total=subtotal and precio=precio_unitario);
alter table public.pos_clinica add constraint fase2_pos_comision check (comision<=100);
create unique index fase2_cuenta_por_venta on public.cuentas_cobrar(venta_id) where venta_id is not null;
alter table public.compras_proveedores add constraint fase2_compra_cuenta_clinica_fk
foreign key (cuenta_pagar_id,clinica_id) references public.cuentas_pagar(id,clinica_id);
-- Otros importes del sistema tampoco aceptan NaN ni infinitos.
alter table public.auditoria add constraint fase2_auditoria_importes check (monto::text not in ('NaN','Infinity','-Infinity'));
alter table public.cierres_caja add constraint fase2_cierres_caja_importes check (ventas_brutas::text not in ('NaN','Infinity','-Infinity') and efectivo_sistema::text not in ('NaN','Infinity','-Infinity') and tarjeta_sistema::text not in ('NaN','Infinity','-Infinity') and transferencia_sistema::text not in ('NaN','Infinity','-Infinity') and credito_generado::text not in ('NaN','Infinity','-Infinity') and gastos_efectivo::text not in ('NaN','Infinity','-Infinity') and gastos_tarjeta::text not in ('NaN','Infinity','-Infinity') and gastos_transferencia::text not in ('NaN','Infinity','-Infinity') and gastos_total::text not in ('NaN','Infinity','-Infinity') and comision_pos::text not in ('NaN','Infinity','-Infinity') and neto_tarjeta::text not in ('NaN','Infinity','-Infinity') and efectivo_esperado::text not in ('NaN','Infinity','-Infinity') and efectivo_contado::text not in ('NaN','Infinity','-Infinity') and tarjeta_esperada::text not in ('NaN','Infinity','-Infinity') and tarjeta_reportada::text not in ('NaN','Infinity','-Infinity') and transferencia_esperada::text not in ('NaN','Infinity','-Infinity') and transferencia_reportada::text not in ('NaN','Infinity','-Infinity') and diferencia_efectivo::text not in ('NaN','Infinity','-Infinity') and diferencia_tarjeta::text not in ('NaN','Infinity','-Infinity') and diferencia_transferencia::text not in ('NaN','Infinity','-Infinity'));
alter table public.citas add constraint fase2_citas_importes check (costo::text not in ('NaN','Infinity','-Infinity') and costo>=0);
alter table public.configuraciones_clinicas add constraint fase2_configuraciones_clinicas_importes check (comision_pos::text not in ('NaN','Infinity','-Infinity') and comision_pos>=0 and comision_pos<=100);
alter table public.gastos add constraint fase2_gastos_importes check (monto::text not in ('NaN','Infinity','-Infinity') and monto>=0);
alter table public.pagos_suscripcion add constraint fase2_pagos_suscripcion_importes check (monto::text not in ('NaN','Infinity','-Infinity') and monto>=0);
alter table public.servicios add constraint fase2_servicios_importes check (precio::text not in ('NaN','Infinity','-Infinity') and precio>=0);
alter table public.suscripciones add constraint fase2_suscripciones_importes check (precio_mensual::text not in ('NaN','Infinity','-Infinity') and precio_mensual>=0);
alter table public.tratamientos add constraint fase2_tratamientos_importes check (total::text not in ('NaN','Infinity','-Infinity') and abonado::text not in ('NaN','Infinity','-Infinity') and total>=0 and abonado>=0 and abonado<=total);
