import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from '../lib/nodePath';
import { getDatabase } from '../database/sqlite';
import { resolveGuidesDirectory } from '../utils/paths';
import type { GuideArticle, GuideDetail, GuideSection } from '../../src/shared/types/guide';
import { getGuideSlugForRole, listUserRoleProfiles } from '../../src/shared/constants/userRoleProfiles';

const GUIDE_SECTIONS: GuideSection[] = [
  { id: 'general', label: 'Général', slugs: ['manuel-general', 'readme'] },
  { id: 'direction', label: 'Direction & pilotage', slugs: ['pdg', 'directeur-unite', 'controleur-exploitation'] },
  { id: 'metier', label: 'Métier', slugs: ['responsable-portmaster', 'comptabilite-tresorerie', 'rh-manager', 'chef-departement', 'receptionniste'] },
  { id: 'controle', label: 'Contrôle & sécurité', slugs: ['audit-interne', 'super-admin', 'lecture-seule'] },
];

export function slugFromFilename(filename: string): string {
  const base = filename.replace(/\.md$/i, '');
  const m = base.match(/^\d+-(.+)$/);
  return m ? m[1] : base.toLowerCase().replace(/\s+/g, '-');
}

function extractTitle(content: string, fallback: string): string {
  const line = content.split('\n').find((l) => l.startsWith('# '));
  if (!line) return fallback;
  return line.replace(/^#\s+Guide utilisateur\s+[—–-]\s+/i, '').replace(/^#\s+/, '').trim() || fallback;
}

function extractSummary(content: string): string {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## Rôle') && lines[i + 1]?.trim()) {
      return lines[i + 1].trim().slice(0, 200);
    }
  }
  const para = lines.find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('|'));
  return para?.trim().slice(0, 200) ?? '';
}

function readGuideFile(slug: string): GuideDetail | null {
  const dir = resolveGuidesDirectory();
  const file = readdirSync(dir).find((f) => f.endsWith('.md') && slugFromFilename(f) === slug);
  if (!file) return null;
  const content = readFileSync(path.join(dir, file), 'utf-8');
  const title = extractTitle(content, slug);
  return {
    slug,
    title,
    summary: extractSummary(content),
    filename: file,
    content,
    sectionId: GUIDE_SECTIONS.find((s) => s.slugs.includes(slug))?.id ?? 'general',
  };
}

export function listGuides(): GuideArticle[] {
  const dir = resolveGuidesDirectory();
  const articles: GuideArticle[] = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')) {
    const slug = slugFromFilename(file);
    const content = readFileSync(path.join(dir, file), 'utf-8');
    articles.push({
      slug,
      title: extractTitle(content, slug),
      summary: extractSummary(content),
      filename: file,
      sectionId: GUIDE_SECTIONS.find((s) => s.slugs.includes(slug))?.id ?? 'general',
    });
  }

  return articles.sort((a, b) => a.filename.localeCompare(b.filename, 'fr'));
}

export function getGuide(slug: string): GuideDetail {
  const guide = readGuideFile(slug);
  if (!guide) throw new Error(`Guide « ${slug} » introuvable.`);
  return guide;
}

export function searchGuides(query: string): GuideArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return listGuides();
  return listGuides().filter((g) => {
    if (g.title.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q)) return true;
    try {
      const detail = readGuideFile(g.slug);
      return detail?.content.toLowerCase().includes(q) ?? false;
    } catch {
      return false;
    }
  });
}

export function getGuideSections(): GuideSection[] {
  return GUIDE_SECTIONS;
}

export function getSuggestedGuideSlug(actorUserId: number): string {
  const row = getDatabase()
    .prepare(`
      SELECT r.code FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = ? AND u.deleted_at IS NULL
    `)
    .get(actorUserId) as { code: string } | undefined;
  return getGuideSlugForRole(row?.code);
}

export function listRoleProfiles() {
  return listUserRoleProfiles();
}

export function guideDirectoryExists(): boolean {
  try {
    return existsSync(resolveGuidesDirectory());
  } catch {
    return false;
  }
}
