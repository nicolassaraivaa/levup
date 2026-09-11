"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, AnaliseAuditoria, AnaliseCV, ObjetivoAnalise } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import AuditModal from "@/components/AuditModal";
import ObjetivoSelect from "@/components/ObjetivoSelect";
import LinkedInIcon from "@/components/icons/LinkedInIcon";
import GitHubIcon from "@/components/icons/GitHubIcon";
import {
  SearchCheck,
  FileText,
  Loader2,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  KeyRound,
} from "lucide-react";

type FonteId = "linkedin" | "github" | "cv";

interface FonteState {
  status: "idle" | "loading" | "done";
  modalAberto: boolean;
  objetivo: ObjetivoAnalise | "";
  input: string;
  resultado: (AnaliseAuditoria & Partial<AnaliseCV>) | null;
  erro: string;
  detalhesAbertos: boolean;
}

const estadoInicial: FonteState = {
  status: "idle",
  modalAberto: false,
  objetivo: "",
  input: "",
  resultado: null,
  erro: "",
  detalhesAbertos: false,
};

const FONTES: Record<
  FonteId,
  {
    titulo: string;
    tituloModal: string;
    descricaoCard: string;
    descricaoModal: string;
    iconBg: string;
    accentText: string;
    campoLabel: string;
    campoHelper: string;
    placeholder: string;
  }
> = {
  linkedin: {
    titulo: "LinkedIn",
    tituloModal: "Análise de Perfil LinkedIn",
    descricaoCard: "Análise do seu perfil público do LinkedIn",
    descricaoModal:
      "Selecione seu objetivo e insira a URL do perfil para que o Agente LinkedIn possa fazer uma análise personalizada.",
    iconBg: "bg-blue-500/10 text-blue-400",
    accentText: "text-blue-400",
    campoLabel: "URL do Perfil",
    campoHelper: "Cole a URL completa do seu perfil do LinkedIn",
    placeholder: "https://linkedin.com/in/seu-perfil",
  },
  github: {
    titulo: "GitHub",
    tituloModal: "Análise de Perfil GitHub",
    descricaoCard: "Análise dos seus repositórios e atividade",
    descricaoModal:
      "Selecione seu objetivo e insira a URL do seu perfil para que o Agente GitHub possa fazer uma análise personalizada.",
    iconBg: "bg-purple-500/10 text-purple-400",
    accentText: "text-purple-400",
    campoLabel: "URL do Perfil",
    campoHelper: "Cole a URL completa do seu perfil do GitHub",
    placeholder: "https://github.com/seu-usuario",
  },
  cv: {
    titulo: "Currículo",
    tituloModal: "Análise de Currículo",
    descricaoCard: "Análise de compatibilidade com sistemas ATS",
    descricaoModal:
      "Selecione seu objetivo e cole o texto do seu currículo para que o Agente de CV possa fazer uma análise personalizada.",
    iconBg: "bg-orange-500/10 text-orange-400",
    accentText: "text-orange-400",
    campoLabel: "Texto do Currículo",
    campoHelper: "Cole o texto completo do seu currículo",
    placeholder: "Cole aqui o texto completo do seu currículo...",
  },
};

