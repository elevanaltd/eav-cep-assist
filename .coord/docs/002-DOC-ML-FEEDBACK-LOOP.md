# ML Feedback Loop - PP Edits Tracking

**Purpose:** Track human corrections made in Premiere Pro to improve AI metadata generation accuracy.

**Status:** ✅ Implemented (2025-11-12)

---

## Overview

The CEP panel creates a **parallel JSON file** alongside the original Ingest Assistant metadata to track human edits. This enables:

1. **Accuracy measurement** - Compare AI predictions vs. human corrections
2. **ML training data** - Feed corrections back to improve AI prompts
3. **Quality metrics** - Track which fields/categories need improvement
4. **Audit trail** - Know when/who made changes

---

## File Structure

```
/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/
├── EA001932.MOV                       ← Media file
├── .ingest-metadata.json              ← AI-generated (Ingest Assistant)
└── .ingest-metadata-pp.json           ← Human-corrected (CEP Panel)
```

Both JSON files use **identical schema** for easy comparison.

---

## JSON Schema (v2.0)

**File:** `.ingest-metadata-pp.json`

```json
{
  "_schema": "2.0",
  "EA001932": {
    // === File Identification ===
    "id": "EA001932",
    "originalFilename": "EA001932.MOV",
    "currentFilename": "EA001932.MOV",
    "filePath": "/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103/EA001932.MOV",
    "extension": ".MOV",
    "fileType": "video",

    // === Core Metadata ===
    "mainName": "hallway-front-door-safety-chain-CU",
    "keywords": ["door", "chain", "lock"],

    // === Structured Components ===
    "location": "hallway",
    "subject": "front-door",
    "action": "safety-chain",
    "shotType": "CU",

    // === Processing State ===
    "processedByAI": true,

    // === Audit Trail ===
    "createdAt": "2025-11-12T10:00:00.000Z",
    "createdBy": "ingest-assistant",
    "modifiedAt": "2025-11-12T15:30:00.000Z",
    "modifiedBy": "cep-panel",
    "version": "1.0.0"
  }
}
```

### Key Fields:

| Field | Source | Notes |
|-------|--------|-------|
| `processedByAI` | Preserved from IA | Indicates if AI was used |
| `createdAt` | Preserved from IA | Original creation timestamp |
| `createdBy` | Preserved from IA | Always `"ingest-assistant"` |
| `modifiedAt` | Updated by CEP | Timestamp of PP edit |
| `modifiedBy` | Set by CEP | Always `"cep-panel"` |

---

## Implementation

### **CEP Panel (jsx/host.jsx:553-737)**

When "Apply to Premiere" is clicked:

1. **Read original IA JSON** (`.ingest-metadata.json`)
   - Preserve `processedByAI`, `createdAt`, `createdBy`

2. **Build PP edits entry**
   - Update structured fields (`location`, `subject`, `action`, `shotType`)
   - Set `modifiedAt` to current timestamp
   - Set `modifiedBy` to `"cep-panel"`

3. **Write to PP JSON** (`.ingest-metadata-pp.json`)
   - Merge with existing entries (supports multiple clips per folder)
   - Create file if doesn't exist

4. **Log success/failure** to diagnostics panel

### **Error Handling:**

- If `.ingest-metadata.json` doesn't exist → Still writes PP JSON (IA fields blank)
- If media path unavailable → Skips JSON write, logs warning
- If file write fails → Logs error to diagnostics panel, doesn't block XMP write

---

## Comparison Workflow

### **Step 1: Compare JSONs**

