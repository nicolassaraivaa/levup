import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, rpc }),
}));

import { exigirUsuario } from "@/lib/auth";

const USUARIO = { id: "usuario-teste" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: USUARIO }, error: null });
  rpc.mockResolvedValue({ data: true, error: null });
});

describe("exigirUsuario", () => {
  it("sem sessão responde 401 sem consultar o limite", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { user, erro } = await exigirUsuario("cv");

    expect(user).toBeNull();
    expect(erro?.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("com sessão e cota disponível libera e registra o uso da rota", async () => {
    const { user, erro } = await exigirUsuario("diagnostico");

    expect(erro).toBeNull();
    expect(user).toEqual(USUARIO);
    expect(rpc).toHaveBeenCalledWith("registrar_uso_api", { p_rota: "diagnostico" });
  });

  it("com a cota esgotada responde 429 em português", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    const { erro } = await exigirUsuario("auditoria");

    expect(erro?.status).toBe(429);
    expect((await erro!.json()).error).toMatch(/limite de uso desta ferramenta/);
  });

  it("se o limite não puder ser consultado, recusa com 503 em vez de liberar", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    });

    const { user, erro } = await exigirUsuario("cursos");

    expect(user).toBeNull();
    expect(erro?.status).toBe(503);
    expect((await erro!.json()).error).toMatch(/Serviço indisponível/);
    expect(console.error).toHaveBeenCalled();
  });
});
