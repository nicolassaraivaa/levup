import { EventEmitter } from "node:events";
import net from "node:net";
import { PassThrough } from "node:stream";
import zlib from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Testes de buscarUrlPublica sem acesso à rede: node:dns, node:http e
// node:https são substituídos por fakes. O fake de get() resolve o host com o
// `lookup` recebido nas opções, como o socket real faz antes de conectar, então
// o lookupSeguro do módulo é exercitado de verdade.

type Rota =
  | { status: 301 | 302 | 307; location: string }
  | { status: 200; partes: Buffer[]; headers?: Record<string, string> };

const falso = vi.hoisted(() => ({
  dns: new Map<string, string[]>(),
  rotas: new Map<string, unknown>(),
  conexoes: [] as string[],
  respostas: [] as { destroyed: boolean; partesEscritas: number }[],
}));

vi.mock("node:dns", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:dns")>();
  const lookup = (
    hostname: string,
    _opcoes: object,
    callback: (err: Error | null, enderecos?: { address: string; family: number }[]) => void,
  ) => {
    const ips = falso.dns.get(hostname);
    if (!ips) return callback(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));
    callback(null, ips.map((address) => ({ address, family: net.isIP(address) })));
  };
  return { ...real, default: { ...real, lookup }, lookup };
});

function getFalso(
  url: URL,
  opcoes: { lookup?: net.LookupFunction },
  callback: (res: PassThrough) => void,
) {
  const req = new EventEmitter();
  const conectar = () => {
    falso.conexoes.push(url.href);
    const rota = falso.rotas.get(url.href) as Rota | undefined;
    if (!rota) throw new Error(`rota não configurada no teste: ${url.href}`);
    const res = Object.assign(new PassThrough(), {
      statusCode: rota.status,
      headers: {} as Record<string, string>,
    });
    if (rota.status !== 200) {
      res.headers.location = rota.location;
      callback(res);
      res.end();
      return;
    }
    Object.assign(res.headers, rota.headers);
    const estado = { destroyed: false, partesEscritas: 0 };
    falso.respostas.push(estado);
    callback(res);
    const escrever = () => {
      if (res.destroyed) {
        estado.destroyed = true;
        return;
      }
      if (estado.partesEscritas === rota.partes.length) return res.end();
      res.write(rota.partes[estado.partesEscritas++]);
      setImmediate(escrever);
    };
    setImmediate(escrever);
  };

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    process.nextTick(conectar);
  } else {
    if (!opcoes.lookup) throw new Error("get() chamado sem lookup seguro");
    opcoes.lookup(host, {}, (err) => {
      if (err) req.emit("error", err);
      else conectar();
    });
  }
  return req;
}

vi.mock("node:http", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:http")>();
  return { ...real, default: { ...real, get: getFalso }, get: getFalso };
});
vi.mock("node:https", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:https")>();
  return { ...real, default: { ...real, get: getFalso }, get: getFalso };
});

import { buscarUrlPublica } from "@/lib/buscarUrlPublica";

const IP_PUBLICO = "93.184.216.34";
const MB = 1024 * 1024;

function pagina(html: string): Rota {
  return { status: 200, partes: [Buffer.from(html)] };
}

beforeEach(() => {
  falso.dns.clear();
  falso.rotas.clear();
  falso.conexoes.length = 0;
  falso.respostas.length = 0;
  falso.dns.set("vagas.exemplo.com", [IP_PUBLICO]);
});

