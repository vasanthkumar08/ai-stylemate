"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-2), { id, ...input }]);
      window.setTimeout(() => dismiss(id), input.tone === "error" ? 6500 : 4200);
    },
    [dismiss]
  );

  function ToastViewport() {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto grid w-full max-w-md gap-2 px-4 sm:left-auto sm:right-4 sm:mx-0">
        {toasts.map((item) => {
          const Icon = icons[item.tone];

          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex min-w-0 items-start gap-3 rounded-lg border bg-white p-4 shadow-lg",
                item.tone === "success" && "border-emerald-200",
                item.tone === "error" && "border-red-200",
                item.tone === "info" && "border-[var(--border)]"
              )}
              role="status"
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  item.tone === "success" && "text-emerald-600",
                  item.tone === "error" && "text-red-600",
                  item.tone === "info" && "text-[var(--accent)]"
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{item.description}</p>
                ) : null}
              </div>
              <button
                className="rounded-md p-1 text-[var(--muted)] transition hover:bg-[var(--surface-subtle)]"
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return { toast, ToastViewport };
}
