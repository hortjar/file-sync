import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        default:
          "gradient-brand text-white shadow-sm hover:opacity-90 focus-visible:ring-[hsl(var(--brand-from))]",
        secondary:
          "bg-[hsl(var(--surface-2))] text-[hsl(var(--text))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--border))] focus-visible:ring-[hsl(var(--border))]",
        ghost:
          "text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text))] focus-visible:ring-[hsl(var(--border))]",
        danger:
          "bg-[hsl(var(--danger))] text-white hover:opacity-90 focus-visible:ring-[hsl(var(--danger))]",
        link: "text-[hsl(var(--brand-from))] underline-offset-4 hover:underline focus-visible:ring-[hsl(var(--brand-from))]",
      },
      size: {
        sm: "h-7 px-3.5 text-xs",
        default: "h-9 px-5",
        lg: "h-10 px-7 text-base",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProperties = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

const Button = forwardRef<HTMLButtonElement, ButtonProperties>(
  (
    { className, variant, size, asChild = false, loading, children, disabled, ...rest },
    reference,
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={reference}
        disabled={disabled ?? loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...rest}
      >
        {loading && (
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </Component>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
