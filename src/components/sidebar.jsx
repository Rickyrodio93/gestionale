"use client";

import { ChevronFirst, ChevronLast, Menu, X } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

const SidebarContext = createContext({ expanded: true, chiudi: () => {} });

export default function Sidebar({ children }) {
  const [expanded, setExpanded] = useState(true);
  const [aperto, setAperto] = useState(false);
  const chiudi = () => setAperto(false);

  useEffect(() => {
    if (!aperto) return;
    const onKey = (e) => e.key === "Escape" && setAperto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aperto]);

  return (
    <>
      {/* barra in amto: solo telefono e tablet */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setAperto(true)}
          aria-label="Apri il menu"
          aria-expanded={aperto}
          aria-controls="menu-principale"
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <Menu size={22} />
        </button>
        <span className="flex-1 truncate font-bold">
          Gestionale appartamenti
        </span>
        <ThemeToggle />
      </header>

      {aperto && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={chiudi}
          aria-hidden="true"
        />
      )}

      <aside
        id="menu-principale"
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] transition-transform duration-200 lg:static lg:z-auto lg:h-dvh lg:w-auto lg:max-w-none lg:translate-x-0 ${
          aperto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex h-full flex-col border-r border-gray-200 bg-white shadow-sm max-lg:shadow-xl">
          <div className="flex items-center justify-between p-4 pb-2">
            <p
              className={`w-32 overflow-hidden font-bold uppercase transition-all ${expanded ? "" : "lg:w-0"}`}
            >
              gestionale appartamenti
            </p>
            <button
              type="button"
              onClick={chiudi}
              aria-label="Chiudi il menu"
              className="rounded-lg bg-gray-50 p-1.5 hover:bg-gray-100 lg:hidden"
            >
              <X />
            </button>
            <button
              type="button"
              onClick={() => setExpanded((c) => !c)}
              aria-label={expanded ? "Comprimi il menu" : "Espandi il menu"}
              className="hidden rounded-lg bg-gray-50 p-1.5 hover:bg-gray-100 lg:block"
            >
              {expanded ? <ChevronFirst /> : <ChevronLast />}
            </button>
          </div>

          <SidebarContext.Provider value={{ expanded, chiudi }}>
            <ul className="flex-1 space-y-1 px-3">{children}</ul>
          </SidebarContext.Provider>

          <div className="flex items-center border-t border-gray-200 p-3">
            <div
              className={`w-52 overflow-hidden leading-4 transition-all ${expanded ? "" : "lg:w-0"}`}
            >
              <h4 className="font-semibold">Riccardo Rodio</h4>
              <span className="text-xs text-gray-600">
                rodioriccardo@gmail.com
              </span>
            </div>
            <ThemeToggle className="ml-auto" />
          </div>
        </nav>
      </aside>
    </>
  );
}

export function SidebarItem({ icon, text, href, active, alert }) {
  const { expanded, chiudi } = useContext(SidebarContext);
  return (
    <li>
      <Link
        href={href}
        onClick={chiudi}
        aria-current={active ? "page" : undefined}
        className={`group relative flex items-center rounded-md px-3 py-2 font-medium transition-colors ${
          active
            ? "bg-linear-to-tr from-indigo-200 to-indigo-100 text-indigo-800"
            : "text-gray-600 hover:bg-indigo-50"
        }`}
      >
        {icon}
        <span
          className={`ml-3 w-52 overflow-hidden transition-all ${expanded ? "" : "lg:ml-0 lg:w-0"}`}
        >
          {text}
        </span>
        {alert && (
          <div
            className={`absolute right-2 h-2 w-2 rounded bg-indigo-400 ${expanded ? "" : "lg:top-2"}`}
          />
        )}

        {!expanded && (
          <div className="invisible absolute left-full ml-6 hidden -translate-x-3 rounded-md bg-indigo-100 px-2 py-1 text-sm text-indigo-800 opacity-20 transition-all group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 lg:block">
            {text}
          </div>
        )}
      </Link>
    </li>
  );
}
