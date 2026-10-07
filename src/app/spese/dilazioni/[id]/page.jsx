import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { eur, dataIt } from "@/lib/format";
import FormDilazione from "@/components/FormDilazione";
import BottoneElimina from "@/components/BottoneElimina";
import BottoneConferma from "@/components/BottoneConferma";
import {
  aggiungiRata,
  aggiornaRata,
  segnaRataPagata,
  annullaPagamentoRata,
  eliminaRata,
  eliminaDilazione,
} from "../actions";

export const dynamic = "force-dynamic";

const iso = (d) => d.toISOString().slice(0, 10);
const mini =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

export default async function Scheda({ params }) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const d = await prisma.dilazioneImposta.findUnique({
    where: { id: Number(id) },
    include: { rate: { orderBy: [{ scadenza: "asc" }, { numero: "asc" }] } },
  });
  if (!d) notFound();

  const totale = d.rate.reduce((t, r) => t + r.importo, 0);
  const pagato = d.rate
    .filter((r) => r.pagataIl)
    .reduce((t, r) => t + r.importo, 0);
  const extra = totale - d.impostaOriginaria;
  const oggiD = new Date();
  oggiD.setUTCHours(0, 0, 0, 0);
  const oggi = iso(oggiD);

  const Dato = ({ label, value, tono }) => (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${tono ?? ""}`}>{value}</p>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/spese/dilazioni"
            className="text-xs text-gray-500 hover:underline"
          >
            ← Dilazioni
          </Link>
          <h1 className="text-2xl font-bold">{d.descrizione}</h1>
          <p className="text-sm text-gray-500">
            Cedolare secca, anno d'imposta {d.anno}
          </p>
        </div>
        <BottoneElimina
          action={eliminaDilazione.bind(null, d.id)}
          messaggio="Eliminare il piano? Le spese create dalle rate già pagate vengono eliminate."
        />
      </div>

      <section className={card}>
        <div className="grid gap-4 sm:grid-cols-5">
          <Dato label="Imposta originaria" value={eur(d.impostaOriginaria)} />
          <Dato label="Totale delle rate" value={eur(totale)} />
          <Dato
            label="Interessi e sanzioni"
            value={eur(extra)}
            tono={extra > 0.005 ? "text-red-700" : ""}
          />
          <Dato label="Già pagato" value={eur(pagato)} />
          <Dato label="Ancora da pagare" value={eur(totale - pagato)} />
        </div>
        {extra < -0.005 && (
          <p className="mt-3 text-xs text-amber-700">
            Il totale delle rate è inferiore all'imposta: controlla gli importi
            delle rate.
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Rate</h2>
        <div className="space-y-2">
          {d.rate.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2">
              <span className="w-6 text-xs text-gray-500">{r.numero}</span>
              <form
                action={aggiornaRata.bind(null, r.id, d.id)}
                className="flex items-center gap-2"
              >
                <input
                  type="date"
                  name="scadenza"
                  defaultValue={iso(r.scadenza)}
                  required
                  className={mini}
                />
                <input
                  type="number"
                  step="0.01"
                  name="importo"
                  defaultValue={r.importo}
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
              {r.pagataIl ? (
                <>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Pagata il {dataIt(r.pagataIl)}
                  </span>
                  <BottoneConferma
                    action={annullaPagamentoRata.bind(null, r.id, d.id)}
                    messaggio="Annullare il pagamento? La spesa collegata viene eliminata."
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Annulla
                  </BottoneConferma>
                </>
              ) : (
                <form
                  action={segnaRataPagata.bind(null, r.id, d.id)}
                  className="flex items-center gap-2"
                >
                  <input
                    type="date"
                    name="data"
                    defaultValue={oggi}
                    required
                    className={mini}
                  />
                  <button className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50">
                    Segna pagata
                  </button>
                  {r.scadenza < oggiD && (
                    <span className="text-xs text-red-700">scaduta</span>
                  )}
                </form>
              )}
              <BottoneElimina
                action={eliminaRata.bind(null, r.id, d.id)}
                messaggio="Eliminare questa rata?"
              />
            </div>
          ))}
        </div>
        <form
          action={aggiungiRata.bind(null, d.id)}
          className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4"
        >
          <input type="date" name="scadenza" required className={mini} />
          <input
            type="number"
            step="0.01"
            name="importo"
            required
            placeholder="Importo (€)"
            className={`${mini} w-32`}
          />
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
            Aggiungi rata
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-500">
          Segnando una rata come pagata viene creata una spesa «Cedolare secca»
          alla data indicata, che compare nei grafici di cassa. Se hai già
          pagato rate negli anni scorsi, segnale con la data reale in cui le hai
          pagate.
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Dati del piano</h2>
        <FormDilazione piano={d} />
      </section>
    </div>
  );
}
