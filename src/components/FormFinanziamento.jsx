"use client";
import { useState, useActionState } from "react";
import {
  creaFinanziamento,
  aggiornaFinanziamento,
} from "@/app/investimenti/finanziamenti/actions";
import { inputCls } from "@/lib/ui";

const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function FormFinanziamento({
  palazzine,
  unita,
  ricorrenti = [],
  finanziamento,
  iniziale = {},
}) {
  const modifica = !!finanziamento;
  const [state, action, pending] = useActionState(
    modifica
      ? aggiornaFinanziamento.bind(null, finanziamento.id)
      : creaFinanziamento,
    null,
  );
  const f = finanziamento ?? {};
  const [scelta, setScelta] = useState("nuova");
  const [prima, setPrima] = useState(iso(f.primaRata));
  const [step, setStep] = useState(String(f.frequenzaMesi ?? 1));
  const [rata, setRata] = useState(f.rata ?? "");
  const [ultima, setUltima] = useState("");
  const [noto, setNoto] = useState("rata");
  const collegata = scelta !== "nuova" && scelta !== "nessuna";
  const bloccato = modifica || collegata;
  const dest = f.palazzinaId
    ? `palazzina:${f.palazzinaId}`
    : f.unitaId
      ? `unita:${f.unitaId}`
      : (iniziale.dest ?? "");

  function scegli(v) {
    setScelta(v);
    const r = ricorrenti.find((x) => String(x.id) === v);
    if (r) {
      setPrima(r.dal);
      setStep(String(r.step));
      setRata(r.importo);
      setUltima(r.al ?? "");
    }
  }

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
  const bloc = `${inputCls} ${bloccato ? "bg-gray-50 text-gray-500" : ""}`;

  return (
    <form action={action} className="max-w-4xl space-y-5">
      <section className={card}>
        <h2 className="mb-4 font-semibold">Finanziamento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {C("Descrizione", "descrizione", {
            def: f.descrizione,
            placeholder: "es. Mutuo acquisto palazzina",
            cls: "block sm:col-span-2",
          })}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Serve per
            </span>
            <select
              name="scopo"
              defaultValue={f.scopo ?? iniziale.scopo ?? "ACQUISTO"}
              className={inputCls}
            >
              <option value="ACQUISTO">Acquisto dell'immobile</option>
              <option value="LAVORI">Lavori / ristrutturazione</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Immobile
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
                    {u.palazzina ? `${u.palazzina} — ` : ""}
                    {u.nome}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          {C("Capitale erogato (€)", "importo", {
            type: "number",
            step: "0.01",
            def: f.importo,
          })}
          {C("Data di erogazione", "dataErogazione", {
            type: "date",
            def: iso(f.dataErogazione),
          })}
          {C(
            "Spese iniziali: istruttoria, perizia, imposta sostitutiva… (€)",
            "speseIniziali",
            { type: "number", step: "0.01", def: f.speseIniziali },
          )}
          {C("Note", "note", { def: f.note })}
        </div>
      </section>

      {!modifica && (
        <section className={card}>
          <h2 className="mb-1 font-semibold">Rate già tracciate come spese</h2>
          <p className="mb-3 text-xs text-gray-500">
            Collegando una ricorrenza esistente (es. «Mutuo palazzina») le spese
            già registrate restano e non si creano duplicati. Prima rata e
            frequenza sono quelle della ricorrenza.
          </p>
          <select
            name="ricorrente"
            value={scelta}
            onChange={(e) => scegli(e.target.value)}
            className={inputCls}
          >
            <option value="nuova">
              Crea la ricorrenza delle rate (le rate già scadute diventano
              spese)
            </option>
            {ricorrenti.map((r) => (
              <option key={r.id} value={r.id}>
                Collega: {r.descrizione} ({r.importo} €)
              </option>
            ))}
            <option value="nessuna">Non tracciare le rate come spese</option>
          </select>
          {scelta === "nuova" && (
            <p className="mt-2 text-xs text-amber-700">
              Se la prima rata è lontana nel tempo, le rate passate si
              registrano tutte come uscite negli anni scorsi. Per partire da
              oggi scegli «Non tracciare».
            </p>
          )}
        </section>
      )}

      <section className={card}>
        <h2 className="mb-4 font-semibold">Piano delle rate</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Data della prima rata
            </span>
            <input
              name="primaRata"
              type="date"
              value={prima}
              onChange={(e) => setPrima(e.target.value)}
              readOnly={bloccato}
              className={bloc}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Frequenza
            </span>
            <select
              name={bloccato ? undefined : "frequenzaMesi"}
              value={step}
              onChange={(e) => setStep(e.target.value)}
              disabled={bloccato}
              className={bloc}
            >
              <option value="1">Mensile</option>
              <option value="2">Bimestrale</option>
              <option value="3">Trimestrale</option>
              <option value="6">Semestrale</option>
              <option value="12">Annuale</option>
            </select>
            {bloccato && (
              <input type="hidden" name="frequenzaMesi" value={step} />
            )}
          </label>
          <span />
          {C("Numero di rate", "numeroRate", {
            type: "number",
            def: f.numeroRate,
          })}
          {!modifica && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                oppure data dell'ultima rata
              </span>
              <input
                name="ultimaRata"
                type="date"
                value={ultima}
                onChange={(e) => setUltima(e.target.value)}
                className={inputCls}
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex gap-6 text-sm">
          {[
            ["rata", "Conosco la rata"],
            ["tasso", "Conosco il tasso"],
          ].map(([v, t]) => (
            <label key={v} className="flex items-center gap-2">
              <input
                type="radio"
                name="noto"
                value={v}
                checked={noto === v}
                onChange={() => setNoto(v)}
              />{" "}
              {t}
            </label>
          ))}
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {noto === "rata" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Importo della rata (€)
              </span>
              <input
                name="rata"
                type="number"
                step="0.01"
                value={rata}
                onChange={(e) => setRata(e.target.value)}
                className={inputCls}
              />
            </label>
          ) : (
            C("Tasso nominale annuo (%)", "tassoAnnuo", {
              type: "number",
              step: "0.001",
              def: f.tassoAnnuo,
            })
          )}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {noto === "rata"
            ? "Il tasso si ricava dalla rata, dal numero di rate e dal capitale."
            : "La rata si ricava dal tasso, dal numero di rate e dal capitale."}
          {modifica && f.tassoAnnuo != null && (
            <>
              {" "}
              Tasso nominale attuale: <b>{f.tassoAnnuo.toFixed(3)}%</b>.
            </>
          )}{" "}
          Prima rata e frequenza non si cambiano dopo la creazione.
        </p>
      </section>

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
          : modifica
            ? "Salva modifiche"
            : "Crea il finanziamento"}
      </button>
    </form>
  );
}
