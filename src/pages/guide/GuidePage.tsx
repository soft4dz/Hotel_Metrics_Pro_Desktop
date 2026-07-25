import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, Search, Sparkles } from 'lucide-react';
import { MarkdownContent } from '@/components/guide/MarkdownContent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import type { GuideArticle, GuideDetail, GuideSection } from '@/shared/types/guide';

export function GuidePage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const [articles, setArticles] = useState<GuideArticle[]>([]);
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [suggestedSlug, setSuggestedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<GuideDetail | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    const [list, secs, suggested] = await Promise.all([
      ipcClient.guide.list(),
      ipcClient.guide.sections(),
      ipcClient.guide.suggested(),
    ]);
    setArticles(unwrapIpc(list));
    setSections(unwrapIpc(secs));
    setSuggestedSlug(unwrapIpc(suggested));
  }, []);

  const loadDetail = useCallback(async (guideSlug: string) => {
    setLoading(true);
    try {
      setDetail(unwrapIpc(await ipcClient.guide.get(guideSlug)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (slug) {
      void loadDetail(slug);
    } else {
      setDetail(null);
      setLoading(false);
    }
  }, [slug, loadDetail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q),
    );
  }, [articles, search]);

  const suggested = articles.find((a) => a.slug === suggestedSlug);

  const bySection = useMemo(() => {
    return sections.map((sec) => ({
      ...sec,
      items: filtered.filter((a) => a.sectionId === sec.id),
    })).filter((s) => s.items.length > 0);
  }, [sections, filtered]);

  if (slug && detail) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/guide" className="hover:text-foreground">Guides</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{detail.title}</span>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {loading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : (
            <MarkdownContent content={detail.content} />
          )}
        </div>
        <Button variant="outline" onClick={() => navigate('/guide')}>
          Retour au catalogue
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Manuel d&apos;utilisation
          </h1>
          <p className="text-muted-foreground mt-1">
            Guides par profil — procédures, accès et bonnes pratiques Raqmi System
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher une procédure…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {suggested && !search && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Guide recommandé pour votre profil
                {role && <Badge variant="muted">{role}</Badge>}
              </p>
              <p className="mt-1 font-semibold">{suggested.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{suggested.summary}</p>
            </div>
            <Button onClick={() => navigate(`/guide/${suggested.slug}`)}>
              Ouvrir
            </Button>
          </div>
        </div>
      )}

      {bySection.map((section) => (
        <section key={section.id}>
          <h2 className="text-lg font-semibold mb-3">{section.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.items.map((article) => (
              <Link
                key={article.slug}
                to={`/guide/${article.slug}`}
                className="rounded-lg border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-colors"
              >
                <p className="font-medium">{article.title}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.summary || 'Guide utilisateur'}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <p className="text-muted-foreground">Aucun guide ne correspond à votre recherche.</p>
      )}
    </div>
  );
}
