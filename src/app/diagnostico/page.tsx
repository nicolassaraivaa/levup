"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, ResultadoDiagnostico, RespostaDiagnostico } from "@/lib/types";
import {
  MINIMO_PERGUNTAS,
  agregarHistoricoCategorias,
  montarPlanoCategorias,
  type AreaDiagnostico,
  type NivelAlvo,
} from "@/lib/diagnostico";
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
  Compass,
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

const AREAS: { id: AreaDiagnostico; label: string; icon: typeof Palette; desc: string }[] = [
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

const NIVEIS: { id: NivelAlvo; label: string; desc: string }[] = [
  { id: "estagio", label: "Estágio", desc: "Fundamentos e primeiros projetos" },
  { id: "junior", label: "Júnior", desc: "Já atuou em projetos reais" },
  { id: "pleno", label: "Pleno", desc: "Autonomia no dia a dia" },
];

export default function DiagnosticoPage() {
  const [etapa, setEtapa] = useState<"selecao" | "quiz" | "resultado">(
    "selecao",
  );
  const [areaSelecionada, setAreaSelecionada] = useState<AreaDiagnostico | "">("");
  const [nivelSelecionado, setNivelSelecionado] = useState<NivelAlvo | "">("");
  const [perguntaAtual, setPerguntaAtual] = useState("");
  const [categoriaAtual, setCategoriaAtual] = useState("");
  const [resposta, setResposta] = useState("");
  const [respostas, setRespostas] = useState<RespostaDiagnostico[]>([]);
  const [planoCategorias, setPlanoCategorias] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoDiagnostico | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const totalPerguntas = planoCategorias.length || MINIMO_PERGUNTAS;

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
    if (!areaSelecionada) return;
    setLoading(true);
    setErro("");
    setEtapa("quiz");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let historico: { categorias?: { categoria: string; score: number }[] }[] = [];
      if (user) {
        const { data: anteriores } = await supabase
          .from("diagnostics")
          .select("result")
          .eq("user_id", user.id)
          .eq("area", areaSelecionada)
          .order("created_at", { ascending: false })
          .limit(5);
        historico = (anteriores ?? []).map((row) => row.result ?? {});
      }

      const plano = montarPlanoCategorias(
        areaSelecionada,
        agregarHistoricoCategorias(historico),
      );
      setPlanoCategorias(plano);

      const data = await postDiagnostico({
        area: areaSelecionada,
        nivel: nivelSelecionado,
        etapa: "pergunta",
        respostas: [],
        categoria: plano[0],
      });
      setPerguntaAtual(data.pergunta);
      setCategoriaAtual(plano[0]);
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

    const novasRespostas: RespostaDiagnostico[] = [
      ...respostas,
      { categoria: categoriaAtual, pergunta: perguntaAtual, resposta },
    ];
    setRespostas(novasRespostas);
    setResposta("");

    try {
      if (novasRespostas.length >= planoCategorias.length) {
        const data = await postDiagnostico({
          area: areaSelecionada,
          nivel: nivelSelecionado,
          etapa: "resultado",
          respostas: novasRespostas,
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
            result: { ...data.resultado, nivel_alvo: nivelSelecionado },
          });
        }

        setEtapa("resultado");
      } else {
        const proximaCategoria = planoCategorias[novasRespostas.length];
        const data = await postDiagnostico({
          area: areaSelecionada,
          nivel: nivelSelecionado,
          etapa: "pergunta",
          respostas: novasRespostas,
          categoria: proximaCategoria,
        });
        setPerguntaAtual(data.pergunta);
        setCategoriaAtual(proximaCategoria);
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
    setNivelSelecionado("");
    setPerguntaAtual("");
    setCategoriaAtual("");
    setResposta("");
    setRespostas([]);
    setPlanoCategorias([]);
    setResultado(null);
  }

  const nivelAlvoLabel = NIVEIS.find((n) => n.id === nivelSelecionado)?.label;

  return (
    <div className="min-h-screen bg-background text-ink">
      <Sidebar active="/diagnostico" profile={profile} />

      <div className="ml-64 p-8 max-w-3xl">
        {etapa === "selecao" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                <Target size={24} className="text-brass" />
                Diagnóstico de Competências
              </h2>
              <p className="text-ink-muted mt-2">
                Pelo menos {MINIMO_PERGUNTAS} perguntas cobrindo competências
                específicas da sua área, calibradas pelo nível da vaga que
                você busca. Se você já fez esse diagnóstico antes, o sistema
                foca mais nos seus pontos fracos.
              </p>
            </div>

            {erro && (
              <div className="mb-6 bg-rust-wash border border-rust/30 rounded-xl p-4 text-sm text-rust flex gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            <h3 className="text-sm font-semibold text-ink mb-3">
              Área técnica
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setAreaSelecionada(area.id)}
                  className={`p-5 rounded-2xl border text-left transition ${
                    areaSelecionada === area.id
                      ? "border-brass bg-brass-wash"
                      : "border-hairline bg-surface hover:border-hairline-strong"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-brass-wash text-brass flex items-center justify-center mb-3">
                    <area.icon size={19} />
                  </div>
                  <h3 className="font-bold text-ink">{area.label}</h3>
                  <p className="text-ink-muted text-sm mt-1">{area.desc}</p>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-ink mb-3">
              Nível da vaga que você busca
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {NIVEIS.map((nivel) => (
                <button
                  key={nivel.id}
                  onClick={() => setNivelSelecionado(nivel.id)}
                  className={`p-4 rounded-xl border text-left transition ${
                    nivelSelecionado === nivel.id
                      ? "border-brass bg-brass-wash"
                      : "border-hairline bg-surface hover:border-hairline-strong"
                  }`}
                >
                  <h4 className="font-bold text-ink text-sm">{nivel.label}</h4>
                  <p className="text-ink-muted text-xs mt-1">{nivel.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={iniciarDiagnostico}
              disabled={!areaSelecionada || !nivelSelecionado || loading}
              className="w-full bg-brass hover:bg-brass-strong disabled:opacity-50 text-background font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? "Gerando diagnóstico..." : "Iniciar Diagnóstico"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </div>
        )}

        {etapa === "quiz" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink flex items-center gap-2.5">
                <Target size={20} className="text-brass" />
                Diagnóstico — {areaSelecionada}
              </h2>
              <span className="text-ink-muted text-sm">
                Pergunta {respostas.length + 1} de {totalPerguntas}
              </span>
            </div>

            <div className="w-full bg-surface-raised rounded-full h-2 mb-8">
              <div
                className="bg-brass h-2 rounded-full transition-all"
                style={{
                  width: `${(respostas.length / totalPerguntas) * 100}%`,
                }}
              />
            </div>

            {erro && (
              <div className="mb-6 bg-rust-wash border border-rust/30 rounded-xl p-4 text-sm text-rust flex gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            {loading ? (
              <div className="bg-surface border border-hairline rounded-2xl p-8 text-center">
                <Loader2
                  size={28}
                  className="mx-auto mb-4 text-brass animate-spin"
                />
                <p className="text-ink-muted">
                  {respostas.length >= planoCategorias.length
                    ? "Analisando suas respostas e montando o relatório..."
                    : "Gerando próxima pergunta..."}
                </p>
              </div>
            ) : (
              <div>
                <div className="bg-surface border border-hairline rounded-2xl p-6 mb-6">
                  {categoriaAtual && (
                    <p className="font-mono text-xs uppercase tracking-wide text-brass mb-3">
                      {categoriaAtual}
                    </p>
                  )}
                  <p className="text-ink text-lg leading-relaxed">
                    {perguntaAtual}
                  </p>
                </div>

                <textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  placeholder="Digite sua resposta aqui..."
                  rows={5}
                  className="w-full bg-surface border border-hairline-strong rounded-xl px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition resize-none mb-4"
                />

                <button
                  onClick={responderPergunta}
                  disabled={!resposta.trim() || loading}
                  className="w-full bg-brass hover:bg-brass-strong disabled:opacity-50 text-background font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {respostas.length + 1 >= totalPerguntas
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
              <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                <BarChart3 size={24} className="text-brass" />
                Resultado do Diagnóstico
              </h2>
              <p className="text-ink-muted mt-1">
                Área: {areaSelecionada} · Nível alvo: {nivelAlvoLabel}
              </p>
            </div>

            <div className="bg-surface border border-hairline rounded-2xl p-6 mb-6 text-center">
              <div className="text-6xl font-semibold text-brass mb-2 font-mono">
                {resultado.score}
              </div>
              <div className="text-ink-muted text-sm mb-3">
                Score Geral / 100
              </div>
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                <span className="inline-block bg-brass-wash border border-brass text-brass-strong px-4 py-1 rounded-full text-sm font-medium capitalize">
                  Nível percebido: {resultado.nivel_percebido}
                </span>
                <span className="inline-block bg-surface-raised border border-hairline-strong text-ink-muted px-4 py-1 rounded-full text-sm font-medium capitalize">
                  Nível alvo: {nivelAlvoLabel}
                </span>
              </div>
            </div>

            <div className="bg-surface border border-hairline rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-ink mb-4">
                Desempenho por competência
              </h3>
              <div className="space-y-4">
                {resultado.categorias?.map((c, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-ink">
                        {c.categoria}
                      </span>
                      <span className="font-mono text-sm text-ink-muted">
                        {c.score}/100
                      </span>
                    </div>
                    <div className="w-full bg-surface-raised rounded-full h-1.5 mb-1.5">
                      <div
                        className="bg-brass h-1.5 rounded-full transition-all"
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <p className="text-ink-faint text-xs">{c.comentario}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-hairline rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
                <FileText size={16} className="text-ink-faint" />
                Resumo
              </h3>
              <p className="text-ink-muted leading-relaxed">
                {resultado.resumo}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-surface border border-sage/30 rounded-2xl p-6">
                <h3 className="font-bold text-sage mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Pontos Fortes
                </h3>
                <ul className="space-y-2">
                  {resultado.pontos_fortes?.map((p: string, i: number) => (
                    <li key={i} className="text-ink-muted text-sm flex gap-2">
                      <span className="text-sage">▸</span> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-surface border border-rust/30 rounded-2xl p-6">
                <h3 className="font-bold text-rust mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Gaps Identificados
                </h3>
                <ul className="space-y-2">
                  {resultado.gaps?.map((g: string, i: number) => (
                    <li key={i} className="text-ink-muted text-sm flex gap-2">
                      <span className="text-rust">▸</span> {g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-surface border border-brass/30 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-brass mb-3 flex items-center gap-2">
                <Target size={16} />
                Recomendações
              </h3>
              <ul className="space-y-2">
                {resultado.recomendacoes?.map((r: string, i: number) => (
                  <li key={i} className="text-ink-muted text-sm flex gap-2">
                    <span className="text-brass font-bold">{i + 1}.</span> {r}
                  </li>
                ))}
              </ul>
            </div>

            {resultado.proxima_acao && (
              <div className="bg-brass-wash border border-brass/30 rounded-2xl p-5 mb-6 flex gap-3 items-start">
                <Compass size={18} className="text-brass shrink-0 mt-0.5" />
                <p className="text-sm text-ink">
                  <span className="font-semibold text-brass-strong">
                    Próximo passo:{" "}
                  </span>
                  {resultado.proxima_acao}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={reiniciar}
                className="flex-1 bg-surface-raised hover:bg-hairline-strong text-ink font-semibold py-3 rounded-xl transition"
              >
                Fazer novo diagnóstico
              </button>
              <a
                href="/dashboard"
                className="flex-1 bg-brass hover:bg-brass-strong text-background font-semibold py-3 rounded-xl transition text-center block"
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
