import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
};

export function TextField({ className, error, id, label, ...props }: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none transition-colors placeholder:text-slate-400 focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]",
          error && "border-red-500",
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
