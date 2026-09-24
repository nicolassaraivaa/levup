"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, RespostaEntrevista, FeedbackEntrevista } from "@/lib/types";
import type { AreaDiagnostico, NivelAlvo } from "@/lib/diagnostico";
import {
  MINIMO_PERGUNTAS_ENTREVISTA,
  MAXIMO_PERGUNTAS_ENTREVISTA,
  TEMPO_LIMITE_SEGUNDOS,
  montarPlanoEntrevista,
  type EtapaPlanoEntrevista,
} from "@/lib/entrevista";
import Sidebar from "@/components/Sidebar";
import {
  Mic,
  Palette,
  Settings,
  Rocket,
  Smartphone,
  Database,
  Timer,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Lightbulb,
} from "lucide-react";

async function postEntrevista(body: object) {
  const res = await fetch("/api/entrevistas", {
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
  { id: "frontend", label: "Frontend", icon: Palette, desc: "HTML, CSS, JavaScript, React" },
  { id: "backend", label: "Backend", icon: Settings, desc: "Node.js, APIs, Banco de dados" },
  { id: "fullstack", label: "Full Stack", icon: Rocket, desc: "Frontend + Backend" },
  { id: "mobile", label: "Mobile", icon: Smartphone, desc: "React Native, Flutter" },
  { id: "dados", label: "Dados", icon: Database, desc: "SQL, Python, BI e pipelines" },
];

const NIVEIS: { id: NivelAlvo; label: string; desc: string }[] = [
  { id: "estagio", label: "Estágio", desc: "Fundamentos e primeiros projetos" },
  { id: "junior", label: "Júnior", desc: "Já atuou em projetos reais" },
  { id: "pleno", label: "Pleno", desc: "Autonomia no dia a dia" },
];

function formatarTempo(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatarLimiteMinutos(segundos: number) {
  if (segundos % 60 === 0) {
    const m = segundos / 60;
    return `${m} ${m === 1 ? "minuto" : "minutos"}`;
  }
  return `${segundos} segundos`;
}

const MAX_HISTORICO_ENTREVISTAS = 5;

interface HistoricoEntrevista {
  id: string;
  created_at?: string;
  messages: RespostaEntrevista[];
  feedback: (FeedbackEntrevista & { area?: string; nivel_alvo?: string }) | null;
}

function formatarData(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function EntrevistasPage() {
  const [etapa, setEtapa] = useState<"config" | "entrevista" | "feedback" | "cancelada">(
    "config",
  );
  const [areaSelecionada, setAreaSelecionada] = useState<AreaDiagnostico | "">("");
  const [nivelSelecionado, setNivelSelecionado] = useState<NivelAlvo | "">("");
  const [plano, setPlano] = useState<EtapaPlanoEntrevista[]>([]);
  const [respostas, setRespostas] = useState<RespostaEntrevista[]>([]);
  const [perguntaAtual, setPerguntaAtual] = useState("");
  const [temaAtual, setTemaAtual] = useState("");
  const [tipoAtual, setTipoAtual] = useState<"tecnica" | "comportamental">("comportamental");
  const [inputUsuario, setInputUsuario] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState<FeedbackEntrevista | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tempoRestante, setTempoRestante] = useState(TEMPO_LIMITE_SEGUNDOS);
  const [historico, setHistorico] = useState<HistoricoEntrevista[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function carregarHistorico(userId: string) {
    const { data } = await supabase
      .from("interview_sessions")
      .select("id, created_at, messages, feedback")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORICO_ENTREVISTAS);
    setHistorico((data ?? []) as HistoricoEntrevista[]);
  }

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
      carregarHistorico(user.id);
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [respostas, perguntaAtual]);

  function pararTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => () => pararTimer(), []);

  function iniciarTimer() {
    pararTimer();
    setTempoRestante(TEMPO_LIMITE_SEGUNDOS);
    timerRef.current = setInterval(() => {
      setTempoRestante((t) => {
        if (t <= 1) {
          pararTimer();
          setEtapa("cancelada");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function iniciarEntrevista() {
    if (!areaSelecionada) return;
    setLoading(true);
    setErro("");
    const novoPlano = montarPlanoEntrevista(areaSelecionada);
    setPlano(novoPlano);
    setEtapa("entrevista");

    try {
      const data = await postEntrevista({
        area: areaSelecionada,
        nivel: nivelSelecionado,
        etapa: "pergunta",
        respostas: [],
        tema: novoPlano[0].tema,
        tipo: novoPlano[0].tipo,
      });
      setPerguntaAtual(data.pergunta);
      setTemaAtual(novoPlano[0].tema);
      setTipoAtual(novoPlano[0].tipo);
      iniciarTimer();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setEtapa("config");
    } finally {
      setLoading(false);
    }
  }

  async function enviarResposta() {
    if (!inputUsuario.trim() || loading) return;
    pararTimer();
    setLoading(true);
    setErro("");

    const perguntaRespondida = perguntaAtual;
    const temaRespondido = temaAtual;
    const tipoRespondido = tipoAtual;
    const textoResposta = inputUsuario;
    setInputUsuario("");

    const respostasParaEnvio: RespostaEntrevista[] = [
      ...respostas,
      {
        tipo: tipoRespondido,
        tema: temaRespondido,
        pergunta: perguntaRespondida,
        resposta: textoResposta,
        score: null,
      },
    ];
    const proximoSlot = plano[respostasParaEnvio.length];

    try {
      const data = await postEntrevista({
        area: areaSelecionada,
        nivel: nivelSelecionado,
        etapa: "pergunta",
        respostas: respostasParaEnvio,
        tema: proximoSlot?.tema,
        tipo: proximoSlot?.tipo,
      });

      const respostasAtualizadas: RespostaEntrevista[] = [
        ...respostas,
        {
          tipo: tipoRespondido,
          tema: temaRespondido,
          pergunta: perguntaRespondida,
          resposta: textoResposta,
          score: data.score_ultima_resposta,
        },
      ];
      setRespostas(respostasAtualizadas);

      if (data.finalizado || !proximoSlot) {
        await finalizarComFeedback(respostasAtualizadas);
      } else {
        setPerguntaAtual(data.pergunta);
        setTemaAtual(proximoSlot.tema);
        setTipoAtual(proximoSlot.tipo);
        iniciarTimer();
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function finalizarComFeedback(respostasFinais: RespostaEntrevista[]) {
    const data = await postEntrevista({
      area: areaSelecionada,
      nivel: nivelSelecionado,
      etapa: "feedback",
      respostas: respostasFinais,
    });
    setFeedback(data.feedback);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: existentes } = await supabase
        .from("interview_sessions")
        .select("id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (existentes && existentes.length >= MAX_HISTORICO_ENTREVISTAS) {
        const idsParaExcluir = existentes
          .slice(0, existentes.length - (MAX_HISTORICO_ENTREVISTAS - 1))
          .map((r) => r.id);
        if (idsParaExcluir.length > 0) {
          await supabase.from("interview_sessions").delete().in("id", idsParaExcluir);
        }
      }

      await supabase.from("interview_sessions").insert({
        user_id: user.id,
        type: "mista",
        language: "PT",
        messages: respostasFinais,
        feedback: { ...data.feedback, area: areaSelecionada, nivel_alvo: nivelSelecionado },
      });

      carregarHistorico(user.id);
    }

    setEtapa("feedback");
  }

  function reiniciar() {
    pararTimer();
    setEtapa("config");
    setPlano([]);
    setRespostas([]);
    setPerguntaAtual("");
    setInputUsuario("");
    setFeedback(null);
    setTempoRestante(TEMPO_LIMITE_SEGUNDOS);
  }

  function verHistorico(item: HistoricoEntrevista) {
    if (!item.feedback) return;
    pararTimer();
    setRespostas(item.messages ?? []);
    setFeedback(item.feedback);
    setAreaSelecionada((item.feedback.area as AreaDiagnostico) || "");
    setNivelSelecionado((item.feedback.nivel_alvo as NivelAlvo) || "");
    setEtapa("feedback");
  }

  const tecnicasRespondidas = respostas.filter((r) => r.tipo === "tecnica" && r.score != null);
  const comportamentaisRespondidas = respostas.filter(
    (r) => r.tipo === "comportamental" && r.score != null,
  );
  const mediaTecnica = tecnicasRespondidas.length
    ? Math.round(
        tecnicasRespondidas.reduce((soma, r) => soma + (r.score ?? 0), 0) /
          tecnicasRespondidas.length,
      )
    : null;
  const mediaComportamental = comportamentaisRespondidas.length
    ? Math.round(
        comportamentaisRespondidas.reduce((soma, r) => soma + (r.score ?? 0), 0) /
          comportamentaisRespondidas.length,
      )
    : null;

  return (
    <div className="min-h-screen bg-background text-ink">
      <Sidebar active="/entrevistas" profile={profile} />

      <div className="pt-14 md:pt-0 md:ml-64 flex flex-col h-screen">
        {/* CONFIG */}
        {etapa === "config" && (
          <div className="p-4 sm:p-8 max-w-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                <Mic size={24} className="text-brass" />
                Simulador de Entrevistas
              </h2>
              <p className="text-ink-muted mt-2">
                Uma entrevista completa em português, misturando perguntas
                técnicas e comportamentais — como uma entrevista de verdade.
              </p>
            </div>

            {erro && (
              <div className="mb-6 bg-rust-wash border border-rust/30 rounded-xl p-4 text-sm text-rust flex gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-ink mb-3">Área técnica</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AREAS.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => setAreaSelecionada(area.id)}
                      className={`p-4 rounded-xl border text-left transition sm:last:odd:col-span-2 ${
                        areaSelecionada === area.id
                          ? "border-brass bg-brass-wash"
                          : "border-hairline bg-surface hover:border-hairline-strong"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-brass-wash text-brass flex items-center justify-center mb-2">
                        <area.icon size={17} />
                      </div>
                      <h4 className="font-bold text-ink">{area.label}</h4>
                      <p className="text-ink-muted text-sm mt-1">{area.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink mb-3">
                  Nível da vaga que você busca
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              </div>

              <div className="bg-surface border border-brass/30 rounded-xl p-4 text-sm text-ink-muted flex gap-2.5">
                <Lightbulb size={16} className="text-brass shrink-0 mt-0.5" />
                <span>
                  A entrevista é em <strong className="text-ink">português</strong>,
                  tem no mínimo{" "}
                  <strong className="text-ink">{MINIMO_PERGUNTAS_ENTREVISTA} perguntas</strong>{" "}
                  (pode chegar a {MAXIMO_PERGUNTAS_ENTREVISTA} se identificarmos
                  dificuldade) e você tem{" "}
                  <strong className="text-ink">
                    {formatarLimiteMinutos(TEMPO_LIMITE_SEGUNDOS)}
                  </strong>{" "}
                  por resposta — estourou o tempo, a entrevista é encerrada.
                </span>
              </div>

              <button
                onClick={iniciarEntrevista}
                disabled={!areaSelecionada || !nivelSelecionado || loading}
                className="w-full bg-brass hover:bg-brass-strong disabled:opacity-50 text-background font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? "Iniciando entrevista..." : "Iniciar Entrevista"}
                {!loading && <ArrowRight size={17} />}
              </button>
            </div>

            {historico.length > 0 && (
              <div className="mt-6 bg-surface border border-hairline rounded-2xl p-6">
                <h3 className="font-bold text-ink mb-1">
                  Histórico de entrevistas
                </h3>
                <p className="text-ink-faint text-xs mb-4">
                  As {MAX_HISTORICO_ENTREVISTAS} entrevistas mais recentes
                  concluídas até o fim ficam salvas aqui.
                </p>
                <div className="divide-y divide-hairline">
                  {historico.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => verHistorico(item)}
                      className="w-full flex items-center gap-4 py-3 text-left hover:bg-surface-raised -mx-2 px-2 rounded-lg transition"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brass-wash text-brass shrink-0">
                        <Mic size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink truncate capitalize">
                          {item.feedback?.area || "Entrevista"}
                          {item.feedback?.nivel_alvo
                            ? ` · ${NIVEIS.find((n) => n.id === item.feedback?.nivel_alvo)?.label ?? item.feedback.nivel_alvo}`
                            : ""}
                        </span>
                        <span className="block text-xs text-ink-faint">
                          {formatarData(item.created_at)} · {item.messages?.length ?? 0}{" "}
                          perguntas
                        </span>
                      </span>
                      <span className="font-mono text-sm text-brass shrink-0">
                        {item.feedback?.score ?? "—"}
                        <span className="text-ink-faint">/100</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ENTREVISTA */}
        {etapa === "entrevista" && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-hairline flex items-center justify-between bg-surface">
              <div>
                <h2 className="font-bold text-ink flex items-center gap-2">
                  <Mic size={16} className="text-brass" />
                  Entrevista — {areaSelecionada}
                </h2>
                <p className="text-ink-faint text-xs mt-0.5">
                  Pergunta {respostas.length + 1} · mínimo{" "}
                  {MINIMO_PERGUNTAS_ENTREVISTA}
                </p>
              </div>
              <div
                className={`flex items-center gap-2 font-mono text-sm rounded-md border px-3 py-1.5 ${
                  tempoRestante <= 20
                    ? "border-rust/40 bg-rust-wash text-rust"
                    : "border-hairline-strong text-ink-muted"
                }`}
              >
                <Timer size={14} />
                {formatarTempo(tempoRestante)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {respostas.map((r, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-start">
                    <div className="max-w-2xl rounded-2xl px-5 py-3 bg-surface border border-hairline-strong text-ink">
                      <p className="text-xs text-ink-faint mb-1 font-mono uppercase tracking-wide">
                        {r.tipo === "tecnica" ? "técnica" : "comportamental"} · {r.tema}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {r.pergunta}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-2xl rounded-2xl px-5 py-3 bg-brass text-background">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {r.resposta}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {perguntaAtual && !loading && (
                <div className="flex justify-start">
                  <div className="max-w-2xl rounded-2xl px-5 py-3 bg-surface border border-hairline-strong text-ink">
                    <p className="text-xs text-ink-faint mb-1 font-mono uppercase tracking-wide">
                      {tipoAtual === "tecnica" ? "técnica" : "comportamental"} · {temaAtual}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {perguntaAtual}
                    </p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-hairline-strong rounded-2xl px-5 py-3">
                    <p className="text-xs text-ink-faint mb-1">Entrevistador</p>
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-ink-faint rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-ink-faint rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-ink-faint rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-hairline bg-surface">
              {erro && (
                <div className="mb-3 bg-rust-wash border border-rust/30 rounded-xl p-3 text-sm text-rust flex gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {erro}
                </div>
              )}
              <div className="flex gap-3">
                <textarea
                  value={inputUsuario}
                  onChange={(e) => setInputUsuario(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarResposta();
                    }
                  }}
                  placeholder="Digite sua resposta..."
                  rows={2}
                  disabled={loading}
                  className="flex-1 bg-surface-raised border border-hairline-strong rounded-xl px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition resize-none text-sm"
                />
                <button
                  onClick={enviarResposta}
                  disabled={!inputUsuario.trim() || loading}
                  className="bg-brass hover:bg-brass-strong disabled:opacity-50 text-background px-5 rounded-xl transition font-semibold"
                >
                  Enviar
                </button>
              </div>
              <p className="text-ink-faint text-xs mt-2">
                Enter para enviar · Shift+Enter para nova linha
              </p>
            </div>
          </div>
        )}

        {/* CANCELADA POR TIMEOUT */}
        {etapa === "cancelada" && (
          <div className="p-4 sm:p-8 max-w-xl">
            <div className="bg-surface border border-rust/30 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-rust-wash text-rust flex items-center justify-center mx-auto mb-4">
                <Timer size={22} />
              </div>
              <h2 className="text-xl font-bold text-ink">
                Entrevista encerrada — tempo esgotado
              </h2>
              <p className="text-ink-muted text-sm mt-3 leading-relaxed">
                Você não respondeu a pergunta {respostas.length + 1} dentro
                de {formatarLimiteMinutos(TEMPO_LIMITE_SEGUNDOS)}. Em
                entrevistas reais o tempo de resposta também é curto — é
                exatamente isso que estamos treinando aqui.
              </p>
              <p className="text-ink-faint text-xs mt-2">
                Você completou {respostas.length}{" "}
                {respostas.length === 1 ? "pergunta" : "perguntas"} antes do
                tempo acabar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                  onClick={reiniciar}
                  className="flex-1 bg-surface-raised hover:bg-hairline-strong text-ink font-semibold py-3 rounded-xl transition"
                >
                  Tentar de novo
                </button>
                <a
                  href="/dashboard"
                  className="flex-1 bg-brass hover:bg-brass-strong text-background font-semibold py-3 rounded-xl transition text-center block"
                >
                  Voltar ao dashboard
                </a>
              </div>
            </div>
          </div>
        )}

        {/* FEEDBACK */}
        {etapa === "feedback" && feedback && (
          <div className="p-4 sm:p-8 max-w-3xl overflow-y-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                <BarChart3 size={24} className="text-brass" />
                Feedback da Entrevista
              </h2>
              <p className="text-ink-muted mt-1">
                Entrevista de {areaSelecionada} · nível alvo:{" "}
                {NIVEIS.find((n) => n.id === nivelSelecionado)?.label} · {respostas.length}{" "}
                perguntas
              </p>
            </div>

            <div className="bg-surface border border-hairline rounded-2xl p-6 mb-6 text-center">
              <div className="text-6xl font-semibold text-brass mb-2 font-mono">
                {feedback.score}
              </div>
              <div className="text-ink-muted text-sm mb-3">Score Geral / 100</div>
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                <span className="inline-block bg-brass-wash border border-brass text-brass-strong px-4 py-1 rounded-full text-sm font-medium capitalize">
                  Nível: {feedback.nivel}
                </span>
                {mediaTecnica !== null && (
                  <span className="inline-block bg-surface-raised border border-hairline-strong text-ink-muted px-4 py-1 rounded-full text-sm font-mono">
                    Técnica: {mediaTecnica}/100
                  </span>
                )}
                {mediaComportamental !== null && (
                  <span className="inline-block bg-surface-raised border border-hairline-strong text-ink-muted px-4 py-1 rounded-full text-sm font-mono">
                    Comportamental: {mediaComportamental}/100
                  </span>
                )}
              </div>
            </div>

            <div className="bg-surface border border-hairline rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
                <FileText size={16} className="text-ink-faint" />
                Avaliação Geral
              </h3>
              <p className="text-ink-muted leading-relaxed">{feedback.resumo}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-surface border border-sage/30 rounded-2xl p-6">
                <h3 className="font-bold text-sage mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Pontos Fortes
                </h3>
                <ul className="space-y-2">
                  {feedback.pontos_fortes?.map((p: string, i: number) => (
                    <li key={i} className="text-ink-muted text-sm flex gap-2">
                      <span className="text-sage">▸</span> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-surface border border-rust/30 rounded-2xl p-6">
                <h3 className="font-bold text-rust mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Pontos a Melhorar
                </h3>
                <ul className="space-y-2">
                  {feedback.pontos_melhoria?.map((p: string, i: number) => (
                    <li key={i} className="text-ink-muted text-sm flex gap-2">
                      <span className="text-rust">▸</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-surface border border-brass/30 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-brass mb-3 flex items-center gap-2">
                <Lightbulb size={16} />
                Dicas para Próximas Entrevistas
              </h3>
              <ul className="space-y-2">
                {feedback.dicas?.map((d: string, i: number) => (
                  <li key={i} className="text-ink-muted text-sm flex gap-2">
                    <span className="text-brass font-bold">{i + 1}.</span> {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={reiniciar}
                className="flex-1 bg-brass hover:bg-brass-strong text-background font-semibold py-3 rounded-xl transition"
              >
                Nova entrevista
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
