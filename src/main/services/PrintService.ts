import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { basename, join } from 'path';
import { app, BrowserWindow, dialog } from 'electron';
import { AttachmentService } from './AttachmentService';
import { ProjectService } from './ProjectService';

const A4_WIDTH_PT = 595.28; // 210mm at 72 DPI
const A4_HEIGHT_PT = 841.89; // 297mm at 72 DPI

export class PrintService {
  private projectService: ProjectService;
  private attachmentService: AttachmentService;

  constructor() {
    this.projectService = new ProjectService();
    this.attachmentService = new AttachmentService();
  }

  /**
   * Build a single PDF from all attachments of a project (template order).
   * - Each file becomes one page
   * - Images are scaled to fit A4 (preserve aspect)
   * - If image has watermark, use the watermarked file
   * - For PDF attachments, import the first page
   * Returns the written PDF file path. Also triggers system print.
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

    // Determine output path via save dialog; fall back to temp if cancelled
    const safeName = (details.name || `project_${project_id}`).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '_');
    const defaultFileName = `${safeName}.pdf`;
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    const outputBytes = await pdf.save();
    let outPath: string;
    if (!result.canceled && result.filePath) {
      outPath = result.filePath;
    } else {
      const tempDir = app.getPath('temp');
      const ts = Date.now();
      outPath = join(tempDir, `${safeName}_${ts}.pdf`);
    }
    // Ensure directory exists (in case of custom path)
    try {
      const dir = outPath.substring(0, outPath.lastIndexOf('\\') > -1 ? outPath.lastIndexOf('\\') : outPath.lastIndexOf('/'));
      if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    } catch {}
    writeFileSync(outPath, outputBytes);

    // Trigger printing by loading the PDF into a hidden window and calling print
    await this.printFile(outPath);
    return outPath;
  }

  private async printFile(filePath: string): Promise<void> {
    const win = new BrowserWindow({ show: false });
    await win.loadURL(`file://${filePath}`);
    await new Promise<void>((resolve) => {
      win.webContents.print({ printBackground: true, silent: false }, () => {
        resolve();
        setTimeout(() => { if (!win.isDestroyed()) win.close(); }, 100);
      });
    });
  }
}
