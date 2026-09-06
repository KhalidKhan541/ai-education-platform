import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-slate-50 shadow hover:bg-slate-900/80",
        secondary:
          "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
        destructive:
          "border-transparent bg-red-500 text-slate-50 shadow hover:bg-red-500/80",
        outline: "text-slate-950",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        warning:
          "border-transparent bg-amber-50 text-amber-700 hover:bg-amber-100",
        info:
          "border-transparent bg-blue-50 text-blue-700 hover:bg-blue-100",
        purple:
          "border-transparent bg-purple-50 text-purple-700 hover:bg-purple-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
  icon?: React.ReactNode;
}

function Badge({
  className,
  variant,
  removable = false,
  onRemove,
  dot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "mr-1.5 h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "destructive" && "bg-red-500",
            variant === "info" && "bg-blue-500",
            variant === "purple" && "bg-purple-500",
            (!variant || variant === "default" || variant === "secondary" || variant === "outline") &&
              "bg-slate-500"
          )}
        />
      )}
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 rounded-full p-0.5 hover:bg-black/10"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "completed" | "failed" | "draft";
  label?: string;
  className?: string;
  dot?: boolean;
}

function StatusBadge({ status, label, className, dot = true }: StatusBadgeProps) {
  const statusConfig = {
    active: { variant: "success" as const, defaultLabel: "Active" },
    inactive: { variant: "secondary" as const, defaultLabel: "Inactive" },
    pending: { variant: "warning" as const, defaultLabel: "Pending" },
    completed: { variant: "success" as const, defaultLabel: "Completed" },
    failed: { variant: "destructive" as const, defaultLabel: "Failed" },
    draft: { variant: "outline" as const, defaultLabel: "Draft" },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      dot={dot}
      className={className}
    >
      {label || config.defaultLabel}
    </Badge>
  );
}

export { Badge, badgeVariants, StatusBadge };
