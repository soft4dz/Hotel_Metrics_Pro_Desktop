import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  ClientFilters,
  CreateClientInput,
  CreateContactInput,
} from '@/shared/types/clients';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useClientsDashboard() {
  const { data = null, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['clients-dashboard'],
    queryFn: async () => unwrapIpc(await ipcClient.clients.getDashboard()),
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement' : null;
  return { data, loading, error, reload: () => { void refetch(); } };
}

// ── List ──────────────────────────────────────────────────────────────────────

export function useClients(initialFilters?: ClientFilters) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ClientFilters>(initialFilters ?? {});

  const { data: items = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => unwrapIpc(await ipcClient.clients.list(filters)),
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement clients' : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['clients'] });

  const create = async (input: CreateClientInput) => {
    const c = unwrapIpc(await ipcClient.clients.create(input));
    await invalidate();
    return c;
  };

  const update = async (id: number, input: Partial<CreateClientInput>) => {
    const c = unwrapIpc(await ipcClient.clients.update(id, input));
    await invalidate();
    return c;
  };

  const toggleActif = async (id: number) => {
    const c = unwrapIpc(await ipcClient.clients.toggleActif(id));
    await invalidate();
    return c;
  };

  const remove = async (id: number) => {
    unwrapIpc(await ipcClient.clients.delete(id));
    await invalidate();
  };

  return { items, loading, error, filters, setFilters, reload: () => { void refetch(); }, create, update, toggleActif, remove };
}

// ── Single client detail ──────────────────────────────────────────────────────

export function useClientDetail(id: number | null) {
  const qc = useQueryClient();
  const key = ['client-detail', id];

  const { data: client = null, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrapIpc(await ipcClient.clients.get(id!)),
    enabled: !!id,
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement client' : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const update = async (input: Partial<CreateClientInput>) => {
    if (!id) throw new Error('ID manquant');
    const c = unwrapIpc(await ipcClient.clients.update(id, input));
    await invalidate();
    return c;
  };

  const toggleActif = async () => {
    if (!id) throw new Error('ID manquant');
    const c = unwrapIpc(await ipcClient.clients.toggleActif(id));
    await invalidate();
    return c;
  };

  const createContact = async (input: CreateContactInput) => {
    if (!id) throw new Error('ID manquant');
    const contact = unwrapIpc(await ipcClient.clients.createContact(id, input));
    await invalidate();
    return contact;
  };

  const updateContact = async (contactId: number, input: Partial<CreateContactInput>) => {
    const contact = unwrapIpc(await ipcClient.clients.updateContact(contactId, input));
    await invalidate();
    return contact;
  };

  const deleteContact = async (contactId: number) => {
    unwrapIpc(await ipcClient.clients.deleteContact(contactId));
    await invalidate();
  };

  return { client, loading, error, reload: () => { void refetch(); }, update, toggleActif, createContact, updateContact, deleteContact };
}

// ── Contacts seuls ────────────────────────────────────────────────────────────

export function useClientContacts(clientId: number | null) {
  const { data: contacts = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['client-contacts', clientId],
    queryFn: async () => unwrapIpc(await ipcClient.clients.listContacts(clientId!)),
    enabled: !!clientId,
    staleTime: 30_000,
  });
  return { contacts, loading, reload: () => { void refetch(); } };
}
