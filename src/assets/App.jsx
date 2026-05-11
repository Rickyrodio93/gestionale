import { useState } from "react";
import { useStore } from "./store.js";
import Dashboard from "./Dashboard.jsx";
import Immobili from "./Immobili.jsx";
import Spese from "./Spese.jsx";
import Rendite from "./Rendite.jsx";
import Lavori from "./Lavori.jsx";
import Sidebar, { SidebarItem } from "../components/sidebar.jsx";
import { BadgeEuro, ClipboardList, Hammer, House, LayoutDashboard, LayoutDashboardIcon } from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboardIcon/>, alert },
  { id: "immobili", label: "Immobili", icon: <House /> },
  { id: "spese", label: "Spese", icon: <ClipboardList /> },
  { id: "rendite", label: "Rendite", icon: <BadgeEuro /> },
  { id: "lavori", label: "Lavori", icon: <Hammer /> },
];

export default function App() {
  const [page, setPage] = useState("dashboard");

  const store = useStore();

  const props = {
    data: store.data,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateItem: store.updateItem,
    update: store.update,
  };

  const pageComponent = {
    dashboard: <Dashboard {...props} />,
    immobili: <Immobili {...props} />,
    spese: <Spese {...props} />,
    rendite: <Rendite {...props} />,
    lavori: <Lavori {...props} />,
  }[page];

  return (
    <div className="flex h-full" style={{ background: "var(--c-bg)" }}>
      {/* Sidebar */}
      <Sidebar>
        {NAV.map((n) => {
          const active = page === n.id;
          return (
            <SidebarItem
            active={active}
              key={n.id}
              onClick={() => setPage(n.id)}
              text={n.label}
              icon={n.icon}
              alert={n.alert}
            />
          );
        })}
      </Sidebar>
      {/* <aside
        className="flex flex-col shrink-0 h-full"
        style={{
          width: 220,
          background: "var(--c-surface)",
          borderRight: "1px solid var(--c-border)",
          position: "sticky",
          top: 0,
        }}
      > */}

      {/* <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {NAV.map((n) => {
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 cursor-pointer w-full text-left"
                style={{
                  background: active ? "var(--c-accent-soft)" : "transparent",
                  color: active ? "var(--c-accent)" : "var(--c-text-muted)",
                  fontFamily: "inherit",
                  border: "none",
                }}
              >
                <span className="text-base">{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </nav> */}

      {/* Footer */}
      {/* <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid var(--c-border)" }}
        >
          <div className="text-xs" style={{ color: "var(--c-text-muted)" }}>
            {store.data.immobili?.length || 0} immobili · dati locali
          </div>
        </div>
      </aside> */}

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">{pageComponent}</div>
      </main>
    </div>
  );
}
