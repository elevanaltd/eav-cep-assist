# EAV Operations Hub - Deployment Guide

**Status:** ✅ Production-Validated (POC Phase 0, Nov 1, 2025)
**Platform:** Vercel
**Architecture:** Independent app deployment from monorepo
**Constitutional Authority:** Implements North Star I11 (Independent Deployment Architecture), Resolves A1 (Deployment Platform Compatibility)

---

## Overview

The EAV Operations Hub uses a **monorepo-to-multi-project deployment architecture** where:
- **One GitHub repository** (`eav-monorepo`) contains all 7 applications
- **Seven independent Vercel projects** deploy from the same repo (one per app)
- **Each app deploys independently** with zero blast radius between apps
- **Shared packages bundle at build time** (no runtime coupling to monorepo structure)

This architecture was empirically validated in POC Phase 0 with production deployment at https://eav-monorepo-experimental-scenes-we.vercel.app/

---

## Architecture Diagram

```
GitHub Repository: elevanaltd/eav-monorepo
    ↓
    ├─→ Vercel Project 1: scripts.eav-internal.com    (apps/copy-editor)
    ├─→ Vercel Project 2: scenes.eav-internal.com     (apps/scenes-web)
    ├─→ Vercel Project 3: vo.eav-internal.com         (apps/vo-web)
    ├─→ Vercel Project 4: data-entry.eav-internal.com (apps/data-entry-web)
    ├─→ Vercel Project 5: cam-op.eav-internal.com     (apps/cam-op-pwa)
    ├─→ Vercel Project 6: edit.eav-internal.com       (apps/edit-web)
    └─→ Vercel Project 7: translations.eav-internal.com (apps/translations-web)
```

**Key Principle:** Apps share code at **build time** (via `@elevanaltd/shared`), not runtime. Each deployment is self-contained.

---

## Deployment Configuration

### Per-App Vercel Configuration

Each app requires a `vercel.json` at its root (`apps/{app-name}/vercel.json`):

```json
{
  "buildCommand": "cd ../.. && pnpm turbo run build --filter={app-name}",
  "installCommand": "cd ../.. && corepack enable && pnpm install",
  "devCommand": "pnpm dev",
  "framework": "vite",
  "outputDirectory": "dist"
}
```

**Critical Configuration Points:**

1. **buildCommand**: Must use `cd ../..` to reach monorepo root, then Turborepo filter to build only this app
2. **installCommand**: Must run from monorepo root to properly link workspace packages
3. **Root Directory** (Vercel project settings): Set to `apps/{app-name}` in Vercel dashboard

### Vercel Project Setup

For each app, create a separate Vercel project:

1. **Import GitHub Repository**
   - Go to Vercel dashboard → "Add New Project"
   - Select `elevanaltd/eav-monorepo` repository
   - Import 7 times (once per app)

2. **Configure Root Directory**
   - Project Settings → General → Root Directory
   - Set to: `apps/copy-editor` (or respective app name)
   - Example: For scenes-web, set `apps/scenes-web`
   - **Tip:** Vercel UI makes this easy - shows directory picker with monorepo structure

3. **Configure Build Settings**
   - Build Command: `cd ../.. && pnpm turbo run build --filter=copy-editor`
   - Install Command: `cd ../.. && corepack enable && pnpm install`
   - Output Directory: `dist`
   - Framework Preset: Vite
   - **Note:** If using `vercel.json` in app directory, these settings can be omitted (file takes precedence)

4. **Configure Environment Variables** (see below)

5. **Configure Domain**
   - Project Settings → Domains
   - Add custom domain: `{app-name}.eav-internal.com`

---

## Environment Variables

### Critical: Vite Build-Time Variables

**Problem:** Vite bundles environment variables at build time. Missing vars during build = runtime errors.

**Solution:** Set all `VITE_*` variables in Vercel for **all environments** (Production, Preview, Development).

### Required Variables Per App

**All Apps:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Scripts-Web Additional:**
```bash
VITE_SMARTSUITE_WEBHOOK_SECRET=your-webhook-secret
OPENAI_API_KEY=sk-...  # Server-side only
```

**VO-Web Additional:**
```bash
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key
```

### Setting Environment Variables

1. Go to Vercel project → Settings → Environment Variables
2. Add each variable with:
   - **Name**: Variable name (e.g., `VITE_SUPABASE_URL`)
   - **Value**: Variable value
   - **Environments**: Select all (Production, Preview, Development)
3. **Critical**: After adding variables, trigger **redeploy** (not rebuild) to force fresh build with new vars

### Database Migrations

