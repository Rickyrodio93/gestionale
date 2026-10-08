const r2 = (n) => Math.round(n * 100) / 100;
const somma = (a) => a.reduce((t, x) => t + x, 0);

export const TIPI_RATA = { ANTICIPO: "Anticipo", RATA: "Rata", SALDO: "Saldo" };
export const STATI_RATA = {
    pagata: ["Pagata", "bg-green-100 text-green-800"],
    parziale: ["Parziale", "bg-yellow-100 text-yellow-800"],
    scaduta: ["Scaduta", "bg-red-100 text-red-800"],
    futura: ["Da incassare", "bg-gray-100 text-gray-700"],
};

// gli incassi coprono le rate dalla più vecchia
export function situazioneVendita(v, oggi = new Date()) {
    const inizioOggi = new Date(Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth(), oggi.getUTCDate()));
    const incassato = r2(somma(v.incassi.map((i) => i.importo)));
    let disp = incassato;

    const righe = [...v.rate]
        .sort((a, b) => a.scadenza - b.scadenza || a.id - b.id)
        .map((r) => {
            const coperto = Math.min(disp, r.importo);
            disp = r2(disp - coperto);
            const residuo = r2(r.importo - coperto);
            const stato = residuo <= 0.005 ? "pagata" : coperto > 0.005 ? "parziale" : r.scadenza < inizioOggi ? "scaduta" : "futura";
            return { ...r, coperto: r2(coperto), residuo, stato };
        });

    const pianificato = r2(somma(righe.map((r) => r.importo)));
    return {
        righe,
        incassato,
        residuo: r2(v.prezzo - incassato),
        pct: v.prezzo > 0 ? incassato / v.prezzo : 0,
        arretrato: r2(somma(righe.filter((r) => r.scadenza < inizioOggi).map((r) => r.residuo))),
        pianificato,
        mancaNelPiano: r2(v.prezzo - pianificato), // > 0: il piano non arriva al prezzo
        prossima: righe.find((r) => r.residuo > 0.005) ?? null,
        fineAttesa: righe.length ? righe[righe.length - 1].scadenza : null,
    };
}

// incassi ancora attesi: la parte di piano non coperta (le rate scadute contano da oggi)
export function flussiResidui(v, oggi = new Date()) {
    const s = situazioneVendita(v, oggi);
    const out = s.righe
        .filter((r) => r.residuo > 0.005)
        .map((r) => ({ data: r.scadenza < oggi ? oggi : r.scadenza, importo: r.residuo }));
    const scoperto = r2(s.residuo - somma(out.map((x) => x.importo)));
    if (scoperto > 0.005) out.push({ data: v.dataRogito ?? s.fineAttesa ?? oggi, importo: scoperto });
    return out;
}