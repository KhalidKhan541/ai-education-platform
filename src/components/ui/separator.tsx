import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-slate-200",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

interface LabeledSeparatorProps {
  label: string;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

function LabeledSeparator({
  label,
  className,
  orientation = "horizontal",
}: LabeledSeparatorProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        orientation === "horizontal" ? "w-full" : "flex-col h-full",
        className
      )}
    >
      <Separator
        orientation={orientation}
        className={cn(
          orientation === "horizontal" ? "flex-1" : "flex-1 h-full"
        )}
      />
      <span
        className={cn(
          "px-3 text-xs text-slate-500 font-medium",
          orientation === "horizontal" ? "shrink-0" : "py-3"
        )}
      >
        {label}
      </span>
      <Separator
        orientation={orientation}
        className={cn(
          orientation === "horizontal" ? "flex-1" : "flex-1 h-full"
        )}
      />
    </div>
  );
}

export { Separator, LabeledSeparator };
