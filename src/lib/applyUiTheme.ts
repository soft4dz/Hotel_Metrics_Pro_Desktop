import type { AccentColor, Density } from '@/stores/ui.store';

const STORAGE_KEY = 'hmp-ui-prefs';

export interface ThemePalette {
  primary: string;
  primaryForeground: string;
  ring: string;
  accent: string;
  sidebar: string;
  sidebarFrom: string;
  sidebarVia: string;
  sidebarTo: string;
}

export const ACCENT_PALETTES: Record<AccentColor, ThemePalette> = {
  navy: {
    primary: '224 64% 31%',
    primaryForeground: '210 40% 98%',
    ring: '224 64% 33%',
    accent: '224 64% 38%',
    sidebar: '224 64% 18%',
    sidebarFrom: '222 47% 11%',
    sidebarVia: '224 64% 33%',
    sidebarTo: '224 64% 18%',
  },
  blue: {
    primary: '217 91% 60%',
    primaryForeground: '0 0% 100%',
    ring: '217 91% 60%',
    accent: '217 91% 55%',
    sidebar: '217 91% 22%',
    sidebarFrom: '217 91% 12%',
    sidebarVia: '217 91% 45%',
    sidebarTo: '217 91% 22%',
  },
  violet: {
    primary: '262 83% 58%',
    primaryForeground: '0 0% 100%',
    ring: '262 83% 58%',
    accent: '262 83% 52%',
    sidebar: '262 83% 18%',
    sidebarFrom: '262 83% 10%',
    sidebarVia: '262 83% 42%',
    sidebarTo: '262 83% 18%',
  },
  emerald: {
    primary: '160 84% 32%',
    primaryForeground: '0 0% 100%',
    ring: '160 84% 32%',
    accent: '160 84% 28%',
    sidebar: '160 84% 14%',
    sidebarFrom: '160 84% 8%',
    sidebarVia: '160 84% 28%',
    sidebarTo: '160 84% 14%',
  },
  rose: {
    primary: '347 77% 50%',
    primaryForeground: '0 0% 100%',
    ring: '347 77% 50%',
    accent: '347 77% 45%',
    sidebar: '347 77% 18%',
    sidebarFrom: '347 77% 10%',
    sidebarVia: '347 77% 38%',
    sidebarTo: '347 77% 18%',
  },
  amber: {
    primary: '38 92% 50%',
    primaryForeground: '222 47% 11%',
    ring: '38 92% 50%',
    accent: '38 92% 45%',
    sidebar: '30 80% 18%',
    sidebarFrom: '30 80% 10%',
    sidebarVia: '38 92% 42%',
    sidebarTo: '30 80% 18%',
  },
  cyan: {
    primary: '192 82% 35%',
    primaryForeground: '0 0% 100%',
    ring: '192 82% 35%',
    accent: '192 82% 30%',
    sidebar: '192 82% 15%',
    sidebarFrom: '192 82% 8%',
    sidebarVia: '192 82% 30%',
    sidebarTo: '192 82% 15%',
  },
  slate: {
    primary: '217 19% 35%',
    primaryForeground: '0 0% 100%',
    ring: '217 19% 35%',
    accent: '217 19% 30%',
    sidebar: '217 19% 14%',
    sidebarFrom: '217 19% 8%',
    sidebarVia: '217 19% 28%',
    sidebarTo: '217 19% 14%',
  },
};

const DENSITY_RADIUS: Record<Density, string> = {
  compact: '0.45rem',
  comfortable: '0.95rem',
  spacious: '1.15rem',
};

const THEME_VAR_KEYS = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--accent',
  '--sidebar',
  '--sidebar-from',
  '--sidebar-via',
  '--sidebar-to',
] as const;

function applyPalette(el: HTMLElement, palette: ThemePalette): void {
  el.style.setProperty('--primary', palette.primary);
  el.style.setProperty('--primary-foreground', palette.primaryForeground);
  el.style.setProperty('--ring', palette.ring);
  el.style.setProperty('--accent', palette.accent);
  el.style.setProperty('--sidebar', palette.sidebar);
  el.style.setProperty('--sidebar-from', palette.sidebarFrom);
  el.style.setProperty('--sidebar-via', palette.sidebarVia);
  el.style.setProperty('--sidebar-to', palette.sidebarTo);
}

export function applyUiTheme(accentColor: AccentColor, density: Density): void {
  const el = document.documentElement;

  el.classList.forEach((c) => {
    if (c.startsWith('accent-') || c.startsWith('density-')) {
      el.classList.remove(c);
    }
  });

  el.classList.add(`accent-${accentColor}`);
  el.classList.add(`density-${density}`);
  el.dataset.accent = accentColor;
  el.dataset.density = density;

  applyPalette(el, ACCENT_PALETTES[accentColor]);
  el.style.setProperty('--radius', DENSITY_RADIUS[density]);
}

export function hydrateUiThemeFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      applyUiTheme('navy', 'comfortable');
      return;
    }
    const parsed = JSON.parse(raw) as { state?: { accentColor?: AccentColor; density?: Density } };
    applyUiTheme(parsed.state?.accentColor ?? 'navy', parsed.state?.density ?? 'comfortable');
  } catch {
    applyUiTheme('navy', 'comfortable');
  }
}

export function clearInlineThemeVars(): void {
  const el = document.documentElement;
  for (const key of THEME_VAR_KEYS) {
    el.style.removeProperty(key);
  }
  el.style.removeProperty('--radius');
}
