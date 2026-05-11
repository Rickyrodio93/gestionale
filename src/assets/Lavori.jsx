import { useState, useMemo } from "react";
import {
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Btn,
  Card,
  Badge,
  StatCard,
  EmptyState,
  useConfirm,
} from "./ui.jsx";
import { CATEGORIE_VOCE, UM_OPTIONS, formatEuro, formatDate } from "./store.js";
import { Hammer, Pencil, Trash2 } from "lucide-react";

const STATI = [
  { value: "pianificato", label: "Pianificato", color: "blue" },
  { value: "in_corso", label: "In corso", color: "yellow" },
  { value: "completato", label: "Completato", color: "green" },
  { value: "sospeso", label: "Sospeso", color: "default" },
];

function VoceRow({ v, onChange, onRemove }) {
  const set = (k, val) => onChange({ ...v, [k]: val });
  const totale = Number(v.quantita || 0) * Number(v.prezzoUnitario || 0);
  return (
    <div
      className="grid gap-2 p-3 rounded-xl"
      style={{
        background: "var(--c-surface-alt)",
        gridTemplateColumns: "2fr 80px 80px 100px 100px auto",
      }}
    >
      <Input
        value={v.descrizione}
        onChange={(e) => set("descrizione", e.target.value)}
        placeholder="Descrizione lavorazione..."
      />
      <Select value={v.um} onChange={(e) => set("um", e.target.value)}>
        {UM_OPTIONS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        step="0.01"
        value={v.quantita}
        onChange={(e) => set("quantita", e.target.value)}
        placeholder="Qtà"
      />
      <Input
        type="number"
        step="0.01"
        value={v.prezzoUnitario}
        onChange={(e) => set("prezzoUnitario", e.target.value)}
        placeholder="€/um"
      />
      <div
        className="flex items-center justify-end font-600 text-sm pr-1"
        style={{ color: "var(--c-text)" }}
      >
        {formatEuro(totale)}
      </div>
      <button
        onClick={onRemove}
        type="button"
        className="w-7 h-7 rounded-lg text-sm flex items-center justify-center"
        style={{ background: "#fee2e2", color: "#dc2626", cursor: "pointer" }}
      >
        ✕
      </button>
    </div>
  );
}

function LavoroForm({ init = {}, immobili, onSave, onClose }) {
  const [form, setForm] = useState({
    immobileId: immobili[0]?.id || "",
    titolo: "",
    stato: "pianificato",
    dataInizio: "",
    dataFine: "",
    note: "",
    voci: [],
    ...init,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addVoce = () =>
    set("voci", [
      ...(form.voci || []),
      {
        id: Date.now().toString(),
        descrizione: "",
        um: "mq",
        quantita: "",
        prezzoUnitario: "",
        categoria: "materiali",
      },
    ]);

  const updateVoce = (idx, changes) => {
    const v = [...(form.voci || [])];
    v[idx] = { ...v[idx], ...changes };
    set("voci", v);
  };

  const removeVoce = (idx) =>
    set(
      "voci",
      form.voci.filter((_, i) => i !== idx),
    );

  const totale = (form.voci || []).reduce(
    (a, v) => a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
    0,
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Immobile">
          <Select
            value={form.immobileId}
            onChange={(e) => set("immobileId", e.target.value)}
            required
          >
            {immobili.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Stato">
          <Select
            value={form.stato}
            onChange={(e) => set("stato", e.target.value)}
          >
            {STATI.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Titolo lavoro">
        <Input
          value={form.titolo}
          onChange={(e) => set("titolo", e.target.value)}
          placeholder="es. Rifacimento bagno principale"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data inizio">
          <Input
            type="date"
            value={form.dataInizio}
            onChange={(e) => set("dataInizio", e.target.value)}
          />
        </Field>
        <Field label="Data fine">
          <Input
            type="date"
            value={form.dataFine}
            onChange={(e) => set("dataFine", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Note">
        <Textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </Field>

      {/* Computo metrico */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-xs font-600 uppercase tracking-wider"
            style={{ color: "var(--c-text-muted)" }}
          >
            Computo metrico
          </label>
          {form.voci?.length > 0 && (
            <div className="flex gap-2">
              {["materiali", "manodopera", "altro"].map((cat) => {
                const sub = (form.voci || [])
                  .filter((v) => v.categoria === cat)
                  .reduce(
                    (a, v) =>
                      a +
                      Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
                    0,
                  );
                if (sub === 0) return null;
                return (
                  <span
                    key={cat}
                    className="text-xs"
                    style={{ color: "var(--c-text-muted)" }}
                  >
                    {cat}: {formatEuro(sub)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Header */}
        {form.voci?.length > 0 && (
          <div
            className="grid gap-2 px-3 py-1 text-xs font-600 uppercase tracking-wider"
            style={{
              gridTemplateColumns: "2fr 80px 80px 100px 100px auto",
              color: "var(--c-text-muted)",
            }}
          >
            <span>Descrizione</span>
            <span>U.M.</span>
            <span>Qtà</span>
            <span>€/U.M.</span>
            <span className="text-right">Totale</span>
            <span></span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {(form.voci || []).map((v, i) => (
            <div key={v.id} className="flex flex-col gap-1">
              <div className="flex gap-2 items-center px-3">
                <Select
                  value={v.categoria}
                  onChange={(e) => updateVoce(i, { categoria: e.target.value })}
                  style={{ width: "auto" }}
                >
                  {CATEGORIE_VOCE.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <VoceRow
                v={v}
                onChange={(ch) => updateVoce(i, ch)}
                onRemove={() => removeVoce(i)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <Btn
            type="button"
            variant="ghost"
            onClick={addVoce}
            className="text-xs"
          >
            ＋ Aggiungi voce
          </Btn>
          {form.voci?.length > 0 && (
            <div
              className="font-700 text-base"
              style={{ color: "var(--c-text)" }}
            >
              Totale: {formatEuro(totale)}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Btn>
        <Btn type="submit">Salva lavoro</Btn>
      </div>
    </form>
  );
}

export default function Lavori({ data, addItem, removeItem, updateItem }) {
  const [modal, setModal] = useState(null);
  const [filtroStato, setFiltroStato] = useState("tutti");
  const { ask, ConfirmModal } = useConfirm();

  const immobili = data.immobili || [];
  const lavori = data.lavori || [];

  const filtered = useMemo(
    () =>
      lavori
        .filter((l) => filtroStato === "tutti" || l.stato === filtroStato)
        .sort((a, b) => (b.dataInizio || "").localeCompare(a.dataInizio || "")),
    [lavori, filtroStato],
  );

  const nomeImm = (id) => immobili.find((i) => i.id === id)?.nome || "—";

  const totaleLavoro = (l) =>
    (l.voci || []).reduce(
      (a, v) => a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
      0,
    );

  const totaleGlobale = lavori.reduce((a, l) => a + totaleLavoro(l), 0);
  const inCorso = lavori.filter((l) => l.stato === "in_corso").length;
  const pianificati = lavori.filter((l) => l.stato === "pianificato").length;

  const statoInfo = (v) => STATI.find((s) => s.value === v) || STATI[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="serif text-3xl">Lavori & Computi</h1>
          <p className="text-sm mt-1" style={{ color: "var(--c-text-muted)" }}>
            Ristrutturazioni e computi metrici
          </p>
        </div>
        <Btn onClick={() => setModal("new")}>＋ Nuovo lavoro</Btn>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Valore totale lavori"
          value={formatEuro(totaleGlobale)}
          color="var(--c-yellow)"
        />
        <StatCard label="In corso" value={inCorso} sub="cantieri attivi" />
        <StatCard label="Pianificati" value={pianificati} sub="da avviare" />
      </div>

      {/* Filtri */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[{ value: "tutti", label: "Tutti" }, ...STATI].map((s) => (
          <button
            key={s.value}
            onClick={() => setFiltroStato(s.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-500 cursor-pointer"
            style={{
              background:
                filtroStato === s.value ? "var(--c-text)" : "var(--c-surface)",
              color:
                filtroStato === s.value ? "var(--c-bg)" : "var(--c-text-muted)",
              border: "1px solid var(--c-border)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Hammer/>}
          title="Nessun lavoro"
          description="Aggiungi ristrutturazioni e computi metrici per tracciare i costi dei lavori."
          action={<Btn onClick={() => setModal("new")}>Aggiungi lavoro</Btn>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((l) => {
            const stato = statoInfo(l.stato);
            const totale = totaleLavoro(l);
            const materiali = (l.voci || [])
              .filter((v) => v.categoria === "materiali")
              .reduce(
                (a, v) =>
                  a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
                0,
              );
            const manodopera = (l.voci || [])
              .filter((v) => v.categoria === "manodopera")
              .reduce(
                (a, v) =>
                  a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
                0,
              );
            return (
              <Card key={l.id}>
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: "var(--c-yellow-soft)" }}
                  >
                    <Hammer/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-600 text-base">{l.titolo}</span>
                      <Badge color={stato.color}>{stato.label}</Badge>
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--c-text-muted)" }}
                    >
                      {nomeImm(l.immobileId)}
                      {l.dataInizio && ` · ${formatDate(l.dataInizio)}`}
                      {l.dataFine && ` → ${formatDate(l.dataFine)}`}
                    </div>
                    {l.note && (
                      <div
                        className="text-sm mt-1"
                        style={{ color: "var(--c-text-muted)" }}
                      >
                        {l.note}
                      </div>
                    )}
                    {(l.voci || []).length > 0 && (
                      <div className="flex gap-3 mt-3 flex-wrap">
                        {materiali > 0 && (
                          <div
                            className="rounded-lg px-3 py-1.5 text-xs font-500"
                            style={{
                              background: "var(--c-blue-soft)",
                              color: "var(--c-blue)",
                            }}
                          >
                            🧱 Materiali: {formatEuro(materiali)}
                          </div>
                        )}
                        {manodopera > 0 && (
                          <div
                            className="rounded-lg px-3 py-1.5 text-xs font-500"
                            style={{
                              background: "var(--c-yellow-soft)",
                              color: "var(--c-yellow)",
                            }}
                          >
                            👷 Manodopera: {formatEuro(manodopera)}
                          </div>
                        )}
                        {totale - materiali - manodopera > 0.01 && (
                          <div
                            className="rounded-lg px-3 py-1.5 text-xs font-500"
                            style={{
                              background: "var(--c-surface-alt)",
                              color: "var(--c-text-muted)",
                            }}
                          >
                            Altro: {formatEuro(totale - materiali - manodopera)}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Voci computo */}
                    {(l.voci || []).length > 0 && (
                      <details className="mt-3">
                        <summary
                          className="text-xs cursor-pointer font-500"
                          style={{ color: "var(--c-text-muted)" }}
                        >
                          {l.voci.length} voci nel computo metrico
                        </summary>
                        <div className="mt-2 flex flex-col gap-1.5">
                          <div
                            className="grid text-xs font-600 uppercase tracking-wider px-3 py-1"
                            style={{
                              gridTemplateColumns: "2fr 60px 70px 80px 80px",
                              color: "var(--c-text-muted)",
                            }}
                          >
                            <span>Descrizione</span>
                            <span>U.M.</span>
                            <span>Qtà</span>
                            <span>€/U.M.</span>
                            <span className="text-right">Totale</span>
                          </div>
                          {l.voci.map((v) => (
                            <div
                              key={v.id}
                              className="grid items-center text-sm rounded-lg px-3 py-2"
                              style={{
                                gridTemplateColumns: "2fr 60px 70px 80px 80px",
                                background: "var(--c-surface-alt)",
                              }}
                            >
                              <span className="truncate">{v.descrizione}</span>
                              <span style={{ color: "var(--c-text-muted)" }}>
                                {v.um}
                              </span>
                              <span>{v.quantita}</span>
                              <span>{formatEuro(v.prezzoUnitario)}</span>
                              <span className="text-right font-600">
                                {formatEuro(
                                  Number(v.quantita || 0) *
                                    Number(v.prezzoUnitario || 0),
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="font-700 text-xl"
                      style={{ color: "var(--c-yellow)" }}
                    >
                      {formatEuro(totale)}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--c-text-muted)" }}
                    >
                      {(l.voci || []).length} voci
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Btn
                      variant="ghost"
                      className="text-xs px-2"
                      onClick={() => setModal({ edit: l })}
                    >
                      <Pencil/>
                    </Btn>
                    <Btn
                      variant="danger"
                      className="text-xs px-2"
                      onClick={() => ask(() => removeItem("lavori", l.id))}
                    >
                      <Trash2 />
                    </Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal === "new" && (
        <Modal
          title="Nuovo lavoro / Computo metrico"
          onClose={() => setModal(null)}
          wide
        >
          <LavoroForm
            immobili={immobili}
            onSave={(f) => {
              addItem("lavori", f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Modifica lavoro" onClose={() => setModal(null)} wide>
          <LavoroForm
            init={modal.edit}
            immobili={immobili}
            onSave={(f) => {
              updateItem("lavori", modal.edit.id, f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {ConfirmModal}
    </div>
  );
}
