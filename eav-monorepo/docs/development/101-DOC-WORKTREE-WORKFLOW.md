# Git Worktree Workflow - EAV Monorepo

**Status:** ACTIVE
**Created:** 2025-10-31

---

## Overview

This monorepo uses **git worktrees** for parallel app development. Worktrees allow you to work on multiple feature branches simultaneously without switching branches.

## Structure

```
/Volumes/HestAI-Projects/eav-monorepo/
├── .git/                              (shared git directory)
├── apps/                              (main branch - stable state)
│   ├── copy-editor/
│   ├── scenes-web/
│   ├── data-entry-web/
│   ├── vo-web/
│   ├── cam-op-pwa/
│   ├── edit-web/
│   └── translations-web/
├── packages/
├── supabase/
└── worktrees/                         (gitignored - local only)
    ├── copy-editor/                   → feature/copy-editor
    ├── scenes-web/                    → feature/scenes-web
    ├── data-entry-web/                → feature/data-entry-web
    ├── vo-web/                        → feature/vo-web
    ├── cam-op-pwa/                    → feature/cam-op-pwa
    ├── edit-web/                      → feature/edit-web
    └── translations-web/              → feature/translations-web
```

## Key Concept

**Worktrees = Local Development Convenience**

- Each worktree is a complete checkout of the monorepo on a different branch
- Changes are pushed to GitHub normally (worktrees are transparent to GitHub)
- Vercel monitors GitHub branches and deploys from `apps/{app-name}/` directory
- PRs work exactly as normal

## Workflow

### 1. Working in a Worktree

```bash
# Navigate to app worktree
cd /Volumes/HestAI-Projects/eav-monorepo/worktrees/copy-editor

# Verify branch
git branch --show-current
# Output: feature/copy-editor

# Make changes to the app
cd apps/copy-editor/
# ... edit files ...

# Standard git workflow
git add .
git commit -m "feat: add new feature"
git push origin feature/copy-editor
```

### 2. GitHub Integration

**The magic:** Worktrees are purely local. GitHub sees normal branches.

```
Local:   /worktrees/copy-editor/ (feature/copy-editor)
           ↓ git push
GitHub:  elevanaltd/eav-monorepo (feature/copy-editor)
           ↓ Create PR
GitHub:  PR: feature/copy-editor → main
```

### 3. Vercel Deployment

Each app has a separate Vercel project:

**Vercel Project Settings (example for copy-editor):**
- **Repository:** elevanaltd/eav-monorepo
- **Root Directory:** `apps/copy-editor`
- **Framework:** Vite
- **Build Command:** `cd ../.. && npm run build --workspace=copy-editor`

**Deployment Flow:**
```
Push to feature/copy-editor → Vercel preview deployment
Merge to main → Vercel production deployment
```

### 4. Simultaneous Development

Work on multiple apps at once:

**Terminal 1:**
```bash
cd /Volumes/HestAI-Projects/eav-monorepo/worktrees/copy-editor
# Work on copy-editor feature
```

**Terminal 2:**
```bash
cd /Volumes/HestAI-Projects/eav-monorepo/worktrees/scenes-web
# Work on scenes-web feature simultaneously
```

**Terminal 3:**
```bash
cd /Volumes/HestAI-Projects/eav-monorepo/worktrees/data-entry-web
# Work on data-entry-web feature simultaneously
```

All three can run dev servers on different ports!

## Worktree Management

### List All Worktrees

```bash
cd /Volumes/HestAI-Projects/eav-monorepo
git worktree list
```

Output:
```
/Volumes/HestAI-Projects/eav-monorepo                             [main]
/Volumes/HestAI-Projects/eav-monorepo/worktrees/copy-editor       [feature/copy-editor]
/Volumes/HestAI-Projects/eav-monorepo/worktrees/scenes-web        [feature/scenes-web]
...
```

### Add New Worktree

```bash
cd /Volumes/HestAI-Projects/eav-monorepo
git worktree add worktrees/new-app -b feature/new-app
```

### Remove Worktree

```bash
cd /Volumes/HestAI-Projects/eav-monorepo
git worktree remove worktrees/copy-editor
# Note: This only removes the local directory, not the branch
```

### Prune Stale Worktrees

```bash
cd /Volumes/HestAI-Projects/eav-monorepo
git worktree prune
```

## Common Tasks

### Start Development

```bash
# 1. Navigate to worktree
cd /Volumes/HestAI-Projects/eav-monorepo/worktrees/copy-editor

# 2. Install dependencies (if needed)
npm install

# 3. Start dev server
cd apps/copy-editor
npm run dev
```

### Create a PR

```bash
# 1. Push changes from worktree
cd /Volumes/HestAI-Projects/eav-monorepo/worktrees/copy-editor
git push origin feature/copy-editor

# 2. Create PR on GitHub (via gh CLI or web)
gh pr create --title "feat: add new feature" --body "Description"
```

### Merge to Main

```bash
# 1. Merge PR on GitHub (recommended)
# OR

# 2. Merge locally
cd /Volumes/HestAI-Projects/eav-monorepo  # Main repo
git checkout main
git merge feature/copy-editor
git push origin main
```

## Integration with GitHub Desktop

1. **Add Repository:**
   - File → Add Local Repository
   - Choose: `/Volumes/HestAI-Projects/eav-monorepo`

2. **View Branches:**
   - Click "Current Branch" dropdown
   - See all feature branches

3. **View Changes:**
   - Changes from ALL worktrees appear
   - Switch branches to see specific worktree changes
   - Commit directly from GitHub Desktop

## Best Practices

1. **One worktree per app** - Keep development organized
2. **Feature branches** - Use descriptive names: `feature/script-locking`, `feature/shot-list-ui`
3. **Push early, push often** - Worktrees are local, push to GitHub for backup
4. **Clean up** - Remove worktrees when features are merged
5. **Pull before work** - `git pull origin main` in main repo, then in worktrees

## Migration Note

During the migration phases (Phases 1-3 per CONTENT-MIGRATION-PLAN.md), content will be added to `apps/`, `packages/`, and `supabase/` directories. All worktrees will automatically receive this content through normal git operations.

## Troubleshooting

### Worktree shows wrong branch

```bash
cd /Volumes/HestAI-Projects/eav-monorepo/worktrees/copy-editor
git branch --show-current  # Check current branch
git checkout feature/copy-editor  # Switch if needed
```

### Can't delete branch (has worktree)

```bash
cd /Volumes/HestAI-Projects/eav-monorepo
git worktree remove worktrees/copy-editor  # Remove worktree first
git branch -d feature/copy-editor  # Then delete branch
```

### Worktree directory corrupted

```bash
cd /Volumes/HestAI-Projects/eav-monorepo
git worktree prune  # Clean up stale references
git worktree add worktrees/copy-editor feature/copy-editor  # Re-create
```

## References

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- Experimental Setup: `/Volumes/HestAI-Projects/eav-monorepo-experimental/`
- Deployed Example: https://eav-monorepo-experimental-scenes-we.vercel.app/
- Migration Plan: `CONTENT-MIGRATION-PLAN.md`

---

**Remember:** Worktrees are local convenience. Your git workflow with GitHub and Vercel remains standard.
