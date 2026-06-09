import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppPageProps {
  children: ReactNode;
  className?: string;
}

/** Conteneur standard pour toutes les pages internes */
export function AppPage({ children, className }: AppPageProps) {
  return <div className={cn('page-shell', className)}>{children}</div>;
}
