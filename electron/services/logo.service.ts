import Electron from '../lib/electronApi';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from '../lib/nodePath';
import { pathToFileURL } from 'node:url';
import { getDatabase, getDataDirectory } from '../database/sqlite';
import { resolveBundledLogosDirectory } from '../utils/paths';

const LOGO_SCHEME = 'hmp-logo';
const MAX_LOGO_BYTES = 512 * 1024;
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

/** Logos applicatifs (hôtels) — userData/data/logos */
export function getAppLogosDirectory(): string {
  return path.join(getDataDirectory(), 'logos');
}

export function getHotelLogosDirectory(): string {
  return path.join(getAppLogosDirectory(), 'hotels');
}

export function getCompanyBrandingDirectory(): string {
  return path.join(getAppLogosDirectory(), 'company');
}

export type CompanyBrandAsset = 'logo' | 'report-header' | 'report-footer';

/** Logos embarqués / projet — assets/logos */
export function getProjectLogosDirectory(): string {
  return resolveBundledLogosDirectory();
}

export function ensureLogoDirectories(): void {
  mkdirSync(getHotelLogosDirectory(), { recursive: true });
  mkdirSync(getCompanyBrandingDirectory(), { recursive: true });
  mkdirSync(path.join(getAppLogosDirectory(), 'assets'), { recursive: true });
  seedBundledLogosIfNeeded();
}

function seedBundledLogosIfNeeded(): void {
  const targetDir = path.join(getAppLogosDirectory(), 'assets');
  const bundledDir = getProjectLogosDirectory();
  if (!existsSync(bundledDir)) return;

  for (const file of ['app-logo.svg', 'default-hotel.svg']) {
    const src = path.join(bundledDir, file);
    const dest = path.join(targetDir, file);
    if (existsSync(src) && !existsSync(dest)) {
      copyFileSync(src, dest);
    }
  }
}

export function toLogoUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath?.trim()) return null;
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${LOGO_SCHEME}:///${normalized}`;
}

export function resolveLogoAbsolutePath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..')) return null;

  if (normalized.startsWith('assets/')) {
    const appAsset = path.join(getAppLogosDirectory(), normalized);
    if (existsSync(appAsset)) return appAsset;
    const projectAsset = path.join(getProjectLogosDirectory(), path.basename(normalized));
    if (existsSync(projectAsset)) return projectAsset;
    return null;
  }

  if (normalized.startsWith('hotels/')) {
    const hotelFile = path.join(getAppLogosDirectory(), normalized);
    if (existsSync(hotelFile)) return hotelFile;
    return null;
  }

  if (normalized.startsWith('company/')) {
    const companyFile = path.join(getAppLogosDirectory(), normalized);
    if (existsSync(companyFile)) return companyFile;
    return null;
  }

  return null;
}

export function resolveLogoFileUrl(relativePath: string): string | null {
  const abs = resolveLogoAbsolutePath(relativePath);
  return abs ? pathToFileURL(abs).href : null;
}

export function getDefaultHotelLogoUrl(): string {
  return toLogoUrl('assets/default-hotel.svg')!;
}

export function resolveHotelLogoUrl(logoFile: string | null | undefined): string | null {
  if (logoFile?.trim() && resolveLogoAbsolutePath(logoFile)) {
    return toLogoUrl(logoFile);
  }
  return getDefaultHotelLogoUrl();
}

function assertFileSize(filePath: string): void {
  const size = statSync(filePath).size;
  if (size > MAX_LOGO_BYTES) {
    throw new Error('Logo trop volumineux (max 512 Ko).');
  }
}

function sanitizeExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Format non supporté (PNG, JPG, WEBP, SVG).');
  }
  return ext;
}

export function saveHotelLogoFromFile(hotelUuid: string, sourcePath: string): string {
  ensureLogoDirectories();
  assertFileSize(sourcePath);
  const ext = sanitizeExt(sourcePath);
  const relativePath = `hotels/${hotelUuid}${ext}`;
  const destPath = path.join(getAppLogosDirectory(), relativePath);

  for (const oldExt of ALLOWED_EXT) {
    const candidate = path.join(getHotelLogosDirectory(), `${hotelUuid}${oldExt}`);
    if (existsSync(candidate)) unlinkSync(candidate);
  }

  copyFileSync(sourcePath, destPath);
  return relativePath;
}

