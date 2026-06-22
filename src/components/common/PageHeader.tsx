import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, backTo, action, className }: PageHeaderProps) {
  return (
    <div className={cn('page-header mb-3 flex flex-wrap items-start justify-between gap-2 sm:mb-4 sm:gap-3', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-2.5">
        {backTo && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer sm:h-9 sm:w-9"
            asChild
          >
            <Link to={backTo} aria-label="Retour">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </Button>
        )}
        <div className="min-w-0 border-l-[3px] border-primary pl-2.5 sm:pl-3">
          <h2 className="truncate font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
