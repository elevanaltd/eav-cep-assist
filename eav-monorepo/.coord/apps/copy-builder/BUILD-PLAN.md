# Copy Builder - Build Plan

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## Phase Overview

```
D3 (Current) → B0 → B1 → B2 → B3 → B4
Blueprint    Validate Foundation Core Completion Production
```

**Estimated Effort:**
- B0 (Validation): 1-2 hours (critical-design-validator review)
- B1 (Foundation): 16-24 hours (3-4 days)
- B2 (Core Features): 24-32 hours (5-6 days)
- B3 (Completion): 16-20 hours (3-4 days)
- B4 (Production Handoff): 8-12 hours (2 days)

**Total:** 65-90 hours (13-18 days) with TDD discipline

---

## B0: Architecture Validation

**Goal:** Validate master blueprint before implementation.

### Tasks

1. **critical-design-validator review**
   - Database schema review (RLS policies, indexes, constraints)
   - Architecture pattern validation (component tree, data flows)
   - Integration point validation (copy-editor redirect, shared schema)
   - Performance target feasibility (<200ms search, <500ms save)

2. **requirements-steward alignment check**
   - North Star compliance (I8, I11, I12)
   - Scope boundaries (assembly only, no editing)
   - Success criteria clarity

3. **Stakeholder approval**
   - Blueprint walkthrough with product owner
   - UI mockup review (optional)
   - Timeline and effort estimates approved

**Exit Criteria:**
- ✅ critical-design-validator sign-off
- ✅ requirements-steward confirms North Star alignment
- ✅ No blocking architectural concerns
- ✅ Stakeholder approval to proceed

---

## B1: Foundation Implementation

**Goal:** Database schema, auth scaffolding, basic UI shell.

### Tasks

#### 1.1 Database Migration (TDD)

**Test First:**
```typescript
// TEST: Migration up/down
describe('Copy Builder Migration', () => {
  it('creates script_builder_drafts table', async () => {
    const { data } = await supabase.from('script_builder_drafts').select().limit(1);
    expect(data).toBeDefined(); // Table exists
  });

  it('creates paragraph_library table', async () => {
    const { data } = await supabase.from('paragraph_library').select().limit(1);
    expect(data).toBeDefined();
  });

  it('enforces RLS on script_builder_drafts', async () => {
    // Attempt to read without auth
    const { error } = await anonClient.from('script_builder_drafts').select();
    expect(error?.code).toBe('42501'); // Insufficient privilege
  });
});
```

**Implement:**
- Create migration file: `20251108000000_add_script_builder_tables.sql`
- Run `supabase migration up`
- Verify tables exist with correct columns, indexes, triggers
- Test RLS policies (authenticated user can CRUD own drafts)
- **IMPORTANT:** Migration does NOT modify existing tables (no provenance columns on Copy table)

**Git Commits:**
```bash
git commit -m "TEST: Add Copy Builder migration tests"
git commit -m "FEAT: Add Copy Builder database schema migration"
```

**Effort:** 4-6 hours

---

#### 1.2 Service Layer (TDD)

**Test First:**
```typescript
// draftService.test.ts
describe('draftService', () => {
  describe('save', () => {
    it('creates new draft with auto-generated ID', async () => {
      const draft = { title: 'Test', video_id: testVideoId, components: [] };
      const saved = await draftService.save(draft);
      expect(saved.id).toBeDefined();
      expect(saved.title).toBe('Test');
    });

    it('validates required fields', async () => {
      await expect(draftService.save({ title: '' })).rejects.toThrow();
    });
  });

  describe('complete', () => {
    it('marks draft completed and updates Copy table', async () => {
      const draft = await createTestDraft();
      const { data: existingCopy } = await supabase
        .from('copy')
        .select('id')
        .eq('video_id', draft.video_id)
        .single();

      const copy = await draftService.complete(draft.id);

      expect(copy.id).toBe(existingCopy.id);
      expect(copy.content).toContain('Heat Pump'); // Assembled content

      const updated = await draftService.getById(draft.id);
      expect(updated.status).toBe('completed');
    });

    it('throws if Copy does not exist for video', async () => {
      const draft = await createDraftWithoutCopy();
      await expect(draftService.complete(draft.id)).rejects.toThrow(
        'No Copy record exists'
      );
    });

    it('throws if Copy is locked', async () => {
      const draft = await createDraftWithLockedCopy();
      await expect(draftService.complete(draft.id)).rejects.toThrow(
        'Copy is locked'
      );
    });
  });
});

// libraryService.test.ts
describe('libraryService', () => {
  it('searches library with full-text query', async () => {
    await seedLibrary([{ content: 'Heat pump installation guide', ... }]);
    const results = await libraryService.search({ query: 'heat pump' });
    expect(results.data.length).toBeGreaterThan(0);
  });
});
```

