import { dataIt } from "./format";

export const addMonths = (d, n) => {
    const x = new Date(d);
    const giorno = x.getUTCDate();
    x.setUTCDate(1);
    x.setUTCMonth(x.getUTCMonth() + n);
    const ultimo = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
    x.setUTCDate(Math.min(giorno, ultimo)); // se il giorno non esiste, usa l'ultimo del mese
    return x;
};

// 01/01/2026 + 48 mesi -> 31/12/2029
export function fineContratto(inizio, mesi) {
    const x = addMonths(inizio, mesi);
    x.setUTCDate(x.getUTCDate() - 1);
    return x;
}

// nuova scadenza dopo un rinnovo: parte dal giorno successivo alla scadenza attuale
export function rinnovaFine(dataFine, mesi) {
    const x = new Date(dataFine);
    x.setUTCDate(x.getUTCDate() + 1);
    return fineContratto(x, mesi);
}
const giorniA = (d) => Math.ceil((d - new Date()) / 86400000);

export function statoScadenza(c) {
    if (c.tipo !== "LUNGO" || !c.dataFine) return null;

    const scadenza = new Date(c.dataFine);
    const limite = addMonths(scadenza, -(c.preavvisoMesi ?? 6));
    const gScad = giorniA(scadenza);
    const gLimite = giorniA(limite);

    let livello = "ok";
    if (c.dataRilascio && c.dataRilascio <= new Date()) livello = "concluso";
    else if (c.inOccupazione && gScad < 0) livello = "in_occupazione";
    else if (gScad < 0) livello = "scaduto";
    else if (c.disdettaInviataIl) livello = "disdetta_inviata";
    else if (gLimite < 0) livello = "termine_superato";
    else if (gLimite <= 30) livello = "urgente";
    else if (gLimite <= 90) livello = "attenzione";

    return { scadenza, limite, giorniAllaScadenza: gScad, giorniAlLimite: gLimite, livello };
}

// fine reale dell'occupazione: null = ancora in corso
export const fineEffettiva = (c) => c.dataRilascio ?? (c.inOccupazione ? null : c.dataFine);

export function etichetta(s) {
    const fisse = {
        in_occupazione: "in occupazione",
        concluso: "concluso",
        scaduto: "scaduto",
        disdetta_inviata: "disdetta inviata",
    };
    return fisse[s.livello] ?? `disdetta entro ${dataIt(s.limite)}`;
}

// prossimo rinnovo se non si invia disdetta
export function prossimaScadenzaSeRinnovo(c) {
    return c.rinnovoMesi && c.dataFine ? rinnovaFine(c.dataFine, c.rinnovoMesi) : null;
}

export const coloriScadenza = {
    ok: "bg-green-100 text-green-800",
    attenzione: "bg-yellow-100 text-yellow-800",
    urgente: "bg-red-100 text-red-800",
    termine_superato: "bg-red-200 text-red-900",
    scaduto: "bg-red-200 text-red-900",
    disdetta_inviata: "bg-gray-200 text-gray-700",
    in_occupazione: "bg-orange-100 text-orange-800",
    concluso: "bg-gray-100 text-gray-500",
};