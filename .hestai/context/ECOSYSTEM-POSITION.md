# CEP Panel (Premiere Pro Ingest Assistant) - Ecosystem Position

**POSITION:** Step 7 of 10 in EAV Production Pipeline
**ROLE:** Footage ingestion gateway → Structured metadata for downstream editing
**TYPE:** External Adobe Premiere Pro extension (CEP Panel)

---

## Where We Fit

```
EAV Production Pipeline (10 Apps):
1. Data Entry Web      → Client specs to structured data
2. Copy Builder        → Library assembly
3. Copy Editor ✅      → Creates component spine (script_components)
4. Scenes Web ✅       → Shot planning (references components)
5. Cam Op PWA          → Offline filming (marks shots complete)
6. Ingest Assistant    → Pre-tagging footage (JSON sidecar metadata)
7. 🎬 CEP PANEL        ← YOU ARE HERE
8. VO Web              → Voice-over generation
9. Edit Web            → Timeline assembly guidance
10. Translations Web   → Subtitle i18n

**Full Pipeline:** /Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md
```

---

## What We Receive (Inputs)

### From Upstream: Ingest Assistant (Step 6)
**Data:** Raw footage files with JSON sidecar metadata
- **Location:** LucidLink (proxies) + Ubuntu Server (raw video)
- **Format:** Camera files (e.g., `EA001621.MOV`) with `.ingest-metadata.json` sidecar
- **Metadata:** AI-analyzed tags (location, subject, action, shotType, shotNumber, keywords)

### From User: Premiere Pro Project
**Data:** Imported clips in Premiere Pro Project Panel
- **Selection:** Editor selects clips for metadata review/tagging
- **Context:** Raw footage ready for organization

---

## What We Produce (Outputs)

### Primary Output: JSON Sidecar + Premiere Pro Metadata
**Dual Target:**
1. **JSON Sidecar:** `.ingest-metadata-pp.json` (PP edits for ML feedback)
2. **Premiere Pro:** Clip Name field updated with structured naming

**Structured Name Format:** `{location}-{subject}-{action}-{shotType}-#{shotNumber}`
Example: `kitchen-oven-cleaning-ESTAB-#25`

**Critical Note:** Original filenames stay unchanged (`EA001621.MOV`) for auditing. PP Tape Name preserves original. PP Clip Name displays structured metadata.

### Downstream Impact: Edit Web (Step 9)
**How Editors Use Our Output:**
- Searchable clips by metadata (location, subject, shot type)
- Organized Project Panel for timeline assembly
- Reusable clips across projects (findable by metadata)

---

## Integration Points

### Current State: JSON-First Architecture (Production Ready)
- **Metadata Source:** `.ingest-metadata.json` (read) + `.ingest-metadata-pp.json` (write)
- **PP Integration:** Clip Name updates from JSON metadata
- **ML Feedback:** PP edits JSON enables AI training diff (IA original vs human corrections)
- **Data Flow:** Ingest Assistant JSON → CEP Panel → PP Clip Names + PP Edits JSON

### Future Integration (Phase 2 - Planned)
- **Database:** Write to `shots` table in Supabase
- **Visibility:** Tagged clips visible in Scenes Web
- **Two-Way Sync:** Scenes Web shot planning ↔ CEP Panel footage tagging
- **Lexicon Support:** Project-specific vocabularies

---

## Our Critical Role in Pipeline

### Problem We Solve
**Before CEP Panel:**
- Unorganized clips with camera-generated names (`EA001621.MOV`)
- No searchability (editors waste time hunting for clips)
- No reusability (clips lost across projects)
- No structure (chaos in Project Panel)

**After CEP Panel:**
- Structured, searchable clips (`kitchen-oven-cleaning-ESTAB-#25` in Clip Name)
- Metadata-driven organization (filter by location, subject, shot type)
- ML feedback loop (PP edits inform AI improvements)
- Organized Project Panel (editors work faster)

### Why We're Essential
1. **Ingestion Gateway:** First point where raw footage gets structured metadata
2. **Editor Experience:** Makes clips findable during timeline assembly
3. **Production Efficiency:** Reduces clip hunting time by 60-80%
4. **ML Training:** Human corrections feed back to improve IA AI

