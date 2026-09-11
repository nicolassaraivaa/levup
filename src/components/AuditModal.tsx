"use client";

import { X, Loader2, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export default function AuditModal({
  open,
  onClose,
  icon,
  iconBg,
  title,
  description,
  onSubmit,
  submitLabel,
  submitDisabled,
  loading,
  erro,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  iconBg: string;
  title: string;
  description: string;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled: boolean;
  loading: boolean;
  erro: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl p-7">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
          >
            {icon}
          </div>
          <h2 className="text-lg font-bold text-white pr-6">{title}</h2>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          {description}
        </p>

        <div className="space-y-5">{children}</div>

        {erro && (
          <div className="mt-5 bg-red-500/10 border border-red-800 rounded-lg p-3 text-sm text-red-300 flex gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {erro}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-7">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled || loading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition flex items-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
