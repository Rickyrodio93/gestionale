import { situazioneCanoni } from "./canoni";
import { interessiCauzione } from "./interessiCauzione";

const r2 = (n) => Math.round(n * 100) / 100;
const somma = (a) => a.reduce((t, x) => t + x, 0);

// c deve includere: canoni, unita.palazzina, quote.pagamenti, trattenute, pagamentiInteressi
// fino: data a cui si calcolano gli interessi (oggi; alla liquidazione, la data di liquidazione)
export function calcolaCauzione(c, fino = new Date()) {
  const mesiAperti = situazioneCanoni(c).righe.filter((r) => r.residuo > 0.005);
  const quoteAperte = c.quote
    .map((q) => ({ id: q.id, residuo: r2(q.importo - somma(q.pagamenti.map((p) => p.importo))) }))
    .filter((q) => q.residuo > 0.005);

  const canoni = r2(somma(mesiAperti.map((r) => r.residuo)));
  const bollette = r2(somma(quoteAperte.map((q) => q.residuo)));
  const manuali = r2(somma(c.trattenute.map((t) => t.importo)));
  const debiti = r2(canoni + bollette + manuali);
  const cauzione = c.cauzione ?? 0;
  // interessi legali maturati e non ancora pagati: sono un credito dell'inquilino, si sommano alla cauzione
  const interessi = c.cauzioneRestituitaIl ? 0 : (interessiCauzione(c, { fino })?.daPagare ?? 0);
  const disponibile = r2(cauzione + interessi);

  return {
    cauzione, interessi, canoni, bollette, manuali, debiti,
    daRestituire: r2(Math.max(0, disponibile - debiti)),
    scoperto: r2(Math.max(0, debiti - disponibile)),
    mesiAperti, quoteAperte,
  };
}