import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionBlockProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionBlock({
  title,
  description,
  action,
  children,
  className,
  noPadding,
}: SectionBlockProps) {
  return (
    <section className={cn('section-block', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-3.5">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn(!noPadding && 'p-5')}>{children}</div>
    </section>
  );
}
