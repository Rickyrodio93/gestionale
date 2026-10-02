"use client";
import { useActionState } from "react";
import { creaIncasso, aggiornaIncasso } from "@/app/entrate/actions";
import { inputCls } from "@/lib/ui";

const Campo = ({ label, name, type = "text", step, def }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-gray-600">
      {label}
    </span>
    <input
      name={name}
      type={type}
      step={step}
      defaultValue={def ?? ""}
      className={inputCls}
    />
  </label>
);

export default function FormIncasso({ unita, incasso }) {
  const [state, action, pending] = useActionState(
    incasso ? aggiornaIncasso.bind(null, incasso.id) : creaIncasso,
    null,
  );
  return (
    <form action={action} className="max-w-3xl space-y-5">
      <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Appartamento
          </span>
          <select
            name="unitaId"
            className={inputCls}
            defaultValue={incasso?.unitaId ?? unita[0]?.id}
          >
            {unita.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </label>
        <Campo
          label="Mese di competenza"
          name="mese"
          type="month"
          def={incasso?.mese}
        />
        <Campo
          label="Data di accredito"
          name="data"
          type="date"
          def={incasso?.data.toISOString().slice(0, 10)}
        />
        <Campo
          label="Importo netto accreditato (€)"
          name="importo"
          type="number"
          step="0.01"
          def={incasso?.importo}
        />
        <Campo label="Note" name="note" def={incasso?.note} />
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
          : incasso
            ? "Salva modifiche"
            : "Registra incasso"}
      </button>
    </form>
  );
}
