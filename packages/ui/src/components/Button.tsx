import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProperties = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[--color-primary] text-[--color-primary-foreground] hover:bg-[--color-primary-hover] focus-visible:ring-2 focus-visible:ring-[--color-ring]",
  secondary:
    "bg-[--color-muted] text-[--color-foreground] hover:bg-[--color-border] focus-visible:ring-2 focus-visible:ring-[--color-ring]",
  ghost:
    "bg-transparent text-[--color-foreground] hover:bg-[--color-muted] focus-visible:ring-2 focus-visible:ring-[--color-ring]",
  danger:
    "bg-[--color-danger] text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[--color-ring]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProperties) {
  return (
    <button
      {...rest}
      disabled={disabled ?? loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-[--radius-md] font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
