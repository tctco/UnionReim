import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { basename, join } from 'path';
import { BrowserWindow } from 'electron';
import { AttachmentService } from './AttachmentService';
import { ProjectService } from './ProjectService';
import { buildRuntimeCssForHtmlRender } from '@common/quillStyle';
import { getFonts } from 'font-list';
import { A4_WIDTH_PT, A4_HEIGHT_PT } from '@common/constants';
import { SettingsService } from './SettingsService';
import { toReimbursementUrlFromRelative } from '@common/urlHelpers';

export class PrintService {
  private projectService: ProjectService;
  private attachmentService: AttachmentService;
  private settingsService: SettingsService;

  constructor() {
    this.projectService = new ProjectService();
    this.attachmentService = new AttachmentService();
    this.settingsService = new SettingsService();
  }

  /**
   * Build a single PDF from all attachments of a project (template order).
   * - Each file becomes one page
   * - Images are scaled to fit A4 (preserve aspect)
   * - If image has watermark, use the watermarked file
   * - For PDF attachments, import the first page
   * Saves to the project's directory and returns the written PDF file path.
   */
  async printProject(project_id: number): Promise<string> {
    const details = this.projectService.getProjectWithDetails(project_id);
    if (!details) throw new Error('Project not found');

    const pdf = await PDFDocument.create();

    // Iterate in template item order; attachments per item are already by upload time
    for (const item of details.items) {
      for (const att of item.attachments) {
        const fileType = (att.file_type || '').toLowerCase();
        const relPath = att.has_watermark && att.watermarked_path ? att.watermarked_path : att.file_path;
        const absPath = join(this.attachmentService.getStoragePath(), relPath);

        try {
          if (['jpg', 'jpeg', 'png'].includes(fileType)) {
            const bytes = readFileSync(absPath);
            const page = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);

            let image;
            if (fileType === 'png') image = await pdf.embedPng(bytes);
            else image = await pdf.embedJpg(bytes);

            const { width, height } = image.scale(1);
            // Compute scale to fit into A4 with small margins
            const margin = 20; // points
            const maxW = A4_WIDTH_PT - margin * 2;
            const maxH = A4_HEIGHT_PT - margin * 2;
            const scale = Math.min(maxW / width, maxH / height);
            const drawW = width * scale;
            const drawH = height * scale;
            const x = (A4_WIDTH_PT - drawW) / 2;
            const y = (A4_HEIGHT_PT - drawH) / 2;
            page.drawImage(image, { x, y, width: drawW, height: drawH });
          } else if (fileType === 'pdf') {
            const srcBytes = readFileSync(absPath);
            const srcDoc = await PDFDocument.load(srcBytes);
            if (srcDoc.getPageCount() > 0) {
              const [firstPage] = await pdf.copyPages(srcDoc, [0]);
              pdf.addPage(firstPage);
            }
          } else if (fileType === 'ofd') {
            // Unsupported: add a placeholder page indicating file skipped
            const page = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
            const font = await pdf.embedFont(StandardFonts.Helvetica);
            const msg = `OFD file not supported in print merge\n${basename(absPath)}`;
            page.drawText(msg, {
              x: 40,
              y: A4_HEIGHT_PT - 80,
              size: 14,
              font,
              lineHeight: 18,
            });
          } else {
            // Unknown type: add a placeholder page
            const page = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
            const font = await pdf.embedFont(StandardFonts.Helvetica);
            const msg = `Unsupported file type: ${fileType}\n${basename(absPath)}`;
            page.drawText(msg, { x: 40, y: A4_HEIGHT_PT - 80, size: 14, font, lineHeight: 18 });
          }
        } catch (err) {
          // On any error, still put a placeholder page to keep ordering visible
          const page = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
          const font = await pdf.embedFont(StandardFonts.Helvetica);
          const msg = `Failed to include: ${basename(absPath)}\n${String(err)}`;
          page.drawText(msg, { x: 40, y: A4_HEIGHT_PT - 80, size: 12, font, lineHeight: 16 });
        }
      }
    }

    // Determine output path under storage/<project_id>/print/<name>.pdf
    const safeName = (details.name || `project_${project_id}`).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '_');
    const storageRoot = this.attachmentService.getStoragePath();
    const outDir = join(storageRoot, String(project_id), 'print');
    if (!existsSync(outDir)) {
      try { mkdirSync(outDir, { recursive: true }); } catch { /* noop */ }
    }
    const outPath = join(outDir, `${safeName}.pdf`);

    const outputBytes = await pdf.save();
    try {
      writeFileSync(outPath, outputBytes);
    } catch {
      throw new Error('Failed to write merged PDF to project folder');
    }

    // Return relative path under storage root for reimbursement:// usage
    const relative = join(String(project_id), 'print', `${safeName}.pdf`);
    return relative;
  }

  async printFile(filePathOrUrl: string): Promise<void> {
    const win = new BrowserWindow({ show: false });
    const target = filePathOrUrl.startsWith('reimbursement://')
      ? filePathOrUrl
      : `file://${filePathOrUrl}`;
    await win.loadURL(target);
    await new Promise<void>((resolve) => {
      win.webContents.print({ printBackground: true, silent: false }, () => {
        resolve();
        setTimeout(() => { if (!win.isDestroyed()) win.close(); }, 100);
      });
    });
  }

  /**
   * Render given HTML string to a PDF and save under the project's folder.
   * Returns relative path under storage root.
  */
  async htmlToPdfForProject(project_id: number, name: string, html: string): Promise<string> {
    const win = new BrowserWindow({ show: false });
    // Replace signature image placeholder if present
    try {
      const appSettings = this.settingsService.getAppSettings();
      const sigRel = appSettings.signatureImagePath;
      const heightCm = appSettings.signatureImageHeightCm && appSettings.signatureImageHeightCm > 0
        ? appSettings.signatureImageHeightCm
        : 2;
      if (sigRel) {
        const sigUrl = toReimbursementUrlFromRelative(sigRel);
        // Use absolute positioning and pointer-events none to avoid affecting layout or interaction
        const style = `position:relative;`;
        const overlay = `<img src="${sigUrl}" alt="signature" style="position:absolute; height:${heightCm}cm; pointer-events:none; z-index:-1;" />`;
        // Wrap placeholder with container to ensure absolute positioning context
        html = html.replace(/\{signatureImage\}/g, `<span style="${style}">${overlay}</span>`);
      } else {
        html = html.replace(/\{signatureImage\}/g, "");
      }
    } catch { /* noop */ }
    let systemFonts: string[] = [];
    try {
      systemFonts = await getFonts({ disableQuoting: true });
    } catch { /* noop */ }
    const quillCss = buildRuntimeCssForHtmlRender(systemFonts, { noFontFallback: true });
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />\n<style>\n${quillCss}\n</style>\n</head><body>\n${html}\n</body></html>`;
    const content = `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`;
    await win.loadURL(content);
    const pdf = await win.webContents.printToPDF({ printBackground: true });
    setTimeout(() => { try { if (!win.isDestroyed()) win.close(); } catch { /* noop */ } }, 100);

    const storageRoot = this.attachmentService.getStoragePath();
    const outDir = join(storageRoot, String(project_id), 'documents');
    if (!existsSync(outDir)) {
      try { mkdirSync(outDir, { recursive: true }); } catch { /* noop */ }
    }
    const safe = (name || 'document').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '_');
    const outPath = join(outDir, `${safe}.pdf`);
    writeFileSync(outPath, pdf);
    const rel = join(String(project_id), 'documents', `${safe}.pdf`);
    return rel;
  }

  // CSS builder moved to @common/quillStyle to keep renderer and main consistent
}
