import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";

import { cn } from "../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))]",
        success: "bg-green-500/10 text-green-600 dark:text-green-400",
        warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        danger: "bg-red-500/10 text-red-600 dark:text-red-400",
        info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        brand: "gradient-brand text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type BadgeProperties = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...rest }: BadgeProperties) {
  return <span className={cn(badgeVariants({ variant }), className)} {...rest} />;
}

export { Badge, badgeVariants };
