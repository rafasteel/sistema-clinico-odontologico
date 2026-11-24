import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const fuente=readFileSync(new URL("../src/lib/resumenFinanciero.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(fuente,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {resumirVentas,calcularSaldosAbono}=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));
const venta={tipoCobro:"Venta",estado:"Parcial",total:100,efectivo:40,credito:60};
const abono={tipoCobro:"Abono a cuenta",estado:"Pagada",total:40,efectivo:40,credito:0};
test("100 vendidos y un abono de 40 no se convierten en 140 vendidos",()=>{
    const r=resumirVentas([venta,abono]);assert.equal(r.ventasBrutas,100);assert.equal(r.totalCobrado,80);assert.equal(r.abonosCobrados,40);assert.equal(r.creditoGenerado,60);
    assert.equal(r.ventasCantidad,1);assert.equal(r.cobrosCantidad,2);
});
test("Un día que solo tiene abonos muestra cobros sin ventas nuevas",()=>{
    const r=resumirVentas([abono]);assert.equal(r.ventasBrutas,0);assert.equal(r.totalCobrado,40);assert.equal(r.ventasCantidad,0);
});
test("La anulación elimina el cobro de los indicadores",()=>{
    const r=resumirVentas([venta,{...abono,estado:"Anulada"}]);assert.equal(r.totalCobrado,40);assert.equal(r.abonosCobrados,0);
});
test("Entrada Supabase y entrada de UI usan el mismo criterio",()=>{
    assert.equal(resumirVentas([{...abono,tipoCobro:undefined,tipo_cobro:"Abono a cuenta"}]).ventasBrutas,0);
});
test("Los importes se suman en centavos",()=>{
    assert.equal(resumirVentas([{total:0.1,efectivo:0.1},{total:0.2,efectivo:0.2}]).totalCobrado,0.3);
});
const a={id:"A",monto:20,estado:"Activo",fecha:"2020-01-01",hora:"10:00",creadoEn:"2020-01-01T10:00:00Z"};
const b={id:"B",monto:10,estado:"Activo",fecha:"2020-01-01",hora:"10:00",creadoEn:"2020-01-01T10:00:01Z"};
test("El recibo incorpora el pago inicial de la venta",()=>{
    const r=calcularSaldosAbono({total:100,abonado:70,saldo:30},b,[a,b]);assert.equal(r.saldoAntes,40);assert.equal(r.saldoDespues,30);
});
test("Un recibo anulado no vuelve a restarse del saldo",()=>{
    const r=calcularSaldosAbono({total:100,abonado:60,saldo:40},{...b,estado:"Anulado"},[a,{...b,estado:"Anulado"}]);assert.equal(r.saldoAntes,40);assert.equal(r.saldoDespues,40);
});
test("La reconstrucción del recibo omite abonos anulados anteriores",()=>{
    const r=calcularSaldosAbono({total:100,abonado:50,saldo:50},b,[{...a,estado:"Anulado"},b]);assert.equal(r.saldoAntes,60);assert.equal(r.saldoDespues,50);
});
