import { useState } from "react";
import { useStore } from "./store.js";
import Dashboard from "./Dashboard.jsx";
import Immobili from "./Immobili.jsx";
import Spese from "./Spese.jsx";
import Rendite from "./Rendite.jsx";
import Lavori from "./Lavori.jsx";
import Ripartizione from "./Ripartizione.jsx";
import Sidebar, { SidebarItem } from "../components/sidebar.jsx";
import {
  BadgeEuro,
  ClipboardList,
  Hammer,
  House,
  LayoutDashboard,
  LayoutDashboardIcon,
  Lightbulb,
} from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboardIcon /> },
  { id: "immobili", label: "Immobili", icon: <House /> },
  { id: "spese", label: "Spese", icon: <ClipboardList /> },
  { id: "rendite", label: "Rendite", icon: <BadgeEuro /> },
  { id: "lavori", label: "Lavori", icon: <Hammer /> },
  { id: "ripartizione", label: "Ripartizione", icon: <Lightbulb /> },
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
    ripartizione: <Ripartizione {...props} />
  }[page];

  return (
    <div className="flex h-full bg-(--c-bg)">
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

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">{pageComponent}</div>
      </main>
    </div>
  );
}
