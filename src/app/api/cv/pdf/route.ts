import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CurriculoDocument } from "@/lib/pdf/CurriculoDocument";
import type { CurriculoGerado } from "@/lib/types";
import { exigirUsuario } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { erro } = await exigirUsuario();
  if (erro) return erro;

  try {
    const { curriculo } = (await req.json()) as { curriculo: CurriculoGerado };
    if (!curriculo?.nome) {
      return NextResponse.json({ error: "Currículo inválido." }, { status: 400 });
    }

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
