"use client";
import { useState, useActionState } from "react";
import { creaUnita, aggiornaUnita } from "@/app/appartamenti/actions";
import { inputCls } from "@/lib/ui";

function Sezione({ titolo, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-gray-800">{titolo}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function FormUnita({ palazzine, unita }) {
  const [state, action, pending] = useActionState(
    unita ? aggiornaUnita.bind(null, unita.id) : creaUnita,
    null,
  );
  const [colloc, setColloc] = useState(
    unita && !unita.palazzinaId ? "autonoma" : "palazzina",
  );
  const [palSel, setPalSel] = useState(
    unita?.palazzinaId ?? palazzine[0]?.id ?? "nuova",
  );
  const [lungo, setLungo] = useState((unita?.contratti?.length ?? 0) > 0);

  const d = {
    ...(unita ?? {}),
    ...(unita?.catasto ?? {}),
    dataAcquisto: unita?.dataAcquisto?.toISOString().slice(0, 10),
  };

  // funzione (non componente): evita il rimontaggio dei campi a ogni render
  const C = (label, name, o = {}) => (
    <label key={name} className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label} {o.required && <span className="text-indigo-600">*</span>}
      </span>
      <input
        name={name}
        type={o.type ?? "text"}
        step={o.step}
        placeholder={o.placeholder}
        defaultValue={d[name] ?? o.def ?? ""}
        className={inputCls}
      />
    </label>
  );

  return (
    <form action={action} className="max-w-5xl space-y-5">
      <Sezione titolo="Collocazione">
        <div className="flex gap-6 text-sm sm:col-span-2 lg:col-span-3">
          {[
            ["palazzina", "Fa parte di una palazzina"],
            ["autonoma", "Unità autonoma"],
          ].map(([v, t]) => (
            <label key={v} className="flex items-center gap-2">
              <input
                type="radio"
                name="collocazione"
                value={v}
                checked={colloc === v}
                onChange={() => setColloc(v)}
              />
              {t}
            </label>
          ))}
        </div>
        {colloc === "palazzina" ? (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Palazzina
              </span>
              <select
                name="palazzinaId"
                value={palSel}
                onChange={(e) => setPalSel(e.target.value)}
                className={inputCls}
              >
                {palazzine.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
                <option value="nuova">+ Nuova palazzina…</option>
              </select>
            </label>
            {palSel === "nuova" && (
              <>
                {C("Nome nuova palazzina", "nuovaPalazzina", {
                  required: true,
                })}
                {C("Indirizzo", "indirizzo")}
              </>
            )}
          </>
        ) : (
          <>
            {C("Indirizzo", "indirizzo", { required: true })}
            {C("Comune", "comune", { required: true })}
          </>
        )}
      </Sezione>

      <Sezione titolo="Unità">
        {C("Nome", "nome", {
          required: true,
          placeholder: "es. Primo - int. 1",
        })}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Tipo
          </span>
          <select
            name="tipo"
            defaultValue={d.tipo ?? "APPARTAMENTO"}
            className={inputCls}
          >
            <option value="APPARTAMENTO">Appartamento</option>
            <option value="VILLA">Villa</option>
            <option value="LAVANDERIA">Lavanderia</option>
            <option value="CANTINA">Cantina</option>
            <option value="ALTRO">Altro</option>
          </select>
        </label>
        {C("Piano", "piano")}
        {C("Interno", "interno")}
        {C("Data acquisto", "dataAcquisto", { type: "date" })}
        {C("Prezzo acquisto (€)", "prezzoAcquisto", {
          type: "number",
          step: "0.01",
        })}
      </Sezione>

      <Sezione titolo="Dati catastali">
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
          <input
            type="checkbox"
            name="lungo"
            checked={lungo}
            onChange={(e) => setLungo(e.target.checked)}
          />
          Destinata ad affitto lungo{" "}
          <span className="text-gray-500">(dati catastali obbligatori)</span>
        </label>
        {C("Codice catastale comune", "codiceComune", {
          required: lungo,
          placeholder: "es. F205",
        })}
        {C("Sezione", "sezione")}
        {C("Foglio", "foglio", { required: lungo })}
        {C("Particella", "particella", { required: lungo })}
        {C("Subalterno", "subalterno", { required: lungo })}
        {C("Zona censuaria", "zonaCensuaria")}
        {C("Categoria", "categoria", {
          required: lungo,
          placeholder: "es. A/2",
        })}
        {C("Classe", "classe", { required: lungo })}
        {C("Consistenza (vani/mq)", "consistenza", {
          type: "number",
          step: "0.01",
          required: lungo,
        })}
        {C("Superficie catastale (mq)", "superficie", {
          type: "number",
          step: "0.01",
        })}
        {C("Rendita (€)", "rendita", {
          type: "number",
          step: "0.01",
          required: lungo,
        })}
        {C("Quota di possesso (%)", "quotaPossesso", {
          type: "number",
          step: "0.01",
          def: "100",
        })}
        {C("Aliquota IMU (‰)", "aliquotaImu", {
          type: "number",
          step: "0.01",
          placeholder: "es. 10.6",
        })}
      </Sezione>

      <Sezione titolo="Affitto breve">
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
          <input type="checkbox" name="affittoBreve" defaultChecked={unita?.affittoBreve} /> Destinata ad affitto breve
        </label>
        {C("Gestore / agenzia", "gestore")}
        {C("Link calendario (iCal)", "icalUrl", {placeholder: "https://..."})}
        {C("CIN", "cin")}
      </Sezione>

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
          : unita
            ? "Salva modifiche"
            : "Salva appartamento"}
      </button>
    </form>
  );
}