**Important:** Each app's database migrations are stored within the app directory (`apps/{app-name}/supabase/migrations/`) and deployed independently.

When deploying a new app version that includes database changes:
1. Apply migrations via Supabase CLI or Dashboard **before** deploying code
2. Test migrations in preview environment first
3. Use Supabase MCP tools for migration management

**Note:** Supabase configuration is already up to date - no migration needed for shared packages.

---

## Build Process

### How Turborepo Orchestrates Builds

1. **Install Phase** (from monorepo root):
   ```bash
   corepack enable
   pnpm install
   # Links @elevanaltd/shared from packages/ to node_modules/
   ```

2. **Build Phase** (Turborepo filter):
   ```bash
   pnpm turbo run build --filter=copy-editor
   # Turborepo analyzes dependency graph:
   # 1. Builds packages/shared first → creates dist/
   # 2. Builds apps/copy-editor → bundles with shared's dist/
   ```

3. **Output**:
   - Self-contained bundle at `apps/copy-editor/dist/`
   - No runtime dependency on monorepo structure
   - Shared package code is bundled into app

### Key Insight: Build-Time vs Runtime Coupling

- ✅ **Build-time coupling**: Apps depend on `@elevanaltd/shared` during build (correct)
- ❌ **Runtime coupling**: Apps depend on monorepo structure after deployment (incorrect)
- **Result**: Each app deploys as independent, self-contained bundle

---

## Common Issues & Troubleshooting

### Issue 1: Module Resolution Error

**Error:**
```
Error: Cannot find module '@elevanaltd/shared'
```

**Cause:** Vercel building from `apps/copy-editor/` can't find workspace packages

**Solution:**
Add `installCommand` to `vercel.json`:
```json
{
  "installCommand": "cd ../.. && corepack enable && pnpm install"
}
```

**Why:** Install must run from monorepo root to create workspace links

**Evidence:** Git commit `618f9e2` in POC Phase 0

---

### Issue 2: Runtime Environment Variable Error

**Error:**
```
Uncaught ReferenceError: process is not defined
Missing VITE_SUPABASE_URL at runtime
```

**Cause:** Vite bundles env vars at build time. If vars missing during build, runtime error occurs.

**Solution:**
1. Go to Vercel project → Settings → Environment Variables
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for **all environments**
3. **Critical**: Trigger **redeploy** (not rebuild) to force fresh build

**Why:** Vite needs env vars present during build phase to bundle them into client code

**Evidence:** Git commit `395beab` in POC Phase 0

---

### Issue 3: Build Warning - Types Condition

**Warning:**
```
"types" condition should come first in exports
```

**Cause:** TypeScript/bundlers check `exports` conditions in order. If `types` comes after `import`/`require`, it's never reached.

**Solution:**
Edit `packages/shared/package.json`:
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",    // Must be first
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

**Why:** Proper TypeScript resolution order requires `types` condition first

**Evidence:** Git commit `23252d0` in POC Phase 0

---

### Issue 4: Supabase OAuth Callback Fails

**Error:**
```
404 Not Found - OAuth callback URL mismatch
```

**Cause:** Apps expect to be at root `/`, not sub-paths like `/scripts/*`

**Solution:**
- Each app deploys to its own domain root (`scripts.eav-internal.com`)
- Configure Supabase OAuth callbacks per app:
  - Scripts: `https://scripts.eav-internal.com/auth/callback`
  - Scenes: `https://scenes.eav-internal.com/auth/callback`

**Why:** Independent deployment architecture means each app owns its domain root

---

### Issue 5: Git Shallow Clone Breaks Turborepo

**Error:**
```
Turborepo cannot determine affected packages (shallow clone)
```

**Cause:** GitHub Actions default shallow clone (`fetch-depth: 1`) breaks Turborepo's git history analysis

**Solution:**
Add to `.github/workflows/*.yml`:
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full git history for Turborepo
```

**Why:** Turborepo needs git history to determine which packages changed and need rebuilding

**Evidence:** POC-GAP-ANALYSIS.md (Gotcha #2)

---

### Issue 6: Autofocus Dropdown Not Opening

**Error:**
```
Autofocus field doesn't show dropdown
Must click out and back in to see options
```

**Cause:** Race condition between autofocus timing and dropdown state management in shared AutocompleteField component

**Solution:**
Update `packages/shared/src/components/AutocompleteField.tsx`:
1. Remove auto-close logic from `useEffect` that filters options
2. Change `onFocus` handler to check `options.length` instead of `filteredOptions.length`

```tsx
// Before (broken)
onFocus={() => {
  if (filteredOptions.length > 0 || inputValue.length > 0) {
    setActiveDropdownId(dropdownId)
  }
}}

