import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { eur, dataIt } from "@/lib/format";
import { inputCls } from "@/lib/ui";
import {
  TIPI,
  METODI,
  STATI,
  totaliBolletta,
  statoBolletta,
} from "@/lib/bollette";
import BottoneElimina from "@/components/BottoneElimina";
import {
  aggiungiPagamento,
  aggiornaPagamento,
  eliminaPagamento,
  eliminaBolletta,
} from "../actions";

export const dynamic = "force-dynamic";

const iso = (d) => d.toISOString().slice(0, 10);
const mini =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export default async function Scheda({ params }) {
  const { id } = await params;
  const b = await prisma.bolletta.findUnique({
    where: { id: Number(id) },
    include: {
      palazzina: true,
      unita: { include: { palazzina: true } },
      quote: {
        include: {
          contratto: { include: { inquilino: true, unita: true } },
          pagamenti: { orderBy: { data: "asc" } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!b) notFound();

  const t = totaliBolletta(b);
  const stato = statoBolletta(b, t);
  const oggi = iso(new Date());
  const rif = b.unita
    ? b.unita.nome
    : `${b.palazzina?.nome} (intera palazzina)`;
  const pct = (p) =>
    p != null ? `${(p * 100).toFixed(1).replace(".", ",")}%` : "";

  const Dato = ({ label, value }) => (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/spese/bollette"
            className="text-xs text-gray-500 hover:underline"
          >
            ← Bollette
          </Link>
          <h1 className="text-2xl font-bold">
            {TIPI[b.tipo]} · {dataIt(b.dal)} → {dataIt(b.al)}
          </h1>
          <p className="text-sm text-gray-500">
            {rif}
            {b.fornitore && ` · ${b.fornitore}`}
            {b.numero && ` · n° ${b.numero}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/spese/bollette/${b.id}/modifica`}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            <Pencil size={14} /> Modifica
          </Link>
          <BottoneElimina
            action={eliminaBolletta.bind(null, b.id)}
            messaggio="Eliminare la bolletta con le sue quote e i pagamenti registrati?"
          />
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATI[stato][1]}`}
          >
            {STATI[stato][0]}
          </span>
          <span className="text-xs text-gray-500">{METODI[b.metodo]}</span>
          {b.dataPagamento && (
            <span className="text-xs text-gray-500">
              Pagata al fornitore il {dataIt(b.dataPagamento)}
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Dato label="Importo bolletta" value={eur(b.importo)} />
          <Dato label="A mio carico" value={eur(t.aCarico)} />
          <Dato label="Rimborsato" value={eur(t.rimborsato)} />
          <Dato label="Ancora da incassare" value={eur(t.daIncassare)} />
        </div>
        {b.note && <p className="mt-3 text-sm text-gray-600">{b.note}</p>}
      </section>

      {b.quote.map((q) => {
        const pagato = q.pagamenti.reduce((s, p) => s + p.importo, 0);
        const resto = Math.round((q.importo - pagato) * 100) / 100;
        const st =
          resto <= 0.005
            ? "rimborsata"
            : pagato > 0
              ? "parziale"
              : "da_incassare";
        return (
          <section
            key={q.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="font-semibold">{q.contratto.inquilino.nome}</h2>
                <p className="text-xs text-gray-500">
                  {q.contratto.unita.nome}
                  {q.persone != null && ` · ${q.persone} persone`}
                  {q.consumo != null &&
                    ` · lettura ${q.letturaIniziale} → ${q.letturaFinale} (consumo ${Math.round(q.consumo * 1000) / 1000})`}
                  {q.percentuale != null && ` · ${pct(q.percentuale)}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATI[st][1]}`}
              >
                {STATI[st][0]}
              </span>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <Dato label="Quota" value={eur(q.importo)} />
              <Dato label="Pagato" value={eur(pagato)} />
              <Dato label="Rimanente" value={eur(Math.max(resto, 0))} />
            </div>

            <div className="space-y-2">
              {q.pagamenti.map((p) =>
                p.versamentoId ? (
                  <p key={p.id} className="text-sm text-gray-500">
                    {dataIt(p.data)} · {eur(p.importo)} · da versamento{" "}
                    <Link
                      href={`/entrate/inquilini/${q.contratto.inquilinoId}`}
                      className="text-indigo-600 hover:underline"
                    >
                      (vedi report)
                    </Link>
                  </p>
                ) : (
                  <div key={p.id} className="flex items-center gap-2">
                    <form
                      action={aggiornaPagamento.bind(null, p.id, b.id)}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="date"
                        name="data"
                        defaultValue={iso(p.data)}
                        required
                        className={mini}
                      />
                      <input
                        type="number"
                        step="0.01"
                        name="importo"
                        defaultValue={p.importo}
                        required
                        className={`${mini} w-28`}
                      />
                      <button
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                        title="Salva modifica"
                      >
                        <Check size={16} />
                      </button>
                    </form>
                    <BottoneElimina
                      action={eliminaPagamento.bind(null, p.id, b.id)}
                      messaggio="Eliminare questo pagamento?"
                    />
                  </div>
                ),
              )}
            </div>

            <form
              action={aggiungiPagamento.bind(null, q.id, b.id)}
              className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3"
            >
              <input
                type="date"
                name="data"
                defaultValue={oggi}
                required
                className={mini}
              />
              <input
                type="number"
                step="0.01"
                name="importo"
                defaultValue={resto > 0 ? resto.toFixed(2) : ""}
                required
                placeholder="Importo"
                className={`${mini} w-28`}
              />
              <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
                Registra pagamento
              </button>
            </form>
          </section>
        );
      })}

      {b.quote.length === 0 && (
        <p className="text-sm text-gray-500">
          Nessuna ripartizione: la bolletta è interamente a tuo carico.
        </p>
      )}
    </div>
  );
}
