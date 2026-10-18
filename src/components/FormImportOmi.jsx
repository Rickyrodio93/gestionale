"use client";
import { useActionState } from "react";
import { importaOmi } from "@/app/investimenti/omiActions";
import { inputCls } from "@/lib/ui";

export default function FormImportOmi() {
  const [state, action, pending] = useActionState(importaOmi, null);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">
          File scaricati: valori e zone (CSV) e perimetri (KML). Puoi sceglierli
          tutti insieme.
        </span>
        <input
          name="file"
          type="file"
          accept=".csv,.txt,.kml"
          multiple
          className={inputCls}
        />
      </label>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.importate > 0 && (
            <>
              Importate {state.importate} quotazioni (semestre {state.semestre})
              per {state.comuni.join(", ")}.{" "}
            </>
          )}
          {state.zone > 0 && <>Importati i perimetri di {state.zone} zone. </>}
          Le zone e i valori degli immobili sono stati aggiornati.
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Importazione…" : "Importa i file"}
      </button>
    </form>
  );
}
