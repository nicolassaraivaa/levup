import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Nomes usados por registrar_uso_api (migração 20261116000000_limite_uso_api). */
export type RotaLimitada =
  | "diagnostico"
  | "entrevistas"
  | "auditoria"
  | "cv"
  | "cv_pdf"
  | "cursos";

/**
 * Garante que a requisição vem de um usuário logado e que ele ainda tem cota
 * de uso nessa rota. O proxy só protege as páginas, então toda rota de /api
 * precisa chamar isso antes de gastar créditos da Anthropic ou qualquer
 * outro recurso.
 */
export async function exigirUsuario(
  rota: RotaLimitada,
): Promise<{ user: User; erro: null } | { user: null; erro: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      erro: NextResponse.json({ error: "Não autenticado." }, { status: 401 }),
    };
  }

  const { data: liberado, error } = await supabase.rpc("registrar_uso_api", {
    p_rota: rota,
  });
  if (error) {
    // Sem o limite não há proteção de custo: melhor recusar do que liberar.
    console.error(
      "Limite de uso indisponível. A migração 20261116000000_limite_uso_api foi aplicada?",
      error,
    );
    return {
      user: null,
      erro: NextResponse.json(
        { error: "Serviço indisponível no momento. Tente novamente em instantes." },
        { status: 503 },
      ),
    };
  }
  if (liberado !== true) {
    return {
      user: null,
      erro: NextResponse.json(
        {
          error:
            "Você atingiu o limite de uso desta ferramenta por hora. Tente de novo mais tarde.",
        },
        { status: 429 },
      ),
    };
  }

  return { user, erro: null };
}
