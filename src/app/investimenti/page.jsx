import { dataIt, eur } from "@/lib/format";
import { calcolaInvestimenti } from "@/lib/rendimento";
import { Pencil } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const pct = (x) =>
  x == null ? "-" : `${(x * 100).toFixed(1).replace(".", ",")}%`;
const STATO = {
  in_corso: ["In corso", "bg-indigo-100 text-indigo-800"],
  venduto: ["Venduto", "bg-gray-200 text-gray-700"],
  parziale: ["Venduto in parte", "bg-amber-100 text-amber-800"],
  in_vendita: ["Vendita in corso", "bg-line-100 text-line-800"],
};

function M({ label, value, tono, grande }) {
  const colore =
    tono === "pos"
      ? "text-green-700"
      : tono === "neg"
        ? "text-red-700"
        : "text-gray-900";
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`${grande ? "text-xl" : "text-sm"} font-semibold ${colore}`}
      >
        {value}
      </p>
    </div>
  );
}

const tono = (x) => (x == null ? undefined : x >= 0 ? "pos" : "neg");

export default async function Investimenti() {
  const { risultati, mancanti } = await calcolaInvestimenti();

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investimenti</h1>
        <Link
          href="/investimenti/vendite"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
        >
          Vendite rateali
        </Link>
      </div>

      <p className="mb-6 max-w-3xl text-sm text-gray-500">
        Guadagno = risultato operativo (entrate − uscite dall'acquisto) + valore
        finale (vendita o ultima stima) − capitale investito. I prezzi non
        entrano nei bilanci annuali della dashboard. La plusvalenza fiscale non
        è calcolata.
      </p>

      <div className="space-y-5">
        {risultati.map((r) => {
          const bordo =
            r.guadagno == null
              ? "border-l-gray-300"
              : r.guadagno >= 0
                ? "border-l-green-500"
                : "border-l-red-500";
          return (
            <section
              key={`${r.tipo}${r.id}`}
              className={`rounded-xl border border-l-4 border-gray-200 bg-white p-5 shadow-sm ${bordo}`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{r.nome}</h2>
                    {r.stato && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATO[r.stato][1]}`}
                      >
                        {STATO[r.stato][0]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {r.tipo === "palazzina" ? "Intera palazzina" : "Unità"}
                    {r.inizioMisura
                      ? ` · misurato dal ${dataIt(r.inizioMisura)}, valore di partenza ${eur(r.capitale0)}`
                      : r.acq &&
                        ` · acquistata il ${dataIt(r.acq)} per ${eur(r.prezzo)}`}
                    {!r.inizioMisura &&
                      r.costi > 0 &&
                      ` (+ ${eur(r.costi)} di costi)`}
                    {r.vend && ` · venduta il ${dataIt(r.vend)}`}
                  </p>
                </div>
                <Link
                  href={`/investimenti/${r.tipo}/${r.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                >
                  <Pencil size={14} /> Acquisto, vendita e stime
                </Link>
              </div>

              {r.errore ? (
                <p className="text-sm text-amber-700">
                  {r.errore}: completa i dati dalla scheda per vedere il
                  rendimento.
                </p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <M
                      grande
                      label={
                        r.stato === "in_vendita"
                          ? "Guadagno atteso (a vendita conclusa)"
                          : "Guadagno totale"
                      }
                      value={r.guadagno == null ? "-" : eur(r.guadagno)}
                      tono={tono(r.guadagno)}
                    />
                    <M
                      grande
                      label="Rendimento totale"
                      value={pct(r.roi)}
                      tono={tono(r.roi)}
                    />
                    <M
                      grande
                      label="Rendimento annuo composto (IRR)"
                      value={pct(r.irr)}
                      tono={tono(r.irr)}
                    />
                    <M
                      grande
                      label="Rendimento operativo annuo"
                      value={pct(r.rendOp)}
                      tono={tono(r.rendOp)}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <M
                      label={
                        r.ristr > 0
                          ? "Capitale (valore iniziale + lavori)"
                          : "Capitale investito"
                      }
                      value={eur(r.capitale)}
                    />
                    <M
                      label="Risultato operativo cumulato"
                      value={eur(r.operativo)}
                      tono={tono(r.operativo)}
                    />

                    <M
                      label={
                        r.stato === "in_vendita"
                          ? "Prezzo concordato (netto costi)"
                          : r.stimato
                            ? "Valore stimato oggi"
                            : "Valore finale"
                      }
                      value={r.mancaValore && !r.valore ? "-" : eur(r.valore)}
                    />
                    <M
                      label="Capitale recuperato dagli affitti"
                      value={pct(r.recupero)}
                    />
                  </div>
                  {(r.finanziato > 0 || r.rate > 0) && (
                    <p className="mt-3 text-xs text-gray-500">
                      {r.imposte > 0 && (
                        <span className="mt-3 text-xs text-gray-500">
                          Il risultato operativo comprende la cedolare secca di
                          competenza (<b>{eur(r.cedolare)}</b>)
                          {r.sanzioni > 0 && (
                            <>
                              {" "}
                              e <b>{eur(r.sanzioni)}</b> di interessi e sanzioni
                              delle dilazioni
                            </>
                          )}
                          .{" "}
                        </span>
                      )}
                      {r.finanziato > 0 && (
                        <>
                          Nel capitale: <b>{eur(r.finanziato)}</b> finanziati
                          con il prestito
                        </>
                      )}
                      {r.rate > 0 && (
                        <>
                          Rate del finanziamento pagate finora:{" "}
                          <b>{eur(r.rate)}</b>, escluse dal rendimento perchè
                          comprendono capitale e interessi.{" "}
                        </>
                      )}
                      Il rendimento è quello sul capitale totale, come se avessi
                      pagato tutto di tasca tua.
                    </p>
                  )}
                  {r.vendita && (
                    <div className="mt-4 rounded-lg bg-lime-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-lime-900">
                          Vendita rateale · {r.vendita.acquirente}
                        </p>
                        <Link
                          href={`/investimenti/vendite/${r.vendita.id}`}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Apri la scheda
                        </Link>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-lime-200">
                        <div
                          className="h-2 rounded-full bg-lime-600"
                          style={{
                            width: `${Math.min(100, r.vendita.pct * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-700">
                        Incassato <b>{eur(r.vendita.incassato)}</b> su{" "}
                        {eur(r.vendita.prezzo)} ({pct(r.vendita.pct)}) · restano{" "}
                        <b>{eur(Math.max(r.vendita.residuo, 0))}</b>
                        {r.vendita.arretrato > 0.005 && (
                          <>
                            {" "}
                            ·{" "}
                            <span className="text-red-700">
                              in ritardo {eur(r.vendita.arretrato)}
                            </span>
                          </>
                        )}{" "}
                        · con affitti e incassi hai recuperato il{" "}
                        <b>{pct(r.vendita.recuperoTot)}</b> del capitale.
                      </p>
                    </div>
                  )}
                  {r.trattenuto > 0 && (
                    <p className="mt-3 text-xs text-gray-500">
                      Il risultato comprende {eur(r.trattenuto)} trattenuti da
                      compromessi risolti.
                    </p>
                  )}
                  {r.mancaValore && (
                    <p className="mt-3 text-xs text-amber-700">
                      Per il guadagno totale serve una stima di valore (o la
                      vendita): aggiungila da «Acquisto, vendita e stime».
                    </p>
                  )}
                  {r.irr == null && !r.mancaValore && r.anni < 1 && (
                    <p className="mt-3 text-xs text-gray-500">
                      Il rendimento annuo composto si calcola dopo almeno un
                      anno di possesso.
                    </p>
                  )}
                </>
              )}
            </section>
          );
        })}

        {mancanti.length > 0 && (
          <section className="rounded-xl border border-dashed border-gray-300 p-5">
            <h2 className="mb-2 font-semibold">Da completare</h2>
            <p className="mb-3 text-xs text-gray-500">
              Mancano i dati di acquisto: senza prezzo non si può calcolare il
              rendimento.
            </p>
            <ul>
              {mancanti.map((m) => (
                <li key={`${m.tipo}${m.id}`}>
                  <Link
                    href={`/investimenti/${m.tipo}/${m.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {m.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {risultati.length === 0 && mancanti.length === 0 && (
          <p className="text-sm text-gray-500">Nessun immobile inserito.</p>
        )}
      </div>
    </>
  );
}
