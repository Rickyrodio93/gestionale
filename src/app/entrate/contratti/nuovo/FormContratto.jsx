"use client";
import { useState, useActionState } from "react";
import { creaContratto, aggiornaContratto } from "@/app/entrate/actions";
import { inputCls } from "@/lib/ui";

const PRESET = {
  QUATTRO_PIU_QUATTRO: [48, 48],
  CONCORDATO_3_2: [36, 24],
  TRANSITORIO: [12, ""],
  ALTRO: [12, ""],
};

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function Sezione({ titolo, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-gray-800">{titolo}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

const C = (label, name, o = {}) => (
  <label key={name} className="block">
    <span className="mb-1 block text-xs font-medium text-gray-600">
      {label} {o.required && <span className="text-indigo-600">*</span>}
    </span>
    <input
      name={name}
      type={o.type ?? "text"}
      step={o.step}
      value={o.value}
      onChange={o.onChange}
      defaultValue={o.value === undefined ? (o.def ?? "") : undefined}
      className={inputCls}
      disabled={o.disabled}
    />
  </label>
);

export default function FormContratto({ unita, inquilini, contratto }) {
  const [state, action, pending] = useActionState(
    contratto ? aggiornaContratto.bind(null, contratto.id) : creaContratto,
    null,
  );
  const [inqSel, setInqSel] = useState(
    contratto?.inquilinoId ?? inquilini[0]?.id ?? "nuovo",
  );
  const [durata, setDurata] = useState(contratto?.durataMesi ?? 48);
  const [rinnovo, setRinnovo] = useState(contratto?.rinnovoMesi ?? 48);
  const [per, setPer] = useState(contratto?.periodicitaMesi ?? 1);
  const [can, setCan] = useState(contratto?.canone ?? "");
  const [ced, setCed] = useState(contratto?.cedolare ?? false);

  return (
    <form action={action} className="max-w-5xl space-y-5">
      <Sezione titolo="Unità">
        {contratto ? (
          <p className="text-sm font-medium sm:col-span-2">
            {contratto.unita.nome}
          </p>
        ) : (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Appartamento
            </span>
            <select name="unitaId" className={inputCls} defaultValue="">
              <option value="" disabled>
                Scegli…
              </option>
              {unita.map((u) => (
                <option key={u.id} value={u.id} disabled={!u.catasto}>
                  {u.palazzina ? `${u.palazzina.nome} — ` : ""}
                  {u.nome}
                  {!u.catasto ? " (catasto mancante)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </Sezione>

      <Sezione titolo="Inquilino">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Inquilino
          </span>
          <select
            name="inquilinoId"
            value={inqSel}
            onChange={(e) => setInqSel(e.target.value)}
            className={inputCls}
          >
            {inquilini.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
            <option value="nuovo">+ Nuovo inquilino…</option>
          </select>
        </label>
        {inqSel === "nuovo" && (
          <>
            {C("Nome / ragione sociale", "nome", { required: true })}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Tipo
              </span>
              <select name="tipoInquilino" className={inputCls}>
                <option value="PERSONA">Persona fisica</option>
                <option value="SOCIETA">Società</option>
              </select>
            </label>
            {C("Email", "email", { type: "email" })}
            {C("Telefono", "telefono")}
            {C("Codice fiscale / P.IVA", "cfPiva")}
          </>
        )}
      </Sezione>

      <Sezione titolo="Contratto">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Tipologia
          </span>
          <select
            name="modalita"
            className={inputCls}
            defaultValue={contratto?.modalita ?? "QUATTRO_PIU_QUATTRO"}
            onChange={(e) => {
              if (contratto) return; // in modifica non sovrascrivo durate già inserite
              const [d, r] = PRESET[e.target.value];
              setDurata(d);
              setRinnovo(r);
            }}
          >
            <option value="QUATTRO_PIU_QUATTRO">4+4 (canone libero)</option>
            <option value="CONCORDATO_3_2">3+2 (canone concordato)</option>
            <option value="TRANSITORIO">Transitorio</option>
            <option value="ALTRO">Altro</option>
          </select>
        </label>
        {C("Data inizio", "dataInizio", {
          type: "date",
          required: true,
          def: iso(contratto?.dataInizio),
        })}
        {C("Durata (mesi)", "durataMesi", {
          type: "number",
          required: true,
          value: durata,
          onChange: (e) => setDurata(e.target.value),
        })}
        {C("Data fine (vuota = calcolata)", "dataFine", {
          type: "date",
          def: iso(contratto?.dataFine),
        })}
        {C("Rinnovo (mesi)", "rinnovoMesi", {
          type: "number",
          value: rinnovo,
          onChange: (e) => setRinnovo(e.target.value),
        })}
        {C("Preavviso disdetta (mesi)", "preavvisoMesi", {
          type: "number",
          def: contratto?.preavvisoMesi ?? 6,
        })}
        {C("Canone mensile (€)", "canone", {
          type: "number",
          step: "any",
          value: can,
          onChange: (e) => setCan(e.target.value),
        })}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Il canone si paga
          </span>
          <select
            name="periodicitaMesi"
            value={per}
            onChange={(e) => setPer(Number(e.target.value))}
            className={inputCls}
          >
            <option value={1}>Ogni mese</option>
            <option value={2}>Ogni 2 mesi</option>
            <option value={3}>Ogni 3 mesi (trimestrale)</option>
            <option value={6}>Ogni 6 mesi</option>
            <option value={12}>Ogni anno</option>
          </select>
        </label>
        {per > 1 &&
          C(
            "Primo giorno di un periodo di pagamento (vuoto = inizio contratto)",
            "ancoraPeriodi",
            { type: "date", def: iso(contratto?.ancoraPeriodi) },
          )}
        {per > 1 && can !== "" && (
          <p className="text-xs text-gray-500 sm:col-span-2 lg:col-span-3">
            Importo di ogni periodo: <b>{(Number(can) * per).toFixed(2)} €</b>,
            dovuto in anticipo dal primo giorno del periodo. Per 1050 €
            trimestrali inserisci 350 come canone mensile.
          </p>
        )}
        {C("N° persone", "persone", {
          type: "number",
          def: contratto?.persone,
        })}
        {C("Cauzione (€)", "cauzione", {
          type: "number",
          step: "0.01",
          def: contratto?.cauzione,
          disabled: !!contratto?.cauzioneRestituitaIl,
        })}
        {C("Cauzione versata il", "cauzioneVersataIl", {
          type: "date",
          def: iso(contratto?.cauzioneVersataIl),
          disabled: !!contratto?.cauzioneRestituitaIl,
        })}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="cedolare"
            checked={ced}
            onChange={(e) => setCed(e.target.value)}
          />{" "}
          Cedolare secca
        </label>
        {ced && C("Aliquota cedolare (%)", "aliquotaCedolare", {type: "number", step: "0.01", def: contratto?.aliquotaCedolare ?? 21})}
        {ced && (
          <p className="text-xs text-gray-500 sm:col-span-2 lg:col-span-3">
            21% per il canone libero; 10% solo per il canone concordato nei comuni ad alta tensione abitativa e con i requisiti previsti.
          </p>
        )}
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
          : contratto
            ? "Salva modifiche"
            : "Salva contratto"}
      </button>
    </form>
  );
}
