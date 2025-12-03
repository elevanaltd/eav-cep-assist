# CEP Panel - Claude Assistant Guide

===GIT_SAFETY_PROTOCOL===

CONSTRAINT::[
  MAIN_BRANCH::protected[push_blocked_at_remote],
  NEVER::commit_directly_to_main,
  ALWAYS::create_feature_branch→PR→merge
]

BEFORE_ANY_COMMIT::[
  1::git branch --show-current,
  2::confirm_NOT_main,
  3::if_main→git checkout -b {feat|fix}/description
]

===END_GIT_SAFETY===

---

## PROJECT_IDENTITY

PURPOSE::Adobe Premiere Pro CEP extension for video metadata management
STACK::HTML/CSS + JavaScript(CEP) + ExtendScript(ES3) + JSON sidecar files
PIPELINE_POSITION::Steps 3-5[PP_import→batch_processing→QC_workflow]
UPSTREAM::Ingest Assistant[CFex_transfer + AI_cataloging]

---

## ARCHITECTURE

```octave
TWO_PANEL_SYSTEM::[
  NAVIGATION_PANEL::clip_browser[search+filter]→dispatches_selection_events,
  METADATA_PANEL::metadata_form[Previous/Next]→receives_selection+writes_XMP
]

THREE_LAYERS::[
  HTML/CSS::[index-metadata.html, index-navigation.html, css/*.css],
  JS_CEP::[js/metadata-panel.js, js/navigation-panel.js, js/CSInterface.js],
  EXTENDSCRIPT::[jsx/host.jsx]→XMP_read/write+Project_Panel_interaction
]

COMMUNICATION_FLOW::
  user_clicks_clip→Navigation_dispatches[com.eav.clipSelected]→
  Metadata_receives→loads_via_ExtendScript→user_edits→
  Apply_to_Premiere→ExtendScript_writes_XMP→green_checkmark
```

---

## METADATA_STRATEGY

```octave
CURRENT_IMPLEMENTATION::JSON_READ + LIMITED_XMP_WRITE[Schema 2.0]

JSON_SIDECAR_READ::VALIDATED[
  FILE::.ingest-metadata.json[co-located_with_media],
  SCHEMA::".coord/docs/005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md",
  READS::[location, subject, action, shotType, shotNumber, keywords, shotName, timestamps, _schema, _completed]
]

XMP_WRITE_CAPABILITY::[
  CLIP_NAME::RELIABLE,
  DESCRIPTION::UNCERTAIN[Adobe_XMP_namespace_constraints],
  OTHER_FIELDS::NOT_SUPPORTED
]

LEGACY::XMP_full_read/write[DEPRECATED→namespace_collision_issues]
```

---

## KEY_FILES

```octave
EXTENDSCRIPT[jsx/host.jsx]::[
  getSelectedClips()→Project_Panel_selection,
  getAllProjectClips()→Navigation_Panel_clips[XMP_read],
  updateClipMetadata()→XMP_write[namespace-aware:L177-447],
  selectClip()→select_in_Project_Panel,
  openInSourceMonitor()→open_clip,
  readJSONMetadataByNodeId()→JSON_sidecar_read
]

METADATA_PANEL[js/metadata-panel.js]::[
  loadClipIntoForm()→populate_fields,
  applyMetadata()→send_to_ExtendScript,
  updateGeneratedName()→live_preview,
  setupSearchableDropdown()→Shot_Type_validation
]

NAVIGATION_PANEL[js/navigation-panel.js]::[
  loadAllClips()→fetch_via_ExtendScript,
  filterClips()→search+filters[Video/Image/Tagged],
  handleClipClick()→dispatch_CEP_event,
  XMP_WARM_UP_DELAY::1.5s[prevents_EMPTY_metadata_bug]
]

DEPLOYMENT::[
  deploy-metadata.sh→~/Library/Application Support/Adobe/CEP/extensions/eav-metadata-panel/,
  deploy-navigation.sh→~/Library/Application Support/Adobe/CEP/extensions/eav-navigation-panel/,
  CRITICAL::both_share_jsx/host.jsx
]
```

---

## DEBUG_CONSOLE_ACCESS

```octave
PRIMARY_DEBUG_SOURCES::[
  METADATA_PANEL::right-click→Debug→Console[
    PREFIXES::[MetadataForm], ✓[success], ✗[error], ▶[navigation]
  ],
  NAVIGATION_PANEL::right-click→Debug→Console[
    PREFIXES::[ClipBrowser], [XMP], typeof_EAVIngest
  ]
]

EXTENDSCRIPT_CONSOLE::Premiere→Help→Console[Cmd+F12]
  REALITY::empty_by_default→manual_testing_only
  PATH_ISSUE::$.evalFile()_breaks_on_spaces_in_path

MANUAL_EXTENDSCRIPT_TEST::[
  1::cp_jsx/host.jsx_to_Desktop[avoid_space_in_path],
  2::$.evalFile(Folder.desktop.fsName + "/host.jsx"),
  3::typeof EAVIngest→expected:"object",
  4::EAVIngest.readJSONMetadataByNodeId("123")→JSON_or_"null"
]

COMMON_ERRORS::[
  "typeof EAVIngest: undefined"→ExtendScript_not_loaded,
  "JSON Parse error"→ExtendScript_returning_error_string,
  "SyntaxError at line X"→ES3_violation_in_jsx/host.jsx
]
```

