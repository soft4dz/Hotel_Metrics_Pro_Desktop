import { useCallback, useEffect, useState } from 'react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  ClientContact,
  ClientFilters,
  ClientItem,
  ClientItemDetail,
  ClientsDashboard,
  CreateClientInput,
  CreateContactInput,
} from '@/shared/types/clients';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useClientsDashboard() {
  const [data, setData] = useState<ClientsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(unwrapIpc(await ipcClient.clients.getDashboard()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ── List ──────────────────────────────────────────────────────────────────────

export function useClients(initialFilters?: ClientFilters) {
  const [filters, setFilters] = useState<ClientFilters>(initialFilters ?? {});
  const [items, setItems] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(unwrapIpc(await ipcClient.clients.list(filters)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement clients');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (input: CreateClientInput) => {
    const c = unwrapIpc(await ipcClient.clients.create(input));
    setItems((prev) => [...prev, c].sort((a, b) => a.nom.localeCompare(b.nom)));
    return c;
  }, []);

  const update = useCallback(async (id: number, input: Partial<CreateClientInput>) => {
    const c = unwrapIpc(await ipcClient.clients.update(id, input));
    setItems((prev) => prev.map((x) => (x.id === id ? c : x)));
    return c;
  }, []);

  const toggleActif = useCallback(async (id: number) => {
    const c = unwrapIpc(await ipcClient.clients.toggleActif(id));
    setItems((prev) => prev.map((x) => (x.id === id ? c : x)));
    return c;
  }, []);

  const remove = useCallback(async (id: number) => {
    unwrapIpc(await ipcClient.clients.delete(id));
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { items, loading, error, filters, setFilters, reload: load, create, update, toggleActif, remove };
}

// ── Single client (detail avec contacts) ─────────────────────────────────────

export function useClientDetail(id: number | null) {
  const [client, setClient] = useState<ClientItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setClient(unwrapIpc(await ipcClient.clients.get(id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement client');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const update = useCallback(async (input: Partial<CreateClientInput>) => {
    if (!id) throw new Error('ID manquant');
    const c = unwrapIpc(await ipcClient.clients.update(id, input));
    setClient(c);
    return c;
  }, [id]);

  const toggleActif = useCallback(async () => {
    if (!id) throw new Error('ID manquant');
    const c = unwrapIpc(await ipcClient.clients.toggleActif(id));
    setClient(c);
    return c;
  }, [id]);

  // ── Contacts ──────────────────────────────────────────────────────────────

  const createContact = useCallback(async (input: CreateContactInput) => {
    if (!id) throw new Error('ID manquant');
    const contact = unwrapIpc(await ipcClient.clients.createContact(id, input));
    setClient((prev) => prev ? { ...prev, contacts: [...prev.contacts, contact].sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0)) } : prev);
    return contact;
  }, [id]);

  const updateContact = useCallback(async (contactId: number, input: Partial<CreateContactInput>) => {
    const contact = unwrapIpc(await ipcClient.clients.updateContact(contactId, input));
    setClient((prev) => {
      if (!prev) return prev;
      const contacts = prev.contacts.map((c) => (c.id === contactId ? contact : c));
      if (input.principal) {
        contacts.forEach((c) => { if (c.id !== contactId) c.principal = false; });
      }
      return { ...prev, contacts: contacts.sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0)) };
    });
    return contact;
  }, []);

  const deleteContact = useCallback(async (contactId: number) => {
    unwrapIpc(await ipcClient.clients.deleteContact(contactId));
    setClient((prev) => prev ? { ...prev, contacts: prev.contacts.filter((c) => c.id !== contactId) } : prev);
  }, []);

  return { client, loading, error, reload: load, update, toggleActif, createContact, updateContact, deleteContact };
}

// ── Contacts seuls (usage indépendant) ───────────────────────────────────────

export function useClientContacts(clientId: number | null) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      setContacts(unwrapIpc(await ipcClient.clients.listContacts(clientId)));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);
  return { contacts, loading, reload: load };
}
