import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Result message after a form submits. Announced to screen readers. */
export function FormStatus({
  result,
  tone = "dark",
}: {
  result: { ok: boolean; message: string } | null;
  tone?: "dark" | "light";
}) {
  return (
    <div role="status" aria-live="polite">
      {result && (
        <p
          className={cn(
            "flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed",
            result.ok
              ? tone === "light" ? "bg-emerald-400/15 text-emerald-100" : "bg-emerald-50 text-emerald-900 dark:bg-emerald-400/12 dark:text-emerald-200"
              : tone === "light" ? "bg-red-400/15 text-red-100" : "bg-red-50 text-red-900 dark:bg-red-400/12 dark:text-red-200",
          )}
        >
          {result.ok ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          {result.message}
        </p>
      )}
    </div>
  );
}
