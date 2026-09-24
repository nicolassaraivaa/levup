"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, CurriculoGerado } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import {
  FileText,
  User,
  Target,
  Briefcase,
  GraduationCap,
  Zap,
  Loader2,
  Sparkles,
  Copy,
  Pencil,
  Download,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Languages,
} from "lucide-react";

type VagaModo = "texto" | "url";

function curriculoParaTexto(c: CurriculoGerado): string {
  const linhas: string[] = [];
  linhas.push(c.nome);
  if (c.titulo) linhas.push(c.titulo);
  linhas.push(
    [c.contato.email, c.contato.telefone, c.contato.localizacao, c.contato.linkedin, c.contato.github]
      .filter(Boolean)
      .join(" · "),
  );
  linhas.push("");
  if (c.resumo) {
    linhas.push("RESUMO");
    linhas.push(c.resumo);
    linhas.push("");
  }
  if (c.experiencias?.length) {
    linhas.push("EXPERIÊNCIA");
    for (const exp of c.experiencias) {
      linhas.push(`${exp.cargo} — ${exp.empresa} (${exp.periodo})`);
      for (const b of exp.bullets ?? []) linhas.push(`  • ${b}`);
    }
    linhas.push("");
  }
  if (c.formacao?.length) {
    linhas.push("FORMAÇÃO");
    for (const f of c.formacao) linhas.push(`${f.curso} — ${f.instituicao} (${f.periodo})`);
    linhas.push("");
  }
  if (c.habilidades?.length) {
    linhas.push("HABILIDADES");
    linhas.push(c.habilidades.join(", "));
    linhas.push("");
  }
  if (c.idiomas?.length) {
    linhas.push("IDIOMAS");
    for (const i of c.idiomas) linhas.push(`${i.idioma} — ${i.nivel}`);
  }
  return linhas.join("\n");
}

