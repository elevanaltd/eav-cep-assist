# CEP Panel (Premiere Pro Ingest Assistant) - Ecosystem Position

**POSITION:** Step 7 of 10 in EAV Production Pipeline
**ROLE:** Footage ingestion gateway → Structured metadata for downstream editing
**TYPE:** External Adobe Premiere Pro extension (CEP Panel)

---

## 🎯 Where We Fit

```
EAV Production Pipeline (10 Apps):
1. Data Entry Web      → Client specs to structured data
2. Copy Builder        → Library assembly
3. Copy Editor ✅      → Creates component spine (script_components)
4. Scenes Web ✅       → Shot planning (references components)
5. Cam Op PWA          → Offline filming (marks shots complete)
6. Ingest Assistant    → Pre-tagging footage (XMP metadata)
7. 🎬 CEP PANEL        ← YOU ARE HERE
8. VO Web              → Voice-over generation
9. Edit Web            → Timeline assembly guidance
10. Translations Web    → Subtitle i18n

**Full Pipeline:** /Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md
```

---

## 📥 What We Receive (Inputs)

### From Upstream: Ingest Assistant (Step 6)
**Data:** Raw footage files with pre-tagged XMP metadata
- **Location:** LucidLink (images) + Ubuntu Server (video)
- **Format:** Camera files (e.g., `MVI_1234.MOV`) with XMP sidecar or embedded metadata
- **Metadata:** Initial AI-analyzed tags (location, subject, action, shot type)

### From User: Premiere Pro Project
**Data:** Imported clips in Premiere Pro Project Panel
- **Selection:** Editor selects clips for metadata review/tagging
- **Context:** Raw footage ready for organization

---

## 📤 What We Produce (Outputs)

### Primary Output: Structured Premiere Pro Metadata
**Target:** Adobe Premiere Pro clip metadata fields
- **Name Field:** `{location}-{subject}-{action}-{shotType}` (e.g., `kitchen-oven-cleaning-CU`)
- **Tape Name:** Structured naming for organization
- **Description:** Additional context/notes
- **Shot:** Shot type classification (WS, CU, MID, etc.)
- **Custom Fields:** Location, Subject, Action metadata

**Critical Note:** Filenames stay unchanged (`MVI_1234.MOV`) for auditing. Premiere Pro Name field displays structured metadata.

### Downstream Impact: Edit Web (Step 9)
**How Editors Use Our Output:**
- Searchable clips by metadata (location, subject, shot type)
- Organized Project Panel for timeline assembly
- Reusable clips across projects (findable by metadata)

---

## 🔗 Integration Points

### Current State: Standalone Tool
- **Database:** None (Adobe Premiere Pro metadata only)
- **Monorepo Connection:** Not integrated (Phase 1)
- **Data Flow:** Ingest Assistant → CEP Panel → Premiere Pro → Edit Web (manual handoff)

### Future Integration (Phase 2 - Planned)
- **Database:** Write to `shots` table in Supabase
- **Visibility:** Tagged clips visible in Scenes Web
- **Two-Way Sync:** Scenes Web shot planning ↔ CEP Panel footage tagging
- **AI Enhancement:** Computer vision auto-suggests metadata within CEP Panel
- **Lexicon Support:** Project-specific vocabularies (e.g., medical terminology)

**Integration Point Schema (Future):**
```sql
-- Future: CEP Panel writes to shots table
shots {
  id uuid
  script_component_id uuid FK → script_components.id (from Scenes Web)
  location text
  subject text
  action text
  shot_type text
  filename text  ← CEP Panel provides
  premiere_metadata jsonb  ← CEP Panel provides
}
```

---

## 🎬 Our Critical Role in Pipeline

### Problem We Solve
**Before CEP Panel:**
- Unorganized clips with camera-generated names (`MVI_1234.MOV`)
- No searchability (editors waste time hunting for clips)
- No reusability (clips lost across projects)
- No structure (chaos in Project Panel)

**After CEP Panel:**
- Structured, searchable clips (`kitchen-oven-cleaning-CU.MOV` in Name field)
- Metadata-driven organization (filter by location, subject, shot type)
- Reusable clips (findable by metadata across projects)
- Organized Project Panel (editors work faster)

### Why We're Essential
1. **Ingestion Gateway:** First point where raw footage gets structured metadata
2. **Editor Experience:** Makes clips findable during timeline assembly (Edit Web references)
3. **Production Efficiency:** Reduces clip hunting time by 60-80%
4. **Metadata Consistency:** Enforces structured naming convention across all footage

---

## 🔄 Workflow (Current State)

