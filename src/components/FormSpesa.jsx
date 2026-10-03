"use client";
import { useActionState } from "react";
import { aggiornaSpesa, creaSpesa } from "@/app/spese/actions";
import { CATEGORIE } from "@/lib/spese";
import { inputCls } from "@/lib/ui";

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function FormSpesa({ unita, palazzine, spesa }) {
  const [state, action, pending] = useActionState(
    spesa ? aggiornaSpesa.bind(null, spesa.id) : creaSpesa,
    null,
  );

  const dest = spesa
    ? spesa.unitaId
      ? `unita:${spesa.unitaId}`
      : `palazzina:${spesa.palazzinaId}`
    : "";

  const C = (label, name, o = {}) => (
    <label className="block">
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
    <form action={action} className="max-w-4xl space-y-5">
      <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Categoria
          </span>
          <select
            name="categoria"
            defaultValue={spesa?.categoria ?? "IMU"}
            className={inputCls}
          >
            {Object.entries(CATEGORIE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Si riferisce a
          </span>
          <select
            name="destinazione"
            defaultValue={dest}
            className={inputCls}
            required
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

        {C("Data di pagamento", "data", {
          type: "date",
          def: iso(spesa?.data),
        })}
        {C("Anno di competenza (vuoto = anno della data)", "anno", {
          type: "number",
          def: spesa?.anno,
        })}
        {C("Importo (€)", "importo", {
          type: "number",
          step: "0.01",
          def: spesa?.importo,
        })}
        {C("Fornitore / beneficiario", "fornitore", { def: spesa?.fornitore })}
        <div className="sm:col-span-2">
          {C("Descrizione", "descrizione", {
            placeholder: "es. Acconto IMU 2026, rifacimento bagno…",
            def: spesa?.descrizione,
          })}
        </div>
        <div className="sm:col-span-2">
          {C("Note", "note", { def: spesa?.note })}
        </div>
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
          : spesa
            ? "Salva modifiche"
            : "Registra spesa"}
      </button>
    </form>
  );
}
