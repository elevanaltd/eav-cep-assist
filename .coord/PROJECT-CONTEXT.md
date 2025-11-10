# CEP Panel (Premiere Pro Ingest Assistant) - Project Context

---

## 🌐 Ecosystem Position

**For complete pipeline positioning (where we fit in EAV production workflow):**
→ **[`.coord/ECOSYSTEM-POSITION.md`](.coord/ECOSYSTEM-POSITION.md)**

**Pipeline Step:** 7 of 10 | **Role:** Ingestion gateway (raw footage → structured metadata) | **Upstream:** Ingest Assistant | **Downstream:** Edit Web

---

## Project Identity
**Name:** CEP Panel (Premiere Pro Ingest Assistant)
**Purpose:** Adobe Premiere Pro extension for structured metadata tagging and clip organization
**Type:** CEP (Common Extensibility Platform) Panel
**Platform:** Adobe Premiere Pro (macOS/Windows)

## Tech Stack
- **Framework:** Adobe CEP APIs
- **Frontend:** HTML, CSS, JavaScript/TypeScript
- **Integration:** Premiere Pro Project Panel metadata
- **Communication:** CSInterface (CEP ↔ Premiere Pro)

## Key Features
- **Metadata Tagging:** Location, Subject, Action, Shot Type fields
- **Structured Naming:** `{location}-{subject}-{action}-{shotType}` format
- **XMP Integration:** Read pre-tagged metadata from Ingest Assistant
- **Premiere Pro Fields:** Write to Name, Tape Name, Description, Shot
- **Batch Operations:** Tag multiple clips simultaneously

## Current State

### Active Development
- **Phase:** Early development (prototype/MVP)
- **Integration:** Standalone tool (no database)
- **Deployment:** Adobe Extension Manager (manual install)

### Future Integration (Phase 2)
- **Database:** Supabase connection to EAV monorepo
- **Read:** `shots` table from Scenes Web (shot planning context)
- **Write:** Tagged clip metadata back to `shots` table
- **AI Enhancement:** Computer vision auto-suggestions within panel

## Quality Gates Status
- TBD (project in early development)

## Related Documentation

**EAV Ecosystem:**
- **Full Pipeline:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- **North Star:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`

**External Tools:**
- **Ingest Assistant:** `/Volumes/HestAI-Projects/ingest-assistant/.coord/ECOSYSTEM-POSITION.md`

**This Project:**
- **Ecosystem Position:** `.coord/ECOSYSTEM-POSITION.md` (detailed pipeline positioning)

---

**LAST UPDATED:** 2025-11-10
