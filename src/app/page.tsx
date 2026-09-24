import Link from "next/link";
import { ArrowRight, Target, Mic, SearchCheck, FileText } from "lucide-react";
import Logo from "@/components/Logo";

const PIPELINE = [
  {
    index: "01",
    tag: "diagnóstico",
    title: "Descubra seus gaps antes do recrutador",
    description:
      "Um quiz técnico adaptativo na sua área — frontend, backend, full stack, mobile ou dados — que aponta exatamente onde estudar antes de aplicar.",
    icon: Target,
    href: "/diagnostico",
  },
  {
    index: "02",
    tag: "treino",
    title: "Erre na simulação, não na entrevista real",
    description:
      "Entrevistas técnicas e comportamentais com um entrevistador de IA que cobra, questiona e dá feedback com score.",
    icon: Mic,
    href: "/entrevistas",
  },
  {
    index: "03",
    tag: "auditoria",
    title: "Revise o que já está publicado sobre você",
    description:
      "Envie seu perfil do LinkedIn — texto, print ou PDF — e receba uma auditoria completa com nota e recomendações direcionadas ao seu objetivo de carreira.",
    icon: SearchCheck,
    href: "/auditoria",
  },
  {
    index: "04",
    tag: "build final",
    title: "Gere a versão do currículo pronta pra vaga",
    description:
      "A partir da sua experiência real, um CV otimizado para ATS e ajustado à descrição da vaga que você está aplicando.",
    icon: FileText,
    href: "/cv",
  },
];

const DIFF_BEFORE = [
  "ansiedade antes de cada entrevista",
  "currículo genérico, igual ao de todo mundo",
  "perfil do LinkedIn parado desde a faculdade",
];

const DIFF_AFTER = [
  "diagnóstico claro dos gaps técnicos que faltam",
  "CV reescrito pra vaga específica que você quer",
  "entrevista treinada até o feedback parar de doer",
];

export default function Home() {
  return (
    <div className="flex-1 bg-background text-ink">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/login"
              className="text-ink-muted transition hover:text-ink"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-md border border-hairline-strong px-4 py-2 font-medium text-ink transition hover:border-brass hover:text-brass"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:px-10 sm:pt-24">
          <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.75rem]">
                Todo mundo testa em produção na primeira entrevista.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-ink-muted">
                O LevUp é o ambiente de staging da sua carreira: diagnostique
                gaps técnicos, treine entrevistas, audite seu perfil e gere um
                CV otimizado — antes de ir pra vaga de verdade.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/cadastro"
                  className="flex items-center gap-2 rounded-md bg-brass px-5 py-3 text-sm font-semibold text-background transition hover:bg-brass-strong"
                >
                  Criar minha conta
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium text-ink-muted transition hover:text-ink"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-hairline bg-surface">
              <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                <span className="font-mono text-xs text-ink-faint">
                  carreira.diff
                </span>
                <span className="rounded-full border border-hairline-strong px-2.5 py-0.5 font-mono text-[0.65rem] text-ink-faint">
                  4 mudanças
                </span>
              </div>
              <div className="space-y-1 px-5 py-5 font-mono text-[0.8rem] leading-7">
                {DIFF_BEFORE.map((line) => (
                  <p key={line} className="text-rust">
                    <span className="mr-2 select-none">−</span>
                    {line}
                  </p>
                ))}
                {DIFF_AFTER.map((line) => (
                  <p key={line} className="text-sage">
                    <span className="mr-2 select-none">+</span>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section className="border-t border-hairline bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
            <h2 className="max-w-md text-2xl font-semibold tracking-tight text-ink">
              Um pipeline, quatro etapas, até você estar pronto pra ir a
              mercado.
            </h2>

            <div className="mt-12 divide-y divide-hairline border-t border-hairline">
              {PIPELINE.map(
                ({ index, tag, title, description, icon: Icon, href }) => (
                  <Link
                    key={index}
                    href={href}
                    className="group grid grid-cols-[auto_1fr] items-start gap-5 py-8 sm:grid-cols-[3rem_auto_1fr_auto] sm:items-center sm:gap-8"
                  >
                    <span className="font-mono text-sm text-ink-faint">
                      {index}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-hairline-strong text-brass">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2.5">
                        <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                          {tag}
                        </span>
                        <span className="font-medium text-ink">{title}</span>
                      </span>
                      <span className="mt-1.5 block max-w-xl text-sm leading-relaxed text-ink-muted">
                        {description}
                      </span>
                    </span>
                    <ArrowRight
                      size={18}
                      className="hidden shrink-0 text-ink-faint transition group-hover:translate-x-1 group-hover:text-brass sm:block"
                    />
                  </Link>
                ),
              )}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-hairline">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Comece pelo diagnóstico. Leva menos de 5 minutos.
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Sem cartão, sem enrolação — só as perguntas certas.
              </p>
            </div>
            <Link
              href="/cadastro"
              className="flex shrink-0 items-center gap-2 rounded-md bg-brass px-5 py-3 text-sm font-semibold text-background transition hover:bg-brass-strong"
            >
              Criar minha conta
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-ink-faint sm:px-10">
          LevUp — feito para quem está começando em tech.
        </div>
      </footer>
    </div>
  );
}
