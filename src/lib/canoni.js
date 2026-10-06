import { fineEffettiva, addMonths } from "./scadenze";
import { dataAcq, dataVend } from "./investimento";
import { dataIt } from "./format";

const GIORNO = 86400000;
const r2 = (n) => Math.round(n * 100) / 100;
const chiave = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
const chiaveData = (d) => chiave(d.getUTCFullYear(), d.getUTCMonth());
const giorni = (a, b) => Math.round((b - a) / GIORNO) + 1; // estremi inclusi
const mesiTra = (a, b) => (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());

// indice del periodo che contiene la data d, con periodi che partono da `ancora` ogni `step` mesi
function indicePeriodo(ancora, step, d) {
  let k = Math.floor(mesiTra(ancora, d) / step);
  while (addMonths(ancora, k * step) > d) k--;
  while (addMonths(ancora, (k + 1) * step) <= d) k++;
  return k;
}

export const STATI_CANONE = {
  pagato: ["Pagato", "bg-green-100 text-green-800"],
  parziale: ["Parziale", "bg-yellow-100 text-yellow-800"],
  non_pagato: ["Non pagato", "bg-red-100 text-red-800"],
  da_incassare: ["Da incassare", "bg-gray-100 text-gray-700"],
};

export function etichettaPeriodo(r, step = 1) {
  if (step > 1 && r.dal && r.al) return `${dataIt(r.dal)} – ${dataIt(r.al)}`;
  return new Date(`${r.mese}-01`).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

// periodi dovuti fino a oggi. La chiave `mese` è "AAAA-MM" del mese in cui il periodo inizia.
export function mesiAttesi(c, oggi = new Date()) {
  if (!c.canone) return [];
  const step = c.periodicitaMesi ?? 1;
  const acquisto = dataAcq(c.unita)?.getTime() ?? -Infinity;
  const ini = Math.max(c.dataInizio.getTime(), acquisto);
  const fe = fineEffettiva(c);
  const vend = dataVend(c.unita);
  const fine = Math.min(fe ? fe.getTime() : Infinity, vend ? vend.getTime() : Infinity);
  const out = [];

  if (step === 1) {
    // mensile: mesi di calendario, proporzionati nel primo e nell'ultimo
    const inizio = new Date(ini);
    let y = inizio.getUTCFullYear();
    let m = inizio.getUTCMonth();
    while (true) {
      const start = Date.UTC(y, m, 1);
      if (start > oggi.getTime() || start > fine) break;
      const end = Date.UTC(y, m + 1, 0);
      const da = Math.max(start, ini);
      const a = Math.min(end, fine);
      if (a >= da) {
        const f = Math.min(giorni(da, a) / giorni(start, end), 1);
        out.push({ mese: chiave(y, m), dal: new Date(start), al: new Date(end), atteso: r2(c.canone * f) });
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return out;
  }

  // periodi ancorati a un giorno (es. trimestri dal 16), pagati in anticipo
  const ancora = c.ancoraPeriodi ?? c.dataInizio;
  let k = indicePeriodo(ancora, step, new Date(ini));
  while (true) {
    const dal = addMonths(ancora, k * step);
    const al = new Date(addMonths(ancora, (k + 1) * step).getTime() - GIORNO);
    const da = Math.max(dal.getTime(), ini);
    const a = Math.min(al.getTime(), fine);
    if (da > oggi.getTime() || dal.getTime() > fine) break;
    if (a >= da) {
      const f = Math.min(giorni(da, a) / giorni(dal.getTime(), al.getTime()), 1);
      out.push({ mese: chiaveData(dal), dal, al, atteso: r2(c.canone * step * f) });
    }
    k++;
  }
  return out;
}

// c deve includere i canoni: { ..., canoni: [...] }
export function situazioneCanoni(c, oggi = new Date()) {
  const step = c.periodicitaMesi ?? 1;
  const mesi = new Map(mesiAttesi(c, oggi).map((a) => [a.mese, { ...a, incassato: 0 }]));
  for (const p of c.canoni ?? []) {
    const r = mesi.get(p.mese) ?? { mese: p.mese, dal: null, al: null, atteso: 0, incassato: 0 };
    r.incassato += p.importo;
    mesi.set(p.mese, r);
  }

  const ancora = c.ancoraPeriodi ?? c.dataInizio;
  const corrente =
    step === 1 ? chiaveData(oggi) : chiaveData(addMonths(ancora, indicePeriodo(ancora, step, oggi) * step));
  // pagamento anticipato: il periodo in corso è già dovuto; il mese di un contratto mensile no
  const scaduto = (m) => (step > 1 ? m <= corrente : m < corrente);

  const righe = [...mesi.values()]
    .sort((a, b) => (a.mese < b.mese ? -1 : 1))
    .map((r) => {
      const residuo = r2(r.atteso - r.incassato);
      const stato =
        residuo <= 0.005 ? "pagato" : r.incassato > 0 ? "parziale" : scaduto(r.mese) ? "non_pagato" : "da_incassare";
      return { ...r, incassato: r2(r.incassato), residuo, stato };
    });
  const arretrati = r2(righe.filter((r) => scaduto(r.mese) && r.residuo > 0.005).reduce((t, r) => t + r.residuo, 0));
  return { righe, arretrati, corrente, step };
}