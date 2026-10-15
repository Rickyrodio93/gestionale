"use client";
import { useActionState } from "react";
import { MapPin } from "lucide-react";
import { trovaZona } from "@/app/investimenti/valutazione/actions";
import { inputCls } from "@/lib/ui";

export default function FormPosizione({
  tipo,
  id,
  indirizzo,
  comune,
  lat,
  lon,
  zona,
}) {
  const [state, action, pending] = useActionState(
    trovaZona.bind(null, tipo, id),
    null,
  );
  const mappa = (la, lo) =>
    `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=18/${la}/${lo}`;

  return (
    <form
      action={action}
      className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Indirizzo (via e numero civico)
          </span>
          <input
            name="indirizzo"
            defaultValue={indirizzo ?? ""}
            placeholder="es. Via Roma 10"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Comune
          </span>
          <input
            name="comune"
            defaultValue={comune ?? ""}
            className={inputCls}
          />
        </label>
      </div>

      <details className="mt-2 text-xs text-gray-600">
        <summary className="cursor-pointer text-indigo-600">
          Se l'indirizzo non viene trovato: inserisci le coordinate
        </summary>
        <label className="mt-2 block">
          <span className="mb-1 block font-medium">
            Coordinate (latitudine, longitudine)
          </span>
          <input
            name="coordinate"
            placeholder="45.46427, 9.18951"
            className={inputCls}
          />
        </label>
        <p className="mt-1 text-gray-500">
          Su Google Maps: clic destro sul punto, la prima riga del menu sono le
          coordinate.
        </p>
      </details>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {lat != null && lon != null ? (
            <>
              Posizione salvata{" "}
              <a
                href={mappa(lat, lon)}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                ({lat.toFixed(5)}, {lon.toFixed(5)}) · vedi sulla mappa
              </a>
              {zona && (
                <>
                  {" "}
                  · zona OMI <b className="text-gray-800">{zona}</b>
                </>
              )}
            </>
          ) : (
            "Nessuna posizione salvata."
          )}
        </p>
        <button
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <MapPin size={15} /> {pending ? "Ricerca…" : "Trova la zona OMI"}
        </button>
      </div>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <div className="mt-3 space-y-2 text-sm">
          {state.zona ? (
            <p className="rounded-md bg-green-50 px-3 py-2 text-green-800">
              Zona OMI <b>{state.zona}</b>
              {state.zonaDescr ? ` — ${state.zonaDescr}` : ""}: selezionata
              nelle schede qui sotto.
            </p>
          ) : (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
              {state.messaggio}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Posizione trovata: {state.posizione.nome}.{" "}
            <a
              href={mappa(state.posizione.lat, state.posizione.lon)}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Controlla sulla mappa
            </a>
          </p>
          {state.avvisi.map((a) => (
            <p
              key={a}
              className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              {a}
            </p>
          ))}
        </div>
      )}
    </form>
  );
}
