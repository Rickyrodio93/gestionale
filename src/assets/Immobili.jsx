import { useState } from "react";
import {
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Btn,
  EmptyState,
  useConfirm,
} from "./ui.jsx";
import { formatEuro } from "./store.js";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";

const TIPI_UNITA = [
  "appartamento",
  "villa",
  "box",
  "locale commerciale",
  "altro",
];

const sectionLabel = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--c-text-muted)",
  marginBottom: 8,
};

function pill(active) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 9px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    background: active ? "var(--c-accent-soft)" : "var(--c-surface-alt)",
    color: active ? "var(--c-accent)" : "var(--c-text-muted)",
    border: "1px solid var(--c-border)",
  };
}

function statColor(c) {
  return c === "green"
    ? "var(--c-green)"
    : c === "accent"
      ? "var(--c-accent)"
      : c === "red"
        ? "#dc2626"
        : "var(--c-text)";
}

/* ── Form palazzina ── */
function PalazzinaForm({ init = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    nome: "",
    indirizzo: "",
    piano_totali: "",
    note: "",
    ...init,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, _tipo: "palazzina" });
      }}
    >
      <Field label="Nome / identificativo palazzina">
        <Input
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
          placeholder="es. Palazzina Via Roma"
          required
        />
      </Field>
      <Field label="Indirizzo">
        <Input
          value={form.indirizzo}
          onChange={(e) => set("indirizzo", e.target.value)}
          placeholder="es. Via Roma 12, Milano"
        />
      </Field>
      <Field label="Piani totali">
        <Input
          type="number"
          value={form.piano_totali}
          onChange={(e) => set("piano_totali", e.target.value)}
          placeholder="4"
        />
      </Field>
      <Field label="Note">
        <Textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Anno costruzione, caratteristiche, ecc."
        />
      </Field>
      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Btn>
        <Btn type="submit">Salva palazzina</Btn>
      </div>
    </form>
  );
}

/* ── Form unità ── */
function UnitaForm({ init = {}, palazzine, onSave, onClose }) {
  const [form, setForm] = useState({
    nome: "",
    tipo: "appartamento",
    mq: "",
    piano: "",
    palazzinaId: "",
    note: "",
    ...init,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, _tipo: "unita" });
      }}
    >
      <Field label="Nome / indirizzo unità">
        <Input
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
          placeholder="es. Appartamento 3, Via Roma 12"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo">
          <Select
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value)}
          >
            {TIPI_UNITA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="MQ">
          <Input
            type="number"
            value={form.mq}
            onChange={(e) => set("mq", e.target.value)}
            placeholder="75"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Piano">
          <Input
            value={form.piano}
            onChange={(e) => set("piano", e.target.value)}
            placeholder="es. 2"
          />
        </Field>
        <Field label="Palazzina di riferimento">
          <Select
            value={form.palazzinaId}
            onChange={(e) => set("palazzinaId", e.target.value)}
          >
            <option value="">— Indipendente —</option>
            {palazzine.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Note">
        <Textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Caratteristiche, stato, note affitto..."
        />
      </Field>
      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Btn>
        <Btn type="submit">Salva unità</Btn>
      </div>
    </form>
  );
}

