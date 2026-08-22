import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cable,
  CreditCard,
  KeyRound,
  PhoneCall,
  PlugZap,
  Printer,
  QrCode,
  RefreshCw,
  Tv,
} from 'lucide-react';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';

type Tab = 'devices' | 'queue' | 'payments' | 'keys' | 'hotel' | 'documents';
type Device = {
  id: number;
  code: string;
  nom: string;
  type: string;
  provider: string;
  driver: string;
  endpoint?: string;
  statut: string;
  commandes_attente?: number;
  last_error?: string;
};
type Row = Record<string, any>;

const field = 'rounded-lg border bg-background px-3 py-2 text-sm';
const primary = 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';
const secondary = 'rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50';
const now = () => new Date().toISOString().slice(0, 16);
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);

export default function HardwareIntegrationsPage() {
  const qc = useQueryClient();
  const { operationalHotels, defaultHotelId } = useHotelsList();
  const [hotelId, setHotelId] = useState(0);
  const [tab, setTab] = useState<Tab>('devices');

  useEffect(() => {
    if (!hotelId && defaultHotelId) setHotelId(defaultHotelId);
  }, [defaultHotelId, hotelId]);

  const dashboard = useQuery({
    queryKey: ['hardware-dashboard', hotelId],
    enabled: !!hotelId,
    queryFn: async () => unwrapIpc(await ipcClient.hardware.dashboard(hotelId)) as Row,
  });
  const devices = useQuery({
    queryKey: ['hardware-devices', hotelId],
    enabled: !!hotelId,
    queryFn: async () => unwrapIpc(await ipcClient.hardware.listDevices(hotelId)) as Device[],
  });
  const commands = useQuery({
    queryKey: ['hardware-commands', hotelId],
    enabled: !!hotelId,
    queryFn: async () => unwrapIpc(await ipcClient.hardware.commandLogs(hotelId)) as Row[],
  });
  const payments = useQuery({
    queryKey: ['hardware-payments', hotelId],
    enabled: !!hotelId,
    queryFn: async () => unwrapIpc(await ipcClient.hardware.listPayments(hotelId)) as Row[],
  });
  const keys = useQuery({
    queryKey: ['hardware-keys', hotelId],
    enabled: !!hotelId,
    queryFn: async () => unwrapIpc(await ipcClient.hardware.listRoomKeys(hotelId)) as Row[],
  });
  const calls = useQuery({
    queryKey: ['hardware-pbx', hotelId],
    enabled: !!hotelId,
    queryFn: async () => unwrapIpc(await ipcClient.hardware.listPbxCalls(hotelId)) as Row[],
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ['hardware'] });
  const run = async (fn: () => Promise<void>, success: string) => {
    try {
      await fn();
      refresh();
      notify.success(success);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Opération matérielle impossible');
    }
  };
  const byType = (...types: string[]) => devices.data?.filter((device) => types.includes(device.type)) ?? [];
  const chooseDevice = (types: string[], label: string) => {
    const candidates = byType(...types);
    const id = Number(prompt(`${label} — identifiant :\n${candidates.map((d) => `${d.id} = ${d.nom}`).join('\n')}`, String(candidates[0]?.id ?? '')));
    if (!id || !candidates.some((device) => device.id === id)) throw new Error(`${label} invalide.`);
    return id;
  };

  const addDevice = () => run(async () => {
    const code = prompt('Code du périphérique :', `DEV-${Date.now().toString().slice(-5)}`);
    const nom = prompt('Nom du périphérique :');
    const type = prompt('Type : serrure, encodeur_carte, pbx, iptv, terminal_paiement, scanner, imprimante_fiscale, imprimante_pos', 'terminal_paiement');
    const provider = prompt('Fournisseur / modèle :', type === 'terminal_paiement' ? 'SATIM' : 'Générique');
    const driver = prompt('Pilote : http_json, tcp_raw, escpos_tcp, webhook_inbox, hid_keyboard ou vendor_sdk', type?.startsWith('imprimante') ? 'escpos_tcp' : 'http_json');
    if (!code || !nom || !type || !provider || !driver) return;
    const inbound = ['webhook_inbox', 'hid_keyboard'].includes(driver);
    const endpoint = inbound ? undefined : prompt(driver.includes('tcp') ? 'Adresse (tcp://hôte:port) :' : 'URL HTTP(S) :') ?? undefined;
    const secretRef = driver === 'http_json' ? prompt('Variable d’environnement du secret (optionnel) :', '') || undefined : undefined;
    unwrapIpc(await ipcClient.hardware.saveDevice({ hotelId, code, nom, type, provider, driver, endpoint, secretRef, actif: true }));
  }, 'Périphérique configuré');

  const manualCommand = () => run(async () => {
    const deviceId = chooseDevice((devices.data ?? []).map((d) => d.type), 'Périphérique');
    const commandType = prompt('Commande technique :', 'health.check');
    if (!commandType) return;
    const raw = prompt('Payload JSON :', '{}') ?? '{}';
    unwrapIpc(await ipcClient.hardware.queueCommand({ deviceId, commandType, payload: JSON.parse(raw) }));
  }, 'Commande ajoutée à la file');

  const startPayment = () => run(async () => {
    const deviceId = chooseDevice(['terminal_paiement'], 'Terminal de paiement');
    const provider = (prompt('Réseau : CIB, EDAHABIA, SATIM ou AUTRE', 'SATIM') ?? 'SATIM').toUpperCase();
    const montant = Number(prompt('Montant DZD :', '1000'));
    const reservationId = Number(prompt('Réservation liée (optionnel) :', '')) || undefined;
    unwrapIpc(await ipcClient.hardware.startPayment({ deviceId, provider, montant, reservationId }));
  }, 'Paiement envoyé au terminal');

  const issueKey = () => run(async () => {
    const deviceId = chooseDevice(['serrure', 'encodeur_carte'], 'Encodeur / serrure');
    const reservationId = Number(prompt('Identifiant de réservation :'));
    if (!reservationId) return;
    unwrapIpc(await ipcClient.hardware.issueRoomKey({
      deviceId,
      reservationId,
      supportUid: prompt('UID de carte (optionnel) :', '') || undefined,
      validFrom: prompt('Valide à partir de :', now()),
      validTo: prompt('Valide jusqu’au :', tomorrow()),
    }));
  }, 'Clé envoyée à l’encodeur');

  const ingestCall = () => run(async () => {
    const deviceId = chooseDevice(['pbx'], 'PBX');
    unwrapIpc(await ipcClient.hardware.ingestPbxCall({
      deviceId,
      externalId: prompt('Identifiant PBX :', `CALL-${Date.now()}`),
      chambreId: Number(prompt('Identifiant chambre :', '')) || undefined,
      extension: prompt('Extension :', '') || undefined,
      startedAt: prompt('Début :', now()),
      dureeSecondes: Number(prompt('Durée en secondes :', '60')),
      destination: prompt('Destination :', '') || undefined,
      cout: Number(prompt('Coût à transférer au folio DZD :', '0')),
    }));
  }, 'Appel PBX importé et folio mis à jour');

  const setIptv = (revoke = false) => run(async () => {
    const deviceId = chooseDevice(['iptv'], 'Contrôleur IPTV');
    const reservationId = Number(prompt('Identifiant de réservation :'));
    if (!reservationId) return;
    unwrapIpc(await ipcClient.hardware.setIptvAccess({
      deviceId,
      reservationId,
      profil: prompt('Profil IPTV :', 'standard') ?? 'standard',
      validFrom: prompt('Valide à partir de :', now()),
      validTo: prompt('Valide jusqu’au :', tomorrow()),
      revoke,
    }));
  }, revoke ? 'Accès IPTV révoqué' : 'Accès IPTV envoyé');

  const captureScan = () => run(async () => {
    const deviceId = chooseDevice(['scanner'], 'Scanner');
    unwrapIpc(await ipcClient.hardware.captureScan({
      deviceId,
      reservationId: Number(prompt('Identifiant réservation (optionnel) :', '')) || undefined,
      clientId: Number(prompt('Identifiant client (optionnel) :', '')) || undefined,
      typeDocument: prompt('Type de document :', 'passeport'),
      documentNumber: prompt('Numéro du document :', '') || undefined,
      barcodeValue: prompt('Code-barres / MRZ :', '') || undefined,
      filePath: prompt('Chemin du fichier numérisé :', '') || undefined,
    }));
  }, 'Numérisation rattachée au dossier');

  const fiscalPrint = () => run(async () => {
    const deviceId = chooseDevice(['imprimante_fiscale', 'imprimante_pos'], 'Imprimante');
    const documentType = prompt('Document : ticket, facture, avoir ou rapport_z', 'ticket') ?? 'ticket';
    const numeroDocument = prompt('Numéro du document :', `DOC-${Date.now()}`);
    if (!numeroDocument) return;
    const montantTtc = Number(prompt('Montant TTC DZD :', '0'));
    unwrapIpc(await ipcClient.hardware.queueFiscalPrint({
      deviceId,
      documentType,
      numeroDocument,
      montantTtc,
      payload: { lines: [numeroDocument, `TOTAL ${montantTtc.toLocaleString()} DZD`] },
    }));
  }, 'Impression ajoutée à la file');

  const kpis = [
    ['Périphériques actifs', dashboard.data?.devices?.actifs ?? 0, PlugZap],
    ['Commandes en attente', dashboard.data?.commands?.attente ?? 0, RefreshCw],
    ['Paiements autorisés', `${Number(dashboard.data?.payments?.autorise ?? 0).toLocaleString()} DA`, CreditCard],
    ['Clés actives', dashboard.data?.keys?.actives ?? 0, KeyRound],
  ] as const;

  return <div className="space-y-5 p-6">
    <header className="flex flex-wrap items-center gap-3">
      <div><h1 className="text-2xl font-bold">Intégrations matérielles</h1><p className="text-sm text-muted-foreground">Serrures, PBX/IPTV, paiements algériens, scanners et impressions POS/fiscales</p></div>
      <select className={`${field} ml-auto`} value={hotelId} onChange={(event) => setHotelId(Number(event.target.value))}>
        {operationalHotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
      </select>
    </header>
    <aside className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      Les pilotes HTTP, TCP et ESC/POS sont exécutables. Les pilotes <b>vendor_sdk</b> restent bloqués jusqu’à l’installation du SDK certifié, des certificats et des secrets du fournisseur — notamment l’homologation SATIM/CIB/Edahabia.
    </aside>
    <div className="grid gap-3 md:grid-cols-4">{kpis.map(([label, value, Icon]) => <article key={label} className="rounded-xl border bg-card p-4"><span className="flex gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</span><b className="mt-2 block text-2xl">{value}</b></article>)}</div>
    <nav className="flex flex-wrap gap-1 border-b">{([
      ['devices', 'Périphériques'], ['queue', 'File & logs'], ['payments', 'Paiements'], ['keys', 'Serrures'], ['hotel', 'PBX & IPTV'], ['documents', 'Scans & impressions'],
    ] as [Tab, string][]).map(([id, label]) => <button key={id} className={`px-4 py-2 text-sm ${tab === id ? 'border-b-2 border-primary font-semibold' : 'text-muted-foreground'}`} onClick={() => setTab(id)}>{label}</button>)}</nav>

    {tab === 'devices' && <section><button className={`${primary} mb-3`} onClick={() => void addDevice()}><Cable className="mr-1 inline h-4 w-4" />Configurer un périphérique</button><div className="grid gap-3 md:grid-cols-3">{devices.data?.map((device) => <article key={device.id} className="rounded-xl border bg-card p-4"><div className="flex"><b>{device.code} · {device.nom}</b><Status value={device.statut} /></div><p className="mt-2 text-xs text-muted-foreground">{device.type} · {device.provider} · {device.driver}</p><p className="break-all text-xs">{device.endpoint ?? 'Entrée locale / SDK'}</p><p className="mt-2 text-xs">{device.commandes_attente ?? 0} commande(s) en attente</p>{device.driver === 'vendor_sdk' && <p className="mt-2 text-xs font-medium text-amber-700">SDK fournisseur requis</p>}{device.last_error && <p className="mt-2 text-xs text-red-700">{device.last_error}</p>}</article>)}</div></section>}

    {tab === 'queue' && <section><div className="mb-3 flex gap-2"><button className={primary} onClick={() => void manualCommand()}>Nouvelle commande</button><button className={secondary} onClick={refresh}><RefreshCw className="mr-1 inline h-4 w-4" />Actualiser</button></div><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="p-3 text-left">Commande</th><th>Périphérique</th><th>État</th><th>Tentatives</th><th>Erreur / réponse</th><th /></tr></thead><tbody>{commands.data?.map((command) => <tr key={command.id} className="border-t"><td className="p-3">#{command.id} · {command.command_type}</td><td className="text-center">{command.device_code}</td><td className="text-center"><Status value={command.statut} /></td><td className="text-center">{command.attempts}/5</td><td className="max-w-xs truncate text-xs">{command.last_error ?? command.response_json ?? '—'}</td><td className="p-2"><button className={secondary} disabled={!['pending', 'failed'].includes(command.statut)} onClick={() => void run(async () => { unwrapIpc(await ipcClient.hardware.dispatchCommand(command.id)); }, 'Commande acquittée')}>Exécuter</button></td></tr>)}</tbody></table></div></section>}

    {tab === 'payments' && <section><button className={`${primary} mb-3`} onClick={() => void startPayment()}><CreditCard className="mr-1 inline h-4 w-4" />Nouveau paiement</button><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="p-3 text-left">Référence</th><th>Réseau</th><th>Opération</th><th>Montant</th><th>État</th><th /></tr></thead><tbody>{payments.data?.map((payment) => <tr key={payment.id} className="border-t"><td className="p-3">{payment.reference}</td><td className="text-center">{payment.provider}</td><td className="text-center">{payment.operation}</td><td className="text-center">{Number(payment.montant).toLocaleString()} DA</td><td className="text-center"><Status value={payment.statut} /></td><td className="space-x-2 p-2">{payment.operation === 'vente' && payment.statut === 'autorisee' && <><button className={secondary} onClick={() => void run(async () => { unwrapIpc(await ipcClient.hardware.reversePayment(payment.id, 'remboursement')); }, 'Remboursement envoyé')}>Rembourser</button><button className={secondary} onClick={() => void run(async () => { unwrapIpc(await ipcClient.hardware.reversePayment(payment.id, 'annulation')); }, 'Annulation envoyée')}>Annuler</button></>}</td></tr>)}</tbody></table></div></section>}

    {tab === 'keys' && <section><button className={`${primary} mb-3`} onClick={() => void issueKey()}><KeyRound className="mr-1 inline h-4 w-4" />Émettre une clé</button><div className="grid gap-3 md:grid-cols-3">{keys.data?.map((key) => <article key={key.id} className="rounded-xl border bg-card p-4"><div className="flex"><b>Chambre {key.chambre_numero}</b><Status value={key.statut} /></div><p className="text-sm">{key.client_nom}</p><p className="text-xs text-muted-foreground">{key.valid_from} → {key.valid_to}<br />{key.credential_reference}</p>{key.statut === 'active' && <button className={`${secondary} mt-3`} onClick={() => void run(async () => { unwrapIpc(await ipcClient.hardware.revokeRoomKey(key.id)); }, 'Révocation envoyée')}>Révoquer</button>}</article>)}</div></section>}

    {tab === 'hotel' && <section className="space-y-4"><div className="flex flex-wrap gap-2"><button className={primary} onClick={() => void ingestCall()}><PhoneCall className="mr-1 inline h-4 w-4" />Importer un appel PBX</button><button className={secondary} onClick={() => void setIptv()}><Tv className="mr-1 inline h-4 w-4" />Autoriser IPTV</button><button className={secondary} onClick={() => void setIptv(true)}>Révoquer IPTV</button></div><div className="rounded-xl border bg-card p-4"><h2 className="mb-2 font-semibold">Derniers appels PBX</h2>{calls.data?.map((call) => <p key={call.id} className="border-t py-2 text-sm">{call.started_at} · chambre {call.chambre_numero ?? '—'} · {call.destination ?? '—'} · {call.duree_secondes}s · {Number(call.cout).toLocaleString()} DA {call.folio_line_id ? '· transféré au folio' : ''}</p>)}</div></section>}

    {tab === 'documents' && <section className="grid gap-4 md:grid-cols-2"><article className="rounded-xl border bg-card p-5"><QrCode className="h-7 w-7 text-primary" /><h2 className="mt-2 font-semibold">Scanner et codes-barres</h2><p className="text-sm text-muted-foreground">Capture passeport, pièce d’identité, MRZ et code-barres avec rattachement au client ou à la réservation.</p><button className={`${primary} mt-4`} onClick={() => void captureScan()}>Enregistrer une capture</button></article><article className="rounded-xl border bg-card p-5"><Printer className="h-7 w-7 text-primary" /><h2 className="mt-2 font-semibold">Impression fiscale et POS</h2><p className="text-sm text-muted-foreground">Tickets, factures, avoirs et rapports Z, avec idempotence, reprise sur erreur et référence fiscale.</p><button className={`${primary} mt-4`} onClick={() => void fiscalPrint()}>Mettre en impression</button></article></section>}
  </div>;
}

function Status({ value }: { value: string }) {
  const good = ['actif', 'active', 'acknowledged', 'autorisee', 'printed'].includes(value);
  const bad = ['erreur', 'error', 'dead', 'failed', 'refusee'].includes(value);
  return <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${good ? 'bg-emerald-100 text-emerald-800' : bad ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{value}</span>;
}
