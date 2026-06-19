import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import { createMockIpcClient } from '@/test/mockIpcClient';
import { SMOKE_ROUTES } from '@/test/smokeRoutes';
import { navigateTo, renderAuthenticatedApp, resetAuthStore } from '@/test/testHarness';

vi.mock('@/lib/ipcClient', () => ({
  ipcClient: createMockIpcClient(),
}));

describe('Smoke routes — chargement des pages', () => {
  beforeEach(() => {
    resetAuthStore();
    navigateTo('/');
  });

  afterEach(() => {
    cleanup();
  });

  it.each(SMOKE_ROUTES)('charge %s sans erreur fatale', async (route) => {
    renderAuthenticatedApp();
    navigateTo(route);

    await waitFor(
      () => {
        expect(screen.queryByText("Une erreur inattendue s'est produite")).not.toBeInTheDocument();
        expect(screen.queryByText('Module temporairement indisponible')).not.toBeInTheDocument();
      },
      { timeout: 8_000 },
    );
  });
});
