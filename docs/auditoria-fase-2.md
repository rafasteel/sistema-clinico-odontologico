# Auditoría: fase 2 — Integridad de datos

Implementada el 23 de noviembre de 2026. Alcance acordado: **A02, A03 y A10**. Las migraciones están aplicadas en Supabase `ghjultubbavmgykomnye`; la aplicación está actualizada en esta copia local.

## Operaciones completas

`ejecutar_operacion_clinica()` confirma cada operación en una sola transacción. Si falla una escritura, también se revierten sus escrituras anteriores y el registro del identificador de solicitud.

| Operación | Escrituras coordinadas |
|---|---|
| Registrar venta | Venta, cuenta de crédito, estado de cita y salida de inventario cuando corresponde |
| Registrar abono de paciente | Comprobante en Caja, abono y nuevo saldo de la cuenta |
| Registrar compra | Compra, entrada de inventario, costo/proveedor del producto, gasto inicial y deuda |
| Abonar a proveedor | Gasto, abono y nuevo saldo de la cuenta por pagar |
| Anular venta | Estado de venta, cuenta relacionada, cita y reposición única de inventario |
| Anular compra | Reversión de inventario y estados de compra, cuenta, abonos y gastos vinculados |
| Crear o editar producto | Producto y movimiento de stock inicial o ajuste |
| Mover inventario | Lectura bloqueada del stock actual, actualización y movimiento |
| Crear presupuesto | Cabecera, cálculos e ítems |
| Convertir presupuesto | Venta, cuenta y vínculos del presupuesto; no vuelve a convertirlo |
| Guardar odontograma | Piezas, nuevos eventos y versión del expediente |

Los auxiliares de finanzas, inventario, proveedores, presupuestos y odontograma llaman estas funciones. Caja dejó de guardar la venta, cambiar la cita y descontar stock en solicitudes independientes. Se revocaron las escrituras directas de los roles del navegador sobre las 13 tablas involucradas, para impedir que se omitan las transacciones.

## Concurrencia y reintentos

- Cada solicitud lleva un UUID. La respuesta confirmada se guarda en `clinica_privada.solicitudes_operacion`, asociada a clínica, perfil, operación y payload. Un reintento devuelve los mismos registros; reutilizar el UUID con datos distintos se rechaza.
- El cliente comparte solicitudes simultáneas idénticas. Si se pierde la respuesta, conserva el UUID en memoria y `sessionStorage`, incluso al recargar esa pestaña. Una respuesta confirmada permite un nuevo pago intencional con datos iguales. Los pendientes se separan por usuario.
- Las escrituras se serializan por clínica mediante un bloqueo transaccional breve. Cuentas, productos y demás registros afectados también se bloquean con `FOR UPDATE`. Así se evita calcular dos saldos o dos existencias desde una lectura vieja. Otras clínicas pueden escribir en paralelo.
- Una cita tiene como máximo una venta activa, incluso cuando parte del cobro queda a crédito. Los pagos posteriores usan abonos. Una venta anulada permite volver a cobrar la cita.
- Las reposiciones de inventario tienen un vínculo único con la salida original; repetir una anulación no aumenta nuevamente el stock.
- Editar un producto requiere la versión temporal con la que se abrió su formulario. Si hubo un movimiento posterior, se exige actualizar la lista.

## Historial odontológico

Las piezas se actualizan con `UPSERT`, conservando sus identificadores. No se borra ni se reconstruye el historial: solo se agregan los eventos que todavía no existen. Los eventos nuevos usan identificadores UUID y autor verificado. Un trigger impide editar, borrar o truncar los eventos ya guardados, incluso desde procesos privilegiados de aplicación.

El expediente tiene una versión entera. Guardar una versión anterior produce un conflicto HTTP 409 (`PT409`), sin cambiar piezas ni historial. La interfaz muestra que está guardando, evita solicitudes superpuestas y solo actualiza el odontograma mostrado después de confirmar el guardado. La lectura reúne piezas e historial en una misma instantánea y conserva más de 200 eventos.

La protección del historial también impide borrar físicamente un paciente o clínica si ese borrado destruiría eventos clínicos. Una corrección debe agregarse como otro evento; este cambio no reescribe el historial anterior.

## Validaciones y permisos

Los cálculos se hacen en PostgreSQL con `numeric` y centavos: pagos más crédito deben coincidir exactamente con el total; los abonos deben coincidir con sus componentes y no superar el saldo; las cuentas conservan `total = abonado + saldo` mientras no estén anuladas. Compras, presupuestos e ítems verifican sus cálculos. Importes no finitos, negativos donde no corresponden y comisiones fuera de 0–100 se rechazan mediante funciones y restricciones permanentes.

