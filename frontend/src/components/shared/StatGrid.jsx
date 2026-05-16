export function StatGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border/60 bg-background/40 p-4">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <strong className="mt-1 block text-2xl font-semibold tracking-tight">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
