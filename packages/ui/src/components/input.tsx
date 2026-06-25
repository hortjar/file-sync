import { type InputHTMLAttributes, forwardRef } from "react";

import { cn } from "../lib/cn";

type InputProperties = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

const Input = forwardRef<HTMLInputElement, InputProperties>(
  ({ label, error, hint, id, className, ...rest }, reference) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[hsl(var(--text))]">
          {label}
        </label>
      )}
      <input
        ref={reference}
        id={id}
        className={cn(
          "h-9 w-full rounded-xl border bg-[hsl(var(--surface))] px-3.5 text-sm text-[hsl(var(--text))] placeholder:text-[hsl(var(--text-faint))] outline-none transition-all",
          error
            ? "border-[hsl(var(--danger))] focus:border-[hsl(var(--danger))] focus:ring-2 focus:ring-[hsl(var(--danger)/.2)]"
            : "border-[hsl(var(--border))] focus:border-[hsl(var(--brand-from))] focus:ring-2 focus:ring-[hsl(var(--brand-from)/.2)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...rest}
      />
      {error && <p className="text-xs text-[hsl(var(--danger))]">{error}</p>}
      {!error && hint && <p className="text-xs text-[hsl(var(--text-faint))]">{hint}</p>}
    </div>
  ),
);
Input.displayName = "Input";

export { Input };
