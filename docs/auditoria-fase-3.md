# Auditoría: fase 3 — Coherencia financiera y cierres

Implementada el 23 de noviembre de 2026. Alcance: **A04, A05 y A12**. Las dos migraciones están aplicadas en Supabase `ghjultubbavmgykomnye`.

## Abonos y saldos

Anular un abono revierte en una transacción su comprobante de Caja y el importe abonado en la cuenta, restaura el saldo y recalcula el estado pendiente, parcial o vencido. Repetir la solicitud no vuelve a modificar el saldo. La acción está disponible en Cuentas por cobrar y desde la anulación del comprobante en Caja.

Una venta con abonos activos exige anular primero esos abonos. Anular una cuenta vinculada sigue las reglas de su venta de origen. Los recibos anulados se identifican como tales; el historial conserva sus registros. El reporte de créditos incluye el pago inicial en el importe abonado y los recibos reconstruyen los saldos considerando ese pago.

## Ventas y cobros

Los abonos cobran una deuda existente y no generan otra venta. Una venta de C$100 con C$40 iniciales y un abono posterior de C$40 conserva ventas brutas de C$100 y acumula C$80 cobrados. Los comprobantes anulados no participan en los totales activos.

Caja, Dashboard, Reportes, exportaciones, búsqueda y el expediente del paciente separan estos conceptos. Las distribuciones de cobros muestran efectivo, tarjeta y transferencia; el crédito generado se informa por separado. El Excel diferencia venta nueva y abono cobrado. Los cálculos compartidos del cliente suman centavos enteros.

## Cierres y períodos protegidos

El servidor calcula la instantánea del cierre desde los movimientos vigentes. Ignora los totales y estados propuestos por el navegador y rechaza fechas futuras. La interfaz envía una huella del resumen consultado: si los movimientos cambiaron, exige actualizarlo antes de cerrar. Recargar también actualiza ese resumen y descarta respuestas de cargas anteriores.

Las diferencias se evalúan por canal: un faltante de efectivo y un sobrante equivalente de tarjeta siguen siendo diferencias. El resumen distingue ventas nuevas, abonos y cobros totales. La impresión usa la instantánea guardada del cierre elegido, incluidos sus valores cero.

Los triggers impiden crear, editar, anular, eliminar o trasladar ventas, gastos y compras que afecten una fecha cerrada. Comprueban tanto la fecha anterior como la nueva. Es posible cobrar hoy una deuda originada en una fecha cerrada: el movimiento nuevo afecta el día del cobro. Las operaciones reutilizan el bloqueo transaccional por clínica de fase 2.

Se eligió la reapertura con historial. Solo un ADMIN activo puede reabrir, indicando un motivo obligatorio. El cierre anterior conserva sus importes y registra quién lo reabrió y cuándo; un cierre posterior crea otra fila. No se permite borrar o modificar su instantánea. Los reintentos conservan la idempotencia y las operaciones generan auditoría. Los gastos vinculados a compras o abonos de proveedor se gestionan desde Proveedores.

Los cierres históricos mantienen sus importes y versión 1; no se recalcularon. Los nuevos usan versión 2. La impresión identifica los históricos que no tienen desglose de abonos. No se corrigieron automáticamente datos históricos ambiguos.

## Migraciones aplicadas

1. `20261124010453_fase_3_coherencia_financiera.sql`
2. `20261124011213_fase_3_validacion_solicitud.sql`

Las versiones coinciden con el historial remoto y usan fecha UTC. La segunda migración rechaza operaciones nulas antes de consultar solicitudes anteriores, manteniendo la autorización de los reintentos. El ejecutor anterior queda sin permisos de ejecución para los roles del API; el resumen público consulta únicamente la clínica autorizada y conserva RLS.

Aplicar ambas migraciones y actualizar el cliente de forma coordinada en otros entornos. Los clientes anteriores que escriben gastos o cierres directamente recibirán errores de permisos. No volver a aplicar estas migraciones al proyecto actual.

## Validación

| Verificación | Resultado |
|---|---|
| `npm run test:integridad` | 76 pruebas aprobadas: transacciones, reintentos, saldos, cierres y resúmenes |
| `npm run test:seguridad` | 26 pruebas aprobadas |
| `supabase/tests/fase_3_finanzas.sql` en Supabase | 30 comprobaciones aprobadas |
| Regresión SQL de fases 1 y 2 en Supabase | 93 y 35 comprobaciones aprobadas |
| TypeScript y compilación de producción | Correctos |
| Navegador | Separación de ventas/abonos, diferencias del conteo, reportes e inicio/cierre de sesión verificados |
| ESLint global | Deuda previa sin incremento: 62 errores y 33 advertencias |

Las pruebas SQL remotas usan transacciones con rollback. Se verificó la eliminación de sus datos temporales y la conservación del cierre existente. La revisión previa no encontró comprobantes duplicados ni abonos activos vinculados a ventas o cuentas anuladas. La comprobación en navegador no registró movimientos financieros.

Los avisos del asesor de Supabase no cambiaron: tabla privada de solicitudes con RLS sin políticas intencionalmente y aviso previo de Auth sobre contraseñas filtradas desactivadas. Las fases posteriores y el despliegue del sitio quedan fuera de esta fase.
