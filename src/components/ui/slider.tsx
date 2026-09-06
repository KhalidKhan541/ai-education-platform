import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    label?: string;
    showValue?: boolean;
    formatValue?: (value: number) => string;
  }
>(
  (
    {
      className,
      label,
      showValue = false,
      formatValue,
      value,
      ...props
    },
    ref
  ) => {
    const displayValue = value?.[0];

    return (
      <div className="w-full">
        {(label || showValue) && (
          <div className="mb-2 flex items-center justify-between">
            {label && (
              <label className="text-sm font-medium text-slate-700">
                {label}
              </label>
            )}
            {showValue && displayValue !== undefined && (
              <span className="text-sm text-slate-500">
                {formatValue ? formatValue(displayValue) : displayValue}
              </span>
            )}
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
          )}
          value={value}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-100">
            <SliderPrimitive.Range className="absolute h-full bg-slate-900" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-slate-200 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50" />
        </SliderPrimitive.Root>
      </div>
    );
  }
);
Slider.displayName = SliderPrimitive.Root.displayName;

interface RangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  label?: string;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
  disabled?: boolean;
}

function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value = [min, max],
  onValueChange,
  label,
  showValues = true,
  formatValue,
  className,
  disabled = false,
}: RangeSliderProps) {
  const handleChange = React.useCallback(
    (newValue: number[]) => {
      if (newValue.length === 2) {
        onValueChange?.([newValue[0], newValue[1]]);
      }
    },
    [onValueChange]
  );

  const formatDisplay = (val: number) => {
    if (formatValue) return formatValue(val);
    return val.toString();
  };

  return (
    <div className="w-full">
      {(label || showValues) && (
        <div className="mb-2 flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-slate-700">
              {label}
            </label>
          )}
          {showValues && (
            <span className="text-sm text-slate-500">
              {formatDisplay(value[0])} - {formatDisplay(value[1])}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-100">
          <SliderPrimitive.Range className="absolute h-full bg-slate-900" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-slate-200 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50" />
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-slate-200 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
    </div>
  );
}

export { Slider, RangeSlider };
