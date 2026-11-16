import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it, vi } from "vitest";
import { CurriculoDocument } from "@/lib/pdf/CurriculoDocument";
import type { CurriculoGerado } from "@/lib/types";

// RNF06: o PDF do currículo tem de ter texto de verdade (selecionável e
// legível por ATS), não uma imagem. A prova é extrair o texto do PDF gerado
// e encontrar nele cada informação do currículo, na ordem de leitura.

vi.mock("@/lib/auth", () => ({
  exigirUsuario: async () => ({ user: { id: "usuario-teste" }, erro: null }),
}));

const curriculo: CurriculoGerado = {
  nome: "Ana Conceição Souza",
  titulo: "Desenvolvedora Frontend Jr. | React & TypeScript",
  contato: {
    email: "ana.souza@exemplo.com",
    telefone: "(11) 98888-7777",
    localizacao: "São Paulo, SP",
    linkedin: "linkedin.com/in/anasouza",
    github: "github.com/anasouza",
  },
  resumo:
    "Estudante de Ciência da Computação com projetos em React e Node.js, focada em acessibilidade e performance.",
  experiencias: [
    {
      cargo: "Estagiária de Desenvolvimento",
      empresa: "Loja Exemplo",
      periodo: "2025 - atual",
      bullets: [
        "Reduzi o tempo de carregamento da vitrine em 30%",
        "Criei testes automatizados para o checkout",
      ],
    },
  ],
  formacao: [
    {
      curso: "Bacharelado em Ciência da Computação",
      instituicao: "Universidade Cruzeiro do Sul",
      periodo: "2023 - 2026",
    },
  ],
  habilidades: ["React", "TypeScript", "Node.js", "PostgreSQL"],
  idiomas: [{ idioma: "Inglês", nivel: "intermediário" }],
  palavras_chave_alinhadas: [],
};

async function textoDoPdf(pdf: Uint8Array) {
  const documento = await getDocumentProxy(pdf);
  const { text, totalPages } = await extractText(documento, { mergePages: true });
  return { texto: text.replace(/\s+/g, " "), paginas: totalPages };
}

describe("CurriculoDocument", () => {
  it("gera um PDF cujo texto pode ser extraído, com acentos e na ordem do currículo", async () => {
    const buffer = await renderToBuffer(CurriculoDocument({ curriculo }));
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");

    const { texto, paginas } = await textoDoPdf(new Uint8Array(buffer));
    expect(paginas).toBe(1);

    const trechos = [
      curriculo.nome,
      curriculo.titulo,
      curriculo.contato.email,
      curriculo.contato.telefone,
      curriculo.contato.localizacao,
      curriculo.contato.linkedin,
      curriculo.contato.github,
      curriculo.resumo,
      "EXPERIÊNCIA",
      "Estagiária de Desenvolvimento",
      "Loja Exemplo",
      "2025 - atual",
      ...curriculo.experiencias[0].bullets,
      "FORMAÇÃO",
      "Bacharelado em Ciência da Computação",
      "Universidade Cruzeiro do Sul",
      "HABILIDADES",
      ...curriculo.habilidades,
      "IDIOMAS",
      "Inglês — intermediário",
    ];

    let posicaoAnterior = -1;
    for (const trecho of trechos) {
      const posicao = texto.indexOf(trecho, posicaoAnterior + 1);
      expect(posicao, `"${trecho}" não está no texto do PDF (ou fora de ordem)`).toBeGreaterThan(
        posicaoAnterior,
      );
      posicaoAnterior = posicao;
    }
  });
});

describe("POST /api/cv/pdf", () => {
  it("devolve PDF com texto extraível mesmo para currículo antigo sem as listas", async () => {
    const { POST } = await import("@/app/api/cv/pdf/route");
    const antigo = {
      nome: "Ana Conceição Souza",
      resumo: "Currículo salvo antes da validação.",
      contato: { email: "ana.souza@exemplo.com" },
    };

    const res = await POST(
      new NextRequest("http://localhost/api/cv/pdf", {
        method: "POST",
        body: JSON.stringify({ curriculo: antigo }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain(
      "curriculo-ana-conceicao-souza.pdf",
    );
    const { texto } = await textoDoPdf(new Uint8Array(await res.arrayBuffer()));
    expect(texto).toContain("Ana Conceição Souza");
    expect(texto).toContain("Currículo salvo antes da validação.");
  });

  it("recusa currículo sem nome", async () => {
    const { POST } = await import("@/app/api/cv/pdf/route");

    const res = await POST(
      new NextRequest("http://localhost/api/cv/pdf", {
        method: "POST",
        body: JSON.stringify({ curriculo: { resumo: "x" } }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
  });
});
