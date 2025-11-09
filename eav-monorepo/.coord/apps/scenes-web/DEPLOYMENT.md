# scenes-web Deployment Configuration

**Deployment Platform:** Vercel (monorepo pattern, independent deployment per I11)
**Current Status:** Phase 1 - Configuration documented, deployment pending
**Last Updated:** 2025-11-08

---

## Deployment Architecture

**Pattern:** One GitHub repository → Multiple independent Vercel projects
- ✅ **North Star I11 Compliance:** Independent deployment (zero blast radius)
- ✅ **Proven Pattern:** Same as copy-editor (production operational)
- ✅ **Build-time Coupling Only:** Shared packages bundle at build time (no runtime dependencies)

---

## Environment Variables

**Required in Vercel Project Settings:**

### Production & Preview Environments

```bash
# Supabase Configuration (Frontend - VITE_ prefix required)
VITE_SUPABASE_URL=https://zbxvjyrbkycbfhwmmnmy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieHZqeXJia3ljYmZod21tbm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUyMDc5MzAsImV4cCI6MTcyNjc0MzkzMH0.TL8c7YaZo1e5Wj4D8nZ6k5M0pQ9rS1tU2vX3yA4bC5D
```

**Source:** Same Supabase project as copy-editor (shared database per I10, I12)

**Security Note:**
- Publishable key (anon key) is safe for frontend exposure
- RLS policies enforce multi-client isolation (North Star I2)
- All database access authenticated via Supabase Auth

---

## Vercel Project Configuration

**Framework Preset:** Vite
**Node Version:** 18.x (matches package.json engines requirement)

### Build Settings

```bash
# Build Command
cd ../.. && pnpm install && pnpm turbo run build --filter=scenes-web

# Output Directory
apps/scenes-web/dist

# Install Command (monorepo root)
cd ../.. && corepack enable && pnpm install

# Root Directory
./
```

**Why monorepo root install:**
- Turborepo orchestrates build from monorepo root
- Shared packages (`@workspace/shared`) installed via pnpm workspace
- Build command uses `--filter=scenes-web` to target specific app

**Reference:** See `.coord/DECISIONS.md` (lines 86-100) for Vercel monorepo architecture validation

---

## Deployment URLs

### Preview Deployments
**Pattern:** `https://eav-scenes-[git-branch-hash].vercel.app/`
- Auto-generated for each pull request
- Branch-specific environment (isolated testing)
- Uses same Supabase project as production (shared data per I12)

### Production Deployment
**Target URL:** TBD (assigned after Phase 1 merge)
**Pattern (Expected):** `https://eav-scenes.vercel.app/` or custom domain
**Trigger:** Merges to `main` branch

---

## Build Configuration Details

### Turborepo Integration

**Command Breakdown:**
```bash
cd ../..                                      # Navigate to monorepo root
pnpm install                                  # Install all workspace dependencies
pnpm turbo run build --filter=scenes-web     # Build only scenes-web (with dependencies)
```

**Turborepo Behavior:**
- Automatically builds `@workspace/shared` first (dependency)
- Caches build outputs (faster subsequent builds)
- Parallelizes independent tasks

### Build Output

**Expected Bundle:**
- `dist/index.html` - Entry point
- `dist/assets/index-[hash].js` - App bundle (~64KB)
- `dist/assets/index-[hash].css` - Styles
- `dist/assets/vendor-react-[hash].js` - React vendor bundle (~141KB)
- `dist/assets/vendor-router-[hash].js` - React Router bundle (~32KB)

**Total Bundle Size:** ~237KB (within acceptable range)

### Manual Chunks (Optimization)

