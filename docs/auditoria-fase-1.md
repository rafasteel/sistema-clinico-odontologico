# Auditoría: fase 1 — Seguridad y permisos

Implementada el 22 de noviembre de 2026. Alcance: A01, A06, A07 y A08 del plan acordado. Cambios aplicados en el proyecto Supabase `ghjultubbavmgykomnye`; código de aplicación actualizado en esta copia local.

## Comportamiento resultante

- **A01 — Autorización:** los clientes autenticados solo pueden consultar `usuarios_perfiles`. Crear o modificar perfiles exige la API del servidor, que verifica el token con Auth, el perfil ADMIN activo, su clínica y su licencia antes de escribir con la clave de servicio. No permite asignar `SUPER_ADMIN`, elegir usuarios de otra clínica ni desactivar o degradar el propio administrador. Los campos de autorización se leen del perfil en la base; `user_metadata` no concede permisos. Las nuevas contraseñas temporales usan aleatoriedad criptográfica.
- **A06 — Licencias:** `verificar_acceso_clinica()` concentra el criterio usado por el navegador, la API de administración, RLS y Storage. Evalúa la fecha en `America/Guatemala`, la última suscripción (orden por fecha de creación e ID), su vencimiento y sus días de gracia. El día de vencimiento y el último día de gracia son inclusivos; cero días de gracia sigue siendo cero. `Suspendida` y `Cancelada` bloquean inmediatamente. `Activa`, `Vencida` y `Restringida` bloquean al superar la gracia. Dentro de ese período, `Vencida` y `Restringida` conservan el aviso y acceso previsto por el sistema. Un perfil inactivo tampoco tiene acceso. SUPER_ADMIN activo conserva la gestión global.
- **A07 — Separación entre clínicas:** 40 claves foráneas compuestas verifican `(referencia_id, clinica_id)` incluso si escribe un proceso con privilegios. Se mantienen las acciones originales de borrado de las relaciones de negocio. Los documentos deben apuntar al bucket privado y a una ruta que corresponda a su clínica y paciente.
- **A08 — Auditoría:** el trigger obtiene autor, nombre, rol y fechas desde la sesión; ignora esos valores si los proporciona el navegador. Las escrituras del servidor requieren un perfil activo identificado. ADMIN ve su clínica y SUPER_ADMIN tiene lectura global. Los eventos no se pueden editar, eliminar ni truncar mediante los roles de aplicación, incluida la clave de servicio. Triggers y referencias restrictivas evitan alterar o destruir el historial al eliminar una clínica o su autor. Los registros históricos existentes se conservan sin reescribir su autoría.

Las políticas de licencia son restrictivas: se suman a los permisos por rol existentes. No amplían los permisos funcionales de DOCTOR, RECEPCIÓN o CAJA. El perfil propio y los datos de licencia siguen disponibles para explicar un bloqueo. Las funciones que necesitan `SECURITY DEFINER` están en el esquema no expuesto `clinica_privada`, con `search_path` fijo, identidad tomada de `auth.uid()` y ejecución revocada a anónimos.

La autoría verificada identifica al usuario que envía un evento; los detalles funcionales que envía el cliente siguen siendo datos declarados por ese usuario. Esta fase no convierte todos los procesos de negocio en transacciones ni registra automáticamente cada cambio de todas las tablas; eso queda fuera de su alcance.

## Migraciones

1. `supabase/migrations/20261122224059_fase_1_seguridad_permisos.sql`
2. `supabase/migrations/20261122224219_fase_1_helpers_privados.sql`

Ambas están aplicadas y sus versiones coinciden con el historial remoto. Son migraciones incrementales sobre el esquema existente del sistema, no un esquema inicial para una base vacía. No se deben ejecutar de nuevo sobre este proyecto. Para otro entorno con el mismo esquema original, aplicar ambas en orden antes de iniciar esta versión de la aplicación.

## Validación realizada

| Verificación | Resultado |
|---|---|
| `npm run build` | Correcta; compilación, TypeScript y generación de páginas |
| `npm run test:seguridad` | 26 pruebas del handler real con proveedores aislados |
| `supabase/tests/fase_1_seguridad.sql` | 93 comprobaciones en Supabase, con `ROLLBACK` |
| HTTP local y sesión Auth real de prueba | 16 comprobaciones correctas, sin cambiar datos de negocio |
| ESLint sobre archivos modificados y pruebas nuevas | Sin errores ni advertencias |
| Integridad previa y posterior | Cero cruces en las 40 relaciones; restricciones validadas |
| Limpieza de pruebas | Cero clínicas o usuarios de fixture restantes |
| Asesor de seguridad de Supabase | Sin avisos de funciones expuestas ni `search_path` mutable |

Las pruebas HTTP comprobaron que las siete rutas de administración rechazan solicitudes sin sesión, que un token inválido se rechaza, que ADMIN no crea clínicas ni se convierte en SUPER_ADMIN y que el perfil real mantiene su rol, estado y clínica. La cuenta y su contraseña no se guardaron en el código.

Para repetir las comprobaciones SQL, ejecutar **el archivo completo** como `postgres` en el SQL Editor, después de aplicar las migraciones. Crea fixtures temporales dentro de una transacción, comprueba denegaciones y operaciones legítimas, muestra el total y revierte todo. No ejecutar fragmentos sin el `ROLLBACK` final. Las pruebas de API aisladas se ejecutan con `npm run test:seguridad` y no requieren credenciales.

## Pendientes fuera de esta fase

El lint general del repositorio tiene errores anteriores en páginas que no fueron modificadas aquí (principalmente efectos de React y tipos). La compilación sí pasa y el lint de los archivos de esta fase queda limpio.

El asesor de Supabase conserva un aviso de configuración Auth: la comprobación de contraseñas filtradas está desactivada. No se modificó esa configuración global ni las credenciales existentes.

El código local no se ha publicado a un hosting. Las fases siguientes del plan —transacciones, integridad financiera, funcionalidad por rol, agenda y respaldos— no están incluidas en este cambio.
