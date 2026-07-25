import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Color, PDFDocument, PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import { getDatabase } from '../database/sqlite';
import { resolveLogoAbsolutePath } from './logo.service';
import { loadPdfLib, sanitizePdfText } from './rh-legal-export.util';

export interface PdfPageSize {
  width: number;
  height: number;
}

export const PDF_A4_PORTRAIT: PdfPageSize = { width: 595, height: 842 };
export const PDF_A4_LANDSCAPE: PdfPageSize = { width: 842, height: 595 };

const MARGIN_X = 40;
const FOOTER_RESERVE = 58;
const HEADER_TOP_PAD = 18;
const MAX_HEADER_IMAGE_H = 56;
const MAX_FOOTER_IMAGE_H = 36;

function readSetting(key: string, fallback = ''): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value?.trim() ?? fallback;
}

interface LetterheadImages {
  headerImage: PDFImage | null;
  footerImage: PDFImage | null;
  logoImage: PDFImage | null;
}

async function embedBrandImage(pdf: PDFDocument, settingKey: string): Promise<PDFImage | null> {
  const relative = readSetting(settingKey, '');
  if (!relative) return null;
  const abs = resolveLogoAbsolutePath(relative);
  if (!abs || !existsSync(abs)) return null;
  const ext = path.extname(abs).toLowerCase();
  if (ext === '.svg' || ext === '.webp') return null;
  const bytes = readFileSync(abs);
  try {
    if (ext === '.png') return await pdf.embedPng(bytes);
    if (ext === '.jpg' || ext === '.jpeg') return await pdf.embedJpg(bytes);
    return null;
  } catch {
    return null;
  }
}

export interface PdfLetterheadContext {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  rgb: (red: number, green: number, blue: number) => Color;
  y: number;
  pageSize: PdfPageSize;
  marginX: number;
  contentBottom: number;
  pageIndex: number;
  ensureSpace(needed?: number): void;
  newPage(): void;
  draw(text: string, size?: number, isBold?: boolean, x?: number): void;
  finalize(): Promise<Uint8Array>;
}

export async function createPdfWithLetterhead(
  pageSize: PdfPageSize = PDF_A4_PORTRAIT,
): Promise<PdfLetterheadContext> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const headerText = readSetting('report_header', '');
  const footerText = readSetting('report_footer', 'Document genere automatiquement');
  const companyLegalName = readSetting('company_legal_name', readSetting('company_name', 'Raqmi System'));

  const images: LetterheadImages = {
    headerImage: await embedBrandImage(pdf, 'report_header_image_file'),
    footerImage: await embedBrandImage(pdf, 'report_footer_image_file'),
    logoImage: await embedBrandImage(pdf, 'company_logo_file'),
  };

  let page!: PDFPage;
  let y = 0;
  let pageIndex = 0;
  const marginX = MARGIN_X;
  const contentBottom = FOOTER_RESERVE;

  function drawFooter(p: PDFPage, idx: number) {
    let footerBase = 22;
    if (images.footerImage) {
      const maxW = pageSize.width - marginX * 2;
      const scaled = images.footerImage.scale(1);
      const w = Math.min(maxW, scaled.width);
      const h = Math.min(MAX_FOOTER_IMAGE_H, scaled.height * (w / scaled.width));
      p.drawImage(images.footerImage, { x: marginX, y: footerBase + 10, width: w, height: h });
      footerBase += h + 6;
    }
    const line = sanitizePdfText(footerText).slice(0, 120);
    if (line) {
      p.drawText(line, { x: marginX, y: footerBase, size: 8, font, color: rgb(0.4, 0.42, 0.46) });
    }
    const label = sanitizePdfText(`Page ${idx}`);
    const tw = font.widthOfTextAtSize(label, 7);
    p.drawText(label, {
      x: pageSize.width - marginX - tw,
      y: footerBase,
      size: 7,
      font,
      color: rgb(0.55, 0.57, 0.6),
    });
  }

  function drawHeader(p: PDFPage): number {
    let currentY = pageSize.height - HEADER_TOP_PAD;

    if (images.headerImage) {
      const maxW = pageSize.width - marginX * 2;
      const scaled = images.headerImage.scale(1);
      const w = Math.min(maxW, scaled.width);
      const h = Math.min(MAX_HEADER_IMAGE_H, scaled.height * (w / scaled.width));
      currentY -= h;
      p.drawImage(images.headerImage, { x: marginX, y: currentY, width: w, height: h });
      currentY -= 10;
    } else if (images.logoImage) {
      const scaled = images.logoImage.scale(1);
      const h = Math.min(34, scaled.height);
      const w = scaled.width * (h / scaled.height);
      currentY -= h;
      p.drawImage(images.logoImage, { x: marginX, y: currentY, width: w, height: h });
      currentY -= 10;
    }

    const title = sanitizePdfText((headerText || companyLegalName).trim()).slice(0, 100);
    if (title) {
      currentY -= 12;
      p.drawText(title, { x: marginX, y: currentY, size: 10, font: bold, color: rgb(0.08, 0.1, 0.15) });
      currentY -= 8;
    }

    currentY -= 4;
    p.drawLine({
      start: { x: marginX, y: currentY },
      end: { x: pageSize.width - marginX, y: currentY },
      thickness: 0.5,
      color: rgb(0.78, 0.8, 0.84),
    });
    return currentY - 14;
  }

  function addPage() {
    if (page) drawFooter(page, pageIndex);
    page = pdf.addPage([pageSize.width, pageSize.height]);
    pageIndex += 1;
    y = drawHeader(page);
  }

  addPage();

  const ctx: PdfLetterheadContext = {
    pdf,
    get page() {
      return page;
    },
    font,
    bold,
    rgb,
    get y() {
      return y;
    },
    set y(v: number) {
      y = v;
    },
    pageSize,
    marginX,
    contentBottom,
    get pageIndex() {
      return pageIndex;
    },

    ensureSpace(needed = 24) {
      if (y < contentBottom + needed) ctx.newPage();
    },

    newPage() {
      addPage();
    },

    draw(text, size = 10, isBold = false, x = marginX) {
      ctx.ensureSpace(size + 8);
      page.drawText(sanitizePdfText(text).slice(0, 110), {
        x,
        y,
        size,
        font: isBold ? bold : font,
        color: rgb(0.08, 0.1, 0.15),
      });
      y -= size + 6;
    },

    async finalize() {
      if (page) drawFooter(page, pageIndex);
      return pdf.save();
    },
  };

  return ctx;
}
