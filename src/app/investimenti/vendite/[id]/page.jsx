import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { eur, dataIt } from "@/lib/format";
import { inputCls } from "@/lib/ui";
import { situazioneVendita, STATI_RATA, TIPI_RATA } from "@/lib/venditaRateale";
import BottoneElimina from "@/components/BottoneElimina";
import BottoneConferma from "@/components/BottoneConferma";
import {
  aggiornaVendita,
  eliminaVendita,
  aggiungiRataVendita,
  aggiornaRataVendita,
  eliminaRataVendita,
  registraIncassoVendita,
  aggiornaIncassoVendita,
  eliminaIncassoVendita,
  concludiVendita,
  annullaConclusione,
  risolviVendita,
  riapriVendita,
} from "../actions";

export const dynamic = "force-dynamic";

const iso = (d) => (d ? d.toISOString().slice(0, 10) : "");
const mini =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";
const btn =
  "inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50";

const Dato = ({ label, value, tono }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-lg font-semibold ${tono ?? ""}`}>{value}</p>
  </div>
);

export default async function Scheda({ params }) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const v = await prisma.venditaRateale.findUnique({
    where: { id: Number(id) },
    include: {
      palazzina: true,
      unita: true,
      rate: true,
      incassi: { orderBy: { data: "asc" } },
    },
  });
  if (!v) notFound();

  const s = situazioneVendita(v);
  const oggi = iso(new Date());
  const inCorso = v.stato === "IN_CORSO";
  const nome = v.palazzina?.nome ?? v.unita?.nome;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/investimenti/vendite"
            className="flex items-center gap-1 text-xs text-gray-500 hover:underline"
          >
            <ArrowLeft size={16}/> Vendite rateali
          </Link>
          <h1 className="text-2xl font-bold">{nome}</h1>
          <p className="text-sm text-gray-500">
            Acquirente: {v.acquirente} · compromesso del {dataIt(v.dataFirma)}
            {v.dataRogito &&
              ` · rogito ${inCorso ? "previsto" : ""} ${dataIt(v.dataRogito)}`}
          </p>
        </div>
        {v.stato !== "CONCLUSA" && (
          <BottoneElimina
            action={eliminaVendita.bind(null, v.id)}
            messaggio="Eliminare la vendita con il piano e gli incassi registrati?"
          />
        )}
      </div>

      <section className={card}>
        <div className="grid gap-4 sm:grid-cols-4">
          <Dato label="Prezzo concordato" value={eur(v.prezzo)} />
          <Dato label="Incassato" value={eur(s.incassato)} />
          <Dato
            label="Ancora da incassare"
            value={eur(Math.max(s.residuo, 0))}
          />
          <Dato
            label="In ritardo"
            value={eur(s.arretrato)}
            tono={s.arretrato > 0.005 ? "text-red-700" : ""}
          />
        </div>
        <div className="mt-4 h-3 rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full bg-lime-600"
            style={{ width: `${Math.min(100, s.pct * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {(s.pct * 100).toFixed(1).replace(".", ",")}% del prezzo incassato
          {s.fineAttesa && ` · ultima rata prevista il ${dataIt(s.fineAttesa)}`}
        </p>
        {Math.abs(s.mancaNelPiano) > 0.005 && (
          <p className="mt-2 text-xs text-amber-700">
            Le rate previste sommano {eur(s.pianificato)}:{" "}
            {s.mancaNelPiano > 0
              ? `mancano ${eur(s.mancaNelPiano)} per arrivare al prezzo`
              : `superano il prezzo di ${eur(-s.mancaNelPiano)}`}
            . Correggi il piano qui sotto.
          </p>
        )}
        {v.stato === "RISOLTA" && (
          <p className="mt-2 text-sm text-red-700">
            Compromesso risolto il {dataIt(v.dataChiusura)}: trattenuti{" "}
            {eur(v.trattenuto ?? 0)}.
          </p>
        )}
        {v.stato === "CONCLUSA" && (
          <p className="mt-2 text-sm text-green-700">
            Vendita conclusa con il rogito del {dataIt(v.dataChiusura)}.
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Piano delle rate</h2>
        <div className="space-y-2">
          {s.righe.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-xs text-gray-500">
                {TIPI_RATA[r.tipo]}
              </span>
              <form
                action={aggiornaRataVendita.bind(null, r.id, v.id)}
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
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATI_RATA[r.stato][1]}`}
              >
                {STATI_RATA[r.stato][0]}
                {r.stato === "parziale" && ` · restano ${eur(r.residuo)}`}
              </span>
              <BottoneElimina
                action={eliminaRataVendita.bind(null, r.id, v.id)}
                messaggio="Eliminare questa rata dal piano?"
              />
            </div>
          ))}
        </div>
        <form
          action={aggiungiRataVendita.bind(null, v.id)}
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
          <button className={btn}>Aggiungi rata</button>
        </form>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold">Incassi ricevuti</h2>
        <p className="mb-3 text-xs text-gray-500">
          Gli importi si attribuiscono da soli alle rate, dalla più vecchia:
          puoi incassare cifre diverse da quelle previste.
        </p>
        <div className="space-y-2">
          {v.incassi.length === 0 && (
            <p className="text-sm text-gray-500">Nessun incasso registrato.</p>
          )}
          {v.incassi.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2">
              <form
                action={aggiornaIncassoVendita.bind(null, i.id, v.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="date"
                  name="data"
                  defaultValue={iso(i.data)}
                  required
                  className={mini}
                />
                <input
                  type="number"
                  step="0.01"
                  name="importo"
                  defaultValue={i.importo}
                  required
                  className={`${mini} w-28`}
                />
                <input
                  name="note"
                  defaultValue={i.note ?? ""}
                  placeholder="Note"
                  className={`${mini} w-52`}
                />
                <button
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                  title="Salva modifica"
                >
                  <Check size={16} />
                </button>
              </form>
              <BottoneElimina
                action={eliminaIncassoVendita.bind(null, i.id, v.id)}
                messaggio="Eliminare questo incasso?"
              />
            </div>
          ))}
        </div>
        <form
          action={registraIncassoVendita.bind(null, v.id)}
          className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4"
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
            required
            placeholder="Importo (€)"
            className={`${mini} w-32`}
            defaultValue={s.prossima ? s.prossima.residuo.toFixed(2) : ""}
          />
          <input name="note" placeholder="Note" className={`${mini} w-52`} />
          <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
            Registra incasso
          </button>
        </form>
      </section>

      {inCorso && (
        <section className={card}>
          <h2 className="mb-3 font-semibold">Dati del compromesso</h2>
          <form
            action={aggiornaVendita.bind(null, v.id)}
            className="grid gap-4 sm:grid-cols-3"
          >
            {[
              ["Acquirente", "acquirente", "text", v.acquirente],
              ["Data di firma", "dataFirma", "date", iso(v.dataFirma)],
              ["Prezzo concordato (€)", "prezzo", "number", v.prezzo],
              [
                "Costi di vendita (€)",
                "costiVendita",
                "number",
                v.costiVendita,
              ],
              [
                "Data prevista del rogito",
                "dataRogito",
                "date",
                iso(v.dataRogito),
              ],
              ["Note", "note", "text", v.note],
            ].map(([l, n, t, d]) => (
              <label key={n} className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  {l}
                </span>
                <input
                  name={n}
                  type={t}
                  step={t === "number" ? "0.01" : undefined}
                  defaultValue={d ?? ""}
                  className={inputCls}
                />
              </label>
            ))}
            <div className="sm:col-span-3">
              <button className={btn}>Salva i dati</button>
            </div>
          </form>
        </section>
      )}

      <section className={card}>
        <h2 className="mb-3 font-semibold">Esito</h2>
        {inCorso && (
          <div className="space-y-5">
            {s.residuo <= 0.005 ? (
              <form
                action={concludiVendita.bind(null, v.id)}
                className="flex flex-wrap items-end gap-3"
              >
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    Data del rogito
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
                  Concludi la vendita
                </button>
                <p className="w-full text-xs text-gray-500">
                  L'immobile risulterà venduto a questa data
                  {v.palazzinaId ? ", insieme a tutte le sue unità" : ""}: i
                  canoni si fermano e l'investimento diventa «Venduto».
                </p>
              </form>
            ) : (
              <p className="text-sm text-gray-500">
                La vendita si può concludere quando risulta incassato l'intero
                prezzo ({eur(Math.max(s.residuo, 0))} ancora da incassare).
              </p>
            )}
            <form
              action={risolviVendita.bind(null, v.id)}
              className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4"
            >
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Risoluzione del compromesso, data
                </span>
                <input
                  type="date"
                  name="data"
                  defaultValue={oggi}
                  required
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Importo che resta a te (€)
                </span>
                <input
                  type="number"
                  step="0.01"
                  name="trattenuto"
                  defaultValue={s.incassato.toFixed(2)}
                  className={inputCls}
                />
              </label>
              <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                Risolvi il compromesso
              </button>
              <p className="w-full text-xs text-gray-500">
                Se l'acquirente non prosegue: indica quanto trattieni (caparra,
                penale, canoni) e l'immobile torna in gestione. Quanto
                trattenere dipende dal contratto: verificalo con il notaio.
              </p>
            </form>
          </div>
        )}
        {v.stato === "CONCLUSA" && (
          <BottoneConferma
            action={annullaConclusione.bind(null, v.id)}
            messaggio="Annullare la conclusione? L'immobile torna in portafoglio."
            className={btn}
          >
            Annulla la conclusione
          </BottoneConferma>
        )}
        {v.stato === "RISOLTA" && (
          <BottoneConferma
            action={riapriVendita.bind(null, v.id)}
            messaggio="Riaprire il compromesso?"
            className={btn}
          >
            Riapri il compromesso
          </BottoneConferma>
        )}
      </section>
    </div>
  );
}
