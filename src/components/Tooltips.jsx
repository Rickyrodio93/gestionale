"use client";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// Uso: <Tooltip contenuto={<TooltipRighe ... />}>valore</Tooltip>   oppure   <Tooltip contenuto="testo">valore</Tooltip>
// focusable={false}: quando dentro c'è già un elemento focalizzabile (link o pulsante)
export default function Tooltip({
  contenuto,
  children,
  className = "",
  focusable = true,
  sottolinea = true,
}) {
  const [aperto, setAperto] = useState(false);
  const [pos, setPos] = useState(null);
  const trigger = useRef(null);
  const box = useRef(null);
  const tipo = useRef("mouse");
  const id = useId();

  const chiudi = useCallback(() => {
    setAperto(false);
    setPos(null);
  }, []);

  useLayoutEffect(() => {
    if (!aperto || !trigger.current || !box.current) return;
    const t = trigger.current.getBoundingClientRect();
    const b = box.current.getBoundingClientRect();
    const m = 8;
    let top = t.top - b.height - m;
    if (top < m) top = t.bottom + m;
    const left = Math.max(
      m,
      Math.min(
        t.left + t.width / 2 - b.width / 2,
        window.innerWidth - b.width - m,
      ),
    );
    setPos({ top, left });
  }, [aperto]);

  useEffect(() => {
    if (!aperto) return;
    const fuori = (e) => {
      if (
        trigger.current?.contains(e.target) ||
        box.current?.contains(e.target)
      )
        return;
      chiudi();
    };
    const tasto = (e) => e.key === "Escape" && chiudi();
    document.addEventListener("pointerdown", fuori);
    document.addEventListener("keydown", tasto);
    window.addEventListener("scroll", chiudi, true);
    window.addEventListener("resize", chiudi);
    return () => {
      document.removeEventListener("pointerdown", fuori);
      document.removeEventListener("keydown", tasto);
      window.removeEventListener("scroll", chiudi, true);
      window.removeEventListener("resize", chiudi);
    };
  }, [aperto, chiudi]);

  return (
    <>
      <span
        ref={trigger}
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={aperto ? id : undefined}
        className={`inline-block cursor-help ${sottolinea ? "underline decoration-gray-300 decoration-dotted underline-offset-4" : ""} ${className}`}
        onPointerDown={(e) => {
          tipo.current = e.pointerType;
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setAperto(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && chiudi()}
        onFocus={(e) =>
          e.target.matches?.(":focus-visible") && setAperto(true)
        } // solo da tastiera
        onBlur={chiudi}
        onClick={() => {
          if (tipo.current !== "mouse") setAperto((v) => !v);
        }}
      >
        {children}
      </span>

      {aperto &&
        createPortal(
          <div
            ref={box}
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: "max-content",
              visibility: pos ? "visible" : "hidden",
            }}
            className="pointer-events-none z-50 max-w-[min(20rem,calc(100vw-1rem))] rounded-lg border border-gray-200 bg-white p-3 text-left text-sm font-normal text-gray-800 shadow-lg"
          >
            {contenuto}
          </div>,
          document.body,
        )}
    </>
  );
}

// Contenuto standard: titolo, righe etichetta/valore, totale e nota.
// righe = [[etichetta, valore, tono?]], con tono "pos" o "neg" per colorare il valore; totale = [etichetta, valore]
export function TooltipRighe({ titolo, righe = [], totale, nota }) {
  return (
    <div className="min-w-48">
      {titolo && (
        <p className="mb-1.5 text-xs font-semibold text-gray-500">{titolo}</p>
      )}
      <dl className="space-y-1">
        {righe.map(([label, valore, tono]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="text-gray-600">{label}</dt>
            <dd
              className={`font-medium tabular-nums ${
                tono === "neg"
                  ? "text-red-700"
                  : tono === "pos"
                    ? "text-green-700"
                    : ""
              }`}
            >
              {valore}
            </dd>
          </div>
        ))}
      </dl>
      {totale && (
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-gray-200 pt-2 font-semibold">
          <span>{totale[0]}</span>
          <span className="tabular-nums">{totale[1]}</span>
        </div>
      )}
      {nota && <p className="mt-2 text-xs text-gray-500">{nota}</p>}
    </div>
  );
}
