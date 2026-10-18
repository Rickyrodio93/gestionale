import Link from "next/link";
import { eur } from "@/lib/format";
import { valutazioniOmi } from "@/lib/valutazioneOmi";
import { CONDIZIONI } from "@/lib/condizioni";
import FormImportOmi from "@/components/FormImportOmi";
import FormRicercaPosizione from "@/components/FormRicercaPosizione";

const mq = (n) => `${Math.round(n).toLocaleString("it-IT")} €`;

export default async function SezioneOmi() {
  const { gruppi, semestri, nQuote, nZone } = await valutazioniOmi();
  const sem = Object.entries(semestri)
    .map(([c, s]) => `${c} (semestre ${s})`)
    .join(" · ");

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">Valutazione da quotazioni OMI</h2>
      <p className="mb-3 max-w-3xl text-xs text-gray-500">
        Valore teorico = superficie catastale × prezzo al m² (minimo, massimo e
        medio) della zona OMI in cui cade l'indirizzo, per tipologia e stato
        dell'immobile. È un riferimento di larga massima: una perizia o una
        stima di mercato inserita da te ha sempre la precedenza. Lo stato
        (nuovo, ristrutturato, normale, da ristrutturare) si sceglie nella
        scheda dell'unità.
      </p>

      <p className="mb-3 text-xs text-gray-500">
        {nQuote > 0 ? `Valori importati: ${sem}.` : "Nessun valore importato."}{" "}
        {nZone > 0
          ? `Perimetri importati: ${nZone} zone.`
          : "Nessun perimetro importato: senza non si trova la zona dall'indirizzo."}
      </p>

      <details className="mb-4 text-sm text-gray-600">
        <summary className="cursor-pointer text-indigo-600">
          Carica o aggiorna i dati (una volta a semestre)
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
          <li>
            <b>Valori e zone (CSV)</b>: servizio «Forniture OMI – Quotazioni
            immobiliari» dell'area riservata dell'Agenzia delle Entrate. Scegli
            il semestre e il comune. Servono il file che finisce con VALORI e,
            per le descrizioni delle zone, quello con ZONE.
          </li>
          <li>
            <b>Perimetri (KML)</b>: nella consultazione cartografica OMI
            (Geopoi), voce «Download perimetri». Se il file è compresso (KMZ),
            estrailo e carica il .kml all'interno.
          </li>
          <li>
            Il codice catastale del comune inserito nei dati catastali delle
            unità deve coincidere con quello dei file (colonna Comune_amm).
          </li>
        </ol>
        <div className="mt-3">
          <FormImportOmi />
        </div>
      </details>

      {gruppi.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun immobile in portafoglio.</p>
      ) : (
        <div className="space-y-5">
          {gruppi.map((g) => (
            <div key={`${g.tipo}${g.id}`}>
              <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                <h3 className="text-sm font-semibold">{g.nome}</h3>
                {g.indirizzo && (
                  <p className="text-xs text-gray-500">{g.indirizzo}</p>
                )}
              </div>
              {g.tipo === "palazzina" && !g.posOk && (
                <FormRicercaPosizione tipo="palazzina" id={g.id} />
              )}
              <table className="w-full">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="pb-2">Unità</th>
                    <th>Zona</th>
                    <th>Tipologia · stato</th>
                    <th className="text-right">m²</th>
                    <th className="text-right">€/m²</th>
                    <th className="text-right">Minimo</th>
                    <th className="text-right">Medio</th>
                    <th className="text-right">Massimo</th>
                  </tr>
                </thead>
                <tbody>
                  {g.unita.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 text-sm">
                      <td className="py-2 pr-3">
                        <Link
                          href={`/appartamenti/${r.id}/modifica`}
                          className="font-medium hover:text-indigo-700 hover:underline"
                        >
                          {r.nome}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {CONDIZIONI[r.condizioni]}
                          {g.tipo === "autonome" && r.indirizzo
                            ? ` · ${r.indirizzo}`
                            : ""}
                        </div>
                      </td>
                      {r.valido ? (
                        <>
                          <td className="pr-3">
                            {r.zona}
                            {r.zonaDescr && (
                              <div
                                className="max-w-48 truncate text-xs text-gray-500"
                                title={r.zonaDescr}
                              >
                                {r.zonaDescr}
                              </div>
                            )}
                          </td>
                          <td className="pr-3">
                            {r.tipologia}
                            <div className="text-xs text-gray-500 capitalize">
                              {r.stato.toLowerCase()}
                              {r.statoDiverso && (
                                <span className="text-amber-700">
                                  {" "}
                                  (non c'è la fascia{" "}
                                  {r.statoVoluto.toLowerCase()})
                                </span>
                              )}
                              {r.netta && (
                                <span className="text-amber-700">
                                  {" "}
                                  · riferita a superficie netta
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="pr-3 text-right">{r.superficie}</td>
                          <td className="pr-3 text-right text-xs text-gray-600">
                            {r.minMq}–{r.maxMq}
                          </td>
                          <td className="text-right">{eur(r.min)}</td>
                          <td className="text-right font-medium">
                            {eur(r.med)}
                          </td>
                          <td className="text-right">{eur(r.max)}</td>
                        </>
                      ) : (
                        <td colSpan={7} className="text-xs text-amber-700">
                          Valore non calcolabile: {r.problema}.
                          {g.tipo === "autonome" && !r.posOk && (
                            <FormRicercaPosizione tipo="unita" id={r.id} />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {g.totale.validi > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-300 text-sm font-semibold">
                      <td className="pt-2" colSpan={5}>
                        {g.tipo === "palazzina"
                          ? `Somma delle unità (${g.totale.validi}/${g.totale.unita})`
                          : `Totale (${g.totale.validi}/${g.totale.unita})`}
                      </td>
                      <td className="pt-2 text-right">{eur(g.totale.min)}</td>
                      <td className="pt-2 text-right">{eur(g.totale.med)}</td>
                      <td className="pt-2 text-right">{eur(g.totale.max)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {g.tipo === "palazzina" && g.unita.length > 1 && (
                <p className="mt-1 text-xs text-gray-500">
                  La somma delle singole unità non è il prezzo a cui venderesti
                  l'intera palazzina, che può essere diverso: per quello serve
                  una stima dell'edificio nel suo insieme.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-gray-500">
        Fonte dei dati: Agenzia Entrate - OMI. Ricerca degli indirizzi: ©
        OpenStreetMap contributors.
      </p>
    </section>
  );
}
