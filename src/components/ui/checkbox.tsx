import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    label?: string;
    description?: string;
    error?: boolean;
  }
>(
  (
    {
      className,
      label,
      description,
      error = false,
      id: idProp,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = idProp || generatedId;

    const checkboxElement = (
      <CheckboxPrimitive.Root
        ref={ref}
        id={id}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-slate-200 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-900 data-[state=checked]:text-slate-50",
          error && "border-red-500",
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn("flex items-center justify-center text-current")}
        >
          <Check className="h-3.5 w-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );

    if (!label) return checkboxElement;

    return (
      <div className="flex items-start gap-2">
        {checkboxElement}
        <div className="grid gap-1.5 leading-none">
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
      </div>
    );
  }
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

interface CheckboxGroupProps {
  options: {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
  disabled?: boolean;
}

function CheckboxGroup({
  options,
  value = [],
  onValueChange,
  orientation = "vertical",
  className,
  disabled = false,
}: CheckboxGroupProps) {
  const handleCheckedChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onValueChange?.([...value, optionValue]);
    } else {
      onValueChange?.(value.filter((v) => v !== optionValue));
    }
  };

  return (
    <div
      role="group"
      className={cn(
        "gap-3",
        orientation === "vertical" ? "flex flex-col" : "flex flex-wrap",
        className
      )}
    >
      {options.map((option) => (
        <Checkbox
          key={option.value}
          checked={value.includes(option.value)}
          onCheckedChange={(checked) =>
            handleCheckedChange(option.value, checked === true)
          }
          disabled={disabled || option.disabled}
          label={option.label}
          description={option.description}
        />
      ))}
    </div>
  );
}

interface IndeterminateCheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
  indeterminate?: boolean;
}

const IndeterminateCheckbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  IndeterminateCheckboxProps
>(({ className, label, indeterminate, ...props }, ref) => (
  <div className="flex items-center gap-2">
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-slate-200 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-900 data-[state=checked]:text-slate-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        {indeterminate ? (
          <Minus className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
    {label && (
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
    )}
  </div>
));
IndeterminateCheckbox.displayName = "IndeterminateCheckbox";

export { Checkbox, CheckboxGroup, IndeterminateCheckbox };
