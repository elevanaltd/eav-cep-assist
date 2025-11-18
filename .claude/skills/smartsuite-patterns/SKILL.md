---
name: smartsuite-patterns
description: SmartSuite API patterns and field format validation. Covers choices vs options distinction (UUID corruption prevention), dry_run safety patterns, field format validation, and MCP integration best practices. Critical for preventing UUID corruption bugs.
allowed-tools: Read
---

# SmartSuite Patterns

CRITICAL_PRINCIPLE::"choices≠options → UUID_preservation≠UUID_corruption → Data_integrity≠Data_destruction"

---

## ⚠️ CRITICAL: UUID CORRUPTION PREVENTION

**THE GOLDEN RULE: Use `choices`, NEVER `options`**

**WRONG** (destroys all data - IRREVERSIBLE):
```json
{
  "params": {
    "options": [  // ❌ WRONG - creates NEW UUIDs, destroys ALL existing data
      {"value": "draft"},
      {"value": "active"}
    ]
  }
}
```

**CORRECT** (preserves UUIDs and data):
```json
{
  "params": {
    "choices": [  // ✅ CORRECT - preserves UUIDs and data
      {"value": "draft", "id": "existing-uuid-1"},
      {"value": "active", "id": "existing-uuid-2"}
    ]
  }
}
```

**Why This Matters**: Using `options` instead of `choices` **permanently destroys all data** in that field across all records. This is **IRREVERSIBLE**.

---

## AUTHENTICATION

```octave
HEADERS::[
  Authorization→"Token ${SMARTSUITE_API_TOKEN}",  // NOT "Bearer"
  ACCOUNT_ID→"s3qnmox1",
  Content_Type→"application/json"
]
```

---

## CRITICAL FIELD FORMAT RULES

```octave
LINKED_RECORDS::[
  MUST→arrays[even_for_single_values],
  WRONG→"project_id": "uuid",
  CORRECT→"project_id": ["uuid"],
  FILTER_OPERATORS→has_any_of|has_all_of|has_none_of[NEVER_is_or_equals]
]

SELECT_STATUS_FIELDS::[
  USE→option_codes≠display_labels,
  WRONG→"status": "In Progress",
  CORRECT→"status": "in_progress"
]

FORMULA_ROLLUP_FIELDS::[
  READ_ONLY→cannot_set_via_API,
  CALCULATED→by_SmartSuite,
  ATTEMPTING_SET→validation_error
]

RICH_TEXT_FIELDS::[
  STRUCTURE→SmartDoc_format[data, html, preview],
  EMPTY→{data:{type:"doc",content:[]}, html:"", preview:""}
]

DATE_RANGE_FIELDS::[
  FORMAT→{from_date:{date:ISO8601,include_time:bool}, to_date:{...}}
]
```

---

## DRY-RUN SAFETY PATTERN (MANDATORY)

```octave
ALWAYS_DEFAULT::[
  smartsuiteFieldCreate→dryRun:true,
  smartsuiteFieldUpdate→dryRun:true,
  smartsuiteRecord→dryRun:true
]

EXECUTION::[
  1_dry_run→verify_output,
  2_review→confirm_correct,
  3_execute→dryRun:false
]
```

---

## CRUD OPERATIONS (QUICK REFERENCE)

```octave
OPERATIONS::[
  LIST→POST /api/v1/applications/{appId}/records/list/,
  GET→GET /api/v1/applications/{appId}/records/{recordId}/[trailing_slash_REQUIRED],
  CREATE→POST /api/v1/applications/{appId}/records/,
  UPDATE→PATCH /api/v1/applications/{appId}/records/{recordId}/,
  DELETE→DELETE /api/v1/applications/{appId}/records/{recordId}/[trailing_slash_REQUIRED],
  BULK_CREATE→POST /api/v1/applications/{appId}/records/bulk/[max_25],
  BULK_UPDATE→PATCH /api/v1/applications/{appId}/records/bulk/[max_25]
]

TRAILING_SLASH::[
  GET_DELETE→REQUIRED[silent_failure_without],
  POST_PATCH→optional
]

RATE_LIMITING::[
  MAX→4_5_requests_per_second,
  RECOMMENDED→250ms_delay_between_requests,
  429_BACKOFF→30s_exponential,
  RETRY→max_3_retries_for_5xx
]
```

