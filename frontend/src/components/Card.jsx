import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Card({ title, children, actions, className = "" }) {
  return (
    <UiCard className={cn(className)}>
      {(title || actions) && (
        <CardHeader className="flex-row items-center justify-between space-y-0">
          {title ? <CardTitle>{title}</CardTitle> : <span />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </UiCard>
  );
}
