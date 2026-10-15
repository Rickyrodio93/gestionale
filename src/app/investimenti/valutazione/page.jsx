import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { valoreCatastale } from "@/lib/imu";
import { eur } from "@/lib/format";
import FormImportOmi from "@/components/FormImportOmi";
import FormPosizione from "@/components/FormPosizione";
import CardValutazione from "@/components/CardValutazione";

export const dynamic = "force-dynamic";

export default async function Valutazione() {
  const unitaArgs = {
    where: { dataVendita: null },
    include: { catasto: true },
    orderBy: { nome: "asc" },
  };
  const palazzine = await prisma.palazzina.findMany({
    where: { dataVendita: null },
    include: { unita: unitaArgs },
    orderBy: { nome: "asc" },
  });
  const autonome = await prisma.unita.findMany({
    where: { palazzinaId: null, ...unitaArgs.where },
    include: unitaArgs.include,
    orderBy: unitaArgs.orderBy,
  });
  const tutte = [...palazzine.flatMap((p) => p.unita), ...autonome];

  const codici = [
    ...new Set(
      tutte.map((u) => u.catasto?.codiceComune?.toUpperCase()).filter(Boolean),
    ),
  ];
  const quote = codici.length
    ? await prisma.quotazioneOmi.findMany({
        where: { comuneCat: { in: codici } },
      })
    : [];
  const nPerimetri = await prisma.zonaOmi.count();

  // per ogni comune si usa il semestre più recente importato
  const semPer = {};
  for (const q of quote)
    if (!semPer[q.comuneCat] || q.semestre > semPer[q.comuneCat])
      semPer[q.comuneCat] = q.semestre;
  const quotePer = (c) =>
    quote
      .filter((q) => q.comuneCat === c && q.semestre === semPer[c])
      .map((q) => ({
        zona: q.zona,
        zonaDescr: q.zonaDescr,
        tipologia: q.tipologia,
        stato: q.stato,
        min: q.min,
        max: q.max,
        superficie: q.superficie,
      }));
  const nomeComune = (c) =>
    quote.find((q) => q.comuneCat === c)?.comune ?? null;

  const stime = await prisma.valoreImmobile.findMany({
    where: { tipo: "OMI", unitaId: { in: tutte.map((u) => u.id) } },
    orderBy: { data: "desc" },
  });
  const ultima = {};
  for (const s of stime) if (!(s.unitaId in ultima)) ultima[s.unitaId] = s;

  const scheda = (u) => {
    const c = u.catasto?.codiceComune?.toUpperCase();
    if (!u.catasto)
      return (
        <div
          key={u.id}
          className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600"
        >
          <b>{u.nome}</b>: mancano i dati catastali (comune e superficie).{" "}
          <Link
            href={`/appartamenti/${u.id}/modifica`}
            className="text-indigo-600 hover:underline"
          >
            Completali
          </Link>
        </div>
      );
    return (
      <CardValutazione
        key={`${u.id}-${u.omiZona ?? ""}`} // la scheda si ricarica quando cambia la zona trovata dall'indirizzo
        semestre={semPer[c] ?? ""}
        quote={quotePer(c)}
        u={{
          id: u.id,
          nome: u.nome,
          tipo: u.tipo,
          superficie: u.catasto.superficie ?? null,
          catastale: valoreCatastale(u.catasto),
          omi: {
            zona: u.omiZona,
            tipologia: u.omiTipologia,
            stato: u.omiStato,
          },
          ultima: ultima[u.id]
            ? {
                importo: ultima[u.id].importo,
                data: ultima[u.id].data.toISOString(),
              }
            : null,
        }}
      />
    );
  };

  return (
    <>
      <Link
        href="/investimenti"
        className="text-xs text-gray-500 hover:underline"
      >
        ← Investimenti
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Valutazione da quotazioni OMI</h1>
      <p className="mb-6 max-w-3xl text-sm text-gray-500">
        Valore teorico = superficie catastale × prezzo medio al m² della zona,
        per tipologia e stato. È un riferimento di larga massima: una perizia o
        una stima di mercato inserita da te ha sempre la precedenza negli
        investimenti.
      </p>

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold">Dati OMI</h2>
          <p className="mb-3 text-xs text-gray-500">
            {Object.keys(semPer).length > 0
              ? `Valori importati: ${Object.entries(semPer)
                  .map(([c, s]) => `${c} (semestre ${s})`)
                  .join(" · ")}.`
              : "Valori: nessun dato importato (puoi comunque inserire minimo e massimo a mano nelle schede)."}{" "}
            {nPerimetri > 0
              ? `Perimetri importati: ${nPerimetri} zone.`
              : "Perimetri: nessuno importato, quindi la ricerca da indirizzo non è attiva."}
          </p>
          <details className="mb-4 text-sm text-gray-600">
            <summary className="cursor-pointer text-indigo-600">
              Dove trovo i file
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
              <li>
                <b>Valori e zone (CSV)</b>: servizio «Forniture OMI – Quotazioni
                immobiliari» dell'area riservata dell'Agenzia delle Entrate.
                Scegli il semestre e il comune o la provincia. Servono il file
                che finisce con VALORI e, per le descrizioni delle zone, quello
                con ZONE.
              </li>
              <li>
                <b>Perimetri (KML)</b>: nella consultazione cartografica OMI
                (Geopoi) c'è la voce «Download perimetri», per comune o
                provincia; in alternativa il servizio «Perimetri di zona»
                nell'area riservata. Se il file è compresso (KMZ), estrailo e
                carica il .kml all'interno.
              </li>
              <li>
                Il codice catastale del comune che hai inserito nei dati
                catastali dell'unità deve coincidere con quello dei file
                (colonna Comune_amm).
              </li>
            </ol>
          </details>
          <FormImportOmi />
        </section>

        {palazzine.map((p) => {
          const primoCodice = p.unita
            .map((u) => u.catasto?.codiceComune?.toUpperCase())
            .find(Boolean);
          const tot = p.unita.reduce(
            (t, u) => t + (ultima[u.id]?.importo ?? 0),
            0,
          );
          const conStima = p.unita.filter((u) => ultima[u.id]).length;
          return (
            <section key={p.id}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <h2 className="font-semibold">{p.nome}</h2>
                {conStima > 0 && (
                  <p className="text-xs text-gray-500">
                    Somma delle stime salvate ({conStima}/{p.unita.length}{" "}
                    unità): <b className="text-gray-800">{eur(tot)}</b>
                  </p>
                )}
              </div>
              <FormPosizione
                tipo="palazzina"
                id={p.id}
                indirizzo={p.indirizzo}
                comune={
                  p.comune ?? (primoCodice ? nomeComune(primoCodice) : null)
                }
                lat={p.lat}
                lon={p.lon}
                zona={p.unita.find((u) => u.omiZona)?.omiZona ?? null}
              />
              <div className="grid gap-4 xl:grid-cols-2">
                {p.unita.map(scheda)}
              </div>
              {p.unita.length > 1 && (
                <p className="mt-2 text-xs text-gray-500">
                  La somma delle singole unità non è il prezzo a cui venderesti
                  l'intera palazzina, che può essere diverso: per quello serve
                  una stima dell'edificio nel suo insieme.
                </p>
              )}
            </section>
          );
        })}

        {autonome.length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold">Unità autonome</h2>
            <div className="space-y-6">
              {autonome.map((u) => (
                <div key={u.id}>
                  <FormPosizione
                    tipo="unita"
                    id={u.id}
                    indirizzo={u.indirizzo}
                    comune={
                      u.comune ??
                      nomeComune(u.catasto?.codiceComune?.toUpperCase())
                    }
                    lat={u.lat}
                    lon={u.lon}
                    zona={u.omiZona}
                  />
                  {scheda(u)}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-gray-500">
          Fonte dei dati: Agenzia Entrate - OMI. Ricerca degli indirizzi: ©
          OpenStreetMap contributors.
        </p>
      </div>
    </>
  );
}
