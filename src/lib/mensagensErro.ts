// Mensagens de erro exibidas ao usuário, sempre em português do Brasil.
// O Supabase Auth e o navegador devolvem textos em inglês ("User already
// registered", "Failed to fetch"...), que nunca devem chegar à tela.

export const MENSAGEM_GENERICA =
  "Não foi possível concluir a operação. Tente novamente em instantes.";

const MENSAGEM_REDE =
  "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.";
const MENSAGEM_JA_CADASTRADO =
  "Já existe uma conta com este e-mail. Entre com sua senha ou use outro e-mail.";
const MENSAGEM_SENHA_FRACA =
  "Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.";
const MENSAGEM_SENHA_VAZADA =
  "Essa senha já apareceu em vazamentos de dados conhecidos. Escolha outra.";
const MENSAGEM_NAO_CONFIRMADO =
  "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para sua caixa de entrada.";
const MENSAGEM_LIMITE =
  "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
const MENSAGEM_CREDENCIAIS = "E-mail ou senha incorretos.";
const MENSAGEM_SESSAO = "Sua sessão expirou. Entre de novo para continuar.";

const POR_CODIGO: Record<string, string> = {
  user_already_exists: MENSAGEM_JA_CADASTRADO,
  email_exists: MENSAGEM_JA_CADASTRADO,
  weak_password: MENSAGEM_SENHA_FRACA,
  email_not_confirmed: MENSAGEM_NAO_CONFIRMADO,
  over_request_rate_limit: MENSAGEM_LIMITE,
  over_email_send_rate_limit: MENSAGEM_LIMITE,
  invalid_credentials: MENSAGEM_CREDENCIAIS,
  same_password: "A nova senha precisa ser diferente da senha atual.",
  email_address_invalid: "E-mail inválido. Confira o endereço digitado.",
  email_address_not_authorized:
    "Não foi possível enviar o e-mail de confirmação para esse endereço.",
  signup_disabled: "Novos cadastros estão desativados no momento.",
  session_not_found: MENSAGEM_SESSAO,
  session_expired: MENSAGEM_SESSAO,
  reauthentication_needed:
    "Por segurança, saia e entre de novo antes de alterar a senha.",
  request_timeout: MENSAGEM_REDE,
};

// Para erros sem `code` (versões antigas do servidor de Auth).
const POR_MENSAGEM: [RegExp, string][] = [
  [/already (registered|exists)/i, MENSAGEM_JA_CADASTRADO],
  [/password should|weak password/i, MENSAGEM_SENHA_FRACA],
  [/email not confirmed/i, MENSAGEM_NAO_CONFIRMADO],
  [/rate limit|too many requests|only request this after/i, MENSAGEM_LIMITE],
  [/invalid login credentials/i, MENSAGEM_CREDENCIAIS],
  [/auth session missing/i, MENSAGEM_SESSAO],
];

// Textos de falha de rede do fetch: Chrome, Safari, Firefox e Node.
const REDE = /failed to fetch|load failed|networkerror|network request failed|fetch failed/i;

interface ErroAuth {
  code?: unknown;
  name?: unknown;
  status?: unknown;
  message?: unknown;
  reasons?: unknown;
}

/** Traduz um erro do Supabase Auth (signUp, signIn, updateUser...). */
export function mensagemErroAuth(erro: unknown): string {
  if (!erro || typeof erro !== "object") return MENSAGEM_GENERICA;
  const { code, name, status, message, reasons } = erro as ErroAuth;
  const texto = typeof message === "string" ? message : "";

  if (name === "AuthRetryableFetchError" || status === 0 || REDE.test(texto)) {
    return MENSAGEM_REDE;
  }
  if (status === 429) return MENSAGEM_LIMITE;
  if (code === "weak_password" && Array.isArray(reasons) && reasons.includes("pwned")) {
    return MENSAGEM_SENHA_VAZADA;
  }
  if (typeof code === "string" && code in POR_CODIGO) return POR_CODIGO[code];
  if (name === "AuthSessionMissingError") return MENSAGEM_SESSAO;

  for (const [padrao, mensagem] of POR_MENSAGEM) {
    if (padrao.test(texto)) return mensagem;
  }
  return MENSAGEM_GENERICA;
}

/**
 * Mensagem para os `catch` das telas. Erros lançados pelo próprio app já vêm
 * em português (texto devolvido pelas rotas de API); falha de rede do fetch e
 * erros inesperados do JavaScript, que vêm em inglês, viram texto em português.
 */
export function mensagemDeErro(err: unknown, padrao = MENSAGEM_GENERICA): string {
  if (!(err instanceof Error)) return padrao;
  if (REDE.test(err.message)) return MENSAGEM_REDE;
  if (err instanceof TypeError || err instanceof SyntaxError) return padrao;
  return err.message || padrao;
}