export default function CVPage() {
  const [etapa, setEtapa] = useState<"formulario" | "resultado">("formulario");
  const [loading, setLoading] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [erro, setErro] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [curriculo, setCurriculo] = useState<CurriculoGerado | null>(null);
  const [vagaModo, setVagaModo] = useState<VagaModo>("texto");
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    localizacao: "",
    linkedin: "",
    github: "",
    objetivo: "",
    experiencias: "",
    formacao: "",
    habilidades: "",
    idiomas: "",
    vagaTexto: "",
    vagaUrl: "",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function gerarCV(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");

    try {
      const res = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vagaModo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível gerar o CV.");
      }
      setCurriculo(data.curriculo);
      setEtapa("resultado");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function copiarCV() {
    if (!curriculo) return;
    navigator.clipboard.writeText(curriculoParaTexto(curriculo));
    alert("CV copiado para a área de transferência!");
  }

  async function baixarPdf() {
    if (!curriculo) return;
    setBaixandoPdf(true);
    setErro("");
    try {
      const res = await fetch("/api/cv/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curriculo }),
      });
      if (!res.ok) {
        throw new Error("Não foi possível gerar o PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `curriculo-${curriculo.nome.split(" ")[0].toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado ao gerar o PDF.");
    } finally {
      setBaixandoPdf(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      <Sidebar active="/cv" profile={profile} />

      {/* Main */}
      <div className="ml-64 p-8 max-w-3xl">
        {etapa === "formulario" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                <FileText size={24} className="text-brass" />
                Gerador de CV
              </h2>
              <p className="text-ink-muted mt-2">
                Preencha seus dados reais. Uma IA especialista em recrutamento
                monta um currículo pronto em PDF, otimizado para ATS e
                pensado para chamar a atenção de um recrutador.
              </p>
            </div>

            <form onSubmit={gerarCV} className="space-y-6">
              {/* Dados pessoais */}
              <div className="bg-surface border border-hairline rounded-2xl p-6">
                <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                  <User size={16} className="text-ink-muted" />
                  Dados Pessoais
                  <span className="text-ink-faint text-xs font-normal">
                    (obrigatório)
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-ink-muted mb-1 block">
                      Nome completo
                    </label>
                    <input
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      required
                      className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-ink-muted mb-1 block">
                      Email
                    </label>
                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      type="email"
                      className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-ink-muted mb-1 block">
                      Telefone
                    </label>
                    <input
                      name="telefone"
                      value={form.telefone}
                      onChange={handleChange}
                      className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-ink-muted mb-1 block">
                      Localização
                    </label>
                    <input
                      name="localizacao"
                      value={form.localizacao}
                      onChange={handleChange}
                      className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
                      placeholder="São Paulo, SP"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-ink-muted mb-1 block">
                      LinkedIn
                    </label>
                    <input
                      name="linkedin"
                      value={form.linkedin}
                      onChange={handleChange}
                      className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
                      placeholder="linkedin.com/in/seuperfil"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-ink-muted mb-1 block">
                      GitHub
                    </label>
                    <input
                      name="github"
                      value={form.github}
                      onChange={handleChange}
                      className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
                      placeholder="github.com/seuusuario"
                    />
                  </div>
                </div>
              </div>

              {/* Vaga */}
              <div className="bg-surface border border-brass/30 rounded-2xl p-6">
                <h3 className="font-bold text-brass mb-1 flex items-center gap-2">
                  <Target size={16} />
                  Vaga Desejada
                  <span className="text-ink-faint text-xs font-normal">
                    (opcional, mas recomendado)
                  </span>
                </h3>
                <p className="text-ink-faint text-xs mb-4">
                  Se informar a vaga, a IA foca o currículo nela: prioriza as
                  habilidades pedidas e alinha as palavras-chave para ATS.
                </p>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setVagaModo("texto")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium border transition ${
                      vagaModo === "texto"
                        ? "border-brass bg-brass-wash text-brass-strong"
                        : "border-hairline-strong text-ink-muted hover:border-ink-faint"
                    }`}
                  >
                    <FileText size={14} />
                    Colar descrição
                  </button>
                  <button
                    type="button"
                    onClick={() => setVagaModo("url")}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium border transition ${
                      vagaModo === "url"
                        ? "border-brass bg-brass-wash text-brass-strong"
                        : "border-hairline-strong text-ink-muted hover:border-ink-faint"
                    }`}
                  >
                    <LinkIcon size={14} />
                    Link da vaga
                  </button>
                </div>

                {vagaModo === "texto" ? (
                  <textarea
                    name="vagaTexto"
                    value={form.vagaTexto}
                    onChange={handleChange}
                    rows={3}
                    className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition resize-none"
                    placeholder="Cole aqui a descrição da vaga. Ex: Desenvolvedor Frontend Junior — React, TypeScript, Tailwind..."
                  />
                ) : (
                  <>
                    <input
                      name="vagaUrl"
                      value={form.vagaUrl}
                      onChange={handleChange}
                      type="url"
                      className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
                      placeholder="https://empresa.com/vagas/desenvolvedor-frontend"
                    />
                    <p className="text-ink-faint text-xs mt-1.5">
                      Funciona melhor com páginas de vaga simples. Se a
                      página carregar o conteúdo via JavaScript (comum em
                      alguns portais), pode não funcionar — nesse caso, cole
                      o texto manualmente.
                    </p>
                  </>
                )}
              </div>

              {/* Objetivo */}
              <div className="bg-surface border border-hairline rounded-2xl p-6">
                <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                  <Target size={16} className="text-ink-muted" />
                  Objetivo Profissional
                  <span className="text-ink-faint text-xs font-normal">
                    (obrigatório)
                  </span>
                </h3>
                <textarea
                  name="objetivo"
                  value={form.objetivo}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition resize-none"
                  placeholder="Descreva seu objetivo profissional. Ex: Busco minha primeira oportunidade como desenvolvedor frontend, aplicando meus conhecimentos em React e JavaScript..."
                />
              </div>

              {/* Experiências */}
              <div className="bg-surface border border-hairline rounded-2xl p-6">
                <h3 className="font-bold text-ink mb-2 flex items-center gap-2">
                  <Briefcase size={16} className="text-ink-muted" />
                  Experiências Profissionais
                  <span className="text-ink-faint text-xs font-normal">
                    (obrigatório)
                  </span>
                </h3>
                <p className="text-ink-faint text-xs mb-4">
                  Inclua projetos pessoais, freelas ou estágios, com cargo,
                  empresa/projeto, período e o que você fez de fato — a IA
                  não inventa nada que não estiver aqui.
                </p>
                <textarea
                  name="experiencias"
                  value={form.experiencias}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition resize-none"
                  placeholder="Ex: Projeto DevBurger (2024) — Desenvolvi um e-commerce completo com React, Node.js e MongoDB. Implementei carrinho de compras, autenticação JWT e painel admin..."
                />
              </div>

              {/* Formação */}
              <div className="bg-surface border border-hairline rounded-2xl p-6">
                <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                  <GraduationCap size={16} className="text-ink-muted" />
                  Formação Acadêmica
                  <span className="text-ink-faint text-xs font-normal">
                    (obrigatório)
                  </span>
                </h3>
                <textarea
                  name="formacao"
                  value={form.formacao}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition resize-none"
                  placeholder="Ex: Bacharelado em Ciência da Computação — Universidade Cruzeiro do Sul (2022 - 2026, em andamento)"
                />
              </div>

              {/* Habilidades */}
              <div className="bg-surface border border-hairline rounded-2xl p-6">
                <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-ink-muted" />
                  Habilidades Técnicas
                  <span className="text-ink-faint text-xs font-normal">
                    (obrigatório)
                  </span>
                </h3>
                <textarea
                  name="habilidades"
                  value={form.habilidades}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition resize-none"
                  placeholder="Ex: JavaScript, TypeScript, React, Next.js, Node.js, Python, Git, SQL, Docker, AWS..."
                />
              </div>

              {/* Idiomas */}
              <div className="bg-surface border border-hairline rounded-2xl p-6">
                <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                  <Languages size={16} className="text-ink-muted" />
                  Idiomas
                  <span className="text-ink-faint text-xs font-normal">
                    (opcional)
                  </span>
                </h3>
                <input
                  name="idiomas"
                  value={form.idiomas}
                  onChange={handleChange}
                  className="w-full bg-surface-raised border border-hairline-strong rounded-lg px-4 py-2.5 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
                  placeholder="Ex: Inglês — intermediário, Espanhol — básico"
                />
              </div>

              {erro && (
                <div className="bg-rust-wash border border-rust/30 rounded-xl p-4 text-sm text-rust flex gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brass hover:bg-brass-strong disabled:opacity-50 text-background font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Gerando seu CV com IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    Gerar CV Otimizado
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {etapa === "resultado" && curriculo && (
          <div>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <CheckCircle2 size={24} className="text-brass" />
                  CV Gerado!
                </h2>
                <p className="text-ink-muted mt-1">
                  Seu currículo foi otimizado para ATS e para o olho humano
                  de um recrutador.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={copiarCV}
                  className="bg-surface-raised hover:bg-hairline-strong text-ink px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
                >
                  <Copy size={14} />
                  Copiar texto
                </button>
                <button
                  onClick={() => setEtapa("formulario")}
                  className="bg-surface-raised hover:bg-hairline-strong text-ink px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
                >
                  <Pencil size={14} />
                  Editar dados
                </button>
              </div>
            </div>

            {erro && (
              <div className="mb-6 bg-rust-wash border border-rust/30 rounded-xl p-4 text-sm text-rust flex gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            {curriculo.palavras_chave_alinhadas?.length > 0 && (
              <div className="bg-surface border border-brass/30 rounded-2xl p-5 mb-6">
                <p className="text-xs font-mono uppercase tracking-wide text-brass mb-2">
                  Aderência à vaga
                </p>
                <div className="flex flex-wrap gap-2">
                  {curriculo.palavras_chave_alinhadas.map((p, i) => (
                    <span
                      key={i}
                      className="bg-brass-wash border border-brass/30 text-brass-strong text-xs font-mono px-2.5 py-1 rounded-full"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prévia estilo "folha" */}
            <div className="bg-[#fbfaf6] text-[#1c1a17] rounded-2xl shadow-2xl p-10 border border-hairline">
              <h1 className="text-2xl font-bold">{curriculo.nome}</h1>
              {curriculo.titulo && (
                <p className="text-[#9c7a3c] font-medium mt-0.5">
                  {curriculo.titulo}
                </p>
              )}
              <p className="text-xs text-[#4a463f] mt-2">
                {[
                  curriculo.contato.email,
                  curriculo.contato.telefone,
                  curriculo.contato.localizacao,
                  curriculo.contato.linkedin,
                  curriculo.contato.github,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>

              <div className="border-t border-[#d8d2c4] my-5" />

              {curriculo.resumo && (
                <div className="mb-5">
                  <h2 className="text-xs font-bold uppercase tracking-wide mb-1.5">
                    Resumo
                  </h2>
                  <p className="text-sm text-[#4a463f] leading-relaxed">
                    {curriculo.resumo}
                  </p>
                </div>
              )}

              {curriculo.experiencias?.length > 0 && (
                <div className="mb-5">
                  <h2 className="text-xs font-bold uppercase tracking-wide mb-2">
                    Experiência
                  </h2>
                  <div className="space-y-4">
                    {curriculo.experiencias.map((exp, i) => (
                      <div key={i}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold">
                              {exp.cargo}
                            </p>
                            <p className="text-sm text-[#9c7a3c]">
                              {exp.empresa}
                            </p>
                          </div>
                          <p className="text-xs text-[#4a463f] shrink-0">
                            {exp.periodo}
                          </p>
                        </div>
                        <ul className="mt-1.5 space-y-1">
                          {exp.bullets?.map((b, j) => (
                            <li
                              key={j}
                              className="text-sm text-[#4a463f] flex gap-2"
                            >
                              <span className="text-[#9c7a3c]">›</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {curriculo.formacao?.length > 0 && (
                <div className="mb-5">
                  <h2 className="text-xs font-bold uppercase tracking-wide mb-2">
                    Formação
                  </h2>
                  <div className="space-y-2">
                    {curriculo.formacao.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 flex-wrap"
                      >
                        <div>
                          <p className="text-sm font-semibold">{f.curso}</p>
                          <p className="text-sm text-[#9c7a3c]">
                            {f.instituicao}
                          </p>
                        </div>
                        <p className="text-xs text-[#4a463f] shrink-0">
                          {f.periodo}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {curriculo.habilidades?.length > 0 && (
                <div className="mb-5">
                  <h2 className="text-xs font-bold uppercase tracking-wide mb-2">
                    Habilidades
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {curriculo.habilidades.map((h, i) => (
                      <span
                        key={i}
                        className="text-xs bg-[#f1ece0] px-2.5 py-1 rounded"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {curriculo.idiomas?.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wide mb-2">
                    Idiomas
                  </h2>
                  <div className="space-y-1">
                    {curriculo.idiomas.map((idm, i) => (
                      <p key={i} className="text-sm text-[#4a463f]">
                        {idm.idioma} — {idm.nivel}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={baixarPdf}
                disabled={baixandoPdf}
                className="flex-1 bg-brass hover:bg-brass-strong disabled:opacity-50 text-background font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {baixandoPdf ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {baixandoPdf ? "Gerando PDF..." : "Baixar PDF"}
              </button>
              <a
                href="/dashboard"
                className="flex-1 bg-surface-raised hover:bg-hairline-strong text-ink font-semibold py-3 rounded-xl transition text-center block"
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
