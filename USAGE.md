# Reimbursement Materials Assistant - User Guide

## Overview

This application helps you organize, manage, and export reimbursement materials using a template-based workflow. It supports watermarking, file management, and project export/import functionality.

## Key Features

- **Template Management**: Create reusable templates for different types of reimbursements
- **Project Instances**: Create specific reimbursement projects based on templates
- **File Management**: Upload and organize receipts, invoices, and supporting documents
- **Watermarking**: Automatically apply watermarks to images and PDFs
- **Export/Import**: Package entire projects as ZIP files for sharing
- **Preview**: View all materials before exporting

## Getting Started

### 1. Create a Template

Templates define the structure of your reimbursement materials.

1. Navigate to the **Templates** tab
2. Click **"New Template"**
3. Enter template name and description (e.g., "Conference Reimbursement")
4. Click **"Save"**
5. Add template items:
   - Click **"Add Item"** to create a new material requirement
   - Configure each item:
     - **Name**: e.g., "Hotel Invoice", "Flight Ticket"
     - **Required**: Mark if this item is mandatory
     - **Needs Watermark**: Enable automatic watermarking
     - **Watermark Template**: Use placeholders like `{userName} - {itemName}`
     - **Allow Multiple Files**: Enable if multiple files can be uploaded

### 2. Create a Project

Projects are specific instances based on templates.

1. Navigate to the **Projects** tab
2. Click **"New Project"**
3. Select a template
4. Fill in project details:
   - Project name (e.g., "2025 ISICDM Conference")
   - Creator name
   - Description (optional)
5. Click **"Create"**

### 3. Upload Files

1. Open your project
2. For each item, click **"Upload"** to select files
3. Supported formats: PDF, JPG, PNG, OFD
4. For items requiring watermarks:
   - Upload the file first
   - Click the watermark icon (sparkle) to apply watermark
   - Watermarked versions are stored separately

### 4. Preview and Export

1. Click **"Preview"** to see all materials
2. Review project information and uploaded files
3. Click **"Export Project"** to create a ZIP package containing:
   - All original files
   - Watermarked versions
   - Project metadata (manifest.json)

### 5. Import Projects

1. Navigate to **Projects** tab
2. Click **"Import Project"**
3. Select a previously exported ZIP file
4. The project will be recreated with all files and settings

## Watermark Placeholders

Use these placeholders in watermark templates:

- `{userName}` - Project creator name
- `{itemName}` - Template item name
- `{projectName}` - Project name
- `{date}` - Current date

Example: `{userName} - {itemName} - {date}`

## File Storage

All files are stored locally in your user data directory:
- **Windows**: `%APPDATA%/reimbursement-app/`
- **macOS**: `~/Library/Application Support/reimbursement-app/`
- **Linux**: `~/.config/reimbursement-app/`

## Tips

1. **Templates**: Create templates for recurring reimbursement types to save time
2. **Required Items**: Mark essential items as "required" to ensure completeness
3. **Watermarks**: Set up watermark templates at the template level for consistency
4. **Multiple Files**: Enable "Allow Multiple Files" for items that may have several documents
5. **Export Early**: Export projects periodically as backups

## Keyboard Shortcuts

- Search in lists: Press `Enter` after typing
- Quick navigation: Use browser back/forward buttons

## Troubleshooting

### Files not uploading
- Check file format is supported (PDF, JPG, PNG, OFD)
- Ensure sufficient disk space
- Try uploading smaller files first

### Watermark not applying
- Verify the item has "Needs Watermark" enabled in the template
- Check that watermark template text is configured
- Only images (JPG, PNG) and PDFs support watermarking

### Export fails
- Ensure all required items have files uploaded
- Check that files haven't been moved or deleted
- Verify sufficient disk space for export ZIP

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run package
```

### Run Tests
```bash
npm test
```

## Technical Stack

- **Frontend**: React + FluentUI v9
- **Backend**: Electron
- **Database**: better-sqlite3
- **PDF Processing**: pdf-lib
- **Image Processing**: canvas
- **Packaging**: adm-zip

## License

MIT License - See LICENSE file for details



