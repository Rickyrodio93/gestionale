import { addMonths } from "@/lib/scadenze";

const r2 = (n) => Math.round(n * 100) / 100;

export const FREQ_MESI = { 1: "MENSILE", 2: "BIMESTRALE", 3: "TRIMESTRALE", 6: "SEMESTRALE", 12: "ANNUALE" };
export const SCOPI = { ACQUISTO: "Acquisto dell'immobile", LAVORI: "Lavori / ristrutturazione" };

// tasso per periodo che rende il valore attuale delle rate uguale al capitale (bisezione)
export function tassoPeriodale(P, R, n) {
    if (R * n < P - 0.005) return null; // le rate non restituiscono nemmeno il capitale
    if (Math.abs(R * n - P) < 0.005) return 0;
    const pv = (i) => (R * (1 - Math.pow(1 + i, -n))) / i;
    let lo = 1e-9, hi = 1;
    for (let k = 0; k < 100; k++) {
        const mid = (lo + hi) / 2;
        if (pv(mid) > P) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

export function rataDaTasso(P, tassoAnnuo, n, step) {
    const i = (tassoAnnuo / 100) * (step / 12);
    if (i === 0) return r2(P / n);
    return r2((P * i) / (1 - Math.pow(1 + i, -n)));
}

// piano di ammortamento a rata costante
export function pianoFinanziamento(f) {
    const step = f.frequenzaMesi ?? 1;
    const i = ((f.tassoAnnuo ?? 0) / 100) * (step / 12);
    let saldo = f.importo;
    const righe = [];
    for (let k = 0; k < f.numeroRate; k++) {
        const interessi = r2(saldo * i);
        const ultima = k === f.numeroRate - 1;
        let capitale = ultima ? saldo : r2(f.rata - interessi);
        if (capitale > saldo) capitale = saldo;
        saldo = r2(saldo - capitale);
        righe.push({ n: k + 1, data: addMonths(f.primaRata, k * step), rata: r2(capitale + interessi), interessi, capitale, saldo });
    }
    return righe;
}

// situazione alla data `a`; con `da` si contano solo le rate successive a quella data
export function statoAlla(f, a, da = null) {
    if (a < f.dataErogazione) return { debito: 0, interessi: 0, rate: [] };
    const fino = pianoFinanziamento(f).filter((r) => r.data <= a);
    const periodo = da ? fino.filter((r) => r.data > da) : fino;
    const ultima = fino[fino.length - 1];
    return {
        debito: ultima ? ultima.saldo : f.importo,
        interessi: r2(periodo.reduce((t, r) => t + r.interessi, 0)),
        rate: periodo,
    };
}

export function riepilogoFinanziamento(f, oggi = new Date()) {
    const righe = pianoFinanziamento(f);
    const pagate = righe.filter((r) => r.data <= oggi);
    const somma = (a, k) => r2(a.reduce((t, r) => t + r[k], 0));
    const ultimaPagata = pagate[pagate.length - 1];
    return {
        righe,
        ratePagate: pagate.length,
        interessiTotali: somma(righe, "interessi"),
        interessiPagati: somma(pagate, "interessi"),
        capitalePagato: somma(pagate, "capitale"),
        debitoResiduo: oggi < f.dataErogazione ? 0 : ultimaPagata ? ultimaPagata.saldo : f.importo,
        costoTotale: r2(somma(righe, "rata") + (f.speseIniziali ?? 0)),
        finePiano: righe.length ? righe[righe.length - 1].data : null,
    };
}