```bash
#!/bin/bash
# scripts/compare-metadata.sh

FOLDER="/Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103"
IA_JSON="$FOLDER/.ingest-metadata.json"
PP_JSON="$FOLDER/.ingest-metadata-pp.json"
OUTPUT="metadata-diff-$(date +%Y%m%d-%H%M%S).json"

jq -s '
  .[0] as $ia | .[1] as $pp |
  ($ia | keys_unsorted | .[1:]) as $ids |  # Skip _schema key
  $ids | map({
    id: .,
    ai_metadata: $ia[.],
    pp_metadata: $pp[.],
    changes: {
      location: (if ($ia[.].location != $pp[.].location) then
        {ai: $ia[.].location, pp: $pp[.].location} else null end),
      subject: (if ($ia[.].subject != $pp[.].subject) then
        {ai: $ia[.].subject, pp: $pp[.].subject} else null end),
      action: (if ($ia[.].action != $pp[.].action) then
        {ai: $ia[.].action, pp: $pp[.].action} else null end),
      shotType: (if ($ia[.].shotType != $pp[.].shotType) then
        {ai: $ia[.].shotType, pp: $pp[.].shotType} else null end),
      keywords: (if ($ia[.].keywords != $pp[.].keywords) then
        {ai: $ia[.].keywords, pp: $pp[.].keywords} else null end)
    }
  }) | map(select(
    .changes.location != null or
    .changes.subject != null or
    .changes.action != null or
    .changes.shotType != null or
    .changes.keywords != null
  ))
' "$IA_JSON" "$PP_JSON" > "$OUTPUT"

echo "Diff report generated: $OUTPUT"
```

**Output Example:**

```json
[
  {
    "id": "EA001932",
    "ai_metadata": { "location": "hallway", "subject": "door", ... },
    "pp_metadata": { "location": "hallway", "subject": "front-door", ... },
    "changes": {
      "subject": {
        "ai": "door",
        "pp": "front-door"
      }
    }
  }
]
```

---

### **Step 2: Accuracy Metrics**

```bash
#!/bin/bash
# scripts/calculate-accuracy.sh

DIFF_FILE="metadata-diff-*.json"

jq '
  {
    total_files: length,
    total_changes: (map(.changes | to_entries | length) | add),
    changes_by_field: (
      map(.changes | to_entries | map(.key)) | flatten |
      group_by(.) |
      map({(.[0]): length}) |
      add
    ),
    accuracy: (
      (length - (map(.changes | to_entries | length) | add)) / length * 100
    )
  }
' "$DIFF_FILE"
```

**Output Example:**

```json
{
  "total_files": 120,
  "total_changes": 15,
  "changes_by_field": {
    "subject": 8,
    "location": 4,
    "shotType": 3
  },
  "accuracy": 87.5
}
```

---

### **Step 3: ML Training Data Generation**

**Format for AI prompt improvement:**

```json
{
  "training_examples": [
    {
      "image_or_video_description": "[extracted from file or XMP]",
      "incorrect_prediction": {
        "location": "hallway",
        "subject": "door"
      },
      "correct_classification": {
        "location": "hallway",
        "subject": "front-door"
      },
      "correction_reason": "Subject should be more specific (front-door vs. generic door)"
    }
  ]
}
```

---

## Testing Checklist

- [x] PP edits JSON created when "Apply to Premiere" clicked
- [x] File written to original media folder (not PP project folder)
- [x] Schema matches IA JSON format (v2.0)
- [x] Preserves `processedByAI`, `createdAt`, `createdBy` from IA
- [x] Updates `modifiedAt`, `modifiedBy` with PP values
- [x] Multiple clips in same folder accumulate in single JSON
- [x] Diagnostics panel shows success/failure message
- [ ] Comparison script generates diff report
- [ ] Accuracy metrics script calculates correction rate
- [ ] ML training data format validated

---

## Future Enhancements

### **Short-term:**
- [ ] Network sync queue for offline editing scenarios
- [ ] Bulk comparison script (process entire project)
- [ ] Web dashboard for accuracy metrics

### **Long-term:**
- [ ] Automated prompt refinement based on corrections
- [ ] Per-category accuracy tracking (e.g., kitchen vs. bathroom)
- [ ] Human-in-the-loop training pipeline integration

---

## References

- **Implementation:** `jsx/host.jsx:553-737`
- **Schema Documentation:** `CLAUDE.md` (ML Feedback Loop section)
- **Related:** `../ingest-assistant/.coord/docs/000001-DOC-METADATA-STRATEGY-SHARED.md`

---

**Last Updated:** 2025-11-12
**Author:** Claude Code (eav-cep-assist session)
