import { useState } from "react";

/* ── Modal ── */
export function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,23,20,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full rounded-2xl shadow-2xl overflow-hidden"
        style={{
          maxWidth: wide ? 720 : 480,
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--c-border)" }}
        >
          <h2 className="serif text-xl" style={{ color: "var(--c-text)" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{
              background: "var(--c-surface-alt)",
              color: "var(--c-text-muted)",
            }}
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "75vh" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Field ── */
export function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-600 uppercase tracking-wider"
        style={{ color: "var(--c-text-muted)" }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <span className="text-xs" style={{ color: "var(--c-text-muted)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

/* ── Input ── */
export function Input({ ...props }) {
  return (
    <input
      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
      style={{
        background: "var(--c-surface-alt)",
        border: "1px solid var(--c-border)",
        color: "var(--c-text)",
        fontFamily: "inherit",
      }}
      {...props}
    />
  );
}

/* ── Select ── */
export function Select({ children, ...props }) {
  return (
    <select
      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
      style={{
        background: "var(--c-surface-alt)",
        border: "1px solid var(--c-border)",
        color: "var(--c-text)",
        fontFamily: "inherit",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

/* ── Textarea ── */
export function Textarea({ ...props }) {
  return (
    <textarea
      rows={3}
      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
      style={{
        background: "var(--c-surface-alt)",
        border: "1px solid var(--c-border)",
        color: "var(--c-text)",
        fontFamily: "inherit",
      }}
      {...props}
    />
  );
}

/* ── Btn ── */
export function Btn({
  variant = "primary",
  children,
  className = "",
  ...props
}) {
  const styles = {
    primary: { background: "var(--c-accent)", color: "#fff" },
    ghost: {
      background: "var(--c-surface-alt)",
      color: "var(--c-text)",
      border: "1px solid var(--c-border)",
    },
    danger: { background: "#fee2e2", color: "#dc2626" },
    green: { background: "var(--c-green)", color: "#fff" },
  };
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-500 flex items-center gap-2 cursor-pointer ${className}`}
      style={{ fontFamily: "inherit", ...styles[variant] }}
      {...props}
    >
      {children}
    </button>
  );
}

/* ── Badge ── */
export function Badge({ children, color = "default" }) {
  const styles = {
    default: {
      background: "var(--c-surface-alt)",
      color: "var(--c-text-muted)",
    },
    green: { background: "var(--c-green-soft)", color: "var(--c-green)" },
    red: { background: "#fee2e2", color: "#dc2626" },
    blue: { background: "var(--c-blue-soft)", color: "var(--c-blue)" },
    yellow: { background: "var(--c-yellow-soft)", color: "var(--c-yellow)" },
    orange: { background: "var(--c-accent-soft)", color: "var(--c-accent)" },
  };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500"
      style={styles[color]}
    >
      {children}
    </span>
  );
}

/* ── Card ── */
export function Card({ children, className = "", onClick, style }) {
  return (
    <div
      className={`rounded-2xl p-5 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/* ── StatCard ── */
export function StatCard({ label, value, sub, color }) {
  return (
    <Card>
      <div
        className="text-xs font-500 uppercase tracking-wider mb-2"
        style={{ color: "var(--c-text-muted)" }}
      >
        {label}
      </div>
      <div
        className="serif text-3xl mb-1"
        style={{ color: color || "var(--c-text)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: "var(--c-text-muted)" }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

/* ── EmptyState ── */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-600 text-lg" style={{ color: "var(--c-text)" }}>
        {title}
      </div>
      <div
        className="text-sm max-w-xs"
        style={{ color: "var(--c-text-muted)" }}
      >
        {description}
      </div>
      {action}
    </div>
  );
}

/* ── ConfirmDelete ── */
export function useConfirm() {
  const [pending, setPending] = useState(null);
  const ask = (fn, msg) => setPending({ fn, msg });
  const ConfirmModal = pending ? (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      style={{ background: "rgba(26,23,20,0.5)" }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4"
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
        }}
      >
        <div className="font-600">
          {pending.msg || "Eliminare questo elemento?"}
        </div>
        <div className="flex gap-2 justify-end">
          <Btn variant="ghost" onClick={() => setPending(null)}>
            Annulla
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              pending.fn();
              setPending(null);
            }}
          >
            Elimina
          </Btn>
        </div>
      </div>
    </div>
  ) : null;
  return { ask, ConfirmModal };
}
