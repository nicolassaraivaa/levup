"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Target,
  Mic,
  SearchCheck,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Logo from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/diagnostico", label: "Diagnóstico", icon: Target },
  { href: "/entrevistas", label: "Simulador de Entrevistas", icon: Mic },
  { href: "/auditoria", label: "Auditoria de LinkedIn", icon: SearchCheck },
  { href: "/cv", label: "Gerador de CV", icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export default function Sidebar({
  active,
  profile,
}: {
  active: (typeof NAV_ITEMS)[number]["href"];
  profile: Profile | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const conteudo = (
    <>
      <div className="p-6 border-b border-hairline">
        <Link href="/dashboard" onClick={() => setOpen(false)} className="inline-block">
          <Logo />
        </Link>
        <p className="text-ink-faint text-xs mt-2">Acelere sua carreira</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === active;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                isActive
                  ? "bg-brass-wash text-brass font-medium"
                  : "text-ink-muted hover:bg-surface-raised hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-hairline">
        <Link
          href="/configuracoes"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-2 py-2 rounded-md transition hover:bg-surface-raised"
        >
          <div className="w-8 h-8 rounded-full bg-brass-wash flex items-center justify-center text-xs font-semibold text-brass shrink-0">
            {profile?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">
              {profile?.name || "Usuário"}
            </p>
            <p className="text-xs text-ink-faint truncate">
              {profile?.email || ""}
            </p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-sm text-ink-faint hover:text-ink transition px-2 py-2 mt-1 rounded-md hover:bg-surface-raised"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Barra superior — mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface border-b border-hairline flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setOpen(true)}
          className="text-ink-muted hover:text-ink transition p-1 -ml-1"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <Link href="/dashboard">
          <Logo size={24} textClassName="text-base" />
        </Link>
        <div className="w-7 h-7 rounded-full bg-brass-wash flex items-center justify-center text-[11px] font-semibold text-brass shrink-0">
          {profile?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </div>

      {/* Drawer — mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-surface border-r border-hairline flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-ink-faint hover:text-ink transition"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
            {conteudo}
          </div>
        </div>
      )}

      {/* Sidebar fixa — desktop */}
      <div className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-surface border-r border-hairline flex-col">
        {conteudo}
      </div>
    </>
  );
}
