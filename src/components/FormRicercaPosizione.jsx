"use client";
import { cercaPosizione } from "@/app/investimenti/posizioneAction";
import { inputCls } from "@/lib/ui";
import { useActionState } from "react";

export default function FormRicercaPosizione({ tipo, id }) {
  const [state, action, pending] = useActionState(
    cercaPosizione.bind(null, tipo, id),
    null,
  );
  return (
    <form action={action} className="my-2 space-y-2 rounded-md bg-amber-50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <button disabled={pending} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {pending ? "Ricerca..." : "Cerca di nuovo l'indirizzo"}
        </button>
        <label className="block">
            <span className="mb-1 block text-xs text-gray-600">
            oppure coordinate (latitudine, longitudine)
          </span>
          <input
            name="coordinate"
            placeholder="45.82040, 8.82510"
            className={`${inputCls} w-52`}
          />
        </label>
      </div>
      {state?.error && (
        <p className="text-xs text-red-700">
          {state.error}
          {state.dettaglio && (
            <span className="block text-gray-600">
              Tentativi: {state.dettaglio}
            </span>
          )}
        </p>
      )}
      {state?.ok && (
        <p className="text-xs text-green-700">Posizione trovata. {state.avviso}</p>
      )}
    </form>
  );
}