**Configured in `vite.config.ts`:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-supabase': ['@supabase/supabase-js'],
        'vendor-router': ['react-router-dom'],
        'vendor-utils': ['zod']
      }
    }
  }
}
```

**Benefits:**
- Improves caching (vendor code changes less frequently)
- Faster initial loads (browser caches vendor bundles)
- Smaller app bundle (app-specific code only)

---

## Independent Deployment Validation

**North Star I11:** scenes-web deploys independently from other apps

### Runtime Independence

✅ **No runtime dependencies on other apps:**
- Copy-editor can redeploy without affecting scenes-web
- Scenes-web can redeploy without affecting copy-editor
- No shared API layer (each app queries Supabase directly)
- No client-to-client messaging (database-as-broker per I10)

✅ **Shared code via build-time bundling:**
- `@workspace/shared` packages bundled into scenes-web at build time
- No runtime imports from other apps
- Vercel deployment includes all necessary code in `dist/`

✅ **Deployment triggers:**
- Changes to `apps/scenes-web/*` → Redeploy scenes-web only
- Changes to `packages/shared/*` → Redeploy all apps using shared (expected)
- Changes to `apps/copy-editor/*` → No scenes-web redeploy (zero blast radius)

---

## Deployment Checklist

### Phase 1 (Current - Configuration Ready)
- [x] Package.json scripts verified (build, dev, preview, test, lint, typecheck)
- [x] Environment variables documented (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
- [x] Build configuration validated (vite.config.ts with manual chunks)
- [x] DEPLOYMENT.md created
- [ ] Vercel project created (manual step after PR merge)
- [ ] Environment variables configured in Vercel UI
- [ ] Preview deployment tested
- [ ] Production URL assigned

### Phase 2 (After Merge - Production Deployment)
- [ ] Create Vercel project: `eav-scenes`
- [ ] Configure root directory: `./`
- [ ] Configure build command: `cd ../.. && pnpm install && pnpm turbo run build --filter=scenes-web`
- [ ] Configure output directory: `apps/scenes-web/dist`
- [ ] Add environment variables (Production + Preview)
- [ ] Connect to GitHub repository: `elevanaltd/eav-monorepo`
- [ ] Configure deployment branch: `main`
- [ ] Test preview deployment (create test PR)
- [ ] Validate production deployment (merge to main)
- [ ] Verify application loads correctly
- [ ] Test Supabase connectivity
- [ ] Confirm RLS policies enforce multi-client isolation

### Phase 3+ (Future - Enhancements)
- [ ] Configure custom domain (optional): `scenes.eav.app` or similar
- [ ] Add performance monitoring (Vercel Analytics)
- [ ] Configure deployment protection (require approvals for production)
- [ ] Set up deployment notifications (Slack/Discord)

---

## Troubleshooting

### Common Issues

#### 1. Module Resolution Errors
**Symptom:** `Cannot find module '@workspace/shared'`
**Cause:** Build command not running from monorepo root
**Fix:** Verify build command includes `cd ../..` before `pnpm install`

#### 2. Environment Variables Not Loaded
**Symptom:** `Missing VITE_SUPABASE_URL environment variable`
**Cause:** Vite requires `VITE_` prefix for frontend exposure
**Fix:** Ensure all environment variables use `VITE_` prefix in Vercel settings

#### 3. Build Warnings (Empty Chunks)
**Symptom:** `(!) Some chunks are larger than 500kb after minification`
**Cause:** Manual chunk configuration includes unused dependencies
**Fix:** Non-blocking (optimization opportunity, not deployment blocker)

#### 4. Supabase Connection Errors
**Symptom:** `Invalid Supabase URL` or `401 Unauthorized`
**Cause:** Incorrect environment variables or publishable key
**Fix:** Verify credentials match `.env.example` and copy-editor configuration

---

## Performance Targets

### Build Performance
- **Target Build Time:** <2 minutes (Vercel)
- **Current:** ~2-3 seconds (local development)
- **Turborepo Cache:** 80%+ hit rate (subsequent builds)

### Bundle Size
- **App Bundle:** <100KB (current: ~64KB ✅)
- **Total Bundle:** <300KB (current: ~237KB ✅)
- **Chunk Size Warnings:** <500KB per chunk (current: all chunks <200KB ✅)

### Runtime Performance
- **First Contentful Paint (FCP):** <1.5s
- **Time to Interactive (TTI):** <3s
- **Lighthouse Score:** >90 (target)

---

## Deployment Evidence

### POC Validation (Experimental Repo)
**Status:** ✅ Proven successful
**Evidence:** Live deployment at `https://eav-monorepo-experimental-scenes-we.vercel.app/`
**Date:** 2025-11-01 (POC Phase 0)
**Findings:**
- Vercel monorepo deployment works correctly
- Environment variables load properly
- Build performance acceptable (<2 min)
- Bundle optimization effective

**Reference:** `.coord/DECISIONS.md` (lines 86-97) - Deployment Platform Architecture validation

---

## Independent Deployment Architecture

**Monorepo → Multi-Project Pattern:**

```
GitHub Repository: elevanaltd/eav-monorepo
│
├─ Vercel Project: eav-scripts (copy-editor)
│  ├─ Root Directory: ./
│  ├─ Build Command: cd ../.. && pnpm turbo build --filter=copy-editor
│  ├─ Output: apps/copy-editor/dist
│  └─ URL: https://eav-copy-editor.vercel.app/
│
├─ Vercel Project: eav-scenes (scenes-web)
│  ├─ Root Directory: ./
│  ├─ Build Command: cd ../.. && pnpm turbo build --filter=scenes-web
│  ├─ Output: apps/scenes-web/dist
│  └─ URL: https://eav-scenes-[hash].vercel.app/ (preview)
│
├─ Future: eav-copy-builder (copy-builder)
├─ Future: eav-library (library-manager)
├─ Future: eav-vo (vo-web)
├─ Future: eav-cam-op (cam-op-pwa)
├─ Future: eav-edit (edit-web)
└─ Future: eav-translations (translations-web)
```

**Key Properties:**
- ✅ Each app has independent Vercel project
- ✅ Each app has independent deployment lifecycle
- ✅ Each app has independent URL
- ✅ Shared packages bundle at build time (no runtime coupling)
- ✅ Zero blast radius between apps (I11 compliance)

---

## Next Steps

### Immediate (Phase 1 - After PR Merge)
1. **Create Vercel project** (5 min)
   - Name: `eav-scenes`
   - Framework: Vite
   - Root Directory: `./`

2. **Configure build settings** (5 min)
   - Build command: `cd ../.. && pnpm install && pnpm turbo run build --filter=scenes-web`
   - Output directory: `apps/scenes-web/dist`
   - Install command: `cd ../.. && corepack enable && pnpm install`

3. **Add environment variables** (5 min)
   - Add to Production environment
   - Add to Preview environment
   - Use same credentials as copy-editor

4. **Test preview deployment** (10 min)
   - Create test PR
   - Verify preview URL generates
   - Test application loads
   - Verify Supabase connectivity

5. **Deploy to production** (5 min)
   - Merge PR to main
   - Verify production deployment triggers
   - Test production URL
   - Confirm application operational

**Total Time:** ~30 minutes

### Future (Phase 2+)
- Apply POC migrations (see MIGRATION-REVIEW.md)
- Configure custom domain (optional)
- Add performance monitoring
- Optimize bundle size (lazy loading if needed)

---

**Phase 1 Status:** ✅ CONFIGURATION COMPLETE
**Deployment Status:** Pending (requires Vercel project creation after PR merge)
**Constitutional Compliance:** ✅ I11 (Independent Deployment Architecture)

---

**Authority:** implementation-lead (Phase 1 extraction)
**Next Phase:** Vercel project creation (holistic-orchestrator or DevOps)
**Documentation:** Complete and ready for deployment

---

**References:**
- `.coord/DECISIONS.md` - Deployment Platform Architecture (lines 86-100)
- `.coord/PROJECT-CONTEXT.md` - Monorepo deployment pattern
- `.coord/apps/scenes-web/APP-CONTEXT.md` - App-specific deployment details
