# Copy Builder - UI Specification

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## Screen Layouts

### 1. Drafts List View (`/drafts`)

```
┌─────────────────────────────────────────────────────────────┐
│  Copy Builder                    [+ New Draft]  [Profile] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  My Drafts                                                    │
│  ═══════════════════════════════════════════════════════════ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📄 Heat Pump Installation Guide                         │ │
│  │ Video: V-2024-023 • 12 components • Edited 2 hours ago  │ │
│  │ [Continue Editing]                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📄 Cylinder Maintenance Overview                        │ │
│  │ Video: V-2024-019 • 8 components • Edited yesterday     │ │
│  │ [Continue Editing]                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Completed Drafts (Read-Only)                                │
│  ─────────────────────────────────────────────────────────── │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ✅ Solar Thermal System Script                          │ │
│  │ Video: V-2024-015 • Completed Nov 5                     │ │
│  │ [View in Scripts Editor] →                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- **DraftCard** - Shows title, video, component count, timestamp
- **NewDraftButton** - Primary CTA, navigates to `/drafts/new`
- **StatusBadge** - Visual indicator (draft vs completed)
- **ActionButton** - Context-specific (Continue Editing vs View in Scripts)

---

### 2. Draft Editor View (`/drafts/new` or `/drafts/:id/edit`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Copy Builder                                    [Saving...] [Profile] [Help] │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Title: [Heat Pump Installation Guide_________________]                         │
│  Video: [V-2024-023: Heat Pump Project ▼]                                       │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  ┌────────────────┬────────────────────────────────────────┬──────────────────┐ │
│  │ Library Search │              Draft Canvas               │   Placeholders   │ │
│  │ (300px)        │              (Flex 1)                   │   (250px)        │ │
│  ├────────────────┼────────────────────────────────────────┼──────────────────┤ │
│  │                │                                          │                  │ │
│  │ [Search...]    │  ┌────────────────────────────────────┐ │ Add placeholder: │ │
│  │                │  │ 1. 🗂️ Heat Pump Overview          │ │ [____________]   │ │
│  │ Filter:        │  │    Library • Used 24 times         │ │ [+ Add]          │ │
│  │ [All ▼]        │  │    [💬 Note] [↑] [↓] [×]          │ │                  │ │
│  │                │  └────────────────────────────────────┘ │ Common:          │ │
│  │ Results:       │                                          │ • Sink           │ │
│  │                │  ┌────────────────────────────────────┐ │ • Toilet         │ │
│  │ ┌────────────┐ │  │ 2. 📌 Oven                        │ │ • Shower         │ │
│  │ │ Heat Pump  │ │  │    Placeholder                     │ │ • Bathtub        │ │
│  │ │ Overview   │ │  │    Note: "Use Neff model B57CR..."│ │ • Oven           │ │
│  │ │ 24 uses    │ │  │    [💬 Edit] [↑] [↓] [×]          │ │ • Dishwasher     │ │
│  │ │ [Drag →]   │ │  └────────────────────────────────────┘ │                  │ │
│  │ └────────────┘ │                                          │ (Click to add)   │ │
│  │                │  ┌────────────────────────────────────┐ │                  │ │
│  │ ┌────────────┐ │  │ 3. 🗂️ Cylinder Maintenance       │ │                  │ │
│  │ │ Cylinder   │ │  │    Library • Used 18 times         │ │                  │ │
│  │ │ Specs      │ │  │    [💬 Note] [↑] [↓] [×]          │ │                  │ │
│  │ │ 18 uses    │ │  └────────────────────────────────────┘ │                  │ │
│  │ │ [Drag →]   │ │                                          │                  │ │
│  │ └────────────┘ │  [Empty state: Drag components here]    │                  │ │
│  │                │                                          │                  │ │
│  │ [Load More]    │                                          │                  │ │
│  │                │                                          │                  │ │
│  └────────────────┴────────────────────────────────────────┴──────────────────┘ │
│                                                                                  │
│  [Save Draft]                                              [Complete & Send →] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Layout Breakdown:**
- **Header:** Title input, video selector, save indicator
- **3-Column Layout:**
  - **Left (300px):** Library search sidebar (fixed width, scrollable)
  - **Center (Flex):** Draft canvas (grows to fill space, scrollable)
  - **Right (250px):** Placeholder panel (fixed width, scrollable)
- **Footer:** Action buttons (Save Draft, Complete & Send)

---

## Component Specifications

### Header Component (Shared)

**Implementation:**

```typescript
import { Header } from '@workspace/shared'

