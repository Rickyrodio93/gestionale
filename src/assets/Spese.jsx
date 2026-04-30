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
import { CATEGORIE_SPESA, formatEuro, formatDate } from "./store.js";

const FREQUENZE = [
  "mensile",
  "bimestrale",
  "trimestrale",
  "semestrale",
  "annuale",
  "una tantum",
];

function SpesaForm({ init = {}, immobili, onSave, onClose }) {
  const [form, setForm] = useState({
    immobileId: immobili[0]?.id || "",
    categoria: "luce",
    fornitore: "",
    importo: "",
    data: new Date().toISOString().slice(0, 10),
    note: "",
    ricorrente: false,
    frequenza: "mensile",
    ...init,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, importo: Number(form.importo) });
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
        <Field label="Categoria">
          <Select
            value={form.categoria}
            onChange={(e) => set("categoria", e.target.value)}
          >
            {CATEGORIE_SPESA.map((c) => (
              <option key={c.value} value={c.value}>
                {c.emoji} {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fornitore">
          <Input
            value={form.fornitore}
            onChange={(e) => set("fornitore", e.target.value)}
            placeholder="es. Enel, Eni Gas..."
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Importo (€)">
          <Input
            type="number"
            step="0.01"
            value={form.importo}
            onChange={(e) => set("importo", e.target.value)}
            placeholder="0.00"
            required
          />
        </Field>
        <Field label="Data">
          <Input
            type="date"
            value={form.data}
            onChange={(e) => set("data", e.target.value)}
            required
          />
        </Field>
      </div>
      <div className="flex items-center gap-3 py-1">
        <input
          type="checkbox"
          id="ric"
          checked={form.ricorrente}
          onChange={(e) => set("ricorrente", e.target.checked)}
          className="w-4 h-4 accent-orange-600"
        />
        <label htmlFor="ric" className="text-sm font-500">
          Spesa ricorrente
        </label>
        {form.ricorrente && (
          <Select
            value={form.frequenza}
            onChange={(e) => set("frequenza", e.target.value)}
            className="ml-2"
          >
            {FREQUENZE.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Field label="Note">
        <Textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </Field>
      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Btn>
        <Btn type="submit">Salva spesa</Btn>
      </div>
    </form>
  );
}

export default function Spese({ data, addItem, removeItem, updateItem }) {
  const [modal, setModal] = useState(null);
  const [filtroImm, setFiltroImm] = useState("tutti");
  const [filtroCat, setFiltroCat] = useState("tutte");
  const { ask, ConfirmModal } = useConfirm();

  const immobili = data.immobili || [];
  const spese = data.spese || [];

  const filtered = useMemo(
    () =>
      spese
        .filter((s) => filtroImm === "tutti" || s.immobileId === filtroImm)
        .filter((s) => filtroCat === "tutte" || s.categoria === filtroCat)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [spese, filtroImm, filtroCat],
  );

  const totale = filtered.reduce((a, s) => a + Number(s.importo), 0);
  const ricorrenti = filtered.filter((s) => s.ricorrente).length;

  const nomeImm = (id) => immobili.find((i) => i.id === id)?.nome || "—";
  const catInfo = (val) =>
    CATEGORIE_SPESA.find((c) => c.value === val) || { emoji: "📌", label: val };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="serif text-3xl">Spese</h1>
          <p className="text-sm mt-1" style={{ color: "var(--c-text-muted)" }}>
            Bollette, utenze, manutenzioni
          </p>
        </div>
        <Btn onClick={() => setModal("new")}>＋ Aggiungi spesa</Btn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Totale filtrato"
          value={formatEuro(totale)}
          color="var(--c-accent)"
        />
        <StatCard label="Voci" value={filtered.length} sub="movimenti" />
        <StatCard label="Ricorrenti" value={ricorrenti} sub="spese fisse" />
      </div>

      {/* Filtri */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Select
          value={filtroImm}
          onChange={(e) => setFiltroImm(e.target.value)}
          style={{ width: "auto" }}
        >
          <option value="tutti">Tutti gli immobili</option>
          {immobili.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </Select>
        <Select
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
          style={{ width: "auto" }}
        >
          <option value="tutte">Tutte le categorie</option>
          {CATEGORIE_SPESA.map((c) => (
            <option key={c.value} value={c.value}>
              {c.emoji} {c.label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Nessuna spesa"
          description="Aggiungi bollette e utenze per tenere traccia dei costi."
          action={<Btn onClick={() => setModal("new")}>Aggiungi spesa</Btn>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s) => {
            const cat = catInfo(s.categoria);
            return (
              <Card key={s.id} className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "var(--c-accent-soft)" }}
                >
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-600 text-sm">{cat.label}</span>
                    {s.fornitore && (
                      <span
                        className="text-sm"
                        style={{ color: "var(--c-text-muted)" }}
                      >
                        {s.fornitore}
                      </span>
                    )}
                    {s.ricorrente && (
                      <Badge color="blue">🔁 {s.frequenza}</Badge>
                    )}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--c-text-muted)" }}
                  >
                    {nomeImm(s.immobileId)} · {formatDate(s.data)}
                    {s.note && ` · ${s.note}`}
                  </div>
                </div>
                <div
                  className="font-700 text-lg shrink-0"
                  style={{ color: "var(--c-accent)" }}
                >
                  {formatEuro(s.importo)}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Btn
                    variant="ghost"
                    className="text-xs px-2"
                    onClick={() => setModal({ edit: s })}
                  >
                    ✏️
                  </Btn>
                  <Btn
                    variant="danger"
                    className="text-xs px-2"
                    onClick={() => ask(() => removeItem("spese", s.id))}
                  >
                    🗑
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal === "new" && (
        <Modal title="Nuova spesa" onClose={() => setModal(null)}>
          <SpesaForm
            immobili={immobili}
            onSave={(f) => {
              addItem("spese", f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Modifica spesa" onClose={() => setModal(null)}>
          <SpesaForm
            init={modal.edit}
            immobili={immobili}
            onSave={(f) => {
              updateItem("spese", modal.edit.id, f);
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
