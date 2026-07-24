import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SidebarNav } from '@/layouts/SidebarNav';
import { MobileNavDrawer } from '@/layouts/MobileNavDrawer';
import { TopNavbar } from '@/layouts/TopNavbar';
import { useUiStore } from '@/stores/ui.store';

vi.mock('@/lib/ipcClient', () => ({
  ipcClient: {
    settings: {
      getBranding: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    },
    users: {
      pendingCount: vi.fn().mockResolvedValue({ ok: true, data: 0 }),
    },
    rh: {
      countValidationsN1: vi.fn().mockResolvedValue({ ok: true, data: 0 }),
    },
    modules: {
      listEnabled: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    },
  },
}));

const { authState } = vi.hoisted(() => ({
  authState: {
    user: { fullName: 'Karim Admin', role: 'ADMIN_DEC', roleLabel: 'Administrateur' },
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    typeof selector === 'function' ? selector(authState) : authState,
}));

vi.mock('@/hooks/useEnabledModules', () => ({
  useEnabledModules: () => new Set<string>(),
}));

vi.mock('@/components/common/SyncStatusBadge', () => ({
  SyncStatusBadge: () => null,
}));

function renderWithRouter(ui: React.ReactElement, route = '/dashboard') {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('SidebarNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche les modules et le branding en mode étendu', async () => {
    renderWithRouter(
      <SidebarNav collapsed={false} showCollapseControl onToggleCollapse={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Raqmi System')).toBeInTheDocument();
    });

    expect(screen.getByText('Pilotage')).toBeInTheDocument();
    expect(screen.getByText('Exploitation')).toBeInTheDocument();
    expect(screen.getByText('Karim Admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replier le menu' })).toBeInTheDocument();
  });

  it('ouvre le module actif et affiche les liens enfants', async () => {
    renderWithRouter(
      <SidebarNav collapsed={false} />,
      '/dashboard',
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Dashboard global' })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Modules de pilotage' })).toBeInTheDocument();
  });

  it('bascule l’accordéon d’un module au clic', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SidebarNav collapsed={false} />, '/dashboard');

    await waitFor(() => {
      expect(screen.getByText('Exploitation')).toBeInTheDocument();
    });

    const exploitationBtn = screen.getByRole('button', { name: /Exploitation/i });
    expect(exploitationBtn).toHaveAttribute('aria-expanded', 'false');

    await user.click(exploitationBtn);
    expect(exploitationBtn).toHaveAttribute('aria-expanded', 'true');

    await user.click(exploitationBtn);
    expect(exploitationBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('en mode replié : icônes seules dans la barre, textes dans le panneau flyout', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <SidebarNav collapsed onToggleCollapse={vi.fn()} />,
      '/dashboard',
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Déplier le menu' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Dashboard global')).not.toBeInTheDocument();
    expect(screen.queryByText('Exploitation')).not.toBeInTheDocument();

    const pilotageBtn = screen.getByRole('button', { name: 'Pilotage' });
    await user.click(pilotageBtn);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Dashboard global' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Modules de pilotage' })).toBeInTheDocument();

    const rail = document.querySelector('.sidebar-collapsed nav');
    expect(rail).toBeTruthy();
    expect(within(rail as HTMLElement).queryByText('Dashboard global')).not.toBeInTheDocument();
  });

  it('appelle onToggleCollapse depuis le bouton replié', async () => {
    const onToggleCollapse = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(
      <SidebarNav collapsed onToggleCollapse={onToggleCollapse} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Déplier le menu' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Déplier le menu' }));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it('appelle onNavigate quand un lien est cliqué', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(
      <SidebarNav collapsed={false} onNavigate={onNavigate} />,
      '/dashboard',
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Modules de pilotage' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('link', { name: 'Modules de pilotage' }));
    expect(onNavigate).toHaveBeenCalled();
  });
});

describe('MobileNavDrawer', () => {
  beforeEach(() => {
    useUiStore.setState({ mobileNavOpen: false });
  });

  it('ne rend rien quand fermé', () => {
    renderWithRouter(<MobileNavDrawer />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('affiche la navigation complète quand ouvert', async () => {
    useUiStore.setState({ mobileNavOpen: true });
    renderWithRouter(<MobileNavDrawer />);

    expect(screen.getByRole('dialog', { name: 'Menu de navigation' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Pilotage')).toBeInTheDocument();
    });
    expect(screen.getByText('Karim Admin')).toBeInTheDocument();
  });

  it('ferme au clic sur le bouton fermer', async () => {
    useUiStore.setState({ mobileNavOpen: true });
    const user = userEvent.setup();
    renderWithRouter(<MobileNavDrawer />);

    const closeButtons = screen.getAllByRole('button', { name: 'Fermer le menu' });
    await user.click(closeButtons[0]);

    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });
});

describe('TopNavbar', () => {
  beforeEach(() => {
    useUiStore.setState({ mobileNavOpen: false });
  });

  it('utilise le shell navbar et affiche le branding', async () => {
    const { container } = renderWithRouter(<TopNavbar />);

    await waitFor(() => {
      expect(screen.getByText('Raqmi System')).toBeInTheDocument();
    });

    const header = container.querySelector('header');
    expect(header).toHaveClass('navbar-shell');
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument();
  });

  it('affiche le bouton menu sur mobile', async () => {
    renderWithRouter(<TopNavbar />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ouvrir le menu' })).toBeInTheDocument();
    });
  });
});
