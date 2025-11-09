# Library Manager - UI Specification

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## Screen Layouts

### 1. Review Queue (`/review-queue`)

```
┌──────────────────────────────────────────────────────────────┐
│  Library Manager                         [Profile] [Library] │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Scripts Awaiting Review                                       │
│  ══════════════════════════════════════════════════════════   │
│                                                                │
│  Filter: [All ▼]  Search: [_____________]  [Refresh]          │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Heat Pump Installation Guide                           │   │
│  │ Video: V-2024-023 • 42 paragraphs • Approved 2d ago    │   │
│  │ [Start Review]                                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Solar Thermal System Overview          [In Review]     │   │
│  │ Video: V-2024-019 • 28 paragraphs • Approved 5d ago    │   │
│  │ [Continue Review]                                       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  [Load More]                                                   │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

### 2. Script Review (`/review/:scriptId`)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Queue      Heat Pump Installation Guide              [Profile]      │
├───────────────────────────────────────────────────────────────────────────────┤
│  Video: V-2024-023 • Progress: 3 tagged / 42 paragraphs                       │
│  ───────────────────────────────────────────────────────────────────────────   │
│                                                                                 │
│  ┌─────────────────────────────────────┬────────────────────────────────────┐ │
│  │ Script Content (60%)                │ Review Progress (40%)              │ │
│  ├─────────────────────────────────────┼────────────────────────────────────┤ │
│  │                                     │                                    │ │
│  │ ┌─────────────────────────────────┐ │ Tagged Components (3)              │ │
│  │ │ 1. A heat pump is a device that │ │ ────────────────────────────────── │ │
│  │ │    transfers heat energy from...│ │ ✅ Heat Pump Overview               │ │
│  │ │    [Tag Component]              │ │    (Paragraph 1)                   │ │
│  │ └─────────────────────────────────┘ │                                    │ │
│  │                                     │ ✅ Heat Pump Types                  │ │
│  │ ┌─────────────────────────────────┐ │    (Paragraph 5)                   │ │
│  │ │ 2. Heat pumps come in several..│ │                                    │ │
│  │ │    [Tag Component]              │ │ ✅ Cylinder Maintenance             │ │
│  │ └─────────────────────────────────┘ │    (Paragraph 8)                   │ │
│  │                                     │                                    │ │
│  │ ┌─────────────────────────────────┐ │ Quick Metadata                     │ │
│  │ │ 3. The Zeroth Heat Pump...      │ │ ────────────────────────────────── │ │
│  │ │    ▼ Tagging Form (Expanded)    │ │ Common Make/Models:                │ │
│  │ │                                 │ │ • Zeroth Heat Pump                 │ │
│  │ │ Component Name:                 │ │ • Neff Oven                        │ │
│  │ │ [_____________________]         │ │ • Kohler Sink                      │ │
│  │ │                                 │ │                                    │ │
│  │ │ Make/Model: [Zeroth Heat Pump▼]│ │ Common Categories:                 │ │
│  │ │ Part: [_________]               │ │ • Heating Systems                  │ │
│  │ │ Section: [Product Overview ▼]   │ │ • Plumbing Fixtures                │ │
│  │ │ Category: [Heating Systems ▼]   │ │ • Kitchen Appliances               │ │
│  │ │                                 │ │                                    │ │
│  │ │ Notes (optional):               │ │ (Click to populate)                │ │
│  │ │ [_____________________]         │ │                                    │ │
│  │ │                                 │ │ [Mark Script Reviewed]             │ │
│  │ │ [Cancel] [Save to Library]      │ │                                    │ │
│  │ └─────────────────────────────────┘ │                                    │ │
│  │                                     │                                    │ │
│  │ ┌─────────────────────────────────┐ │                                    │ │
│  │ │ 4. Installation requires...     │ │                                    │ │
│  │ │    [Tag Component]              │ │                                    │ │
│  │ └─────────────────────────────────┘ │                                    │ │
│  │                                     │                                    │ │
│  └─────────────────────────────────────┴────────────────────────────────────┘ │
│                                                                                 │
│  Keyboard Shortcuts: T = Tag paragraph • N = Next untagged • Esc = Collapse    │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Library Browser (`/library`)

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back        Component Library                  [Profile]   │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Search: [____________]  Category: [All ▼]  Make: [All ▼]     │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Heat Pump Overview                      Used 24 times  │   │
│  │ Library • Heating Systems • Zeroth Heat Pump           │   │
│  │                                                         │   │
│  │ "A heat pump is a device that transfers heat energy..." │   │
│  │                                                         │   │
│  │ Cataloged Nov 5 by Jane Doe                            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Cylinder Maintenance                    Used 18 times  │   │
│  │ Library • Heating Systems • Zeroth Cylinder            │   │
│  │                                                         │   │
│  │ "Regular maintenance of the integrated cylinder..."    │   │
│  │                                                         │   │
│  │ Cataloged Nov 3 by John Smith                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  [Load More (20 / 156 results)]                               │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Header Component (Shared)

**Implementation:**

```typescript
import { Header } from '@workspace/shared'

