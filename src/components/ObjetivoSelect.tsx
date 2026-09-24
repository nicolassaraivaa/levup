"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Briefcase, TrendingUp, Globe } from "lucide-react";
import type { ObjetivoAnalise } from "@/lib/types";

export const OBJETIVOS: { id: ObjetivoAnalise; label: string; icon: typeof Briefcase }[] = [
  { id: "primeiro_emprego", label: "Primeiro Emprego", icon: Briefcase },
  { id: "crescimento_carreira", label: "Crescimento na Carreira", icon: TrendingUp },
  { id: "oportunidades_internacionais", label: "Oportunidades Internacionais", icon: Globe },
];

export default function ObjetivoSelect({
  value,
  onChange,
}: {
  value: ObjetivoAnalise | "";
  onChange: (value: ObjetivoAnalise) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = OBJETIVOS.find((o) => o.id === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between bg-background border rounded-lg px-4 py-3 text-left transition ${
          open ? "border-brass" : "border-hairline-strong hover:border-hairline-strong"
        }`}
      >
        <span
          className={`flex items-center gap-2.5 text-sm ${selected ? "text-ink" : "text-ink-faint"}`}
        >
          {selected && <selected.icon size={16} className="text-brass" />}
          {selected ? selected.label : "Selecione seu objetivo"}
        </span>
        <ChevronDown
          size={16}
          className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-full bg-background border border-hairline-strong rounded-lg overflow-hidden shadow-xl">
          {OBJETIVOS.map((objetivo) => {
            const isSelected = objetivo.id === value;
            return (
              <button
                key={objetivo.id}
                type="button"
                onClick={() => {
                  onChange(objetivo.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition ${
                  isSelected
                    ? "bg-brass-wash text-ink"
                    : "text-ink-muted hover:bg-surface"
                }`}
              >
                <objetivo.icon size={16} className="text-brass shrink-0" />
                {objetivo.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