---

## Workflow (Current State - Production)

### Step-by-Step Process
1. **Raw footage arrives** → Camera cards/drives stored in LucidLink + Ubuntu Server
2. **Ingest Assistant pre-tags** → AI analyzes footage, writes `.ingest-metadata.json`
3. **Editor imports to Premiere Pro** → Clips appear in Project Panel
4. **CEP Panel activates** → Extension loads inside Premiere Pro
5. **Editor selects clips** → CEP Panel reads JSON by PP Tape Name lookup
6. **CEP Panel displays metadata** → Shows location, subject, action, shotType, keywords
7. **Editor reviews/tags** → Confirms or adjusts metadata fields
8. **CEP applies structured naming** → Computes shotName, updates PP Clip Name
9. **PP Edits JSON written** → `.ingest-metadata-pp.json` for ML feedback
10. **Result** → Organized, searchable clips ready for Edit Web

---

## Architecture Boundaries

### What We Own (Responsibilities)
- JSON sidecar reading (`.ingest-metadata.json`)
- PP edits JSON writing (`.ingest-metadata-pp.json`)
- Premiere Pro Clip Name updates
- Structured naming enforcement
- User interface for metadata review/editing
- Clip selection handling in Project Panel

### What We Don't Own (Out of Scope)
- ❌ Script component creation (Copy Editor owns `script_components` table)
- ❌ Shot planning (Scenes Web owns `shots` table)
- ❌ Footage storage (LucidLink + Ubuntu Server)
- ❌ Timeline assembly (Edit Web + Adobe Premiere Pro)
- ❌ Voice-over generation (VO Web)

### Dependencies
- **Upstream:** Ingest Assistant (JSON sidecar creation)
- **Platform:** Adobe Premiere Pro CEP APIs
- **Future:** Supabase (Phase 2 database integration)

---

## Key Metrics & Success Criteria

### Performance
- Metadata load time: <500ms per clip
- UI responsiveness: 60fps during interaction
- Batch operations: Handle 100+ clips without freezing

### Quality
- Zero data loss (metadata always persists to JSON + PP)
- Validation: Required fields enforced (location, subject, action, shotType)
- Consistency: Structured naming format always correct

### User Experience
- Clip selection → metadata display: <200ms
- Tag editing → save: <100ms
- Error messages: Clear, actionable

---

## Quick Reference

### Our Position Summary
| Aspect | Details |
|--------|---------|
| **Pipeline Step** | 7 of 10 |
| **Upstream** | Ingest Assistant (JSON sidecar) |
| **Downstream** | Edit Web (timeline assembly) |
| **Platform** | Adobe Premiere Pro (CEP Panel) |
| **Current State** | JSON-first architecture (production) |
| **Future State** | Supabase integration (Phase 2) |
| **Critical Role** | Ingestion gateway (raw footage → structured metadata) |

### Integration Status
| Feature | Current | Phase 2 |
|---------|---------|---------|
| JSON Sidecar Reading | ✅ Yes | ✅ Yes |
| JSON PP Edits Writing | ✅ Yes | ✅ Yes |
| Premiere Pro Clip Name | ✅ Yes | ✅ Yes |
| Supabase `shots` Write | ❌ No | ✅ Yes |
| Supabase `shots` Read | ❌ No | ✅ Yes |

---

## Related Documentation

**EAV Monorepo (Main Pipeline):**
- **Complete Pipeline:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- **North Star:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`

**External Tools:**
- **Ingest Assistant:** `/Volumes/HestAI-Projects/ingest-assistant/.coord/ECOSYSTEM-POSITION.md`

**This Project:**
- **Project Context:** `.coord/PROJECT-CONTEXT.md`
- **Roadmap:** `.coord/PROJECT-ROADMAP.md`

---

**CRITICAL INSIGHT:** We are the **ingestion gateway** that transforms raw footage chaos into structured, searchable metadata. Without us, editors waste hours hunting for clips. With us, Edit Web (Step 9) becomes efficient and production-ready.

**LAST UPDATED:** 2025-11-26
**PATTERN:** Ecosystem positioning + Integration specification + Future vision