<Header
  title="Library Manager"
  userEmail={user?.email}
  lastSaved={lastSaved}
  onSettings={() => setShowSettings(true)}
/>
```

**Layout (Provided by shared component):**

```
┌──────────────────────────────────────────────────────────┐
│ Library Manager             Saved 2s ago    user@email ⚙️│
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Consistent styling across all EAV apps
- Auto-formats save time (2s ago, 3m ago, 2h ago, etc.)
- Responsive layout
- Accessibility built-in
- Fixed 3-column layout (Title | Save Status | User Controls)

**Props:**
- `title: string` - Application title ("Library Manager")
- `userEmail?: string` - User's email for display
- `lastSaved?: Date` - Last save timestamp (auto-formatted)
- `onSettings?: () => void` - Settings button click handler

---

### ParagraphCard (Selectable)

```typescript
interface ParagraphCardProps {
  paragraph: string;
  index: number;
  isTagged: boolean;
  isExpanded: boolean;
  onTag: () => void;
  onCollapse: () => void;
}
```

**Layout:**
```
┌──────────────────────────────────────────┐
│ 3. The Zeroth Heat Pump Integrated      │ ← index + content preview
│    Cylinder is a...                     │
│                                          │
│ [Tag Component]                          │ ← button (default state)
└──────────────────────────────────────────┘

// States:
// - Default: White background, [Tag Component] button
// - Hover: Light gray background, button highlighted
// - Tagged: Green border, [✓ Tagged] button (disabled)
// - Expanded: Form visible below, [Cancel] button
```

---

### TaggingForm (Inline)

```typescript
interface TaggingFormProps {
  paragraph: string;
  scriptId: string;
  index: number;
  onSave: (metadata: ComponentMetadata) => Promise<void>;
  onCancel: () => void;
}
```

**Layout:**
```
┌──────────────────────────────────────────┐
│ Component Name: *                        │
│ [Heat Pump Overview____________]         │ ← required field
│                                          │
│ Make/Model: (AutocompleteField - shared) │
│ [Zeroth Heat Pump ▼]                     │ ← auto-complete from @workspace/shared
│                                          │
│ Part: [1 of 2__________]                 │ ← optional
│                                          │
│ Section Type: [Product Overview ▼]       │ ← dropdown (common values)
│                                          │
│ Category: [Heating Systems ▼]            │ ← dropdown (predefined categories)
│                                          │
│ Notes (optional):                        │
│ [_________________________]              │ ← textarea, 1000 char max
│                                          │
│ [Cancel]      [Save to Library]          │ ← actions
└──────────────────────────────────────────┘

// Validation:
// - Component name: Required, max 200 chars
// - Make/model: Optional, max 200 chars
// - Part: Optional, max 100 chars
// - Section type: Optional, max 100 chars
// - Category: Optional, max 100 chars
// - Notes: Optional, max 1000 chars
```

**Make/Model AutocompleteField Implementation:**

```typescript
import { AutocompleteField } from '@workspace/shared'

<AutocompleteField
  value={makeModel}
  onChange={setMakeModel}
  getSuggestions={async (term) => {
    const { data } = await supabase
      .from('paragraph_library')
      .select('make_model')
      .ilike('make_model', `%${term}%`)
      .limit(10);
    return data?.map(r => r.make_model).filter(Boolean) || [];
  }}
  placeholder="e.g., Kohler K-12345"
  label="Make/Model"
/>
```

**Features (provided by shared component):**
- Auto-complete dropdown from existing library values
- Debounced search (300ms) - prevents excessive database queries
- Keyboard navigation (↑↓ arrows, Enter, Esc)
- Loading states during async suggestions
- Allows free-text entry (not restricted to suggestions)
- Accessible (ARIA labels, keyboard navigation)

---

### DuplicateWarning (Modal)

**Triggered when:** Content hash matches existing library component

```
┌─────────────────────────────────────────────┐
│  Content Already Exists                 [×] │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠️ This content is already cataloged in    │
│  the library as:                            │
│                                             │
│  "Heat Pump Overview"                       │
│  Cataloged Nov 5, 2025 by Jane Doe          │
│                                             │
│  This paragraph cannot be added again due   │
│  to duplicate content protection.           │
│                                             │
│  Options:                                   │
│                                             │
│  • [OK] - Close and skip this paragraph     │
│  • [View Existing] - Open in Library Browser│
│                                             │
└─────────────────────────────────────────────┘
```

---

### MarkReviewedButton

```typescript
interface MarkReviewedButtonProps {
  scriptId: string;
  taggedCount: number;
  totalParagraphs: number;
  onMarkReviewed: () => Promise<void>;
}
```

**States:**
```
// Default (no paragraphs tagged)
[Mark Script Reviewed] (disabled, gray)
"Tag at least one paragraph before marking reviewed"

// Some paragraphs tagged
[Mark Script Reviewed] (enabled, blue)
"3 paragraphs tagged"

// Confirmation modal
┌─────────────────────────────────────┐
│  Mark Script Reviewed?              │
├─────────────────────────────────────┤
│                                     │
│  You've tagged 3 components from    │
│  this script.                       │
│                                     │
│  This will:                         │
│  • Remove script from review queue  │
│  • Mark completion timestamp        │
│                                     │
│  Continue?                          │
│                                     │
│  [Cancel]   [Mark Reviewed]         │
└─────────────────────────────────────┘
```

