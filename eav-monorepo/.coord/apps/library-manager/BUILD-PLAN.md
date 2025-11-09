# Library Manager - Build Plan

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
- B1 (Foundation): 12-16 hours (2-3 days)
- B2 (Core Features): 20-24 hours (4-5 days)
- B3 (Completion): 12-16 hours (2-3 days)
- B4 (Production Handoff): 8-12 hours (2 days)

**Total:** 53-70 hours (11-14 days) with TDD discipline

**Note:** Library Manager is simpler than Script Builder (no drag-drop, no auto-save), reducing effort by ~25%.

---

## B0: Architecture Validation

**Goal:** Validate master blueprint before implementation.

### Tasks

1. **critical-design-validator review**
   - Database schema additions (scripts.library_status columns)
   - RLS policies (editors/admins only can INSERT paragraph_library)
   - Integration validation (reuses Script Builder's paragraph_library table)
   - Performance target feasibility (<500ms review queue, <200ms auto-suggest)

2. **requirements-steward alignment check**
   - North Star compliance (I8, I11, I12)
   - Scope boundaries (cataloging only, no editing)
   - Success criteria clarity

3. **Stakeholder approval**
   - Blueprint walkthrough with product owner
   - Review workflow validation
   - Timeline and effort estimates approved

**Exit Criteria:**
- ✅ critical-design-validator sign-off
- ✅ requirements-steward confirms North Star alignment
- ✅ No blocking architectural concerns
- ✅ Stakeholder approval to proceed

---

## B1: Foundation Implementation

**Goal:** Database additions, auth scaffolding, basic UI shell.

### Tasks

#### 1.1 Database Migration (TDD)

**Dependencies:** Requires Script Builder migration (20251108000000) applied first.

**Test First:**
```typescript
describe('Library Manager Migration', () => {
  it('adds library_status columns to scripts', async () => {
    const { data } = await supabase.from('scripts').select('library_status').limit(1);
    expect(data).toBeDefined(); // Column exists
  });

  it('enforces RLS for paragraph_library INSERT', async () => {
    // User without employee role attempts to insert
    const { error } = await userClient.from('paragraph_library').insert({
      content: 'Test',
      component_name: 'Test',
      source_script_id: testScriptId,
      source_paragraph_index: 0,
    });

    expect(error?.code).toBe('42501'); // Insufficient privilege
  });

  it('allows employees to INSERT paragraph_library', async () => {
    // User with employee role
    const { error } = await employeeClient.from('paragraph_library').insert({
      content: 'Test',
      component_name: 'Test',
      source_script_id: testScriptId,
      source_paragraph_index: 0,
    });

    expect(error).toBeNull();
  });
});
```

**Implement:**
- Create migration file: `20251109000000_add_library_manager_columns.sql`
- Run `supabase migration up`
- Verify columns exist, RLS policies enforced
- Test mark_script_reviewed() RPC function

**Git Commits:**
```bash
git commit -m "TEST: Add Library Manager migration tests"
git commit -m "FEAT: Add Library Manager database schema additions"
```

**Effort:** 3-4 hours

---

#### 1.2 Service Layer (TDD)

**Test First:**
```typescript
describe('scriptService', () => {
  describe('getReviewQueue', () => {
    it('returns approved scripts not reviewed', async () => {
      await seedScripts([
        { status: 'approved', library_status: 'not_reviewed' }, // Should appear
        { status: 'approved', library_status: 'reviewed' }, // Should NOT appear
        { status: 'draft', library_status: 'not_reviewed' }, // Should NOT appear
      ]);

      const queue = await scriptService.getReviewQueue();

      expect(queue.length).toBe(1);
      expect(queue[0].library_status).toBe('not_reviewed');
    });
  });

  describe('markScriptReviewed', () => {
    it('marks script as reviewed', async () => {
      const script = await seedScripts([{ status: 'approved', library_status: 'not_reviewed' }])[0];

      await scriptService.markScriptReviewed(script.id);

      const updated = await supabase.from('scripts').select().eq('id', script.id).single();
      expect(updated.data.library_status).toBe('reviewed');
      expect(updated.data.library_reviewed_at).toBeDefined();
    });
  });
});

describe('libraryService', () => {
  describe('saveComponent', () => {
    it('saves component with content hash', async () => {
      const component = {
        content: 'Test content',
        component_name: 'Test Component',
        source_script_id: testScriptId,
        source_paragraph_index: 0,
      };

      const saved = await libraryService.saveComponent(component);

      expect(saved.content_hash).toBeDefined();
      expect(saved.id).toBeDefined();
    });

    it('detects duplicate content', async () => {
      const component = { content: 'Duplicate', component_name: 'Dup', ... };

      await libraryService.saveComponent(component);

      await expect(
        libraryService.saveComponent(component)
      ).rejects.toThrow(DuplicateContentError);
    });
  });

  describe('getMakeModelSuggestions', () => {
    it('returns suggestions matching query', async () => {
      await seedLibrary([
        { make_model: 'Zeroth Heat Pump' },
        { make_model: 'Neff Oven' },
      ]);

      const suggestions = await libraryService.getMakeModelSuggestions('heat');

      expect(suggestions).toContain('Zeroth Heat Pump');
      expect(suggestions).not.toContain('Neff Oven');
    });
  });
});
```

**Implement:**
- `src/services/scriptService.ts` (getReviewQueue, getScriptForReview, markScriptReviewed)
- `src/services/libraryService.ts` (saveComponent, checkDuplicate, getMakeModelSuggestions)
- `src/errors/LibraryError.ts` (error hierarchy)
- `src/validation/componentValidation.ts` (Zod schemas)
- `src/utils/contentHash.ts` (calculateContentHash client-side)

**Git Commits:**
```bash
git commit -m "TEST: Add script service tests"
git commit -m "FEAT: Implement script service with review queue"
git commit -m "TEST: Add library service tests"
git commit -m "FEAT: Implement library service with duplicate detection"
git commit -m "TEST: Add content hash utility tests"
git commit -m "FEAT: Implement SHA-256 content hashing"
```

**Effort:** 5-6 hours

---

#### 1.3 Auth & Navigation Shell

**Test First:**
```typescript
describe('App shared components', () => {
  it('renders shared Header component', () => {
    render(<App />);
    expect(screen.getByText('Library Manager')).toBeInTheDocument();
  });

  it('uses shared database types', () => {
    const script: Tables<'scripts'> = {
      id: 'test-id',
      title: 'Test Script',
      status: 'approved',
      library_status: 'not_reviewed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      video_id: 'test-video',
    };
    expect(script).toBeDefined();
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

  it('shows review queue when authenticated as employee', async () => {
    await signInTestUser({ role: 'employee' });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/review queue/i)).toBeInTheDocument();
    });
  });

  it('blocks access for non-employees', async () => {
    await signInTestUser({ role: 'viewer' });
    render(<App />);
    expect(screen.getByText(/insufficient permission/i)).toBeInTheDocument();
  });
});
```

**Implement:**
- `src/App.tsx` (Router, AuthContext from @workspace/shared, QueryClientProvider)
- `src/pages/ReviewQueue.tsx` (basic scaffold)
- `src/pages/ScriptReview.tsx` (basic scaffold with shared Header)
- `src/pages/LibraryBrowser.tsx` (basic scaffold)
- Import Header from @workspace/shared (NOT create custom AppHeader)
- Import AuthContext from @workspace/shared/auth
- Import database types from @workspace/shared/types
- Import getClient from @workspace/shared/client
- Import AutocompleteField from @workspace/shared (for tagging form)
- Set up error handling with @workspace/shared/errors
- Set up logging with @workspace/shared/services
- Role-based access control (editors/admins only)

**Git Commits:**
```bash
git commit -m "TEST: Add shared component integration tests"
git commit -m "FEAT: Integrate @workspace/shared components

- Use shared Header component (not custom)
- Use shared Auth context
- Use shared database types
- Use shared error handling
- Use shared logger
- Use shared AutocompleteField for tagging form

Evidence: packages/shared/src/index.ts exports
Location: @workspace/shared v0.5.0"
git commit -m "TEST: Add role-based access control tests"
git commit -m "FEAT: Implement employee/admin role check"
```

**Effort:** 3-4 hours (same as before, but more robust with shared components)

---

#### 1.4 Quality Gates

- Run `npm run lint` → 0 errors
- Run `npm run typecheck` → 0 errors
- Run `npm run test` → All passing
- Run `npm run build` → Success

**Exit Criteria:**
- ✅ Database schema additions operational
- ✅ Service layer tested (TDD evidence in git log)
- ✅ App shell renders with role-based access
- ✅ All quality gates passing

---

## B2: Core Features Implementation

**Goal:** Review queue, paragraph tagging, metadata form, duplicate detection.

### Tasks

#### 2.1 Review Queue (TDD)

**Test First:**
```typescript
describe('ReviewQueue', () => {
  it('displays approved scripts awaiting review', async () => {
    await seedScripts([
      { title: 'Heat Pump Guide', status: 'approved', library_status: 'not_reviewed' },
    ]);

    render(<ReviewQueue />);

    await waitFor(() => {
      expect(screen.getByText('Heat Pump Guide')).toBeInTheDocument();
    });
  });

  it('navigates to review page on click', async () => {
    await seedScripts([{ title: 'Test Script', status: 'approved', library_status: 'not_reviewed' }]);

    render(<ReviewQueue />);

    const reviewButton = screen.getByText(/start review/i);
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(window.location.pathname).toContain('/review/');
    });
  });
});
```

**Implement:**
- `src/pages/ReviewQueue.tsx` (list view)
- `src/components/Review/ScriptCard.tsx`
- `src/hooks/useReviewQueue.ts` (React Query)
- Filter controls (status, search)

**Git Commits:**
```bash
git commit -m "TEST: Add review queue tests"
git commit -m "FEAT: Implement review queue with filtering"
```

**Effort:** 4-5 hours

---

#### 2.2 Paragraph Selection & Tagging Form (TDD)

**Test First:**
```typescript
describe('ScriptReview', () => {
  it('displays script paragraphs', async () => {
    const script = await seedScripts([{
      plain_text: 'Paragraph 1\n\nParagraph 2\n\nParagraph 3',
      status: 'approved',
    }])[0];

    render(<ScriptReview scriptId={script.id} />);

    await waitFor(() => {
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });
  });

  it('expands tagging form on click', async () => {
    render(<ScriptReview scriptId={testScriptId} />);

    const tagButton = screen.getAllByText(/tag component/i)[0];
    fireEvent.click(tagButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/component name/i)).toBeInTheDocument();
    });
  });

  it('saves component with metadata', async () => {
    render(<ScriptReview scriptId={testScriptId} />);

    // Expand form
    fireEvent.click(screen.getAllByText(/tag component/i)[0]);

    // Fill form
    fireEvent.change(screen.getByLabelText(/component name/i), {
      target: { value: 'Heat Pump Overview' },
    });
    fireEvent.change(screen.getByLabelText(/make\/model/i), {
      target: { value: 'Zeroth Heat Pump' },
    });

    // Save
    fireEvent.click(screen.getByText(/save to library/i));

    await waitFor(() => {
      expect(screen.getByText(/component saved/i)).toBeInTheDocument();
    });

    // Verify saved
    const components = await supabase.from('paragraph_library').select().eq('component_name', 'Heat Pump Overview');
    expect(components.data?.length).toBe(1);
  });
});
```

**Implement:**
- `src/pages/ScriptReview.tsx` (2-column layout)
- `src/components/Review/ParagraphCard.tsx` (selectable)
- `src/components/Review/TaggingForm.tsx` (inline expandable)
- `src/components/Review/ReviewSidebar.tsx`
- `src/hooks/useSaveComponent.ts` (React Query mutation)

**Git Commits:**
```bash
git commit -m "TEST: Add paragraph selection tests"
git commit -m "FEAT: Implement paragraph selection UI"
git commit -m "TEST: Add tagging form tests"
git commit -m "FEAT: Implement inline tagging form"
git commit -m "TEST: Add save component tests"
git commit -m "FEAT: Implement save component with validation"
```

**Effort:** 8-10 hours

---

#### 2.3 Duplicate Detection & Auto-Suggest (TDD)

**Test First:**
```typescript
describe('Duplicate detection', () => {
  it('shows warning for duplicate content', async () => {
    // Seed existing component
    await seedLibrary([{ content: 'Duplicate content', component_name: 'Existing' }]);

    render(<ScriptReview scriptId={testScriptId} />);

    // Try to tag same content
    fireEvent.click(screen.getAllByText(/tag component/i)[0]);
    fireEvent.change(screen.getByLabelText(/component name/i), {
      target: { value: 'New Name' },
    });
    fireEvent.click(screen.getByText(/save to library/i));

    await waitFor(() => {
      expect(screen.getByText(/duplicate content detected/i)).toBeInTheDocument();
    });
  });

  it('allows saving duplicate if confirmed', async () => {
    // Setup duplicate scenario...

    // Confirm duplicate save
    fireEvent.click(screen.getByText(/save anyway/i));

    await waitFor(() => {
      expect(screen.getByText(/component saved/i)).toBeInTheDocument();
    });
  });
});

describe('Make/model auto-suggest', () => {
  it('shows suggestions matching query', async () => {
    await seedLibrary([{ make_model: 'Zeroth Heat Pump' }]);

    render(<TaggingForm />);

    const input = screen.getByLabelText(/make\/model/i);
    fireEvent.change(input, { target: { value: 'heat' } });

    await waitFor(() => {
      expect(screen.getByText('Zeroth Heat Pump')).toBeInTheDocument();
    });
  });
});
```

**Implement:**
- `src/components/Review/DuplicateWarning.tsx` (modal)
- `src/components/Review/MakeModelSuggest.tsx` (dropdown)
- `src/hooks/useMakeModelSuggestions.ts` (React Query)
- Debounced auto-suggest input

**Git Commits:**
```bash
git commit -m "TEST: Add duplicate detection tests"
git commit -m "FEAT: Implement duplicate detection with warning modal"
git commit -m "TEST: Add auto-suggest tests"
git commit -m "FEAT: Implement make/model auto-suggest"
```

**Effort:** 6-8 hours

---

#### 2.4 Mark Script Reviewed (TDD)

**Test First:**
```typescript
describe('Mark script reviewed', () => {
  it('marks script as reviewed', async () => {
    const script = await seedScripts([{ status: 'approved', library_status: 'not_reviewed' }])[0];

    render(<ScriptReview scriptId={script.id} />);

    // Tag at least one paragraph first
    // ... (tagging flow)

    // Mark reviewed
    fireEvent.click(screen.getByText(/mark script reviewed/i));
    fireEvent.click(screen.getByText(/mark reviewed/i)); // Confirm

    await waitFor(() => {
      expect(screen.getByText(/script marked reviewed/i)).toBeInTheDocument();
    });

    // Verify status updated
    const updated = await supabase.from('scripts').select().eq('id', script.id).single();
    expect(updated.data.library_status).toBe('reviewed');
  });

  it('disables button if no paragraphs tagged', async () => {
    render(<ScriptReview scriptId={testScriptId} />);

    const button = screen.getByText(/mark script reviewed/i);
    expect(button).toBeDisabled();
  });
});
```

**Implement:**
- `src/components/Review/MarkReviewedButton.tsx`
- `src/components/Review/ConfirmReviewedModal.tsx`
- `src/hooks/useMarkScriptReviewed.ts` (React Query mutation)
- Progress tracking (N tagged / M paragraphs)

**Git Commits:**
```bash
git commit -m "TEST: Add mark reviewed tests"
git commit -m "FEAT: Implement mark script reviewed flow"
```

**Effort:** 3-4 hours

---

#### 2.5 Quality Gates

- All tests passing (unit + integration)
- Manual testing: Review script → Tag paragraphs → Mark reviewed
- Performance check: Review queue <500ms, Auto-suggest <100ms

**Exit Criteria:**
- ✅ Review queue operational
- ✅ Paragraph tagging functional
- ✅ Duplicate detection working
- ✅ Mark reviewed flow complete
- ✅ All tests passing (TDD evidence)

---

## B3: Completion & Integration

**Goal:** Library browse, integration tests, polish.

### Tasks

#### 3.1 Library Browser (TDD)

**Test First:**
```typescript
describe('LibraryBrowser', () => {
  it('displays cataloged components', async () => {
    await seedLibrary([
      { component_name: 'Heat Pump Overview' },
      { component_name: 'Cylinder Maintenance' },
    ]);

    render(<LibraryBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Heat Pump Overview')).toBeInTheDocument();
      expect(screen.getByText('Cylinder Maintenance')).toBeInTheDocument();
    });
  });

  it('searches library by query', async () => {
    await seedLibrary([
      { component_name: 'Heat Pump', content: 'Heat pump details' },
      { component_name: 'Oven', content: 'Oven details' },
    ]);

    render(<LibraryBrowser />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'heat' } });

    await waitFor(() => {
      expect(screen.getByText('Heat Pump')).toBeInTheDocument();
      expect(screen.queryByText('Oven')).not.toBeInTheDocument();
    });
  });
});
```

**Implement:**
- `src/pages/LibraryBrowser.tsx`
- `src/components/Library/ComponentGrid.tsx`
- `src/components/Library/ComponentCard.tsx` (display only)
- Reuse Script Builder's `useLibrarySearch` hook
- Filter controls (category, make/model)

**Git Commits:**
```bash
git commit -m "TEST: Add library browser tests"
git commit -m "FEAT: Implement library browser with search"
```

**Effort:** 4-5 hours

---

#### 3.2 Integration Tests

**Test First:**
```typescript
describe('Library Manager integration', () => {
  it('completes full review workflow', async () => {
    // Seed approved script
    const script = await seedScripts([{
      title: 'Integration Test',
      plain_text: 'Paragraph 1\n\nParagraph 2',
      status: 'approved',
      library_status: 'not_reviewed',
    }])[0];

    // 1. Load review queue
    render(<App />);
    await waitFor(() => screen.getByText('Integration Test'));

    // 2. Start review
    fireEvent.click(screen.getByText(/start review/i));

    // 3. Tag first paragraph
    await waitFor(() => screen.getAllByText(/tag component/i));
    fireEvent.click(screen.getAllByText(/tag component/i)[0]);

    fireEvent.change(screen.getByLabelText(/component name/i), {
      target: { value: 'Test Component' },
    });
    fireEvent.click(screen.getByText(/save to library/i));

    // 4. Mark reviewed
    await waitFor(() => screen.getByText(/mark script reviewed/i));
    fireEvent.click(screen.getByText(/mark script reviewed/i));
    fireEvent.click(screen.getByText(/mark reviewed/i)); // Confirm

    // 5. Verify removed from queue
    await waitFor(() => {
      expect(screen.queryByText('Integration Test')).not.toBeInTheDocument();
    });

    // 6. Verify component in library
    const components = await supabase
      .from('paragraph_library')
      .select()
      .eq('component_name', 'Test Component');
    expect(components.data?.length).toBe(1);
  });
});
```

**Implement:**
- Full workflow integration tests
- Error recovery tests (network failures, validation errors)
- Permission tests (role-based access)

**Git Commits:**
```bash
git commit -m "TEST: Add full workflow integration tests"
```

**Effort:** 3-4 hours

---

#### 3.3 UI Polish & Accessibility

**Tasks:**
- Keyboard shortcuts (T to tag, N for next, Esc to collapse)
- ARIA labels on all interactive elements
- Focus management (form traps, return focus)
- Loading states (skeletons, spinners)
- Empty states (no scripts, no components)
- Error states (save failed, load failed)
- Success notifications (component saved, script reviewed)

**Testing:**
- Keyboard-only navigation test
- Screen reader test
- Color contrast audit (WCAG AA)

**Git Commits:**
```bash
git commit -m "FEAT: Add keyboard shortcuts"
git commit -m "FEAT: Add ARIA labels and focus management"
git commit -m "FEAT: Add loading and empty states"
git commit -m "FEAT: Add error and success notifications"
```

**Effort:** 4-5 hours

---

#### 3.4 Quality Gates

- All tests passing (unit + integration)
- Manual QA checklist:
  - ✅ Review queue loads scripts
  - ✅ Paragraph tagging works
  - ✅ Duplicate detection functions
  - ✅ Mark reviewed removes from queue
  - ✅ Library browser shows components
- Accessibility score >90

**Exit Criteria:**
- ✅ Library browser operational
- ✅ Integration tests passing
- ✅ Accessibility requirements met
- ✅ Manual QA passing

---

## B4: Production Handoff

(Same structure as Script Builder, with Library Manager-specific config)

### Tasks

1. **Deployment Configuration** (2-3 hours)
   - Create Vercel project: `eav-library-manager`
   - Configure environment variables
   - Set up preview deployments

2. **Production Testing** (3-4 hours)
   - Deploy to preview
   - Run smoke tests
   - Performance validation
   - RLS validation

3. **Monitoring & Observability** (2-3 hours)
   - Error tracking (Sentry)
   - Custom events (script_reviewed, component_saved)

4. **Documentation** (2-3 hours)
   - USER-GUIDE.md
   - TROUBLESHOOTING.md

5. **Production Deployment** (1-2 hours)
   - Merge to main
   - Verify deployment
   - Monitor for errors

**Exit Criteria:**
- ✅ Deployed to production
- ✅ Smoke tests passing
- ✅ Performance targets met
- ✅ Documentation complete

---

## Dependency Mapping

```
B1.1 (Database) ──────────→ B2.1 (Review Queue)
                      │
                      └────→ B2.2 (Tagging Form)

B1.2 (Service Layer) ──────→ All B2 tasks

B1.3 (Auth Shell) ─────────→ All B2 tasks

B2.1 + B2.2 + B2.3 + B2.4 ─→ B3.1 (Library Browser)

B3.1 + B3.2 ───────────────→ B3.3 (Polish) → B4

**Critical Path:** B1.1 → B1.2 → B2.2 → B2.4 → B3.2 → B4
```

---

## Success Metrics

**Functional:**
- ✅ Reviewers can load scripts <500ms
- ✅ Reviewers can tag 5 paragraphs in <5 minutes
- ✅ Duplicate detection prevents library bloat
- ✅ Library browser finds components <200ms

**Quality:**
- ✅ 0 TypeScript errors (strict mode)
- ✅ 0 ESLint warnings
- ✅ All tests passing (TDD evidence)
- ✅ RLS policies enforce employee/admin role

---

**Blueprint Complete:** Ready for critical-design-validator review.
