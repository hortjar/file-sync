import type { InputHTMLAttributes } from "react";

type InputProperties = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, id, className = "", ...rest }: InputProperties) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[--color-foreground]">
          {label}
        </label>
      )}
      <input
        {...rest}
        id={id}
        className={[
          "w-full rounded-[--radius-md] border border-[--color-input] bg-[--color-background] px-3 py-2 text-sm text-[--color-foreground] placeholder:text-[--color-muted-foreground] outline-none transition-colors focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-ring] disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-[--color-danger]" : "",
          className,
        ].join(" ")}
      />
      {error && <p className="text-xs text-[--color-danger]">{error}</p>}
    </div>
  );
}