<Header
  title="Copy Builder"
  userEmail={user?.email}
  lastSaved={lastSaved}
  onSettings={() => setShowSettings(true)}
/>
```

**Layout (Provided by shared component):**

```
┌──────────────────────────────────────────────────────────┐
│ Copy Builder              Saved 2s ago    user@email ⚙️│
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Consistent styling across all EAV apps
- Auto-formats save time (2s ago, 3m ago, 2h ago, etc.)
- Responsive layout
- Accessibility built-in
- Fixed 3-column layout (Title | Save Status | User Controls)

**Props:**
- `title: string` - Application title ("Copy Builder")
- `userEmail?: string` - User's email for display
- `lastSaved?: Date` - Last save timestamp (auto-formatted)
- `onSettings?: () => void` - Settings button click handler

---

### LibraryComponentCard (Draggable)

**Location:** Left sidebar search results

```typescript
interface LibraryComponentCardProps {
  component: LibraryComponent;
  isDragging: boolean;
}

// Visual states:
// - Default: White background, gray border
// - Hover: Light blue background, blue border
// - Dragging: Semi-transparent, follows cursor
```

**Layout:**
```
┌────────────────────────┐
│ Heat Pump Overview     │ ← component_name (bold, 16px)
│ Library • 24 uses      │ ← metadata (gray, 12px)
│                        │
│ "A heat pump is a..."  │ ← content preview (truncated, 100 chars)
│                        │
│ [Drag to canvas →]     │ ← drag hint (on hover)
└────────────────────────┘
```

---

### DraftComponentCard (Droppable)

**Location:** Center canvas

```typescript
interface DraftComponentCardProps {
  component: DraftComponent;
  index: number;
  onRemove: (index: number) => void;
  onReorder: (index: number, direction: 'up' | 'down') => void;
  onNoteUpdate: (index: number, note: string) => void;
}
```

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ 1. 🗂️ Heat Pump Overview            [💬] [↑] [↓] [×] │ ← header
├────────────────────────────────────────────────────┤
│ Library • Used 24 times                            │ ← metadata
│                                                    │
│ "A heat pump is a device that transfers heat      │
│ energy from a source of heat to a destination     │
│ called a 'heat sink'. Heat pumps are designed..." │ ← content preview
│                                                    │
│ 💬 Note: "Emphasize energy efficiency for UK      │ ← note (if present)
│ market, mention typical SCOP of 3.5-4.0"          │
└────────────────────────────────────────────────────┘

// Icons:
// 🗂️ = Library component
// 📌 = Placeholder
// 💬 = Note indicator/button
// ↑↓ = Reorder buttons
// × = Delete button
```

**States:**
- **Default:** White background, subtle shadow
- **Hover:** Light gray background, controls visible
- **Has Note:** Blue accent border on left
- **Dragging:** Semi-transparent with drop zones highlighted

---

### NoteEditor (Modal)

**Triggered by:** Click note button on DraftComponentCard

```
┌─────────────────────────────────────────────────┐
│  Add Note to Component                      [×] │
├─────────────────────────────────────────────────┤
│                                                 │
│  Component: Heat Pump Overview                  │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Note (optional, max 500 chars):                │
│  ┌─────────────────────────────────────────────┐ │
│  │ Emphasize energy efficiency for UK market, │ │
│  │ mention typical SCOP of 3.5-4.0            │ │
│  │                                             │ │
│  │                                             │ │
│  │                                             │ │
│  └─────────────────────────────────────────────┘ │
│  450 / 500 characters                           │
│                                                 │
│  [Cancel]                       [Save Note]     │
└─────────────────────────────────────────────────┘

