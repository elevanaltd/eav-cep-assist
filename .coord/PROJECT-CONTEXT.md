# CEP Panel (Premiere Pro Ingest Assistant) - Project Context

---

## 🌐 Ecosystem Position

**For complete pipeline positioning (where we fit in EAV production workflow):**
→ **[`ECOSYSTEM-POSITION.md`](ECOSYSTEM-POSITION.md)**

**Pipeline Step:** 7 of 10 | **Role:** Ingestion gateway (raw footage → structured metadata) | **Upstream:** Ingest Assistant | **Downstream:** Edit Web

---

## Project Identity
**Name:** CEP Panel (Premiere Pro Ingest Assistant)
**Purpose:** Adobe Premiere Pro extension for structured metadata tagging and clip organization
**Type:** CEP (Common Extensibility Platform) Panel
**Platform:** Adobe Premiere Pro (macOS/Windows)

## Tech Stack
- **Framework:** Adobe CEP APIs
- **Frontend:** HTML, CSS, JavaScript
- **ExtendScript:** ES3 (Premiere Pro scripting layer)
- **XMP Metadata:** Direct XMP read/write via item.getXMPMetadata() / item.setXMPMetadata()
- **Communication:** CSInterface (CEP ↔ ExtendScript)

## Key Features

### Metadata Tagging & XMP Integration
- **Structured Fields:** Location, Subject, Action, Shot Type
- **Naming Convention:** {location}-{subject}-{action}-{shotType} format
- **XMP Read/Write:**
  - xmpDM:shotName → Combined name (maps to PP Shot field)
  - xmpDM:LogComment → Structured key=value pairs (e.g., location=kitchen, subject=oven, shotType=ESTAB)
  - dc:description → Keywords/tags (Dublin Core standard)
- **IA Compatibility:** Reads/writes same XMP fields as Ingest Assistant (bidirectional workflow)
- **Premiere Pro Integration:** Updates clip Name in project panel

### ML Feedback Loop
- **PP Edits Tracking:** Writes .ingest-metadata-pp.json to original media folder
- **Side-by-side Comparison:** Lives alongside .ingest-metadata.json (IA original)
- **Schema Compatibility:** Identical JSON format for easy diffing
- **ML Training:** Compare AI predictions vs. human corrections
- **Audit Trail:** Tracks modifiedAt, modifiedBy for each edit
- **Documentation:** See docs/002-DOC-ML-FEEDBACK-LOOP.md

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
- **Ecosystem Position:** ECOSYSTEM-POSITION.md (detailed pipeline positioning)
- **ML Feedback Loop:** docs/002-DOC-ML-FEEDBACK-LOOP.md

---

**LAST UPDATED:** 2025-11-12
