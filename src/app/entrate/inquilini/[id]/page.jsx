import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { costruisciRapporto } from "@/lib/rapporto";
import { LOCATORE } from "@/lib/config";
import { eur, dataIt } from "@/lib/format";
import BottoneElimina from "@/components/BottoneElimina";
import BottoneStampa from "@/components/BottoneStampa";
import {
  registraVersamento,
  aggiornaVersamento,
  eliminaVersamento,
  aggiungiAddebito,
  aggiornaAddebito,
  eliminaAddebito,
  riallocaOra,
} from "../actions";

export const dynamic = "force-dynamic";

const DEST = {
  AUTO: "Dal debito più vecchio",
  CANONI: "Solo canoni",
  BOLLETTE: "Solo bollette e spese",
};
const iso = (d) => d.toISOString().slice(0, 10);
const meseIt = (m) =>
  new Date(`${m}-01`).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
const mini =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

const OptDest = () =>
  Object.entries(DEST).map(([k, t]) => (
    <option key={k} value={k}>
      {t}
    </option>
  ));

export default async function Posizione({ params }) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const r = await costruisciRapporto(Number(id));
  if (!r) notFound();

  const { inquilino: inq, contratti } = r;
  const oggi = iso(new Date());
  const unitaOpz = [
    ...new Map(contratti.map((c) => [c.unitaId, c.unita.nome])),
  ];
  const addebiti = contratti.flatMap((c) =>
    c.addebiti.map((a) => ({ ...a, unita: c.unita.nome })),
  );
  const totale = r.totCanoni.dovuto + r.totSpese.dovuto;
  const versato = r.totCanoni.coperto + r.totSpese.coperto;
  const cz = r.cauzione;
  const haCauzione =
    cz.detenuta > 0 || cz.daVersare > 0 || cz.liquidate.length > 0;
  const Voce = ({ l, v, forte }) => (
    <div
      className={`flex justify-between py-1 text-sm ${forte ? "font-semibold" : ""}`}
    >
      <span>{l}</span>
      <span>{v}</span>
    </div>
  );

  const SelUnita = ({ def }) =>
    unitaOpz.length > 1 ? (
      <select name="unitaId" defaultValue={def ?? ""} className={mini}>
        <option value="">Tutte le unità</option>
        {unitaOpz.map(([uid, nome]) => (
          <option key={uid} value={uid}>
            {nome}
          </option>
        ))}
      </select>
    ) : null;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <Link
            href="/entrate"
            className="flex items-center gap-1 text-xs text-gray-500 hover:underline"
          >
            <ArrowLeft size={16} /> Entrate
          </Link>
          <h1 className="text-2xl font-bold">{inq.nome}</h1>
        </div>
        <div className="flex gap-2">
          <form action={riallocaOra.bind(null, inq.id)}>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              title="Rifà la distribuzione dei versamenti sui debiti, utile dopo aver modificato bollette o canoni"
            >
              <RefreshCw size={14} /> Ricalcola attribuzione
            </button>
          </form>
          <BottoneStampa />
        </div>
      </div>

      {/* ---- report ---- */}
      <section className={card}>
        <h2 className="mb-4 text-lg font-bold">
          Resoconto pagamenti - {inq.nome}
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Locatore</dt>
            <dd className="font-medium">{LOCATORE}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Inquilino</dt>
            <dd className="font-medium">{inq.nome}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">Immobili e canone</dt>
            <dd className="space-y-0 5">
              {contratti.map((c) => (
                <p key={c.id}>
                  <b>
                    {c.unita.palazzina ? `${c.unita.palazzina.nome} — ` : ""}
                    {c.unita.nome}
                  </b>{" "}
                  · canone {eur(c.canone)} mensili · {dataIt(c.dataInizio)} →{" "}
                  {dataIt(c.dataFine)}
                  {c.rinnovato
                    ? " · rinnovato"
                    : c.dataRilascio
                      ? " · rilasciato"
                      : c.inOccupazione
                        ? " · in occupazione"
                        : ""}
                </p>
              ))}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">Ultimo pagamento</dt>
            <dd className="font-medium">
              {r.ultimo
                ? `${dataIt(r.ultimo.data)} · ${eur(r.ultimo.importo)} · ${r.ultimo.descr}`
                : "Nessun pagamento registrato"}
            </dd>
          </div>
        </dl>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Canoni insoluti</h2>
        {r.canoni.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun canone insoluto</p>
        ) : (
          <table className="w-full">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="pb-2">Periodo</th>
                <th>Unità</th>
                <th className="text-right">Dovuto</th>
                <th className="text-right">Coperto da versamenti</th>
                <th className="text-right">Residuo</th>
              </tr>
            </thead>
            <tbody>
              {r.canoni.map((x) => (
                <tr
                  key={`${x.mese}-${x.unita}`}
                  className="border-t border-gray-100 text-sm"
                >
                  <td className="py-2 capitalize">{x.periodo}</td>
                  <td>{x.unita}</td>
                  <td className="text-right">{eur(x.dovuto)}</td>
                  <td className="text-right">{eur(x.coperto)}</td>
                  <td className="text-right font-medium">{eur(x.residuo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 text-sm font-semibold">
                <td className="pt-2" colSpan={2}>
                  Totale Canoni
                </td>
                <td className="pt-2 text-right">{eur(r.totCanoni.dovuto)}</td>
                <td className="pt-2 text-right">{eur(r.totCanoni.coperto)}</td>
                <td className="pt-2 text-right">{eur(r.totCanoni.residuo)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Bollette e spese insolute</h2>
        {r.spese.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nessuna bolletta o spesa insoluta.
          </p>
        ) : (
          <table className="w-full">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="pb-2">Voce</th>
                <th>Unità</th>
                <th className="text-right">Dovuto</th>
                <th className="text-right">Coperto da versamenti</th>
                <th className="text-right">Residuo</th>
              </tr>
            </thead>
            <tbody>
              {r.spese.map((x, i) => (
                <tr key={i} className="border-t border-gray-100 text-sm">
                  <td className="py-2">
                    {x.href ? (
                      <Link href={x.href} className="hover:underline">
                        {x.descr}
                      </Link>
                    ) : (
                      x.descr
                    )}
                  </td>
                  <td>{x.unita}</td>
                  <td className="text-right">{eur(x.dovuto)}</td>
                  <td className="text-right">{eur(x.coperto)}</td>
                  <td className="text-right font-medium">{eur(x.residuo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 text-sm font-semibold">
                <td className="pt-2" colSpan={2}>
                  Totale bollette e spese
                </td>
                <td className="pt-2 text-right">{eur(r.totSpese.dovuto)}</td>
                <td className="pt-2 text-right">{eur(r.totSpese.coperto)}</td>
                <td className="pt-2 text-right">{eur(r.totSpese.residuo)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Versamenti ricevuti</h2>
        {r.versamenti.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun versamento registrato.</p>
        ) : (
          <table className="w-full">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="pb-2">Data</th>
                <th className="text-right">Importo</th>
                <th className="pl-4">Attribuito a</th>
                <th className="text-right">Credito</th>
                <th className="pl-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {r.versamenti.map((v) => (
                <tr key={v.id} className="border-t border-gray-100 text-sm">
                  <td className="py-2">{dataIt(v.data)}</td>
                  <td className="text-right">{eur(v.importo)}</td>
                  <td className="pl-4 text-gray-600">{DEST[v.destinazione]}</td>
                  <td className="text-right">
                    {v.credito > 0.005 ? eur(v.credito) : "—"}
                  </td>
                  <td className="pl-4 text-gray-500">{v.note}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 text-sm font-semibold">
                <td className="pt-2">Totale versato</td>
                <td className="pt-2 text-right">{eur(r.versatoTot)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Situazione debitoria aggiornata</h2>
        {[
          ["Totale dovuto canoni", eur(r.totCanoni.dovuto)],
          ["Totale dovuto bollette e spese", eur(r.totSpese.dovuto)],
          ["Totale dovuto", eur(totale)],
          ["Versamenti attribuiti", `− ${eur(versato)}`],
          ...(r.credito > 0.005
            ? [["Credito non ancora attribuito", `− ${eur(r.credito)}`]]
            : []),
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between py-1 text-sm">
            <span>{l}</span>
            <span>{v}</span>
          </div>
        ))}
        <div
          className={`mt-1 flex justify-between border-t border-gray-300 pt-2 text-base font-bold ${r.residuo > 0.005 ? "text-red-700" : "text-green-700"}`}
        >
          <span>Residuo da incassare</span>
          <span>{eur(Math.max(r.residuo, 0))}</span>
        </div>
        {haCauzione && (
          <>
            <div className="mt-4 border-t border-gray-300 pt-3">
              <h3 className="mb-1 text-sm font-semibold">Cauzione</h3>

              {cz.detenuta > 0 && (
                <>
                  <Voce
                    l="Residuo da incassare"
                    v={eur(Math.max(r.residuo, 0))}
                  />
                  {cz.trattenute > 0 && (
                    <Voce
                      l="+ Altre trattenute previste (danni, pulizia...)"
                      v={eur(cz.trattenute)}
                    />
                  )}
                  <Voce l="Cauzione detenuta" v={eur(cz.detenuta)} />
                  <div
                    className={`mt-1 flex justify-between border-t border-gray-300 pt-2 text-base font-bold ${cz.saldo > 0.005 ? "text-red-700" : "text-green-700"}`}
                  >
                    <span>
                      {cz.saldo > 0.005
                        ? "Da incassare dopo aver trattenuto la cauzione"
                        : "Da restituire all'inquilino a fine contratto"}
                    </span>
                    <span>{eur(Math.abs(cz.saldo))}</span>
                  </div>
                </>
              )}

              {cz.daVersare > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Cauzione di {eur(cz.daVersare)} non ancora versata: non è
                  conteggiata nel saldo.
                </p>
              )}

              {cz.liquidate.map((l, i) => (
                <p key={i} className="mt-2 text-xs text-gray-600">
                  Cauzione liquidata il {dataIt(l.data)} ({l.unita}): su {eur(l.cauzione)}, trattenuti {eur(l.trattenuto)} a copertura dei debiti,
                restituiti {eur(l.restituito)}.
                </p>
              ))}
            </div>
          </>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Il dovuto è al netto dei pagamenti registrati direttamente su canoni e
          bollette. I canoni sono conteggiati fino al periodo in corso (per i
          pagamenti anticipati compreso). Il saldo con la cauzione coincide con
          il prospetto nella scheda del contratto.
        </p>
        <p className="mt-6 hidden text-sm print:block">
          Firma locatore: _________________________
        </p>
      </section>

      {/* ---- gestione (non si stampa) ---- */}
      <section className={`${card} print:hidden`}>
        <h2 className="mb-1 font-semibold">Registra versamento</h2>
        <p className="mb-3 text-xs text-gray-500">
          Il versamento viene distribuito da solo sui debiti, dal più vecchio.
          Il resto resta come credito.
        </p>
        <form
          action={registraVersamento.bind(null, inq.id)}
          className="flex flex-wrap items-center gap-2"
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
          />
          <select name="destinazione" defaultValue="AUTO" className={mini}>
            <OptDest />
          </select>
          <SelUnita />
          <input name="note" placeholder="Note" className={`${mini} w-44`} />
          <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
            Registra
          </button>
        </form>

        {r.versamenti.length > 0 && (
          <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
            <h3 className="text-xs font-medium text-gray-600">
              Modifica versamenti
            </h3>
            {r.versamenti.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-2">
                <form
                  action={aggiornaVersamento.bind(null, v.id, inq.id)}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input
                    type="date"
                    name="data"
                    defaultValue={iso(v.data)}
                    required
                    className={mini}
                  />
                  <input
                    type="number"
                    step="0.01"
                    name="importo"
                    defaultValue={v.importo}
                    required
                    className={`${mini} w-28`}
                  />
                  <select
                    name="destinazione"
                    defaultValue={v.destinazione}
                    className={mini}
                  >
                    <OptDest />
                  </select>
                  <SelUnita def={v.unitaId} />
                  <input
                    name="note"
                    defaultValue={v.note ?? ""}
                    placeholder="Note"
                    className={`${mini} w-40`}
                  />
                  <button
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                    title="Salva modifica"
                  >
                    <Check size={16} />
                  </button>
                </form>
                <BottoneElimina
                  action={eliminaVersamento.bind(null, v.id, inq.id)}
                  messaggio="Eliminare questo versamento? Le attribuzioni vengono ricalcolate."
                />
                {v.credito > 0.005 && (
                  <span className="text-xs text-amber-700">
                    credito non attribuito {eur(v.credito)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`${card} print:hidden`}>
        <h2 className="mb-1 font-semibold">Addebiti vari</h2>
        <p className="mb-3 text-xs text-gray-500">
          Costi a carico dell'inquilino che non sono canoni né bollette:
          raccomandata, marca da bollo, penali. Entrano nel debito e nel report.
        </p>
        <div className="space-y-2">
          {addebiti.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2">
              <form
                action={aggiornaAddebito.bind(null, a.id, inq.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="date"
                  name="data"
                  defaultValue={iso(a.data)}
                  required
                  className={mini}
                />
                <input
                  name="descrizione"
                  defaultValue={a.descrizione}
                  required
                  className={`${mini} w-56`}
                />
                <input
                  type="number"
                  step="0.01"
                  name="importo"
                  defaultValue={a.importo}
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
                action={eliminaAddebito.bind(null, a.id, inq.id)}
                messaggio="Eliminare questo addebito?"
              />
              <span className="text-xs text-gray-500">{a.unita}</span>
            </div>
          ))}
        </div>
        <form
          action={aggiungiAddebito.bind(null, inq.id)}
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3"
        >
          {contratti.length > 1 ? (
            <select name="contrattoId" className={mini}>
              {contratti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.unita.nome} ({dataIt(c.dataInizio)})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="hidden"
              name="contrattoId"
              value={contratti[0]?.id ?? ""}
            />
          )}
          <input
            type="date"
            name="data"
            defaultValue={oggi}
            required
            className={mini}
          />
          <input
            name="descrizione"
            required
            placeholder="Descrizione (es. Raccomandata A/R)"
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
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
            Aggiungi
          </button>
        </form>
      </section>
    </div>
  );
}
