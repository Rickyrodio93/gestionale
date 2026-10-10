"use client";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Receipt,
  Wallet,
  CalendarDays,
  Landmark,
} from "lucide-react";
import Sidebar, { SidebarItem } from "./Sidebar";

const items = [
  { href: "/", text: "Dashboard", icon: LayoutDashboard },
  { href: "/appartamenti", text: "Appartamenti", icon: Building2 },
  { href: "/spese", text: "Spese", icon: Receipt },
  { href: "/entrate", text: "Entrate", icon: Wallet },
  { href: "/investimenti", text: "Investimenti", icon: Landmark },
  { href: "/calendario", text: "Calendario", icon: CalendarDays },
];

export default function AppNav() {
  const pathname = usePathname();
  return (
    <Sidebar>
      {items.map(({ href, text, icon: Icon }) => (
        <SidebarItem
          key={href}
          href={href}
          icon={<Icon size={20} />}
          text={text}
          active={href === "/" ? pathname === "/" : pathname.startsWith(href)}
        />
      ))}
    </Sidebar>
  );
}
