import * as React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "white";
}

function Spinner({ className, size = "md", variant = "default", ...props }: SpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3 border",
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-2",
    xl: "h-12 w-12 border-[3px]",
  };

  const variantClasses = {
    default: "border-slate-200 border-t-slate-900",
    primary: "border-blue-200 border-t-blue-600",
    white: "border-white/30 border-t-white",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

interface LoadingOverlayProps {
  loading: boolean;
  text?: string;
  children?: React.ReactNode;
  className?: string;
  spinnerSize?: "sm" | "md" | "lg";
}

function LoadingOverlay({
  loading,
  text,
  children,
  className,
  spinnerSize = "md",
}: LoadingOverlayProps) {
  if (!loading) return <>{children}</>;

  return (
    <div className={cn("relative", className)}>
      {children}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
        <Spinner size={spinnerSize} />
        {text && <p className="mt-2 text-sm text-slate-600">{text}</p>}
      </div>
    </div>
  );
}

interface LoadingPageProps {
  text?: string;
  className?: string;
}

function LoadingPage({ text = "Loading...", className }: LoadingPageProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center",
        className
      )}
    >
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-slate-600">{text}</p>
    </div>
  );
}

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  text?: string;
}

function LoadingButton({
  loading,
  children,
  className,
  text = "Loading...",
}: LoadingButtonProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {loading && <Spinner size="sm" variant="white" className="mr-2" />}
      {loading ? text : children}
    </span>
  );
}

export { Spinner, LoadingOverlay, LoadingPage, LoadingButton };
