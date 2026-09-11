"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import { Target, Mic, SearchCheck, FileText, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    href: "/diagnostico",
    icon: Target,
    accent: "indigo",
    title: "Diagnóstico de Competências",
    description:
      "Descubra seus gaps técnicos com um quiz adaptativo e veja onde melhorar.",
    cta: "Iniciar diagnóstico",
  },
  {
    href: "/entrevistas",
    icon: Mic,
    accent: "cyan",
    title: "Simulador de Entrevistas",
    description:
      "Pratique entrevistas técnicas e comportamentais com feedback imediato de IA.",
    cta: "Iniciar simulação",
  },
  {
    href: "/auditoria",
    icon: SearchCheck,
    accent: "green",
    title: "Auditoria de Perfil",
    description:
      "Análise completa do seu LinkedIn, GitHub e CV com sugestões de melhoria.",
    cta: "Auditar perfil",
  },
  {
    href: "/cv",
    icon: FileText,
    accent: "orange",
    title: "Gerador de CV",
    description:
      "Gere um currículo otimizado para ATS personalizado para a vaga que você quer.",
    cta: "Gerar CV",
  },
] as const;

const ACCENT_STYLES = {
  indigo: {
    border: "hover:border-indigo-500",
    iconBg: "bg-indigo-500/10 text-indigo-400",
    cta: "text-indigo-400",
  },
  cyan: {
    border: "hover:border-cyan-500",
    iconBg: "bg-cyan-500/10 text-cyan-400",
    cta: "text-cyan-400",
  },
  green: {
    border: "hover:border-green-500",
    iconBg: "bg-green-500/10 text-green-400",
    cta: "text-green-400",
  },
  orange: {
    border: "hover:border-orange-500",
    iconBg: "bg-orange-500/10 text-orange-400",
    cta: "text-orange-400",
  },
} as const;

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profile);
    }
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar active="/dashboard" profile={profile} />

      <div className="ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Olá, {profile?.name?.split(" ")[0] || "desenvolvedor"}
          </h2>
          <p className="text-gray-400 mt-1">
            Pronto para evoluir sua carreira hoje?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map(
            ({ href, icon: Icon, accent, title, description, cta }) => {
              const style = ACCENT_STYLES[accent];
              return (
                <a
                  key={href}
                  href={href}
                  className={`bg-gray-900 border border-gray-800 rounded-2xl p-6 transition group ${style.border}`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${style.iconBg}`}
                  >
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                  <p className="text-gray-400 text-sm mt-2">{description}</p>
                  <p
                    className={`text-sm mt-4 font-medium flex items-center gap-1.5 ${style.cta}`}
                  >
                    {cta}
                    <ArrowRight
                      size={15}
                      className="transition group-hover:translate-x-0.5"
                    />
                  </p>
                </a>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
