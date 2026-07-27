import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native select styled to match Input exactly (height, radius, border), with
 * a consistent chevron instead of the platform default.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }
>(({ className, wrapperClassName, children, ...props }, ref) => (
  <span className={cn("relative block", wrapperClassName)}>
    <select
      ref={ref}
      {...props}
      className={cn(
        "h-11 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-base outline-none ring-ring focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  </span>
));
Select.displayName = "Select";