// After (fixed)
onFocus={() => {
  if (options.length > 0) {
    setActiveDropdownId(dropdownId)
  }
}}
```

**Why:** `filteredOptions` isn't populated during initial render, but `options` from props is always available

**Evidence:** Git commit `8671a24` in POC Phase 0

---

## Deployment Workflow

### Initial Deployment

1. **Prepare Repository**
   ```bash
   # Ensure all apps have vercel.json
   ls -la apps/*/vercel.json

   # Ensure package.json exports are correct
   cat packages/shared/package.json
   ```

2. **Create Vercel Projects** (one per app)
   - Import GitHub repo 7 times
   - Configure root directory per app
   - Set environment variables
   - Configure custom domains

3. **Deploy Each App**
   - Vercel auto-deploys on git push
   - Or manual: `vercel --prod` from app directory

4. **Validate Deployment**
   - Test app functionality
   - Check Supabase connectivity
   - Verify OAuth flows
   - Test shared package usage

### Continuous Deployment

**On Git Push:**
- Vercel detects changes in monitored app directory
- Turborepo builds only affected packages
- Deploy only changed apps (automatic)

**Manual Deployment:**
```bash
cd apps/copy-editor
vercel --prod
```

### Rollback Procedure

**Option 1: Vercel Dashboard**
1. Go to Deployments tab
2. Find previous successful deployment
3. Click "Promote to Production"

**Option 2: Git Revert**
```bash
git revert <commit-hash>
git push origin main
# Vercel auto-deploys reverted version
```

---

## Production Validation

**POC Phase 0 Results (Nov 1, 2025):**
- ✅ Production deployment successful
- ✅ Live URL: https://eav-monorepo-experimental-scenes-we.vercel.app/
- ✅ Module resolution working
- ✅ Environment variables bundled correctly
- ✅ Build warnings eliminated
- ✅ Independent app deployment validated
- ✅ Zero runtime coupling to monorepo structure

**Validation Evidence:**
- Full POC results: `/Volumes/HestAI-Projects/eav-ops/coordination/poc-phase-0/COMPLETION-SUMMARY.md`
- All 6 validation gates passed (Q1-Q6)
- Troubleshooting documented with git commit references

---

## Performance Considerations

### Build Times (POC Phase 0 Measurements)

**With Turborepo Filtering:**
- Scripts-web only change: 4.4s (only affected app builds)
- Shared package change: All dependents rebuild (expected)
- Docs-only change: 46ms (zero builds, instant)

**CI Pipeline Optimization:**
- Without filtering: ~56 min (nightmare scenario) ❌
- With filtering: ~8-10 min (same as current single-repo) ✅

**Key Insight:** Turborepo's affected package detection prevents CI regression

### Cold Start Performance

**Baseline (POC Phase 0):**
- Cold start: <500ms (Vercel Edge Network)
- Component extraction: <50ms (Edge Function)
- Target maintained: <100ms paragraph-to-component transformation

---

## Security Considerations

### Environment Variable Security

**Server-Side Secrets:**
- Use Vercel environment variables (not `VITE_` prefix)
- Never commit secrets to git
- Rotate keys regularly

**Client-Side Variables:**
- Only expose necessary variables via `VITE_` prefix
- Supabase publishable key is safe to expose (RLS enforces security)
- Never expose server-side secrets (OpenAI API key, webhook secrets)

### RLS Security

**Database-Layer Security:**
- All apps rely on Supabase Row Level Security (RLS)
- Fail-closed policy: Unauthenticated users see nothing
- Multi-client isolation via RLS policies
- No client-side security bypasses possible

---

## References

**Constitutional Authority:**
- North Star I11: Independent Deployment Architecture (docs/workflow/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md lines 69-74)
- North Star A1: Deployment Platform Compatibility RESOLVED (lines 88-96)

**Architectural Decisions:**
- DECISIONS.md: Deployment Platform Architecture (lines 32-48)
- ADR-001: Documentation Architecture

**Validation Evidence:**
- POC Phase 0 Completion Summary: `/Volumes/HestAI-Projects/eav-ops/coordination/poc-phase-0/COMPLETION-SUMMARY.md`
- Vercel Deployment Validation: Lines 52-89 (architecture), Lines 129-203 (production validation)
- All 6 technical validation gates (Q1-Q6): `/Volumes/HestAI-Projects/eav-ops/coordination/poc-phase-0/validation-evidence/`

---

**Last Updated:** 2025-11-01
**Status:** Production-Ready
**Next Review:** After Phase 1 migration complete
