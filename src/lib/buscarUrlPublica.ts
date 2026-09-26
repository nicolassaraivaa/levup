import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";

// Faixas que nunca podem ser acessadas a partir do servidor: loopback, redes
// privadas, link-local (inclui o endpoint de metadados da nuvem
// 169.254.169.254), CGNAT, multicast e reservados.
const FAIXAS_BLOQUEADAS = new net.BlockList();
for (const [rede, prefixo] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  FAIXAS_BLOQUEADAS.addSubnet(rede, prefixo, "ipv4");
}
for (const [rede, prefixo] of [
  ["::", 128],
  ["::1", 128],
  // IPv4 mapeado em IPv6 (::ffff:127.0.0.1) não precisa de regra própria: o
  // BlockList já aplica as faixas IPv4 acima a esses endereços.
  ["64:ff9b::", 96], // NAT64
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  FAIXAS_BLOQUEADAS.addSubnet(rede, prefixo, "ipv6");
}

export function ipBloqueado(ip: string): boolean {
  const familia = net.isIP(ip);
  if (familia === 0) return true;
  return FAIXAS_BLOQUEADAS.check(ip, familia === 4 ? "ipv4" : "ipv6");
}

export class ErroUrl extends Error {}

const MAX_REDIRECIONAMENTOS = 5;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;

// Valida o IP no momento da conexão (não só antes), o que impede que um DNS
// que muda de resposta entre a checagem e o fetch (DNS rebinding) passe.
const lookupSeguro: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, enderecos) => {
    if (err) return callback(err, "", 0);
    const lista = enderecos as dns.LookupAddress[];
    if (lista.length === 0 || lista.some((e) => ipBloqueado(e.address))) {
      return callback(new ErroUrl("URL inválida."), "", 0);
    }
    if (options.all) {
      (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(
        null,
        lista,
      );
    } else {
      callback(null, lista[0].address, lista[0].family);
    }
  });
};

function validarUrl(bruta: string | URL): URL {
  let url: URL;
  try {
    url = new URL(bruta);
  } catch {
    throw new ErroUrl("URL inválida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ErroUrl("URL inválida.");
  }
  if (url.username || url.password) {
    throw new ErroUrl("URL inválida.");
  }
  // Hostname que já é um IP não passa pelo lookup, então checa aqui.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && ipBloqueado(host)) {
    throw new ErroUrl("URL inválida.");
  }
  return url;
}

function descompactar(res: http.IncomingMessage): Readable {
  switch (res.headers["content-encoding"]) {
    case "gzip":
      return res.pipe(zlib.createGunzip());
    case "deflate":
      return res.pipe(zlib.createInflate());
    case "br":
      return res.pipe(zlib.createBrotliDecompress());
    default:
      return res;
  }
}

function requisitar(
  url: URL,
  signal: AbortSignal,
): Promise<{ status: number; location?: string; corpo?: string }> {
  return new Promise((resolve, reject) => {
    const cliente = url.protocol === "https:" ? https : http;
    const req = cliente.get(
      url,
      {
        lookup: lookupSeguro,
        signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LevUpBot/1.0; +https://levup.app)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location });
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status });
        }

        const partes: Buffer[] = [];
        let total = 0;
        const corpo = descompactar(res);
        corpo.on("data", (parte: Buffer) => {
          total += parte.length;
          if (total > MAX_BYTES) {
            // Página grande demais: fica com o que já chegou.
            partes.push(parte.subarray(0, parte.length - (total - MAX_BYTES)));
            res.destroy();
            corpo.destroy();
            return resolve({
              status,
              corpo: Buffer.concat(partes).toString("utf8"),
            });
          }
          partes.push(parte);
        });
        corpo.on("end", () =>
          resolve({ status, corpo: Buffer.concat(partes).toString("utf8") }),
        );
        corpo.on("error", reject);
      },
    );
    req.on("error", reject);
  });
}

/**
 * Baixa o HTML de uma URL pública informada pelo usuário. Recusa endereços
 * internos (inclusive via redirecionamento), limita o tamanho da resposta e
 * o tempo total da operação.
 */
export async function buscarUrlPublica(urlInformada: string): Promise<string> {
  let url = validarUrl(urlInformada);
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  for (let saltos = 0; saltos <= MAX_REDIRECIONAMENTOS; saltos++) {
    let resposta;
    try {
      resposta = await requisitar(url, signal);
    } catch (err) {
      if (err instanceof ErroUrl) throw err;
      throw new ErroUrl("Não foi possível acessar essa URL.");
    }

    if (resposta.corpo !== undefined) return resposta.corpo;
    if (resposta.location) {
      url = validarUrl(new URL(resposta.location, url));
      continue;
    }
    throw new ErroUrl("Não foi possível acessar essa URL.");
  }

  throw new ErroUrl("Essa URL redireciona vezes demais.");
}
