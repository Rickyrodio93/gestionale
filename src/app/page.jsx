import {
  Annuale,
  Categorie,
  Confronto,
  Mensile,
} from "@/components/DashboardCharts";

import {
  caricaMovimenti,
  CAT_USCITE,
  MESI,
  perCategoria,
  perChiave,
  serieMensile,
  totaleFino,
} from "@/lib/dashboard";

import { dataIt, eur } from "@/lib/format";
import { imuStimata } from "@/lib/imu";
import { prisma } from "@/lib/prisma";
import { statoScadenza } from "@/lib/scadenze";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const r2 = (n) => Math.round(n * 100) / 100;

function Delta({ cur, prev, invert = false, anno }) {
  if (!prev)
    return <span className="text-xs text-gray-400">nessun dato {anno}</span>;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const buono = invert ? pct <= 0 : pct >= 0;
  return (
    <span
      className={`text-xs font-medium ${buono ? "text-green-700" : "text-red-700"}`}
    >
      {pct >= 0 ? "+" : "-"}
      {pct.toFixed(0)}%{" "}
      <span className="font-normal text-gray-500">vs {anno}</span>
    </span>
  );
}

function Kpi({ label, value, sub, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
      {children}
    </div>
  );
}

function prossimaImu(oggi) {
  const y = oggi.getFullYear()
  const t0 = new Date(y, oggi.getMonth(), oggi.getDate());
  const c = [
    [new Date(y, 5, 16), "acconto"],
    [new Date(y, 5, 16), "saldo"],
    [new Date(y + 1, 5, 16), "acconto"],

  ];
  return c.find(([d]) => d >= t0)
}

