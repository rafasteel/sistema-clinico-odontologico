-- Los conflictos de edicion son errores de negocio HTTP 409.
-- No usar serialization_failure (40001), reservado para reintentos del motor.
CREATE OR REPLACE FUNCTION clinica_privada.fase2_odontograma(p usuarios_perfiles, d jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
        if esperada<>0 then raise exception 'El odontograma cambió. Actualizá el expediente.' using errcode='PT409'; end if;
        insert into public.odontogramas(clinica_id,paciente_id,creado_por)
        values(p.clinica_id,paciente,p.id) returning * into od;
    end if;
    if od.version<>esperada then raise exception 'Otro usuario modificó el odontograma. Actualizá el expediente antes de aplicar el cambio.' using errcode='PT409'; end if;
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
end; $function$
;
CREATE OR REPLACE FUNCTION clinica_privada.fase2_producto(p usuarios_perfiles, d jsonb, crear boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
            raise exception 'El producto cambió mientras lo editabas. Actualizá la lista.' using errcode='PT409';
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
end; $function$
;
