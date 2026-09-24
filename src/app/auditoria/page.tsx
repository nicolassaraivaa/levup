"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, ObjetivoAnalise, AnaliseLinkedIn, SecaoAnaliseLinkedIn } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import ObjetivoSelect from "@/components/ObjetivoSelect";
import LinkedInIcon from "@/components/icons/LinkedInIcon";
import type { ReactNode } from "react";
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  UploadCloud,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

type Modo = "texto" | "imagem" | "pdf";
type AbaId =
  | "resumo"
  | "experiencia"
  | "habilidades"
  | "educacao"
  | "melhorias"
  | "acoes";

const MODOS: { id: Modo; label: string; icon: typeof FileText }[] = [
  { id: "texto", label: "Colar texto", icon: FileText },
  { id: "imagem", label: "Enviar imagem", icon: ImageIcon },
  { id: "pdf", label: "Enviar PDF", icon: Paperclip },
];

const ABAS: { id: AbaId; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "experiencia", label: "Experiência" },
  { id: "habilidades", label: "Habilidades" },
  { id: "educacao", label: "Educação" },
  { id: "melhorias", label: "Melhorias" },
  { id: "acoes", label: "Ações" },
];

const MAX_HISTORICO = 5;

const LIMITE_MB: Record<"imagem" | "pdf", number> = { imagem: 5, pdf: 15 };

function lerArquivoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ArquivoSelecionado {
  base64: string;
  mediaType: string;
  nome: string;
  previewUrl?: string;
}

interface HistoricoAuditoria {
  id: string;
  score: number | null;
  created_at?: string;
  report: AnaliseLinkedIn;
}