---

## FEW-SHOT EXAMPLES

### Example 1: Safe Field Update (UUID Preservation)

```typescript
// 1. Get existing field configuration
const fieldDetail = await smartsuiteSchema(tableId, 'field_detail', 'status');

// 2. Extract existing choices WITH UUIDs
const existingChoices = fieldDetail.params.choices;
// [{"value": "draft", "id": "uuid-1"}, {"value": "active", "id": "uuid-2"}]

// 3. Add new choice while preserving existing UUIDs
const updatedChoices = [
  ...existingChoices,  // ✅ Preserve existing with UUIDs
  {"value": "archived", "id": generateNewUUID()}
];

// 4. DRY-RUN first
await smartsuiteFieldUpdate(
  tableId, fieldId,
  { params: { choices: updatedChoices } },  // ✅ choices, not options
  dryRun: true
);

// 5. Verify output, then execute
await smartsuiteFieldUpdate(
  tableId, fieldId,
  { params: { choices: updatedChoices } },
  dryRun: false
);
```

### Example 2: Creating Linked Record

```typescript
// WRONG: String value
const wrong = {
  project_id: "68a8ff5237fde0bf797c05b3"  // ❌ Will fail
};

// CORRECT: Array of strings
const correct = {
  project_id: ["68a8ff5237fde0bf797c05b3"]  // ✅ Works
};

await smartsuiteRecord('create', tableId, null, correct);
```

### Example 3: Filtering Linked Records

```typescript
// WRONG: Using 'is' operator
const wrongFilter = {
  field: "project_id",
  comparison: "is",  // ❌ Won't work for linked records
  value: "project-uuid"
};

// CORRECT: Using 'has_any_of' operator
const correctFilter = {
  field: "project_id",
  comparison: "has_any_of",  // ✅ Correct for linked records
  value: ["project-uuid"]  // Array format
};

await smartsuiteQuery('search', tableId, {
  filter: { operator: "and", fields: [correctFilter] }
});
```

---

## FIELD DISCOVERY WORKFLOW

```octave
DISCOVERY_SEQUENCE::[
  STEP_1→smartsuiteSchema(tableId,'summary')→table_info+field_list,
  STEP_2→smartsuiteSchema(tableId,'field_detail',fieldSlug)→full_config+UUIDs,
  STEP_3→validate_field_format_before_write
]

VALIDATION_CHECKLIST::[
  linked_records→check_arrays,
  select_fields→check_codes≠labels,
  required_fields→ensure_present,
  formula_fields→skip_in_writes[read_only]
]
```

---

## ANTI-PATTERNS

```octave
NEVER::[
  options_instead_of_choices→UUID_corruption,
  single_values_for_linked_records→validation_error,
  display_labels_for_selects→field_mismatch,
  skip_dry_run→data_risk,
  is_operator_for_linked_records→query_failure,
  set_formula_rollup_values→validation_error,
  forget_trailing_slash_DELETE_GET→silent_failure
]

ALWAYS::[
  choices_with_preserved_UUIDs→data_integrity,
  arrays_for_linked_records→even_single_values,
  option_codes_for_selects→not_labels,
  dry_run_first→then_execute,
  has_any_of_for_linked_filters→not_is,
  trailing_slash_DELETE_GET→prevent_silent_failure,
  250ms_delay_between_requests→rate_limit_compliance
]
```

---

## PERFORMANCE BENCHMARKS

```octave
PRODUCTION_TESTED::[
  QUERY→400_600ms,
  CRUD→400_700ms,
  BULK→600_850ms[multiple_records],
  SCHEMA_DISCOVERY→300_500ms[standard],450_850ms[intelligent_API]
]
```