export default async function Dashboard({ searchParams }) {
  const sp = await searchParams;
  const oggi = new Date();
  const annoCorrente = oggi.getFullYear();
  const meseCorrente = oggi.getMonth() + 1;

  const { movs, crediti } = await caricaMovimenti();

  const anniDati = [
    ...new Set([annoCorrente, ...movs.map((m) => m.data.getUTCFullYear())]),
  ].sort((a, b) => a - b);
  const richiesto = Number(sp.anno);
  const anno = anniDati.includes(richiesto) ? richiesto : annoCorrente;
  const fino = anno === annoCorrente ? meseCorrente : 12;
  const prev = anno - 1;

  // serie e totali
  const serieSel = serieMensile(movs, anno, fino);
  const seriePrev = serieMensile(movs, prev, 12);
  const tot = totaleFino(serieSel, 12);
  const totPrev = totaleFino(seriePrev, fino);
  const haPrev = totPrev.entrate > 0 || totPrev.uscite > 0;

  // confronto cumulato
  const anniConfronto = [anno, prev, prev - 1].filter((y) => y >= anniDati[0]);
  const serieAnni = Object.fromEntries(
    anniConfronto.map((y) => [
      y,
      serieMensile(movs, y, y === anno ? fino : 12),
    ]),
  );
  const righeConfronto = MESI.map((mese, i) => ({
    mese,
    ...Object.fromEntries(
      anniConfronto.map((y) => [String(y), serieAnni[y][i].cumulato]),
    ),
  }));

  // totali per anno
  const annuale = anniDati.map((y) => {
    const t = totaleFino(
      serieMensile(movs, y, y === annoCorrente ? meseCorrente : 12),
    );
    return { anno: y === annoCorrente ? `${y} (in corso)` : String(y), ...t };
  });

  // categorie
  const uSel = perCategoria(movs, anno, fino, "uscita");
  const uPrev = perCategoria(movs, prev, fino, "uscita");
  const categorie = Object.keys(CAT_USCITE)
    .filter((k) => uSel[k] || uPrev[k])
    .map((k) => ({
      cat: CAT_USCITE[k],
      attuale: uSel[k] ?? 0,
      precedente: uPrev[k] ?? 0,
    }));
  const eSel = perCategoria(movs, anno, fino, "entrata");

  // per palazzina / unità autonoma
  const perPal = perChiave(movs, anno, fino);

  // scadenze contratti
  const contratti = await prisma.contratto.findMany({
    where: { tipo: "LUNGO" },
    include: { inquilino: true, unita: true },
  });
  const scadenze = contratti
    .map((c) => ({ c, s: statoScadenza(c) }))
    .filter(
      (x) =>
        x.s &&
        ["attenzione", "urgente", "termine_superato", "scaduto"].includes(
          x.s.livello,
        ),
    )
    .sort((a, b) => a.s.limite - b.s.limite);

  // IMU
  const unicaCat = await prisma.unita.findMany({
    where: { dataVendita: null, catasto: { isNot: null } },
    include: { catasto: true },
  });
  const stimaImu = r2(unicaCat.reduce((t, u) => t + (imuStimata(u.catasto) ?? 0), 0));
  const imuVersata = r2(movs.filter((m) => m.cat === "IMU" && m.data.getUTCFullYear() === anno).reduce((t, m) => t + m.importo, 0));
  const nextImu = prossimaImu(oggi)

  const utile = tot.risultato >= 0;
  const margine =
    tot.entrate > 0
      ? `${((tot.risultato / tot.entrate) * 100).toFixed(0)}%`
      : "-";
  const periodo =
    anno === annoCorrente
      ? `Da gennaio a ${MESI[fino - 1].toLowerCase()}`
      : `Anno ${anno} completo`;
  const chip = (attivo) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      attivo
        ? "border-indigo-300 bg-indigo-100 text-indigo-800"
        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
    }`;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          {[...anniDati].reverse().map((a) => (
            <Link key={a} href={`/?anno=${a}`} className={chip(a === anno)}>
              {a}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {/* esito */}
        <section className={``}>
          <div className="flex items-center gap-4">
            <div
              className={`rounded-full p-3 ${utile ? "bg-green-100 text-green-700" : "bg-red-800 text-red-700"}`}
            >
              {utile ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
            </div>
            <div>
              <p
                className={`text-sm font-semibold uppercase tracking-wide ${utile ? "text-green-800" : "text-red-700"}`}
              >
                {utile ? "In utile" : "In perdita"} {periodo}
              </p>
              <p
                className={`text-4xl font-bold ${utile ? "text-green-700" : "text-red-700"}`}
              >
                {utile ? "+" : "-"}
                {eur(Math.abs(tot.risultato))}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-700">
            {haPrev ? (
              <>
                <p>
                  Stesso periodo {prev}: <b>{eur(totPrev.risultato)}</b>
                </p>
                <p
                  className={
                    tot.risultato - totPrev.risultato > 0
                      ? "text-green-700"
                      : "text-red-700"
                  }
                >
                  {tot.risultato - totPrev.risultato >= 0 ? "+" : "-"}
                  {eur(Math.abs(tot.risultato - totPrev.risultato))}
                </p>
              </>
            ) : (
              <p className="text-gray-500">
                Nessun dato del {prev} per il confronto
              </p>
            )}
          </div>
        </section>

        {/* indicatori */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Entrate"
            value={eur(tot.entrate)}
            sub={`Lunghi ${eur(eSel.LUNGHI ?? 0)} · Brevi ${eur(eSel.BREVI ?? 0)}`}
          >
            <Delta cur={tot.entrate} prev={totPrev.entrate} anno={prev} />
          </Kpi>
          <Kpi label="Uscite" value={eur(tot.uscite)}>
            <Delta cur={tot.uscite} prev={totPrev.uscite} invert anno={prev} />
          </Kpi>
          <Kpi label="Margine" value={margine} sub="risultato entrate" />
          <Kpi
            label="Bollette da incassare"
            value={eur(crediti)}
            sub="rimborsi ancora dovuti dagli inquilini"
          >
            <Link
              href="/spese/bollette?anno=tutti&stato=daincassare"
              className="text-xs text-indigo-600 hover:underline"
            >
              Vedi elenco
            </Link>
          </Kpi>
        </div>

        {/* grafici */}
        <Mensile dati={serieSel} anno={anno} />
        <div className="grid gap-5 lg:grid-cols-2">
          <Confronto righe={righeConfronto} anni={anniConfronto} />
          <Annuale dati={annuale} />
          <Categorie dati={categorie} anno={anno} />

          <section className="rounded-xl border border-gray-200 p-5 bg-white shadow-sm">
            <h2 className="font-semibold">Risultato per palazzina</h2>
            <p>
              Include le spese sulla palazzina e quelle sulle sue unità.{" "}
              {periodo}
            </p>
            {perPal.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nessun movimento nel periodo
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="pb-2">Palzzina / unità</th>
                    <th className="text-right">Entrate</th>
                    <th className="text-right">Uscite</th>
                    <th className="text-right">Risultato</th>
                  </tr>
                </thead>
                <tbody>
                  {perPal.map((p) => (
                    <tr
                      key={p.chiave}
                      className="border-t border-gray-100 text-sm"
                    >
                      <td className="py-2 pr-3 font-medium">{p.chiave}</td>
                      <td className="text-right">{eur(p.entrate)}</td>
                      <td className="text-right">{eur(p.uscite)}</td>
                      <td
                        className={`text-right font-semibold ${p.risultato > 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {eur(p.risultato)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        {/* scadenze */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">
              Contratti da tenere d&apos;occhio
            </h2>
            {scadenze.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nessuna disdetta in scadenza nei prossimi 90 giorni.
              </p>
            ) : (
              <ul className="space-y-2">
                {scadenze.map(({ c, s }) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <Link
                      href={`/entrate/contratti/${c.id}`}
                      className="hover:underline"
                    >
                      <b>{c.unita.nome}</b> · {c.inquilino.nome}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${coloriScadenza[s.livello]}`}
                    >
                      disdetta entro {dataIt(s.limite)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">IMU {anno}</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500">Stima annua</p>
                <p className="font-semibold">{eur(stimaImu)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Versata</p>
                <p className="font-semibold">{eur(imuVersata)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prossima scadenza</p>
                <p className="font-semibold">{nextImu ? dataIt(nextImu[0]) : "-"}</p>
                <p className="text-xs text-gray-500">{nextImu?.[1]}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">La stima è indicativa. Il dettaglio è in <Link href="/spese" className="text-indigo-600 hover:underline">Spese</Link>.</p>
          </section>
        </div>

        {movs.length === 0 && (
          <p className="text-sm text-gray-500">
            Non ci sono ancora movimenti: inserisci contratti con canone, incassi, spese o bollette e la dashboard si popola da sola.
          </p>
        )}
      </div>
    </>
  );
}
