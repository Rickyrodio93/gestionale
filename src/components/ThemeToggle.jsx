"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const iscriviti = (cb) => {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => o.disconnect();
};

const leggiScuro = () => document.documentElement.classList.contains("dark");

export default function ThemeToggle({ className = "" }) {
  const scuro = useSyncExternalStore(iscriviti, leggiScuro, () => false);

  function cambia() {
    const prossimo = !leggiScuro();
    document.documentElement.classList.toggle("dark", prossimo);
    document.cookie = `tema=${prossimo ? "dark": "light"}; path=/; max-age=31536000; samesite=lax`;
  }
  return (
    <button
      type="button"
      onClick={cambia}
      aria-label={scuro ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={scuro ? "Tema chiaro" : "Tema scuro"}
      className={`rounded-lg p-2 text-gray-600 hover:bg-gray-100 ${className}`}
    >
      {scuro ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