// Keyboard shortcuts:
// - Esc: Close without saving
// - Cmd/Ctrl+Enter: Save and close
```

---

### PlaceholderPanel

**Location:** Right sidebar

```typescript
interface PlaceholderPanelProps {
  onAddPlaceholder: (name: string) => void;
  commonPlaceholders: string[]; // ["Sink", "Toilet", etc.]
}
```

**Layout:**
```
┌──────────────────────┐
│ Add Placeholder      │
│                      │
│ [____________]       │ ← text input
│ [+ Add]              │ ← add button
│                      │
│ Common placeholders: │
│ • Sink               │ ← clickable list
│ • Toilet             │
│ • Shower             │
│ • Bathtub            │
│ • Oven               │
│ • Dishwasher         │
│ • Cooktop            │
│ • Fridge             │
│                      │
│ (Click to add)       │
└──────────────────────┘
```

**Interaction:**
- Type custom name → Click Add → Adds to canvas
- Click common placeholder → Immediately adds to canvas
- Validation: Trim whitespace, max 50 chars, alphanumeric + hyphen/underscore

---

### SaveIndicator

**Location:** Top right header

```typescript
interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  onRetry?: () => void;
}
```

**Visual States:**
```
idle    → (hidden or "All changes saved")
saving  → "💾 Saving..." (animated spinner)
saved   → "✅ Saved 2 seconds ago" (fades after 2s)
error   → "⚠️ Save failed - [Retry?]" (red, clickable)
```

---

### CompleteButton

**Location:** Bottom right footer

```typescript
interface CompleteButtonProps {
  draft: Draft;
  onComplete: () => Promise<void>;
  disabled: boolean;
}

// Disabled when:
// - Title empty
// - No components added
// - Video not selected
// - Save in progress
```

**Flow:**
1. Click "Complete & Send"
2. Show confirmation modal:
   ```
   ┌───────────────────────────────────────┐
   │  Complete Draft?                      │
   ├───────────────────────────────────────┤
   │                                       │
   │  This will:                           │
   │  • Mark draft as completed (immutable)│
   │  • Export assembled copy to Copy table│
   │  • Open Copy in Copy-Editor           │
   │                                       │
   │  Continue?                            │
   │                                       │
   │  [Cancel]         [Complete & Export] │
   └───────────────────────────────────────┘
   ```
3. On confirm:
   - Show loading overlay "Exporting to Copy table..."
   - Call `draftService.complete()`
   - On success: Redirect to Copy-Editor
   - On error: Show error notification, stay on page (e.g., "Copy not found" or "Copy is locked")

---

## User Interaction Flows

### Flow 1: Create New Draft with Library Components

```
1. User clicks [+ New Draft]
   ↓
2. Navigate to /drafts/new
   ↓
3. User enters title: "Heat Pump Guide"
   ↓
4. User selects video: "V-2024-023"
   ↓
5. User types in search: "heat pump"
   ↓
6. Results load (<200ms)
   - "Heat Pump Overview" (24 uses)
   - "Heat Pump Installation" (18 uses)
   - "Heat Pump Maintenance" (12 uses)
   ↓
7. User drags "Heat Pump Overview" to canvas
   ↓
8. Component added at position 1
   - Visual: Card appears in canvas with smooth animation
   - Backend: Auto-save queued (debounced 2s)
   ↓
9. User clicks note icon on component
   ↓
10. Note modal opens
    ↓
11. User types: "Emphasize energy efficiency"
    ↓
12. User presses Cmd+Enter (or clicks Save)
    ↓
13. Note saved, modal closes
    - Visual: Blue accent border on component card
    - Backend: Auto-save queued
    ↓
14. User continues adding more components...
```

---

### Flow 2: Add Placeholder with Note

```
1. User types in placeholder input: "Oven"
   ↓
2. User clicks [+ Add] (or presses Enter)
   ↓
3. Placeholder added to canvas
   - Visual: Card with 📌 icon, name "Oven"
   - Backend: Auto-save queued
   ↓
4. User clicks note icon
   ↓
5. Note modal opens
   ↓
6. User types: "Use Neff model B57CR..."
   ↓
7. User saves note
   ↓
8. Note displayed inline: "(NOTE: Use Neff model...)"
   - Backend: Auto-save queued
