import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Larger, friendlier sizing for inputs on marketing pages. */
export const inputClass = "h-11 rounded-lg bg-surface px-3.5 text-base md:text-[0.95rem]";

/** Native select styled to match Input: accessible and works with react-hook-form's register(). */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-lg border border-input bg-surface pr-10 pl-3.5 text-base text-ink transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-[0.95rem]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate" aria-hidden />
    </div>
  );
}
