import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickLinkItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
}

interface QuickLinkGridProps {
  items: QuickLinkItem[];
}

export function QuickLinkGrid({ items }: QuickLinkGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'group flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-card',
              'transition-all duration-200 hover:border-primary/25 hover:shadow-elevated motion-reduce:transition-none',
            )}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{item.label}</span>
              {item.description && (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}
