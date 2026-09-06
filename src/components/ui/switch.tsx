import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    label?: string;
    description?: string;
    error?: boolean;
    labelPosition?: "left" | "right";
  }
>(
  (
    {
      className,
      label,
      description,
      error = false,
      labelPosition = "right",
      id: idProp,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = idProp || generatedId;

    const switchElement = (
      <SwitchPrimitives.Root
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-slate-200",
          error && "border-red-500",
          className
        )}
        {...props}
        ref={ref}
        id={id}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
          )}
        />
      </SwitchPrimitives.Root>
    );

    if (!label) return switchElement;

    const labelContent = (
      <div className="grid gap-1">
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-red-500"
          )}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </div>
    );

    return (
      <div className="flex items-center gap-2">
        {labelPosition === "left" && labelContent}
        {switchElement}
        {labelPosition === "right" && labelContent}
      </div>
    );
  }
);
Switch.displayName = SwitchPrimitives.Root.displayName;

interface ToggleGroupProps {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value?: string;
  onValueChange?: (value: string) => void;
  type?: "single" | "multiple";
  multipleValue?: string[];
  onMultipleValueChange?: (value: string[]) => void;
  className?: string;
  disabled?: boolean;
}

function ToggleGroup({
  options,
  value,
  onValueChange,
  type = "single",
  multipleValue = [],
  onMultipleValueChange,
  className,
  disabled = false,
}: ToggleGroupProps) {
  const handleToggle = (optionValue: string) => {
    if (type === "single") {
      onValueChange?.(optionValue === value ? "" : optionValue);
    } else {
      const newValue = multipleValue.includes(optionValue)
        ? multipleValue.filter((v) => v !== optionValue)
        : [...multipleValue, optionValue];
      onMultipleValueChange?.(newValue);
    }
  };

  const isActive = (optionValue: string) => {
    return type === "single"
      ? value === optionValue
      : multipleValue.includes(optionValue);
  };

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-slate-200 bg-white p-0.5",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleToggle(option.value)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            "hover:bg-slate-100 hover:text-slate-900",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950",
            "disabled:pointer-events-none disabled:opacity-50",
            isActive(option.value) &&
              "bg-slate-900 text-slate-50 shadow-sm"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export { Switch, ToggleGroup };
