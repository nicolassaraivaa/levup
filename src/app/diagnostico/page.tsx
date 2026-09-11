"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, ResultadoDiagnostico, Mensagem } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import {
  Target,
  Palette,
  Settings,
  Rocket,
  Smartphone,
  Loader2,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

async function postDiagnostico(body: object) {
  const res = await fetch("/api/diagnostico", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Não foi possível processar sua solicitação.");
  }
  return data;
}

const AREAS = [
  {
    id: "frontend",
    label: "Frontend",
    icon: Palette,
    desc: "HTML, CSS, JavaScript, React",
  },
  {
    id: "backend",
    label: "Backend",
    icon: Settings,
    desc: "Node.js, APIs, Banco de dados",
  },
  {
    id: "fullstack",
    label: "Full Stack",
    icon: Rocket,
    desc: "Frontend + Backend",
  },
  {
    id: "mobile",
    label: "Mobile",
    icon: Smartphone,
    desc: "React Native, Flutter",
  },
];

const TOTAL_PERGUNTAS = 5;

export default function DiagnosticoPage() {
  const [etapa, setEtapa] = useState<"selecao" | "quiz" | "resultado">(
    "selecao",
  );
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const [perguntaAtual, setPerguntaAtual] = useState("");
  const [resposta, setResposta] = useState("");
  const [historico, setHistorico] = useState<Mensagem[]>([]);
  const [numeroPergunta, setNumeroPergunta] = useState(1);
  const [resultado, setResultado] = useState<ResultadoDiagnostico | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
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

  async function iniciarDiagnostico() {
    setLoading(true);
    setErro("");
    setEtapa("quiz");

    try {
      const data = await postDiagnostico({
        area: areaSelecionada,
        etapa: "pergunta",
        historico: [],
      });
      setPerguntaAtual(data.pergunta);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setEtapa("selecao");
    } finally {
      setLoading(false);
    }
  }

  async function responderPergunta() {
    if (!resposta.trim()) return;
    setLoading(true);
    setErro("");

    const novoHistorico: Mensagem[] = [
      ...historico,
      { role: "assistant", content: perguntaAtual },
      { role: "user", content: resposta },
    ];
    setHistorico(novoHistorico);
    setResposta("");

    try {
      if (numeroPergunta >= TOTAL_PERGUNTAS) {
        const data = await postDiagnostico({
          area: areaSelecionada,
          etapa: "resultado",
          historico: novoHistorico,
        });
        setResultado(data.resultado);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("diagnostics").insert({
            user_id: user.id,
            area: areaSelecionada,
            score: data.resultado.score,
            gaps: data.resultado.gaps,
            result: data.resultado,
          });
        }

        setEtapa("resultado");
      } else {
        const data = await postDiagnostico({
          area: areaSelecionada,
          etapa: "pergunta",
          respostaUsuario: resposta,
          historico: novoHistorico,
        });
        setPerguntaAtual(data.pergunta);
        setNumeroPergunta((n) => n + 1);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function reiniciar() {
    setEtapa("selecao");
    setAreaSelecionada("");
    setPerguntaAtual("");
    setResposta("");
    setHistorico([]);
    setNumeroPergunta(1);
    setResultado(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar active="/diagnostico" profile={profile} />

      <div className="ml-64 p-8 max-w-3xl">
        {etapa === "selecao" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <Target size={24} className="text-indigo-400" />
                Diagnóstico de Competências
              </h2>
              <p className="text-gray-400 mt-2">
                Selecione sua área para iniciar o diagnóstico técnico com{" "}
                {TOTAL_PERGUNTAS} perguntas.
              </p>
            </div>

            {erro && (
              <div className="mb-6 bg-red-500/10 border border-red-800 rounded-xl p-4 text-sm text-red-300 flex gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
              {AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setAreaSelecionada(area.id)}
                  className={`p-5 rounded-2xl border text-left transition ${
                    areaSelecionada === area.id
                      ? "border-indigo-500 bg-indigo-600/20"
                      : "border-gray-800 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                    <area.icon size={19} />
                  </div>
                  <h3 className="font-bold text-white">{area.label}</h3>
                  <p className="text-gray-400 text-sm mt-1">{area.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={iniciarDiagnostico}
              disabled={!areaSelecionada || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? "Gerando diagnóstico..." : "Iniciar Diagnóstico"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </div>
        )}

        {etapa === "quiz" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <Target size={20} className="text-indigo-400" />
                Diagnóstico — {areaSelecionada}
              </h2>
              <span className="text-gray-400 text-sm">
                Pergunta {numeroPergunta} de {TOTAL_PERGUNTAS}
              </span>
            </div>

            <div className="w-full bg-gray-800 rounded-full h-2 mb-8">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{
                  width: `${((numeroPergunta - 1) / TOTAL_PERGUNTAS) * 100}%`,
                }}
              />
            </div>

            {erro && (
              <div className="mb-6 bg-red-500/10 border border-red-800 rounded-xl p-4 text-sm text-red-300 flex gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            {loading ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                <Loader2
                  size={28}
                  className="mx-auto mb-4 text-indigo-400 animate-spin"
                />
                <p className="text-gray-400">Gerando próxima pergunta...</p>
              </div>
            ) : (
              <div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                  <p className="text-white text-lg leading-relaxed">
                    {perguntaAtual}
                  </p>
                </div>

                <textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  placeholder="Digite sua resposta aqui..."
                  rows={5}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none mb-4"
                />

                <button
                  onClick={responderPergunta}
                  disabled={!resposta.trim() || loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {numeroPergunta >= TOTAL_PERGUNTAS
                    ? "Finalizar e ver resultado"
                    : "Próxima pergunta"}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {etapa === "resultado" && resultado && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <BarChart3 size={24} className="text-indigo-400" />
                Resultado do Diagnóstico
              </h2>
              <p className="text-gray-400 mt-1">Área: {areaSelecionada}</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 text-center">
              <div className="text-6xl font-black text-indigo-400 mb-2">
                {resultado.score}
              </div>
              <div className="text-gray-400 text-sm mb-2">
                Score Geral / 100
              </div>
              <div className="inline-block bg-indigo-600/20 border border-indigo-500 text-indigo-300 px-4 py-1 rounded-full text-sm font-medium capitalize">
                Nível: {resultado.nivel}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                Resumo
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {resultado.resumo}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900 border border-green-800 rounded-2xl p-6">
                <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Pontos Fortes
                </h3>
                <ul className="space-y-2">
                  {resultado.pontos_fortes?.map((p: string, i: number) => (
                    <li key={i} className="text-gray-300 text-sm flex gap-2">
                      <span className="text-green-400">▸</span> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-900 border border-red-800 rounded-2xl p-6">
                <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Gaps Identificados
                </h3>
                <ul className="space-y-2">
                  {resultado.gaps?.map((g: string, i: number) => (
                    <li key={i} className="text-gray-300 text-sm flex gap-2">
                      <span className="text-red-400">▸</span> {g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-gray-900 border border-indigo-800 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-indigo-400 mb-3 flex items-center gap-2">
                <Target size={16} />
                Recomendações
              </h3>
              <ul className="space-y-2">
                {resultado.recomendacoes?.map((r: string, i: number) => (
                  <li key={i} className="text-gray-300 text-sm flex gap-2">
                    <span className="text-indigo-400 font-bold">{i + 1}.</span>{" "}
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={reiniciar}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Fazer novo diagnóstico
              </button>
              <a
                href="/dashboard"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition text-center block"
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
