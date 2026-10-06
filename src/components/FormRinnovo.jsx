"use client";
import { useActionState } from "react";
import { rinnovaConCondizioni } from "@/app/entrate/actions";
import { inputCls } from "@/lib/ui";

export default function FormRinnovo({ id, canone, durata, rinnovo, inizio }) {
  const [state, action, pending] = useActionState(
    rinnovaConCondizioni.bind(null, id),
    null,
  );
  const C = (label, name, def, type = "number") => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      <input
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={def ?? ""}
        className={inputCls}
      />
    </label>
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        {C("Nuovo canone mensile (€)", "canone", canone)}
        {C("Durata (mesi)", "durataMesi", durata)}
        {C("Rinnovo successivo (mesi)", "rinnovoMesi", rinnovo)}
        {C("Inizio", "dataInizio", inizio, "date")}
      </div>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Creazione…" : "Crea il nuovo contratto"}
      </button>
    </form>
  );
}
