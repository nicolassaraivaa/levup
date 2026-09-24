"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type {
  Profile,
  ResultadoDiagnostico,
  FeedbackEntrevista,
  AnaliseLinkedIn,
} from "@/lib/types";
import { agregarHistoricoCategorias } from "@/lib/diagnostico";
import Sidebar from "@/components/Sidebar";
import {
  Target,
  Mic,
  SearchCheck,
  FileText,
  ArrowRight,
  Gauge,
  Sparkles,
  Loader2,
  AlertCircle,
  BookOpen,
  GraduationCap,
} from "lucide-react";

const FEATURES = [
  {
    href: "/diagnostico",
    index: "01",
    tag: "diagnóstico",
    icon: Target,
    title: "Diagnóstico de Competências",
    cta: "Iniciar diagnóstico",
  },
  {
    href: "/entrevistas",
    index: "02",
    tag: "treino",
    icon: Mic,
    title: "Simulador de Entrevistas",
    cta: "Iniciar simulação",
  },
  {
    href: "/auditoria",
    index: "03",
    tag: "auditoria",
    icon: SearchCheck,
    title: "Auditoria de LinkedIn",
    cta: "Auditar perfil",
  },
  {
    href: "/cv",
    index: "04",
    tag: "build final",
    icon: FileText,
    title: "Gerador de CV",
    cta: "Gerar CV",
  },
] as const;

interface DiagnosticoRow {
  id: string;
  area: string;
  score: number;
  created_at?: string;
  result: (ResultadoDiagnostico & { nivel_alvo?: string }) | null;
}

interface EntrevistaRow {
  id: string;
  type: string;
  language: string;
  created_at?: string;
  feedback: (FeedbackEntrevista & { area?: string; nivel_alvo?: string }) | null;
}

interface AuditoriaRow {
  id: string;
  score: number | null;
  created_at?: string;
  report: AnaliseLinkedIn | null;
}

function porData<T extends { created_at?: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );
}

