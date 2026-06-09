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
import type { SaveBateauInput } from '@/shared/types/portmaster';

export function BateauFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const [nom, setNom] = useState('');
  const [immatriculation, setImmatriculation] = useState('');
  const [typeNavire, setTypeNavire] = useState('');
  const [proprietaire, setProprietaire] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTel, setContactTel] = useState('');
  const [longueurM, setLongueurM] = useState('');
  const [largeurM, setLargeurM] = useState('');
  const [statut, setStatut] = useState('actif');
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
        const b = unwrapIpc(await ipcClient.portmaster.getBateau(Number(id)));
        if (!b) {
          setError('Bateau introuvable');
          return;
        }
        setNom(b.nom);
        setImmatriculation(b.immatriculation ?? '');
        setTypeNavire(b.typeNavire ?? '');
        setProprietaire(b.proprietaire);
        setContactEmail(b.contactEmail ?? '');
        setContactTel(b.contactTel ?? '');
        setLongueurM(b.longueurM != null ? String(b.longueurM) : '');
        setLargeurM(b.largeurM != null ? String(b.largeurM) : '');
        setStatut(b.statut);
        setNotes(b.notes ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, isEdit]);

  const buildInput = (): SaveBateauInput => ({
    nom,
    immatriculation: immatriculation || null,
    typeNavire: typeNavire || null,
    proprietaire,
    contactEmail: contactEmail || null,
    contactTel: contactTel || null,
    longueurM: longueurM ? parseFloat(longueurM) : null,
    largeurM: largeurM ? parseFloat(largeurM) : null,
    statut,
    notes: notes || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        unwrapIpc(await ipcClient.portmaster.updateBateau(Number(id), buildInput()));
      } else {
        unwrapIpc(await ipcClient.portmaster.createBateau(buildInput()));
      }
      navigate('/portmaster/bateaux');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifier le bateau' : 'Nouveau bateau'}
        backTo="/portmaster/bateaux"
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nom">Nom du navire *</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="immat">Immatriculation</Label>
                <Input
                  id="immat"
                  value={immatriculation}
                  onChange={(e) => setImmatriculation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input id="type" value={typeNavire} onChange={(e) => setTypeNavire(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prop">Propriétaire *</Label>
                <Input
                  id="prop"
                  value={proprietaire}
                  onChange={(e) => setProprietaire(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tel">Téléphone</Label>
                <Input id="tel" value={contactTel} onChange={(e) => setContactTel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="long">Longueur (m)</Label>
                <Input
                  id="long"
                  type="number"
                  step="0.1"
                  value={longueurM}
                  onChange={(e) => setLongueurM(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="larg">Largeur (m)</Label>
                <Input
                  id="larg"
                  type="number"
                  step="0.1"
                  value={largeurM}
                  onChange={(e) => setLargeurM(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <select
                  id="statut"
                  className="flex h-10 w-full rounded-md border border-input px-3 text-sm"
                  value={statut}
                  onChange={(e) => setStatut(e.target.value)}
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
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
