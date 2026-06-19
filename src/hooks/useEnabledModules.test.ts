import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useEnabledModules } from './useEnabledModules';

vi.mock('@/lib/ipcClient', () => ({
  ipcClient: {
    modules: {
      listEnabled: vi.fn(),
    },
  },
}));

import { ipcClient } from '@/lib/ipcClient';
const mockListEnabled = ipcClient.modules.listEnabled as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe('useEnabledModules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retourne un Set vide par défaut avant la résolution', () => {
    mockListEnabled.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useEnabledModules(), { wrapper });
    expect(result.current).toBeInstanceOf(Set);
    expect(result.current.size).toBe(0);
  });

  it('retourne un Set avec les modules activés après résolution', async () => {
    mockListEnabled.mockResolvedValue({ ok: true, data: ['rh-productivite', 'portmaster'] });
    const { result } = renderHook(() => useEnabledModules(), { wrapper });
    await waitFor(() => expect(result.current.size).toBe(2));
    expect(result.current.has('rh-productivite')).toBe(true);
    expect(result.current.has('portmaster')).toBe(true);
  });

  it('retourne un Set vide si l\'IPC échoue', async () => {
    mockListEnabled.mockResolvedValue({ ok: false, error: 'Erreur', errorCode: 'SERVER_ERROR' });
    const { result } = renderHook(() => useEnabledModules(), { wrapper });
    await waitFor(() => expect(result.current).toBeInstanceOf(Set));
    expect(result.current.size).toBe(0);
  });
});
