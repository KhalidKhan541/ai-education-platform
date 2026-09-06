import * as React from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";

interface SidebarProps {
  children: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
  variant?: "default" | "floating" | "inset";
}

function Sidebar({
  children,
  collapsed = false,
  onToggle,
  className,
  variant = "default",
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64",
        variant === "floating" && "m-2 rounded-lg border shadow-sm",
        variant === "inset" && "m-2 rounded-lg border",
        className
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
        {!collapsed && <div className="font-semibold text-slate-900">Logo</div>}
        {onToggle && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className={cn(collapsed && "mx-auto")}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto py-4">{children}</div>
    </aside>
  );
}

interface SidebarGroupProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

function SidebarGroup({ children, label, className }: SidebarGroupProps) {
  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <div className="mb-1 px-4 text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
      )}
      <div className="space-y-1 px-2">{children}</div>
    </div>
  );
}

interface SidebarItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string | number;
  onClick?: () => void;
  className?: string;
}

function SidebarItem({
  children,
  icon,
  href,
  active = false,
  disabled = false,
  badge,
  onClick,
  className,
}: SidebarItemProps) {
  const Comp = href ? "a" : "button";

  return (
    <Comp
      href={href}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-slate-100 hover:text-slate-900",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950",
        active && "bg-slate-100 text-slate-900",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {badge !== undefined && (
        <span className="flex-shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
          {badge}
        </span>
      )}
    </Comp>
  );
}

interface SidebarSeparatorProps {
  className?: string;
}

function SidebarSeparator({ className }: SidebarSeparatorProps) {
  return <div className={cn("my-2 border-t border-slate-200", className)} />;
}

interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div className={cn("border-t border-slate-200 p-4", className)}>
      {children}
    </div>
  );
}

export { Sidebar, SidebarGroup, SidebarItem, SidebarSeparator, SidebarFooter };
