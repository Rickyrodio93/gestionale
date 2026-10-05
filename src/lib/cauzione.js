import { situazioneCanoni } from "./canoni";

const r2 = (n) => Math.round(n * 100) / 100;
const somma = (a) => a.reduce((t, x) => t + x, 0);

// c deve includere: canoni, unita.palazzina, quote.pagamenti, trattenute
export function calcolaCauzione(c) {
  const mesiAperti = situazioneCanoni(c).righe.filter((r) => r.residuo > 0.005);
  const quoteAperte = c.quote
    .map((q) => ({ id: q.id, residuo: r2(q.importo - somma(q.pagamenti.map((p) => p.importo))) }))
    .filter((q) => q.residuo > 0.005);

  const canoni = r2(somma(mesiAperti.map((r) => r.residuo)));
  const bollette = r2(somma(quoteAperte.map((q) => q.residuo)));
  const manuali = r2(somma(c.trattenute.map((t) => t.importo)));
  const debiti = r2(canoni + bollette + manuali);
  const cauzione = c.cauzione ?? 0;

  return {
    cauzione, canoni, bollette, manuali, debiti,
    daRestituire: r2(Math.max(0, cauzione - debiti)),
    scoperto: r2(Math.max(0, debiti - cauzione)),
    mesiAperti, quoteAperte,
  };
}