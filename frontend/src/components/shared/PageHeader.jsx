export function PageHeader({ label, title, description, stats }) {
  return (
    <div className="glass-strong rounded-xl p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        {label ? <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground max-w-2xl">{description}</p> : null}
      </div>
      {stats?.length ? (
        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-lg px-4 py-3 min-w-[100px]">
              <span className="text-xs text-muted-foreground block">{stat.label}</span>
              <strong className="text-xl font-semibold">{stat.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
