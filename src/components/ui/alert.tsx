import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-white text-slate-950 border-slate-200",
        destructive:
          "border-red-500/50 text-red-600 bg-red-50 [&>svg]:text-red-600",
        success:
          "border-emerald-500/50 text-emerald-600 bg-emerald-50 [&>svg]:text-emerald-600",
        warning:
          "border-amber-500/50 text-amber-600 bg-amber-50 [&>svg]:text-amber-600",
        info:
          "border-blue-500/50 text-blue-600 bg-blue-50 [&>svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof alertVariants> & {
      icon?: React.ReactNode;
      dismissible?: boolean;
      onDismiss?: () => void;
    }
>(({ className, variant, icon, dismissible = false, onDismiss, children, ...props }, ref) => {
  const defaultIcons = {
    default: <Info className="h-4 w-4" />,
    destructive: <AlertCircle className="h-4 w-4" />,
    success: <CheckCircle2 className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), "relative", className)}
      {...props}
    >
      {icon || defaultIcons[variant || "default"]}
      <div className="flex-1">{children}</div>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>
      )}
    </div>
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

interface AlertBannerProps {
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  title: string;
  description?: string;
  action?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

function AlertBanner({
  variant = "default",
  title,
  description,
  action,
  dismissible = false,
  onDismiss,
  className,
}: AlertBannerProps) {
  return (
    <Alert
      variant={variant}
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={cn("flex items-center justify-between", className)}
    >
      <div>
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </Alert>
  );
}

export { Alert, AlertTitle, AlertDescription, AlertBanner };
