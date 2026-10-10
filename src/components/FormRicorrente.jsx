"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  creaRicorrente,
  aggiornaRicorrente,
} from "@/app/spese/ricorrenti/actions";
import { inputCls } from "@/lib/ui";
import { CATEGORIE } from "@/lib/spese";
import { FREQ } from "@/lib/ricorrenti";

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function FormRicorrente({ unita, palazzine, ricorrente }) {
  const [state, action, pending] = useActionState(
    ricorrente ? aggiornaRicorrente.bind(null, ricorrente.id) : creaRicorrente,
    null,
  );
  const [cat, setCat] = useState(ricorrente?.categoria ?? "ALTRO");
  const dest = ricorrente
    ? ricorrente.unitaId
      ? `unita:${ricorrente.unitaId}`
      : `palazzina:${ricorrente.palazzinaId}`
    : "";

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
        readOnly={o.readOnly}
        className={`${inputCls} ${o.readOnly ? "bg-gray-50 text-gray-500" : ""}`}
      />
    </label>
  );

  return (
    <form action={action} className="max-w-4xl space-y-5">
      <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        {C("Descrizione", "descrizione", {
          placeholder: "es. Canone internet",
          def: ricorrente?.descrizione,
          cls: "block sm:col-span-2",
        })}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Categoria
          </span>
          <select
            name="categoria"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
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
        {C("Importo di ogni addebito (€)", "importo", {
          type: "number",
          step: "0.01",
          def: ricorrente?.importo,
        })}
        {cat === "MUTUO" && (
          <p className="text-xs text-gray-500 sm:col-span-2">
            Per mutui e prestiti usa la sezione{" "}
            <Link
              href="/investimenti/finanziamenti/nuovo"
              className="text-indigo-600 hover:underline"
            >
              Finanziamenti
            </Link>
            : separa capitale e interessi, calcola il debito residuo e crea da
            sola le rate. Questa ricorrenza si può collegare a un finanziamento
            già esistente.
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Frequenza
          </span>
          <select
            name="frequenza"
            defaultValue={ricorrente?.frequenza ?? "MENSILE"}
            className={inputCls}
          >
            {Object.entries(FREQ).map(([k, [t]]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {ricorrente
          ? C("Prima spesa (non modificabile)", "dal", {
              type: "date",
              def: iso(ricorrente.dal),
              readOnly: true,
            })
          : C("Data della prima spesa", "dal", { type: "date" })}
        {C("Fine (vuota = senza scadenza)", "al", {
          type: "date",
          def: iso(ricorrente?.al),
        })}
        {C("Fornitore", "fornitore", { def: ricorrente?.fornitore })}
        {C("Note", "note", { def: ricorrente?.note })}
      </section>

      {ricorrente && (
        <p className="text-xs text-gray-500">
          Le modifiche valgono per le spese future: quelle già generate restano
          com&apos;erano e si correggono dall&apos;elenco Spese.
        </p>
      )}
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
          : ricorrente
            ? "Salva modifiche"
            : "Crea spesa ricorrente"}
      </button>
    </form>
  );
}
