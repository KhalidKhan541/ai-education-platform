import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, Command as CommandIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface CommandDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function CommandDialog({ children, ...props }: CommandDialogProps) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-slate-200 bg-white p-0 shadow-lg">
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

function CommandInput({
  className,
  onValueChange,
  ...props
}: CommandInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.(e.target.value);
    props.onChange?.(e);
  };

  return (
    <div className="flex items-center border-b border-slate-200 px-4">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        className={cn(
          "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}

interface CommandListProps {
  children: React.ReactNode;
  className?: string;
}

function CommandList({ children, className }: CommandListProps) {
  return (
    <div
      className={cn(
        "max-h-[300px] overflow-y-auto overflow-x-hidden p-2",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CommandGroupProps {
  heading?: string;
  children: React.ReactNode;
  className?: string;
}

function CommandGroup({ heading, children, className }: CommandGroupProps) {
  return (
    <div className={cn("mb-2", className)}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-slate-500">
          {heading}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

interface CommandItemProps {
  children: React.ReactNode;
  value?: string;
  onSelect?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function CommandItem({
  children,
  value,
  onSelect,
  disabled = false,
  className,
}: CommandItemProps) {
  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(value || (typeof children === "string" ? children : ""));
    }
  };

  return (
    <div
      role="option"
      aria-disabled={disabled}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
        "hover:bg-slate-100",
        "aria-selected:bg-slate-100",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

interface CommandSeparatorProps {
  className?: string;
}

function CommandSeparator({ className }: CommandSeparatorProps) {
  return <div className={cn("-mx-2 my-1 h-px bg-slate-200", className)} />;
}

interface CommandEmptyProps {
  children?: React.ReactNode;
  className?: string;
}

function CommandEmpty({ children, className }: CommandEmptyProps) {
  return (
    <div
      className={cn("py-6 text-center text-sm text-slate-500", className)}
    >
      {children || "No results found."}
    </div>
  );
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  groups: {
    heading?: string;
    items: {
      value: string;
      label: string;
      icon?: React.ReactNode;
      shortcut?: string;
      disabled?: boolean;
    }[];
  }[];
  onSelect?: (value: string) => void;
  emptyMessage?: string;
  className?: string;
}

function CommandPalette({
  open,
  onOpenChange,
  placeholder = "Search...",
  groups,
  onSelect,
  emptyMessage,
  className,
}: CommandPaletteProps) {
  const [search, setSearch] = React.useState("");

  const filteredGroups = React.useMemo(() => {
    if (!search) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const hasResults = filteredGroups.some((group) => group.items.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={placeholder}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {!hasResults && (
          <CommandEmpty>{emptyMessage}</CommandEmpty>
        )}
        {filteredGroups.map((group, groupIndex) => (
          <CommandGroup key={groupIndex} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem
                key={item.value}
                value={item.value}
                onSelect={(val) => {
                  onSelect?.(val);
                  onOpenChange(false);
                  setSearch("");
                }}
                disabled={item.disabled}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <kbd className="ml-2 inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-500">
                    {item.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandEmpty,
  CommandPalette,
};