**Implement:**
- `src/services/draftService.ts` (save, list, getById, complete, deleteDraft)
- `src/services/libraryService.ts` (search, getCategories, getSectionTypes)
- `src/errors/DraftError.ts` (error hierarchy)
- `src/validation/draftValidation.ts` (Zod schemas)

**Git Commits:**
```bash
git commit -m "TEST: Add draft service unit tests"
git commit -m "FEAT: Implement draft service with validation"
git commit -m "TEST: Add library service search tests"
git commit -m "FEAT: Implement library service with full-text search"
```

**Effort:** 6-8 hours

---

#### 1.3 Auth & Navigation Shell

**Test First:**
```typescript
describe('App shared components', () => {
  it('renders shared Header component', () => {
    render(<App />);
    expect(screen.getByText('Copy Builder')).toBeInTheDocument();
  });

  it('uses shared database types', () => {
    const draft: Tables<'script_builder_drafts'> = {
      id: 'test-id',
      title: 'Test Draft',
      components: [],
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'test-user',
    };
    expect(draft).toBeDefined();
  });

  it('uses shared error handling', async () => {
    const error = new Error('Test error');
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBeTruthy();
  });

  it('redirects to login when unauthenticated', () => {
    render(<App />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('shows drafts list when authenticated', async () => {
    await signInTestUser();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/my drafts/i)).toBeInTheDocument();
    });
  });
});
```

**Implement:**
- `src/App.tsx` (Router, AuthContext from @workspace/shared, QueryClientProvider)
- `src/pages/DraftsList.tsx` (basic scaffold)
- `src/pages/DraftEditor.tsx` (basic scaffold with shared Header)
- Import Header from @workspace/shared (NOT create custom AppHeader)
- Import AuthContext from @workspace/shared/auth
- Import database types from @workspace/shared/types
- Import getClient from @workspace/shared/client
- Set up error handling with @workspace/shared/errors
- Set up logging with @workspace/shared/services

**Git Commits:**
```bash
git commit -m "TEST: Add shared component integration tests"
git commit -m "FEAT: Integrate @workspace/shared components

- Use shared Header component (not custom)
- Use shared Auth context
- Use shared database types
- Use shared error handling
- Use shared logger

Evidence: packages/shared/src/index.ts exports
Location: @workspace/shared v0.5.0"
```

**Effort:** 3-4 hours (reduced from 4-6 by using shared components)

---

#### 1.4 Quality Gates

- Run `npm run lint` → 0 errors
- Run `npm run typecheck` → 0 errors
- Run `npm run test` → All passing
- Run `npm run build` → Success

**Exit Criteria:**
- ✅ Database schema operational (up + down migrations tested)
- ✅ Service layer tested (unit tests passing, TDD evidence in git log)
- ✅ App shell renders with auth
- ✅ All quality gates passing

---

## B2: Core Features Implementation

**Goal:** Search, drag-drop, placeholders, notes, auto-save.

### Tasks

#### 2.1 Library Search & Display (TDD)

**Test First:**
```typescript
describe('LibrarySearch', () => {
  it('displays search results', async () => {
    await seedLibrary([{ component_name: 'Heat Pump', ... }]);
    render(<LibrarySearch />);

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'heat pump' } });

    await waitFor(() => {
      expect(screen.getByText('Heat Pump')).toBeInTheDocument();
    });
  });

  it('paginates results', async () => {
    await seedLibrary(30); // More than 20
    render(<LibrarySearch />);

    expect(screen.getByText(/load more/i)).toBeInTheDocument();
  });
});
```

**Implement:**
- `src/components/Library/LibrarySearch.tsx`
- `src/components/Library/LibraryComponentCard.tsx`
- `src/hooks/useLibrarySearch.ts` (React Query)
- Debounced search input
- Pagination controls

