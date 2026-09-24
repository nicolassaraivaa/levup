import Link from "next/link";
import { ArrowLeft, Target, Mic, SearchCheck, FileText } from "lucide-react";
import type { ReactNode } from "react";

const STAGES = [
  {
    index: "01",
    tag: "diagnóstico",
    title: "Descubra seus gaps técnicos",
    icon: Target,
  },
  {
    index: "02",
    tag: "treino",
    title: "Pratique entrevistas com IA",
    icon: Mic,
  },
  {
    index: "03",
    tag: "auditoria",
    title: "Audite LinkedIn, GitHub e CV",
    icon: SearchCheck,
  },
  {
    index: "04",
    tag: "build final",
    title: "Gere um CV otimizado pra vaga",
    icon: FileText,
  },
] as const;

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-ink lg:grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <Link
          href="/"
          className="mb-10 inline-flex w-fit items-center gap-2 text-sm font-medium text-ink-faint transition hover:text-ink"
        >
          <ArrowLeft size={14} />
          LevUp
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-hairline bg-surface lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--hairline-strong) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
            levup / pipeline
          </span>
          <h2 className="mt-4 max-w-sm text-2xl font-semibold leading-snug text-ink">
            Quatro etapas até você estar pronto pra ir a mercado.
          </h2>

          <div className="mt-10 space-y-6">
            {STAGES.map(({ index, tag, title, icon: Icon }) => (
              <div key={index} className="flex items-center gap-4">
                <span className="font-mono text-sm text-ink-faint">
                  {index}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline-strong text-brass">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="text-sm leading-tight">
                  <span className="mr-2 font-mono text-[0.65rem] uppercase tracking-wide text-ink-faint">
                    {tag}
                  </span>
                  <span className="text-ink-muted">{title}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
