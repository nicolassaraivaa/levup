import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Garante que a requisição vem de um usuário logado. O proxy só protege as
 * páginas, então toda rota de /api precisa chamar isso antes de gastar
 * créditos da Anthropic ou qualquer outro recurso.
 */
export async function exigirUsuario(): Promise<
  { user: User; erro: null } | { user: null; erro: NextResponse }
> {
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
  return { user, erro: null };
}