**Git Commits:**
```bash
git commit -m "TEST: Add library search component tests"
git commit -m "FEAT: Implement library search with pagination"
```

**Effort:** 6-8 hours

---

#### 2.2 Drag & Drop (TDD)

**Test First:**
```typescript
describe('DraftCanvas drag & drop', () => {
  it('adds component when dropped', async () => {
    render(<DraftEditor />);

    const card = screen.getByText('Heat Pump');
    const canvas = screen.getByTestId('draft-canvas');

    // Simulate drag & drop
    fireEvent.dragStart(card);
    fireEvent.drop(canvas);

    await waitFor(() => {
      expect(canvas).toHaveTextContent('Heat Pump');
    });
  });

  it('reorders components with up/down buttons', async () => {
    const draft = createDraftWithComponents(['A', 'B', 'C']);
    render(<DraftEditor draft={draft} />);

    const upButton = screen.getAllByLabelText('Move up')[1]; // Component B
    fireEvent.click(upButton);

    await waitFor(() => {
      const components = screen.getAllByTestId('draft-component');
      expect(components[0]).toHaveTextContent('B');
      expect(components[1]).toHaveTextContent('A');
    });
  });
});
```

**Implement:**
- `src/components/Draft/DraftCanvas.tsx` (drop zone)
- `src/components/Draft/DraftComponentCard.tsx` (draggable/droppable)
- `@dnd-kit/core` integration
- Reorder controls (up/down arrows)

**Git Commits:**
```bash
git commit -m "TEST: Add drag & drop tests"
git commit -m "FEAT: Implement drag & drop with @dnd-kit"
git commit -m "TEST: Add reorder tests"
git commit -m "FEAT: Implement component reordering"
```

**Effort:** 8-10 hours

---

#### 2.3 Placeholders & Notes (TDD)

**Test First:**
```typescript
describe('PlaceholderPanel', () => {
  it('adds custom placeholder', async () => {
    render(<DraftEditor />);

    const input = screen.getByPlaceholderText(/add placeholder/i);
    fireEvent.change(input, { target: { value: 'Sink' } });
    fireEvent.click(screen.getByText(/add/i));

    await waitFor(() => {
      expect(screen.getByText('Sink')).toBeInTheDocument();
    });
  });

  it('adds note to component', async () => {
    const draft = createDraftWithComponents(['Heat Pump']);
    render(<DraftEditor draft={draft} />);

    fireEvent.click(screen.getByLabelText('Add note'));

    const noteInput = screen.getByPlaceholderText(/note/i);
    fireEvent.change(noteInput, { target: { value: 'Test note' } });
    fireEvent.click(screen.getByText(/save note/i));

    await waitFor(() => {
      expect(screen.getByText(/test note/i)).toBeInTheDocument();
    });
  });
});
```

**Implement:**
- `src/components/Draft/PlaceholderPanel.tsx`
- `src/components/Draft/NoteEditor.tsx` (modal)
- Placeholder validation (sanitization)
- Note CRUD operations

**Git Commits:**
```bash
git commit -m "TEST: Add placeholder tests"
git commit -m "FEAT: Implement placeholder functionality"
git commit -m "TEST: Add note editor tests"
git commit -m "FEAT: Implement note editor modal"
```

**Effort:** 6-8 hours

---

#### 2.4 Auto-Save (TDD)

**Test First:**
```typescript
describe('Auto-save', () => {
  it('saves draft after 2 second debounce', async () => {
    render(<DraftEditor />);

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test' } });

    // Wait for debounce + save
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows saving indicator', async () => {
    render(<DraftEditor />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test' } });

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('shows error on save failure', async () => {
    mockSupabaseError();
    render(<DraftEditor />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test' } });

    await waitFor(() => {
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
    });
  });
});
```

**Implement:**
- `src/hooks/useSaveDraft.ts` (React Query mutation)
- `src/hooks/useAutoSave.ts` (debounced save logic)
- `src/components/Draft/SaveIndicator.tsx`
- Optimistic UI updates
- Error recovery (retry button)

**Git Commits:**
```bash
git commit -m "TEST: Add auto-save tests"
git commit -m "FEAT: Implement auto-save with debounce"
git commit -m "TEST: Add save error handling tests"
git commit -m "FEAT: Add save indicator and error recovery"
```

