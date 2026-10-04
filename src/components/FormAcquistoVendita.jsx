"use client";

import { salvaAcquistoVendita } from "@/app/investimenti/actions";
import { inputCls } from "@/lib/ui";
import { useActionState } from "react";

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function FormAcquistoVendita({ tipo, id, ent }) {
  const [state, action, pending] = useActionState(
    salvaAcquistoVendita.bind(null, tipo, id),
    null,
  );
  const F = (label, name, def, t = "number") => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      <input
        name={name}
        type={t}
        step={t === "number" ? "0.01" : undefined}
        defaultValue={def ?? ""}
        className={inputCls}
      />
    </label>
  );

  const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

  return (
    <form action={action} className="max-w-4xl space-y-5">
      <section className={card}>
        <h2 className="mb-4 font-semibold">Acquisto</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {F("Data acquisto", "dataAcquisto", iso(ent.dataAcquisto), "date")}
          {F("Prezzo di vendita (€)", "prezzoVendita", ent.prezzoVendita)}
          {F("Costi di vendita (€)", "costiVendita", ent.costiVendita)}
        </div>
      </section>
      <section className={card}>
        <h2 className="mb-1 font-semibold">Vendita</h2>
        <p className="mb-4 text-xs text-gray-500">
          Lascia vuoto se l'immobile è ancora tuo; per annullare una vendita
          svuota i campi e salva.
          {tipo === "palazzina" &&
            " Vendendo la palazzina, tutte le sue unità risultano vendute alla stessa data."}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {F("Data vendita", "dataVendita", iso(ent.dataVendita), "date")}
          {F("Prezzo di vendita (€)", "prezzoVendita", ent.prezzoVendita)}
          {F("Costi di vendita (€)", "costiVendita", ent.costiVendita)}
        </div>
      </section>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-md bg-indigo-400 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Salva"}
      </button>
    </form>
  );
}
