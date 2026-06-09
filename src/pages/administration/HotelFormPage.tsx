import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionBlock } from '@/components/common/SectionBlock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { hasCustomHotelLogo } from '@/lib/logos';
import type { RubriqueListItem } from '@/shared/types/admin';

const RUB_COLORS: Record<string, string> = {
  HEBERGEMENT:  '#1E3A8A',
  RESTAURATION: '#F97316',
  BOISSONS:     '#16A34A',
  LOCATIONS:    '#7C3AED',
  PORT:         '#0891B2',
  AUTRES:       '#64748B',
};

export function HotelFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id && id !== 'new');
  const navigate = useNavigate();

  const [code,     setCode]     = useState('');
  const [name,     setName]     = useState('');
  const [city,     setCity]     = useState('');
  const [isActive, setIsActive] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  const [allRubriques, setAllRubriques] = useState<RubriqueListItem[]>([]);
  const [checkedRubs,  setCheckedRubs]  = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(isEdit);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!isEdit || !id) { setLoading(false); return; }
    const load = async () => {
      try {
        const [hotel, rubriques] = await Promise.all([
          ipcClient.hotels.get(Number(id)),
          ipcClient.rubriques.list(),
        ]);
        const h = unwrapIpc(hotel);
        if (!h) { setError('Hôtel introuvable'); return; }
        setCode(h.code);
        setName(h.name);
        setCity(h.city ?? '');
        setIsActive(h.isActive);
        setLogoUrl(h.logoUrl ?? null);
        setLogoFile(h.logoFile ?? null);

        const allRubs = unwrapIpc(rubriques);
        const parentIds = new Set(
          allRubs.filter((r) => r.parentId !== null).map((r) => r.parentId as number),
        );
        const rubs = allRubs.filter((r) => r.isActive && !parentIds.has(r.id));
        setAllRubriques(rubs);
        // Empty rubriqueIds means all rubriques apply → check all
        const initialIds = h.rubriqueIds.length === 0
          ? new Set(rubs.map((r) => r.id))
          : new Set(h.rubriqueIds);
        setCheckedRubs(initialIds);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, isEdit]);

  const handlePickLogo = async () => {
    if (!id) return;
    setLogoLoading(true);
    setError('');
    try {
      const updated = unwrapIpc(await ipcClient.hotels.pickLogo(Number(id)));
      setLogoUrl(updated.logoUrl ?? null);
      setLogoFile(updated.logoFile ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!id) return;
    setLogoLoading(true);
    setError('');
    try {
      const updated = unwrapIpc(await ipcClient.hotels.removeLogo(Number(id)));
      setLogoUrl(updated.logoUrl ?? null);
      setLogoFile(updated.logoFile ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        // Empty array = all rubriques; send [] when all are checked
        const rubriqueIds = checkedRubs.size === allRubriques.length
          ? []
          : Array.from(checkedRubs);
        unwrapIpc(await ipcClient.hotels.update(Number(id), {
          code,
          name,
          city: city || null,
          isActive,
          rubriqueIds,
        }));
      } else {
        unwrapIpc(await ipcClient.hotels.create({
          code,
          name,
          city: city || null,
          isActive,
        }));
      }
      navigate('/admin/hotels');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="page-shell">
      <PageHeader
        title={isEdit ? "Modifier l'hôtel" : 'Nouvel hôtel'}
        backTo="/admin/hotels"
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
        {/* ── Informations générales ─────────────────────── */}
        <SectionBlock
          title="Informations générales"
          description="Identifiant, nom et localisation de l'unité"
        >
          <div className="grid max-w-lg gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs font-medium">Code unité</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ex. HTL01"
                className="h-9 text-sm font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">Nom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs font-medium">Ville</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              <Label htmlFor="isActive" className="cursor-pointer text-sm">Unité active</Label>
            </div>
          </div>
        </SectionBlock>

        {/* ── Logo ───────────────────────────────────────── */}
        {isEdit && (
          <SectionBlock
            title="Logo de l'unité"
            description="Enregistré dans le dossier data/logos/hotels/ de l'application"
          >
            <div className="flex items-start gap-6">
              <div
                className={cn(
                  'flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary/40 transition-colors',
                  logoUrl && 'border-solid border-primary/20 bg-card',
                )}
              >
                {logoLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <ImagePlus className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.5} />
                    <span className="text-[10px] text-muted-foreground/60">Aucun logo</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP ou SVG — max 512 Ko. Fichier copié dans{' '}
                  <code className="rounded bg-muted px-1">data/logos/hotels/</code>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    onClick={() => void handlePickLogo()}
                    disabled={logoLoading}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    {hasCustomHotelLogo(logoFile) ? 'Changer le logo' : 'Choisir un logo'}
                  </Button>
                  {hasCustomHotelLogo(logoFile) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-1.5 text-destructive hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                      onClick={() => void handleRemoveLogo()}
                      disabled={logoLoading}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </SectionBlock>
        )}

        {/* ── Rubriques actives ──────────────────────────── */}
        {isEdit && allRubriques.length > 0 && (
          <SectionBlock
            title="Rubriques actives"
            description="Cochez les rubriques applicables à cette unité. Si toutes sont cochées, toutes les rubriques actives s'appliquent automatiquement."
          >
            {/* Group by parent label */}
            {(() => {
              const groups = new Map<string, typeof allRubriques>();
              for (const r of allRubriques) {
                const key = r.parentLabel ?? r.label;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(r);
              }
              return [...groups.entries()].map(([group, rubs]) => (
                <div key={group} className="mb-4">
                  {groups.size > 1 && (
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group}
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {rubs.map((r) => {
                      const checked = checkedRubs.has(r.id);
                      const color = RUB_COLORS[r.code] ?? RUB_COLORS[r.parentLabel?.toUpperCase().replace(/ /g, '_') ?? ''] ?? '#94A3B8';
                      return (
                        <label
                          key={r.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                            checked
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-border bg-secondary/20 opacity-60',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setCheckedRubs((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(r.id);
                                else next.delete(r.id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                          />
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: color }}
                          />
                          <span className="truncate font-medium">{r.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
            <p className="mt-1 text-xs text-muted-foreground">
              {checkedRubs.size === allRubriques.length
                ? 'Toutes les rubriques sont actives pour cette unité.'
                : `${checkedRubs.size} / ${allRubriques.length} rubriques sélectionnées.`}
            </p>
          </SectionBlock>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="cursor-pointer gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate('/admin/hotels')}
          >
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