```

---

### Flow 3: Reorder Components

```
1. User clicks [↑] on component at position 3
   ↓
2. Component swaps with position 2
   - Visual: Smooth animation
   - Backend: Auto-save queued (updates order field)
   ↓
3. User drags component from position 1 to position 5
   ↓
4. Component moved
   - Visual: Drop zone highlights during drag
   - Backend: Auto-save queued
```

---

### Flow 4: Complete & Export to Copy-Editor

```
1. User clicks [Complete & Export]
   ↓
2. Validation checks:
   - Title present? ✓
   - Video selected? ✓
   - Components added? ✓
   ↓
3. Confirmation modal appears
   ↓
4. User clicks [Complete & Export]
   ↓
5. Loading overlay: "Exporting to Copy table..."
   ↓
6. Backend operations:
   a. Mark draft status = 'completed'
   b. Validate Copy exists for video_id
   c. Check Copy is in draft state (via copy_locks)
   d. Assemble content from components (batch fetch)
   e. Update Copy table with assembled plain text
   f. (Optional) Increment library component usage counts
   ↓
7. On success:
   - Hide loading overlay
   - Show success notification: "Copy updated!"
   - Redirect to: https://eav-copy-editor.vercel.app/copy/{copyId}/edit
   ↓
8. Copy-Editor loads with assembled content
   - Component extraction pipeline processes identically to manual paste
   - User can edit with full TipTap editor
```

---

## Responsive Design Considerations

### Desktop (>1200px)
- 3-column layout as shown above
- Library sidebar: 300px fixed
- Canvas: Flexible (grows to fill)
- Placeholder panel: 250px fixed

### Tablet (768px - 1200px)
- 2-column layout:
  - Library sidebar: 250px fixed (collapsible)
  - Canvas + Placeholder: Stacked or tabbed
- Hamburger menu for library search
- Placeholder panel below canvas

### Mobile (<768px)
- Single column, stacked layout:
  - Header (collapsed)
  - Canvas (main focus)
  - Bottom sheet for library search
  - Bottom sheet for placeholders
- Touch-optimized drag & drop
- Simplified controls (fewer buttons visible)

**Note:** Mobile support is Phase 2. MVP targets desktop users (primary workflow is desktop-based script writing).

---

## Accessibility Requirements

### Keyboard Navigation
- Tab through all interactive elements
- Esc to close modals
- Cmd/Ctrl+S to save draft
- Arrow keys to reorder components (when focused)
- Enter to activate buttons

### Screen Reader Support
- ARIA labels on all interactive elements
- Announce save status changes
- Announce component additions/removals
- Describe drag & drop zones

### Color Contrast
- WCAG AA compliant (4.5:1 for text)
- Error states use both color and icon
- Focus indicators visible (2px outline)

### Focus Management
- Trap focus in modals
- Return focus after modal close
- Skip links for keyboard users

---

## Visual Design Tokens

### Colors
```css
--primary: #2563eb;      /* Blue - primary actions */
--secondary: #64748b;    /* Slate - secondary text */
--success: #10b981;      /* Green - saved state */
--error: #ef4444;        /* Red - errors */
--warning: #f59e0b;      /* Amber - warnings */

--bg-primary: #ffffff;   /* White - main background */
--bg-secondary: #f8fafc; /* Light gray - sidebars */
--bg-hover: #f1f5f9;     /* Hover states */

--border: #e2e8f0;       /* Light gray - borders */
--text-primary: #0f172a; /* Near black - main text */
--text-secondary: #64748b; /* Gray - metadata */
```

### Typography
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

--text-xs: 0.75rem;   /* 12px - metadata */
--text-sm: 0.875rem;  /* 14px - body text */
--text-base: 1rem;    /* 16px - component names */
--text-lg: 1.125rem;  /* 18px - headings */
--text-xl: 1.25rem;   /* 20px - page titles */
```

### Spacing
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
```

---

## Next Steps

1. **Review API.md** for service layer implementation and data binding
2. **Review BUILD-PLAN.md** for component implementation order and testing strategy
3. **Create component prototypes** in Figma/Storybook (optional, before B1)
4. **Proceed to B0 gate** for critical-design-validator UX review
