import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "../../lib/cn";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, reference) => (
    <div
      ref={reference}
      className={cn(
        "rounded-[--r-lg] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[var(--shadow-xs)]",
        className,
      )}
      {...rest}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, reference) => (
    <div ref={reference} className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...rest} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...rest }, reference) => (
    <h3
      ref={reference}
      className={cn("text-base font-semibold text-[hsl(var(--text))]", className)}
      {...rest}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...rest }, reference) => (
    <p
      ref={reference}
      className={cn("text-sm text-[hsl(var(--text-muted))]", className)}
      {...rest}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, reference) => (
    <div ref={reference} className={cn("p-5 pt-0", className)} {...rest} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, reference) => (
    <div
      ref={reference}
      className={cn(
        "flex items-center gap-2 p-5 pt-0 border-t border-[hsl(var(--border-subtle))] mt-3",
        className,
      )}
      {...rest}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
