"use client";
import { useActionState } from "react";
import {
  creaDilazione,
  aggiornaDilazione,
} from "@/app/spese/dilazioni/actions";
import { inputCls } from "@/lib/ui";

export default function FormDilazione({ piano, iniziale }) {
  const [state, action, pending] = useActionState(
    piano ? aggiornaDilazione.bind(null, piano.id) : creaDilazione,
    null,
  );
  const v = piano ?? iniziale ?? {};

  const C = (label, name, o = {}) => (
    <label className={o.cls ?? "block"}>
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      <input
        name={name}
        type={o.type ?? "text"}
        step={o.step}
        placeholder={o.placeholder}
        defaultValue={o.def ?? ""}
        className={inputCls}
      />
    </label>
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {C("Descrizione", "descrizione", {
          def: v.descrizione,
          placeholder: "es. Comunicazione cedolare 2023",
          cls: "block sm:col-span-3",
        })}
        {C("Anno d'imposta", "anno", { type: "number", def: v.anno })}
        {C("Imposta originaria coperta dal piano (€)", "impostaOriginaria", {
          type: "number",
          step: "0.01",
          def: v.impostaOriginaria,
        })}
        {C("Note", "note", { def: v.note })}
        {!piano && (
          <>
            {C("Numero di rate", "numRate", { type: "number" })}
            {C("Scadenza della prima rata", "prima", { type: "date" })}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Distanza tra le rate
              </span>
              <select name="passo" defaultValue="1" className={inputCls}>
                <option value="1">Ogni mese</option>
                <option value="2">Ogni 2 mesi</option>
                <option value="3">Ogni 3 mesi</option>
                <option value="6">Ogni 6 mesi</option>
              </select>
            </label>
            {C("Importo di ogni rata (€), se uguale per tutte", "importoRata", {
              type: "number",
              step: "0.01",
            })}
          </>
        )}
      </div>
      {!piano && (
        <p className="text-xs text-gray-500">
          Se non conosci ancora gli importi, lascia l'ultimo campo vuoto: le
          rate vengono create dividendo l'imposta e le correggi nella scheda con
          quelli del piano che ti è stato inviato. Interessi e sanzioni si
          ricavano dalla differenza.
        </p>
      )}
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-700">Salvato.</p>}
      <button
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending
          ? "Salvataggio…"
          : piano
            ? "Salva i dati del piano"
            : "Crea il piano"}
      </button>
    </form>
  );
}
