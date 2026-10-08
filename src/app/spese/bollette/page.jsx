import Link from "next/link";
import { Plus, Pencil, ArrowLeft, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { eur, dataIt } from "@/lib/format";
import { TIPI, STATI, totaliBolletta, statoBolletta } from "@/lib/bollette";
import BottoneElimina from "@/components/BottoneElimina";
import { eliminaBolletta } from "./actions";

export const dynamic = "force-dynamic";

const Card = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-lg font-semibold">{eur(value)}</p>
  </div>
);

export default async function Bollette({ searchParams }) {
  const sp = await searchParams;

  const db = await prisma.bolletta.findMany({
    include: {
      palazzina: true,
      unita: { include: { palazzina: true } },
      quote: { include: { pagamenti: true } },
    },
    orderBy: { al: "desc" },
  });
  const tutte = db.map((b) => {
    const t = totaliBolletta(b);
    return { ...b, t, stato: statoBolletta(b, t), anno: b.al.getFullYear() };
  });

  const annoCorrente = new Date().getFullYear();
  const anni = [...new Set([annoCorrente, ...tutte.map((b) => b.anno)])].sort(
    (a, b) => b - a,
  );
  const sel = sp.anno ?? String(annoCorrente);
  const solo = sp.stato === "daincassare";

  const periodo =
    sel === "tutti" ? tutte : tutte.filter((b) => b.anno === Number(sel));
  const righe = solo ? periodo.filter((b) => b.t.daIncassare > 0.005) : periodo;
  const tot = (f) => periodo.reduce((s, b) => s + f(b), 0);

  const link = (a, s) => `/spese/bollette?anno=${a}${s ? `&stato=${s}` : ""}`;
  const chip = (attivo) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      attivo
        ? "border-indigo-300 bg-indigo-100 text-indigo-800"
        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/spese" className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
            <ArrowLeft size={16} /> Spese
          </Link>
          <h1 className="text-2xl font-bold">Bollette</h1>
        </div>
        <Link
          href="/spese/bollette/nuova"
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Nuova bolletta
        </Link>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {anni.map((a) => (
            <Link
              key={a}
              href={link(a, sp.stato)}
              className={chip(sel === String(a))}
            >
              {a}
            </Link>
          ))}
          <Link
            href={link("tutti", sp.stato)}
            className={chip(sel === "tutti")}
          >
            Tutti
          </Link>
          <span className="mx-1 border-l border-gray-200" />
          <Link
            href={link(sel, solo ? "" : "daincassare")}
            className={chip(solo)}
          >
            Solo da incassare
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Card label="Totale bollette" value={tot((b) => b.importo)} />
          <Card label="A mio carico" value={tot((b) => b.t.aCarico)} />
          <Card
            label="Rimborsato dagli inquilini"
            value={tot((b) => b.t.rimborsato)}
          />
          <Card
            label="Ancora da incassare"
            value={tot((b) => b.t.daIncassare)}
          />
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {righe.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nessuna bolletta in questo periodo.
            </p>
          ) : (
            <table className="w-full">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Periodo</th>
                  <th>Bolletta</th>
                  <th>Riferimento</th>
                  <th className="text-right">Importo</th>
                  <th className="text-right">A mio carico</th>
                  <th className="text-right">Da incassare</th>
                  <th className="pl-4">Stato</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {righe.map((b) => (
                  <tr key={b.id} className="border-t border-gray-100 text-sm">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/spese/bollette/${b.id}`}
                        className="hover:text-indigo-700 hover:underline flex items-center gap-2"
                      >
                        {dataIt(b.dal)} <ArrowRight size={14}/> {dataIt(b.al)}
                      </Link>
                    </td>
                    <td className="pr-4">
                      {TIPI[b.tipo]}
                      <div className="text-xs text-gray-500">
                        {[b.fornitore, b.numero].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="pr-4">
                      {b.unita ? b.unita.nome : b.palazzina?.nome}
                      <div className="text-xs text-gray-500">
                        {b.unita
                          ? (b.unita.palazzina?.nome ?? "autonoma")
                          : "intera palazzina"}
                      </div>
                    </td>
                    <td className="text-right">{eur(b.importo)}</td>
                    <td className="text-right">{eur(b.t.aCarico)}</td>
                    <td className="text-right">
                      {b.stato === "carico" ? "—" : eur(b.t.daIncassare)}
                    </td>
                    <td className="pl-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATI[b.stato][1]}`}
                      >
                        {STATI[b.stato][0]}
                      </span>
                    </td>
                    <td className="pl-2">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/spese/bollette/${b.id}/modifica`}
                          className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                          title="Modifica"
                        >
                          <Pencil size={16} />
                        </Link>
                        <BottoneElimina
                          action={eliminaBolletta.bind(null, b.id)}
                          messaggio="Eliminare la bolletta con le sue quote e i pagamenti registrati?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
