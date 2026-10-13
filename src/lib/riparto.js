import { imuStimata } from "@/lib/imu";
import { dataAcq, dataVend } from "@/lib/investimento";

const GIORNO = 86400000;
const r2 = (n) => Math.round(n * 100) / 100;

// frazione dell'anno in cui l'unità è in possesso (0-1); l'unità deve includere la palazzina
function frazionePossesso(u, anno) {
  const ini = Date.UTC(anno, 0, 1);
  const fine = Date.UTC(anno, 11, 31);
  const s = Math.max(ini, dataAcq(u)?.getTime() ?? -Infinity);
  const e = Math.min(fine, dataVend(u)?.getTime() ?? Infinity);
  if (e < s) return 0;
  return (Math.round((e - s) / GIORNO) + 1) / (Math.round((fine - ini) / GIORNO) + 1);
}

const IMU = [
  ["in proporzione all'IMU stimata di ogni unità", (u) => (u.catasto ? (imuStimata(u.catasto) ?? 0) : 0)],
  ["in proporzione alla rendita catastale (manca l'aliquota o il catasto di qualche unità)", (u) => u.catasto?.rendita ?? 0],
];
const COMUNI = [
  ["in proporzione alla superficie catastale", (u) => u.catasto?.superficie ?? 0],
  ["in parti uguali (mancano i dati catastali di qualche unità)", () => 1],
];

// unita: tutte le unità con palazzina e catasto. Restituisce le quote per unità e il criterio usato.
export function ripartisciGenerale(spesa, unita) {
  const anno = spesa.anno ?? spesa.data.getUTCFullYear();
  const cand = unita.map((u) => ({ u, f: frazionePossesso(u, anno) })).filter((x) => x.f > 0);
  if (!cand.length) return { parti: [], criterio: null };

  const criteri = spesa.categoria === "IMU" ? [...IMU, ...COMUNI] : COMUNI;
  for (const [nome, peso] of criteri) {
    const w = cand.map((x) => peso(x.u) * x.f);
    if (!w.every((p) => p > 0)) continue; // il criterio vale solo se ogni unità ha il dato
    const tot = w.reduce((t, p) => t + p, 0);
    let resto = spesa.importo;
    const parti = cand.map((x, i) => {
      const importo = i === cand.length - 1 ? r2(resto) : r2((spesa.importo * w[i]) / tot);
      resto = r2(resto - importo);
      return { unita: x.u, importo, quota: w[i] / tot };
    });
    return { parti, criterio: nome };
  }
  return { parti: [], criterio: null };
}