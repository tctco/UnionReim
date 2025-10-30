# UnionReim

<p align="center">
  <img src="./src/static/logo.png" alt="UnionReim Logo" width="160" />
</p>

> A tool for managing reimbursement materials and any structured documents.


## Overview

UnionReim helps you organize, fill, watermark, preview, track, and export documents required for reimbursements or other structured workflows (e.g., awards, publications). It supports template strings for automatic field filling, on-the-fly watermarking, quick previews, project tracking, and one-click export to combined PDFs.


## Key Features

- Automatic template string filling for both files and documents
- Image watermarking with customizable styles and optional auto-watermark on upload
- Instant previews and lightweight editing before watermarking
- Reusable document templates (e.g., forms you regularly re-fill)
- Project progress tracking and quick filtering for pending items
- Export a single combined PDF for printing, or export all project files
- Multiple languages and themes (supports Chinese and light theme)


## Walkthrough

Below is a step-by-step tour with screenshots from the `docs/` folder.

### 1. Home

Start from the home page to access your projects and features.

![Home Page](./docs/1.homePage.jpg)

### 2. Import a reimbursement template (or create your own file-management template)

You can import a reimbursement template, or create your own for managing awards, publications, and more.

![Import Template](./docs/2.importTemplate.jpg)

### 3. Files requiring watermark support template strings with auto-fill

When a file needs a watermark, you can use template strings; fields are filled automatically.

![Template Strings for Files](./docs/3.templateString1.jpg)

### 4. Preview required files for the template

Quickly preview which files are required and their current status.

![Template Preview](./docs/4.templatePreview.jpg)

### 5. Import a document for recurring updates

Documents that need frequent updates (e.g., a student’s “Statement of Not Using a Corporate Card”) can be imported as reusable templates.

![Import Document](./docs/5.importDocument.jpg)

### 6. Documents also support template strings with auto-fill when generating PDFs

Document templates use the same template-string auto-fill during PDF generation.

![Template Strings for Documents](./docs/6.templateString2.jpg)

### 7. Fill key fields like `userName`, `studentID`, and optionally enable Auto Watermark

Provide key-value pairs (e.g., `userName`, `studentID`). Enable Auto Watermark to automatically watermark uploaded images that require it.

![Settings Page and Auto Watermark](./docs/7.settingsPage.jpg)

### 8. Instant preview for uploaded files

Uploaded files can be previewed immediately.

![Edit/Preview Project Files](./docs/8.editProject.jpg)

### 9. Remember the document template? String variables are already filled in preview

Open the document preview; string-type variables are auto-filled, and you only need to add special changes.

![Generate Document PDF](./docs/9.generateDocumentPDF.jpg)

### 10. The generated document PDF includes your signature

Sign where needed; your signature appears in the generated PDF.

![Generated Document PDF](./docs/10.generatedDocumentPDF.jpg)

### 11. Preview and edit images before watermarking

You can preview and make light edits before adding the watermark. Note: for Chinese text, change the font because the default Arial does not support CJK.

![Add Watermark](./docs/11.addWatermark.jpg)

### 12. Or configure watermark styles in Settings

Adjust watermark text, placement, opacity, and more in Settings.

![Watermark Settings](./docs/12.watermarkSettings.jpg)

### 13. Track project progress continuously

Monitor overall progress and see what remains.

![Project Tracking](./docs/13.projectTracking.jpg)

### 14. Quickly filter a set of pending files in the project editor

Use filters to focus on what still needs attention.

![Filter Items](./docs/14.filterItems.jpg)

### 15. All files are ready — export a combined PDF for printing, or package for finance

Once everything is ready, export a single PDF or bundle files for submission.

![Ready to Print / Export](./docs/15.readyToPrint.jpg)

### 16. Print the combined PDF directly

Open the merged PDF and click the top-right Print button to connect to your printer.

![Everything in One PDF](./docs/16.everythingInOne.jpg)

### 17. Export all project files

Export everything for archiving or sharing.

![Export Project](./docs/17.exportProject.jpg)

### 18. UnionReim also supports Chinese and a light theme

Switch language and theme as you prefer.

![Chinese and Light Theme](./docs/18.alsoInChineseAndLightTheme.jpg)


## Use It for Anything Structured

Use UnionReim to manage any structured text workflows beyond reimbursements, including awards, publications, and more.


## Getting Started

1. Create or import a template for your use case
2. Define template strings (e.g., `userName`, `studentID`) and defaults
3. Upload files and documents; enable Auto Watermark if needed
4. Preview, edit lightly, and generate PDFs
5. Track progress and export when ready


## License

This project is licensed under the MIT License.
