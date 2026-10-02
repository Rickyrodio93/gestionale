import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { statoScadenza, coloriScadenza, rinnovaFine } from "@/lib/scadenze";
import { eur, dataIt } from "@/lib/format";
import { inputCls } from "@/lib/ui";
import BottoneConferma from "@/components/BottoneConferma";
import {
  segnaDisdetta,
  annullaDisdetta,
  rinnovaContratto,
  eliminaContratto,
} from "@/app/entrate/actions";

export const dynamic = "force-dynamic";

const testo = {
  ok: "Nessuna azione richiesta per ora",
  attenzione: "Si avvicina il termine per la disdetta",
  urgente: "Termine per la disdetta imminente",
  termine_superato: "Il preavviso non è più rispettabile per questa scadenza",
  scaduto: "Contratto scaduto",
  disdetta_inviata: "Disdetta inviata",
};

const giorni = (n) => (n >= 0 ? `tra ${n} giorni` : `${Math.abs(n)} giorni fa`);

function Dato({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium">{children || "—"}</dd>
    </div>
  );
}

const tipi = {
  QUATTRO_PIU_QUATTRO: "4+4 canone libero",
  CONCORDATO_3_2: "3+2 canone concordato",
  TRANSITORIO: "Transitorio",
  ALTRO: "Altro",
};

export default async function Scheda({ params }) {
  const { id } = await params;
  const cid = Number(id);
  const c = await prisma.contratto.findUnique({
    where: { id: cid },
    include: { inquilino: true, unita: { include: { palazzina: true } } },
  });
  if (!c) notFound();

  const nQuote = await prisma.quota.count({ where: { contrattoId: cid } });
  const s = statoScadenza(c);
  const oggi = new Date().toISOString().slice(0, 10);
  const btn =
    "inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50";

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/entrate"
            className="text-xs text-gray-500 hover:underline"
          >
            ← Entrate
          </Link>
          <h1 className="text-2xl font-bold">{c.unita.nome}</h1>
          <p className="text-sm text-gray-500">
            {c.unita.palazzina?.nome ?? "Unità autonoma"} · {c.inquilino.nome}
          </p>
        </div>
        <Link href={`/entrate/contratti/${c.id}/modifica`} className={btn}>
          <Pencil size={14} /> Modifica
        </Link>
      </div>

      {s && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${coloriScadenza[s.livello]}`}
          >
            {testo[s.livello]}
          </span>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">
                Ultimo giorno per la disdetta
              </p>
              <p className="text-lg font-semibold">{dataIt(s.limite)}</p>
              <p className="text-xs text-gray-500">
                {giorni(s.giorniAlLimite)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Scadenza del contratto</p>
              <p className="text-lg font-semibold">{dataIt(s.scadenza)}</p>
              <p className="text-xs text-gray-500">
                {giorni(s.giorniAllaScadenza)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            La comunicazione deve arrivare entro il termine, non solo essere
            spedita: conviene lasciare un margine.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Dati del contratto</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Dato label="Tipologia">{tipi[c.modalita]}</Dato>
          <Dato label="Inizio">{dataIt(c.dataInizio)}</Dato>
          <Dato label="Fine">{dataIt(c.dataFine)}</Dato>
          <Dato label="Durata">{c.durataMesi && `${c.durataMesi} mesi`}</Dato>
          <Dato label="Rinnovo">
            {c.rinnovoMesi && `${c.rinnovoMesi} mesi`}
          </Dato>
          <Dato label="Rinnovi effettuati">{c.rinnovi}</Dato>
          <Dato label="Preavviso">{c.preavvisoMesi} mesi</Dato>
          <Dato label="Canone mensile">
            {c.canone != null && eur(c.canone)}
          </Dato>
          <Dato label="Cedolare secca">{c.cedolare ? "Sì" : "No"}</Dato>
          <Dato label="Persone">{c.persone}</Dato>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Disdetta e rinnovo</h2>

        {c.disdettaInviataIl ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">
              Disdetta inviata il <b>{dataIt(c.disdettaInviataIl)}</b>
              {c.disdettaNote && (
                <span className="text-gray-500"> · {c.disdettaNote}</span>
              )}
            </p>
            <BottoneConferma
              action={annullaDisdetta.bind(null, c.id)}
              messaggio="Annullare la disdetta registrata?"
              className={btn}
            >
              Annulla disdetta
            </BottoneConferma>
          </div>
        ) : (
          <form
            action={segnaDisdetta.bind(null, c.id)}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Data invio
              </span>
              <input
                type="date"
                name="data"
                defaultValue={oggi}
                className={inputCls}
              />
            </label>
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Note (motivo, raccomandata/PEC…)
              </span>
              <input name="note" className={inputCls} />
            </label>
            <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Segna disdetta inviata
            </button>
          </form>
        )}

        {!c.disdettaInviataIl && c.dataFine && c.rinnovoMesi && (
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600">
              Rinnovo di {c.rinnovoMesi} mesi: nuova scadenza{" "}
              <b>{dataIt(rinnovaFine(c.dataFine, c.rinnovoMesi))}</b>
            </p>
            <BottoneConferma
              action={rinnovaContratto.bind(null, c.id)}
              messaggio="Rinnovare il contratto e spostare la scadenza?"
              className={btn}
            >
              <RefreshCw size={14} /> Rinnova
            </BottoneConferma>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold">Elimina contratto</h2>
        {nQuote > 0 ? (
          <p className="text-sm text-gray-500">
            Ha {nQuote} quote di bollette collegate, quindi non può essere
            eliminato senza perdere lo storico. Se il rapporto è concluso,
            imposta la data di fine con Modifica.
          </p>
        ) : (
          <BottoneConferma
            action={eliminaContratto.bind(null, c.id)}
            messaggio="Eliminare definitivamente questo contratto?"
            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} /> Elimina
          </BottoneConferma>
        )}
      </section>
    </div>
  );
}
