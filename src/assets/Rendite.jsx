import { useState } from "react";
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
import { formatEuro, formatDate } from "./store.js";
import { Pencil, Trash2 } from "lucide-react";

const PIATTAFORME = ["Airbnb", "Booking.com", "Vrbo", "Diretto", "Altra"];

/* ── Affitto lungo ── */
function LungoForm({ init = {}, immobili, onSave, onClose }) {
  const [form, setForm] = useState({
    immobileId: immobili[0]?.id || "",
    tipo: "lungo",
    inquilino: "",
    importo: "",
    dataInizio: "",
    dataFine: "",
    giornoPagamento: 5,
    note: "",
    pagamenti: [],
    ...init,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const mesiKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };
  const togglePagamento = (key) => {
    const list = form.pagamenti || [];
    set(
      "pagamenti",
      list.includes(key) ? list.filter((x) => x !== key) : [...list, key],
    );
  };
  const ultimiMesi = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11 + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...form,
          importo: Number(form.importo),
          giornoPagamento: Number(form.giornoPagamento),
        });
      }}
    >
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
      <Field label="Nome inquilino">
        <Input
          value={form.inquilino}
          onChange={(e) => set("inquilino", e.target.value)}
          placeholder="Nome Cognome"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Canone mensile (€)">
          <Input
            type="number"
            step="0.01"
            value={form.importo}
            onChange={(e) => set("importo", e.target.value)}
            required
          />
        </Field>
        <Field label="Giorno pagamento">
          <Input
            type="number"
            min="1"
            max="28"
            value={form.giornoPagamento}
            onChange={(e) => set("giornoPagamento", e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data inizio contratto">
          <Input
            type="date"
            value={form.dataInizio}
            onChange={(e) => set("dataInizio", e.target.value)}
          />
        </Field>
        <Field label="Data fine contratto">
          <Input
            type="date"
            value={form.dataFine}
            onChange={(e) => set("dataFine", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Note (tipo contratto, ecc.)">
        <Textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="es. Contratto 4+4, cedolare secca..."
        />
      </Field>
      <Field label="Pagamenti ricevuti (ultimi 12 mesi)">
        <div className="flex flex-wrap gap-2 mt-1">
          {ultimiMesi.map((m) => {
            const ok = (form.pagamenti || []).includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => togglePagamento(m)}
                className="px-2 py-1 rounded-lg text-xs font-500 cursor-pointer"
                style={{
                  background: ok ? "var(--c-green)" : "var(--c-surface-alt)",
                  color: ok ? "#fff" : "var(--c-text-muted)",
                  border: "1px solid var(--c-border)",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Btn>
        <Btn type="submit" variant="green">
          Salva affitto
        </Btn>
      </div>
    </form>
  );
}

/* ── Affitto breve ── */
function BreveForm({ init = {}, immobili, onSave, onClose }) {
  const [form, setForm] = useState({
    immobileId: immobili[0]?.id || "",
    tipo: "breve",
    piattaforma: "Airbnb",
    importoNotte: "",
    note: "",
    prenotazioni: [],
    ...init,
  });
  const [newPren, setNewPren] = useState({
    da: "",
    a: "",
    ospite: "",
    totale: "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setNP = (k, v) => setNewPren((p) => ({ ...p, [k]: v }));

  const addPren = () => {
    if (!newPren.da || !newPren.a) return;
    const nights = Math.ceil(
      (new Date(newPren.a) - new Date(newPren.da)) / 86400000,
    );
    const totale = newPren.totale || nights * Number(form.importoNotte || 0);
    set("prenotazioni", [
      ...form.prenotazioni,
      { id: Date.now().toString(), ...newPren, totale: Number(totale) },
    ]);
    setNewPren({ da: "", a: "", ospite: "", totale: "" });
  };
  const removePren = (id) =>
    set(
      "prenotazioni",
      form.prenotazioni.filter((p) => p.id !== id),
    );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, importoNotte: Number(form.importoNotte) });
      }}
    >
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Piattaforma">
          <Select
            value={form.piattaforma}
            onChange={(e) => set("piattaforma", e.target.value)}
          >
            {PIATTAFORME.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prezzo a notte (€)">
          <Input
            type="number"
            step="0.01"
            value={form.importoNotte}
            onChange={(e) => set("importoNotte", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Note">
        <Textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </Field>

      {/* Prenotazioni */}
      <div>
        <label
          className="text-xs font-600 uppercase tracking-wider"
          style={{ color: "var(--c-text-muted)" }}
        >
          Prenotazioni
        </label>
        <div className="flex flex-col gap-2 mt-2">
          {form.prenotazioni.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-xl p-3"
              style={{ background: "var(--c-surface-alt)" }}
            >
              <div className="flex-1 text-sm">
                <span className="font-500">{p.ospite || "Ospite"}</span>
                <span className="ml-2" style={{ color: "var(--c-text-muted)" }}>
                  {formatDate(p.da)} → {formatDate(p.a)}
                </span>
              </div>
              <span
                className="font-600 text-sm"
                style={{ color: "var(--c-green)" }}
              >
                {formatEuro(p.totale)}
              </span>
              <button
                type="button"
                onClick={() => removePren(p.id)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: "#fee2e2", color: "#dc2626" }}
              >
                ✕
              </button>
            </div>
          ))}
          <div
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{
              background: "var(--c-surface-alt)",
              border: "1px dashed var(--c-border)",
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={newPren.da}
                onChange={(e) => setNP("da", e.target.value)}
                placeholder="Dal"
              />
              <Input
                type="date"
                value={newPren.a}
                onChange={(e) => setNP("a", e.target.value)}
                placeholder="Al"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newPren.ospite}
                onChange={(e) => setNP("ospite", e.target.value)}
                placeholder="Nome ospite"
              />
              <Input
                type="number"
                value={newPren.totale}
                onChange={(e) => setNP("totale", e.target.value)}
                placeholder="Totale €"
              />
            </div>
            <Btn
              type="button"
              variant="ghost"
              onClick={addPren}
              className="self-start text-xs"
            >
              ＋ Aggiungi prenotazione
            </Btn>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Btn>
        <Btn type="submit" variant="green">
          Salva
        </Btn>
      </div>
    </form>
  );
}

export default function Rendite({ data, addItem, removeItem, updateItem }) {
  const [modal, setModal] = useState(null);
  const { ask, ConfirmModal } = useConfirm();

  const immobili = data.immobili || [];
  const rendite = data.rendite || [];

  const nomeImm = (id) => immobili.find((i) => i.id === id)?.nome || "—";

  const totaleRendita = (r) => {
    if (r.tipo === "lungo") return Number(r.importo || 0);
    return (r.prenotazioni || []).reduce(
      (a, p) => a + Number(p.totale || 0),
      0,
    );
  };

  const totaleGlobale = rendite.reduce((a, r) => a + totaleRendita(r), 0);
  const totaleBreve = rendite
    .filter((r) => r.tipo === "breve")
    .reduce((a, r) => a + totaleRendita(r), 0);
  const totaleLungo = rendite
    .filter((r) => r.tipo === "lungo")
    .reduce((a, r) => a + totaleRendita(r), 0);

  const mesiKey = (offset = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="serif text-3xl">Rendite</h1>
          <p className="text-sm mt-1" style={{ color: "var(--c-text-muted)" }}>
            Affitti brevi e contratti di locazione
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setModal("breve")}>
            ＋ Breve termine
          </Btn>
          <Btn variant="green" onClick={() => setModal("lungo")}>
            ＋ Lungo termine
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Rendite totali"
          value={formatEuro(totaleGlobale)}
          color="var(--c-green)"
        />
        <StatCard
          label="Affitti mensili"
          value={formatEuro(totaleLungo)}
          sub="contratti attivi"
        />
        <StatCard
          label="Affitti brevi"
          value={formatEuro(totaleBreve)}
          sub="prenotazioni registrate"
        />
      </div>

      {rendite.length === 0 ? (
        <EmptyState
          icon="💰"
          title="Nessuna rendita"
          description="Aggiungi contratti di affitto o prenotazioni per tracciare le entrate."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Lungo termine */}
          {rendite.filter((r) => r.tipo === "lungo").length > 0 && (
            <div>
              <div
                className="font-600 text-sm uppercase tracking-wider mb-3"
                style={{ color: "var(--c-text-muted)" }}
              >
                📄 Contratti di locazione
              </div>
              <div className="flex flex-col gap-3">
                {rendite
                  .filter((r) => r.tipo === "lungo")
                  .map((r) => {
                    const meseCorrente = mesiKey();
                    const pagato = (r.pagamenti || []).includes(meseCorrente);
                    const scaduto =
                      r.dataFine && new Date(r.dataFine) < new Date();
                    return (
                      <Card key={r.id} className="flex items-start gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: "var(--c-green-soft)" }}
                        >
                          🏘️
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-600">{r.inquilino}</span>
                            {pagato ? (
                              <Badge color="green">✓ Pagato questo mese</Badge>
                            ) : (
                              <Badge color="red">
                                ⚠ Non pagato questo mese
                              </Badge>
                            )}
                            {scaduto && (
                              <Badge color="red">Contratto scaduto</Badge>
                            )}
                          </div>
                          <div
                            className="text-xs mt-1"
                            style={{ color: "var(--c-text-muted)" }}
                          >
                            {nomeImm(r.immobileId)} · {formatDate(r.dataInizio)}{" "}
                            → {formatDate(r.dataFine)}
                            {r.note && ` · ${r.note}`}
                          </div>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {(r.pagamenti || []).slice(-6).map((m) => (
                              <span
                                key={m}
                                className="text-xs px-2 py-0.5 rounded-lg"
                                style={{
                                  background: "var(--c-green-soft)",
                                  color: "var(--c-green)",
                                }}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className="font-700 text-lg"
                            style={{ color: "var(--c-green)" }}
                          >
                            {formatEuro(r.importo)}
                            <span className="text-xs font-400">/mese</span>
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--c-text-muted)" }}
                          >
                            giorno {r.giornoPagamento}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Btn
                            variant="ghost"
                            className="text-xs px-2"
                            onClick={() => setModal({ edit: r })}
                          >
                            <Pencil />
                          </Btn>
                          <Btn
                            variant="danger"
                            className="text-xs px-2"
                            onClick={() =>
                              ask(() => removeItem("rendite", r.id))
                            }
                          >
                            <Trash2/>
                          </Btn>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Breve termine */}
          {rendite.filter((r) => r.tipo === "breve").length > 0 && (
            <div>
              <div
                className="font-600 text-sm uppercase tracking-wider mb-3"
                style={{ color: "var(--c-text-muted)" }}
              >
                🏨 Affitti brevi
              </div>
              <div className="flex flex-col gap-3">
                {rendite
                  .filter((r) => r.tipo === "breve")
                  .map((r) => {
                    const prenotazioni = r.prenotazioni || [];
                    const tot = prenotazioni.reduce(
                      (a, p) => a + Number(p.totale || 0),
                      0,
                    );
                    return (
                      <Card key={r.id}>
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: "var(--c-blue-soft)" }}
                          >
                            🛏️
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-600">
                                {nomeImm(r.immobileId)}
                              </span>
                              <Badge color="blue">{r.piattaforma}</Badge>
                              {r.importoNotte > 0 && (
                                <span
                                  className="text-xs"
                                  style={{ color: "var(--c-text-muted)" }}
                                >
                                  {formatEuro(r.importoNotte)}/notte
                                </span>
                              )}
                            </div>
                            {r.note && (
                              <div
                                className="text-xs mt-1"
                                style={{ color: "var(--c-text-muted)" }}
                              >
                                {r.note}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className="font-700 text-lg"
                              style={{ color: "var(--c-green)" }}
                            >
                              {formatEuro(tot)}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--c-text-muted)" }}
                            >
                              {prenotazioni.length} prenotazioni
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Btn
                              variant="ghost"
                              className="text-xs px-2"
                              onClick={() => setModal({ edit: r })}
                            >
                              <Pencil />
                            </Btn>
                            <Btn
                              variant="danger"
                              className="text-xs px-2"
                              onClick={() =>
                                ask(() => removeItem("rendite", r.id))
                              }
                            >
                              <Trash2/>
                            </Btn>
                          </div>
                        </div>
                        {prenotazioni.length > 0 && (
                          <div className="mt-3 flex flex-col gap-1.5">
                            {prenotazioni.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
                                style={{ background: "var(--c-surface-alt)" }}
                              >
                                <span style={{ color: "var(--c-text-muted)" }}>
                                  {formatDate(p.da)} → {formatDate(p.a)}
                                </span>
                                <span className="flex-1 font-500">
                                  {p.ospite}
                                </span>
                                <span
                                  className="font-600"
                                  style={{ color: "var(--c-green)" }}
                                >
                                  {formatEuro(p.totale)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {modal === "lungo" && (
        <Modal title="Contratto di affitto" onClose={() => setModal(null)} wide>
          <LungoForm
            immobili={immobili}
            onSave={(f) => {
              addItem("rendite", f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "breve" && (
        <Modal
          title="Affitto breve termine"
          onClose={() => setModal(null)}
          wide
        >
          <BreveForm
            immobili={immobili}
            onSave={(f) => {
              addItem("rendite", f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.edit && modal.edit.tipo === "lungo" && (
        <Modal title="Modifica affitto" onClose={() => setModal(null)} wide>
          <LungoForm
            init={modal.edit}
            immobili={immobili}
            onSave={(f) => {
              updateItem("rendite", modal.edit.id, f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.edit && modal.edit.tipo === "breve" && (
        <Modal
          title="Modifica affitto breve"
          onClose={() => setModal(null)}
          wide
        >
          <BreveForm
            init={modal.edit}
            immobili={immobili}
            onSave={(f) => {
              updateItem("rendite", modal.edit.id, f);
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
