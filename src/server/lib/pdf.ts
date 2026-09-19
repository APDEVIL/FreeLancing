/**
 * PDF generation utilities using pdf-lib (pure JS, no native deps).
 * Install: pnpm add pdf-lib
 *
 * Two exports used by the payment and project routers:
 *   generateInvoicePdf  → returns a Buffer (invoice for a single payment)
 *   generateReportPdf   → returns a Buffer (project / payment summary report)
 */

import { PDFDocument, PageSizes, rgb, StandardFonts } from "pdf-lib";

// ─────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────

export interface InvoiceData {
  invoiceNumber: string;
  issuedDate: Date;
  dueDate: Date;
  issuedBy: { name: string; email: string };
  issuedTo: { name: string; email: string };
  projectTitle: string;
  description: string;
  amount: number;
  taxPercent: number;
  notes?: string;
}

export interface ReportRow {
  label: string;
  value: string;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  generatedBy: string;
  sections: Array<{ heading: string; rows: ReportRow[] }>;
}

// ─────────────────────────────────────────────
// Colour palette (rgb 0-1)
// ─────────────────────────────────────────────

const C = {
  primary:   rgb(0.094, 0.373, 0.647),  // #185FA5 blue
  dark:      rgb(0.173, 0.173, 0.165),  // #2C2C2A
  muted:     rgb(0.373, 0.373, 0.353),  // #5F5E5A
  light:     rgb(0.902, 0.941, 0.984),  // #E6F1FB
  white:     rgb(1, 1, 1),
  divider:   rgb(0.831, 0.820, 0.788),  // #D3D1C7
  success:   rgb(0.059, 0.431, 0.337),  // #0F6E56
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const fmt = {
  date: (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  currency: (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n),
};

// ─────────────────────────────────────────────
// Invoice PDF
// ─────────────────────────────────────────────

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const M = 48; // margin
  let y = height - M;

  // ── Header bar ──────────────────────────────
  page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: C.primary });

  page.drawText("INVOICE", {
    x: M, y: height - 48,
    size: 24, font: bold, color: C.white,
  });

  page.drawText(data.invoiceNumber, {
    x: width - M - bold.widthOfTextAtSize(data.invoiceNumber, 12),
    y: height - 44,
    size: 12, font: bold, color: C.white,
  });

  y = height - 72 - 32;

  // ── Parties ─────────────────────────────────
  const colLeft  = M;
  const colRight = width / 2 + 16;

  const drawParty = (label: string, name: string, email: string, x: number, startY: number) => {
    page.drawText(label, { x, y: startY, size: 8, font: bold, color: C.primary });
    page.drawText(name,  { x, y: startY - 14, size: 11, font: bold,   color: C.dark });
    page.drawText(email, { x, y: startY - 27, size: 9,  font: normal, color: C.muted });
  };

  drawParty("FROM", data.issuedBy.name, data.issuedBy.email, colLeft,  y);
  drawParty("TO",   data.issuedTo.name, data.issuedTo.email, colRight, y);

  y -= 60;

  // ── Divider ──────────────────────────────────
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: C.divider });
  y -= 20;

  // ── Meta row (project / dates) ────────────────
  const drawMeta = (label: string, value: string, x: number, startY: number) => {
    page.drawText(label, { x, y: startY,      size: 8,  font: bold,   color: C.muted });
    page.drawText(value, { x, y: startY - 13, size: 10, font: normal, color: C.dark });
  };

  const col3 = (width - 2 * M) / 3;
  drawMeta("PROJECT",    data.projectTitle,        colLeft,          y);
  drawMeta("ISSUED",     fmt.date(data.issuedDate), colLeft + col3,  y);
  drawMeta("DUE DATE",   fmt.date(data.dueDate),    colLeft + col3 * 2, y);

  y -= 50;

  // ── Line items header ─────────────────────────
  page.drawRectangle({ x: M, y: y - 4, width: width - 2 * M, height: 22, color: C.light });
  page.drawText("DESCRIPTION", { x: M + 8,         y: y + 4, size: 8, font: bold, color: C.primary });
  page.drawText("AMOUNT",      { x: width - M - 60, y: y + 4, size: 8, font: bold, color: C.primary });

  y -= 28;

  // ── Line item ─────────────────────────────────
  page.drawText(data.description, { x: M + 8,         y, size: 10, font: normal, color: C.dark });
  page.drawText(fmt.currency(data.amount), {
    x: width - M - normal.widthOfTextAtSize(fmt.currency(data.amount), 10),
    y, size: 10, font: normal, color: C.dark,
  });

  y -= 16;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: C.divider });
  y -= 20;

  // ── Totals ────────────────────────────────────
  const taxAmount = data.amount * (data.taxPercent / 100);
  const total     = data.amount + taxAmount;

  const drawTotal = (label: string, value: string, isBold = false, colour = C.dark) => {
    const f = isBold ? bold : normal;
    page.drawText(label, { x: width - M - 180, y, size: 10, font: f, color: colour });
    page.drawText(value, {
      x: width - M - f.widthOfTextAtSize(value, 10),
      y, size: 10, font: f, color: colour,
    });
    y -= 18;
  };

  drawTotal("Subtotal",              fmt.currency(data.amount));
  drawTotal(`Tax (${data.taxPercent}%)`, fmt.currency(taxAmount));
  y -= 4;
  page.drawLine({ start: { x: width - M - 180, y }, end: { x: width - M, y }, thickness: 0.5, color: C.divider });
  y -= 14;
  drawTotal("Total Due", fmt.currency(total), true, C.primary);

  // ── Status stamp ──────────────────────────────
  page.drawRectangle({ x: M, y: y - 8, width: 80, height: 22, color: C.success });
  page.drawText("ISSUED", { x: M + 18, y: y + 1, size: 9, font: bold, color: C.white });
  y -= 36;

  // ── Notes ─────────────────────────────────────
  if (data.notes) {
    page.drawText("Notes", { x: M, y, size: 9, font: bold, color: C.muted });
    y -= 14;
    page.drawText(data.notes, { x: M, y, size: 9, font: normal, color: C.muted, maxWidth: width - 2 * M });
  }

  // ── Footer ────────────────────────────────────
  page.drawLine({ start: { x: M, y: 48 }, end: { x: width - M, y: 48 }, thickness: 0.5, color: C.divider });
  page.drawText("Generated by FPPTS — Freelancer Project & Payment Tracking System", {
    x: M, y: 32, size: 7, font: normal, color: C.muted,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ─────────────────────────────────────────────
// Report PDF  (project summary / payment history)
// ─────────────────────────────────────────────

export async function generateReportPdf(data: ReportData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const M = 48;
  let y = height - M;

  // ── Header ───────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: C.primary });
  page.drawText(data.title, { x: M, y: height - 44, size: 20, font: bold, color: C.white });
  if (data.subtitle) {
    page.drawText(data.subtitle, { x: M, y: height - 62, size: 10, font: normal, color: C.white });
  }

  y = height - 80 - 24;

  // ── Meta ──────────────────────────────────────
  const metaText = `Generated on ${fmt.date(data.generatedAt)}   ·   By ${data.generatedBy}`;
  page.drawText(metaText, { x: M, y, size: 8, font: normal, color: C.muted });
  y -= 24;

  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: C.divider });
  y -= 20;

  // ── Sections ──────────────────────────────────
  for (const section of data.sections) {
    // Section heading
    page.drawText(section.heading.toUpperCase(), {
      x: M, y, size: 8, font: bold, color: C.primary,
    });
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: C.light });
    y -= 16;

    // Rows
    let rowBg = false;
    for (const row of section.rows) {
      if (rowBg) {
        page.drawRectangle({ x: M, y: y - 6, width: width - 2 * M, height: 18, color: C.light });
      }
      page.drawText(row.label, { x: M + 8,         y, size: 9, font: normal, color: C.dark });
      page.drawText(row.value, {
        x: width - M - normal.widthOfTextAtSize(row.value, 9),
        y, size: 9, font: bold, color: C.dark,
      });
      y -= 18;
      rowBg = !rowBg;

      // Simple page overflow guard — add new page if running out
      if (y < 80) {
        const newPage = doc.addPage(PageSizes.A4);
        y = newPage.getSize().height - M;
      }
    }

    y -= 20;
  }

  // ── Footer ────────────────────────────────────
  page.drawLine({ start: { x: M, y: 48 }, end: { x: width - M, y: 48 }, thickness: 0.5, color: C.divider });
  page.drawText("Generated by FPPTS — Freelancer Project & Payment Tracking System", {
    x: M, y: 32, size: 7, font: normal, color: C.muted,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}