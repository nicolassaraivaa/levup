"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
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
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-black text-white">Levup</h1>
          <p className="text-gray-400 text-sm mt-1">Acelere sua carreira</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-600 text-white font-medium"
          >
            🏠 Dashboard
          </a>
          <a
            href="/diagnostico"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            🎯 Diagnóstico
          </a>
          <a
            href="/entrevistas"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            🎤 Simulador de Entrevistas
          </a>
          <a
            href="/auditoria"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            🔍 Auditoria de Perfil
          </a>
          <a
            href="/cv"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            📄 Gerador de CV
          </a>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
              {profile?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {profile?.name || "Usuário"}
              </p>
              <p className="text-xs text-gray-400">{profile?.area || ""}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition px-2 py-1"
          >
            Sair →
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Olá, {profile?.name?.split(" ")[0] || "desenvolvedor"} 👋
          </h2>
          <p className="text-gray-400 mt-1">
            Pronto para evoluir sua carreira hoje?
          </p>
        </div>

        {/* Cards das features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/diagnostico"
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-indigo-500 transition group"
          >
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">
              Diagnóstico de Competências
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              Descubra seus gaps técnicos com um quiz adaptativo e veja onde
              melhorar.
            </p>
            <p className="text-indigo-400 text-sm mt-4 font-medium">
              Iniciar diagnóstico →
            </p>
          </a>

          <a
            href="/entrevistas"
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-cyan-500 transition group"
          >
            <div className="text-3xl mb-3">🎤</div>
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition">
              Simulador de Entrevistas
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              Pratique entrevistas técnicas e comportamentais com feedback
              imediato de IA.
            </p>
            <p className="text-cyan-400 text-sm mt-4 font-medium">
              Iniciar simulação →
            </p>
          </a>

          <a
            href="/auditoria"
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-green-500 transition group"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition">
              Auditoria de Perfil
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              Análise completa do seu LinkedIn, GitHub e CV com sugestões de
              melhoria.
            </p>
            <p className="text-green-400 text-sm mt-4 font-medium">
              Auditar perfil →
            </p>
          </a>

          <a
            href="/cv"
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-orange-500 transition group"
          >
            <div className="text-3xl mb-3">📄</div>
            <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition">
              Gerador de CV
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              Gere um currículo otimizado para ATS personalizado para a vaga que
              você quer.
            </p>
            <p className="text-orange-400 text-sm mt-4 font-medium">
              Gerar CV →
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