function formatarDataRelativa(iso?: string) {
  if (!iso) return "";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}`;
}

interface SugestaoCurso {
  tema: string;
  motivo: string;
  onde_estudar: string[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoRow[]>([]);
  const [entrevistas, setEntrevistas] = useState<EntrevistaRow[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaRow[]>([]);
  const [sugestoes, setSugestoes] = useState<SugestaoCurso[] | null>(null);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [erroSugestoes, setErroSugestoes] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadTudo() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const [{ data: profileData }, { data: diagData }, { data: entrData }, { data: audData }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("diagnostics").select("*").eq("user_id", user.id),
          supabase.from("interview_sessions").select("*").eq("user_id", user.id),
          supabase.from("profile_audits").select("*").eq("user_id", user.id),
        ]);

      setProfile(profileData);
      setDiagnosticos(porData((diagData ?? []) as DiagnosticoRow[]));
      setEntrevistas(porData((entrData ?? []) as EntrevistaRow[]));
      setAuditorias(porData((audData ?? []) as AuditoriaRow[]));
      setCarregandoDados(false);
    }
    loadTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const ultimoDiagnostico = diagnosticos[0];
  const ultimaEntrevista = entrevistas[0];
  const ultimaAuditoria = auditorias[0];

  const sinaisProntidao = [
    ultimoDiagnostico?.score,
    ultimaEntrevista?.feedback?.score,
    ultimaAuditoria?.score,
  ].filter((s): s is number => typeof s === "number");
  const prontidao = sinaisProntidao.length
    ? Math.round(sinaisProntidao.reduce((a, b) => a + b, 0) / sinaisProntidao.length)
    : null;
  const coberturaTotal = 3;

  const mediaCategorias = agregarHistoricoCategorias(
    diagnosticos.map((d) => ({ categorias: d.result?.categorias })),
  );
  const pontoFraco = mediaCategorias.length
    ? [...mediaCategorias].sort((a, b) => a.mediaScore - b.mediaScore)[0]
    : null;

  const eventos = [
    ...diagnosticos.map((d) => ({
      tipo: "diagnostico" as const,
      label: `Diagnóstico — ${d.area}`,
      score: d.score,
      data: d.created_at,
      href: "/diagnostico",
    })),
    ...entrevistas.map((e) => ({
      tipo: "entrevista" as const,
      label: e.feedback?.area
        ? `Entrevista — ${e.feedback.area}`
        : `Entrevista ${e.type === "tecnica" ? "técnica" : "comportamental"} (${e.language})`,
      score: e.feedback?.score ?? null,
      data: e.created_at,
      href: "/entrevistas",
    })),
    ...auditorias.map((a) => ({
      tipo: "auditoria" as const,
      label: "Auditoria — LinkedIn",
      score: a.score,
      data: a.created_at,
      href: "/auditoria",
    })),
  ]
    .sort((a, b) => new Date(b.data ?? 0).getTime() - new Date(a.data ?? 0).getTime())
    .slice(0, 7);

  const gapsUnicos = Array.from(
    new Set(
      [
        ...diagnosticos.slice(0, 3).flatMap((d) => d.result?.gaps ?? []),
        ...auditorias.slice(0, 3).flatMap((a) => a.report?.melhorias?.map((m) => m.problema) ?? []),
        ...entrevistas.slice(0, 3).flatMap((e) => e.feedback?.pontos_melhoria ?? []),
      ].filter(Boolean),
    ),
  ).slice(0, 20);

  async function gerarSugestoes() {
    setLoadingSugestoes(true);
    setErroSugestoes("");
    try {
      const res = await fetch("/api/dashboard/cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: ultimoDiagnostico?.area ?? null, gaps: gapsUnicos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível gerar sugestões.");
      }
      setSugestoes(data.sugestoes ?? []);
    } catch (err) {
      setErroSugestoes(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoadingSugestoes(false);
    }
  }

  const EVENTO_ICON = { diagnostico: Target, entrevista: Mic, auditoria: SearchCheck };

  return (
    <div className="min-h-screen bg-background text-ink">
      <Sidebar active="/dashboard" profile={profile} />

      <div className="pt-20 px-4 pb-8 md:ml-64 md:pt-8 md:px-8 max-w-5xl">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-ink">
            Olá, {profile?.name?.split(" ")[0] || "desenvolvedor"}
          </h2>
          <p className="text-ink-muted mt-1">
            Pronto para evoluir sua carreira hoje?
          </p>
        </div>

        {!carregandoDados && (
          <>
            {/* Score de prontidão geral */}
            <div className="bg-surface border border-hairline rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass-wash text-brass shrink-0">
                    <Gauge size={22} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="font-bold text-ink">Prontidão para o mercado</h3>
                    <p className="text-ink-muted text-sm mt-0.5">
                      {prontidao !== null
                        ? `Baseado em ${sinaisProntidao.length} de ${coberturaTotal} avaliações que você já fez.`
                        : "Ainda sem dados suficientes — comece pelo diagnóstico ou pela auditoria."}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-4xl font-semibold text-brass">
                    {prontidao !== null ? `${prontidao}%` : "—"}
                  </span>
                </div>
              </div>
              <div className="w-full bg-surface-raised rounded-full h-1.5 mt-5">
                <div
                  className="bg-brass h-1.5 rounded-full transition-all"
                  style={{ width: `${prontidao ?? 0}%` }}
                />
              </div>
            </div>

            {/* Snapshot de progresso */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <a
                href="/diagnostico"
                className="bg-surface border border-hairline rounded-2xl p-5 hover:border-hairline-strong transition"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brass-wash text-brass mb-3">
                  <Target size={16} />
                </span>
                <p className="text-ink-faint text-xs font-mono uppercase tracking-wide">
                  Diagnóstico
                </p>
                {ultimoDiagnostico ? (
                  <>
                    <p className="text-2xl font-mono font-semibold text-ink mt-1">
                      {ultimoDiagnostico.score}
                      <span className="text-ink-faint text-sm">/100</span>
                    </p>
                    <p className="text-ink-muted text-xs mt-1">
                      {ultimoDiagnostico.area} · refazer
                    </p>
                  </>
                ) : (
                  <p className="text-ink-muted text-sm mt-2">Ainda não feito → começar</p>
                )}
              </a>

              <a
                href="/entrevistas"
                className="bg-surface border border-hairline rounded-2xl p-5 hover:border-hairline-strong transition"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brass-wash text-brass mb-3">
                  <Mic size={16} />
                </span>
                <p className="text-ink-faint text-xs font-mono uppercase tracking-wide">
                  Entrevistas
                </p>
                {entrevistas.length > 0 ? (
                  <>
                    <p className="text-2xl font-mono font-semibold text-ink mt-1">
                      {entrevistas.length}
                      <span className="text-ink-faint text-sm"> feitas</span>
                    </p>
                    <p className="text-ink-muted text-xs mt-1">
                      última: {ultimaEntrevista?.feedback?.score ?? "—"}/100
                    </p>
                  </>
                ) : (
                  <p className="text-ink-muted text-sm mt-2">Ainda não feito → começar</p>
                )}
              </a>

              <a
                href="/auditoria"
                className="bg-surface border border-hairline rounded-2xl p-5 hover:border-hairline-strong transition"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brass-wash text-brass mb-3">
                  <SearchCheck size={16} />
                </span>
                <p className="text-ink-faint text-xs font-mono uppercase tracking-wide">
                  LinkedIn
                </p>
                {ultimaAuditoria ? (
                  <>
                    <p className="text-2xl font-mono font-semibold text-ink mt-1">
                      {ultimaAuditoria.score}
                      <span className="text-ink-faint text-sm">/100</span>
                    </p>
                    <p className="text-ink-muted text-xs mt-1">refazer</p>
                  </>
                ) : (
                  <p className="text-ink-muted text-sm mt-2">Ainda não feito → auditar</p>
                )}
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Foco no ponto fraco */}
              <div className="bg-surface border border-brass/30 rounded-2xl p-6">
                <h3 className="font-bold text-brass mb-3 flex items-center gap-2">
                  <Target size={16} />
                  Foco no ponto fraco
                </h3>
                {pontoFraco ? (
                  <>
                    <p className="text-ink text-sm leading-relaxed">
                      Sua competência mais frágil no histórico é{" "}
                      <strong className="text-ink">{pontoFraco.categoria}</strong>,
                      com média de{" "}
                      <span className="font-mono">
                        {Math.round(pontoFraco.mediaScore)}/100
                      </span>
                      .
                    </p>
                    <a
                      href="/diagnostico"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brass hover:text-brass-strong transition"
                    >
                      Praticar de novo (o diagnóstico já prioriza esse tema)
                      <ArrowRight size={14} />
                    </a>
                  </>
                ) : (
                  <p className="text-ink-muted text-sm leading-relaxed">
                    Faça seu primeiro diagnóstico para descobrirmos qual
                    competência merece mais atenção.
                  </p>
                )}
              </div>

              {/* Linha do tempo */}
              <div className="bg-surface border border-hairline rounded-2xl p-6">
                <h3 className="font-bold text-ink mb-4 font-mono text-sm uppercase tracking-wide">
                  changelog · atividade recente
                </h3>
                {eventos.length > 0 ? (
                  <ul className="space-y-3">
                    {eventos.map((ev, i) => {
                      const Icon = EVENTO_ICON[ev.tipo];
                      return (
                        <li key={i}>
                          <a
                            href={ev.href}
                            className="flex items-center gap-3 group"
                          >
                            <Icon
                              size={14}
                              className="text-ink-faint shrink-0 group-hover:text-brass transition"
                            />
                            <span className="text-sm text-ink-muted flex-1 truncate group-hover:text-ink transition">
                              {ev.label}
                            </span>
                            {ev.score !== null && (
                              <span className="font-mono text-xs text-ink-faint shrink-0">
                                {ev.score}/100
                              </span>
                            )}
                            <span className="text-ink-faint text-xs shrink-0 w-16 text-right">
                              {formatarDataRelativa(ev.data)}
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-ink-muted text-sm leading-relaxed">
                    Suas próximas ações vão aparecer aqui, como um changelog da
                    sua evolução.
                  </p>
                )}
              </div>
            </div>

            {/* Sugestões de curso */}
            <div className="bg-surface border border-hairline rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-1">
                <h3 className="font-bold text-ink flex items-center gap-2">
                  <GraduationCap size={16} className="text-brass" />
                  Sugestões de estudo
                </h3>
                {gapsUnicos.length > 0 && !sugestoes && (
                  <button
                    onClick={gerarSugestoes}
                    disabled={loadingSugestoes}
                    className="flex items-center gap-2 rounded-md bg-brass hover:bg-brass-strong disabled:opacity-50 text-background text-sm font-medium px-4 py-2 transition"
                  >
                    {loadingSugestoes ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {loadingSugestoes ? "Gerando..." : "Gerar sugestões"}
                  </button>
                )}
              </div>
              <p className="text-ink-muted text-sm mb-4">
                Baseado nas dificuldades encontradas no seu diagnóstico,
                entrevistas simuladas e auditoria de perfil.
              </p>

              {erroSugestoes && (
                <div className="mb-4 bg-rust-wash border border-rust/30 rounded-xl p-3 text-sm text-rust flex gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {erroSugestoes}
                </div>
              )}

              {gapsUnicos.length === 0 ? (
                <p className="text-ink-faint text-sm">
                  Faça pelo menos um diagnóstico, entrevista ou auditoria para
                  receber sugestões personalizadas.
                </p>
              ) : sugestoes ? (
                sugestoes.length > 0 ? (
                  <div className="space-y-4">
                    {sugestoes.map((s, i) => (
                      <div
                        key={i}
                        className="border-t border-hairline pt-4 first:border-t-0 first:pt-0"
                      >
                        <p className="font-medium text-ink flex items-center gap-2">
                          <BookOpen size={14} className="text-brass shrink-0" />
                          {s.tema}
                        </p>
                        <p className="text-ink-muted text-sm mt-1">{s.motivo}</p>
                        {s.onde_estudar?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {s.onde_estudar.map((o, j) => (
                              <span
                                key={j}
                                className="bg-surface-raised border border-hairline-strong text-ink-muted px-3 py-1 rounded-full text-xs font-mono"
                              >
                                {o}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-faint text-sm">
                    Nenhuma dificuldade recorrente identificada por enquanto.
                  </p>
                )
              ) : (
                <p className="text-ink-faint text-sm">
                  Clique em &quot;Gerar sugestões&quot; para receber
                  recomendações de estudo personalizadas.
                </p>
              )}
            </div>
          </>
        )}

        {/* Ações rápidas */}
        <h3 className="text-sm font-semibold text-ink-faint uppercase tracking-wide font-mono mb-3">
          ações rápidas
        </h3>
        <div className="divide-y divide-hairline border-y border-hairline">
          {FEATURES.map(({ href, index, tag, icon: Icon, title, cta }) => (
            <a
              key={href}
              href={href}
              className="group grid grid-cols-[auto_1fr] items-center gap-5 py-4 sm:grid-cols-[2.5rem_auto_1fr_auto] sm:gap-6"
            >
              <span className="font-mono text-sm text-ink-faint">{index}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-hairline-strong text-brass">
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex flex-wrap items-baseline gap-x-2.5">
                <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                  {tag}
                </span>
                <span className="font-medium text-ink text-sm">{title}</span>
              </span>
              <span className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-brass sm:flex">
                {cta}
                <ArrowRight
                  size={15}
                  className="transition group-hover:translate-x-0.5"
                />
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
