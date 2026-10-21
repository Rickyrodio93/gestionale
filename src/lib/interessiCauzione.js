// Interessi legali sulla cauzione degli inquilini (art. 11 L. 392/1978 per le locazioni abitative):
// maturano giorno per giorno dal versamento e si riconoscono all'inquilino alla fine di ogni anno o alla restituzione.
// Sono una stima di supporto: non sostituiscono il parere del commercialista.

// Saggio degli interessi legali per anno (decreti MEF, art. 1284 c.c.), % annua.
// Il MEF lo fissa ogni dicembre per l'anno dopo; se non esce un decreto resta quello precedente.
// Per aggiungere un anno nuovo basta una riga qui sotto.
export const TASSI_LEGALI = {
    2012: 2.5, 2013: 1, 2014: 1, 2015: 0.5, 2016: 0.2, 2017: 0.1, 2018: 0.3, 2019: 0.8,
    2020: 0.05, 2021: 0.01, 2022: 1.25, 2023: 5, 2024: 2.5, 2025: 2, 2026: 1.6,
};

const ANNI = Object.keys(TASSI_LEGALI).map(Number).sort((a, b) => a - b);
export const ULTIMO_ANNO_TASSI = ANNI[ANNI.length - 1];

export function tassoLegale(anno) {
    if (TASSI_LEGALI[anno] != null) return TASSI_LEGALI[anno];
    const prima = ANNI.filter((a) => a <= anno).pop() ?? ANNI[0];
    return TASSI_LEGALI[prima];
}

const GIORNO = 86400000;
const r2 = (n) => Math.round(n * 100) / 100;
const somma = (a) => a.reduce((t, x) => t + x, 0);
const giornoUtc = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

// c: { cauzione, cauzioneVersataIl, cauzioneRestituitaIl, cauzioneRestituita, interessiLiquidati, tassoCauzione, pagamentiInteressi }
// fino: giorno in cui si ferma il calcolo, escluso (oggi se il contratto è aperto; con la cauzione liquidata vale la data di liquidazione).
export function interessiCauzione(c, { fino = new Date() } = {}) {
    if (!(c.cauzione > 0) || !c.cauzioneVersataIl) return null;
    const liquidata = !!c.cauzioneRestituitaIl;
    const oggi = giornoUtc(new Date());
    const inizio = giornoUtc(c.cauzioneVersataIl);
    const fine = giornoUtc(liquidata ? c.cauzioneRestituitaIl : fino);

    const righe = [];
    if (fine > inizio) {
        const y0 = new Date(inizio).getUTCFullYear();
        const y1 = new Date(fine - GIORNO).getUTCFullYear();
        for (let y = y0; y <= y1; y++) {
            const capodanno = Date.UTC(y, 0, 1);
            const prossimo = Date.UTC(y + 1, 0, 1);
            const s = Math.max(inizio, capodanno);
            const e = Math.min(fine, prossimo);
            const giorni = Math.round((e - s) / GIORNO);
            if (giorni <= 0) continue;
            const giorniAnno = Math.round((prossimo - capodanno) / GIORNO);
            const tasso = c.tassoCauzione ?? tassoLegale(y);
            righe.push({
                anno: y,
                dal: new Date(s),
                al: new Date(e - GIORNO), // ultimo giorno incluso
                giorni, giorniAnno, tasso,
                personalizzato: c.tassoCauzione != null,
                stimato: c.tassoCauzione == null && y > ULTIMO_ANNO_TASSI, // tasso dell'anno non ancora in tabella
                interessi: r2((c.cauzione * tasso * giorni) / (100 * giorniAnno)),
                // esigibile: l'anno è concluso (o la cauzione è stata liquidata)
                esigibile: liquidata || prossimo <= oggi,
            });
        }
    }

    const pagamenti = c.pagamentiInteressi ?? [];
    const maturato = r2(somma(righe.map((r) => r.interessi)));
    const esigibile = r2(somma(righe.filter((r) => r.esigibile).map((r) => r.interessi)));
    const pagati = r2(somma(pagamenti.map((p) => p.importo)) + (liquidata ? (c.interessiLiquidati ?? 0) : 0));
    return {
        righe, pagamenti, liquidata, maturato, pagati,
        daPagare: Math.max(0, r2(maturato - pagati)),
        esigibileDaPagare: Math.max(0, r2(esigibile - pagati)),
        tassoPersonalizzato: c.tassoCauzione ?? null,
    };
}