**Effort:** 4-6 hours

---

#### 2.5 Quality Gates

- Run full test suite → All passing
- Run `npm run lint && npm run typecheck` → 0 errors
- Manual testing: Create draft, add components, save, verify DB

**Exit Criteria:**
- ✅ Library search operational with pagination
- ✅ Drag & drop working smoothly (<16ms frame time)
- ✅ Placeholders and notes functional
- ✅ Auto-save working with visual feedback
- ✅ All tests passing (TDD evidence in git log)

---

## B3: Completion & Integration

**Goal:** "Complete & Send" flow, integration tests, polish.

### Tasks

#### 3.1 Draft Completion Flow (TDD)

**Test First:**
```typescript
describe('Draft completion', () => {
  it('completes draft and updates Copy table', async () => {
    const draft = await createTestDraft({ title: 'Test', components: [...] });
    const { data: existingCopy } = await supabase
      .from('copy')
      .select('id')
      .eq('video_id', draft.video_id)
      .single();

    render(<DraftEditor draft={draft} />);

    fireEvent.click(screen.getByText(/complete & export/i));

    // Confirmation modal
    fireEvent.click(screen.getByText(/complete & export/i)); // Confirm

    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('/copy/')
      );
    });

    // Verify Copy updated (NOT scripts table)
    const { data: updatedCopy } = await supabase
      .from('copy')
      .select('content')
      .eq('id', existingCopy.id)
      .single();

    expect(updatedCopy.content).toContain('Heat Pump'); // Assembled content
  });

  it('prevents completion if invalid', () => {
    const draft = createDraftWithComponents([]); // Empty
    render(<DraftEditor draft={draft} />);

    expect(screen.getByText(/complete & send/i)).toBeDisabled();
  });

  it('increments library component usage', async () => {
    const component = await seedLibrary([{ times_used: 5 }]);
    const draft = await createDraftWithLibraryComponent(component.id);

    await draftService.complete(draft.id);

    const updated = await supabase.from('paragraph_library').select().eq('id', component.id).single();
    expect(updated.data.times_used).toBe(6);
  });
});
```

**Implement:**
- `src/hooks/useCompleteDraft.ts` (React Query mutation)
- `src/components/Draft/CompleteButton.tsx`
- `src/components/Draft/ConfirmationModal.tsx`
- Content assembly logic (assembleContent helper)
- Usage counter increment (RPC call)
- Redirect to copy-editor

**Git Commits:**
```bash
git commit -m "TEST: Add draft completion tests"
git commit -m "FEAT: Implement draft completion flow"
git commit -m "TEST: Add usage tracking tests"
git commit -m "FEAT: Implement library usage tracking"
```

**Effort:** 6-8 hours

---

#### 3.2 Integration Tests

**Test First:**
```typescript
describe('Copy Builder integration', () => {
  it('completes full user workflow', async () => {
    // 1. Create draft
    render(<App />);
    fireEvent.click(screen.getByText(/new draft/i));

    // 2. Enter details
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Integration Test' } });
    fireEvent.change(screen.getByLabelText(/video/i), { target: { value: testVideoId } });

    // 3. Search library
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'heat pump' } });
    await waitFor(() => screen.getByText('Heat Pump Overview'));

    // 4. Add component
    const card = screen.getByText('Heat Pump Overview');
    const canvas = screen.getByTestId('draft-canvas');
    fireEvent.dragStart(card);
    fireEvent.drop(canvas);

    // 5. Add note
    fireEvent.click(screen.getByLabelText('Add note'));
    fireEvent.change(screen.getByPlaceholderText(/note/i), { target: { value: 'Test note' } });
    fireEvent.click(screen.getByText(/save note/i));

    // 6. Complete
    fireEvent.click(screen.getByText(/complete & send/i));
    fireEvent.click(screen.getByText(/complete & send/i)); // Confirm

    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalled();
    });
  });
});
```

**Implement:**
- Full workflow integration tests (create → edit → complete)
- Error recovery tests (network failures, validation errors)
- Performance regression tests (search <200ms, save <500ms)

**Git Commits:**
```bash
git commit -m "TEST: Add full workflow integration tests"
git commit -m "TEST: Add error recovery integration tests"
```

