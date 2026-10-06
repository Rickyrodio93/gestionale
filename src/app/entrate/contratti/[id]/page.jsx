import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, RefreshCw, Trash2, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { statoScadenza, coloriScadenza, rinnovaFine } from "@/lib/scadenze";
import { eur, dataIt } from "@/lib/format";
import { inputCls } from "@/lib/ui";
import BottoneConferma from "@/components/BottoneConferma";
import { situazioneCanoni, STATI_CANONE, etichettaPeriodo } from "@/lib/canoni";
import BottoneElimina from "@/components/BottoneElimina";
import { dataAcq } from "@/lib/investimento";
import { calcolaCauzione } from "@/lib/cauzione";
import FormRinnovo from "@/components/FormRinnovo";
import {
  segnaDisdetta,
  annullaDisdetta,
  rinnovaContratto,
  eliminaContratto,
} from "@/app/entrate/actions";
import {
  segnaOccupazione,
  annullaOccupazione,
  segnaRilascio,
  annullaRilascio,
  registraCanone,
  aggiornaCanone,
  eliminaCanone,
  incassaMesiMancanti,
  aggiungiTrattenuta,
  aggiornaTrattenuta,
  eliminaTrattenuta,
  liquidaCauzione,
  annullaLiquidazione,
} from "@/app/entrate/actions";

export const dynamic = "force-dynamic";

