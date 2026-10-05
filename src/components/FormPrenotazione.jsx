"use client";
import { useActionState } from "react";
import {
  creaPrenotazione,
  aggiornaPrenotazione,
} from "@/app/calendario/prenotazioni/actions";
import { inputCls } from "@/lib/ui";
import { CANALI } from "@/lib/canali";

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function FormPrenotazione({ unita, prenotazione }) {
  const [state, action, pending] = useActionState(
    prenotazione
      ? aggiornaPrenotazione.bind(null, prenotazione.id)
      : creaPrenotazione,
    null,
  );
  const importata = prenotazione?.origine === "ical";

  const C = (label, name, o = {}) => (
    <label className={o.cls ?? "block"}>
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      <input
        name={name}
        type={o.type ?? "text"}
        disabled={o.disabled}
        defaultValue={o.def ?? ""}
        className={`${inputCls} ${o.disabled ? "bg-gray-50 text-gray-500" : ""}`}
      />
    </label>
  );

  return (
    <form action={action} className="max-w-3xl space-y-5">
      {importata && (
        <p className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Prenotazione importata dal calendario
          {prenotazione.stato === "ANNULLATA"
            ? " e poi annullata (non è più presente nel feed)"
            : ""}
          : date e canale si aggiornano da soli alla sincronizzazione. Puoi
          aggiungere ospite e note.
        </p>
      )}
      <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        {prenotazione ? (
          <p className="text-sm font-medium sm:col-span-2">
            {prenotazione.unita.nome}
          </p>
        ) : (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Appartamento
            </span>
            <select
              name="unitaId"
              required
              defaultValue=""
              className={inputCls}
            >
              <option value="" disabled>
                Scegli…
              </option>
              {unita.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </label>
        )}
        {C("Check-in", "checkIn", {
          type: "date",
          def: iso(prenotazione?.checkIn),
          disabled: importata,
        })}
        {C("Check-out", "checkOut", {
          type: "date",
          def: iso(prenotazione?.checkOut),
          disabled: importata,
        })}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Canale
          </span>
          <select
            name="canale"
            defaultValue={prenotazione?.canale ?? "DIRETTA"}
            disabled={importata}
            className={inputCls}
          >
            {Object.entries(CANALI).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {C("Ospite", "ospite", { def: prenotazione?.ospite })}
        {C("Note", "note", {
          def: prenotazione?.note,
          cls: "block sm:col-span-2",
        })}
      </section>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending
          ? "Salvataggio…"
          : prenotazione
            ? "Salva modifiche"
            : "Registra prenotazione"}
      </button>
    </form>
  );
}
