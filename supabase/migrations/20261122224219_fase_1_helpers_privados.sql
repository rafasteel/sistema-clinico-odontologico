-- Retirar funciones SECURITY DEFINER del esquema expuesto.
-- ALTER ... SET SCHEMA conserva sus OID y las dependencias de las politicas.
alter function public.es_super_admin() set schema clinica_privada;
alter function clinica_privada.es_super_admin() set search_path = '';
revoke all on function clinica_privada.es_super_admin() from public, anon;
grant execute on function clinica_privada.es_super_admin() to authenticated, service_role;
create function public.es_super_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$ select clinica_privada.es_super_admin(); $$;
revoke all on function public.es_super_admin() from public, anon;
grant execute on function public.es_super_admin() to authenticated, service_role;
alter function public.es_admin_clinica() set schema clinica_privada;
alter function clinica_privada.es_admin_clinica() set search_path = '';
revoke all on function clinica_privada.es_admin_clinica() from public, anon;
grant execute on function clinica_privada.es_admin_clinica() to authenticated, service_role;
create function public.es_admin_clinica() returns boolean
language sql stable security invoker set search_path = ''
as $$ select clinica_privada.es_admin_clinica(); $$;
revoke all on function public.es_admin_clinica() from public, anon;
grant execute on function public.es_admin_clinica() to authenticated, service_role;
alter function public.mi_clinica_id() set schema clinica_privada;
alter function clinica_privada.mi_clinica_id() set search_path = '';
revoke all on function clinica_privada.mi_clinica_id() from public, anon;
grant execute on function clinica_privada.mi_clinica_id() to authenticated, service_role;
create function public.mi_clinica_id() returns uuid
language sql stable security invoker set search_path = ''
as $$ select clinica_privada.mi_clinica_id(); $$;
revoke all on function public.mi_clinica_id() from public, anon;
grant execute on function public.mi_clinica_id() to authenticated, service_role;
alter function public.mi_perfil_id() set schema clinica_privada;
alter function clinica_privada.mi_perfil_id() set search_path = '';
revoke all on function clinica_privada.mi_perfil_id() from public, anon;
grant execute on function clinica_privada.mi_perfil_id() to authenticated, service_role;
create function public.mi_perfil_id() returns uuid
language sql stable security invoker set search_path = ''
as $$ select clinica_privada.mi_perfil_id(); $$;
revoke all on function public.mi_perfil_id() from public, anon;
grant execute on function public.mi_perfil_id() to authenticated, service_role;
alter function public.mi_rol() set schema clinica_privada;
alter function clinica_privada.mi_rol() set search_path = '';
revoke all on function clinica_privada.mi_rol() from public, anon;
grant execute on function clinica_privada.mi_rol() to authenticated, service_role;
create function public.mi_rol() returns public.rol_usuario_sistema
language sql stable security invoker set search_path = ''
as $$ select clinica_privada.mi_rol(); $$;
revoke all on function public.mi_rol() from public, anon;
grant execute on function public.mi_rol() to authenticated, service_role;
alter function public.actualizar_columna_actualizada_en() set search_path = '';
