import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CurriculoDocument } from "@/lib/pdf/CurriculoDocument";
import { exigirUsuario } from "@/lib/auth";
import { lerCorpo, validarEntradaPdf } from "@/lib/validacaoEntrada";

export async function POST(req: NextRequest) {
  const { erro } = await exigirUsuario("cv_pdf");
  if (erro) return erro;

  // Também completa as listas de registros antigos do histórico.
  const entrada = validarEntradaPdf(await lerCorpo(req));
  if (!entrada.ok) {
    return NextResponse.json({ error: entrada.erro }, { status: 400 });
  }
  const curriculo = entrada.dados;

  try {
    const buffer = await renderToBuffer(CurriculoDocument({ curriculo }));
    const nomeArquivo = curriculo.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="curriculo-${nomeArquivo || "levup"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF do currículo:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o PDF." },
      { status: 500 },
    );
  }
}
