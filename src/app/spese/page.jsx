import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { imuStimata } from "@/lib/imu";
import { eur, dataIt } from "@/lib/format";
import { CATEGORIE } from "@/lib/spese";
import BottoneElimina from "@/components/BottoneElimina";
import { eliminaSpesa } from "./actions";
import { sincronizzaRicorrenti } from "@/lib/ricorrenti";

export const dynamic = "force-dynamic";

const somma = (arr) => arr.reduce((t, s) => t + s.importo, 0);

export default async function Spese({ searchParams }) {
  const sp = await searchParams;
  await sincronizzaRicorrenti();

  const tutte = await prisma.spesa.findMany({
    include: { unita: { include: { palazzina: true } }, palazzina: true },
    orderBy: { data: "desc" },
  });

  const annoCorrente = new Date().getFullYear();
  const anni = [...new Set([annoCorrente, ...tutte.map((s) => s.anno)])].sort(
    (a, b) => b - a,
  );
  const sel = sp.anno ?? String(annoCorrente);
  const cat = sp.cat ?? "tutte";

  const delPeriodo =
    sel === "tutti" ? tutte : tutte.filter((s) => s.anno === Number(sel));
  const filtrate =
    cat === "tutte"
      ? delPeriodo
      : delPeriodo.filter((s) => s.categoria === cat);

  // totali per palazzina (spese sulla palazzina + spese sulle sue unità)
  const perPalazzina = {};
  for (const s of delPeriodo) {
    const nome =
      s.palazzina?.nome ?? s.unita?.palazzina?.nome ?? "Unità autonome";
    perPalazzina[nome] = (perPalazzina[nome] ?? 0) + s.importo;
  }

  // stima IMU vs versato (solo con un anno selezionato)
  let imu = null;
  if (sel !== "tutti") {
    const conCatasto = await prisma.unita.findMany({
      where: { dataVendita: null, catasto: { isNot: null } },
      include: { catasto: true },
    });
    const stime = conCatasto.map((u) => imuStimata(u.catasto));
    const stima = stime.reduce((t, v) => t + (v ?? 0), 0);
    const senzaAliquota = stime.filter((v) => v == null).length;
    const versato = somma(delPeriodo.filter((s) => s.categoria === "IMU"));
    imu = { stima, versato, senzaAliquota };
  }

  const link = (a, c) => `/spese?anno=${a}&cat=${c}`;
  const chip = (attivo) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      attivo
        ? "border-indigo-300 bg-indigo-100 text-indigo-800"
        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Spese</h1>
        <div className="flex gap-2">
          <Link
            href="/spese/bollette"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Bollette
          </Link>
          <Link
            href="/spese/ricorrenti"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Ricorrenti
          </Link>
          <Link
            href="/spese/nuova"
            className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> Nuova spesa
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {anni.map((a) => (
            <Link
              key={a}
              href={link(a, cat)}
              className={chip(sel === String(a))}
            >
              {a} · {eur(somma(tutte.filter((s) => s.anno === a)))}
            </Link>
          ))}
          <Link href={link("tutti", cat)} className={chip(sel === "tutti")}>
            Tutti
          </Link>
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
                <p className="text-xs text-gray-500">
                  Differenza (stima − versato)
                </p>
                <p className="text-lg font-semibold">
                  {eur(imu.stima - imu.versato)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Scadenze: acconto 16 giugno, saldo 16 dicembre. La stima conta 12
              mesi per ogni unità attiva, senza proporzioni per acquisti o
              vendite in corso d&apos;anno.
              {imu.senzaAliquota > 0 &&
                ` ${imu.senzaAliquota} unità con catasto ma senza aliquota IMU non sono incluse.`}
            </p>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-semibold">Elenco spese</h2>
            <p className="text-xs text-gray-500">
              Totale periodo{" "}
              <b className="text-gray-800">{eur(somma(delPeriodo))}</b>
            </p>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <Link href={link(sel, "tutte")} className={chip(cat === "tutte")}>
              Tutte
            </Link>
            {Object.entries(CATEGORIE).map(([k, v]) => (
              <Link key={k} href={link(sel, k)} className={chip(cat === k)}>
                {v} · {eur(somma(delPeriodo.filter((s) => s.categoria === k)))}
              </Link>
            ))}
          </div>

          {Object.keys(perPalazzina).length > 0 && (
            <p className="mb-4 text-xs text-gray-500">
              Per palazzina:{" "}
              {Object.entries(perPalazzina).map(([n, t], i) => (
                <span key={n}>
                  {i > 0 && " · "}
                  {n} <b className="text-gray-800">{eur(t)}</b>
                </span>
              ))}
            </p>
          )}

          {filtrate.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nessuna spesa in questo periodo.
            </p>
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
                {filtrate.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 text-sm">
                    <td className="py-3 pr-4">{dataIt(s.data)}</td>
                    <td className="pr-4">{CATEGORIE[s.categoria]}</td>
                    <td className="pr-4">
                      {s.unita ? (
                        <>
                          {s.unita.nome}
                          <div className="text-xs text-gray-500">
                            {s.unita.palazzina?.nome ?? "autonoma"}
                          </div>
                        </>
                      ) : (
                        <>
                          {s.palazzina.nome}
                          <div className="text-xs text-gray-500">
                            intera palazzina
                          </div>
                        </>
                      )}
                    </td>
                    <td className="pr-4 text-gray-600">
                      {s.descrizione}
                      {s.ricorrenteId && (
                        <span
                          className="ml-1 text-xs text-indigo-600"
                          title="Spesa ricorrente"
                        >
                          ↻
                        </span>
                      )}
                      {s.fornitore && (
                        <div className="text-xs text-gray-500">
                          {s.fornitore}
                        </div>
                      )}
                    </td>
                    <td className="text-right">{eur(s.importo)}</td>
                    <td className="pl-2">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/spese/${s.id}/modifica`}
                          className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                          title="Modifica"
                        >
                          <Pencil size={16} />
                        </Link>
                        <BottoneElimina
                          action={eliminaSpesa.bind(null, s.id)}
                          messaggio="Eliminare questa spesa?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-sm font-semibold">
                  <td className="pt-3" colSpan={4}>
                    Totale filtrato
                  </td>
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
