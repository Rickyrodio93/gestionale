import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { imuStimata } from "@/lib/imu";
import { eur, dataIt } from "@/lib/format";
import { CATEGORIE } from "@/lib/spese";
import { pianoCedolare } from "@/lib/cedolare";
import { sincronizzaRicorrenti } from "@/lib/ricorrenti";
import { ripartisciGenerale } from "@/lib/riparto";
import BottoneElimina from "@/components/BottoneElimina";
import FiltroSelect from "@/components/FiltroSelect";
import Tooltip, {TooltipRighe} from "@/components/Tooltips";
import { eliminaSpesa } from "./actions";

export const dynamic = "force-dynamic";

const r2 = (n) => Math.round(n * 100) / 100;
const somma = (arr) => r2(arr.reduce((t, v) => t + v.importo, 0)); // arr = viste { s, importo, quota }
const sommaSpese = (arr) => r2(arr.reduce((t, s) => t + s.importo, 0));

export default async function Spese({ searchParams }) {
  const sp = await searchParams;
  await sincronizzaRicorrenti();

  const tutte = await prisma.spesa.findMany({
    include: {
      unita: { include: { palazzina: true } },
      palazzina: true,
      rata: { select: { dilazioneId: true } },
    },
    orderBy: { data: "desc" },
  });
  const unitaCtx = await prisma.unita.findMany({ include: { palazzina: true, catasto: true }, orderBy: { nome: "asc" } });
  const palazzine = await prisma.palazzina.findMany({ orderBy: { nome: "asc" } });

  // una spesa "generale" non ha un immobile: nel bilancio viene ripartita sulle unità
  const generale = (s) => !s.unitaId && !s.palazzinaId && !s.rata && s.categoria !== "CEDOLARE";

  // filtri: anno, categoria, immobile
  const annoCorrente = new Date().getFullYear();
  const anni = [...new Set([annoCorrente, ...tutte.map((s) => s.anno)])].sort((a, b) => b - a);
  const sel = sp.anno ?? String(annoCorrente);
  const cat = Object.keys(CATEGORIE).includes(sp.cat) ? sp.cat : "tutte";

  const [dT, dI] = String(sp.dest ?? "").split(":");
  const dId = Number(dI);
  const destValida =
    sp.dest === "nessuno" ||
    (dT === "palazzina" && palazzine.some((p) => p.id === dId)) ||
    (dT === "unita" && unitaCtx.some((u) => u.id === dId));
  const dest = destValida ? sp.dest : "tutti";
  const destEtichetta = !destValida
    ? null
    : dest === "nessuno"
      ? "non legate a un immobile"
      : dT === "palazzina"
        ? palazzine.find((p) => p.id === dId)?.nome
        : unitaCtx.find((u) => u.id === dId)?.nome;

  const href = (o = {}) => {
    const p = new URLSearchParams();
    p.set("anno", o.anno ?? sel);
    const c = o.cat ?? cat;
    const d = o.dest ?? dest;
    if (c !== "tutte") p.set("cat", c);
    if (d !== "tutti") p.set("dest", d);
    return `/spese?${p}`;
  };

  // importo che conta per il filtro immobile: intero, oppure solo la quota ripartita su quelle unità
  const vista = (s) => {
    const parti = generale(s) ? ripartisciGenerale(s, unitaCtx).parti : [];
    const intera = { s, importo: s.importo, quota: false };
    if (dest === "tutti") return intera;
    if (dest === "nessuno") return !s.unitaId && !s.palazzinaId && parti.length === 0 ? intera : null;
    const [t, i] = dest.split(":");
    const id = Number(i);
    if (parti.length) {
      const mie = parti.filter((p) => (t === "unita" ? p.unita.id === id : p.unita.palazzinaId === id));
      const tot = r2(mie.reduce((x, p) => x + p.importo, 0));
      return tot > 0.005 ? { s, importo: tot, quota: true } : null;
    }
    if (t === "unita") return s.unitaId === id ? intera : null;
    return s.palazzinaId === id || s.unita?.palazzinaId === id ? intera : null;
  };

  const viste = tutte.map(vista).filter(Boolean);
  const delPeriodo = sel === "tutti" ? viste : viste.filter((v) => v.s.anno === Number(sel));
  const filtrate = cat === "tutte" ? delPeriodo : delPeriodo.filter((v) => v.s.categoria === cat);

  // riepilogo per palazzina: sempre sull'intero portafoglio dell'anno, serve anche come scorciatoia ai filtri
  const delAnno = sel === "tutti" ? tutte : tutte.filter((s) => s.anno === Number(sel));
  const perPal = new Map();
  const aggiungi = (key, nome, pid, v) => {
    const x = perPal.get(key) ?? { nome, pid, tot: 0 };
    x.tot += v;
    perPal.set(key, x);
  };
  for (const s of delAnno) {
    const parti = generale(s) ? ripartisciGenerale(s, unitaCtx).parti : [];
    if (parti.length) {
      for (const p of parti) {
        const pal = p.unita.palazzina;
        aggiungi(pal ? `p${pal.id}` : "aut", pal?.nome ?? "Unità autonome", pal?.id ?? null, p.importo);
      }
    } else {
      const pal = s.palazzina ?? s.unita?.palazzina;
      if (pal) aggiungi(`p${pal.id}`, pal.nome, pal.id, s.importo);
      else if (s.unita) aggiungi("aut", "Unità autonome", null, s.importo);
      else aggiungi("gen", "Generale", null, s.importo);
    }
  }

  // stima IMU e piano cedolare: riguardano tutto il portafoglio, quindi solo senza filtro immobile
  let imu = null;
  let piano = null;
  if (sel !== "tutti" && dest === "tutti") {
    const conCatasto = unitaCtx.filter((u) => !u.dataVendita && u.catasto);
    const stime = conCatasto.map((u) => imuStimata(u.catasto));
    imu = {
      stima: r2(stime.reduce((t, v) => t + (v ?? 0), 0)),
      versato: sommaSpese(delAnno.filter((s) => s.categoria === "IMU")),
      senzaAliquota: stime.filter((v) => v == null).length,
    };
    piano = await pianoCedolare(Number(sel));
  }
  const regLink = (r, anno) =>
    `/spese/nuova?categoria=CEDOLARE&anno=${anno}&importo=${Math.abs(r.importo).toFixed(2)}&descrizione=${encodeURIComponent(`Cedolare secca ${anno} — ${r.titolo}`)}`;

  const chip = (attivo) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      attivo ? "border-indigo-300 bg-indigo-100 text-indigo-800" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
    }`;

  const opzioni = [
    { value: "tutti", label: "Tutti gli immobili" },
    ...palazzine.map((p) => ({ gruppo: "Palazzine (con le loro unità)", value: `palazzina:${p.id}`, label: p.nome })),
    ...unitaCtx.map((u) => ({
      gruppo: "Singole unità",
      value: `unita:${u.id}`,
      label: `${u.palazzina ? `${u.palazzina.nome} — ` : ""}${u.nome}${u.dataVendita ? " (venduta)" : ""}`,
    })),
    { gruppo: "Altro", value: "nessuno", label: "Non legate a un immobile" },
  ];

  // colonna "Riferimento"
  const riferimento = (s) => {
    if (s.unita)
      return (
        <>
          {s.unita.nome}
          <div className="text-xs text-gray-500">{s.unita.palazzina?.nome ?? "autonoma"}</div>
        </>
      );
    if (s.palazzina)
      return (
        <>
          {s.palazzina.nome}
          <div className="text-xs text-gray-500">intera palazzina</div>
        </>
      );
    if (s.rata)
      return (
        <>
          Generale
          <div className="text-xs text-gray-500">non legata a un immobile</div>
        </>
      );
    const { parti, criterio } = ripartisciGenerale(s, unitaCtx);
    return (
      <>
        <Tooltip
          contenuto={
            parti.length ? (
              <TooltipRighe
                titolo="Ripartizione nel bilancio"
                righe={parti.map((p) => [p.unita.nome, eur(p.importo)])}
                totale={["Totale", eur(s.importo)]}
                nota={`Ripartita ${criterio}.`}
              />
            ) : (
              "Nessuna unità in possesso nell'anno di competenza: la spesa resta non ripartita."
            )
          }
        >
          Tutti gli immobili
        </Tooltip>
        <div className="text-xs text-gray-500">ripartita nel bilancio</div>
      </>
    );
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Spese</h1>
        <div className="flex gap-2">
          <Link href="/spese/bollette" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
            Bollette
          </Link>
          <Link href="/spese/ricorrenti" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
            Ricorrenti
          </Link>
          <Link href="/spese/dilazioni" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
            Dilazioni
          </Link>
          <Link href="/spese/nuova" className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus size={16} /> Nuova spesa
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {anni.map((a) => (
              <Link key={a} href={href({ anno: a })} className={chip(sel === String(a))}>
                {a} · {eur(somma(viste.filter((v) => v.s.anno === a)))}
              </Link>
            ))}
            <Link href={href({ anno: "tutti" })} className={chip(sel === "tutti")}>Tutti</Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <FiltroSelect nome="dest" valore={dest} etichetta="Immobile" opzioni={opzioni} />
            {dest !== "tutti" && (
              <Link href={href({ dest: "tutti" })} className="text-xs text-indigo-600 hover:underline">
                Togli il filtro
              </Link>
            )}
          </div>
        </div>

        {imu && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">IMU {sel}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Stima annua</p>
                <p className="text-lg font-semibold">{eur(imu.stima)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Versato</p>
                <p className="text-lg font-semibold">{eur(imu.versato)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Differenza (stima − versato)</p>
                <p className="text-lg font-semibold">{eur(imu.stima - imu.versato)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Scadenze: acconto 16 giugno, saldo 16 dicembre. La stima conta 12 mesi per ogni unità attiva, senza proporzioni per acquisti o vendite in corso d'anno.
              {imu.senzaAliquota > 0 && ` ${imu.senzaAliquota} unità con catasto ma senza aliquota IMU non sono incluse.`}
            </p>
          </section>
        )}

        {piano && piano.righe.length > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-semibold">Cedolare secca {sel}</h2>
            <p className="mb-3 text-xs text-gray-500">
              Stima sui canoni di competenza dell'anno, per i contratti con la cedolare attiva. Indicativa: la base ufficiale è la dichiarazione.
            </p>

            <table className="w-full">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Contratto</th>
                  <th className="text-right">Canone di competenza</th>
                  <th className="text-right">Aliquota</th>
                  <th className="text-right">Imposta</th>
                </tr>
              </thead>
              <tbody>
                {piano.righe.map((x) => (
                  <tr key={x.id} className="border-t border-gray-100 text-sm">
                    <td className="py-2">
                      <Link href={`/entrate/contratti/${x.id}`} className="hover:underline">{x.unita}</Link>
                      <div className="text-xs text-gray-500">{x.inquilino}</div>
                    </td>
                    <td className="text-right">{eur(x.base)}</td>
                    <td className="text-right">{x.aliquota}%</td>
                    <td className="text-right">{eur(x.imposta)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300 text-sm font-semibold">
                  <td className="pt-2">Imposta stimata {sel}</td>
                  <td className="pt-2 text-right">{eur(piano.base)}</td>
                  <td />
                  <td className="pt-2 text-right">{eur(piano.imposta)}</td>
                </tr>
              </tfoot>
            </table>

            {piano.occupazione > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Esclusi {eur(piano.occupazione)} di indennità di occupazione oltre la scadenza dei contratti: verifica il trattamento con il commercialista.
              </p>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Imposta {sel}</p>
                <p className="font-semibold">{eur(piano.imposta)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Già versato (anno di competenza {sel})</p>
                <p className="font-semibold">{eur(piano.versato)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">In dilazione</p>
                <p className="font-semibold">{eur(piano.dilazionata)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ancora da versare</p>
                <p className="font-semibold">{eur(Math.max(piano.residuo, 0))}</p>
              </div>
            </div>

            <h3 className="mb-2 mt-5 text-xs font-medium text-gray-600">Piano dei versamenti</h3>
            <ul className="space-y-2">
              {piano.rate.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {r.titolo} · entro il {dataIt(r.scadenza)} <span className="text-xs text-gray-500">(codice {r.codice})</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <b>{eur(Math.abs(r.importo))}</b>
                    {r.importo > 0 && (
                      <Link href={regLink(r, piano.anno)} className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50">
                        Registra versamento
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Gli acconti si calcolano sull'imposta stimata dell'anno precedente ({eur(piano.acconto)})
              {piano.primoAnno && ": se è il primo anno di cedolare non sono dovuti"}. L'anno di competenza è già compilato nel versamento, anche
              per il saldo che si paga l'anno dopo.
            </p>
            <p className="mt-3 text-xs text-gray-500">
              Non hai versato entro la scadenza e ti hanno proposto una rateizzazione?{" "}
              <Link
                href={`/spese/dilazioni/nuova?anno=${piano.anno}&importo=${Math.max(piano.residuo, 0).toFixed(2)}`}
                className="text-indigo-600 hover:underline"
              >
                Crea la dilazione
              </Link>
              : l'imposta coperta dal piano esce dal «da versare» e le rate che paghi finiscono nelle spese.
            </p>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-semibold">Elenco spese</h2>
              {destEtichetta && <p className="text-xs text-gray-500">Immobile: {destEtichetta}</p>}
            </div>
            <p className="text-xs text-gray-500">
              Totale periodo <b className="text-gray-800">{eur(somma(delPeriodo))}</b>
            </p>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <Link href={href({ cat: "tutte" })} className={chip(cat === "tutte")}>Tutte</Link>
            {Object.entries(CATEGORIE).map(([k, v]) => (
              <Link key={k} href={href({ cat: k })} className={chip(cat === k)}>
                {v} · {eur(somma(delPeriodo.filter((x) => x.s.categoria === k)))}
              </Link>
            ))}
          </div>

          {perPal.size > 0 && (
            <p className="mb-4 text-xs text-gray-500">
              Per palazzina:{" "}
              {[...perPal.values()].map((x, i) => (
                <span key={x.nome}>
                  {i > 0 && " · "}
                  {x.pid ? (
                    <Link href={href({ dest: `palazzina:${x.pid}` })} className="hover:text-indigo-700 hover:underline">{x.nome}</Link>
                  ) : (
                    x.nome
                  )}{" "}
                  <b className="text-gray-800">{eur(r2(x.tot))}</b>
                </span>
              ))}
            </p>
          )}

          {dT === "unita" && destValida && (
            <p className="mb-3 text-xs text-gray-500">
              Le spese registrate sull'intera palazzina non sono incluse: scegli la palazzina per vederle.
            </p>
          )}

          {filtrate.length === 0 ? (
            <p className="text-sm text-gray-500">Nessuna spesa in questo periodo.</p>
          ) : (
            <table className="w-full">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Data</th>
                  <th>Categoria</th>
                  <th>Riferimento</th>
                  <th>Descrizione</th>
                  <th className="text-right">Importo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtrate.map(({ s, importo, quota }) => (
                  <tr key={s.id} className="border-t border-gray-100 text-sm">
                    <td className="py-3 pr-4">{dataIt(s.data)}</td>
                    <td className="pr-4">{CATEGORIE[s.categoria]}</td>
                    <td className="pr-4">{riferimento(s)}</td>
                    <td className="pr-4 text-gray-600">
                      {s.descrizione}
                      {s.ricorrenteId && <span className="ml-1 text-xs text-indigo-600" title="Spesa ricorrente">↻</span>}
                      {s.fornitore && <div className="text-xs text-gray-500">{s.fornitore}</div>}
                    </td>
                    <td className="text-right">
                      {eur(importo)}
                      {quota && <div className="text-xs text-gray-500">quota di {eur(s.importo)}</div>}
                    </td>
                    <td className="pl-2">
                      <div className="flex justify-end gap-1">
                        {s.rata ? (
                          <Link href={`/spese/dilazioni/${s.rata.dilazioneId}`} className="text-xs text-indigo-600 hover:underline">
                            dilazione
                          </Link>
                        ) : (
                          <>
                            <Link
                              href={`/spese/${s.id}/modifica`}
                              className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                              title="Modifica"
                            >
                              <Pencil size={16} />
                            </Link>
                            <BottoneElimina action={eliminaSpesa.bind(null, s.id)} messaggio="Eliminare questa spesa?" />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-sm font-semibold">
                  <td className="pt-3" colSpan={4}>Totale filtrato</td>
                  <td className="pt-3 text-right">{eur(somma(filtrate))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </section>
      </div>
    </>
  );
}