describe("buscarUrlPublica com rede simulada", () => {
  it("baixa o HTML de uma URL pública", async () => {
    falso.rotas.set("https://vagas.exemplo.com/1", pagina("<h1>Vaga</h1>"));

    await expect(buscarUrlPublica("https://vagas.exemplo.com/1")).resolves.toBe(
      "<h1>Vaga</h1>",
    );
  });

  describe("redirecionamento para endereço interno", () => {
    it.each([
      ["IP de metadados da nuvem", "http://169.254.169.254/latest/meta-data/"],
      ["loopback", "http://127.0.0.1:8080/admin"],
      ["URL relativa ao protocolo", "//10.0.0.1/"],
      ["IPv4 mapeado em IPv6", "http://[::ffff:192.168.0.1]/"],
      ["esquema file:", "file:///etc/passwd"],
    ])("recusa redirecionamento para %s sem conectar nele", async (_, location) => {
      falso.rotas.set("https://vagas.exemplo.com/1", { status: 302, location });

      await expect(buscarUrlPublica("https://vagas.exemplo.com/1")).rejects.toThrow(
        "URL inválida.",
      );
      expect(falso.conexoes).toEqual(["https://vagas.exemplo.com/1"]);
    });

    it("recusa redirecionamento para domínio que resolve para IP privado", async () => {
      falso.dns.set("intranet.exemplo.com", ["10.0.0.5"]);
      falso.rotas.set("https://vagas.exemplo.com/1", {
        status: 301,
        location: "http://intranet.exemplo.com/admin",
      });

      await expect(buscarUrlPublica("https://vagas.exemplo.com/1")).rejects.toThrow(
        "URL inválida.",
      );
      expect(falso.conexoes).toEqual(["https://vagas.exemplo.com/1"]);
    });

    it("recusa domínio que resolve para um IP público e um interno", async () => {
      falso.dns.set("misto.exemplo.com", [IP_PUBLICO, "127.0.0.1"]);
      falso.rotas.set("https://vagas.exemplo.com/1", {
        status: 307,
        location: "https://misto.exemplo.com/",
      });

      await expect(buscarUrlPublica("https://vagas.exemplo.com/1")).rejects.toThrow(
        "URL inválida.",
      );
      expect(falso.conexoes).toHaveLength(1);
    });
  });

  describe("limite de redirecionamentos", () => {
    function cadeia(saltos: number) {
      for (let i = 0; i < saltos; i++) {
        falso.rotas.set(`https://vagas.exemplo.com/${i}`, {
          status: 302,
          location: `/${i + 1}`,
        });
      }
      falso.rotas.set(`https://vagas.exemplo.com/${saltos}`, pagina("fim"));
    }

    it("segue até 5 redirecionamentos", async () => {
      cadeia(5);

      await expect(buscarUrlPublica("https://vagas.exemplo.com/0")).resolves.toBe("fim");
      expect(falso.conexoes).toHaveLength(6);
    });

    it("desiste no 6º redirecionamento, sem fazer a 7ª requisição", async () => {
      cadeia(6);

      await expect(buscarUrlPublica("https://vagas.exemplo.com/0")).rejects.toThrow(
        "Essa URL redireciona vezes demais.",
      );
      expect(falso.conexoes).toHaveLength(6);
      expect(falso.conexoes).not.toContain("https://vagas.exemplo.com/6");
    });

    it("desiste de redirecionamento em loop", async () => {
      falso.rotas.set("https://vagas.exemplo.com/loop", {
        status: 302,
        location: "/loop",
      });

      await expect(
        buscarUrlPublica("https://vagas.exemplo.com/loop"),
      ).rejects.toThrow("Essa URL redireciona vezes demais.");
      expect(falso.conexoes).toHaveLength(6);
    });
  });

  describe("limite de 2 MB na resposta", () => {
    it("corta a resposta em 2 MB e para de ler o resto", async () => {
      const partes = Array.from({ length: 6 }, () => Buffer.alloc(MB / 2, "a"));
      falso.rotas.set("https://vagas.exemplo.com/grande", { status: 200, partes });

      const corpo = await buscarUrlPublica("https://vagas.exemplo.com/grande");

      expect(Buffer.byteLength(corpo)).toBe(2 * MB);
      await vi.waitFor(() => expect(falso.respostas[0].destroyed).toBe(true));
      expect(falso.respostas[0].partesEscritas).toBeLessThan(partes.length);
    });

    it("aplica o limite ao conteúdo descompactado (gzip)", async () => {
      const compactado = zlib.gzipSync(Buffer.alloc(20 * MB, " "));
      expect(compactado.length).toBeLessThan(MB);
      falso.rotas.set("https://vagas.exemplo.com/gzip", {
        status: 200,
        partes: [compactado],
        headers: { "content-encoding": "gzip" },
      });

      const corpo = await buscarUrlPublica("https://vagas.exemplo.com/gzip");

      expect(Buffer.byteLength(corpo)).toBe(2 * MB);
    });

    it("devolve a resposta inteira quando ela cabe no limite", async () => {
      const partes = [Buffer.alloc(MB, "b"), Buffer.alloc(MB - 10, "c")];
      falso.rotas.set("https://vagas.exemplo.com/cabe", { status: 200, partes });

      const corpo = await buscarUrlPublica("https://vagas.exemplo.com/cabe");

      expect(Buffer.byteLength(corpo)).toBe(2 * MB - 10);
    });
  });
});