La comisión, nombre y banco del POS se consultan desde la configuración de la clínica. No se acepta una comisión manipulada o desactualizada enviada por el navegador.

Los RPC públicos usan `SECURITY INVOKER`. El despachador privado es el único auxiliar de fase 2 con `SECURITY DEFINER`: exige `auth.uid()`, perfil activo, clínica, licencia vigente y rol permitido antes de escribir. Los demás auxiliares no son ejecutables por los roles del API. Se conservan los permisos funcionales anteriores; las diferencias de interfaz por rol corresponden a fase 4.

El asesor de Supabase muestra una nota informativa por la tabla privada de solicitudes con RLS y sin políticas: es intencional, no tiene permisos de acceso para los roles del API. Solo el despachador autorizado la utiliza. Continúa el aviso previo de Auth sobre contraseñas filtradas desactivadas.

## Migraciones aplicadas

1. `20261124003536_fase_2_integridad_transacciones.sql`
2. `20261124004018_fase_2_conflictos_version.sql`
3. `20261124004329_fase_2_cita_cobro_unico.sql`

Los nombres usan la marca UTC del historial remoto. Sus versiones coinciden con Supabase. Son incrementales sobre la fase 1 y el esquema original del sistema; no se deben volver a aplicar al proyecto actual.

Para otro entorno, aplicar las migraciones y actualizar el cliente de forma coordinada. Los clientes antiguos que escriben directamente en esas tablas recibirán un error de permisos hasta actualizarse. El esquema previo para pruebas locales está en `tests/fixtures/esquema-antes-fase2.sql`: contiene estructura, funciones y políticas, **sin datos de pacientes ni credenciales**, y no se debe ejecutar en producción.

## Validación

| Verificación | Resultado |
|---|---|
| `npm run build` | Compilación, TypeScript y generación de páginas correctos |
| `npm run test:integridad` | 50 pruebas: 41 con PostgreSQL local PGlite y 9 del cliente de reintentos |
| `npm run test:seguridad` | 26 pruebas de administración de usuarios correctas |
| `supabase/tests/fase_2_integridad.sql` | 35 comprobaciones sobre Supabase, con `ROLLBACK` |
| Regresión `supabase/tests/fase_1_seguridad.sql` | 93 comprobaciones correctas, con `ROLLBACK` |
| Concurrencia real por PostgREST | Los cinco escenarios siguientes, correctos |
| ESLint | Sin errores en auxiliares nuevos/modificados y pruebas; el repositorio mantiene sus 62 errores y 33 advertencias previos |

Las pruebas reales simultáneas comprobaron:

1. Dos ventas de siete unidades con stock de diez: una confirma, otra se rechaza; stock final tres.
2. Dos abonos de cincuenta con saldo de setenta: uno confirma, otro se rechaza; saldo final veinte.
3. Seis solicitudes simultáneas con el mismo identificador: una venta y la misma respuesta para todas.
4. Dos guardados del odontograma desde versión cero: uno confirma y el otro recibe HTTP 409.
5. Dos conversiones del mismo presupuesto: una venta y una cuenta; ambas respuestas comparten sus identificadores.

Se usaron una clínica y un usuario aislados para estas pruebas; ambos y sus registros financieros se eliminaron al terminar. No se modificaron datos de negocio existentes. Los datos de los ensayos SQL se revirtieron y se verificó que no quedaron fixtures. Las pruebas locales incluyen fallos inyectados después de modificar stock o crear comprobantes, comprobando que no sobreviven operaciones parciales, y la conservación de 206 eventos clínicos.

Para repetir pruebas locales:

```bash
npm ci
npm run test:integridad
npm run test:seguridad
npm run build
```

Para repetir los ensayos SQL, ejecutar cada archivo **completo** como `postgres`, incluyendo el `ROLLBACK` final. No requieren credenciales dentro del código.

## Alcance restante

La fase 3 sigue pendiente: reversión financiera de ventas que representan abonos, separación de ventas y cobros en indicadores, y reglas sobre períodos de caja cerrados. Esta fase hace atómicas las escrituras actuales, pero no redefine esos criterios financieros.

El registro de solicitudes no tiene purga automática: conservarlo permite reconocer reintentos antiguos. Su política de conservación y el rendimiento con historiales grandes se podrán revisar en la fase de respaldo y rendimiento. No se ha publicado esta versión de la aplicación en un hosting.
