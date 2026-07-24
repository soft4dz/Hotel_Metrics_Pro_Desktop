import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Calculator, CalendarRange, FileSpreadsheet, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

const CARDS = [
  { to: '/comptabilite/plan', label: 'Plan comptable SCF', desc: 'Consultation des comptes', icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
  { to: '/comptabilite/saisie', label: 'Saisie OD', desc: 'Écritures manuelles journal OD', icon: FileSpreadsheet, color: 'text-violet-600 bg-violet-50' },
  { to: '/comptabilite/journaux', label: 'Journaux', desc: 'Consultation des écritures', icon: ListChecks, color: 'text-emerald-600 bg-emerald-50' },
  { to: '/comptabilite/balance', label: 'Balance', desc: 'Balance générale par période', icon: Calculator, color: 'text-amber-600 bg-amber-50' },
  { to: '/comptabilite/exercices', label: 'Exercices', desc: 'Ouverture et clôture', icon: CalendarRange, color: 'text-rose-600 bg-rose-50' },
];

export function ComptabiliteHubPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {CARDS.map(({ to, label, desc, icon: Icon, color }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-start gap-4 rounded-xl border border-border/60 bg-white p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
        >
          <div className={cn('rounded-xl p-3', color)}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">{label}</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">{desc}</p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-primary" />
        </Link>
      ))}
    </div>
  );
}
