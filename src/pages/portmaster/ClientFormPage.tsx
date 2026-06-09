import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { SaveClientInput } from '@/shared/types/portmaster';

export function ClientFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const [typeClient, setTypeClient] = useState<'physique' | 'morale'>('physique');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [nin, setNin] = useState('');
  const [nif, setNif] = useState('');
  const [rc, setRc] = useState('');
  const [representantLegal, setRepresentantLegal] = useState('');
  const [statutDossier, setStatutDossier] = useState('incomplet');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const c = unwrapIpc(await ipcClient.portmaster.getClient(Number(id)));
        if (!c) {
          setError('Client introuvable');
          return;
        }
        setTypeClient(c.typeClient as 'physique' | 'morale');
        setRaisonSociale(c.raisonSociale ?? '');
        setNom(c.nom ?? '');
        setPrenom(c.prenom ?? '');
        setAdresse(c.adresse ?? '');
        setVille(c.ville ?? '');
        setTelephone(c.telephone ?? '');
        setEmail(c.email ?? '');
        setNin(c.nin ?? '');
        setNif(c.nif ?? '');
        setRc(c.rc ?? '');
        setRepresentantLegal(c.representantLegal ?? '');
        setStatutDossier(c.statutDossier);
        setNotes(c.notes ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, isEdit]);

  const buildInput = (): SaveClientInput => ({
    typeClient,
    raisonSociale: typeClient === 'morale' ? raisonSociale : null,
    nom: typeClient === 'physique' ? nom : null,
    prenom: typeClient === 'physique' ? prenom : null,
    adresse: adresse || null,
    ville: ville || null,
    telephone: telephone || null,
    email: email || null,
    nin: nin || null,
    nif: nif || null,
    rc: rc || null,
    representantLegal: representantLegal || null,
    statutDossier,
    notes: notes || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      unwrapIpc(
        await ipcClient.portmaster.saveClient(buildInput(),
          isEdit && id ? Number(id) : undefined,
        ),
      );
      navigate('/portmaster/clients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <PageHeader title={isEdit ? 'Fiche client' : 'Nouveau client'} backTo="/portmaster/clients" />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4">
            <div className="space-y-2">
              <Label>Type de client</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input px-3 text-sm"
                value={typeClient}
                onChange={(e) => setTypeClient(e.target.value as 'physique' | 'morale')}
              >
                <option value="physique">Personne physique</option>
                <option value="morale">Personne morale</option>
              </select>
            </div>

            {typeClient === 'morale' ? (
              <div className="space-y-2">
                <Label>Raison sociale *</Label>
                <Input value={raisonSociale} onChange={(e) => setRaisonSociale(e.target.value)} required />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={nom} onChange={(e) => setNom(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Adresse</Label>
                <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input value={ville} onChange={(e) => setVille(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Statut dossier</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={statutDossier}
                  onChange={(e) => setStatutDossier(e.target.value)}
                >
                  <option value="incomplet">Incomplet</option>
                  <option value="complet">Complet</option>
                  <option value="a_regulariser">À régulariser</option>
                  <option value="bloque">Bloqué</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>NIN</Label>
                <Input value={nin} onChange={(e) => setNin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>NIF</Label>
                <Input value={nif} onChange={(e) => setNif(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>RC</Label>
                <Input value={rc} onChange={(e) => setRc(e.target.value)} />
              </div>
              {typeClient === 'morale' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Représentant légal</Label>
                  <Input
                    value={representantLegal}
                    onChange={(e) => setRepresentantLegal(e.target.value)}
                  />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
