"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CVPage() {
  const [etapa, setEtapa] = useState<"formulario" | "resultado">("formulario");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cvGerado, setCvGerado] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    linkedin: "",
    github: "",
    objetivo: "",
    experiencias: "",
    formacao: "",
    habilidades: "",
    vaga: "",
  });

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
      if (data) {
        setForm((f) => ({
          ...f,
          nome: data.name || "",
          email: data.email || "",
        }));
      }
    }
    loadProfile();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function gerarCV(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCvGerado(data.cv);
    setEtapa("resultado");
    setLoading(false);
  }

  function copiarCV() {
    navigator.clipboard.writeText(cvGerado);
    alert("CV copiado para a área de transferência!");
  }

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
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-600 text-white font-medium"
          >
            📄 Gerador de CV
          </a>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Main */}
      <div className="ml-64 p-8 max-w-3xl">
        {etapa === "formulario" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">
                📄 Gerador de CV
              </h2>
              <p className="text-gray-400 mt-2">
                Preencha seus dados e informe a vaga desejada. A IA vai gerar um
                CV otimizado para ATS.
              </p>
            </div>

            <form onSubmit={gerarCV} className="space-y-6">
              {/* Dados pessoais */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">👤 Dados Pessoais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Nome completo
                    </label>
                    <input
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Email
                    </label>
                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      type="email"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Telefone
                    </label>
                    <input
                      name="telefone"
                      value={form.telefone}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      LinkedIn
                    </label>
                    <input
                      name="linkedin"
                      value={form.linkedin}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                      placeholder="linkedin.com/in/seuperfil"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-400 mb-1 block">
                      GitHub
                    </label>
                    <input
                      name="github"
                      value={form.github}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                      placeholder="github.com/seuusuario"
                    />
                  </div>
                </div>
              </div>

              {/* Vaga */}
              <div className="bg-gray-900 border border-orange-800 rounded-2xl p-6">
                <h3 className="font-bold text-orange-400 mb-4">
                  🎯 Vaga Desejada
                </h3>
                <textarea
                  name="vaga"
                  value={form.vaga}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition resize-none"
                  placeholder="Cole aqui a descrição da vaga ou descreva o cargo que você está buscando. Ex: Desenvolvedor Frontend Junior — React, TypeScript, Tailwind..."
                />
              </div>

              {/* Objetivo */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">
                  🎯 Objetivo Profissional
                </h3>
                <textarea
                  name="objetivo"
                  value={form.objetivo}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition resize-none"
                  placeholder="Descreva seu objetivo profissional. Ex: Busco minha primeira oportunidade como desenvolvedor frontend, aplicando meus conhecimentos em React e JavaScript..."
                />
              </div>

              {/* Experiências */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-2">
                  💼 Experiências Profissionais
                </h3>
                <p className="text-gray-500 text-xs mb-4">
                  Inclua projetos pessoais, freelas ou estágios. Se não tiver
                  experiência formal, descreva seus projetos.
                </p>
                <textarea
                  name="experiencias"
                  value={form.experiencias}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition resize-none"
                  placeholder="Ex: Projeto DevBurger (2024) — Desenvolvi um e-commerce completo com React, Node.js e MongoDB. Implementei carrinho de compras, autenticação JWT e painel admin..."
                />
              </div>

              {/* Formação */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">
                  🎓 Formação Acadêmica
                </h3>
                <textarea
                  name="formacao"
                  value={form.formacao}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition resize-none"
                  placeholder="Ex: Bacharelado em Ciência da Computação — Universidade Cruzeiro do Sul (2022 - 2026, em andamento)"
                />
              </div>

              {/* Habilidades */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">
                  ⚡ Habilidades Técnicas
                </h3>
                <textarea
                  name="habilidades"
                  value={form.habilidades}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition resize-none"
                  placeholder="Ex: JavaScript, TypeScript, React, Next.js, Node.js, Python, Git, SQL, Docker, AWS..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition"
              >
                {loading
                  ? "⏳ Gerando seu CV com IA..."
                  : "✨ Gerar CV Otimizado →"}
              </button>
            </form>
          </div>
        )}

        {etapa === "resultado" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">✅ CV Gerado!</h2>
                <p className="text-gray-400 mt-1">
                  Seu currículo foi otimizado para ATS.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={copiarCV}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  📋 Copiar
                </button>
                <button
                  onClick={() => setEtapa("formulario")}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  ✏️ Editar dados
                </button>
              </div>
            </div>

            <div className="bg-gray-900 border border-orange-800 rounded-2xl p-8">
              <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                {cvGerado}
              </pre>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={copiarCV}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-xl transition"
              >
                📋 Copiar CV completo
              </button>
              <a
                href="/dashboard"
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition text-center block"
              >
                Voltar ao dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
