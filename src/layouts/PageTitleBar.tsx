interface PageTitleBarProps {
  title: string;
  subtitle?: string;
}

export function PageTitleBar({ title, subtitle }: PageTitleBarProps) {
  return (
    <div className="border-b border-border/70 bg-background/80 backdrop-blur-sm">
      <div className="layout-title-shell">
        <h1 className="truncate font-heading text-sm font-semibold tracking-tight text-foreground sm:text-base lg:text-lg">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