---

## ES3_ENFORCEMENT

```octave
WHY::ExtendScript=ECMAScript3[1999]→ES6+_causes_runtime_errors

THREE_LAYER_ENFORCEMENT::[
  1_PARSER::eslint.config.js[ecmaVersion:3]→ES6+_fails_parsing,
  2_REGRESSION::scripts/validate-es3-enforcement.sh→proves_enforcement_works,
  3_TYPES::tsconfig.json[target:ES5]→catches_undefined_globals_only
]

FORBIDDEN_ES6::[
  const/let→var,
  arrow_functions→function(){},
  template_literals→string_concatenation,
  destructuring→manual_assignment,
  default_params→x=x||'default',
  spread→concat(),
  console.log→NOT_AVAILABLE,
  Array.forEach→for_loop
]

QUALITY_GATES::ALL_MUST_PASS[
  npm run lint→ES3_compliance,
  npm run validate:es3→regression_detection,
  npm run typecheck→undefined_globals,
  npm run test→unit+integration
]

VIOLATION_DEBUG::[
  "Unexpected token"→parser_rejection→replace_ES6+_syntax,
  "Cannot find name 'X'"→undefined_global→check_eslint.config.js:L54-67,
  Premiere_runtime_error→ESCALATE[gap_in_ES3_enforcement]
]
```

---

## DEPLOYMENT_WORKFLOW

```bash
cd /Volumes/HestAI-Projects/eav-cep-assist
./deploy-navigation.sh && ./deploy-metadata.sh
# THEN: Quit Premiere Pro (Cmd+Q) → Reopen → Window→Extensions
```

---

## PRODUCTION_WORKFLOW

```octave
STEPS::[
  1_CFEX_TRANSFER[IA]::extract_media→write_TapeName_XMP,
  2_AI_CATALOGING[IA]::analyze→create_.ingest-metadata.json→assign_shot_numbers,
  3_PP_IMPORT::File→Import→attach_proxies→verify_TapeName,
  4_METADATA_REVIEW[CEP]::select_clip→JSON_loads→edit→Apply_to_Premiere,
  5_QC_REVIEW[CEP]::verify_AI_analysis→correct_errors→save
]

JSON_LOOKUP::PP_TapeName[immutable]→.ingest-metadata.json[key=filename_without_ext]
RESULT::PP_Clip_Name={location}-{subject}-{action}-{shotType}-#{shotNumber}
```

---

## ML_FEEDBACK_LOOP

```octave
DUAL_OUTPUT_ON_APPLY::[
  XMP::embedded[xmpDM:shotName, xmpDM:logComment, dc:description],
  JSON::.ingest-metadata-pp.json[human-corrected]→same_folder_as_media
]

WORKFLOW::IA_writes_.ingest-metadata.json[AI]→editor_corrects_via_CEP→
  CEP_writes_.ingest-metadata-pp.json[human]→compare→ML_training_feedback

IMPLEMENTATION::jsx/host.jsx:L553-737
```

---

## COMMON_ISSUES

```octave
EMPTY_METADATA_FIRST_LOAD::[
  CAUSE::XMP_cache_not_initialized,
  FIX::XMP_WARM_UP_DELAY=1.5s,
  DEBUG::"[ClipBrowser] Waiting for XMP metadata..."
]

DESCRIPTION_NOT_SAVING::[
  CAUSE::XMP_namespace_collision[Dublin_Core_vs_XMP],
  FIX::namespace-aware_block_manipulation[jsx/host.jsx:L187-443],
  DEBUG::"dc:description updated"
]

LOCATION_SUBJECT_CORRUPTION::[
  CAUSE::fields_in_wrong_namespace_block,
  FIX::separate_Dublin_Core_and_XMP_blocks
]

GREEN_CHECKMARK_MISSING::[
  CAUSE::updateClipMetadata()_failed,
  DEBUG::check_both_panel_consoles_for_errors
]

NAVIGATION_SHOWS_0_CLIPS::[
  CAUSE::getAllProjectClips()_error,
  DEBUG::"[ClipBrowser] ✓ Loaded X clips"
]
```

---

## CRITICAL_CONSTRAINTS

```octave
1::ExtendScript_is_ES3[no_arrow_functions, no_const/let, no_template_literals]
2::Both_panels_share_jsx/host.jsx[changes_affect_both]
3::XMP_namespace_awareness_required[Dublin_Core≠XMP_namespace]
4::CEP_event_system[panels_communicate_via_CSInterface.dispatchEvent()]
5::Adobe_debugging[right-click_panel→Debug→Chromium_DevTools]
```

---

## DOCUMENTATION_STRUCTURE

```octave
CLAUDE.md::operational_guide[you_are_here]
.coord/PROJECT-CONTEXT.md::project_identity+tech_stack
.coord/ECOSYSTEM-POSITION.md::pipeline_position
.coord/workflow-docs/003-QUICK_REFERENCE-NEXT_SESSION.md::session_handoff
.coord/workflow-docs/002-CEP_PANEL_CURRENT_STATE-BUILD-STATUS.md::build_status
.coord/docs/005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md::JSON_schema_spec
```

---

**Last Updated:** 2025-12-03 (OCTAVE compression)
