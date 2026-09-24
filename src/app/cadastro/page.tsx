"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import AuthShell from "@/components/AuthShell";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError("Erro ao criar conta: " + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        name,
        email,
      });
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell>
      <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
        primeiro commit
      </span>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        Crie sua conta
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Leva menos de um minuto. Sem cartão de crédito.
      </p>

      <form onSubmit={handleCadastro} className="mt-8 space-y-4">
        <div>
          <label className="text-sm text-ink-muted mb-1.5 block">
            Nome completo
          </label>
          <div className="relative">
            <User
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
              className="w-full bg-surface border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-ink-muted mb-1.5 block">Email</label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full bg-surface border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-ink-muted mb-1.5 block">Senha</label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-surface border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-rust/30 bg-rust-wash px-3.5 py-2.5 text-sm text-rust">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-brass py-3 text-sm font-semibold text-background transition hover:bg-brass-strong disabled:opacity-50"
        >
          {loading ? "Criando conta..." : "Criar conta"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="mt-8 border-t border-hairline pt-6 text-sm text-ink-faint">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brass hover:text-brass-strong">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
