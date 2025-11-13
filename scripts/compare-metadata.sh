#!/bin/bash
# compare-metadata.sh - Compare AI-generated vs human-corrected metadata
#
# Usage:
#   ./scripts/compare-metadata.sh /path/to/media/folder
#   ./scripts/compare-metadata.sh /Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103
#
# Output:
#   Generates metadata-diff-{timestamp}.json with corrections for ML training

set -euo pipefail

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 /path/to/media/folder"
    echo ""
    echo "Example:"
    echo "  $0 /Volumes/EAV_Video_RAW/Berkeley/EAV036/shoot1-20251103"
    exit 1
fi

FOLDER="$1"
IA_JSON="$FOLDER/.ingest-metadata.json"
PP_JSON="$FOLDER/.ingest-metadata-pp.json"
OUTPUT="metadata-diff-$(date +%Y%m%d-%H%M%S).json"

# Validate files exist
if [ ! -f "$IA_JSON" ]; then
    echo "Error: IA metadata file not found: $IA_JSON"
    exit 1
fi

if [ ! -f "$PP_JSON" ]; then
    echo "Error: PP edits file not found: $PP_JSON"
    echo "No human corrections have been made yet."
    exit 1
fi

# Generate diff report
jq -s '
  .[0] as $ia | .[1] as $pp |

  # Get all clip IDs (skip _schema key)
  ($ia | keys_unsorted | map(select(. != "_schema"))) as $ids |

  # Compare each clip
  $ids | map({
    id: .,
    ai_metadata: {
      location: $ia[.].location,
      subject: $ia[.].subject,
      action: $ia[.].action,
      shotType: $ia[.].shotType,
      keywords: $ia[.].keywords
    },
    pp_metadata: {
      location: $pp[.].location,
      subject: $pp[.].subject,
      action: $pp[.].action,
      shotType: $pp[.].shotType,
      keywords: $pp[.].keywords
    },
    changes: {
      location: (
        if ($ia[.].location != $pp[.].location) then
          {ai: $ia[.].location, pp: $pp[.].location}
        else null end
      ),
      subject: (
        if ($ia[.].subject != $pp[.].subject) then
          {ai: $ia[.].subject, pp: $pp[.].subject}
        else null end
      ),
      action: (
        if ($ia[.].action != $pp[.].action) then
          {ai: $ia[.].action, pp: $pp[.].action}
        else null end
      ),
      shotType: (
        if ($ia[.].shotType != $pp[.].shotType) then
          {ai: $ia[.].shotType, pp: $pp[.].shotType}
        else null end
      ),
      keywords: (
        if ($ia[.].keywords != $pp[.].keywords) then
          {ai: $ia[.].keywords, pp: $pp[.].keywords}
        else null end
      )
    },
    audit: {
      processedByAI: $ia[.].processedByAI,
      createdAt: $ia[.].createdAt,
      modifiedAt: $pp[.].modifiedAt
    }
  }) |

  # Filter to only clips with changes
  map(select(
    .changes.location != null or
    .changes.subject != null or
    .changes.action != null or
    .changes.shotType != null or
    .changes.keywords != null
  ))
' "$IA_JSON" "$PP_JSON" > "$OUTPUT"

# Generate summary
TOTAL_CHANGES=$(jq 'length' "$OUTPUT")

if [ "$TOTAL_CHANGES" -eq 0 ]; then
    echo "✓ No corrections found - AI predictions match human review!"
    rm "$OUTPUT"
    exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Metadata Comparison Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Folder: $FOLDER"
echo "Clips with corrections: $TOTAL_CHANGES"
echo ""

# Show changes by field
echo "Changes by field:"
jq -r '
  map(.changes | to_entries | map(select(.value != null) | .key)) |
  flatten |
  group_by(.) |
  map("  \(.[0]): \(length) corrections") |
  .[]
' "$OUTPUT"

echo ""
echo "Diff report saved: $OUTPUT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