function formatarData(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AuditoriaPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [objetivo, setObjetivo] = useState<ObjetivoAnalise | "">("");
  const [modo, setModo] = useState<Modo>("texto");
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<ArquivoSelecionado | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [resultado, setResultado] = useState<AnaliseLinkedIn | null>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<AbaId>("resumo");
  const [historico, setHistorico] = useState<HistoricoAuditoria[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  async function carregarHistorico(userId: string) {
    const { data } = await supabase
      .from("profile_audits")
      .select("id, score, created_at, report")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORICO);
    setHistorico((data ?? []) as HistoricoAuditoria[]);
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

  function removerArquivo() {
    if (arquivo?.previewUrl) URL.revokeObjectURL(arquivo.previewUrl);
    setArquivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function trocarModo(novoModo: Modo) {
    setModo(novoModo);
    setErro("");
    removerArquivo();
  }

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || modo === "texto") return;
    setErro("");

    const limiteMb = LIMITE_MB[modo];
    if (file.size > limiteMb * 1024 * 1024) {
      setErro(`Arquivo muito grande. O limite é ${limiteMb}MB.`);
      return;
    }

    const base64 = await lerArquivoBase64(file);
    setArquivo({
      base64,
      mediaType: file.type,
      nome: file.name,
      previewUrl: modo === "imagem" ? URL.createObjectURL(file) : undefined,
    });
  }

  async function analisar() {
    if (!objetivo) return;
    if (modo === "texto" && !texto.trim()) return;
    if (modo !== "texto" && !arquivo) return;

    setStatus("loading");
    setErro("");

    try {
      const body: Record<string, unknown> = { objetivo, modo };
      if (modo === "texto") {
        body.texto = texto;
      } else {
        body.arquivo = { base64: arquivo!.base64, mediaType: arquivo!.mediaType };
      }

      const res = await fetch("/api/auditoria/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível concluir a análise.");
      }

      setResultado(data.analise);
      setStatus("done");
      setAba("resumo");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: existentes } = await supabase
          .from("profile_audits")
          .select("id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (existentes && existentes.length >= MAX_HISTORICO) {
          const idsParaExcluir = existentes
            .slice(0, existentes.length - (MAX_HISTORICO - 1))
            .map((r) => r.id);
          if (idsParaExcluir.length > 0) {
            await supabase.from("profile_audits").delete().in("id", idsParaExcluir);
          }
        }

        await supabase.from("profile_audits").insert({
          user_id: user.id,
          linkedin_url: null,
          github_url: null,
          cv_text: null,
          report: data.analise,
          score: data.analise.score,
        });

        carregarHistorico(user.id);
      }
    } catch (err) {
      setStatus("idle");
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  function reiniciar() {
    setStatus("idle");
    setResultado(null);
    setObjetivo("");
    setTexto("");
    removerArquivo();
    setModo("texto");
    setAba("resumo");
    setErro("");
  }

  function verHistorico(item: HistoricoAuditoria) {
    setResultado(item.report);
    setStatus("done");
    setAba("resumo");
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      <Sidebar active="/auditoria" profile={profile} />

      <div className="pt-20 px-4 pb-8 md:ml-64 md:pt-8 md:px-8 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
            <LinkedInIcon size={22} />
            Auditoria de LinkedIn
          </h2>
          <p className="text-ink-muted mt-2">
            Envie seu perfil — texto, uma captura de tela ou o PDF exportado
            — e receba uma auditoria completa de uma recrutadora
            especializada em IA.
          </p>
        </div>

        {erro && (
          <div className="mb-6 bg-rust-wash border border-rust/30 rounded-xl p-4 text-sm text-rust flex gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {erro}
          </div>
        )}

        {status !== "done" ? (
          <div className="bg-surface border border-hairline rounded-2xl p-6 space-y-6">
            <div>
              <label className="text-sm font-medium text-ink mb-2 block">
                Objetivo da Análise
              </label>
              <ObjetivoSelect value={objetivo} onChange={setObjetivo} />
              <p className="text-ink-faint text-xs mt-1.5">
                Escolha o objetivo para uma análise personalizada
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-2 block">
                Seu perfil do LinkedIn
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {MODOS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => trocarModo(m.id)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium border transition ${
                      modo === m.id
                        ? "border-brass bg-brass-wash text-brass-strong"
                        : "border-hairline-strong text-ink-muted hover:border-ink-faint"
                    }`}
                  >
                    <m.icon size={14} />
                    {m.label}
                  </button>
                ))}
              </div>

              {modo === "texto" ? (
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={8}
                  placeholder="Cole aqui a headline, o 'Sobre', experiências, formação e habilidades do seu perfil..."
                  className="w-full bg-background border border-hairline-strong rounded-lg px-4 py-3 text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition resize-none text-sm"
                />
              ) : !arquivo ? (
                <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-hairline-strong rounded-xl py-10 cursor-pointer hover:border-brass transition text-ink-faint">
                  <UploadCloud size={22} />
                  <span className="text-sm text-center px-4">
                    {modo === "imagem"
                      ? `Clique para enviar uma captura de tela do seu perfil (JPEG, PNG, WEBP — até ${LIMITE_MB.imagem}MB)`
                      : `Clique para enviar o PDF exportado do seu perfil pelo LinkedIn (até ${LIMITE_MB.pdf}MB)`}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={modo === "imagem" ? "image/*" : "application/pdf"}
                    className="hidden"
                    onChange={handleArquivoSelecionado}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 border border-hairline-strong rounded-xl p-4">
                  {modo === "imagem" && arquivo.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={arquivo.previewUrl}
                      alt=""
                      className="w-14 h-14 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <FileText size={28} className="text-brass shrink-0" />
                  )}
                  <span className="text-sm text-ink flex-1 truncate">
                    {arquivo.nome}
                  </span>
                  <button
                    type="button"
                    onClick={removerArquivo}
                    className="text-ink-faint hover:text-ink transition shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <p className="text-ink-faint text-xs mt-1.5">
                Quanto mais completo o conteúdo enviado, mais precisa é a
                análise.
              </p>
            </div>

            <button
              onClick={analisar}
              disabled={
                status === "loading" ||
                !objetivo ||
                (modo === "texto" ? !texto.trim() : !arquivo)
              }
              className="w-full bg-brass hover:bg-brass-strong disabled:opacity-50 text-background font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analisando...
                </>
              ) : (
                "Iniciar Análise"
              )}
            </button>
          </div>
        ) : null}

        {status !== "done" && historico.length > 0 && (
          <div className="mt-6 bg-surface border border-hairline rounded-2xl p-6">
            <h3 className="font-bold text-ink mb-1">
              Histórico de análises
            </h3>
            <p className="text-ink-faint text-xs mb-4">
              As {MAX_HISTORICO} análises mais recentes ficam salvas aqui.
            </p>
            <div className="divide-y divide-hairline">
              {historico.map((item) => (
                <button
                  key={item.id}
                  onClick={() => verHistorico(item)}
                  className="w-full flex items-center gap-4 py-3 text-left hover:bg-surface-raised -mx-2 px-2 rounded-lg transition"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brass-wash text-brass shrink-0">
                    <LinkedInIcon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">
                      {item.report?.nome || "Perfil analisado"}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {formatarData(item.created_at)}
                    </span>
                  </span>
                  <span className="font-mono text-sm text-brass shrink-0">
                    {item.score ?? "—"}
                    <span className="text-ink-faint">/100</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "done" && resultado && (
          <ResultadoAuditoria
            resultado={resultado}
            aba={aba}
            setAba={setAba}
            onReiniciar={reiniciar}
          />
        )}
      </div>
    </div>
  );
}

function ResultadoAuditoria({
  resultado,
  aba,
  setAba,
  onReiniciar,
}: {
  resultado: AnaliseLinkedIn;
  aba: AbaId;
  setAba: (a: AbaId) => void;
  onReiniciar: () => void;
}) {
  return (
    <div>
      <div className="bg-surface border border-hairline rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-brass-wash text-brass flex items-center justify-center shrink-0">
              <LinkedInIcon size={20} />
            </span>
            <div>
              <h3 className="font-bold text-ink">
                {resultado.nome || "Perfil analisado"}
              </h3>
              <p className="text-ink-faint text-xs mt-0.5">
                {resultado.headline}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 font-mono">
            <span className="text-2xl font-semibold text-brass">
              {resultado.score}
            </span>
            <span className="text-ink-faint text-sm">/100</span>
          </div>
        </div>
        <p className="text-ink-muted text-sm leading-relaxed mt-4">
          {resultado.resumo}
        </p>
        <button
          onClick={onReiniciar}
          className="mt-4 text-sm text-ink-faint hover:text-ink transition"
        >
          Nova análise
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-6 border-b border-hairline">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              aba === a.id
                ? "border-brass text-brass"
                : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "resumo" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {(["experiencia", "habilidades", "educacao"] as const).map((chave) => {
            const secao = resultado[chave];
            return (
              <button
                key={chave}
                onClick={() => setAba(chave)}
                className="bg-surface border border-hairline rounded-xl p-4 text-left hover:border-hairline-strong transition"
              >
                <p className="text-ink-faint text-xs font-mono uppercase tracking-wide">
                  {ABAS.find((a) => a.id === chave)?.label}
                </p>
                <p className="text-xl font-mono font-semibold text-ink mt-1">
                  {secao.score ?? "—"}
                  {secao.score !== null && (
                    <span className="text-ink-faint text-sm">/100</span>
                  )}
                </p>
                {secao.score !== null && (
                  <div className="w-full bg-surface-raised rounded-full h-1.5 mt-2">
                    <div
                      className="bg-brass h-1.5 rounded-full"
                      style={{ width: `${secao.score}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {aba === "experiencia" && (
        <SecaoDetalhe titulo="Experiência" secao={resultado.experiencia}>
          {resultado.experiencia.destaques?.length > 0 && (
            <div className="mt-5">
              <h4 className="text-sm font-semibold text-ink mb-2">
                Destaques
              </h4>
              <ul className="space-y-2">
                {resultado.experiencia.destaques.map((d, i) => (
                  <li key={i} className="text-ink-muted text-sm flex gap-2">
                    <span className="text-sage shrink-0">↗</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SecaoDetalhe>
      )}

      {aba === "habilidades" && (
        <SecaoDetalhe titulo="Habilidades" secao={resultado.habilidades}>
          {resultado.habilidades.sugeridas?.length > 0 && (
            <div className="mt-5">
              <h4 className="text-sm font-semibold text-ink mb-2">
                Habilidades Sugeridas
              </h4>
              <div className="space-y-2">
                {resultado.habilidades.sugeridas.map((h, i) => (
                  <div
                    key={i}
                    className="bg-brass-wash border border-brass/30 rounded-lg px-4 py-2.5"
                  >
                    <span className="text-sm font-semibold text-brass-strong">
                      {h.nome}:{" "}
                    </span>
                    <span className="text-sm text-ink-muted">
                      {h.descricao}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SecaoDetalhe>
      )}

      {aba === "educacao" && (
        <SecaoDetalhe titulo="Educação" secao={resultado.educacao} />
      )}

      {aba === "melhorias" && (
        <div className="space-y-5">
          {resultado.melhorias.map((m, i) => (
            <div
              key={i}
              className="bg-surface border border-hairline rounded-2xl p-6"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h3 className="font-bold text-ink">{m.titulo}</h3>
                <div className="flex gap-2 shrink-0">
                  <span
                    className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                      m.prioridade === "alta"
                        ? "border-rust/40 bg-rust-wash text-rust"
                        : m.prioridade === "média"
                          ? "border-brass/40 bg-brass-wash text-brass-strong"
                          : "border-hairline-strong text-ink-faint"
                    }`}
                  >
                    prioridade {m.prioridade}
                  </span>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-hairline-strong text-ink-faint">
                    {m.esforco}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-semibold text-ink">Problema: </span>
                  <span className="text-ink-muted">{m.problema}</span>
                </p>
                <p>
                  <span className="font-semibold text-ink">Solução: </span>
                  <span className="text-ink-muted">{m.solucao}</span>
                </p>
              </div>

              <div className="bg-surface-raised border border-hairline-strong rounded-lg px-4 py-3 mt-4">
                <p className="text-xs font-mono uppercase tracking-wide text-ink-faint mb-1">
                  Impacto esperado
                </p>
                <p className="text-sm text-ink-muted">{m.impacto_esperado}</p>
              </div>

              {m.exemplos?.length > 0 && (
                <div className="mt-4 space-y-3">
                  {m.exemplos.map((ex, j) => (
                    <div key={j} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-rust-wash border border-rust/30 rounded-lg p-3">
                        <p className="text-xs font-mono uppercase text-rust mb-1">
                          Antes
                        </p>
                        <p className="text-sm text-ink-muted">{ex.antes}</p>
                      </div>
                      <div className="bg-sage-wash border border-sage/30 rounded-lg p-3">
                        <p className="text-xs font-mono uppercase text-sage mb-1">
                          Depois
                        </p>
                        <p className="text-sm text-ink-muted">{ex.depois}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {m.passo_a_passo?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-mono uppercase tracking-wide text-ink-faint mb-2">
                    Passo a passo
                  </p>
                  <ol className="space-y-1.5">
                    {m.passo_a_passo.map((p, k) => (
                      <li key={k} className="text-sm text-ink-muted flex gap-2">
                        <span className="text-brass font-mono shrink-0">
                          {k + 1}.
                        </span>
                        {p}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {aba === "acoes" && (
        <div className="bg-surface border border-hairline rounded-2xl p-6">
          <h3 className="font-bold text-ink mb-4">
            Próximos Passos Recomendados
          </h3>
          <ul className="space-y-3">
            {resultado.acoes.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-muted">
                <span className="font-mono text-brass shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SecaoDetalhe({
  titulo,
  secao,
  children,
}: {
  titulo: string;
  secao: SecaoAnaliseLinkedIn;
  children?: ReactNode;
}) {
  return (
    <div className="bg-surface border border-hairline rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-ink">Análise de {titulo}</h3>
        <span className="font-mono text-sm text-ink-muted">
          {secao.score !== null ? `${secao.score}/100` : "—"}
        </span>
      </div>
      {secao.score !== null && (
        <div className="w-full bg-surface-raised rounded-full h-1.5 mb-4">
          <div
            className="bg-brass h-1.5 rounded-full"
            style={{ width: `${secao.score}%` }}
          />
        </div>
      )}
      <p className="text-ink-muted text-sm leading-relaxed">
        {secao.analise}
      </p>
      {children}
    </div>
  );
}
