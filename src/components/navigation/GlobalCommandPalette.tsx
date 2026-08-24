import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Command, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebarNav } from '@/hooks/useSidebarNav';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function GlobalCommandPalette() {
  const navigate = useNavigate();
  const { modules } = useSidebarNav();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () =>
      modules.flatMap((module) =>
        module.items
          .filter((item) => item.visible !== false)
          .map((item) => ({ ...item, section: module.title, icon: module.icon })),
      ),
    [modules],
  );

  const results = useMemo(() => {
    const term = normalize(query);
    const filtered = term
      ? items.filter((item) => normalize(`${item.label} ${item.section}`).includes(term))
      : items;
    return filtered.slice(0, 10);
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const select = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const dialog = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[160] flex items-start justify-center bg-slate-950/35 px-4 pt-[12vh] backdrop-blur-[2px]"
          onMouseDown={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Accès rapide"
            className="w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_70px_-30px_rgba(7,21,37,0.55)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.8} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une page, une action ou un module…"
                className="h-14 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Fermer l'accès rapide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucun résultat pour « {query} »
                </p>
              ) : (
                <div className="space-y-1">
                  {results.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={`${item.section}-${item.to}`}
                        type="button"
                        onClick={() => select(item.to)}
                        className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted focus:bg-muted focus:outline-none"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{item.label}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{item.section}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
              <span>Navigation Raqmi System</span>
              <span>Échap pour fermer</span>
            </footer>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xl items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-card"
        aria-label="Ouvrir l'accès rapide"
      >
        <Search className="h-4 w-4 text-accent" />
        <span className="min-w-0 flex-1 truncate">Rechercher ou accéder rapidement…</span>
        <span className="hidden items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
          <Command className="h-3 w-3" />K
        </span>
      </button>
      {dialog}
    </>
  );
}