const testo = {
  ok: "Nessuna azione richiesta per ora",
  attenzione: "Si avvicina il termine per la disdetta",
  urgente: "Termine per la disdetta imminente",
  termine_superato: "Il preavviso non è più rispettabile per questa scadenza",
  scaduto: "Contratto scaduto",
  disdetta_inviata: "Disdetta inviata",
  in_occupazione: "Contratto scaduto: l'inquilino occupa ancora l'immobile",
  concluso: "Contratto concluso: immobile rilasciato",
  rinnovato: "Contratto rinnovato con nuove condizioni",
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
    include: {
      inquilino: true,
      unita: { include: { palazzina: true } },
      canoni: { orderBy: { data: "desc" } },
      quote: { include: { pagamenti: true } },
      trattenute: { orderBy: { id: "asc" } },
    },
  });
  if (!c) notFound();

  const nQuote =
    (await prisma.quota.count({ where: { contrattoId: cid } })) +
    (await prisma.pagamentoCanone.count({ where: { contrattoId: cid } })) +
    (c.cauzione && !c.cauzioneRestituitaIl ? 1 : 0);
  const s = statoScadenza(c);
  const oggi = new Date().toISOString().slice(0, 10);
  const sc = situazioneCanoni(c);
  const successivo = c.rinnovato
    ? await prisma.contratto.findFirst({
        where: { precedenteId: c.id },
        select: { id: true },
      })
    : null;
  const inizioRinnovo = c.dataFine
    ? new Date(c.dataFine.getTime() + 86400000).toISOString().slice(0, 10)
    : "";
  const scaduto = s && s.giorniAllaScadenza < 0;
  const primoAperto = sc.righe.find((r) => r.residuo > 0.005);
  const mini =
    "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
  const meseIt = (m) =>
    new Date(`${m}-01`).toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    });

  const PeriodoSel = ({ def }) =>
    sc.step > 1 ? (
      <select
        name="mese"
        defaultValue={def}
        required
        className={mini}
        title="Periodo di competenza"
      >
        {!sc.righe.some((r) => r.mese === def) && (
          <option value={def}>{def} (fuori periodo)</option>
        )}
        {[...sc.righe].reverse().map((r) => (
          <option key={r.mese} value={r.mese}>
            {etichettaPeriodo(r, sc.step)}
          </option>
        ))}
      </select>
    ) : (
      <input
        type="month"
        name="mese"
        defaultValue={def}
        required
        className={mini}
        title="Mese di competenza"
      />
    );
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
        <Link href={`/entrate/inquilini/${c.inquilinoId}`} className={btn}>
          Report inquilino
        </Link>
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
          {c.precedenteId && (
            <>
              ·{" "}
              <Link
                href={`/entrate/contratti/${c.precedenteId}`}
                className="text-indigo-600 hover:underline"
              >
                contratto precedente
              </Link>
            </>
          )}
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
          <Dato label="Pagamento canone">{sc.step === 1 ? "mensile" : `ogni ${sc.step} mesi, in anticipo`}</Dato>
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

      {(c.rinnovato || (c.dataFine && !c.dataRilascio)) && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold">Rinnovo con nuove condizioni</h2>
          {c.rinnovato ? (
            <p className="text-sm text-gray-600">
              Questo contratto è stato rinnovato con nuove condizioni
              {successivo && (
                <>
                  {" "}
                  —{" "}
                  <Link
                    href={`/entrate/contratti/${successivo.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    vai al nuovo contratto
                  </Link>
                </>
              )}
              .
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-gray-500">
                Crea un nuovo contratto collegato a questo, con canone e durata
                nuovi. Questo contratto resta nello storico così com'è; cauzione
                e trattenute passano al nuovo.
              </p>
              <FormRinnovo
                id={c.id}
                canone={c.canone}
                durata={c.rinnovoMesi ?? c.durataMesi}
                rinnovo={c.rinnovoMesi}
                inizio={inizioRinnovo}
              />
            </>
          )}
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Occupazione e rilascio</h2>
        {c.dataRilascio ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">
              Immobile rilasciato il <b>{dataIt(c.dataRilascio)}</b>
            </p>
            <BottoneConferma
              action={annullaRilascio.bind(null, c.id)}
              messaggio="Annullare il rilascio?"
              className={btn}
            >
              Annulla rilascio
            </BottoneConferma>
          </div>
        ) : (
          <div className="space-y-3">
            {c.inOccupazione ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Occupazione oltre la scadenza: le bollette ripartite restano a
                  carico di questo inquilino e il canone continua a risultare
                  dovuto.
                </p>
                <BottoneConferma
                  action={annullaOccupazione.bind(null, c.id)}
                  messaggio="Togliere lo stato di occupazione?"
                  className={btn}
                >
                  Annulla
                </BottoneConferma>
              </div>
            ) : scaduto ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Il contratto è scaduto. Se l&apos;inquilino è ancora
                  nell&apos;immobile, segnalo: finché non registri il rilascio
                  le bollette continueranno a essergli ripartite.
                </p>
                <BottoneConferma
                  action={segnaOccupazione.bind(null, c.id)}
                  messaggio="Segnare l'inquilino in occupazione?"
                  className={btn}
                >
                  Segna in occupazione
                </BottoneConferma>
              </div>
            ) : null}
            <form
              action={segnaRilascio.bind(null, c.id)}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Immobile rilasciato il
                </span>
                <input
                  type="date"
                  name="data"
                  defaultValue={oggi}
                  required
                  className={inputCls}
                />
              </label>
              <button className={btn}>Segna rilascio</button>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Canoni incassati</h2>
            <p className="text-xs text-gray-500">
              Arretrati (mesi precedenti):{" "}
              <b
                className={sc.arretrati > 0 ? "text-red-700" : "text-gray-800"}
              >
                {eur(sc.arretrati)}
              </b>
              {c.canone == null &&
                " · imposta il canone mensile con Modifica per calcolare il dovuto"}
            </p>
          </div>
          {sc.righe.some((r) => r.mese < sc.corrente && r.residuo > 0.005) && (
            <form
              action={incassaMesiMancanti.bind(null, c.id)}
              className="flex items-end gap-2"
            >
              <label className="block">
                <span className="mb-1 block text-xs text-gray-500">
                  Segna incassati i mesi precedenti a
                </span>
                <input
                  type="month"
                  name="fino"
                  defaultValue={sc.corrente}
                  className={mini}
                />
              </label>
              <button className={btn}>Segna incassati</button>
            </form>
          )}
        </div>
        {dataAcq(c.unita) && dataAcq(c.unita) > c.dataInizio && (
          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Il contratto è antecedente all'acquisto dell'unità: i canoni sono
            conteggiati dal {dataIt(dataAcq(c.unita))}.
          </p>
        )}

        {sc.righe.length > 0 && (
          <table className="mb-4 w-full">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="pb-2">Periodo</th>
                <th className="text-right">Dovuto</th>
                <th className="text-right">Incassato</th>
                <th className="text-right">Residuo</th>
                <th className="pl-4">Stato</th>
              </tr>
            </thead>
            <tbody>
              {[...sc.righe].reverse().map((r) => (
                <tr key={r.mese} className="border-t border-gray-100 text-sm">
                  <td className="py-2 capitalize">
                    {etichettaPeriodo(r, sc.step)}
                  </td>
                  <td className="text-right">{eur(r.atteso)}</td>
                  <td className="text-right">{eur(r.incassato)}</td>
                  <td className="text-right">{eur(Math.max(r.residuo, 0))}</td>
                  <td className="pl-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATI_CANONE[r.stato][1]}`}
                    >
                      {STATI_CANONE[r.stato][0]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="mb-2 text-xs font-medium text-gray-600">
          Pagamenti registrati
        </h3>
        <div className="space-y-2">
          {c.canoni.length === 0 && (
            <p className="text-sm text-gray-500">
              Nessun pagamento registrato.
            </p>
          )}
          {c.canoni.map((p) =>
            p.versamentoId ? (
              <p key={p.id} className="text-sm text-gray-500">
                {p.mese} · {dataIt(p.data)} · {eur(p.importo)} · da versamento{" "}
                <Link
                  href={`/entrate/inquilini/${c.inquilinoId}`}
                  className="text-indigo-600 hover:underline"
                >
                  (vedi report)
                </Link>
              </p>
            ) : (
              <div key={p.id} className="flex items-center gap-2">
                <form
                  action={aggiornaCanone.bind(null, p.id, c.id)}
                  className="flex flex-wrap items-center gap-2"
                >
                  <PeriodoSel def={p.mese} />
                  <input
                    type="date"
                    name="data"
                    defaultValue={p.data.toISOString().slice(0, 10)}
                    required
                    className={mini}
                    title="Data di incasso"
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
                  action={eliminaCanone.bind(null, p.id, c.id)}
                  messaggio="Eliminare questo pagamento?"
                />
              </div>
            ),
          )}
        </div>

        <form
          action={registraCanone.bind(null, c.id)}
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4"
        >
          <label className="block">
            <span className="mb-1 block text-xs text-gray-500">
              Mese di competenza
            </span>
            <PeriodoSel def={(primoAperto ?? { mese: sc.corrente }).mese} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-500">
              Segna incassati i {sc.step > 1 ? "periodi" : "mesi"} precedenti a
            </span>
            {sc.step > 1 ? (
              <select name="fino" defaultValue={sc.corrente} className={mini}>
                {sc.righe.map((r) => (
                  <option key={r.mese} value={r.mese}>
                    {etichettaPeriodo(r, sc.step)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="month"
                name="fino"
                defaultValue={sc.corrente}
                className={mini}
              />
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-500">
              Importo (€)
            </span>
            <input
              type="number"
              step="0.01"
              name="importo"
              required
              className={`${mini} w-28`}
              defaultValue={
                primoAperto ? primoAperto.residuo.toFixed(2) : (c.canone ?? "")
              }
            />
          </label>
          <button className={btn}>Registra</button>
        </form>
      </section>

      {c.cauzione != null &&
        (() => {
          const liq = !!c.cauzioneRestituitaIl;
          const k = calcolaCauzione(c);
          const trattenuto =
            Math.round((c.cauzione - (c.cauzioneRestituita ?? 0)) * 100) / 100;
          const riga = (label, value, forte) => (
            <div
              key={label}
              className={`flex justify-between py-1.5 text-sm ${forte ? "border-t border-gray-200 font-semibold" : ""}`}
            >
              <span>{label}</span>
              <span>{value}</span>
            </div>
          );
          return (
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Cauzione</h2>
                  <p className="text-xs text-gray-500">
                    {eur(c.cauzione)}
                    {c.cauzioneVersataIl
                      ? ` · versata il ${dataIt(c.cauzioneVersataIl)}`
                      : " · non ancora versata: indica la data con Modifica"}
                  </p>
                </div>
                {liq && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                    Liquidata il {dataIt(c.cauzioneRestituitaIl)}
                  </span>
                )}
              </div>

              {!liq && c.canone > 0 && c.cauzione > c.canone * 3 && (
                <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  La cauzione supera tre mensilità: per le locazioni abitative
                  di norma è il limite massimo. Verifica con il tuo
                  professionista.
                </p>
              )}

              {liq ? (
                <div>
                  {riga("Cauzione versata", eur(c.cauzione))}
                  {riga("Trattenuto", eur(trattenuto))}
                  {riga(
                    "Restituito all'inquilino",
                    eur(c.cauzioneRestituita ?? 0),
                    true,
                  )}
                  {c.trattenute.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-500">
                      {c.trattenute.map((t) => (
                        <li key={t.id}>
                          {t.descrizione}: {eur(t.applicato ?? 0)}
                          {(t.applicato ?? 0) < t.importo &&
                            ` (su ${eur(t.importo)})`}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3">
                    <BottoneConferma
                      action={annullaLiquidazione.bind(null, c.id)}
                      messaggio="Annullare la liquidazione? I pagamenti creati dalla trattenuta verranno eliminati."
                      className={btn}
                    >
                      Annulla liquidazione
                    </BottoneConferma>
                  </div>
                </div>
              ) : c.cauzioneVersataIl ? (
                <>
                  {riga("Cauzione versata", eur(k.cauzione))}
                  {riga(
                    "− Canoni non incassati (incluso il mese in corso)",
                    eur(k.canoni),
                  )}
                  {riga("− Bollette da rimborsare", eur(k.bollette))}
                  {riga("− Altre trattenute", eur(k.manuali))}
                  {k.scoperto > 0
                    ? riga(
                        "Debito non coperto dalla cauzione",
                        eur(k.scoperto),
                        true,
                      )
                    : riga(
                        "Da restituire all'inquilino",
                        eur(k.daRestituire),
                        true,
                      )}
                  {k.scoperto > 0 && (
                    <p className="mt-1 text-xs text-red-700">
                      La cauzione non basta: i debiti residui restano da
                      incassare dopo la liquidazione.
                    </p>
                  )}

                  <h3 className="mb-2 mt-5 text-xs font-medium text-gray-600">
                    Altre trattenute (danni, pulizie, utenze finali…)
                  </h3>
                  <div className="space-y-2">
                    {c.trattenute.map((t) => (
                      <div key={t.id} className="flex items-center gap-2">
                        <form
                          action={aggiornaTrattenuta.bind(null, t.id, c.id)}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            name="descrizione"
                            defaultValue={t.descrizione}
                            required
                            className={`${mini} w-64`}
                          />
                          <input
                            type="number"
                            step="0.01"
                            name="importo"
                            defaultValue={t.importo}
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
                          action={eliminaTrattenuta.bind(null, t.id, c.id)}
                          messaggio="Eliminare questa trattenuta?"
                        />
                      </div>
                    ))}
                  </div>
                  <form
                    action={aggiungiTrattenuta.bind(null, c.id)}
                    className="mt-2 flex flex-wrap items-center gap-2"
                  >
                    <input
                      name="descrizione"
                      required
                      placeholder="Descrizione"
                      className={`${mini} w-64`}
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="importo"
                      required
                      placeholder="Importo (€)"
                      className={`${mini} w-28`}
                    />
                    <button className={btn}>Aggiungi trattenuta</button>
                  </form>

                  {!c.dataRilascio && (
                    <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Prima di liquidare registra il rilascio dell'immobile
                      (sezione «Occupazione e rilascio»): così i canoni dovuti
                      si fermano alla data giusta.
                    </p>
                  )}
                  <form
                    action={liquidaCauzione.bind(null, c.id)}
                    className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4"
                  >
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-600">
                        Data di liquidazione
                      </span>
                      <input
                        type="date"
                        name="data"
                        defaultValue={oggi}
                        required
                        className={inputCls}
                      />
                    </label>
                    <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                      Liquida cauzione
                    </button>
                  </form>
                </>
              ) : null}
            </section>
          );
        })()}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold">Elimina contratto</h2>
        {nQuote > 0 ? (
          <p className="text-sm text-gray-500">
            Ha {nQuote} dati collegati (bollette o canoni registrati), quindi
            non può essere eliminato senza perdere lo storico. Se il rapporto è
            concluso, imposta la data di fine con Modifica.
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
