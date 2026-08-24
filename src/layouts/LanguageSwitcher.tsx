import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clampMenuPosition } from '@/lib/clampMenuPosition';
import { useUiStore, type Locale } from '@/stores/ui.store';
import { translate } from '@/lib/localization';

const LOCALES: { value: Locale; label: string; short: string }[] = [
  { value: 'fr', label: 'Français', short: 'FR' },
  { value: 'ar', label: 'العربية', short: 'AR' },
  { value: 'en', label: 'English', short: 'EN' },
];

export function LanguageSwitcher() {
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const current = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  const updatePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    setPos(clampMenuPosition(el.getBoundingClientRect(), 180, 156));
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="navbar-dropdown fixed z-[110] w-[180px] animate-in rounded-lg border border-border p-1.5 shadow-elevated fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {LOCALES.map((l) => (
            <button
              key={l.value}
              type="button"
              role="menuitemradio"
              aria-checked={l.value === locale}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                setLocale(l.value);
                setOpen(false);
              }}
            >
              <span className="flex-1 text-left">{l.label}</span>
              {l.value === locale && <Check className="h-4 w-4 text-accent" />}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={translate(locale, 'Changer de langue')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:px-3 2xl:text-sm',
          open && 'bg-muted text-foreground',
        )}
      >
        <Globe className="h-3.5 w-3.5 shrink-0 text-accent 2xl:h-4 2xl:w-4" />
        <span>{current.short}</span>
        <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {panel}
    </>
  );
}