**Effort:** 4-6 hours

---

#### 3.3 UI Polish & Accessibility

**Tasks:**
- Keyboard navigation (Tab, Enter, Esc, Cmd+S)
- ARIA labels on all interactive elements
- Focus management (modal traps, return focus)
- Loading states (skeletons, spinners)
- Empty states (no drafts, no search results, no components)
- Error states (save failed, load failed, Copy not found, Copy locked)
- Success notifications (draft saved, Copy updated)
- Responsive breakpoints (desktop priority, mobile Phase 2)

**Testing:**
- Keyboard-only navigation test
- Screen reader test (VoiceOver/NVDA)
- Color contrast audit (WCAG AA)
- Lighthouse accessibility score >90

**Git Commits:**
```bash
git commit -m "FEAT: Add keyboard navigation support"
git commit -m "FEAT: Add ARIA labels and focus management"
git commit -m "FEAT: Add loading and empty states"
git commit -m "FEAT: Add error and success notifications"
```

**Effort:** 4-6 hours

---

#### 3.4 Quality Gates

- All tests passing (unit + integration)
- Lighthouse score: Performance >80, Accessibility >90
- Manual QA checklist:
  - ✅ Create draft → Add components → Save → Complete → Redirect to Copy-Editor
  - ✅ Search library with various queries
  - ✅ Drag & drop smooth (no jank)
  - ✅ Notes save and display correctly
  - ✅ Placeholders work
  - ✅ Auto-save indicator shows status
  - ✅ Error recovery works (network failure simulation)
  - ✅ Copy table validation (draft/blank check via copy_locks)
  - ✅ Batch query optimization (no N+1 queries)

**Exit Criteria:**
- ✅ "Complete & Send" flow operational
- ✅ Integration tests passing
- ✅ Accessibility requirements met
- ✅ Manual QA passing

---

## B4: Production Handoff

**Goal:** Production deployment, monitoring, documentation.

### Tasks

#### 4.1 Deployment Configuration

**Tasks:**
- Create Vercel project: `eav-copy-builder`
- Configure environment variables:
  ```
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  VITE_SCRIPTS_WEB_URL=https://eav-copy-editor.vercel.app
  ```
- Configure build settings:
  - Build command: `pnpm run build`
  - Output directory: `dist`
  - Install command: `pnpm install --frozen-lockfile`
- Set up preview deployments (automatic per PR)

**Git Commits:**
```bash
git commit -m "FEAT: Add Vercel deployment configuration"
```

**Effort:** 2-3 hours

---

#### 4.2 Production Testing

**Tasks:**
- Deploy to preview environment
- Run smoke tests:
  - Auth works (login → drafts list)
  - Library search works (real data)
  - Create draft works (real DB)
  - Complete draft works (creates real script)
  - Redirect to copy-editor works
- Performance validation:
  - Library search <200ms (measure with DevTools)
  - Auto-save <500ms
  - Complete & Send <1s
- RLS validation:
  - User A cannot see User B's drafts
  - User A cannot modify User B's drafts

**Effort:** 3-4 hours

---

#### 4.3 Monitoring & Observability

**Tasks:**
- Set up error tracking (Sentry or similar)
- Add performance monitoring (Web Vitals)
- Configure Vercel Analytics
- Add custom events:
  - `draft_created`
  - `draft_completed`
  - `library_search`
  - `component_added`
- Document runbook for common issues

**Git Commits:**
```bash
git commit -m "FEAT: Add error tracking and analytics"
```

**Effort:** 2-3 hours

---

#### 4.4 Documentation

**Tasks:**
- Update README.md with deployment instructions
- Create USER-GUIDE.md for end users
- Create TROUBLESHOOTING.md for support
- Document environment variables
- Document database migrations

**Effort:** 2-3 hours

---

#### 4.5 Production Deployment

**Tasks:**
- Merge to `main` branch
- Trigger production deployment
- Verify deployment successful
- Run post-deployment smoke tests
- Monitor for errors (24-hour watch)

