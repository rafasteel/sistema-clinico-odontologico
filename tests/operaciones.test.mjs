import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/supabase/operaciones.ts",import.meta.url),"utf8");
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function preparar(rpc,storage = new Map(), user = "usuario-A") {
    const m = {exports:{}};
    vm.runInNewContext(compiled, {
        exports:m.exports,module:m,crypto:webcrypto,TextEncoder,
        sessionStorage:{getItem:(k)=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:(k)=>storage.delete(k)},
        require:(name)=>{
            assert.equal(name,"@/lib/supabase/client");
            return {crearClienteSupabase:()=>({auth:{getSession:async()=>({data:{session:{user:{id:user}}},error:null})},rpc})};
        },
    });
    return m.exports.ejecutarOperacionClinica;
}
test("Envíos simultáneos del mismo formulario comparten una solicitud",async()=>{
    let finalizar;const ids=[];
    const ejecutar=preparar(async(_,args)=>{ids.push(args.p_solicitud);return new Promise(resolve=>{finalizar=resolve;});});
    const a=ejecutar("abono.cobrar",{cuenta_id:"A",efectivo:10});
    const b=ejecutar("abono.cobrar",{efectivo:10,cuenta_id:"A"});
    while(!finalizar) await new Promise(resolve=>setImmediate(resolve));
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(ids.length,1);finalizar({data:{id:"abono"},error:null});
    assert.deepEqual(await a,await b);
});
test("Una respuesta perdida conserva la identidad del reintento",async()=>{
    const ids=[];const storage=new Map();
    const ejecutar=preparar(async(_,args)=>{ids.push(args.p_solicitud);return ids.length===1?{data:null,error:{message:"Failed to fetch",code:""}}:{data:{id:"venta"},error:null};},storage);
    await assert.rejects(ejecutar("venta.registrar",{total:10}));
    assert.equal(storage.size,1);
    await ejecutar("venta.registrar",{total:10});
    assert.equal(ids[0],ids[1]);assert.equal(storage.size,0);
});
test("Recargar la pestaña no duplica una operación de resultado incierto",async()=>{
    const storage=new Map();let original;let reintento;
    const primero=preparar(async(_,args)=>{original=args.p_solicitud;throw new Error("Red interrumpida");},storage);
    await assert.rejects(primero("compra.registrar",{producto_id:"A",cantidad:3}));
    const recargado=preparar(async(_,args)=>{reintento=args.p_solicitud;return {data:{id:"compra"},error:null};},storage);
    await recargado("compra.registrar",{cantidad:3,producto_id:"A"});
    assert.equal(original,reintento);
});
test("Un rechazo SQL permite una solicitud nueva al corregir o reintentar",async()=>{
    const ids=[];
    const ejecutar=preparar(async(_,args)=>{ids.push(args.p_solicitud);return ids.length===1?{error:{message:"Saldo insuficiente",code:"22023"}}:{data:{ok:true},error:null};});
    await assert.rejects(ejecutar("abono.cobrar",{efectivo:10}),e=>e.codigo==="22023");
    await ejecutar("abono.cobrar",{efectivo:10});assert.notEqual(ids[0],ids[1]);
});
test("Dos pagos intencionales después de confirmar generan solicitudes distintas",async()=>{
    const ids=[];const ejecutar=preparar(async(_,args)=>{ids.push(args.p_solicitud);return {data:{ok:true},error:null};});
    await ejecutar("abono.cobrar",{efectivo:10});await ejecutar("abono.cobrar",{efectivo:10});
    assert.notEqual(ids[0],ids[1]);
});
test("Una sesión distinta no hereda la solicitud pendiente de otro usuario",async()=>{
    const storage=new Map();let a;let b;
    await assert.rejects(preparar(async(_,args)=>{a=args.p_solicitud;throw Error("Sin red");},storage,"A")("venta.registrar",{total:10}));
    await preparar(async(_,args)=>{b=args.p_solicitud;return {data:{ok:true},error:null};},storage,"B")("venta.registrar",{total:10});
    assert.notEqual(a,b);
});
for(const numero of [NaN,Infinity,-Infinity]){
    test(`Rechaza ${numero} antes de serializarlo como null`,async()=>{
        const ejecutar=preparar(()=>{throw Error("No debe contactar el API");});
        await assert.rejects(ejecutar("venta.registrar",{items:[{precio:numero}]}),/finitos/);
    });
}
