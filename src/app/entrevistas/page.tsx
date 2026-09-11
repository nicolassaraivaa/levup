"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile, Mensagem, FeedbackEntrevista } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import {
  Mic,
  Code2,
  Users,
  Lightbulb,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

const MAX_MENSAGENS = 10;

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

export default function EntrevistasPage() {
  const [etapa, setEtapa] = useState<"config" | "entrevista" | "feedback">(
    "config",
  );
  const [tipo, setTipo] = useState<"tecnica" | "comportamental">("tecnica");
  const [idioma, setIdioma] = useState<"PT" | "EN">("PT");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [inputUsuario, setInputUsuario] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState<FeedbackEntrevista | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalRespostas, setTotalRespostas] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function iniciarEntrevista() {
    setLoading(true);
    setErro("");
    setEtapa("entrevista");

    try {
      const data = await postEntrevista({
        tipo,
        idioma,
        etapa: "iniciar",
        mensagens: [],
      });
      const primeiraMensagem: Mensagem = {
        role: "assistant",
        content: data.resposta,
      };
      setMensagens([primeiraMensagem]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setEtapa("config");
    } finally {
      setLoading(false);
    }
  }

  async function enviarResposta() {
    if (!inputUsuario.trim() || loading) return;
    setLoading(true);
    setErro("");

    const novaMensagemUsuario: Mensagem = {
      role: "user",
      content: inputUsuario,
    };
    const novasMensagens = [...mensagens, novaMensagemUsuario];
    setMensagens(novasMensagens);
    setInputUsuario("");

    const novasRespostas = totalRespostas + 1;
    setTotalRespostas(novasRespostas);

    try {
      if (novasRespostas >= MAX_MENSAGENS / 2) {
        // Gerar feedback
        const data = await postEntrevista({
          tipo,
          idioma,
          etapa: "feedback",
          mensagens: novasMensagens,
        });
        setFeedback(data.feedback);

        // Salvar no Supabase
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("interview_sessions").insert({
            user_id: user.id,
            type: tipo,
            language: idioma,
            messages: novasMensagens,
            feedback: data.feedback,
          });
        }

        setEtapa("feedback");
      } else {
        const data = await postEntrevista({
          tipo,
          idioma,
          etapa: "responder",
          mensagens: novasMensagens,
        });
        setMensagens((prev) => [
          ...prev,
          { role: "assistant", content: data.resposta },
        ]);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function reiniciar() {
    setEtapa("config");
    setMensagens([]);
    setInputUsuario("");
    setFeedback(null);
    setTotalRespostas(0);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar active="/entrevistas" profile={profile} />

      {/* Main */}
      <div className="ml-64 flex flex-col h-screen">
        {/* CONFIG */}
        {etapa === "config" && (
          <div className="p-8 max-w-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <Mic size={24} className="text-cyan-400" />
                Simulador de Entrevistas
              </h2>
              <p className="text-gray-400 mt-2">
                Configure sua sessão de entrevista e pratique com feedback
                imediato de IA.
              </p>
            </div>

            {erro && (
              <div className="mb-6 bg-red-500/10 border border-red-800 rounded-xl p-4 text-sm text-red-300 flex gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erro}
              </div>
            )}

            <div className="space-y-6">
              {/* Tipo */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">
                  Tipo de Entrevista
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTipo("tecnica")}
                    className={`p-4 rounded-xl border text-left transition ${
                      tipo === "tecnica"
                        ? "border-cyan-500 bg-cyan-600/20"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
                      <Code2 size={17} />
                    </div>
                    <h4 className="font-bold text-white">Técnica</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Algoritmos, conceitos e boas práticas
                    </p>
                  </button>
                  <button
                    onClick={() => setTipo("comportamental")}
                    className={`p-4 rounded-xl border text-left transition ${
                      tipo === "comportamental"
                        ? "border-cyan-500 bg-cyan-600/20"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
                      <Users size={17} />
                    </div>
                    <h4 className="font-bold text-white">Comportamental</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Soft skills e experiências
                    </p>
                  </button>
                </div>
              </div>

              {/* Idioma */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">Idioma</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIdioma("PT")}
                    className={`p-4 rounded-xl border text-center transition ${
                      idioma === "PT"
                        ? "border-cyan-500 bg-cyan-600/20"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-xs font-bold tracking-wider text-cyan-400 mb-1.5">
                      PT
                    </div>
                    <p className="font-bold text-white">Português</p>
                  </button>
                  <button
                    onClick={() => setIdioma("EN")}
                    className={`p-4 rounded-xl border text-center transition ${
                      idioma === "EN"
                        ? "border-cyan-500 bg-cyan-600/20"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-xs font-bold tracking-wider text-cyan-400 mb-1.5">
                      EN
                    </div>
                    <p className="font-bold text-white">English</p>
                  </button>
                </div>
              </div>

              <div className="bg-gray-900 border border-cyan-800 rounded-xl p-4 text-sm text-gray-400 flex gap-2.5">
                <Lightbulb size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  A entrevista terá{" "}
                  <strong className="text-white">5 perguntas</strong> e ao
                  final você receberá um feedback detalhado com score e dicas
                  de melhoria.
                </span>
              </div>

              <button
                onClick={iniciarEntrevista}
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? "Iniciando entrevista..." : "Iniciar Entrevista"}
                {!loading && <ArrowRight size={17} />}
              </button>
            </div>
          </div>
        )}

        {/* ENTREVISTA */}
        {etapa === "entrevista" && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
              <div>
                <h2 className="font-bold text-white flex items-center gap-2">
                  <Mic size={16} className="text-cyan-400" />
                  Entrevista {tipo === "tecnica" ? "Técnica" : "Comportamental"}
                  {" — "}
                  {idioma}
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Pergunta {totalRespostas + 1} de 5
                </p>
              </div>
              <div className="w-32 bg-gray-800 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${(totalRespostas / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {mensagens.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-5 py-3 ${
                      msg.role === "user"
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-900 border border-gray-700 text-gray-200"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <p className="text-xs text-gray-500 mb-1">
                        Entrevistador
                      </p>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3">
                    <p className="text-xs text-gray-500 mb-1">Entrevistador</p>
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900">
              {erro && (
                <div className="mb-3 bg-red-500/10 border border-red-800 rounded-xl p-3 text-sm text-red-300 flex gap-2.5">
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
                  placeholder={
                    idioma === "PT"
                      ? "Digite sua resposta..."
                      : "Type your answer..."
                  }
                  rows={2}
                  disabled={loading}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition resize-none text-sm"
                />
                <button
                  onClick={enviarResposta}
                  disabled={!inputUsuario.trim() || loading}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-5 rounded-xl transition font-semibold"
                >
                  Enviar
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-2">
                Enter para enviar • Shift+Enter para nova linha
              </p>
            </div>
          </div>
        )}

        {/* FEEDBACK */}
        {etapa === "feedback" && feedback && (
          <div className="p-8 max-w-3xl overflow-y-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <BarChart3 size={24} className="text-cyan-400" />
                Feedback da Entrevista
              </h2>
              <p className="text-gray-400 mt-1">
                Entrevista {tipo} em {idioma === "PT" ? "Português" : "Inglês"}
              </p>
            </div>

            {/* Score */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 text-center">
              <div className="text-6xl font-black text-cyan-400 mb-2">
                {feedback.score}
              </div>
              <div className="text-gray-400 text-sm mb-2">
                Score Geral / 100
              </div>
              <div className="inline-block bg-cyan-600/20 border border-cyan-500 text-cyan-300 px-4 py-1 rounded-full text-sm font-medium capitalize">
                Nível: {feedback.nivel}
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                Avaliação Geral
              </h3>
              <p className="text-gray-300 leading-relaxed">{feedback.resumo}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900 border border-green-800 rounded-2xl p-6">
                <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Pontos Fortes
                </h3>
                <ul className="space-y-2">
                  {feedback.pontos_fortes?.map((p: string, i: number) => (
                    <li key={i} className="text-gray-300 text-sm flex gap-2">
                      <span className="text-green-400">▸</span> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-900 border border-red-800 rounded-2xl p-6">
                <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Pontos a Melhorar
                </h3>
                <ul className="space-y-2">
                  {feedback.pontos_melhoria?.map((p: string, i: number) => (
                    <li key={i} className="text-gray-300 text-sm flex gap-2">
                      <span className="text-red-400">▸</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Dicas */}
            <div className="bg-gray-900 border border-cyan-800 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-cyan-400 mb-3 flex items-center gap-2">
                <Lightbulb size={16} />
                Dicas para Próximas Entrevistas
              </h3>
              <ul className="space-y-2">
                {feedback.dicas?.map((d: string, i: number) => (
                  <li key={i} className="text-gray-300 text-sm flex gap-2">
                    <span className="text-cyan-400 font-bold">{i + 1}.</span>{" "}
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={reiniciar}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Nova entrevista
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
