type MovimientoVenta = {
    tipoCobro?: string;
    tipo_cobro?: string;
    estado?: string;
    total: number;
    efectivo?: number;
    tarjeta?: number;
    transferencia?: number;
    credito?: number;
};

export function esAbonoVenta(venta: Pick<MovimientoVenta, "tipoCobro" | "tipo_cobro">) {
    return (venta.tipoCobro ?? venta.tipo_cobro) === "Abono a cuenta";
}

// Sumar centavos evita diferencias por acumulación de decimales binarios.
export function resumirVentas(ventas: readonly MovimientoVenta[]) {
    const activos = ventas.filter((venta) => venta.estado !== "Anulada");
    const comerciales = activos.filter((venta) => !esAbonoVenta(venta));
    const sumar = (filas: readonly MovimientoVenta[], campo: "total" | "efectivo" | "tarjeta" | "transferencia" | "credito") =>
        filas.reduce((total, venta) => total + Math.round((venta[campo] ?? 0) * 100), 0) / 100;
    const efectivo = sumar(activos, "efectivo");
    const tarjeta = sumar(activos, "tarjeta");
    const transferencia = sumar(activos, "transferencia");
    const abonos = activos.filter(esAbonoVenta);
    return {
        ventasCantidad: comerciales.length,
        cobrosCantidad: activos.length,
        ventasBrutas: sumar(comerciales, "total"),
        creditoGenerado: sumar(comerciales, "credito"),
        efectivo, tarjeta, transferencia,
        totalCobrado: Math.round((efectivo + tarjeta + transferencia) * 100) / 100,
        abonosCobrados: Math.round((sumar(abonos, "efectivo") + sumar(abonos, "tarjeta") + sumar(abonos, "transferencia")) * 100) / 100,
    };
}

type AbonoParaSaldo = { id: string; monto: number; estado: string; fecha: string; hora: string; creadoEn?: string };

export function calcularSaldosAbono(cuenta: { total: number; abonado: number; saldo: number }, actual: AbonoParaSaldo, abonos: readonly AbonoParaSaldo[]) {
    if (actual.estado === "Anulado") return { saldoAntes: cuenta.saldo, saldoDespues: cuenta.saldo, abonadoTotal: cuenta.abonado };
    const activos = abonos.filter((abono) => abono.estado !== "Anulado");
    const cents = (n: number) => Math.round(n * 100);
    const pagoInicial = Math.max(cents(cuenta.abonado) - activos.reduce((s, a) => s + cents(a.monto), 0), 0);
    const ordenados = [...activos].sort((a,b) => `${a.creadoEn || `${a.fecha} ${a.hora}`} ${a.id}`.localeCompare(`${b.creadoEn || `${b.fecha} ${b.hora}`} ${b.id}`));
    let antes = pagoInicial;
    for (const abono of ordenados) { if (abono.id === actual.id) break; antes += cents(abono.monto); }
    return { saldoAntes: Math.max(cents(cuenta.total) - antes, 0) / 100,
        saldoDespues: Math.max(cents(cuenta.total) - antes - cents(actual.monto), 0) / 100, abonadoTotal: cuenta.abonado };
}