### Step-by-Step Process
1. **Raw footage arrives** → Camera cards/drives stored in LucidLink + Ubuntu Server
2. **Ingest Assistant pre-tags** → AI analyzes footage, writes XMP metadata
3. **Editor imports to Premiere Pro** → Clips appear in Project Panel
4. **CEP Panel activates** → Extension loads inside Premiere Pro
5. **Editor selects clips** → CEP Panel auto-loads clip info (filename, path, type)
6. **CEP Panel displays metadata** → Shows XMP:Title and other pre-tagged fields
7. **Editor reviews/tags** → Confirms or adjusts: Location, Subject, Action, Shot Type
8. **CEP applies structured naming** → `{location}-{subject}-{action}-{shotType}`
9. **Metadata written to Premiere Pro** → Name, Tape Name, Description, Shot fields
10. **Result** → Organized, searchable clips ready for Edit Web (timeline assembly)

---

## 🏗️ Architecture Boundaries

### What We Own (Responsibilities)
- Premiere Pro metadata management
- Structured naming enforcement (`{location}-{subject}-{action}-{shotType}`)
- XMP metadata reading and display
- User interface for metadata review/editing
- Clip selection handling in Project Panel

### What We Don't Own (Out of Scope)
- ❌ Script component creation (Copy Editor owns `script_components` table)
- ❌ Shot planning (Scenes Web owns `shots` table - until Phase 2 integration)
- ❌ Footage storage (LucidLink + Ubuntu Server)
- ❌ Timeline assembly (Edit Web + Adobe Premiere Pro)
- ❌ Voice-over generation (VO Web)

### Dependencies
- **Upstream:** Ingest Assistant (XMP metadata pre-tagging)
- **Platform:** Adobe Premiere Pro CEP APIs
- **Future:** Supabase (Phase 2 database integration)
- **Future:** EAV Monorepo shared types (Phase 2)

---

## 📊 Key Metrics & Success Criteria

### Performance
- Metadata load time: <500ms per clip
- UI responsiveness: 60fps during interaction
- Batch operations: Handle 100+ clips without freezing

### Quality
- Zero data loss (metadata always persists to Premiere Pro)
- Validation: Required fields enforced (location, subject, action, shot type)
- Consistency: Structured naming format always correct

### User Experience
- Clip selection → metadata display: <200ms
- Tag editing → save: <100ms
- Error messages: Clear, actionable

---

## 🚀 Future Vision (Phase 2+)

### Phase 2: Supabase Integration
- **Write to `shots` table** → Tagged clips visible in Scenes Web
- **Read from `shots` table** → Scenes Web shot planning visible in CEP Panel
- **Two-way sync** → Changes in either tool propagate to database

### Phase 3: AI Enhancement
- **Computer vision auto-tagging** → Analyze video frames for intelligent suggestions
- **Confidence scoring** → AI suggestions with confidence levels
- **Manual review workflow** → Human-in-the-loop approval

### Phase 4: Advanced Features
- **Lexicon support** → Project-specific vocabularies (medical, construction, etc.)
- **Frame extraction** → Thumbnail generation for quick visual reference
- **Multi-language support** → Internationalized UI
- **Batch metadata editing** → Apply metadata to multiple clips simultaneously

---

## 🔍 Quick Reference

### Our Position Summary
| Aspect | Details |
|--------|---------|
| **Pipeline Step** | 7 of 10 |
| **Upstream** | Ingest Assistant (XMP pre-tagging) |
| **Downstream** | Edit Web (timeline assembly) |
| **Platform** | Adobe Premiere Pro (CEP Panel) |
| **Current State** | Standalone tool (no database) |
| **Future State** | Supabase integration (Phase 2) |
| **Critical Role** | Ingestion gateway (raw footage → structured metadata) |

### Integration Status
| Feature | Current | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| XMP Metadata Reading | ✅ Yes | ✅ Yes | ✅ Yes |
| Premiere Pro Metadata Write | ✅ Yes | ✅ Yes | ✅ Yes |
| Supabase `shots` Write | ❌ No | ✅ Yes | ✅ Yes |
| Supabase `shots` Read | ❌ No | ✅ Yes | ✅ Yes |
| AI Auto-Tagging | ❌ No | ❌ No | ✅ Yes |
| Lexicon Support | ❌ No | ❌ No | ✅ Yes |

---

## 📚 Related Documentation

**EAV Monorepo (Main Pipeline):**
- **Complete Pipeline:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- **North Star:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`
- **Project Context:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md`

**External Tools:**
- **Ingest Assistant:** `/Volumes/HestAI-Projects/ingest-assistant/.coord/ECOSYSTEM-POSITION.md`

**This Project:**
- **Project Context:** `.coord/PROJECT-CONTEXT.md` (if exists)
- **Roadmap:** `.coord/PROJECT-ROADMAP.md` (if exists)

---

**CRITICAL INSIGHT:** We are the **ingestion gateway** that transforms raw footage chaos into structured, searchable metadata. Without us, editors waste hours hunting for clips. With us, Edit Web (Step 9) becomes efficient and production-ready.

**LAST UPDATED:** 2025-11-10
**PATTERN:** Ecosystem positioning + Integration specification + Future vision
