"use client";
import { useActionState } from "react";
import { creaVendita } from "@/app/investimenti/vendite/actions";
import { inputCls } from "@/lib/ui";

const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

export default function FormVendita({ palazzine, unita, dest }) {
  const [state, action, pending] = useActionState(creaVendita, null);
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
        className={inputCls}
      />
    </label>
  );

  return (
    <form action={action} className="max-w-4xl space-y-5">
      <section className={card}>
        <h2 className="mb-4 font-semibold">Compromesso</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Immobile in vendita
            </span>
            <select
              name="destinazione"
              defaultValue={dest ?? ""}
              required
              className={inputCls}
            >
              <option value="" disabled>
                Scegli…
              </option>
              {palazzine.length > 0 && (
                <optgroup label="Intera palazzina">
                  {palazzine.map((p) => (
                    <option key={p.id} value={`palazzina:${p.id}`}>
                      {p.nome}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Singola unità">
                {unita.map((u) => (
                  <option key={u.id} value={`unita:${u.id}`}>
                    {u.palazzina ? `${u.palazzina.nome} — ` : ""}
                    {u.nome}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          {C("Acquirente", "acquirente")}
          {C("Data di firma del compromesso", "dataFirma", { type: "date" })}
          {C("Prezzo di vendita concordato (€)", "prezzo", {
            type: "number",
            step: "0.01",
          })}
          {C("Costi di vendita a tuo carico (€)", "costiVendita", {
            type: "number",
            step: "0.01",
          })}
          {C("Data prevista del rogito", "dataRogito", { type: "date" })}
          {C("Note", "note")}
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold">Piano degli incassi</h2>
        <p className="mb-4 text-xs text-gray-500">
          Anticipo più rate fino al prezzo. Dopo la creazione puoi cambiare,
          aggiungere o togliere rate: serve solo come punto di partenza.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {C("Anticipo alla firma (€)", "anticipo", {
            type: "number",
            step: "0.01",
          })}
          <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-2">
            <input type="checkbox" name="anticipoIncassato" defaultChecked />{" "}
            Anticipo già incassato
          </label>
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
              <option value="12">Ogni anno</option>
            </select>
          </label>
          {C("Numero di rate", "numRate", { type: "number" })}
          {C("oppure importo di ogni rata (€)", "importoRata", {
            type: "number",
            step: "0.01",
          })}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Con l'importo della rata il numero si ricava da solo e l'ultima rata è
          il saldo. Se non indichi né numero né importo, crea un'unica rata di
          saldo.
        </p>
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
        {pending ? "Creazione…" : "Crea la vendita"}
      </button>
    </form>
  );
}
