import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthWeakPasswordError,
} from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  MENSAGEM_GENERICA,
  mensagemDeErro,
  mensagemErroAuth,
} from "@/lib/mensagensErro";

// Erros montados com as classes reais do supabase-js, com os textos que o
// servidor de Auth devolve em inglês.

describe("mensagemErroAuth", () => {
  it.each([
    [
      "e-mail já cadastrado",
      new AuthApiError("User already registered", 422, "user_already_exists"),
      /Já existe uma conta com este e-mail/,
    ],
    [
      "e-mail já cadastrado (código email_exists)",
      new AuthApiError("Email address already exists", 422, "email_exists"),
      /Já existe uma conta com este e-mail/,
    ],
    [
      "senha fraca",
      new AuthWeakPasswordError("Password should be at least 6 characters.", 422, ["length"]),
      /Senha fraca/,
    ],
    [
      "senha vazada",
      new AuthWeakPasswordError("Password is known to be weak", 422, ["pwned"]),
      /vazamentos/,
    ],
    [
      "e-mail não confirmado",
      new AuthApiError("Email not confirmed", 400, "email_not_confirmed"),
      /e-mail ainda não foi confirmado/,
    ],
    [
      "limite de requisições",
      new AuthApiError("Request rate limit reached", 429, "over_request_rate_limit"),
      /Muitas tentativas/,
    ],
    [
      "limite de envio de e-mails",
      new AuthApiError("Email rate limit exceeded", 429, "over_email_send_rate_limit"),
      /Muitas tentativas/,
    ],
    [
      "HTTP 429 sem código",
      new AuthApiError("Too Many Requests", 429, undefined),
      /Muitas tentativas/,
    ],
    [
      "falha de rede",
      new AuthRetryableFetchError("Failed to fetch", 0),
      /Não foi possível conectar ao servidor/,
    ],
    [
      "servidor de Auth fora do ar",
      new AuthRetryableFetchError("Service Unavailable", 503),
      /Não foi possível conectar ao servidor/,
    ],
    [
      "login inválido",
      new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
      /E-mail ou senha incorretos/,
    ],
    [
      "senha igual à atual",
      new AuthApiError(
        "New password should be different from the old password.",
        422,
        "same_password",
      ),
      /diferente da senha atual/,
    ],
    ["sessão ausente", new AuthSessionMissingError(), /sessão expirou/],
  ])("traduz %s", (_, erro, esperado) => {
    expect(mensagemErroAuth(erro)).toMatch(esperado);
  });

  it.each([
    ["User already registered", /Já existe uma conta/],
    ["Password should be at least 6 characters", /Senha fraca/],
    ["Email not confirmed", /não foi confirmado/],
    ["For security purposes, you can only request this after 42 seconds.", /Muitas tentativas/],
  ])("traduz pela mensagem quando não há código: %s", (mensagem, esperado) => {
    expect(mensagemErroAuth(new AuthApiError(mensagem, 400, undefined))).toMatch(esperado);
  });

  it.each([
    new AuthApiError("Database error saving new user", 500, "unexpected_failure"),
    new AuthApiError("Something new and unexpected", 400, undefined),
    new Error("boom"),
    null,
    "texto",
  ])("usa o texto genérico em português para erro desconhecido (%#)", (erro) => {
    expect(mensagemErroAuth(erro)).toBe(MENSAGEM_GENERICA);
  });
});

describe("mensagemDeErro", () => {
  it("mantém a mensagem em português devolvida pelas rotas", () => {
    expect(mensagemDeErro(new Error("Informe a URL da vaga."))).toBe(
      "Informe a URL da vaga.",
    );
  });

  it.each([
    "Failed to fetch",
    "Load failed",
    "NetworkError when attempting to fetch resource.",
  ])("traduz falha de rede do navegador: %s", (mensagem) => {
    expect(mensagemDeErro(new TypeError(mensagem))).toMatch(
      /Não foi possível conectar ao servidor/,
    );
  });

  it("não mostra erro interno do JavaScript em inglês", () => {
    expect(
      mensagemDeErro(new TypeError("Cannot read properties of undefined (reading 'map')")),
    ).toBe(MENSAGEM_GENERICA);
    expect(mensagemDeErro(new SyntaxError("Unexpected token <"), "Falhou.")).toBe("Falhou.");
  });

  it("usa o padrão quando não é Error", () => {
    expect(mensagemDeErro("x", "Erro inesperado.")).toBe("Erro inesperado.");
  });
});
