-- Instantanea SIN DATOS del esquema previo a fase 2 (Supabase, 23/11/2026).
-- Solo para pruebas locales; no es una migracion para produccion.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create schema clinica_privada;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
create function storage.foldername(text) returns text[] language sql immutable as
$$ select string_to_array($1,'/'); $$;
grant usage on schema public,auth,storage,clinica_privada to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
grant all on storage.objects to anon,authenticated,service_role;
alter table storage.objects enable row level security;
set check_function_bodies=false;
create type public.rol_usuario_sistema as enum ('SUPER_ADMIN','ADMIN','DOCTOR','RECEPCION','CAJA');
create type public.estado_usuario_sistema as enum ('Activo','Inactivo');
create type public.estado_clinica as enum ('Activa','Vencida','Restringida','Suspendida','Cancelada');
create type public.estado_suscripcion as enum ('Activa','Vencida','Restringida','Suspendida','Cancelada');
create type public.estado_pago_suscripcion as enum ('Pendiente','Pagado','Vencido','Anulado');
create type public.nivel_auditoria as enum ('Info','Éxito','Advertencia','Crítico');
create type public.estado_registro_clinico as enum ('Activo','Inactivo');
create type public.sexo_paciente as enum ('Masculino','Femenino','Otro','No especificado');
create type public.estado_cita_medica as enum ('Programada','Confirmada','En espera','En atención','Atendida','Cobrada','Reagendada','Cancelada','No asistió');
create type public.estado_nota_clinica as enum ('Activa','Anulada');
create type public.estado_tratamiento as enum ('Planificado','En proceso','Completado','Suspendido');
create type public.estado_receta as enum ('Activa','Anulada');
create type public.estado_venta as enum ('Pagada','Parcial','Crédito','Anulada');
create type public.estado_cuenta_cobrar as enum ('Pendiente','Parcial','Pagada','Vencida','Anulada');
create type public.estado_abono_cuenta as enum ('Activo','Anulado');
create type public.estado_cierre_caja as enum ('Cuadrado','Con diferencia','Anulado');
create type public.metodo_gasto as enum ('Efectivo','Tarjeta','Transferencia','Cheque','Crédito');
create type public.estado_gasto as enum ('Activo','Anulado');
create type public.estado_producto_inventario as enum ('Activo','Inactivo');
create type public.tipo_movimiento_inventario as enum ('Entrada','Salida','Uso clínico','Pérdida','Ajuste');
create type public.estado_proveedor as enum ('Activo','Inactivo');
create type public.metodo_pago_proveedor as enum ('Efectivo','Tarjeta','Transferencia');
create type public.estado_compra_proveedor as enum ('Activa','Anulada');
create type public.estado_cuenta_pagar as enum ('Pendiente','Parcial','Pagada','Vencida','Anulada');
create type public.estado_abono_cuenta_pagar as enum ('Activo','Anulado');
create type public.estado_presupuesto as enum ('Pendiente','Aprobado','Rechazado','Convertido a venta');
create type public.cara_dental as enum ('sup','der','inf','izq','centro');
create type public.estado_dental as enum ('Sano','Caries','Resina','Corona','Ausente','Extracción','Endodoncia','Implante','Fractura','Sellante','Observación');
create type public.denticion_odontograma as enum ('Permanente','Temporal');
create type public.categoria_documento_paciente as enum ('Cédula / identificación','Radiografía','Consentimiento firmado','Examen / estudio','Fotografía clínica','Receta externa','Documento administrativo','Otro');
create type public.estado_orden_estudio as enum ('Activa','Anulada');
create table public.abonos_cuentas_cobrar (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    cuenta_id uuid not null,
    paciente_id uuid,
    venta_id uuid,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default CURRENT_TIME not null,
    monto numeric(12,2) default 0 not null,
    efectivo numeric(12,2) default 0 not null,
    tarjeta numeric(12,2) default 0 not null,
    transferencia numeric(12,2) default 0 not null,
    metodo text default ''::text not null,
    es_pago_mixto boolean default false not null,
    pos_id text,
    pos_nombre text default ''::text not null,
    pos_banco text default ''::text not null,
    comision_pos_porcentaje numeric(8,2) default 0 not null,
    comision_pos_monto numeric(12,2) default 0 not null,
    neto_tarjeta numeric(12,2) default 0 not null,
    referencia text default ''::text not null,
    observaciones text default ''::text not null,
    usuario_nombre text default ''::text not null,
    estado estado_abono_cuenta default 'Activo'::estado_abono_cuenta not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.abonos_cuentas_pagar (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    cuenta_id uuid not null,
    compra_id uuid,
    proveedor_id uuid,
    gasto_id uuid,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default CURRENT_TIME not null,
    monto numeric(12,2) default 0 not null,
    metodo metodo_pago_proveedor default 'Efectivo'::metodo_pago_proveedor not null,
    estado estado_abono_cuenta_pagar default 'Activo'::estado_abono_cuenta_pagar not null,
    usuario_nombre text default ''::text not null,
    observaciones text default ''::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null
);
create table public.auditoria (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid,
    usuario_id uuid,
    modulo text not null,
    accion text not null,
    detalle text default ''::text,
    registro_id text default ''::text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    nivel nivel_auditoria default 'Info'::nivel_auditoria not null,
    ip text default ''::text,
    user_agent text default ''::text,
    creada_en timestamp with time zone default now() not null,
    usuario_perfil_id uuid,
    usuario_nombre text default ''::text not null,
    rol_usuario text default ''::text not null,
    referencia text default ''::text not null,
    referencia_id text default ''::text not null,
    monto numeric(12,2) default 0 not null,
    metadata jsonb default '{}'::jsonb not null,
    creado_en timestamp with time zone default now() not null
);
create table public.cierres_caja (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    fecha date not null,
    hora time without time zone default CURRENT_TIME not null,
    usuario_nombre text default ''::text not null,
    ventas_cantidad integer default 0 not null,
    ventas_brutas numeric(12,2) default 0 not null,
    efectivo_sistema numeric(12,2) default 0 not null,
    tarjeta_sistema numeric(12,2) default 0 not null,
    transferencia_sistema numeric(12,2) default 0 not null,
    credito_generado numeric(12,2) default 0 not null,
    gastos_efectivo numeric(12,2) default 0 not null,
    gastos_tarjeta numeric(12,2) default 0 not null,
    gastos_transferencia numeric(12,2) default 0 not null,
    gastos_total numeric(12,2) default 0 not null,
    comision_pos numeric(12,2) default 0 not null,
    neto_tarjeta numeric(12,2) default 0 not null,
    efectivo_esperado numeric(12,2) default 0 not null,
    efectivo_contado numeric(12,2) default 0 not null,
    tarjeta_esperada numeric(12,2) default 0 not null,
    tarjeta_reportada numeric(12,2) default 0 not null,
    transferencia_esperada numeric(12,2) default 0 not null,
    transferencia_reportada numeric(12,2) default 0 not null,
    diferencia_efectivo numeric(12,2) default 0 not null,
    diferencia_tarjeta numeric(12,2) default 0 not null,
    diferencia_transferencia numeric(12,2) default 0 not null,
    estado estado_cierre_caja default 'Cuadrado'::estado_cierre_caja not null,
    observaciones text default ''::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.citas (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    paciente_id uuid,
    doctor_id uuid,
    servicio_id uuid,
    paciente_nombre text default ''::text not null,
    doctor_nombre text default ''::text not null,
    servicio_nombre text default ''::text not null,
    fecha date not null,
    hora time without time zone not null,
    duracion_minutos integer default 30 not null,
    costo numeric(12,2) default 0 not null,
    estado estado_cita_medica default 'Programada'::estado_cita_medica not null,
    observaciones text default ''::text,
    recurrencia text default 'No repetir'::text,
    cita_origen_id uuid,
    tratamiento_id uuid,
    presupuesto_id uuid,
    confirmacion_token text,
    confirmada_en timestamp with time zone,
    recordatorio_enviado_en timestamp with time zone,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.clinicas (
    id uuid default gen_random_uuid() not null,
    nombre text not null,
    telefono text default ''::text,
    whatsapp text default ''::text,
    correo text default ''::text,
    direccion text default ''::text,
    ruc text default ''::text,
    moneda text default 'Córdoba nicaragüense'::text,
    simbolo_moneda text default 'C$'::text,
    estado estado_clinica default 'Activa'::estado_clinica not null,
    plan text default 'Profesional'::text not null,
    fecha_inicio date default CURRENT_DATE,
    fecha_vencimiento date default (CURRENT_DATE + '30 days'::interval),
    dias_gracia integer default 7 not null,
    notas text default ''::text,
    creada_en timestamp with time zone default now() not null,
    actualizada_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.compras_proveedores (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default CURRENT_TIME not null,
    proveedor_id uuid,
    proveedor_nombre text default ''::text not null,
    producto_id uuid,
    producto_nombre text default ''::text not null,
    cantidad numeric(12,2) default 0 not null,
    costo_unitario numeric(12,2) default 0 not null,
    total numeric(12,2) default 0 not null,
    pago_ahora numeric(12,2) default 0 not null,
    credito numeric(12,2) default 0 not null,
    metodo_pago metodo_pago_proveedor default 'Efectivo'::metodo_pago_proveedor not null,
    fecha_vencimiento date,
    estado estado_compra_proveedor default 'Activa'::estado_compra_proveedor not null,
    usuario_nombre text default ''::text not null,
    observaciones text default ''::text not null,
    gasto_id uuid,
    cuenta_pagar_id uuid,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.configuraciones_clinicas (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    nombre_clinica text default 'Clínica Odontológica'::text not null,
    telefono text default '0000-0000'::text not null,
    whatsapp text default '0000-0000'::text not null,
    correo text default 'clinica@correo.com'::text not null,
    direccion text default 'Managua, Nicaragua'::text not null,
    ruc text default 'No registrado'::text not null,
    moneda text default 'Córdoba nicaragüense'::text not null,
    simbolo_moneda text default 'C$'::text not null,
    comision_pos numeric(8,2) default 4 not null,
    mensaje_recibo text default 'Gracias por su preferencia.'::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.cuentas_cobrar (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    venta_id uuid,
    paciente_id uuid,
    paciente_nombre text default ''::text not null,
    concepto text default ''::text not null,
    total numeric(12,2) default 0 not null,
    abonado numeric(12,2) default 0 not null,
    saldo numeric(12,2) default 0 not null,
    fecha date default CURRENT_DATE not null,
    fecha_vencimiento date,
    estado estado_cuenta_cobrar default 'Pendiente'::estado_cuenta_cobrar not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.cuentas_pagar (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    compra_id uuid,
    proveedor_id uuid,
    proveedor_nombre text default ''::text not null,
    concepto text default ''::text not null,
    total numeric(12,2) default 0 not null,
    abonado numeric(12,2) default 0 not null,
    saldo numeric(12,2) default 0 not null,
    fecha date default CURRENT_DATE not null,
    fecha_vencimiento date,
    estado estado_cuenta_pagar default 'Pendiente'::estado_cuenta_pagar not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.doctores (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    nombre text not null,
    especialidad text default ''::text,
    telefono text default ''::text,
    correo text default ''::text,
    color text default '#0d9488'::text,
    observaciones text default ''::text,
    estado estado_registro_clinico default 'Activo'::estado_registro_clinico not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.documentos_pacientes (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    paciente_nombre text default ''::text not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default (now())::time without time zone not null,
    nombre_archivo text default ''::text not null,
    tipo_archivo text default 'application/octet-stream'::text not null,
    tamano_bytes bigint default 0 not null,
    categoria categoria_documento_paciente default 'Otro'::categoria_documento_paciente not null,
    descripcion text default ''::text not null,
    storage_bucket text default 'documentos-pacientes'::text not null,
    storage_path text default ''::text not null,
    usuario_nombre text default ''::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.gastos (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default CURRENT_TIME not null,
    categoria text default ''::text not null,
    descripcion text default ''::text not null,
    monto numeric(12,2) default 0 not null,
    metodo_pago metodo_gasto default 'Efectivo'::metodo_gasto not null,
    proveedor text default ''::text not null,
    usuario_nombre text default ''::text not null,
    observaciones text default ''::text not null,
    estado estado_gasto default 'Activo'::estado_gasto not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.movimientos_inventario (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    producto_id uuid not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default CURRENT_TIME not null,
    producto_nombre text default ''::text not null,
    tipo tipo_movimiento_inventario not null,
    cantidad numeric(12,2) default 0 not null,
    stock_anterior numeric(12,2) default 0 not null,
    stock_nuevo numeric(12,2) default 0 not null,
    costo_unitario numeric(12,2) default 0 not null,
    motivo text default ''::text not null,
    usuario_nombre text default ''::text not null,
    referencia text default ''::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null
);
create table public.notas_clinicas (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default CURRENT_TIME not null,
    doctor_id uuid,
    doctor_nombre text default ''::text not null,
    servicio_id uuid,
    servicio_nombre text default ''::text not null,
    diagnostico text default ''::text not null,
    procedimiento text default ''::text not null,
    observaciones text default ''::text not null,
    proxima_cita date,
    estado estado_nota_clinica default 'Activa'::estado_nota_clinica not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.odontograma_historial (
    id uuid default gen_random_uuid() not null,
    odontograma_id uuid not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    codigo_local text default ''::text not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default (now())::time without time zone not null,
    pieza_codigo text default ''::text not null,
    pieza_numero_legacy integer,
    cara text default 'todas'::text not null,
    estado estado_dental default 'Sano'::estado_dental not null,
    nota text default ''::text not null,
    usuario_nombre text default ''::text not null,
    creado_en timestamp with time zone default now() not null
);
create table public.odontograma_piezas (
    id uuid default gen_random_uuid() not null,
    odontograma_id uuid not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    codigo text not null,
    numero_legacy integer default 0 not null,
    nombre text default ''::text not null,
    tipo text default ''::text not null,
    arcada text default ''::text not null,
    cuadrante text default ''::text not null,
    denticion denticion_odontograma default 'Permanente'::denticion_odontograma not null,
    cara_sup estado_dental default 'Sano'::estado_dental not null,
    cara_der estado_dental default 'Sano'::estado_dental not null,
    cara_inf estado_dental default 'Sano'::estado_dental not null,
    cara_izq estado_dental default 'Sano'::estado_dental not null,
    cara_centro estado_dental default 'Sano'::estado_dental not null,
    nota text default ''::text not null,
    actualizado_texto text default ''::text not null,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.odontogramas (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    actualizado_texto text default ''::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.ordenes_estudio (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    paciente_nombre text default ''::text not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default (now())::time without time zone not null,
    doctor text default ''::text not null,
    tipo_estudio text default ''::text not null,
    zona text default ''::text not null,
    motivo text default ''::text not null,
    indicaciones text default ''::text not null,
    estado estado_orden_estudio default 'Activa'::estado_orden_estudio not null,
    usuario_nombre text default ''::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.pacientes (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    codigo text default ''::text,
    nombre text not null,
    cedula text default ''::text,
    telefono text default ''::text,
    whatsapp text default ''::text,
    correo text default ''::text,
    fecha_nacimiento date,
    edad integer default 0,
    sexo sexo_paciente default 'No especificado'::sexo_paciente,
    direccion text default ''::text,
    ocupacion text default ''::text,
    alergias text default ''::text,
    antecedentes text default ''::text,
    medicamentos_actuales text default ''::text,
    enfermedades_sistemicas text default ''::text,
    observaciones text default ''::text,
    estado estado_registro_clinico default 'Activo'::estado_registro_clinico not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.pagos_suscripcion (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    suscripcion_id uuid,
    fecha_pago date default CURRENT_DATE not null,
    monto numeric(12,2) default 0 not null,
    moneda text default 'USD'::text not null,
    metodo_pago text default 'Transferencia'::text,
    referencia text default ''::text,
    estado estado_pago_suscripcion default 'Pagado'::estado_pago_suscripcion not null,
    registrado_por uuid,
    notas text default ''::text,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.pos_clinica (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    codigo text default ''::text not null,
    nombre text default ''::text not null,
    banco text default ''::text not null,
    comision numeric(8,2) default 0 not null,
    activo boolean default true not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.presupuesto_items (
    id uuid default gen_random_uuid() not null,
    presupuesto_id uuid not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    orden integer default 1 not null,
    pieza_codigo text default ''::text not null,
    pieza_numero text default ''::text not null,
    cara cara_dental,
    estado_dental estado_dental,
    nombre text default ''::text not null,
    tratamiento text default ''::text not null,
    descripcion text default ''::text not null,
    cantidad numeric(12,2) default 1 not null,
    precio_unitario numeric(12,2) default 0 not null,
    precio numeric(12,2) default 0 not null,
    subtotal numeric(12,2) default 0 not null,
    total numeric(12,2) default 0 not null,
    estado text default 'Pendiente'::text not null,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.presupuestos (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    paciente_nombre text default ''::text not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default (now())::time without time zone not null,
    estado estado_presupuesto default 'Pendiente'::estado_presupuesto not null,
    subtotal numeric(12,2) default 0 not null,
    descuento numeric(12,2) default 0 not null,
    total numeric(12,2) default 0 not null,
    observaciones text default ''::text not null,
    origen text default 'Manual'::text not null,
    pieza_codigo text default ''::text not null,
    cara cara_dental,
    estado_dental estado_dental,
    usuario_nombre text default ''::text not null,
    venta_id uuid,
    cuenta_cobrar_id uuid,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.productos_inventario (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    codigo text default ''::text not null,
    nombre text default ''::text not null,
    categoria text default ''::text not null,
    unidad text default ''::text not null,
    stock numeric(12,2) default 0 not null,
    stock_minimo numeric(12,2) default 0 not null,
    costo_compra numeric(12,2) default 0 not null,
    precio_venta numeric(12,2) default 0 not null,
    proveedor text default ''::text not null,
    vencimiento date,
    estado estado_producto_inventario default 'Activo'::estado_producto_inventario not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.proveedores (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    nombre text default ''::text not null,
    ruc text default ''::text not null,
    telefono text default ''::text not null,
    whatsapp text default ''::text not null,
    correo text default ''::text not null,
    direccion text default ''::text not null,
    categoria text default ''::text not null,
    contacto text default ''::text not null,
    estado estado_proveedor default 'Activo'::estado_proveedor not null,
    observaciones text default ''::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.recetas (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default CURRENT_TIME not null,
    doctor_id uuid,
    doctor_nombre text default ''::text not null,
    diagnostico text default ''::text not null,
    medicamento text not null,
    indicaciones text not null,
    duracion text default ''::text not null,
    observaciones text default ''::text not null,
    estado estado_receta default 'Activa'::estado_receta not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.respaldos_historial (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    generado_por uuid,
    usuario_nombre text default ''::text not null,
    tipo text default 'JSON'::text not null,
    version text default '2.0-supabase'::text not null,
    nombre_archivo text default ''::text not null,
    total_modulos integer default 0 not null,
    total_registros integer default 0 not null,
    tamano_bytes bigint default 0 not null,
    observaciones text default ''::text not null,
    creado_en timestamp with time zone default now() not null
);
create table public.servicios (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    nombre text not null,
    categoria text default 'General'::text,
    descripcion text default ''::text,
    duracion_minutos integer default 30 not null,
    precio numeric(12,2) default 0 not null,
    estado estado_registro_clinico default 'Activo'::estado_registro_clinico not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.suscripciones (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    plan text default 'Profesional'::text not null,
    estado estado_suscripcion default 'Activa'::estado_suscripcion not null,
    precio_mensual numeric(12,2) default 0 not null,
    moneda text default 'USD'::text not null,
    fecha_inicio date default CURRENT_DATE not null,
    fecha_vencimiento date default (CURRENT_DATE + '30 days'::interval) not null,
    dias_gracia integer default 7 not null,
    ultimo_pago date,
    notas text default ''::text,
    creada_en timestamp with time zone default now() not null,
    actualizada_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.tratamientos (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    paciente_id uuid not null,
    fecha date default CURRENT_DATE not null,
    nombre text not null,
    descripcion text default ''::text not null,
    total numeric(12,2) default 0 not null,
    abonado numeric(12,2) default 0 not null,
    estado estado_tratamiento default 'Planificado'::estado_tratamiento not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.usuarios_perfiles (
    id uuid default gen_random_uuid() not null,
    auth_user_id uuid,
    clinica_id uuid,
    nombre text not null,
    usuario text not null,
    correo text not null,
    rol rol_usuario_sistema default 'ADMIN'::rol_usuario_sistema not null,
    estado estado_usuario_sistema default 'Activo'::estado_usuario_sistema not null,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
create table public.ventas (
    id uuid default gen_random_uuid() not null,
    clinica_id uuid not null,
    fecha date default CURRENT_DATE not null,
    hora time without time zone default CURRENT_TIME not null,
    tipo_cobro text default 'Venta'::text not null,
    cita_id uuid,
    paciente_id uuid,
    cliente_nombre text default ''::text not null,
    concepto text default ''::text not null,
    total numeric(12,2) default 0 not null,
    efectivo numeric(12,2) default 0 not null,
    tarjeta numeric(12,2) default 0 not null,
    transferencia numeric(12,2) default 0 not null,
    credito numeric(12,2) default 0 not null,
    metodo_pago text default ''::text not null,
    es_pago_mixto boolean default false not null,
    pos_id text,
    pos_nombre text default ''::text not null,
    pos_banco text default ''::text not null,
    comision_pos_porcentaje numeric(8,2) default 0 not null,
    comision_pos_monto numeric(12,2) default 0 not null,
    neto_tarjeta numeric(12,2) default 0 not null,
    estado estado_venta default 'Pagada'::estado_venta not null,
    usuario_nombre text default ''::text not null,
    observaciones text default ''::text not null,
    creado_por uuid,
    creado_en timestamp with time zone default now() not null,
    actualizado_en timestamp with time zone default now() not null
);
alter table public.compras_proveedores add constraint compras_proveedores_id_clinica_key UNIQUE (id, clinica_id);
alter table public.cuentas_cobrar add constraint cuentas_cobrar_id_clinica_key UNIQUE (id, clinica_id);
alter table public.configuraciones_clinicas add constraint configuraciones_clinicas_clinica_unica UNIQUE (clinica_id);
alter table public.citas add constraint citas_confirmacion_token_key UNIQUE (confirmacion_token);
alter table public.ventas add constraint ventas_id_clinica_key UNIQUE (id, clinica_id);
alter table public.cuentas_pagar add constraint cuentas_pagar_id_clinica_key UNIQUE (id, clinica_id);
alter table public.pos_clinica add constraint pos_clinica_codigo_unico UNIQUE (clinica_id, codigo);
alter table public.suscripciones add constraint suscripciones_id_clinica_key UNIQUE (id, clinica_id);
alter table public.citas add constraint citas_id_clinica_key UNIQUE (id, clinica_id);
alter table public.odontogramas add constraint odontogramas_paciente_unico UNIQUE (paciente_id);
alter table public.doctores add constraint doctores_id_clinica_key UNIQUE (id, clinica_id);
alter table public.servicios add constraint servicios_id_clinica_key UNIQUE (id, clinica_id);
alter table public.odontograma_piezas add constraint odontograma_piezas_codigo_unico UNIQUE (odontograma_id, codigo);
alter table public.odontogramas add constraint odontogramas_id_clinica_key UNIQUE (id, clinica_id);
alter table public.cierres_caja add constraint cierre_caja_fecha_unica_por_clinica UNIQUE (clinica_id, fecha);
alter table public.proveedores add constraint proveedores_id_clinica_key UNIQUE (id, clinica_id);
alter table public.gastos add constraint gastos_id_clinica_key UNIQUE (id, clinica_id);
alter table public.usuarios_perfiles add constraint usuarios_perfiles_auth_user_id_key UNIQUE (auth_user_id);
alter table public.pacientes add constraint pacientes_id_clinica_key UNIQUE (id, clinica_id);
alter table public.productos_inventario add constraint productos_inventario_id_clinica_key UNIQUE (id, clinica_id);
alter table public.presupuestos add constraint presupuestos_id_clinica_key UNIQUE (id, clinica_id);
alter table public.usuarios_perfiles add constraint usuarios_perfiles_pkey PRIMARY KEY (id);
alter table public.gastos add constraint gastos_pkey PRIMARY KEY (id);
alter table public.configuraciones_clinicas add constraint configuraciones_clinicas_pkey PRIMARY KEY (id);
alter table public.auditoria add constraint auditoria_pkey PRIMARY KEY (id);
alter table public.pos_clinica add constraint pos_clinica_pkey PRIMARY KEY (id);
alter table public.presupuestos add constraint presupuestos_pkey PRIMARY KEY (id);
alter table public.productos_inventario add constraint productos_inventario_pkey PRIMARY KEY (id);
alter table public.ventas add constraint ventas_pkey PRIMARY KEY (id);
alter table public.pacientes add constraint pacientes_pkey PRIMARY KEY (id);
alter table public.presupuesto_items add constraint presupuesto_items_pkey PRIMARY KEY (id);
alter table public.servicios add constraint servicios_pkey PRIMARY KEY (id);
alter table public.notas_clinicas add constraint notas_clinicas_pkey PRIMARY KEY (id);
alter table public.odontogramas add constraint odontogramas_pkey PRIMARY KEY (id);
alter table public.movimientos_inventario add constraint movimientos_inventario_pkey PRIMARY KEY (id);
alter table public.suscripciones add constraint suscripciones_pkey PRIMARY KEY (id);
alter table public.cuentas_cobrar add constraint cuentas_cobrar_pkey PRIMARY KEY (id);
alter table public.doctores add constraint doctores_pkey PRIMARY KEY (id);
alter table public.proveedores add constraint proveedores_pkey PRIMARY KEY (id);
alter table public.respaldos_historial add constraint respaldos_historial_pkey PRIMARY KEY (id);
alter table public.ordenes_estudio add constraint ordenes_estudio_pkey PRIMARY KEY (id);
alter table public.documentos_pacientes add constraint documentos_pacientes_pkey PRIMARY KEY (id);
alter table public.compras_proveedores add constraint compras_proveedores_pkey PRIMARY KEY (id);
alter table public.clinicas add constraint clinicas_pkey PRIMARY KEY (id);
alter table public.abonos_cuentas_cobrar add constraint abonos_cuentas_cobrar_pkey PRIMARY KEY (id);
alter table public.tratamientos add constraint tratamientos_pkey PRIMARY KEY (id);
alter table public.odontograma_historial add constraint odontograma_historial_pkey PRIMARY KEY (id);
alter table public.odontograma_piezas add constraint odontograma_piezas_pkey PRIMARY KEY (id);
alter table public.cuentas_pagar add constraint cuentas_pagar_pkey PRIMARY KEY (id);
alter table public.pagos_suscripcion add constraint pagos_suscripcion_pkey PRIMARY KEY (id);
alter table public.citas add constraint citas_pkey PRIMARY KEY (id);
alter table public.recetas add constraint recetas_pkey PRIMARY KEY (id);
alter table public.abonos_cuentas_pagar add constraint abonos_cuentas_pagar_pkey PRIMARY KEY (id);
alter table public.cierres_caja add constraint cierres_caja_pkey PRIMARY KEY (id);
alter table public.proveedores add constraint proveedores_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.proveedores add constraint proveedores_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.compras_proveedores add constraint compras_proveedores_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.compras_proveedores add constraint compras_proveedores_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;
alter table public.compras_proveedores add constraint compras_proveedores_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.cuentas_pagar add constraint cuentas_pagar_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.cuentas_pagar add constraint cuentas_pagar_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES compras_proveedores(id) ON DELETE SET NULL;
alter table public.cuentas_pagar add constraint cuentas_pagar_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;
alter table public.cuentas_pagar add constraint cuentas_pagar_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.abonos_cuentas_pagar add constraint abonos_cuentas_pagar_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.abonos_cuentas_pagar add constraint abonos_cuentas_pagar_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES cuentas_pagar(id) ON DELETE CASCADE;
alter table public.abonos_cuentas_pagar add constraint abonos_cuentas_pagar_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES compras_proveedores(id) ON DELETE SET NULL;
alter table public.abonos_cuentas_pagar add constraint abonos_cuentas_pagar_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;
alter table public.abonos_cuentas_pagar add constraint abonos_cuentas_pagar_gasto_id_fkey FOREIGN KEY (gasto_id) REFERENCES gastos(id) ON DELETE SET NULL;
alter table public.abonos_cuentas_pagar add constraint abonos_cuentas_pagar_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.configuraciones_clinicas add constraint configuraciones_clinicas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.configuraciones_clinicas add constraint configuraciones_clinicas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.pos_clinica add constraint pos_clinica_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.pos_clinica add constraint pos_clinica_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.presupuestos add constraint presupuestos_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.presupuestos add constraint presupuestos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.presupuestos add constraint presupuestos_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL;
alter table public.presupuestos add constraint presupuestos_cuenta_cobrar_id_fkey FOREIGN KEY (cuenta_cobrar_id) REFERENCES cuentas_cobrar(id) ON DELETE SET NULL;
alter table public.presupuestos add constraint presupuestos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.presupuesto_items add constraint presupuesto_items_presupuesto_id_fkey FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id) ON DELETE CASCADE;
alter table public.presupuesto_items add constraint presupuesto_items_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.presupuesto_items add constraint presupuesto_items_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.auditoria add constraint auditoria_usuario_perfil_id_fkey FOREIGN KEY (usuario_perfil_id) REFERENCES usuarios_perfiles(id) ON DELETE RESTRICT;
alter table public.doctores add constraint doctores_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.usuarios_perfiles add constraint usuarios_perfiles_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.usuarios_perfiles add constraint usuarios_perfiles_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE SET NULL;
alter table public.suscripciones add constraint suscripciones_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.pagos_suscripcion add constraint pagos_suscripcion_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.pagos_suscripcion add constraint pagos_suscripcion_suscripcion_id_fkey FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE SET NULL;
alter table public.pagos_suscripcion add constraint pagos_suscripcion_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.pacientes add constraint pacientes_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.pacientes add constraint pacientes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.servicios add constraint servicios_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.servicios add constraint servicios_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.citas add constraint citas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.citas add constraint citas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE SET NULL;
alter table public.citas add constraint citas_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctores(id) ON DELETE SET NULL;
alter table public.citas add constraint citas_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL;
alter table public.citas add constraint citas_cita_origen_id_fkey FOREIGN KEY (cita_origen_id) REFERENCES citas(id) ON DELETE SET NULL;
alter table public.citas add constraint citas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.notas_clinicas add constraint notas_clinicas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.notas_clinicas add constraint notas_clinicas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.notas_clinicas add constraint notas_clinicas_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctores(id) ON DELETE SET NULL;
alter table public.notas_clinicas add constraint notas_clinicas_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL;
alter table public.notas_clinicas add constraint notas_clinicas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.tratamientos add constraint tratamientos_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.tratamientos add constraint tratamientos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.tratamientos add constraint tratamientos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.recetas add constraint recetas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.recetas add constraint recetas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.recetas add constraint recetas_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctores(id) ON DELETE SET NULL;
alter table public.recetas add constraint recetas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.ventas add constraint ventas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.ventas add constraint ventas_cita_id_fkey FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL;
alter table public.ventas add constraint ventas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE SET NULL;
alter table public.ventas add constraint ventas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.cuentas_cobrar add constraint cuentas_cobrar_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.cuentas_cobrar add constraint cuentas_cobrar_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL;
alter table public.cuentas_cobrar add constraint cuentas_cobrar_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE SET NULL;
alter table public.cuentas_cobrar add constraint cuentas_cobrar_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.abonos_cuentas_cobrar add constraint abonos_cuentas_cobrar_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.abonos_cuentas_cobrar add constraint abonos_cuentas_cobrar_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES cuentas_cobrar(id) ON DELETE CASCADE;
alter table public.abonos_cuentas_cobrar add constraint abonos_cuentas_cobrar_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE SET NULL;
alter table public.abonos_cuentas_cobrar add constraint abonos_cuentas_cobrar_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL;
alter table public.abonos_cuentas_cobrar add constraint abonos_cuentas_cobrar_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.cierres_caja add constraint cierres_caja_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.cierres_caja add constraint cierres_caja_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.gastos add constraint gastos_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.gastos add constraint gastos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.productos_inventario add constraint productos_inventario_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.productos_inventario add constraint productos_inventario_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.compras_proveedores add constraint compras_proveedores_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos_inventario(id) ON DELETE SET NULL;
alter table public.compras_proveedores add constraint compras_proveedores_gasto_id_fkey FOREIGN KEY (gasto_id) REFERENCES gastos(id) ON DELETE SET NULL;
alter table public.movimientos_inventario add constraint movimientos_inventario_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.movimientos_inventario add constraint movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos_inventario(id) ON DELETE CASCADE;
alter table public.movimientos_inventario add constraint movimientos_inventario_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.abonos_cuentas_pagar add constraint fase1_abonos_cuentas_pagar_compra_id_clinica_fk FOREIGN KEY (compra_id, clinica_id) REFERENCES compras_proveedores(id, clinica_id) ON DELETE SET NULL (compra_id);
alter table public.abonos_cuentas_pagar add constraint fase1_abonos_cuentas_pagar_proveedor_id_clinica_fk FOREIGN KEY (proveedor_id, clinica_id) REFERENCES proveedores(id, clinica_id) ON DELETE SET NULL (proveedor_id);
alter table public.abonos_cuentas_pagar add constraint fase1_abonos_cuentas_pagar_gasto_id_clinica_fk FOREIGN KEY (gasto_id, clinica_id) REFERENCES gastos(id, clinica_id) ON DELETE SET NULL (gasto_id);
alter table public.presupuestos add constraint fase1_presupuestos_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.presupuestos add constraint fase1_presupuestos_venta_id_clinica_fk FOREIGN KEY (venta_id, clinica_id) REFERENCES ventas(id, clinica_id) ON DELETE SET NULL (venta_id);
alter table public.presupuestos add constraint fase1_presupuestos_cuenta_cobrar_id_clinica_fk FOREIGN KEY (cuenta_cobrar_id, clinica_id) REFERENCES cuentas_cobrar(id, clinica_id) ON DELETE SET NULL (cuenta_cobrar_id);
alter table public.presupuesto_items add constraint fase1_presupuesto_items_presupuesto_id_clinica_fk FOREIGN KEY (presupuesto_id, clinica_id) REFERENCES presupuestos(id, clinica_id) ON DELETE CASCADE;
alter table public.presupuesto_items add constraint fase1_presupuesto_items_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.odontogramas add constraint fase1_odontogramas_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.odontograma_piezas add constraint fase1_odontograma_piezas_odontograma_id_clinica_fk FOREIGN KEY (odontograma_id, clinica_id) REFERENCES odontogramas(id, clinica_id) ON DELETE CASCADE;
alter table public.odontograma_piezas add constraint fase1_odontograma_piezas_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.odontograma_historial add constraint fase1_odontograma_historial_odontograma_id_clinica_fk FOREIGN KEY (odontograma_id, clinica_id) REFERENCES odontogramas(id, clinica_id) ON DELETE CASCADE;
alter table public.odontograma_historial add constraint fase1_odontograma_historial_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.documentos_pacientes add constraint fase1_documentos_pacientes_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.ordenes_estudio add constraint fase1_ordenes_estudio_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.auditoria add constraint auditoria_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE RESTRICT;
alter table public.auditoria add constraint auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios_perfiles(id) ON DELETE RESTRICT;
alter table public.doctores add constraint doctores_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.odontogramas add constraint odontogramas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.odontogramas add constraint odontogramas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.odontogramas add constraint odontogramas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.odontograma_piezas add constraint odontograma_piezas_odontograma_id_fkey FOREIGN KEY (odontograma_id) REFERENCES odontogramas(id) ON DELETE CASCADE;
alter table public.odontograma_piezas add constraint odontograma_piezas_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.odontograma_piezas add constraint odontograma_piezas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.odontograma_historial add constraint odontograma_historial_odontograma_id_fkey FOREIGN KEY (odontograma_id) REFERENCES odontogramas(id) ON DELETE CASCADE;
alter table public.odontograma_historial add constraint odontograma_historial_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.odontograma_historial add constraint odontograma_historial_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.documentos_pacientes add constraint documentos_pacientes_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.documentos_pacientes add constraint documentos_pacientes_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.documentos_pacientes add constraint documentos_pacientes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.ordenes_estudio add constraint ordenes_estudio_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.ordenes_estudio add constraint ordenes_estudio_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
alter table public.ordenes_estudio add constraint ordenes_estudio_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.respaldos_historial add constraint respaldos_historial_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE CASCADE;
alter table public.respaldos_historial add constraint respaldos_historial_generado_por_fkey FOREIGN KEY (generado_por) REFERENCES usuarios_perfiles(id) ON DELETE SET NULL;
alter table public.pagos_suscripcion add constraint fase1_pagos_suscripcion_suscripcion_id_clinica_fk FOREIGN KEY (suscripcion_id, clinica_id) REFERENCES suscripciones(id, clinica_id) ON DELETE SET NULL (suscripcion_id);
alter table public.citas add constraint fase1_citas_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE SET NULL (paciente_id);
alter table public.citas add constraint fase1_citas_doctor_id_clinica_fk FOREIGN KEY (doctor_id, clinica_id) REFERENCES doctores(id, clinica_id) ON DELETE SET NULL (doctor_id);
alter table public.citas add constraint fase1_citas_servicio_id_clinica_fk FOREIGN KEY (servicio_id, clinica_id) REFERENCES servicios(id, clinica_id) ON DELETE SET NULL (servicio_id);
alter table public.citas add constraint fase1_citas_cita_origen_id_clinica_fk FOREIGN KEY (cita_origen_id, clinica_id) REFERENCES citas(id, clinica_id) ON DELETE SET NULL (cita_origen_id);
alter table public.notas_clinicas add constraint fase1_notas_clinicas_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.notas_clinicas add constraint fase1_notas_clinicas_doctor_id_clinica_fk FOREIGN KEY (doctor_id, clinica_id) REFERENCES doctores(id, clinica_id) ON DELETE SET NULL (doctor_id);
alter table public.notas_clinicas add constraint fase1_notas_clinicas_servicio_id_clinica_fk FOREIGN KEY (servicio_id, clinica_id) REFERENCES servicios(id, clinica_id) ON DELETE SET NULL (servicio_id);
alter table public.tratamientos add constraint fase1_tratamientos_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.recetas add constraint fase1_recetas_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE CASCADE;
alter table public.recetas add constraint fase1_recetas_doctor_id_clinica_fk FOREIGN KEY (doctor_id, clinica_id) REFERENCES doctores(id, clinica_id) ON DELETE SET NULL (doctor_id);
alter table public.ventas add constraint fase1_ventas_cita_id_clinica_fk FOREIGN KEY (cita_id, clinica_id) REFERENCES citas(id, clinica_id) ON DELETE SET NULL (cita_id);
alter table public.ventas add constraint fase1_ventas_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE SET NULL (paciente_id);
alter table public.cuentas_cobrar add constraint fase1_cuentas_cobrar_venta_id_clinica_fk FOREIGN KEY (venta_id, clinica_id) REFERENCES ventas(id, clinica_id) ON DELETE SET NULL (venta_id);
alter table public.cuentas_cobrar add constraint fase1_cuentas_cobrar_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE SET NULL (paciente_id);
alter table public.abonos_cuentas_cobrar add constraint fase1_abonos_cuentas_cobrar_cuenta_id_clinica_fk FOREIGN KEY (cuenta_id, clinica_id) REFERENCES cuentas_cobrar(id, clinica_id) ON DELETE CASCADE;
alter table public.abonos_cuentas_cobrar add constraint fase1_abonos_cuentas_cobrar_paciente_id_clinica_fk FOREIGN KEY (paciente_id, clinica_id) REFERENCES pacientes(id, clinica_id) ON DELETE SET NULL (paciente_id);
alter table public.abonos_cuentas_cobrar add constraint fase1_abonos_cuentas_cobrar_venta_id_clinica_fk FOREIGN KEY (venta_id, clinica_id) REFERENCES ventas(id, clinica_id) ON DELETE SET NULL (venta_id);
alter table public.compras_proveedores add constraint fase1_compras_proveedores_producto_id_clinica_fk FOREIGN KEY (producto_id, clinica_id) REFERENCES productos_inventario(id, clinica_id) ON DELETE SET NULL (producto_id);
alter table public.compras_proveedores add constraint fase1_compras_proveedores_gasto_id_clinica_fk FOREIGN KEY (gasto_id, clinica_id) REFERENCES gastos(id, clinica_id) ON DELETE SET NULL (gasto_id);
alter table public.movimientos_inventario add constraint fase1_movimientos_inventario_producto_id_clinica_fk FOREIGN KEY (producto_id, clinica_id) REFERENCES productos_inventario(id, clinica_id) ON DELETE CASCADE;
alter table public.compras_proveedores add constraint fase1_compras_proveedores_proveedor_id_clinica_fk FOREIGN KEY (proveedor_id, clinica_id) REFERENCES proveedores(id, clinica_id) ON DELETE SET NULL (proveedor_id);
alter table public.cuentas_pagar add constraint fase1_cuentas_pagar_compra_id_clinica_fk FOREIGN KEY (compra_id, clinica_id) REFERENCES compras_proveedores(id, clinica_id) ON DELETE SET NULL (compra_id);
alter table public.cuentas_pagar add constraint fase1_cuentas_pagar_proveedor_id_clinica_fk FOREIGN KEY (proveedor_id, clinica_id) REFERENCES proveedores(id, clinica_id) ON DELETE SET NULL (proveedor_id);
alter table public.abonos_cuentas_pagar add constraint fase1_abonos_cuentas_pagar_cuenta_id_clinica_fk FOREIGN KEY (cuenta_id, clinica_id) REFERENCES cuentas_pagar(id, clinica_id) ON DELETE CASCADE;
alter table public.abonos_cuentas_pagar add constraint abonos_cuentas_pagar_monto_no_negativo CHECK ((monto >= (0)::numeric));
alter table public.productos_inventario add constraint productos_inventario_precio_no_negativo CHECK ((precio_venta >= (0)::numeric));
alter table public.productos_inventario add constraint productos_inventario_costo_no_negativo CHECK ((costo_compra >= (0)::numeric));
alter table public.productos_inventario add constraint productos_inventario_stock_minimo_no_negativo CHECK ((stock_minimo >= (0)::numeric));
alter table public.cuentas_pagar add constraint cuentas_pagar_saldo_no_negativo CHECK ((saldo >= (0)::numeric));
alter table public.cuentas_pagar add constraint cuentas_pagar_abonado_no_negativo CHECK ((abonado >= (0)::numeric));
alter table public.compras_proveedores add constraint compras_proveedores_total_no_negativo CHECK ((total >= (0)::numeric));
alter table public.productos_inventario add constraint productos_inventario_stock_no_negativo CHECK ((stock >= (0)::numeric));
alter table public.compras_proveedores add constraint compras_proveedores_costo_no_negativo CHECK ((costo_unitario >= (0)::numeric));
alter table public.cuentas_pagar add constraint cuentas_pagar_total_no_negativo CHECK ((total >= (0)::numeric));
alter table public.documentos_pacientes add constraint fase1_documento_ruta_clinica CHECK (((storage_bucket = 'documentos-pacientes'::text) AND (split_part(storage_path, '/'::text, 1) = (clinica_id)::text) AND (split_part(storage_path, '/'::text, 2) = (paciente_id)::text)));
alter table public.compras_proveedores add constraint compras_proveedores_cantidad_no_negativa CHECK ((cantidad >= (0)::numeric));
alter table public.movimientos_inventario add constraint movimientos_inventario_costo_no_negativo CHECK ((costo_unitario >= (0)::numeric));
alter table public.compras_proveedores add constraint compras_proveedores_credito_no_negativo CHECK ((credito >= (0)::numeric));
alter table public.movimientos_inventario add constraint movimientos_inventario_stock_nuevo_no_negativo CHECK ((stock_nuevo >= (0)::numeric));
alter table public.movimientos_inventario add constraint movimientos_inventario_stock_anterior_no_negativo CHECK ((stock_anterior >= (0)::numeric));
alter table public.movimientos_inventario add constraint movimientos_inventario_cantidad_no_negativa CHECK ((cantidad >= (0)::numeric));
alter table public.compras_proveedores add constraint compras_proveedores_pago_no_negativo CHECK ((pago_ahora >= (0)::numeric));
CREATE INDEX idx_abonos_cuentas_cobrar_clinica_id ON public.abonos_cuentas_cobrar USING btree (clinica_id);
CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (fecha);
CREATE INDEX idx_citas_doctor_id ON public.citas USING btree (doctor_id);
CREATE INDEX idx_ventas_clinica_id ON public.ventas USING btree (clinica_id);
CREATE INDEX idx_odontograma_piezas_odontograma_id ON public.odontograma_piezas USING btree (odontograma_id);
CREATE INDEX idx_movimientos_inventario_fecha ON public.movimientos_inventario USING btree (fecha);
CREATE INDEX idx_odontogramas_clinica_id ON public.odontogramas USING btree (clinica_id);
CREATE INDEX idx_abonos_cuentas_pagar_cuenta_id ON public.abonos_cuentas_pagar USING btree (cuenta_id);
CREATE INDEX idx_abonos_cuentas_cobrar_cuenta_id ON public.abonos_cuentas_cobrar USING btree (cuenta_id);
CREATE INDEX idx_usuarios_perfiles_auth_user_id ON public.usuarios_perfiles USING btree (auth_user_id);
CREATE INDEX idx_suscripciones_clinica_id ON public.suscripciones USING btree (clinica_id);
CREATE INDEX idx_auditoria_creado_en ON public.auditoria USING btree (creado_en);
CREATE INDEX idx_proveedores_nombre ON public.proveedores USING btree (nombre);
CREATE INDEX idx_gastos_fecha ON public.gastos USING btree (fecha);
CREATE INDEX idx_movimientos_inventario_producto_id ON public.movimientos_inventario USING btree (producto_id);
CREATE INDEX idx_documentos_pacientes_fecha ON public.documentos_pacientes USING btree (fecha);
CREATE INDEX idx_presupuestos_estado ON public.presupuestos USING btree (estado);
CREATE INDEX idx_tratamientos_estado ON public.tratamientos USING btree (estado);
CREATE INDEX idx_usuarios_perfiles_clinica_id ON public.usuarios_perfiles USING btree (clinica_id);
CREATE INDEX idx_pacientes_cedula ON public.pacientes USING btree (cedula);
CREATE INDEX idx_tratamientos_clinica_id ON public.tratamientos USING btree (clinica_id);
CREATE INDEX idx_gastos_clinica_id ON public.gastos USING btree (clinica_id);
CREATE INDEX idx_citas_clinica_id ON public.citas USING btree (clinica_id);
CREATE INDEX idx_notas_clinicas_paciente_id ON public.notas_clinicas USING btree (paciente_id);
CREATE INDEX idx_productos_inventario_estado ON public.productos_inventario USING btree (estado);
CREATE INDEX idx_recetas_fecha ON public.recetas USING btree (fecha);
CREATE INDEX idx_abonos_cuentas_cobrar_fecha ON public.abonos_cuentas_cobrar USING btree (fecha);
CREATE INDEX idx_compras_proveedores_producto_id ON public.compras_proveedores USING btree (producto_id);
CREATE INDEX idx_cuentas_pagar_fecha_vencimiento ON public.cuentas_pagar USING btree (fecha_vencimiento);
CREATE INDEX idx_gastos_categoria ON public.gastos USING btree (categoria);
CREATE INDEX idx_auditoria_creada_en ON public.auditoria USING btree (creada_en DESC);
CREATE INDEX idx_configuraciones_clinicas_clinica_id ON public.configuraciones_clinicas USING btree (clinica_id);
CREATE INDEX idx_auditoria_modulo ON public.auditoria USING btree (modulo);
CREATE INDEX idx_proveedores_clinica_id ON public.proveedores USING btree (clinica_id);
CREATE INDEX idx_productos_inventario_clinica_id ON public.productos_inventario USING btree (clinica_id);
CREATE INDEX idx_documentos_pacientes_categoria ON public.documentos_pacientes USING btree (categoria);
CREATE INDEX idx_gastos_estado ON public.gastos USING btree (estado);
CREATE INDEX idx_cuentas_cobrar_fecha_vencimiento ON public.cuentas_cobrar USING btree (fecha_vencimiento);
CREATE INDEX idx_recetas_paciente_id ON public.recetas USING btree (paciente_id);
CREATE INDEX idx_pagos_suscripcion_clinica_id ON public.pagos_suscripcion USING btree (clinica_id);
CREATE UNIQUE INDEX idx_proveedores_nombre_unico ON public.proveedores USING btree (clinica_id, lower(nombre)) WHERE (nombre <> ''::text);
CREATE INDEX idx_cierres_caja_clinica_id ON public.cierres_caja USING btree (clinica_id);
CREATE INDEX idx_citas_estado ON public.citas USING btree (estado);
CREATE INDEX idx_documentos_pacientes_paciente_id ON public.documentos_pacientes USING btree (paciente_id);
CREATE INDEX idx_citas_fecha ON public.citas USING btree (fecha);
CREATE INDEX idx_odontograma_historial_odontograma_id ON public.odontograma_historial USING btree (odontograma_id);
CREATE INDEX idx_gastos_metodo_pago ON public.gastos USING btree (metodo_pago);
CREATE INDEX idx_respaldos_historial_creado_en ON public.respaldos_historial USING btree (creado_en);
CREATE INDEX idx_ventas_cita_id ON public.ventas USING btree (cita_id);
CREATE INDEX idx_movimientos_inventario_tipo ON public.movimientos_inventario USING btree (tipo);
CREATE INDEX idx_compras_proveedores_proveedor_id ON public.compras_proveedores USING btree (proveedor_id);
CREATE INDEX idx_cierres_caja_fecha ON public.cierres_caja USING btree (fecha);
CREATE INDEX idx_servicios_clinica_id ON public.servicios USING btree (clinica_id);
CREATE INDEX idx_ventas_estado ON public.ventas USING btree (estado);
CREATE INDEX idx_movimientos_inventario_clinica_id ON public.movimientos_inventario USING btree (clinica_id);
CREATE INDEX idx_ordenes_estudio_paciente_id ON public.ordenes_estudio USING btree (paciente_id);
CREATE INDEX idx_cuentas_pagar_proveedor_id ON public.cuentas_pagar USING btree (proveedor_id);
CREATE INDEX idx_doctores_clinica_id ON public.doctores USING btree (clinica_id);
CREATE INDEX idx_cuentas_pagar_compra_id ON public.cuentas_pagar USING btree (compra_id);
CREATE INDEX idx_auditoria_nivel ON public.auditoria USING btree (nivel);
CREATE INDEX idx_cuentas_cobrar_estado ON public.cuentas_cobrar USING btree (estado);
CREATE INDEX idx_productos_inventario_categoria ON public.productos_inventario USING btree (categoria);
CREATE INDEX idx_ventas_paciente_id ON public.ventas USING btree (paciente_id);
CREATE INDEX idx_cuentas_cobrar_clinica_id ON public.cuentas_cobrar USING btree (clinica_id);
CREATE INDEX idx_pos_clinica_activo ON public.pos_clinica USING btree (activo);
CREATE INDEX idx_ordenes_estudio_clinica_id ON public.ordenes_estudio USING btree (clinica_id);
CREATE INDEX idx_cierres_caja_estado ON public.cierres_caja USING btree (estado);
CREATE INDEX idx_cuentas_cobrar_venta_id ON public.cuentas_cobrar USING btree (venta_id);
CREATE INDEX idx_pos_clinica_clinica_id ON public.pos_clinica USING btree (clinica_id);
CREATE INDEX idx_cuentas_pagar_estado ON public.cuentas_pagar USING btree (estado);
CREATE INDEX idx_abonos_cuentas_cobrar_paciente_id ON public.abonos_cuentas_cobrar USING btree (paciente_id);
CREATE INDEX idx_notas_clinicas_fecha ON public.notas_clinicas USING btree (fecha);
CREATE INDEX idx_abonos_cuentas_pagar_fecha ON public.abonos_cuentas_pagar USING btree (fecha);
CREATE INDEX idx_compras_proveedores_estado ON public.compras_proveedores USING btree (estado);
CREATE INDEX idx_abonos_cuentas_pagar_clinica_id ON public.abonos_cuentas_pagar USING btree (clinica_id);
CREATE INDEX idx_tratamientos_paciente_id ON public.tratamientos USING btree (paciente_id);
CREATE INDEX idx_recetas_clinica_id ON public.recetas USING btree (clinica_id);
CREATE INDEX idx_presupuestos_paciente_id ON public.presupuestos USING btree (paciente_id);
CREATE INDEX idx_pacientes_clinica_id ON public.pacientes USING btree (clinica_id);
CREATE INDEX idx_documentos_pacientes_clinica_id ON public.documentos_pacientes USING btree (clinica_id);
CREATE INDEX idx_presupuestos_clinica_id ON public.presupuestos USING btree (clinica_id);
CREATE INDEX idx_compras_proveedores_clinica_id ON public.compras_proveedores USING btree (clinica_id);
CREATE INDEX idx_odontograma_piezas_paciente_id ON public.odontograma_piezas USING btree (paciente_id);
CREATE INDEX idx_cuentas_pagar_clinica_id ON public.cuentas_pagar USING btree (clinica_id);
CREATE UNIQUE INDEX idx_productos_inventario_codigo_unico ON public.productos_inventario USING btree (clinica_id, lower(codigo)) WHERE (codigo <> ''::text);
CREATE INDEX idx_presupuesto_items_presupuesto_id ON public.presupuesto_items USING btree (presupuesto_id);
CREATE INDEX idx_auditoria_clinica_id ON public.auditoria USING btree (clinica_id);
CREATE INDEX idx_productos_inventario_nombre ON public.productos_inventario USING btree (nombre);
CREATE INDEX idx_citas_paciente_id ON public.citas USING btree (paciente_id);
CREATE INDEX idx_notas_clinicas_clinica_id ON public.notas_clinicas USING btree (clinica_id);
CREATE INDEX idx_compras_proveedores_fecha ON public.compras_proveedores USING btree (fecha);
CREATE INDEX idx_cuentas_cobrar_paciente_id ON public.cuentas_cobrar USING btree (paciente_id);
CREATE INDEX idx_odontogramas_paciente_id ON public.odontogramas USING btree (paciente_id);
CREATE INDEX idx_ordenes_estudio_fecha ON public.ordenes_estudio USING btree (fecha);
CREATE INDEX idx_respaldos_historial_clinica_id ON public.respaldos_historial USING btree (clinica_id);
CREATE INDEX idx_odontograma_historial_paciente_id ON public.odontograma_historial USING btree (paciente_id);
CREATE INDEX idx_proveedores_estado ON public.proveedores USING btree (estado);
CREATE UNIQUE INDEX idx_documentos_pacientes_storage_path ON public.documentos_pacientes USING btree (storage_bucket, storage_path);
CREATE INDEX idx_pacientes_nombre ON public.pacientes USING gin (to_tsvector('spanish'::regconfig, nombre));
CREATE INDEX idx_ordenes_estudio_estado ON public.ordenes_estudio USING btree (estado);
CREATE OR REPLACE FUNCTION clinica_privada.es_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select exists (
        select 1
        from public.usuarios_perfiles
        where auth_user_id = auth.uid()
          and rol = 'SUPER_ADMIN'
          and estado = 'Activo'
    );
$function$
;
CREATE OR REPLACE FUNCTION clinica_privada.es_admin_clinica()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select exists (
        select 1
        from public.usuarios_perfiles
        where auth_user_id = auth.uid()
          and rol = 'ADMIN'
          and estado = 'Activo'
    );
$function$
;
CREATE OR REPLACE FUNCTION clinica_privada.mi_perfil_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select id
    from public.usuarios_perfiles
    where auth_user_id = auth.uid()
      and estado = 'Activo'
    limit 1;
$function$
;
CREATE OR REPLACE FUNCTION public.actualizar_columna_actualizada_en()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    new.actualizado_en = now();
    return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION clinica_privada.fijar_autoria_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION clinica_privada.conservar_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    raise exception 'El historial de auditoría no se puede modificar ni eliminar.' using errcode='42501';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.mi_perfil_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select clinica_privada.mi_perfil_id(); $function$
;
CREATE OR REPLACE FUNCTION clinica_privada.mi_rol()
 RETURNS rol_usuario_sistema
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select rol
    from public.usuarios_perfiles
    where auth_user_id = auth.uid()
      and estado = 'Activo'
    limit 1;
$function$
;
CREATE OR REPLACE FUNCTION public.mi_rol()
 RETURNS rol_usuario_sistema
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select clinica_privada.mi_rol(); $function$
;
CREATE OR REPLACE FUNCTION clinica_privada.acceso_actual()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.verificar_acceso_clinica()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select clinica_privada.acceso_actual(); $function$
;
CREATE OR REPLACE FUNCTION public.es_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select clinica_privada.es_super_admin(); $function$
;
CREATE OR REPLACE FUNCTION clinica_privada.acceso_permitido()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select coalesce((clinica_privada.acceso_actual()->>'permitido')::boolean, false); $function$
;
CREATE OR REPLACE FUNCTION public.es_admin_clinica()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select clinica_privada.es_admin_clinica(); $function$
;
CREATE OR REPLACE FUNCTION clinica_privada.mi_clinica_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select clinica_id
    from public.usuarios_perfiles
    where auth_user_id = auth.uid()
      and estado = 'Activo'
    limit 1;
$function$
;
CREATE OR REPLACE FUNCTION public.mi_clinica_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select clinica_privada.mi_clinica_id(); $function$
;
CREATE TRIGGER trg_clinicas_actualizada_en BEFORE UPDATE ON public.clinicas FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_usuarios_perfiles_actualizado_en BEFORE UPDATE ON public.usuarios_perfiles FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_suscripciones_actualizada_en BEFORE UPDATE ON public.suscripciones FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_pacientes_actualizado_en BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_doctores_actualizado_en BEFORE UPDATE ON public.doctores FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_servicios_actualizado_en BEFORE UPDATE ON public.servicios FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_citas_actualizado_en BEFORE UPDATE ON public.citas FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_notas_clinicas_actualizado_en BEFORE UPDATE ON public.notas_clinicas FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_tratamientos_actualizado_en BEFORE UPDATE ON public.tratamientos FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_recetas_actualizado_en BEFORE UPDATE ON public.recetas FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_ventas_actualizado_en BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_cuentas_cobrar_actualizado_en BEFORE UPDATE ON public.cuentas_cobrar FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_abonos_cuentas_cobrar_actualizado_en BEFORE UPDATE ON public.abonos_cuentas_cobrar FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_cierres_caja_actualizado_en BEFORE UPDATE ON public.cierres_caja FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_gastos_actualizado_en BEFORE UPDATE ON public.gastos FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_productos_inventario_actualizado_en BEFORE UPDATE ON public.productos_inventario FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_proveedores_actualizado_en BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_compras_proveedores_actualizado_en BEFORE UPDATE ON public.compras_proveedores FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_cuentas_pagar_actualizado_en BEFORE UPDATE ON public.cuentas_pagar FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_configuraciones_clinicas_actualizado_en BEFORE UPDATE ON public.configuraciones_clinicas FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_pos_clinica_actualizado_en BEFORE UPDATE ON public.pos_clinica FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_presupuestos_actualizado_en BEFORE UPDATE ON public.presupuestos FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_presupuesto_items_actualizado_en BEFORE UPDATE ON public.presupuesto_items FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_odontogramas_actualizado_en BEFORE UPDATE ON public.odontogramas FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_odontograma_piezas_actualizado_en BEFORE UPDATE ON public.odontograma_piezas FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_documentos_pacientes_actualizado_en BEFORE UPDATE ON public.documentos_pacientes FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER trg_ordenes_estudio_actualizado_en BEFORE UPDATE ON public.ordenes_estudio FOR EACH ROW EXECUTE FUNCTION actualizar_columna_actualizada_en();
CREATE TRIGGER fase1_auditoria_autor BEFORE INSERT ON public.auditoria FOR EACH ROW EXECUTE FUNCTION clinica_privada.fijar_autoria_auditoria();
CREATE TRIGGER fase1_auditoria_inmutable BEFORE DELETE OR UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION clinica_privada.conservar_auditoria();
CREATE TRIGGER fase1_auditoria_no_truncate BEFORE TRUNCATE ON public.auditoria FOR EACH STATEMENT EXECUTE FUNCTION clinica_privada.conservar_auditoria();
alter table public.abonos_cuentas_cobrar enable row level security;
alter table public.abonos_cuentas_pagar enable row level security;
alter table public.auditoria enable row level security;
alter table public.cierres_caja enable row level security;
alter table public.citas enable row level security;
alter table public.clinicas enable row level security;
alter table public.compras_proveedores enable row level security;
alter table public.configuraciones_clinicas enable row level security;
alter table public.cuentas_cobrar enable row level security;
alter table public.cuentas_pagar enable row level security;
alter table public.doctores enable row level security;
alter table public.documentos_pacientes enable row level security;
alter table public.gastos enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.notas_clinicas enable row level security;
alter table public.odontograma_historial enable row level security;
alter table public.odontograma_piezas enable row level security;
alter table public.odontogramas enable row level security;
alter table public.ordenes_estudio enable row level security;
alter table public.pacientes enable row level security;
alter table public.pagos_suscripcion enable row level security;
alter table public.pos_clinica enable row level security;
alter table public.presupuesto_items enable row level security;
alter table public.presupuestos enable row level security;
alter table public.productos_inventario enable row level security;
alter table public.proveedores enable row level security;
alter table public.recetas enable row level security;
alter table public.respaldos_historial enable row level security;
alter table public.servicios enable row level security;
alter table public.suscripciones enable row level security;
alter table public.tratamientos enable row level security;
alter table public.usuarios_perfiles enable row level security;
alter table public.ventas enable row level security;
create policy "fase1_licencia_storage" on storage.objects as RESTRICTIVE for ALL to authenticated using (((bucket_id <> 'documentos-pacientes'::text) OR ( SELECT clinica_privada.acceso_permitido() AS acceso_permitido))) with check (((bucket_id <> 'documentos-pacientes'::text) OR ( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)));
create policy "usuarios_actualizan_archivos_documentos_pacientes" on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'documentos-pacientes'::text) AND (clinica_privada.es_super_admin() OR (((storage.foldername(name))[1] = (clinica_privada.mi_clinica_id())::text) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))))) with check (((bucket_id = 'documentos-pacientes'::text) AND (clinica_privada.es_super_admin() OR (((storage.foldername(name))[1] = (clinica_privada.mi_clinica_id())::text) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))))));
create policy "usuarios_eliminan_archivos_documentos_pacientes" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'documentos-pacientes'::text) AND (clinica_privada.es_super_admin() OR (((storage.foldername(name))[1] = (clinica_privada.mi_clinica_id())::text) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))))));
create policy "usuarios_suben_archivos_documentos_pacientes" on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'documentos-pacientes'::text) AND (clinica_privada.es_super_admin() OR (((storage.foldername(name))[1] = (clinica_privada.mi_clinica_id())::text) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))))));
create policy "usuarios_ven_archivos_documentos_pacientes" on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'documentos-pacientes'::text) AND (clinica_privada.es_super_admin() OR (((storage.foldername(name))[1] = (clinica_privada.mi_clinica_id())::text) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text, 'CAJA'::text]))))));
create policy "fase1_licencia_activa" on public.pagos_suscripcion as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_pagos_suscripcion" on public.pagos_suscripcion as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_ven_pagos_de_su_clinica" on public.pagos_suscripcion as PERMISSIVE for SELECT to authenticated using ((clinica_id = clinica_privada.mi_clinica_id()));
create policy "super_admin_gestiona_suscripciones" on public.suscripciones as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_ven_suscripcion_de_su_clinica" on public.suscripciones as PERMISSIVE for SELECT to authenticated using ((clinica_id = clinica_privada.mi_clinica_id()));
create policy "super_admin_gestiona_clinicas" on public.clinicas as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_ven_su_clinica" on public.clinicas as PERMISSIVE for SELECT to authenticated using ((id = clinica_privada.mi_clinica_id()));
create policy "admin_ve_usuarios_clinica" on public.usuarios_perfiles as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_perfiles_licencia" on public.usuarios_perfiles as RESTRICTIVE for SELECT to authenticated using (((auth_user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)));
create policy "super_admin_ve_usuarios_perfiles" on public.usuarios_perfiles as PERMISSIVE for SELECT to authenticated using (clinica_privada.es_super_admin());
create policy "usuarios_ven_perfiles_de_su_clinica" on public.usuarios_perfiles as PERMISSIVE for SELECT to authenticated using (((auth_user_id = auth.uid()) OR (clinica_id = clinica_privada.mi_clinica_id())));
create policy "fase1_auditoria_insercion" on public.auditoria as PERMISSIVE for INSERT to authenticated with check ((( SELECT clinica_privada.acceso_permitido() AS acceso_permitido) AND (usuario_id = clinica_privada.mi_perfil_id()) AND (usuario_perfil_id = clinica_privada.mi_perfil_id()) AND (clinica_privada.es_super_admin() OR (clinica_id = clinica_privada.mi_clinica_id()))));
create policy "fase1_auditoria_lectura" on public.auditoria as PERMISSIVE for SELECT to authenticated using ((clinica_privada.es_super_admin() OR ((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text))));
create policy "fase1_auditoria_licencia" on public.auditoria as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "admin_elimina_pacientes_clinica" on public.pacientes as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.pacientes as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_pacientes" on public.pacientes as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_pacientes_clinica" on public.pacientes as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_pacientes_clinica" on public.pacientes as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_pacientes_clinica" on public.pacientes as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "admin_actualiza_doctores_clinica" on public.doctores as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_crea_doctores_clinica" on public.doctores as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_elimina_doctores_clinica" on public.doctores as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.doctores as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_doctores" on public.doctores as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_ven_doctores_clinica" on public.doctores as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "admin_actualiza_servicios_clinica" on public.servicios as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_crea_servicios_clinica" on public.servicios as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_elimina_servicios_clinica" on public.servicios as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.servicios as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_servicios" on public.servicios as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_ven_servicios_clinica" on public.servicios as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "admin_elimina_citas_clinica" on public.citas as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.citas as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_citas" on public.citas as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_citas_clinica" on public.citas as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_citas_clinica" on public.citas as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_citas_clinica" on public.citas as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "admin_elimina_notas_clinicas" on public.notas_clinicas as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.notas_clinicas as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_notas_clinicas" on public.notas_clinicas as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_notas_clinicas" on public.notas_clinicas as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_notas_clinicas" on public.notas_clinicas as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_notas_clinicas" on public.notas_clinicas as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "admin_elimina_tratamientos" on public.tratamientos as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.tratamientos as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_tratamientos" on public.tratamientos as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_tratamientos" on public.tratamientos as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_tratamientos" on public.tratamientos as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_tratamientos" on public.tratamientos as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "admin_elimina_recetas" on public.recetas as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.recetas as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_recetas" on public.recetas as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_recetas" on public.recetas as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_recetas" on public.recetas as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_recetas" on public.recetas as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "admin_elimina_ventas" on public.ventas as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.ventas as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_ventas" on public.ventas as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_ventas" on public.ventas as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_ventas" on public.ventas as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_ventas" on public.ventas as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text, 'DOCTOR'::text]))));
create policy "admin_elimina_cuentas_cobrar" on public.cuentas_cobrar as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.cuentas_cobrar as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_cuentas_cobrar" on public.cuentas_cobrar as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_cuentas_cobrar" on public.cuentas_cobrar as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_cuentas_cobrar" on public.cuentas_cobrar as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_cuentas_cobrar" on public.cuentas_cobrar as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text, 'DOCTOR'::text]))));
create policy "admin_elimina_abonos_cuentas_cobrar" on public.abonos_cuentas_cobrar as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.abonos_cuentas_cobrar as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_abonos_cuentas_cobrar" on public.abonos_cuentas_cobrar as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_abonos_cuentas_cobrar" on public.abonos_cuentas_cobrar as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_abonos_cuentas_cobrar" on public.abonos_cuentas_cobrar as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_abonos_cuentas_cobrar" on public.abonos_cuentas_cobrar as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text, 'DOCTOR'::text]))));
create policy "admin_elimina_cierres_caja" on public.cierres_caja as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.cierres_caja as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_cierres_caja" on public.cierres_caja as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_cierres_caja" on public.cierres_caja as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_crean_cierres_caja" on public.cierres_caja as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_ven_cierres_caja" on public.cierres_caja as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "admin_elimina_gastos" on public.gastos as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.gastos as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_gastos" on public.gastos as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_gastos" on public.gastos as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_crean_gastos" on public.gastos as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_ven_gastos" on public.gastos as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "admin_crea_productos_inventario" on public.productos_inventario as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_elimina_productos_inventario" on public.productos_inventario as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.productos_inventario as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_productos_inventario" on public.productos_inventario as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_productos_inventario" on public.productos_inventario as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_productos_inventario" on public.productos_inventario as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "admin_elimina_movimientos_inventario" on public.movimientos_inventario as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.movimientos_inventario as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_movimientos_inventario" on public.movimientos_inventario as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_crean_movimientos_inventario" on public.movimientos_inventario as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_movimientos_inventario" on public.movimientos_inventario as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text, 'RECEPCION'::text]))));
create policy "admin_elimina_proveedores" on public.proveedores as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.proveedores as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_proveedores" on public.proveedores as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_proveedores" on public.proveedores as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_crean_proveedores" on public.proveedores as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_ven_proveedores" on public.proveedores as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "admin_elimina_compras_proveedores" on public.compras_proveedores as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.compras_proveedores as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_compras_proveedores" on public.compras_proveedores as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_compras_proveedores" on public.compras_proveedores as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_crean_compras_proveedores" on public.compras_proveedores as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_ven_compras_proveedores" on public.compras_proveedores as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "admin_elimina_cuentas_pagar" on public.cuentas_pagar as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.cuentas_pagar as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_cuentas_pagar" on public.cuentas_pagar as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_cuentas_pagar" on public.cuentas_pagar as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_crean_cuentas_pagar" on public.cuentas_pagar as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_ven_cuentas_pagar" on public.cuentas_pagar as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "admin_elimina_abonos_cuentas_pagar" on public.abonos_cuentas_pagar as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.abonos_cuentas_pagar as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_abonos_cuentas_pagar" on public.abonos_cuentas_pagar as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_abonos_cuentas_pagar" on public.abonos_cuentas_pagar as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_crean_abonos_cuentas_pagar" on public.abonos_cuentas_pagar as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "usuarios_ven_abonos_cuentas_pagar" on public.abonos_cuentas_pagar as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'CAJA'::text]))));
create policy "admin_elimina_odontogramas" on public.odontogramas as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.odontogramas as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_odontogramas" on public.odontogramas as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_clinicos_actualizan_odontogramas" on public.odontogramas as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_clinicos_crean_odontogramas" on public.odontogramas as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_clinicos_ven_odontogramas" on public.odontogramas as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "fase1_licencia_activa" on public.odontograma_piezas as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_odontograma_piezas" on public.odontograma_piezas as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_clinicos_actualizan_odontograma_piezas" on public.odontograma_piezas as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_clinicos_crean_odontograma_piezas" on public.odontograma_piezas as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_clinicos_eliminan_odontograma_piezas" on public.odontograma_piezas as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_clinicos_ven_odontograma_piezas" on public.odontograma_piezas as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "fase1_licencia_activa" on public.odontograma_historial as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_odontograma_historial" on public.odontograma_historial as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_clinicos_crean_odontograma_historial" on public.odontograma_historial as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_clinicos_eliminan_odontograma_historial" on public.odontograma_historial as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_clinicos_ven_odontograma_historial" on public.odontograma_historial as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "admin_actualiza_configuraciones_clinicas" on public.configuraciones_clinicas as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_elimina_configuraciones_clinicas" on public.configuraciones_clinicas as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_inserta_configuraciones_clinicas" on public.configuraciones_clinicas as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.configuraciones_clinicas as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_configuraciones_clinicas" on public.configuraciones_clinicas as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_ven_configuraciones_clinicas" on public.configuraciones_clinicas as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text, 'CAJA'::text]))));
create policy "admin_actualiza_pos_clinica" on public.pos_clinica as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_elimina_pos_clinica" on public.pos_clinica as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_inserta_pos_clinica" on public.pos_clinica as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.pos_clinica as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_pos_clinica" on public.pos_clinica as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_ven_pos_clinica" on public.pos_clinica as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text, 'CAJA'::text]))));
create policy "admin_elimina_presupuestos" on public.presupuestos as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.presupuestos as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_presupuestos" on public.presupuestos as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_presupuestos" on public.presupuestos as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_presupuestos" on public.presupuestos as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_presupuestos" on public.presupuestos as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text, 'CAJA'::text]))));
create policy "admin_elimina_presupuesto_items" on public.presupuesto_items as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.presupuesto_items as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_presupuesto_items" on public.presupuesto_items as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_presupuesto_items" on public.presupuesto_items as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_presupuesto_items" on public.presupuesto_items as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_presupuesto_items" on public.presupuesto_items as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text, 'CAJA'::text]))));
create policy "admin_elimina_ordenes_estudio" on public.ordenes_estudio as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.ordenes_estudio as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_ordenes_estudio" on public.ordenes_estudio as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_ordenes_estudio" on public.ordenes_estudio as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_ordenes_estudio" on public.ordenes_estudio as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_ordenes_estudio" on public.ordenes_estudio as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text, 'CAJA'::text]))));
create policy "admin_crea_respaldos_historial" on public.respaldos_historial as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (generado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_elimina_respaldos_historial" on public.respaldos_historial as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "admin_ve_respaldos_historial" on public.respaldos_historial as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = 'ADMIN'::text)));
create policy "fase1_licencia_activa" on public.respaldos_historial as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_respaldos_historial" on public.respaldos_historial as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "fase1_licencia_activa" on public.documentos_pacientes as RESTRICTIVE for ALL to authenticated using (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido)) with check (( SELECT clinica_privada.acceso_permitido() AS acceso_permitido));
create policy "super_admin_gestiona_documentos_pacientes" on public.documentos_pacientes as PERMISSIVE for ALL to authenticated using (clinica_privada.es_super_admin()) with check (clinica_privada.es_super_admin());
create policy "usuarios_actualizan_documentos_pacientes" on public.documentos_pacientes as PERMISSIVE for UPDATE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text])))) with check (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_crean_documentos_pacientes" on public.documentos_pacientes as PERMISSIVE for INSERT to authenticated with check (((clinica_id = clinica_privada.mi_clinica_id()) AND (creado_por = clinica_privada.mi_perfil_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_eliminan_documentos_pacientes" on public.documentos_pacientes as PERMISSIVE for DELETE to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text]))));
create policy "usuarios_ven_documentos_pacientes" on public.documentos_pacientes as PERMISSIVE for SELECT to authenticated using (((clinica_id = clinica_privada.mi_clinica_id()) AND ((clinica_privada.mi_rol())::text = ANY (ARRAY['ADMIN'::text, 'DOCTOR'::text, 'RECEPCION'::text, 'CAJA'::text]))));
grant INSERT on public.pagos_suscripcion to anon;
grant SELECT on public.pagos_suscripcion to anon;
grant UPDATE on public.pagos_suscripcion to anon;
grant DELETE on public.pagos_suscripcion to anon;
grant TRUNCATE on public.pagos_suscripcion to anon;
grant REFERENCES on public.pagos_suscripcion to anon;
grant TRIGGER on public.pagos_suscripcion to anon;
grant INSERT on public.pagos_suscripcion to authenticated;
grant SELECT on public.pagos_suscripcion to authenticated;
grant UPDATE on public.pagos_suscripcion to authenticated;
grant DELETE on public.pagos_suscripcion to authenticated;
grant TRUNCATE on public.pagos_suscripcion to authenticated;
grant REFERENCES on public.pagos_suscripcion to authenticated;
grant TRIGGER on public.pagos_suscripcion to authenticated;
grant INSERT on public.pagos_suscripcion to service_role;
grant SELECT on public.pagos_suscripcion to service_role;
grant UPDATE on public.pagos_suscripcion to service_role;
grant DELETE on public.pagos_suscripcion to service_role;
grant TRUNCATE on public.pagos_suscripcion to service_role;
grant REFERENCES on public.pagos_suscripcion to service_role;
grant TRIGGER on public.pagos_suscripcion to service_role;
grant INSERT on public.suscripciones to anon;
grant SELECT on public.suscripciones to anon;
grant UPDATE on public.suscripciones to anon;
grant DELETE on public.suscripciones to anon;
grant TRUNCATE on public.suscripciones to anon;
grant REFERENCES on public.suscripciones to anon;
grant TRIGGER on public.suscripciones to anon;
grant INSERT on public.suscripciones to authenticated;
grant SELECT on public.suscripciones to authenticated;
grant UPDATE on public.suscripciones to authenticated;
grant DELETE on public.suscripciones to authenticated;
grant TRUNCATE on public.suscripciones to authenticated;
grant REFERENCES on public.suscripciones to authenticated;
grant TRIGGER on public.suscripciones to authenticated;
grant INSERT on public.suscripciones to service_role;
grant SELECT on public.suscripciones to service_role;
grant UPDATE on public.suscripciones to service_role;
grant DELETE on public.suscripciones to service_role;
grant TRUNCATE on public.suscripciones to service_role;
grant REFERENCES on public.suscripciones to service_role;
grant TRIGGER on public.suscripciones to service_role;
grant INSERT on public.clinicas to anon;
grant SELECT on public.clinicas to anon;
grant UPDATE on public.clinicas to anon;
grant DELETE on public.clinicas to anon;
grant TRUNCATE on public.clinicas to anon;
grant REFERENCES on public.clinicas to anon;
grant TRIGGER on public.clinicas to anon;
grant INSERT on public.clinicas to authenticated;
grant SELECT on public.clinicas to authenticated;
grant UPDATE on public.clinicas to authenticated;
grant DELETE on public.clinicas to authenticated;
grant TRUNCATE on public.clinicas to authenticated;
grant REFERENCES on public.clinicas to authenticated;
grant TRIGGER on public.clinicas to authenticated;
grant INSERT on public.clinicas to service_role;
grant SELECT on public.clinicas to service_role;
grant UPDATE on public.clinicas to service_role;
grant DELETE on public.clinicas to service_role;
grant TRUNCATE on public.clinicas to service_role;
grant REFERENCES on public.clinicas to service_role;
grant TRIGGER on public.clinicas to service_role;
grant SELECT on public.usuarios_perfiles to anon;
grant SELECT on public.usuarios_perfiles to authenticated;
grant INSERT on public.usuarios_perfiles to service_role;
grant SELECT on public.usuarios_perfiles to service_role;
grant UPDATE on public.usuarios_perfiles to service_role;
grant DELETE on public.usuarios_perfiles to service_role;
grant TRUNCATE on public.usuarios_perfiles to service_role;
grant REFERENCES on public.usuarios_perfiles to service_role;
grant TRIGGER on public.usuarios_perfiles to service_role;
grant INSERT on public.auditoria to authenticated;
grant SELECT on public.auditoria to authenticated;
grant INSERT on public.auditoria to service_role;
grant SELECT on public.auditoria to service_role;
grant INSERT on public.pacientes to anon;
grant SELECT on public.pacientes to anon;
grant UPDATE on public.pacientes to anon;
grant DELETE on public.pacientes to anon;
grant TRUNCATE on public.pacientes to anon;
grant REFERENCES on public.pacientes to anon;
grant TRIGGER on public.pacientes to anon;
grant INSERT on public.pacientes to authenticated;
grant SELECT on public.pacientes to authenticated;
grant UPDATE on public.pacientes to authenticated;
grant DELETE on public.pacientes to authenticated;
grant TRUNCATE on public.pacientes to authenticated;
grant REFERENCES on public.pacientes to authenticated;
grant TRIGGER on public.pacientes to authenticated;
grant INSERT on public.pacientes to service_role;
grant SELECT on public.pacientes to service_role;
grant UPDATE on public.pacientes to service_role;
grant DELETE on public.pacientes to service_role;
grant TRUNCATE on public.pacientes to service_role;
grant REFERENCES on public.pacientes to service_role;
grant TRIGGER on public.pacientes to service_role;
grant INSERT on public.doctores to anon;
grant SELECT on public.doctores to anon;
grant UPDATE on public.doctores to anon;
grant DELETE on public.doctores to anon;
grant TRUNCATE on public.doctores to anon;
grant REFERENCES on public.doctores to anon;
grant TRIGGER on public.doctores to anon;
grant INSERT on public.doctores to authenticated;
grant SELECT on public.doctores to authenticated;
grant UPDATE on public.doctores to authenticated;
grant DELETE on public.doctores to authenticated;
grant TRUNCATE on public.doctores to authenticated;
grant REFERENCES on public.doctores to authenticated;
grant TRIGGER on public.doctores to authenticated;
grant INSERT on public.doctores to service_role;
grant SELECT on public.doctores to service_role;
grant UPDATE on public.doctores to service_role;
grant DELETE on public.doctores to service_role;
grant TRUNCATE on public.doctores to service_role;
grant REFERENCES on public.doctores to service_role;
grant TRIGGER on public.doctores to service_role;
grant INSERT on public.servicios to anon;
grant SELECT on public.servicios to anon;
grant UPDATE on public.servicios to anon;
grant DELETE on public.servicios to anon;
grant TRUNCATE on public.servicios to anon;
grant REFERENCES on public.servicios to anon;
grant TRIGGER on public.servicios to anon;
grant INSERT on public.servicios to authenticated;
grant SELECT on public.servicios to authenticated;
grant UPDATE on public.servicios to authenticated;
grant DELETE on public.servicios to authenticated;
grant TRUNCATE on public.servicios to authenticated;
grant REFERENCES on public.servicios to authenticated;
grant TRIGGER on public.servicios to authenticated;
grant INSERT on public.servicios to service_role;
grant SELECT on public.servicios to service_role;
grant UPDATE on public.servicios to service_role;
grant DELETE on public.servicios to service_role;
grant TRUNCATE on public.servicios to service_role;
grant REFERENCES on public.servicios to service_role;
grant TRIGGER on public.servicios to service_role;
grant INSERT on public.citas to anon;
grant SELECT on public.citas to anon;
grant UPDATE on public.citas to anon;
grant DELETE on public.citas to anon;
grant TRUNCATE on public.citas to anon;
grant REFERENCES on public.citas to anon;
grant TRIGGER on public.citas to anon;
grant INSERT on public.citas to authenticated;
grant SELECT on public.citas to authenticated;
grant UPDATE on public.citas to authenticated;
grant DELETE on public.citas to authenticated;
grant TRUNCATE on public.citas to authenticated;
grant REFERENCES on public.citas to authenticated;
grant TRIGGER on public.citas to authenticated;
grant INSERT on public.citas to service_role;
grant SELECT on public.citas to service_role;
grant UPDATE on public.citas to service_role;
grant DELETE on public.citas to service_role;
grant TRUNCATE on public.citas to service_role;
grant REFERENCES on public.citas to service_role;
grant TRIGGER on public.citas to service_role;
grant INSERT on public.notas_clinicas to anon;
grant SELECT on public.notas_clinicas to anon;
grant UPDATE on public.notas_clinicas to anon;
grant DELETE on public.notas_clinicas to anon;
grant TRUNCATE on public.notas_clinicas to anon;
grant REFERENCES on public.notas_clinicas to anon;
grant TRIGGER on public.notas_clinicas to anon;
grant INSERT on public.notas_clinicas to authenticated;
grant SELECT on public.notas_clinicas to authenticated;
grant UPDATE on public.notas_clinicas to authenticated;
grant DELETE on public.notas_clinicas to authenticated;
grant TRUNCATE on public.notas_clinicas to authenticated;
grant REFERENCES on public.notas_clinicas to authenticated;
grant TRIGGER on public.notas_clinicas to authenticated;
grant INSERT on public.notas_clinicas to service_role;
grant SELECT on public.notas_clinicas to service_role;
grant UPDATE on public.notas_clinicas to service_role;
grant DELETE on public.notas_clinicas to service_role;
grant TRUNCATE on public.notas_clinicas to service_role;
grant REFERENCES on public.notas_clinicas to service_role;
grant TRIGGER on public.notas_clinicas to service_role;
grant INSERT on public.tratamientos to anon;
grant SELECT on public.tratamientos to anon;
grant UPDATE on public.tratamientos to anon;
grant DELETE on public.tratamientos to anon;
grant TRUNCATE on public.tratamientos to anon;
grant REFERENCES on public.tratamientos to anon;
grant TRIGGER on public.tratamientos to anon;
grant INSERT on public.tratamientos to authenticated;
grant SELECT on public.tratamientos to authenticated;
grant UPDATE on public.tratamientos to authenticated;
grant DELETE on public.tratamientos to authenticated;
grant TRUNCATE on public.tratamientos to authenticated;
grant REFERENCES on public.tratamientos to authenticated;
grant TRIGGER on public.tratamientos to authenticated;
grant INSERT on public.tratamientos to service_role;
grant SELECT on public.tratamientos to service_role;
grant UPDATE on public.tratamientos to service_role;
grant DELETE on public.tratamientos to service_role;
grant TRUNCATE on public.tratamientos to service_role;
grant REFERENCES on public.tratamientos to service_role;
grant TRIGGER on public.tratamientos to service_role;
grant INSERT on public.recetas to anon;
grant SELECT on public.recetas to anon;
grant UPDATE on public.recetas to anon;
grant DELETE on public.recetas to anon;
grant TRUNCATE on public.recetas to anon;
grant REFERENCES on public.recetas to anon;
grant TRIGGER on public.recetas to anon;
grant INSERT on public.recetas to authenticated;
grant SELECT on public.recetas to authenticated;
grant UPDATE on public.recetas to authenticated;
grant DELETE on public.recetas to authenticated;
grant TRUNCATE on public.recetas to authenticated;
grant REFERENCES on public.recetas to authenticated;
grant TRIGGER on public.recetas to authenticated;
grant INSERT on public.recetas to service_role;
grant SELECT on public.recetas to service_role;
grant UPDATE on public.recetas to service_role;
grant DELETE on public.recetas to service_role;
grant TRUNCATE on public.recetas to service_role;
grant REFERENCES on public.recetas to service_role;
grant TRIGGER on public.recetas to service_role;
grant INSERT on public.ventas to anon;
grant SELECT on public.ventas to anon;
grant UPDATE on public.ventas to anon;
grant DELETE on public.ventas to anon;
grant TRUNCATE on public.ventas to anon;
grant REFERENCES on public.ventas to anon;
grant TRIGGER on public.ventas to anon;
grant INSERT on public.ventas to authenticated;
grant SELECT on public.ventas to authenticated;
grant UPDATE on public.ventas to authenticated;
grant DELETE on public.ventas to authenticated;
grant TRUNCATE on public.ventas to authenticated;
grant REFERENCES on public.ventas to authenticated;
grant TRIGGER on public.ventas to authenticated;
grant INSERT on public.ventas to service_role;
grant SELECT on public.ventas to service_role;
grant UPDATE on public.ventas to service_role;
grant DELETE on public.ventas to service_role;
grant TRUNCATE on public.ventas to service_role;
grant REFERENCES on public.ventas to service_role;
grant TRIGGER on public.ventas to service_role;
grant INSERT on public.cuentas_cobrar to anon;
grant SELECT on public.cuentas_cobrar to anon;
grant UPDATE on public.cuentas_cobrar to anon;
grant DELETE on public.cuentas_cobrar to anon;
grant TRUNCATE on public.cuentas_cobrar to anon;
grant REFERENCES on public.cuentas_cobrar to anon;
grant TRIGGER on public.cuentas_cobrar to anon;
grant INSERT on public.cuentas_cobrar to authenticated;
grant SELECT on public.cuentas_cobrar to authenticated;
grant UPDATE on public.cuentas_cobrar to authenticated;
grant DELETE on public.cuentas_cobrar to authenticated;
grant TRUNCATE on public.cuentas_cobrar to authenticated;
grant REFERENCES on public.cuentas_cobrar to authenticated;
grant TRIGGER on public.cuentas_cobrar to authenticated;
grant INSERT on public.cuentas_cobrar to service_role;
grant SELECT on public.cuentas_cobrar to service_role;
grant UPDATE on public.cuentas_cobrar to service_role;
grant DELETE on public.cuentas_cobrar to service_role;
grant TRUNCATE on public.cuentas_cobrar to service_role;
grant REFERENCES on public.cuentas_cobrar to service_role;
grant TRIGGER on public.cuentas_cobrar to service_role;
grant INSERT on public.abonos_cuentas_cobrar to anon;
grant SELECT on public.abonos_cuentas_cobrar to anon;
grant UPDATE on public.abonos_cuentas_cobrar to anon;
grant DELETE on public.abonos_cuentas_cobrar to anon;
grant TRUNCATE on public.abonos_cuentas_cobrar to anon;
grant REFERENCES on public.abonos_cuentas_cobrar to anon;
grant TRIGGER on public.abonos_cuentas_cobrar to anon;
grant INSERT on public.abonos_cuentas_cobrar to authenticated;
grant SELECT on public.abonos_cuentas_cobrar to authenticated;
grant UPDATE on public.abonos_cuentas_cobrar to authenticated;
grant DELETE on public.abonos_cuentas_cobrar to authenticated;
grant TRUNCATE on public.abonos_cuentas_cobrar to authenticated;
grant REFERENCES on public.abonos_cuentas_cobrar to authenticated;
grant TRIGGER on public.abonos_cuentas_cobrar to authenticated;
grant INSERT on public.abonos_cuentas_cobrar to service_role;
grant SELECT on public.abonos_cuentas_cobrar to service_role;
grant UPDATE on public.abonos_cuentas_cobrar to service_role;
grant DELETE on public.abonos_cuentas_cobrar to service_role;
grant TRUNCATE on public.abonos_cuentas_cobrar to service_role;
grant REFERENCES on public.abonos_cuentas_cobrar to service_role;
grant TRIGGER on public.abonos_cuentas_cobrar to service_role;
grant INSERT on public.cierres_caja to anon;
grant SELECT on public.cierres_caja to anon;
grant UPDATE on public.cierres_caja to anon;
grant DELETE on public.cierres_caja to anon;
grant TRUNCATE on public.cierres_caja to anon;
grant REFERENCES on public.cierres_caja to anon;
grant TRIGGER on public.cierres_caja to anon;
grant INSERT on public.cierres_caja to authenticated;
grant SELECT on public.cierres_caja to authenticated;
grant UPDATE on public.cierres_caja to authenticated;
grant DELETE on public.cierres_caja to authenticated;
grant TRUNCATE on public.cierres_caja to authenticated;
grant REFERENCES on public.cierres_caja to authenticated;
grant TRIGGER on public.cierres_caja to authenticated;
grant INSERT on public.cierres_caja to service_role;
grant SELECT on public.cierres_caja to service_role;
grant UPDATE on public.cierres_caja to service_role;
grant DELETE on public.cierres_caja to service_role;
grant TRUNCATE on public.cierres_caja to service_role;
grant REFERENCES on public.cierres_caja to service_role;
grant TRIGGER on public.cierres_caja to service_role;
grant INSERT on public.gastos to anon;
grant SELECT on public.gastos to anon;
grant UPDATE on public.gastos to anon;
grant DELETE on public.gastos to anon;
grant TRUNCATE on public.gastos to anon;
grant REFERENCES on public.gastos to anon;
grant TRIGGER on public.gastos to anon;
grant INSERT on public.gastos to authenticated;
grant SELECT on public.gastos to authenticated;
grant UPDATE on public.gastos to authenticated;
grant DELETE on public.gastos to authenticated;
grant TRUNCATE on public.gastos to authenticated;
grant REFERENCES on public.gastos to authenticated;
grant TRIGGER on public.gastos to authenticated;
grant INSERT on public.gastos to service_role;
grant SELECT on public.gastos to service_role;
grant UPDATE on public.gastos to service_role;
grant DELETE on public.gastos to service_role;
grant TRUNCATE on public.gastos to service_role;
grant REFERENCES on public.gastos to service_role;
grant TRIGGER on public.gastos to service_role;
grant INSERT on public.productos_inventario to anon;
grant SELECT on public.productos_inventario to anon;
grant UPDATE on public.productos_inventario to anon;
grant DELETE on public.productos_inventario to anon;
grant TRUNCATE on public.productos_inventario to anon;
grant REFERENCES on public.productos_inventario to anon;
grant TRIGGER on public.productos_inventario to anon;
grant INSERT on public.productos_inventario to authenticated;
grant SELECT on public.productos_inventario to authenticated;
grant UPDATE on public.productos_inventario to authenticated;
grant DELETE on public.productos_inventario to authenticated;
grant TRUNCATE on public.productos_inventario to authenticated;
grant REFERENCES on public.productos_inventario to authenticated;
grant TRIGGER on public.productos_inventario to authenticated;
grant INSERT on public.productos_inventario to service_role;
grant SELECT on public.productos_inventario to service_role;
grant UPDATE on public.productos_inventario to service_role;
grant DELETE on public.productos_inventario to service_role;
grant TRUNCATE on public.productos_inventario to service_role;
grant REFERENCES on public.productos_inventario to service_role;
grant TRIGGER on public.productos_inventario to service_role;
grant INSERT on public.movimientos_inventario to anon;
grant SELECT on public.movimientos_inventario to anon;
grant UPDATE on public.movimientos_inventario to anon;
grant DELETE on public.movimientos_inventario to anon;
grant TRUNCATE on public.movimientos_inventario to anon;
grant REFERENCES on public.movimientos_inventario to anon;
grant TRIGGER on public.movimientos_inventario to anon;
grant INSERT on public.movimientos_inventario to authenticated;
grant SELECT on public.movimientos_inventario to authenticated;
grant UPDATE on public.movimientos_inventario to authenticated;
grant DELETE on public.movimientos_inventario to authenticated;
grant TRUNCATE on public.movimientos_inventario to authenticated;
grant REFERENCES on public.movimientos_inventario to authenticated;
grant TRIGGER on public.movimientos_inventario to authenticated;
grant INSERT on public.movimientos_inventario to service_role;
grant SELECT on public.movimientos_inventario to service_role;
grant UPDATE on public.movimientos_inventario to service_role;
grant DELETE on public.movimientos_inventario to service_role;
grant TRUNCATE on public.movimientos_inventario to service_role;
grant REFERENCES on public.movimientos_inventario to service_role;
grant TRIGGER on public.movimientos_inventario to service_role;
grant INSERT on public.proveedores to anon;
grant SELECT on public.proveedores to anon;
grant UPDATE on public.proveedores to anon;
grant DELETE on public.proveedores to anon;
grant TRUNCATE on public.proveedores to anon;
grant REFERENCES on public.proveedores to anon;
grant TRIGGER on public.proveedores to anon;
grant INSERT on public.proveedores to authenticated;
grant SELECT on public.proveedores to authenticated;
grant UPDATE on public.proveedores to authenticated;
grant DELETE on public.proveedores to authenticated;
grant TRUNCATE on public.proveedores to authenticated;
grant REFERENCES on public.proveedores to authenticated;
grant TRIGGER on public.proveedores to authenticated;
grant INSERT on public.proveedores to service_role;
grant SELECT on public.proveedores to service_role;
grant UPDATE on public.proveedores to service_role;
grant DELETE on public.proveedores to service_role;
grant TRUNCATE on public.proveedores to service_role;
grant REFERENCES on public.proveedores to service_role;
grant TRIGGER on public.proveedores to service_role;
grant INSERT on public.compras_proveedores to anon;
grant SELECT on public.compras_proveedores to anon;
grant UPDATE on public.compras_proveedores to anon;
grant DELETE on public.compras_proveedores to anon;
grant TRUNCATE on public.compras_proveedores to anon;
grant REFERENCES on public.compras_proveedores to anon;
grant TRIGGER on public.compras_proveedores to anon;
grant INSERT on public.compras_proveedores to authenticated;
grant SELECT on public.compras_proveedores to authenticated;
grant UPDATE on public.compras_proveedores to authenticated;
grant DELETE on public.compras_proveedores to authenticated;
grant TRUNCATE on public.compras_proveedores to authenticated;
grant REFERENCES on public.compras_proveedores to authenticated;
grant TRIGGER on public.compras_proveedores to authenticated;
grant INSERT on public.compras_proveedores to service_role;
grant SELECT on public.compras_proveedores to service_role;
grant UPDATE on public.compras_proveedores to service_role;
grant DELETE on public.compras_proveedores to service_role;
grant TRUNCATE on public.compras_proveedores to service_role;
grant REFERENCES on public.compras_proveedores to service_role;
grant TRIGGER on public.compras_proveedores to service_role;
grant INSERT on public.cuentas_pagar to anon;
grant SELECT on public.cuentas_pagar to anon;
grant UPDATE on public.cuentas_pagar to anon;
grant DELETE on public.cuentas_pagar to anon;
grant TRUNCATE on public.cuentas_pagar to anon;
grant REFERENCES on public.cuentas_pagar to anon;
grant TRIGGER on public.cuentas_pagar to anon;
grant INSERT on public.cuentas_pagar to authenticated;
grant SELECT on public.cuentas_pagar to authenticated;
grant UPDATE on public.cuentas_pagar to authenticated;
grant DELETE on public.cuentas_pagar to authenticated;
grant TRUNCATE on public.cuentas_pagar to authenticated;
grant REFERENCES on public.cuentas_pagar to authenticated;
grant TRIGGER on public.cuentas_pagar to authenticated;
grant INSERT on public.cuentas_pagar to service_role;
grant SELECT on public.cuentas_pagar to service_role;
grant UPDATE on public.cuentas_pagar to service_role;
grant DELETE on public.cuentas_pagar to service_role;
grant TRUNCATE on public.cuentas_pagar to service_role;
grant REFERENCES on public.cuentas_pagar to service_role;
grant TRIGGER on public.cuentas_pagar to service_role;
grant INSERT on public.abonos_cuentas_pagar to anon;
grant SELECT on public.abonos_cuentas_pagar to anon;
grant UPDATE on public.abonos_cuentas_pagar to anon;
grant DELETE on public.abonos_cuentas_pagar to anon;
grant TRUNCATE on public.abonos_cuentas_pagar to anon;
grant REFERENCES on public.abonos_cuentas_pagar to anon;
grant TRIGGER on public.abonos_cuentas_pagar to anon;
grant INSERT on public.abonos_cuentas_pagar to authenticated;
grant SELECT on public.abonos_cuentas_pagar to authenticated;
grant UPDATE on public.abonos_cuentas_pagar to authenticated;
grant DELETE on public.abonos_cuentas_pagar to authenticated;
grant TRUNCATE on public.abonos_cuentas_pagar to authenticated;
grant REFERENCES on public.abonos_cuentas_pagar to authenticated;
grant TRIGGER on public.abonos_cuentas_pagar to authenticated;
grant INSERT on public.abonos_cuentas_pagar to service_role;
grant SELECT on public.abonos_cuentas_pagar to service_role;
grant UPDATE on public.abonos_cuentas_pagar to service_role;
grant DELETE on public.abonos_cuentas_pagar to service_role;
grant TRUNCATE on public.abonos_cuentas_pagar to service_role;
grant REFERENCES on public.abonos_cuentas_pagar to service_role;
grant TRIGGER on public.abonos_cuentas_pagar to service_role;
grant INSERT on public.odontogramas to anon;
grant SELECT on public.odontogramas to anon;
grant UPDATE on public.odontogramas to anon;
grant DELETE on public.odontogramas to anon;
grant TRUNCATE on public.odontogramas to anon;
grant REFERENCES on public.odontogramas to anon;
grant TRIGGER on public.odontogramas to anon;
grant INSERT on public.odontogramas to authenticated;
grant SELECT on public.odontogramas to authenticated;
grant UPDATE on public.odontogramas to authenticated;
grant DELETE on public.odontogramas to authenticated;
grant TRUNCATE on public.odontogramas to authenticated;
grant REFERENCES on public.odontogramas to authenticated;
grant TRIGGER on public.odontogramas to authenticated;
grant INSERT on public.odontogramas to service_role;
grant SELECT on public.odontogramas to service_role;
grant UPDATE on public.odontogramas to service_role;
grant DELETE on public.odontogramas to service_role;
grant TRUNCATE on public.odontogramas to service_role;
grant REFERENCES on public.odontogramas to service_role;
grant TRIGGER on public.odontogramas to service_role;
grant INSERT on public.odontograma_piezas to anon;
grant SELECT on public.odontograma_piezas to anon;
grant UPDATE on public.odontograma_piezas to anon;
grant DELETE on public.odontograma_piezas to anon;
grant TRUNCATE on public.odontograma_piezas to anon;
grant REFERENCES on public.odontograma_piezas to anon;
grant TRIGGER on public.odontograma_piezas to anon;
grant INSERT on public.odontograma_piezas to authenticated;
grant SELECT on public.odontograma_piezas to authenticated;
grant UPDATE on public.odontograma_piezas to authenticated;
grant DELETE on public.odontograma_piezas to authenticated;
grant TRUNCATE on public.odontograma_piezas to authenticated;
grant REFERENCES on public.odontograma_piezas to authenticated;
grant TRIGGER on public.odontograma_piezas to authenticated;
grant INSERT on public.odontograma_piezas to service_role;
grant SELECT on public.odontograma_piezas to service_role;
grant UPDATE on public.odontograma_piezas to service_role;
grant DELETE on public.odontograma_piezas to service_role;
grant TRUNCATE on public.odontograma_piezas to service_role;
grant REFERENCES on public.odontograma_piezas to service_role;
grant TRIGGER on public.odontograma_piezas to service_role;
grant INSERT on public.odontograma_historial to anon;
grant SELECT on public.odontograma_historial to anon;
grant UPDATE on public.odontograma_historial to anon;
grant DELETE on public.odontograma_historial to anon;
grant TRUNCATE on public.odontograma_historial to anon;
grant REFERENCES on public.odontograma_historial to anon;
grant TRIGGER on public.odontograma_historial to anon;
grant INSERT on public.odontograma_historial to authenticated;
grant SELECT on public.odontograma_historial to authenticated;
grant UPDATE on public.odontograma_historial to authenticated;
grant DELETE on public.odontograma_historial to authenticated;
grant TRUNCATE on public.odontograma_historial to authenticated;
grant REFERENCES on public.odontograma_historial to authenticated;
grant TRIGGER on public.odontograma_historial to authenticated;
grant INSERT on public.odontograma_historial to service_role;
grant SELECT on public.odontograma_historial to service_role;
grant UPDATE on public.odontograma_historial to service_role;
grant DELETE on public.odontograma_historial to service_role;
grant TRUNCATE on public.odontograma_historial to service_role;
grant REFERENCES on public.odontograma_historial to service_role;
grant TRIGGER on public.odontograma_historial to service_role;
grant INSERT on public.configuraciones_clinicas to anon;
grant SELECT on public.configuraciones_clinicas to anon;
grant UPDATE on public.configuraciones_clinicas to anon;
grant DELETE on public.configuraciones_clinicas to anon;
grant TRUNCATE on public.configuraciones_clinicas to anon;
grant REFERENCES on public.configuraciones_clinicas to anon;
grant TRIGGER on public.configuraciones_clinicas to anon;
grant INSERT on public.configuraciones_clinicas to authenticated;
grant SELECT on public.configuraciones_clinicas to authenticated;
grant UPDATE on public.configuraciones_clinicas to authenticated;
grant DELETE on public.configuraciones_clinicas to authenticated;
grant TRUNCATE on public.configuraciones_clinicas to authenticated;
grant REFERENCES on public.configuraciones_clinicas to authenticated;
grant TRIGGER on public.configuraciones_clinicas to authenticated;
grant INSERT on public.configuraciones_clinicas to service_role;
grant SELECT on public.configuraciones_clinicas to service_role;
grant UPDATE on public.configuraciones_clinicas to service_role;
grant DELETE on public.configuraciones_clinicas to service_role;
grant TRUNCATE on public.configuraciones_clinicas to service_role;
grant REFERENCES on public.configuraciones_clinicas to service_role;
grant TRIGGER on public.configuraciones_clinicas to service_role;
grant INSERT on public.pos_clinica to anon;
grant SELECT on public.pos_clinica to anon;
grant UPDATE on public.pos_clinica to anon;
grant DELETE on public.pos_clinica to anon;
grant TRUNCATE on public.pos_clinica to anon;
grant REFERENCES on public.pos_clinica to anon;
grant TRIGGER on public.pos_clinica to anon;
grant INSERT on public.pos_clinica to authenticated;
grant SELECT on public.pos_clinica to authenticated;
grant UPDATE on public.pos_clinica to authenticated;
grant DELETE on public.pos_clinica to authenticated;
grant TRUNCATE on public.pos_clinica to authenticated;
grant REFERENCES on public.pos_clinica to authenticated;
grant TRIGGER on public.pos_clinica to authenticated;
grant INSERT on public.pos_clinica to service_role;
grant SELECT on public.pos_clinica to service_role;
grant UPDATE on public.pos_clinica to service_role;
grant DELETE on public.pos_clinica to service_role;
grant TRUNCATE on public.pos_clinica to service_role;
grant REFERENCES on public.pos_clinica to service_role;
grant TRIGGER on public.pos_clinica to service_role;
grant INSERT on public.presupuestos to anon;
grant SELECT on public.presupuestos to anon;
grant UPDATE on public.presupuestos to anon;
grant DELETE on public.presupuestos to anon;
grant TRUNCATE on public.presupuestos to anon;
grant REFERENCES on public.presupuestos to anon;
grant TRIGGER on public.presupuestos to anon;
grant INSERT on public.presupuestos to authenticated;
grant SELECT on public.presupuestos to authenticated;
grant UPDATE on public.presupuestos to authenticated;
grant DELETE on public.presupuestos to authenticated;
grant TRUNCATE on public.presupuestos to authenticated;
grant REFERENCES on public.presupuestos to authenticated;
grant TRIGGER on public.presupuestos to authenticated;
grant INSERT on public.presupuestos to service_role;
grant SELECT on public.presupuestos to service_role;
grant UPDATE on public.presupuestos to service_role;
grant DELETE on public.presupuestos to service_role;
grant TRUNCATE on public.presupuestos to service_role;
grant REFERENCES on public.presupuestos to service_role;
grant TRIGGER on public.presupuestos to service_role;
grant INSERT on public.presupuesto_items to anon;
grant SELECT on public.presupuesto_items to anon;
grant UPDATE on public.presupuesto_items to anon;
grant DELETE on public.presupuesto_items to anon;
grant TRUNCATE on public.presupuesto_items to anon;
grant REFERENCES on public.presupuesto_items to anon;
grant TRIGGER on public.presupuesto_items to anon;
grant INSERT on public.presupuesto_items to authenticated;
grant SELECT on public.presupuesto_items to authenticated;
grant UPDATE on public.presupuesto_items to authenticated;
grant DELETE on public.presupuesto_items to authenticated;
grant TRUNCATE on public.presupuesto_items to authenticated;
grant REFERENCES on public.presupuesto_items to authenticated;
grant TRIGGER on public.presupuesto_items to authenticated;
grant INSERT on public.presupuesto_items to service_role;
grant SELECT on public.presupuesto_items to service_role;
grant UPDATE on public.presupuesto_items to service_role;
grant DELETE on public.presupuesto_items to service_role;
grant TRUNCATE on public.presupuesto_items to service_role;
grant REFERENCES on public.presupuesto_items to service_role;
grant TRIGGER on public.presupuesto_items to service_role;
grant INSERT on public.ordenes_estudio to anon;
grant SELECT on public.ordenes_estudio to anon;
grant UPDATE on public.ordenes_estudio to anon;
grant DELETE on public.ordenes_estudio to anon;
grant TRUNCATE on public.ordenes_estudio to anon;
grant REFERENCES on public.ordenes_estudio to anon;
grant TRIGGER on public.ordenes_estudio to anon;
grant INSERT on public.ordenes_estudio to authenticated;
grant SELECT on public.ordenes_estudio to authenticated;
grant UPDATE on public.ordenes_estudio to authenticated;
grant DELETE on public.ordenes_estudio to authenticated;
grant TRUNCATE on public.ordenes_estudio to authenticated;
grant REFERENCES on public.ordenes_estudio to authenticated;
grant TRIGGER on public.ordenes_estudio to authenticated;
grant INSERT on public.ordenes_estudio to service_role;
grant SELECT on public.ordenes_estudio to service_role;
grant UPDATE on public.ordenes_estudio to service_role;
grant DELETE on public.ordenes_estudio to service_role;
grant TRUNCATE on public.ordenes_estudio to service_role;
grant REFERENCES on public.ordenes_estudio to service_role;
grant TRIGGER on public.ordenes_estudio to service_role;
grant INSERT on public.respaldos_historial to anon;
grant SELECT on public.respaldos_historial to anon;
grant UPDATE on public.respaldos_historial to anon;
grant DELETE on public.respaldos_historial to anon;
grant TRUNCATE on public.respaldos_historial to anon;
grant REFERENCES on public.respaldos_historial to anon;
grant TRIGGER on public.respaldos_historial to anon;
grant INSERT on public.respaldos_historial to authenticated;
grant SELECT on public.respaldos_historial to authenticated;
grant UPDATE on public.respaldos_historial to authenticated;
grant DELETE on public.respaldos_historial to authenticated;
grant TRUNCATE on public.respaldos_historial to authenticated;
grant REFERENCES on public.respaldos_historial to authenticated;
grant TRIGGER on public.respaldos_historial to authenticated;
grant INSERT on public.respaldos_historial to service_role;
grant SELECT on public.respaldos_historial to service_role;
grant UPDATE on public.respaldos_historial to service_role;
grant DELETE on public.respaldos_historial to service_role;
grant TRUNCATE on public.respaldos_historial to service_role;
grant REFERENCES on public.respaldos_historial to service_role;
grant TRIGGER on public.respaldos_historial to service_role;
grant INSERT on public.documentos_pacientes to anon;
grant SELECT on public.documentos_pacientes to anon;
grant UPDATE on public.documentos_pacientes to anon;
grant DELETE on public.documentos_pacientes to anon;
grant TRUNCATE on public.documentos_pacientes to anon;
grant REFERENCES on public.documentos_pacientes to anon;
grant TRIGGER on public.documentos_pacientes to anon;
grant INSERT on public.documentos_pacientes to authenticated;
grant SELECT on public.documentos_pacientes to authenticated;
grant UPDATE on public.documentos_pacientes to authenticated;
grant DELETE on public.documentos_pacientes to authenticated;
grant TRUNCATE on public.documentos_pacientes to authenticated;
grant REFERENCES on public.documentos_pacientes to authenticated;
grant TRIGGER on public.documentos_pacientes to authenticated;
grant INSERT on public.documentos_pacientes to service_role;
grant SELECT on public.documentos_pacientes to service_role;
grant UPDATE on public.documentos_pacientes to service_role;
grant DELETE on public.documentos_pacientes to service_role;
grant TRUNCATE on public.documentos_pacientes to service_role;
grant REFERENCES on public.documentos_pacientes to service_role;
grant TRIGGER on public.documentos_pacientes to service_role;
grant execute on all functions in schema public,clinica_privada to authenticated,service_role;
revoke all on all functions in schema clinica_privada from public,anon;
revoke all on function public.verificar_acceso_clinica() from public,anon;
set check_function_bodies=true;
