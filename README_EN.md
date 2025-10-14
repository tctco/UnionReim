# Reimbursement Materials Assistant

A desktop application built with Electron, FluentUI, and better-sqlite3 to help manage and organize reimbursement materials.

## Features

### Stage 1: Core Functionality
- ✅ **Template Management**: Create, edit, delete, and clone reimbursement templates
- ✅ **Project Management**: Create project instances from templates
- ✅ **File Upload**: Support for PDF, JPG, PNG, and OFD files
- ✅ **File Preview**: View images and PDFs (OFD opens with system default)

### Stage 2: Processing
- ✅ **Watermarking**: Apply text watermarks to images and PDFs
- ✅ **Preview Mode**: Review all project materials before export

### Stage 3: Import/Export
- ✅ **Export**: Package projects as ZIP files with all materials
- ✅ **Import**: Restore projects from exported packages

## Technology Stack

- **Frontend**: React 18 + FluentUI v9 (React Components)
- **Backend**: Electron 37
- **Database**: better-sqlite3
- **PDF Processing**: pdf-lib
- **Image Processing**: canvas (node-canvas)
- **File Packaging**: adm-zip
- **Build Tool**: Vite
- **Language**: TypeScript

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── database/        # Database service and schema
│   ├── services/        # Business logic services
│   ├── ipc/            # IPC handlers
│   └── index.ts        # Main entry point
├── preload/            # Preload scripts
│   └── index.ts        # Context bridge setup
├── renderer/           # React frontend
│   ├── components/     # React components
│   │   ├── Layout/    # App layout
│   │   ├── Template/  # Template components
│   │   ├── Project/   # Project components
│   │   ├── Preview/   # Preview components
│   │   └── Common/    # Shared components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   └── App.tsx        # Main app component
└── common/            # Shared types and interfaces
    ├── types.ts       # TypeScript type definitions
    └── ContextBridge.ts # IPC API types
```

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

This will start the Vite dev server and launch the Electron app in development mode with hot reload.

### Build

```bash
npm run build
```

### Package

```bash
npm run package
```

This creates a distributable package for your platform.

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Code Formatting

```bash
npm run prettier:check
npm run prettier:write
```

## Database

The application uses SQLite for local data storage. The database file is created in the user's application data directory:

- **Windows**: `%APPDATA%/Roaming/<app-name>/reimbursement.db`
- **macOS**: `~/Library/Application Support/<app-name>/reimbursement.db`
- **Linux**: `~/.config/<app-name>/reimbursement.db`

### Tables

- `templates` - Template definitions
- `template_items` - Items within templates
- `projects` - Project instances
- `project_items` - Item instances in projects
- `attachments` - Uploaded files metadata

## File Storage

Uploaded files are organized in the following structure:

```
storage/
└── projects/
    └── <project_id>/
        ├── items/
        │   └── <item_id>/
        │       ├── original/      # Original uploaded files
        │       └── watermarked/   # Watermarked versions
        └── export/               # Exported ZIP files
```

## API

### IPC Channels

The application exposes the following IPC channels for communication between renderer and main processes:

#### Templates
- `template:create` - Create new template
- `template:list` - List all templates
- `template:get` - Get template with items
- `template:update` - Update template
- `template:delete` - Delete template
- `template:clone` - Clone template

#### Template Items
- `templateItem:create` - Create template item
- `templateItem:update` - Update template item
- `templateItem:delete` - Delete template item

#### Projects
- `project:create` - Create new project
- `project:list` - List all projects
- `project:get` - Get project with details
- `project:update` - Update project
- `project:delete` - Delete project
- `project:checkComplete` - Check if all required items have files
- `project:export` - Export project as ZIP
- `project:import` - Import project from ZIP

#### Attachments
- `attachment:upload` - Upload file(s) to project item
- `attachment:list` - List files for project item
- `attachment:delete` - Delete attachment
- `attachment:getPath` - Get file path for preview
- `attachment:openExternal` - Open file with system default app

#### Watermarks
- `watermark:apply` - Apply watermark to attachment

## User Guide

See [USAGE.md](./USAGE.md) for detailed user instructions.

## Architecture Decisions

### Why SQLite?
- No server setup required
- Perfect for desktop applications
- ACID compliant
- Fast for local data

### Why FluentUI v9?
- Modern Microsoft design system
- Excellent TypeScript support
- Comprehensive component library
- Good accessibility

### Why Electron?
- Cross-platform desktop apps
- Access to Node.js APIs
- Large ecosystem
- Familiar web technologies

## Future Enhancements

Potential features for future releases:

- **Stage 4**: Print functionality
- **Stage 5**: Template marketplace, multi-user collaboration
- **OCR**: Automatic invoice text extraction
- **Cloud Sync**: Backup and sync across devices
- **Batch Operations**: Process multiple projects at once
- **PDF Merging**: Combine all materials into single PDF
- **Custom Themes**: User-configurable color schemes

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and formatting
6. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Acknowledgments

- FluentUI React Components team
- Electron community
- pdf-lib contributors
- better-sqlite3 maintainers

## Support

For issues and questions:
1. Check the [USAGE.md](./USAGE.md) guide
2. Search existing issues
3. Create a new issue with details

---

Built with ❤️ using Electron + React + FluentUI



