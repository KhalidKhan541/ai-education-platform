import * as React from "react";
import { cn } from "@/lib/utils";
import { Menu, Bell, Search } from "lucide-react";
import { Button } from "../ui/button";
import { UserAvatar } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown";

interface HeaderProps {
  onMenuClick?: () => void;
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
  onNotificationClick?: () => void;
  notificationCount?: number;
  children?: React.ReactNode;
  className?: string;
}

function Header({
  onMenuClick,
  user,
  onNotificationClick,
  notificationCount = 0,
  children,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {children}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Search className="h-5 w-5 text-slate-500" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNotificationClick}
          className="relative"
        >
          <Bell className="h-5 w-5 text-slate-500" />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2">
                <UserAvatar
                  name={user.name}
                  src={user.image}
                  size="sm"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

interface HeaderSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
}

function HeaderSearch({
  placeholder = "Search...",
  value,
  onChange,
  onSubmit,
  className,
}: HeaderSearchProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(value || "");
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
      />
    </form>
  );
}

interface HeaderActionsProps {
  children: React.ReactNode;
  className?: string;
}

function HeaderActions({ children, className }: HeaderActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
    </div>
  );
}

export { Header, HeaderSearch, HeaderActions };
