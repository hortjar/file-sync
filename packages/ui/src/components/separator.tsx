import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from "react";

import { cn } from "../lib/cn";

const Separator = forwardRef<
  ElementRef<typeof SeparatorPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...rest }, reference) => (
  <SeparatorPrimitive.Root
    ref={reference}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-[hsl(var(--border))]",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className,
    )}
    {...rest}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