**Exit Criteria:**
- ✅ Deployed to production (https://eav-copy-builder.vercel.app)
- ✅ Smoke tests passing in production
- ✅ Performance targets met
- ✅ No errors in monitoring dashboard
- ✅ Documentation complete

---

## Dependency Mapping

```
B1.1 (Database) ──────┬──────→ B2.1 (Search)
                      │
                      ├──────→ B2.2 (Drag-Drop)
                      │
                      └──────→ B2.4 (Auto-save)

B1.2 (Service Layer) ─┴──────→ B2.1, B2.4, B3.1

B1.3 (Auth Shell) ────────────→ All B2 tasks

B2.1 + B2.2 + B2.3 ───────────→ B3.1 (Completion)

B3.1 (Completion) ────────────→ B3.2 (Integration)

B3.2 + B3.3 ──────────────────→ B4 (Production)
```

**Critical Path:**
B1.1 → B1.2 → B2.4 → B3.1 → B3.2 → B4

---

## Risk Mitigation

### Risk 1: Full-Text Search Performance

**Risk:** Search query takes >200ms with 1000+ components.

**Mitigation:**
- GIN index on `search_vector` column (included in migration)
- EXPLAIN ANALYZE during B1 to validate query plan
- If slow, add materialized view or adjust index configuration
- Fallback: ILIKE pattern matching (less accurate but faster for small datasets)

---

### Risk 2: Drag & Drop Jank

**Risk:** Drag & drop feels sluggish (>16ms frame time).

**Mitigation:**
- Use `@dnd-kit` sensors with pointer events (better performance)
- Memoize component cards (`React.memo`)
- Virtual scrolling if >50 components (use `react-window`)
- Profile with React DevTools during B2

---

### Risk 3: Auto-Save Conflicts

**Risk:** Rapid changes cause save conflicts or data loss.

**Mitigation:**
- 2-second debounce (balance between safety and server load)
- Optimistic UI updates with rollback on error
- Last-write-wins strategy (no complex conflict resolution for MVP)
- Visual feedback (save indicator shows status)

---

### Risk 4: Integration with copy-editor

**Risk:** Redirect fails or script not visible in copy-editor.

**Mitigation:**
- Test redirect in B3.1 with real copy-editor URL
- Verify `built_from_library` flag set correctly
- Verify `source_draft_id` foreign key constraint
- Document expected format for assembled content

---

## Testing Strategy Summary

### TDD Discipline (North Star I7)

**Every feature follows RED→GREEN→REFACTOR:**
1. Write failing test → Commit "TEST: ..."
2. Implement minimal code → Commit "FEAT: ..."
3. Refactor while tests pass → Commit "REFACTOR: ..."

**Git log must show TEST before FEAT for every feature.**

---

### Test Pyramid

- **Unit (80%):** Service layer, validation, utilities
- **Integration (15%):** Component interactions, React Query, Supabase
- **E2E (5%):** Full user workflow, critical paths

**Target:** 80%+ code coverage (diagnostic, not gate)

---

### Test Environments

- **Local:** Supabase local instance (Docker)
- **CI:** GitHub Actions with Supabase test instance
- **Staging:** Preview deployment with real Supabase project
- **Production:** Production Supabase project

---

## Success Metrics

### Functional
- ✅ Users can create drafts with library components
- ✅ Users can add placeholders with notes
- ✅ Auto-save prevents data loss
- ✅ "Complete & Send" creates valid script in copy-editor

### Performance
- ✅ Library search <200ms (20 results)
- ✅ Auto-save <500ms
- ✅ Complete & Send <1s
- ✅ Drag & drop <16ms frame time (60fps)

### Quality
- ✅ 0 TypeScript errors (strict mode)
- ✅ 0 ESLint warnings
- ✅ All tests passing (TDD evidence in git log)
- ✅ RLS policies prevent unauthorized access
- ✅ Lighthouse Accessibility >90

### User Experience
- ✅ Writers assemble 10-component script in <3 minutes
- ✅ Library search finds relevant components in 1-2 queries
- ✅ Auto-save provides confidence (visible indicator)
- ✅ No data loss (tested with network failures)

---

## Next Actions

1. **Schedule B0 review** with critical-design-validator
2. **Create GitHub project board** with tasks from this plan
3. **Set up local Supabase** for development
4. **Initialize app scaffolding** (Vite + React + Router)
5. **Proceed to B1** after B0 approval

---

**Blueprint Complete:** Ready for critical-design-validator review.