export function deleteHotelLogoFile(logoFile: string | null | undefined): void {
  if (!logoFile?.trim()) return;
  const abs = resolveLogoAbsolutePath(logoFile);
  if (abs && existsSync(abs)) {
    unlinkSync(abs);
  }
}

function deleteCompanyAssetFiles(asset: CompanyBrandAsset): void {
  for (const ext of ALLOWED_EXT) {
    const candidate = path.join(getCompanyBrandingDirectory(), `${asset}${ext}`);
    if (existsSync(candidate)) unlinkSync(candidate);
  }
}

export function saveCompanyBrandAssetFromFile(asset: CompanyBrandAsset, sourcePath: string): string {
  ensureLogoDirectories();
  assertFileSize(sourcePath);
  const ext = sanitizeExt(sourcePath);
  deleteCompanyAssetFiles(asset);
  const relativePath = `company/${asset}${ext}`;
  copyFileSync(sourcePath, path.join(getAppLogosDirectory(), relativePath));
  return relativePath;
}

export function deleteCompanyBrandAsset(relativePath: string | null | undefined): void {
  deleteHotelLogoFile(relativePath);
}

export function resolveCompanyBrandUrl(relativePath: string | null | undefined): string | null {
  if (relativePath?.trim() && resolveLogoAbsolutePath(relativePath)) {
    return toLogoUrl(relativePath);
  }
  return null;
}

export async function pickBrandImageFile(title: string): Promise<string | null> {
  const { canceled, filePaths } = await Electron.dialog.showOpenDialog({
    title,
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0] ?? null;
}

export async function pickHotelLogoFile(): Promise<string | null> {
  const { canceled, filePaths } = await Electron.dialog.showOpenDialog({
    title: 'Choisir un logo',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] },
    ],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0] ?? null;
}

/** Migre les anciens logos base64 (logo_data) vers des fichiers. */
export function migrateLegacyLogosFromDatabase(): void {
  ensureLogoDirectories();
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, uuid, logo_data, logo_file FROM hotels WHERE deleted_at IS NULL AND logo_data IS NOT NULL AND logo_data != ''`,
    )
    .all() as Array<{
      id: number;
      uuid: string;
      logo_data: string;
      logo_file: string | null;
    }>;

  const update = db.prepare(
    `UPDATE hotels SET logo_file = ?, logo_data = NULL, updated_at = datetime('now') WHERE id = ?`,
  );

  for (const row of rows) {
    if (row.logo_file?.trim()) {
      update.run(row.logo_file, row.id);
      continue;
    }
    try {
      const relativePath = saveHotelLogoFromDataUrl(row.uuid, row.logo_data);
      update.run(relativePath, row.id);
    } catch {
      /* conserver logo_data si migration impossible */
    }
  }
}

function saveHotelLogoFromDataUrl(hotelUuid: string, dataUrl: string): string {
  const match = /^data:image\/(\w+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Format logo legacy invalide.');
  }
  const format = match[1]!.toLowerCase();
  const ext = format === 'jpeg' ? '.jpg' : `.${format}`;
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Format logo legacy non supporté.');
  }
  const buffer = Buffer.from(match[2]!, 'base64');
  if (buffer.length > MAX_LOGO_BYTES) {
    throw new Error('Logo legacy trop volumineux.');
  }

  ensureLogoDirectories();
  const relativePath = `hotels/${hotelUuid}${ext}`;
  const destPath = path.join(getAppLogosDirectory(), relativePath);

  for (const oldExt of ALLOWED_EXT) {
    const candidate = path.join(getHotelLogosDirectory(), `${hotelUuid}${oldExt}`);
    if (existsSync(candidate)) unlinkSync(candidate);
  }

  writeFileSync(destPath, buffer);
  return relativePath;
}

export function getAppLogoUrl(): string {
  seedBundledLogosIfNeeded();
  const appAsset = path.join(getAppLogosDirectory(), 'assets', 'app-logo.svg');
  if (existsSync(appAsset)) {
    return toLogoUrl('assets/app-logo.svg')!;
  }
  return toLogoUrl('assets/app-logo.svg')!;
}
