import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  KeyRound,
  Layers,
  List,
  Loader2,
  Server,
  Shield,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PackCatalogTab } from '@/components/PackCatalogTab';
import { RegistryTab } from '@/components/RegistryTab';
import {
  getSavedServerUrl,
  getSavedToken,
  issueRemoteLicense,
  login,
  probeServer,
  saveServerUrl,
  saveToken,
} from '@/lib/api';
import {
  copyText,
  formatLicenseKey,
  loadHistory,
  saveToHistory,
  clearHistory,
  type IssuedLicenseRecord,
} from '@/lib/licenseCrypto';
import { buildLicensePackSummary } from '@/lib/packCatalog';
import {
  EDITIONS,
  SECTOR_OPTIONS,
  sectorLabelFor,
  type BusinessSectorId,
  type LicenseEdition,
} from '@/lib/sectors';

type IssueMode = 'offline' | 'remote';
type MainTab = 'issue' | 'catalog' | 'registry';

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function App() {
  const [mainTab, setMainTab] = useState<MainTab>('issue');
  const [tab, setTab] = useState<IssueMode>('offline');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<IssuedLicenseRecord[]>(() => loadHistory());
  const [lastKey, setLastKey] = useState<string | null>(null);

  const [edition, setEdition] = useState<LicenseEdition>('PRO');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [sector, setSector] = useState<BusinessSectorId>('hotel');
  const [organizationCode, setOrganizationCode] = useState('');
  const [legalName, setLegalName] = useState('');
  const [maxActivations, setMaxActivations] = useState(3);

  const [serverUrl, setServerUrl] = useState(getSavedServerUrl);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(getSavedToken);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    void probeServer(serverUrl).then(setServerOnline);
  }, [serverUrl]);

  const sectorLabel = useMemo(() => sectorLabelFor(sector), [sector]);
  const packPreview = useMemo(() => buildLicensePackSummary(edition, sector), [edition, sector]);

  const resetMessages = () => {
    setError('');
    setSuccess('');
    setCopied(false);
  };

  const handleCopy = async (text: string) => {
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOfflineIssue = async () => {
    resetMessages();
    if (!organizationCode.trim()) {
      setError('Code organisation requis (ex. ORG-ACME).');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      setError('Date d\'expiration invalide.');
      return;
    }
    if (new Date(`${expiresAt}T23:59:59`).getTime() < Date.now()) {
      setError('La date d\'expiration doit être dans le futur.');
      return;
    }

    setBusy(true);
    try {
      const key = await formatLicenseKey(edition, expiresAt, sector);
      setLastKey(key);
      const record = saveToHistory({
        licenseKey: key,
        edition,
        expiresAt,
        businessSector: sector,
        organizationCode: organizationCode.trim().toUpperCase(),
        legalName: legalName.trim() || organizationCode.trim().toUpperCase(),
        mode: 'offline',
      });
      setHistory((h) => [record, ...h.filter((x) => x.id !== record.id)].slice(0, 200));
      setSuccess('Clé générée localement — prête à envoyer au client.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoteIssue = async () => {
    resetMessages();
    if (!token) {
      setError('Connectez-vous au serveur Raqmi d\'abord.');
      return;
    }
    if (!organizationCode.trim() || !legalName.trim()) {
      setError('Code organisation et raison sociale requis.');
      return;
    }

    setBusy(true);
    try {
      saveServerUrl(serverUrl);
      const result = await issueRemoteLicense(serverUrl, token, {
        organizationCode: organizationCode.trim().toUpperCase(),
        legalName: legalName.trim(),
        edition,
        expiresAt,
        businessSector: sector,
        maxActivations,
      });
      setLastKey(result.licenseKey);
      const record = saveToHistory({
        licenseKey: result.licenseKey,
        edition: result.edition,
        expiresAt: result.expiresAt,
        businessSector: result.businessSector,
        organizationCode: result.organizationCode,
        legalName: legalName.trim(),
        mode: 'remote',
      });
      setHistory((h) => [record, ...h.filter((x) => x.id !== record.id)].slice(0, 200));
      setSuccess('Clé enregistrée sur le serveur central et copiée dans l\'historique.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Émission distante impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    resetMessages();
    setBusy(true);
    try {
      saveServerUrl(serverUrl);
      const { accessToken } = await login(serverUrl, loginEmail.trim(), loginPassword);
      saveToken(accessToken);
      setToken(accessToken);
      setLoginPassword('');
      setSuccess('Connecté au serveur Raqmi.');
      setServerOnline(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    saveToken(null);
    setToken(null);
    setSuccess('Déconnecté.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Raqmi License Manager</h1>
              <p className="text-sm text-slate-500">Émission de licences — usage éditeur local</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            {serverOnline === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : serverOnline ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-600" />
            )}
            Serveur {serverOnline ? 'joignable' : serverOnline === false ? 'hors ligne' : '…'}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {([
            ['issue', 'Émission', KeyRound],
            ['catalog', 'Catalogue packs', Layers],
            ['registry', 'Registre', List],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setMainTab(id); resetMessages(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition min-w-[120px] ${
                mainTab === id ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {mainTab === 'catalog' && <PackCatalogTab />}

        {mainTab === 'registry' && <RegistryTab serverUrl={serverUrl} token={token} />}

        {mainTab === 'issue' && (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => { setTab('offline'); resetMessages(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                tab === 'offline' ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Shield className="h-4 w-4" />
              Mode local (offline)
            </button>
            <button
              type="button"
              onClick={() => { setTab('remote'); resetMessages(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                tab === 'remote' ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Server className="h-4 w-4" />
              Serveur central
            </button>
          </div>

          {tab === 'remote' && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Server className="h-4 w-4" />
                Connexion serveur
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-slate-600">URL API</span>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:3001/api/v1"
                  />
                </label>
                {!token ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Email admin</span>
                      <input
                        type="email"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Mot de passe</span>
                      <input
                        type="password"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleLogin()}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
                      >
                        Se connecter
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                      Connecté
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-xs text-slate-500 underline hover:text-slate-700"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-brand" />
              Nouvelle licence
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Édition</span>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value as LicenseEdition)}
                >
                  {EDITIONS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Expiration</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-600">Profil métier (embarqué dans la clé)</span>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                  value={sector}
                  onChange={(e) => setSector(e.target.value as BusinessSectorId)}
                >
                  {SECTOR_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label} ({s.code})</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Pack client : <strong>{packPreview.enabledCount}</strong> modules actifs sur {packPreview.totalModules}.
                </p>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Code organisation</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none ring-brand/30 focus:ring-2"
                  value={organizationCode}
                  onChange={(e) => setOrganizationCode(e.target.value.toUpperCase())}
                  placeholder="ORG-ACME"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Raison sociale client</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="SARL Acme Hôtels"
                />
              </label>

              {tab === 'remote' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Activations max</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                    value={maxActivations}
                    onChange={(e) => setMaxActivations(Number(e.target.value))}
                  />
                </label>
              )}
            </div>

            {(error || success) && (
              <p
                className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                  error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {error || success}
              </p>
            )}

            {lastKey && (
              <div className="mt-4 rounded-xl border border-brand/20 bg-teal-50/50 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand">Clé générée</p>
                <p className="break-all font-mono text-sm font-medium text-slate-900">{lastKey}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>{edition}</span>
                  <span>·</span>
                  <span>{sectorLabel}</span>
                  <span>·</span>
                  <span>expire {expiresAt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy(lastKey)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copié' : 'Copier la clé'}
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {tab === 'offline' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleOfflineIssue()}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Générer la clé (local)
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !token}
                  onClick={() => void handleRemoteIssue()}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                  Émettre via serveur
                </button>
              )}
            </div>

            {tab === 'offline' && (
              <p className="mt-3 text-xs text-slate-500">
                Mode local : la clé est signée sur ce poste (secret <code className="rounded bg-slate-100 px-1">HMP_LICENSE_SECRET</code>).
                Aucune base PostgreSQL requise.
              </p>
            )}
          </section>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Historique local</h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => { clearHistory(); setHistory([]); }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Vider
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune clé émise sur ce poste.</p>
          ) : (
            <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{item.organizationCode}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase ${
                      item.mode === 'remote' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    }`}
                    >
                      {item.mode}
                    </span>
                  </div>
                  <p className="text-slate-600">{item.legalName}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-700">{item.licenseKey}</p>
                  <p className="mt-1 text-slate-500">
                    {item.edition} · {sectorLabelFor(item.businessSector)} · {item.expiresAt}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCopy(item.licenseKey)}
                    className="mt-2 text-brand hover:underline"
                  >
                    Copier
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
        )}
      </main>
    </div>
  );
}