/* ── Card singola unità ── */
function UnitaCard({ imm, spese, rendite, lavori, onEdit, onDelete }) {
  const entrate = rendite
    .filter((r) => r.immobileId === imm.id)
    .reduce((acc, r) => {
      if (r.tipo === "lungo") return acc + Number(r.importo || 0);
      return (
        acc +
        (r.prenotazioni || []).reduce((a, p) => a + Number(p.totale || 0), 0)
      );
    }, 0);
  const uscite = spese
    .filter((s) => s.immobileId === imm.id)
    .reduce((a, s) => a + Number(s.importo), 0);
  const netto = entrate - uscite;
  const wip = lavori.filter(
    (l) => l.immobileId === imm.id && l.stato !== "completato",
  ).length;

  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "var(--c-text)",
              lineHeight: 1.3,
            }}
          >
            {imm.nome}
          </div>
          <div
            style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}
          >
            {imm.tipo}
            {imm.mq ? ` · ${imm.mq} mq` : ""}
            {imm.piano ? ` · piano ${imm.piano}` : ""}
          </div>
        </div>
        {wip > 0 && <span style={pill(true)}>🔨 {wip} lavori</span>}
      </div>

      {imm.note && (
        <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
          {imm.note}
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}
      >
        {[
          { label: "Rendite", val: entrate, c: "green" },
          { label: "Spese", val: uscite, c: "accent" },
          { label: "Netto", val: netto, c: netto >= 0 ? "green" : "red" },
        ].map(({ label, val, c }) => (
          <div
            key={label}
            style={{
              borderRadius: 10,
              padding: "8px 6px",
              textAlign: "center",
              background:
                c === "green"
                  ? "var(--c-green-soft)"
                  : c === "accent"
                    ? "var(--c-accent-soft)"
                    : netto >= 0
                      ? "var(--c-green-soft)"
                      : "var(--c-red-soft)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: statColor(c),
                marginBottom: 2,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: statColor(c) }}>
              {formatEuro(val)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={onEdit}
          className="flex justify-center items-center font-inherit font-[inherit] text-(--c-text-muted) text-xs flex-1 py-1.5 px-0 gap-1 border border-(--c-border) rounded-lg bg-(--c-surface-alt) cursor-pointer"
        >
          <Pencil size={16} /> Modifica
        </button>
        <button
          onClick={onDelete}
          className="py-1.5 px-3 rounded-lg border-none bg-(--c-red-soft) text-xs text-[#dc2626] cursor-pointer font-[inherit]"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Card palazzina collassabile ── */
function PalazzinaCard({
  pal,
  figli,
  spese,
  rendite,
  lavori,
  onEdit,
  onDelete,
  onEditUnita,
  onDeleteUnita,
}) {
  const [open, setOpen] = useState(true);

  const totEnt = figli.reduce(
    (acc, imm) =>
      acc +
      rendite
        .filter((r) => r.immobileId === imm.id)
        .reduce(
          (a, r) =>
            r.tipo === "lungo"
              ? a + Number(r.importo || 0)
              : a +
                (r.prenotazioni || []).reduce(
                  (b, p) => b + Number(p.totale || 0),
                  0,
                ),
          0,
        ),
    0,
  );
  const totUsc = figli.reduce(
    (acc, imm) =>
      acc +
      spese
        .filter((s) => s.immobileId === imm.id)
        .reduce((a, s) => a + Number(s.importo), 0),
    0,
  );
  const totNetto = totEnt - totUsc;
  const lavoriPal = lavori.filter(
    (l) => l.immobileId === pal.id && l.stato !== "completato",
  ).length;

  return (
    <div
      style={{
        border: "1px solid var(--c-border)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Header scuro stile sidebar */}
      <div
        style={{
          background: "var(--sb-bg)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "none",
            background: "var(--sb-surface)",
            color: "var(--sb-muted)",
            fontSize: 10,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {open ? <ChevronDown /> : <ChevronRight />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "var(--sb-text)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🏢 {pal.nome}
            {lavoriPal > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "1px 8px",
                  borderRadius: 20,
                  background: "var(--sb-surface)",
                  color: "#E8A87C",
                }}
              >
                🔨 {lavoriPal} lavori
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--sb-muted)", marginTop: 2 }}>
            {pal.indirizzo ? `${pal.indirizzo} · ` : ""}
            {figli.length} {figli.length === 1 ? "unità" : "unità"}
            {pal.piano_totali ? ` · ${pal.piano_totali} piani` : ""}
          </div>
        </div>

        {/* Totali compatti */}
        <div style={{ display: "flex", gap: 20, fontSize: 11, flexShrink: 0 }}>
          {[
            { l: "Rendite", v: totEnt, col: "#6FCF97" },
            { l: "Spese", v: totUsc, col: "#EB9757" },
            {
              l: "Netto",
              v: totNetto,
              col: totNetto >= 0 ? "#6FCF97" : "#EB5757",
            },
          ].map(({ l, v, col }) => (
            <div key={l} style={{ textAlign: "right" }}>
              <div style={{ color: "var(--sb-muted)", marginBottom: 1 }}>
                {l}
              </div>
              <div style={{ fontWeight: 700, color: col }}>{formatEuro(v)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={onEdit}
            style={{
              padding: "4px 10px",
              borderRadius: 7,
              border: "1px solid var(--sb-border)",
              background: "transparent",
              color: "var(--sb-muted)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Pencil />
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: "4px 10px",
              borderRadius: 7,
              border: "none",
              background: "#2e1c1c",
              color: "#EB5757",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Trash2 />
          </button>
        </div>
      </div>

      {/* Unità figlie */}
      {open && (
        <div style={{ padding: "14px 16px", background: "var(--c-bg)" }}>
          {figli.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                fontSize: 13,
                color: "var(--c-text-muted)",
              }}
            >
              Nessuna unità assegnata — aggiungine una e seleziona questa
              palazzina
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {figli.map((imm) => (
                <UnitaCard
                  key={imm.id}
                  imm={imm}
                  spese={spese}
                  rendite={rendite}
                  lavori={lavori}
                  onEdit={() => onEditUnita(imm)}
                  onDelete={() => onDeleteUnita(imm.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function Immobili({ data, addItem, removeItem, updateItem }) {
  const [modal, setModal] = useState(null);
  const { ask, ConfirmModal } = useConfirm();

  const immobili = data.immobili || [];
  const spese = data.spese || [];
  const rendite = data.rendite || [];
  const lavori = data.lavori || [];

  const palazzine = immobili.filter((i) => i._tipo === "palazzina");
  const unita = immobili.filter((i) => i._tipo !== "palazzina");
  const unitaIndipendenti = unita.filter((i) => !i.palazzinaId);

  const totEnt = unita.reduce(
    (acc, imm) =>
      acc +
      rendite
        .filter((r) => r.immobileId === imm.id)
        .reduce(
          (a, r) =>
            r.tipo === "lungo"
              ? a + Number(r.importo || 0)
              : a +
                (r.prenotazioni || []).reduce(
                  (b, p) => b + Number(p.totale || 0),
                  0,
                ),
          0,
        ),
    0,
  );
  const totUsc = unita.reduce(
    (acc, imm) =>
      acc +
      spese
        .filter((s) => s.immobileId === imm.id)
        .reduce((a, s) => a + Number(s.importo), 0),
    0,
  );
  const totNetto = totEnt - totUsc;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 className="serif" style={{ fontSize: 32 }}>
            Immobili
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--c-text-muted)", marginTop: 4 }}
          >
            {palazzine.length > 0 &&
              `${palazzine.length} ${palazzine.length === 1 ? "palazzina" : "palazzine"} · `}
            {unita.length} {unita.length === 1 ? "unità" : "unità"} nel
            portfolio
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={() => setModal("new-palazzina")}>
            🏢 Palazzina
          </Btn>
          <Btn onClick={() => setModal("new-unita")}>＋ Unità</Btn>
        </div>
      </div>

      {/* KPI */}
      {immobili.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Rendite totali", val: totEnt, c: "green" },
            { label: "Spese totali", val: totUsc, c: "accent" },
            {
              label: "Saldo netto",
              val: totNetto,
              c: totNetto >= 0 ? "green" : "red",
            },
          ].map(({ label, val, c }) => (
            <div
              key={label}
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 14,
                padding: "16px 20px",
              }}
            >
              <div style={sectionLabel}>{label}</div>
              <div
                className="serif"
                style={{ fontSize: 26, color: statColor(c) }}
              >
                {formatEuro(val)}
              </div>
            </div>
          ))}
        </div>
      )}

      {immobili.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="Nessun immobile"
          description="Aggiungi una palazzina per raggruppare più unità, oppure aggiungi direttamente una singola unità."
          action={
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" onClick={() => setModal("new-palazzina")}>
                🏢 Palazzina
              </Btn>
              <Btn onClick={() => setModal("new-unita")}>＋ Unità</Btn>
            </div>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {palazzine.map((pal) => (
            <PalazzinaCard
              key={pal.id}
              pal={pal}
              figli={unita.filter((u) => u.palazzinaId === pal.id)}
              spese={spese}
              rendite={rendite}
              lavori={lavori}
              onEdit={() => setModal({ editPal: pal })}
              onDelete={() =>
                ask(() => {
                  // Slega le unità figlie prima di eliminare
                  unita
                    .filter((u) => u.palazzinaId === pal.id)
                    .forEach((u) =>
                      updateItem("immobili", u.id, { palazzinaId: "" }),
                    );
                  removeItem("immobili", pal.id);
                }, `Eliminare "${pal.nome}"? Le unità collegate diventeranno indipendenti.`)
              }
              onEditUnita={(imm) => setModal({ editUnita: imm })}
              onDeleteUnita={(id) => ask(() => removeItem("immobili", id))}
            />
          ))}

          {unitaIndipendenti.length > 0 && (
            <div>
              {palazzine.length > 0 && (
                <div style={sectionLabel}>Unità indipendenti</div>
              )}
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                }}
              >
                {unitaIndipendenti.map((imm) => (
                  <UnitaCard
                    key={imm.id}
                    imm={imm}
                    spese={spese}
                    rendite={rendite}
                    lavori={lavori}
                    onEdit={() => setModal({ editUnita: imm })}
                    onDelete={() =>
                      ask(
                        () => removeItem("immobili", imm.id),
                        `Eliminare "${imm.nome}"?`,
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modal === "new-palazzina" && (
        <Modal title="Nuova palazzina" onClose={() => setModal(null)}>
          <PalazzinaForm
            onSave={(f) => {
              addItem("immobili", f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "new-unita" && (
        <Modal title="Nuova unità immobiliare" onClose={() => setModal(null)}>
          <UnitaForm
            palazzine={palazzine}
            onSave={(f) => {
              addItem("immobili", f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.editPal && (
        <Modal title="Modifica palazzina" onClose={() => setModal(null)}>
          <PalazzinaForm
            init={modal.editPal}
            onSave={(f) => {
              updateItem("immobili", modal.editPal.id, f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.editUnita && (
        <Modal title="Modifica unità" onClose={() => setModal(null)}>
          <UnitaForm
            init={modal.editUnita}
            palazzine={palazzine}
            onSave={(f) => {
              updateItem("immobili", modal.editUnita.id, f);
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
