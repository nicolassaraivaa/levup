"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import {
  Settings,
  User,
  Lock,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nome, setNome] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState("");
  const [sucessoPerfil, setSucessoPerfil] = useState(false);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");
  const [sucessoSenha, setSucessoSenha] = useState(false);

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
      if (data) {
        setNome(data.name || "");
      }
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoPerfil(true);
    setErroPerfil("");
    setSucessoPerfil(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ name: nome })
      .eq("id", user.id);

    if (error) {
      setErroPerfil("Não foi possível salvar. Tente novamente.");
    } else {
      setProfile((p) => (p ? { ...p, name: nome } : p));
      setSucessoPerfil(true);
      setTimeout(() => setSucessoPerfil(false), 3000);
    }
    setSalvandoPerfil(false);
  }

  async function alterarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroSenha("");
    setSucessoSenha(false);

    if (novaSenha.length < 6) {
      setErroSenha("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha("As senhas não coincidem.");
      return;
    }

    setSalvandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      setErroSenha(error.message || "Não foi possível alterar a senha.");
    } else {
      setSucessoSenha(true);
      setNovaSenha("");
      setConfirmarSenha("");
      setTimeout(() => setSucessoSenha(false), 3000);
    }
    setSalvandoSenha(false);
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      <Sidebar active="/configuracoes" profile={profile} />

      <div className="pt-20 px-4 pb-8 md:ml-64 md:pt-8 md:px-8 max-w-xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
            <Settings size={24} className="text-brass" />
            Configurações
          </h2>
          <p className="text-ink-muted mt-2">
            Edite seus dados de perfil e altere sua senha.
          </p>
        </div>

        {/* Perfil */}
        <form
          onSubmit={salvarPerfil}
          className="bg-surface border border-hairline rounded-2xl p-6 space-y-5"
        >
          <h3 className="font-bold text-ink">Perfil</h3>

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
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-surface-raised border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-ink-muted mb-1.5 block">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className="w-full bg-surface-raised border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-sm text-ink-faint cursor-not-allowed"
              />
            </div>
            <p className="text-ink-faint text-xs mt-1.5">
              O email não pode ser alterado por aqui.
            </p>
          </div>

          {erroPerfil && (
            <div className="flex items-center gap-2 rounded-md border border-rust/30 bg-rust-wash px-3.5 py-2.5 text-sm text-rust">
              <AlertCircle size={15} className="shrink-0" />
              {erroPerfil}
            </div>
          )}
          {sucessoPerfil && (
            <div className="flex items-center gap-2 rounded-md border border-sage/30 bg-sage-wash px-3.5 py-2.5 text-sm text-sage">
              <CheckCircle2 size={15} className="shrink-0" />
              Perfil atualizado com sucesso.
            </div>
          )}

          <button
            type="submit"
            disabled={salvandoPerfil}
            className="flex items-center justify-center gap-2 rounded-md bg-brass px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-brass-strong disabled:opacity-50"
          >
            {salvandoPerfil && <Loader2 size={15} className="animate-spin" />}
            {salvandoPerfil ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>

        {/* Senha */}
        <form
          onSubmit={alterarSenha}
          className="bg-surface border border-hairline rounded-2xl p-6 space-y-5 mt-6"
        >
          <h3 className="font-bold text-ink">Alterar senha</h3>

          <div>
            <label className="text-sm text-ink-muted mb-1.5 block">
              Nova senha
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-surface-raised border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-ink-muted mb-1.5 block">
              Confirmar nova senha
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-surface-raised border border-hairline-strong rounded-md pl-10 pr-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-brass transition"
              />
            </div>
          </div>

          {erroSenha && (
            <div className="flex items-center gap-2 rounded-md border border-rust/30 bg-rust-wash px-3.5 py-2.5 text-sm text-rust">
              <AlertCircle size={15} className="shrink-0" />
              {erroSenha}
            </div>
          )}
          {sucessoSenha && (
            <div className="flex items-center gap-2 rounded-md border border-sage/30 bg-sage-wash px-3.5 py-2.5 text-sm text-sage">
              <CheckCircle2 size={15} className="shrink-0" />
              Senha alterada com sucesso.
            </div>
          )}

          <button
            type="submit"
            disabled={salvandoSenha}
            className="flex items-center justify-center gap-2 rounded-md bg-surface-raised border border-hairline-strong px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-hairline-strong disabled:opacity-50"
          >
            {salvandoSenha && <Loader2 size={15} className="animate-spin" />}
            {salvandoSenha ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
