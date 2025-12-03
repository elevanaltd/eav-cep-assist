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
- **Metadata:** JSON sidecar files (`.ingest-metadata.json`)
- **Communication:** CSInterface (CEP ↔ ExtendScript)

## Key Features

### Metadata Tagging (JSON Sidecar Approach)
- **Structured Fields:** Location, Subject, Action, Shot Type, Shot Number
- **Naming Convention:** {location}-{subject}-{action}-{shotType}-#{shotNumber} format
- **JSON Sidecar:** Reads/writes `.ingest-metadata.json` files (co-located with media)
- **IA Compatibility:** Same JSON schema as Ingest Assistant (Schema 2.0)
- **Premiere Pro Integration:** Updates clip Name in Project Panel
- **Batch Operations:** Process multiple clips at once via Navigation Panel

### ML Feedback Loop
- **PP Edits Tracking:** Writes .ingest-metadata-pp.json to original media folder
- **Side-by-side Comparison:** Lives alongside .ingest-metadata.json (IA original)
- **Schema Compatibility:** Identical JSON format for easy diffing
- **ML Training:** Compare AI predictions vs. human corrections
- **Audit Trail:** Tracks modifiedAt, modifiedBy for each edit
- **Documentation:** See docs/002-DOC-ML-FEEDBACK-LOOP.md

## Current Focus
PHASE::PRODUCTION_STABLE→Performance_optimizations_complete→Edge_optimizer_recommendations_implemented✅
GOVERNANCE::JSON_read/write_working✅→PP_Clip_Name_update_working✅→Performance_cache+debounce+skip-unchanged✅

## Key Decisions
- [2025-11-25] XMP_REMOVAL→getAllProjectClips_simplified→removed_225_lines_XMP_parsing→JSON_only_architecture✅
- [2025-11-25] TAGGED_FILTER→dropdown_with_All/Tagged/Untagged→structured_name_detection✅
- [2025-11-25] BATCH_APPLY_JSON_REWORK→readJSONMetadataByNodeId+writeJSONMetadataByNodeId→replaces_old_XMP_approach✅
- [2025-11-25] STABLE_FILENAME_LOOKUP→use_mediaPath/proxyPath_not_clip.name→survives_clip_rename✅
- [2025-11-25] TRACK_B_JSON_WRITE→writeJSONMetadataByNodeIdInline→shotName_computed→PP_Clip_Name_updated✅
- [2025-11-25] ALL_FIELDS_VISIBLE→removed_video-only_filter→location+subject+action+shotType_available_for_images✅
- [2025-11-25] NAVIGATION_CHECKMARK→structured_name_detection→clips_with_naming_pattern_show_✓
- [2025-11-25] ML_FEEDBACK_LOOP→.ingest-metadata-pp.json_prioritized→preserves_IA_original→enables_AI_training_diff✅
- [2025-11-25] SECURITY_FIX→escapeHTML()_added→XSS_prevention_in_panel-main.js✅
- [2025-11-25] CONSUMER_ALIGNMENT→panel-main.js_uses_hasStructuredName()→matches_navigation-panel.js_pattern✅
- [2025-11-26] PP_EDITS_PRIORITY→readJSONMetadata_checks_-pp.json_first→user_edits_visible_after_save✅
- [2025-11-26] PER_CLIP_FALLBACK→if_PP_file_missing_clip→falls_through_to_IA_original✅
- [2025-11-27] PERF_SEARCH_DEBOUNCE→150ms_debounce_on_search_input→prevents_UI_jank_on_50+_clips✅
- [2025-11-27] PERF_EVENT_PAYLOAD→metadata-applied_includes_name→single_clip_update_vs_full_reload✅
- [2025-11-27] PERF_READ_CACHE→5s_TTL_cache_by_nodeId→30-60%_fewer_disk_reads✅
- [2025-11-27] PERF_WRITE_SKIP→skip_write_if_metadata_unchanged→reduces_network_flush_stalls✅
- [2025-12-03] AI_PENDING_INDICATOR→processedByAI_check→metadata_panel_warning+navigation_⏳_icon→PR#72✅

## Completed Work (PR #50-#72)
- [x] Track_A::JSON_read→working✅
- [x] Track_B::JSON_write→implemented→shotName_computed→PP_Clip_Name_updated✅
- [x] STABLE_LOOKUP::extractOriginalFilename()→from_path_not_clip.name→reload_survives_rename✅
- [x] BATCH_APPLY::JSON_rework→reads_JSON→writes_JSON→updates_PP_Clip_Name✅
- [x] XMP_REMOVAL::getAllProjectClips_simplified→5_properties_only→removed_legacy_tests✅
- [x] TAGGED_FILTER::All/Tagged/Untagged_dropdown→structured_name_detection✅
- [x] ML_FEEDBACK::PP_edits_JSON_writer→.ingest-metadata-pp.json→diff_comparison_enabled✅
- [x] SECURITY::XSS_prevention→escapeHTML()_helper→panel-main.js_hardened✅
- [x] CONSUMER_FIX::hasMetadata_aligned→panel-main.js_uses_same_pattern_as_navigation-panel.js✅
- [x] LUCIDLINK_FIX::File.exists_unreliable→try_read_first→prevents_data_loss✅ (PR #61)
- [x] PP_EDITS_PRIORITY::readJSONMetadata_checks_-pp.json_first→user_sees_saved_edits✅
- [x] PER_CLIP_FALLBACK::PP_file_missing_clip→falls_through_to_IA_original✅
- [x] PRODUCTION_TESTING::User_validated→"This is working"✅
- [x] PERF_OPTIMIZATIONS::edge-optimizer_analysis→4_fixes_implemented→lint+typecheck_passing✅
- [x] AI_PENDING_INDICATOR::processedByAI_warning→metadata_panel_banner+navigation_⏳→PR#72✅

## Quality Gates Status
- `npm run lint` → 0 errors ✅
- `npm run typecheck` → 0 errors ✅
- `npm test` → 153 tests passing ✅
- `npm run quality-gates` → All passing ✅

## Open Issues (1 remaining - monitoring only)
- **#35:** Batch flush delays→monitoring_until_Dec_1→PERF_WRITE_SKIP_may_resolve

## Next Milestone
MONITOR_ISSUE_35::Dec_1_decision_gate→if_corruption_recurs→implement_flush_delays→else_close

## Recent User Feedback
> "This is working" (performance optimizations deployed)

---
Full history: (No PROJECT-HISTORY.md yet - append if created)

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

**LAST UPDATED:** 2025-12-03 (AI pending indicator: processedByAI warning in metadata panel + ⏳ icon in navigation panel, PR #72)
