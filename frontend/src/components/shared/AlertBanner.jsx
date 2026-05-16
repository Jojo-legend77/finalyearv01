import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AlertBanner({ variant = "error", children, className }) {
  if (!children) return null;
  const isError = variant === "error";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        isError ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-success/30 bg-success/5 text-success",
        className,
      )}
      role="alert"
    >
      {isError ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
      <span>{children}</span>
    </div>
  );
}