---

## User Interaction Flows

### Flow 1: Tag Paragraph from Review Queue

```
1. User clicks [Start Review] on script
   ↓
2. Navigate to /review/:scriptId
   ↓
3. Script paragraphs load (<500ms)
   - 42 paragraphs displayed
   - None tagged yet
   ↓
4. User reads paragraph 3: "The Zeroth Heat Pump..."
   ↓
5. User clicks [Tag Component]
   ↓
6. Tagging form expands inline
   - Focus on Component Name field
   - Make/Model dropdown shows suggestions
   ↓
7. User types component name: "Heat Pump Overview"
   ↓
8. User selects make/model: "Zeroth Heat Pump" (from dropdown)
   ↓
9. User selects category: "Heating Systems"
   ↓
10. User clicks [Save to Library]
    ↓
11. Content hash calculated client-side
    ↓
12. Duplicate check query (<50ms)
    ↓
13. No duplicate found → Save proceeds
    ↓
14. INSERT into paragraph_library
    ↓
15. Success notification: "Component saved to library"
    ↓
16. Form collapses, paragraph marked tagged (green border)
    ↓
17. Progress updates: "1 tagged / 42 paragraphs"
```

---

### Flow 2: Handle Duplicate Detection

```
1. User fills tagging form for paragraph 5
   ↓
2. User clicks [Save to Library]
   ↓
3. Content hash calculated
   ↓
4. Duplicate found: "Heat Pump Types" (Nov 3)
   ↓
5. Error notification: "Content already exists"
   ↓
6. Duplicate info modal appears
   ↓
7. User decides:
   Option A: [OK] → Modal closes, form stays open (user can edit or cancel)
   Option B: [View Existing] → Opens Library Browser in new tab, form stays open
   ↓
8. Save blocked - user must cancel form or modify content to proceed
```

---

### Flow 3: Complete Review & Mark Script

```
1. User has tagged 5 paragraphs from script
   ↓
2. User clicks [Mark Script Reviewed] (enabled)
   ↓
3. Confirmation modal appears
   ↓
4. User clicks [Mark Reviewed]
   ↓
5. RPC call: mark_script_reviewed(scriptId)
   ↓
6. Database update:
   - library_status = 'reviewed'
   - library_reviewed_at = NOW()
   - library_reviewed_by = current_user
   ↓
7. Success notification: "Script marked reviewed"
   ↓
8. Navigate back to review queue
   ↓
9. Script no longer appears in queue
```

---

## Keyboard Shortcuts

**Global:**
- `Esc` - Close modals, collapse forms
- `/` - Focus search input (review queue or library browser)

**Review Screen:**
- `T` - Tag current paragraph (if not already tagged)
- `N` - Navigate to next untagged paragraph
- `Enter` - Save tagging form (when focused in form)
- `Cmd/Ctrl + Enter` - Save form from any field
- `Esc` - Collapse expanded tagging form

---

## Responsive Design

### Desktop (>1200px)
- 2-column layout as shown
- Script content: 60% width
- Review sidebar: 40% width

### Tablet (768px - 1200px)
- Stacked layout:
  - Script content full-width
  - Review sidebar collapses to bottom sheet
- Tagging forms stay inline

### Mobile (<768px)
- Single column
- Tagging forms in modal (not inline)
- Review progress in sticky header

**Note:** Mobile support is Phase 2. MVP targets desktop reviewers.

---

## Accessibility

**Keyboard Navigation:**
- Tab through all interactive elements
- Keyboard shortcuts for common actions
- Arrow keys to navigate paragraph list

**Screen Reader:**
- ARIA labels on all buttons ("Tag paragraph 3")
- Announce when paragraph tagged
- Announce progress updates

**Visual:**
- Color contrast WCAG AA compliant
- Tagged state uses both color and icon
- Focus indicators visible (2px outline)

---

## Visual Design Tokens

**Colors:**
```css
--primary: #2563eb;      /* Blue */
--success: #10b981;      /* Green - tagged state */
--warning: #f59e0b;      /* Amber - duplicate warning */
--error: #ef4444;        /* Red - errors */

--bg-primary: #ffffff;
--bg-secondary: #f8fafc;
--bg-tagged: #f0fdf4;    /* Light green - tagged paragraphs */

--border: #e2e8f0;
--border-tagged: #10b981; /* Green - tagged paragraphs */
```

**Typography:**
```css
--text-base: 1rem;       /* 16px - paragraph content */
--text-sm: 0.875rem;     /* 14px - metadata */
--text-xs: 0.75rem;      /* 12px - helper text */
```

---

## Next Steps

1. **Review API.md** for service layer and data binding
2. **Review BUILD-PLAN.md** for implementation phases
3. **Proceed to B0 gate** for critical-design-validator UX review
