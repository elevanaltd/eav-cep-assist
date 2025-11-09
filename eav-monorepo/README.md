# EAV Operations Suite - Monorepo

Turborepo monorepo for 7 EAV web applications with shared infrastructure.

## Structure

- `apps/` - 7 independent web applications (copy-editor, scenes-web, data-entry-web, vo-web, cam-op-pwa, edit-web, translations-web)
- `packages/shared/` - Shared UI components, utilities, and types
- `supabase/` - Shared database schema and migrations
- `docs/` - Permanent documentation (deployment, development, ADRs)
- `.coord/` - Project coordination (gitignored, ephemeral)

## Prerequisites

- Node.js 18+ (20.x recommended)
- pnpm 8+ (package manager)
- Supabase CLI (for local database)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual credentials
# Get Supabase credentials from: https://app.supabase.com/project/YOUR-PROJECT/settings/api
```

### 3. Start Development

```bash
# Start all apps (parallel)
pnpm dev

# Or start specific app
pnpm dev --filter=copy-editor
```

## Available Commands

```bash
# Development
pnpm dev                    # Start all apps
pnpm dev --filter=APP_NAME  # Start specific app

# Building
pnpm build                  # Build all packages
pnpm build --filter=APP_NAME

# Testing
pnpm test                   # Run all tests
pnpm test --filter=APP_NAME

# Type Checking
pnpm typecheck              # Check all packages

# Linting
pnpm lint                   # Lint all packages
```

## Documentation

- [Deployment](docs/deployment/101-DOC-DEPLOYMENT-VERCEL.md)
- [Development Workflow](docs/development/101-DOC-WORKTREE-WORKFLOW.md)
- [Architecture Decisions](docs/adr/)
- [Project Coordination](.coord/PROJECT-CONTEXT.md)

## Apps

1. **copy-editor** - Script editor with TipTap
2. **scenes-web** - Scene management
3. **data-entry-web** - Data entry interface
4. **vo-web** - Voice-over generation
5. **cam-op-pwa** - Camera operator PWA
6. **edit-web** - Video editing
7. **translations-web** - Translation management

## Shared Package

`@workspace/shared` contains:
- UI components (Header, Navigation, AutocompleteField)
- Supabase client utilities
- Authentication helpers
- RLS testing utilities
- Database types

See `packages/shared/README.md` for details.
