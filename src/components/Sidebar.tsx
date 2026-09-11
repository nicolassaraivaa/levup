"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Mic,
  SearchCheck,
  FileText,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/diagnostico", label: "Diagnóstico", icon: Target },
  { href: "/entrevistas", label: "Simulador de Entrevistas", icon: Mic },
  { href: "/auditoria", label: "Auditoria de Perfil", icon: SearchCheck },
  { href: "/cv", label: "Gerador de CV", icon: FileText },
] as const;

export default function Sidebar({
  active,
  profile,
}: {
  active: (typeof NAV_ITEMS)[number]["href"];
  profile: Profile | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight text-white">Levup</h1>
        <p className="text-gray-500 text-xs mt-1">Acelere sua carreira</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === active;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {profile?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.name || "Usuário"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {profile?.area || ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-sm text-gray-500 hover:text-white transition px-2 py-2 mt-1 rounded-lg hover:bg-gray-800"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </div>
  );
}
