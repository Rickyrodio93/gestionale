import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { statoScadenza, coloriScadenza } from "@/lib/scadenze";
import { eur, dataIt } from "@/lib/format";
import BottoneElimina from "@/components/BottoneElimina";
import { eliminaIncasso } from "./actions";
import { etichetta } from "@/lib/scadenze";
import { situazioneCanoni } from "@/lib/canoni";

export const dynamic = "force-dynamic";

export default async function Entrate({ searchParams }) {
  const sp = await searchParams;

  const contratti = await prisma.contratto.findMany({
    where: { tipo: "LUNGO" },
    include: {
      inquilino: true,
      canoni: true,
      unita: { include: { palazzina: true } },
    },
    orderBy: { dataFine: "asc" },
  });

  const totaleCanoni = contratti
    .filter((c) => {
      const lv = statoScadenza(c)?.livello;
      return lv !== "concluso" && lv !== "rinnovato";
    })
    .reduce((t, c) => t + (c.canone ?? 0), 0);

  const cauzioni = contratti
    .filter((c) => c.cauzione && c.cauzioneVersataIl && !c.cauzioneRestituitaIl)
    .reduce((t, c) => t + c.cauzione, 0);

  const tutti = await prisma.incasso.findMany({
    include: { unita: true },
    orderBy: { data: "desc" },
  });
  const annoCorrente = new Date().getFullYear();

  // totali per anno di accredito
  const perAnno = { [annoCorrente]: 0 };
  for (const i of tutti) {
    const a = i.data.getFullYear();
    perAnno[a] = (perAnno[a] ?? 0) + i.importo;
  }
  const anni = Object.keys(perAnno)
    .map(Number)
    .sort((a, b) => b - a);

  const sel = sp.anno ?? String(annoCorrente);
  const incassi =
    sel === "tutti"
      ? tutti
      : tutti.filter((i) => i.data.getFullYear() === Number(sel));
  const totaleSel = incassi.reduce((t, i) => t + i.importo, 0);
  const totaleGenerale = tutti.reduce((t, i) => t + i.importo, 0);

  const chip = (attivo) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      attivo
        ? "border-indigo-300 bg-indigo-100 text-indigo-800"
        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Entrate</h1>
        <div className="flex gap-2">
          <Link
            href="/entrate/contratti/nuovo"
            className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> Nuovo contratto
          </Link>

          <Link
            href="/entrate/contratti/nuovo?modalita=TRANSITORIO"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Nuovo transitorio
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-semibold">Affitti lunghi</h2>
            <p className="text-xs text-gray-500">
              {contratti.length} contratti · canoni mensili{" "}
              <b className="text-gray-800">{eur(totaleCanoni)}</b>· cauzioni
              detenute <b className="text-gray-800">{eur(cauzioni)}</b>
            </p>
          </div>
          <table className="w-full">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="pb-2">Unità</th>
                <th>Inquilino</th>
                <th>Periodo</th>
                <th className="text-right">Canone</th>
                <th className="pl-4">Disdetta</th>
                <th className="pl-4">Canoni</th>
                <th className="pl-4">Cauzione</th>

                <th />
              </tr>
            </thead>
            <tbody>
              {contratti.map((c) => {
                const s = statoScadenza(c);
                return (
                  <tr key={c.id} className="border-t border-gray-100 text-sm">
                    <td className="py-3 pr-4 font-medium">
                      <Link
                        href={`/entrate/contratti/${c.id}`}
                        className="hover:text-indigo-700 hover:underline"
                      >
                        {c.unita.nome}
                      </Link>
                      <div className="text-xs font-normal text-gray-500">
                        {c.unita.palazzina?.nome ?? "autonoma"}
                      </div>
                    {c.modalita === "TRANSITORIO" && (
                      <span className="ml-1 rounded bg-cyan-100 px-1.5 py-0.5 text-[11px] font-medium text-cyan-800">
                        transitorio
                      </span>
                    )}
                    </td>
                    <td className="pr-4">
                      <Link
                        href={`/entrate/inquilini/${c.inquilinoId}`}
                        className="hover:underline"
                      >
                        {c.inquilino.nome}
                      </Link>
                      {c.inquilino.tipo === "SOCIETA" && (
                        <span className="ml-1 text-xs text-gray-500">
                          (società)
                        </span>
                      )}
                    </td>
                    <td className="pr-4">
                      {dataIt(c.dataInizio)} → {dataIt(c.dataFine)}
                    </td>
                    <td className="pr-4 text-right">{eur(c.canone)}</td>
                    <td className="pl-4">
                      {s ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${coloriScadenza[s.livello]}`}
                        >
                          {etichetta(s)}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">
                          dati mancanti
                        </span>
                      )}
                    </td>
                    <td className="pl-4 text-xs">
                      {c.canone == null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        (() => {
                          const a = situazioneCanoni(c).arretrati;
                          return a > 0 ? (
                            <span className="font-medium text-red-700">
                              arretrati {eur(a)}
                            </span>
                          ) : (
                            <span className="text-green-700">in regola</span>
                          );
                        })()
                      )}
                    </td>
                    <td className="pl-4 yext-xs text-gray-600">
                      {c.cauzione == null ? (
                        "-"
                      ) : c.cauzioneRestituitaIl ? (
                        "liquidata"
                      ) : c.cauzioneVersataIl ? (
                        eur(c.cauzione)
                      ) : (
                        <span className="text-amber-600">da versare</span>
                      )}
                    </td>
                    <td className="pl-2 text-right">
                      <Link
                        href={`/entrate/contratti/${c.id}/modifica`}
                        className="inline-flex p-1.5 text-gray-500 hover:bg-gray-100"
                        title="Modifica"
                      >
                        <Pencil size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-semibold">Affitti brevi</h2>
              <p className="text-xs text-gray-500">
                Netto accreditato · totale complessivo{" "}
                <b className="text-gray-800">{eur(totaleGenerale)}</b>
              </p>
            </div>
            <Link
              href="/entrate/incassi/nuovo"
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              <Plus size={16} /> Registra incasso
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {anni.map((a) => (
              <Link
                key={a}
                href={`/entrate?anno=${a}`}
                className={chip(sel === String(a))}
              >
                {a} · {eur(perAnno[a])}
              </Link>
            ))}
            <Link href="/entrate?anno=tutti" className={chip(sel === "tutti")}>
              Tutti
            </Link>
          </div>

          {incassi.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nessun incasso in questo periodo.
            </p>
          ) : (
            <table className="w-full">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Competenza</th>
                  <th>Unità</th>
                  <th>Accredito</th>
                  <th className="text-right">Netto</th>
                  <th className="pl-4">Note</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {incassi.map((i) => (
                  <tr key={i.id} className="border-t border-gray-100 text-sm">
                    <td className="py-3 pr-4 capitalize">
                      {new Date(i.mese + "-01").toLocaleDateString("it-IT", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="pr-4">{i.unita.nome}</td>
                    <td className="pr-4">{dataIt(i.data)}</td>
                    <td className="text-right">{eur(i.importo)}</td>
                    <td className="pl-4 text-gray-500">{i.note}</td>
                    <td className="pl-2">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/entrate/incassi/${i.id}/modifica`}
                          className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                          title="Modifica"
                        >
                          <Pencil size={16} />
                        </Link>
                        <BottoneElimina
                          action={eliminaIncasso.bind(null, i.id)}
                          messaggio="Eliminare questo incasso?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-sm font-semibold">
                  <td className="pt-3" colSpan={3}>
                    Totale {sel === "tutti" ? "complessivo" : sel}
                  </td>
                  <td className="pt-3 text-right">{eur(totaleSel)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