export default function AuditoriaPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [estados, setEstados] = useState<Record<FonteId, FonteState>>({
    linkedin: { ...estadoInicial },
    github: { ...estadoInicial },
    cv: { ...estadoInicial },
  });
  const router = useRouter();
  const supabase = createClient();

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
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function atualizar(fonte: FonteId, patch: Partial<FonteState>) {
    setEstados((prev) => ({ ...prev, [fonte]: { ...prev[fonte], ...patch } }));
  }

  function abrirModal(fonte: FonteId) {
    atualizar(fonte, { modalAberto: true, erro: "" });
  }

  function fecharModal(fonte: FonteId) {
    atualizar(fonte, { modalAberto: false, erro: "" });
  }

  async function analisar(fonte: FonteId) {
    const estado = estados[fonte];
    if (!estado.objetivo || !estado.input.trim()) return;

    atualizar(fonte, { status: "loading", erro: "" });

    try {
      const body =
        fonte === "cv"
          ? { objetivo: estado.objetivo, texto: estado.input }
          : { objetivo: estado.objetivo, url: estado.input };

      const res = await fetch(`/api/auditoria/${fonte}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível concluir a análise.");
      }

      atualizar(fonte, {
        status: "done",
        resultado: data.analise,
        modalAberto: false,
        detalhesAbertos: true,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profile_audits").insert({
          user_id: user.id,
          linkedin_url: fonte === "linkedin" ? estado.input : null,
          github_url: fonte === "github" ? estado.input : null,
          cv_text: fonte === "cv" ? estado.input : null,
          report: data.analise,
          score: data.analise.score,
        });
      }
    } catch (err) {
      atualizar(fonte, {
        status: "idle",
        erro: err instanceof Error ? err.message : "Erro inesperado.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar active="/auditoria" profile={profile} />

      <div className="ml-64 p-8 max-w-3xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <SearchCheck size={24} className="text-blue-400" />
            Auditoria de Perfil
          </h2>
          <p className="text-gray-400 mt-2">
            Analise cada parte do seu perfil profissional individualmente e
            receba score e recomendações direcionadas ao seu objetivo.
          </p>
        </div>

        <div className="space-y-5">
          {(Object.keys(FONTES) as FonteId[]).map((fonte) => (
            <CardFonte
              key={fonte}
              fonte={fonte}
              estado={estados[fonte]}
              onAbrirModal={() => abrirModal(fonte)}
              onToggleDetalhes={() =>
                atualizar(fonte, {
                  detalhesAbertos: !estados[fonte].detalhesAbertos,
                })
              }
            />
          ))}
        </div>
      </div>

      {(Object.keys(FONTES) as FonteId[]).map((fonte) => {
        const config = FONTES[fonte];
        const estado = estados[fonte];
        return (
          <AuditModal
            key={fonte}
            open={estado.modalAberto}
            onClose={() => fecharModal(fonte)}
            icon={
              fonte === "linkedin" ? (
                <LinkedInIcon size={20} />
              ) : fonte === "github" ? (
                <GitHubIcon size={20} />
              ) : (
                <FileText size={20} />
              )
            }
            iconBg={config.iconBg}
            title={config.tituloModal}
            description={config.descricaoModal}
            onSubmit={() => analisar(fonte)}
            submitLabel="Iniciar Análise"
            submitDisabled={!estado.objetivo || !estado.input.trim()}
            loading={estado.status === "loading"}
            erro={estado.erro}
          >
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Objetivo da Análise
              </label>
              <ObjetivoSelect
                value={estado.objetivo}
                onChange={(v) => atualizar(fonte, { objetivo: v })}
              />
              <p className="text-gray-500 text-xs mt-1.5">
                Escolha o objetivo para uma análise personalizada
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                {config.campoLabel}
              </label>
              {fonte === "cv" ? (
                <textarea
                  value={estado.input}
                  onChange={(e) =>
                    atualizar(fonte, { input: e.target.value })
                  }
                  rows={6}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none text-sm"
                  placeholder={config.placeholder}
                />
              ) : (
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                    {fonte === "linkedin" ? (
                      <LinkedInIcon size={16} />
                    ) : (
                      <GitHubIcon size={16} />
                    )}
                  </span>
                  <input
                    type="text"
                    value={estado.input}
                    onChange={(e) =>
                      atualizar(fonte, { input: e.target.value })
                    }
                    className="w-full bg-black border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
                    placeholder={config.placeholder}
                  />
                </div>
              )}
              <p className="text-gray-500 text-xs mt-1.5">
                {config.campoHelper}
              </p>
            </div>
          </AuditModal>
        );
      })}
    </div>
  );
}

function CardFonte({
  fonte,
  estado,
  onAbrirModal,
  onToggleDetalhes,
}: {
  fonte: FonteId;
  estado: FonteState;
  onAbrirModal: () => void;
  onToggleDetalhes: () => void;
}) {
  const config = FONTES[fonte];
  const resultado = estado.resultado;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg}`}
          >
            {fonte === "linkedin" ? (
              <LinkedInIcon size={20} />
            ) : fonte === "github" ? (
              <GitHubIcon size={20} />
            ) : (
              <FileText size={20} />
            )}
          </div>
          <div>
            <h3 className="font-bold text-white">{config.titulo}</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              {config.descricaoCard}
            </p>
          </div>
        </div>

        {resultado && (
          <div className="text-right shrink-0">
            <span className={`text-2xl font-black ${config.accentText}`}>
              {resultado.score}
            </span>
            <span className="text-gray-500 text-sm">/100</span>
          </div>
        )}
      </div>

      {!resultado ? (
        <button
          onClick={onAbrirModal}
          disabled={estado.status === "loading"}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
        >
          {estado.status === "loading" ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Analisando...
            </>
          ) : (
            "Analisar perfil"
          )}
        </button>
      ) : (
        <div className="mt-5 pt-5 border-t border-gray-800">
          <p className="text-gray-300 text-sm leading-relaxed">
            {resultado.resumo}
          </p>

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={onToggleDetalhes}
              className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1.5"
            >
              {estado.detalhesAbertos ? "Ocultar detalhes" : "Ver detalhes"}
              <ChevronDown
                size={14}
                className={`transition-transform ${estado.detalhesAbertos ? "rotate-180" : ""}`}
              />
            </button>
            <button
              onClick={onAbrirModal}
              className="text-sm text-gray-500 hover:text-white transition"
            >
              Analisar novamente
            </button>
          </div>

          {estado.detalhesAbertos && (
            <div className="mt-5 space-y-4">
              {typeof resultado.ats_score === "number" && (
                <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2.5">
                  <span className="text-gray-400 text-sm">
                    Compatibilidade ATS
                  </span>
                  <span className="text-white font-bold text-sm">
                    {resultado.ats_score}/100
                  </span>
                </div>
              )}

              <div>
                <h4 className="text-green-400 font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  Pontos Fortes
                </h4>
                <ul className="space-y-1">
                  {resultado.pontos_fortes?.map((p, i) => (
                    <li key={i} className="text-gray-300 text-sm flex gap-2">
                      <span className="text-green-400">▸</span> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-red-400 font-medium text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  Gaps
                </h4>
                <ul className="space-y-1">
                  {resultado.gaps?.map((g, i) => (
                    <li key={i} className="text-gray-300 text-sm flex gap-2">
                      <span className="text-red-400">▸</span> {g}
                    </li>
                  ))}
                </ul>
              </div>

              {resultado.palavras_chave_faltando &&
                resultado.palavras_chave_faltando.length > 0 && (
                  <div>
                    <h4 className="text-orange-400 font-medium text-sm mb-2 flex items-center gap-2">
                      <KeyRound size={15} />
                      Palavras-chave Faltando
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {resultado.palavras_chave_faltando.map((p, i) => (
                        <span
                          key={i}
                          className="bg-orange-600/20 border border-orange-700 text-orange-300 px-3 py-1 rounded-full text-xs"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <h4 className={`font-medium text-sm mb-2 flex items-center gap-2 ${config.accentText}`}>
                  <Lightbulb size={15} />
                  Sugestões
                </h4>
                <ul className="space-y-1">
                  {resultado.sugestoes?.map((s, i) => (
                    <li key={i} className="text-gray-300 text-sm flex gap-2">
                      <span className={config.accentText}>{i + 1}.</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
