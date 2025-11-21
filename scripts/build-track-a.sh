#!/bin/bash
# Build script: Transpile Track A functions from ES6 to ES3 for ExtendScript

set -e

echo "🔧 Building Track A functions (ES6 → ES3)..."

# Create output directory
mkdir -p jsx/generated

# Transpile with Babel
npx babel src/track-a/json-integration.js \
  --out-file jsx/generated/track-a-integration.jsx \
  --no-babelrc \
  --config-file ./babel.config.json

# Post-process: Convert to ExtendScript-compatible format
# 1. Remove export statements (ExtendScript doesn't support modules)
# 2. Wrap in IIFE to avoid global namespace pollution (optional)

# Use portable sed syntax (BSD + GNU compatible)
OUTPUT_FILE="jsx/generated/track-a-integration.jsx"
TEMP_FILE="${OUTPUT_FILE}.tmp"

sed 's/export function /function /g' "$OUTPUT_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$OUTPUT_FILE"
sed 's/export var /var /g' "$OUTPUT_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$OUTPUT_FILE"
sed 's/export const /var /g' "$OUTPUT_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$OUTPUT_FILE"

# Add ExtendScript wrapper functions that use global variables
cat >> jsx/generated/track-a-integration.jsx << 'EOF'

// ============================================================================
// EXTENDSCRIPT WRAPPERS (use global File, $)
// ============================================================================
// These wrappers provide backwards-compatible signatures for CEP Panel calls
// They inject the global ExtendScript objects (File, $) automatically

/**
 * ExtendScript Wrapper: Read JSON metadata
 * Uses global File, $ variables
 * @param {ProjectItem} clip - Premiere Pro clip object
 * @returns {String} JSON string or "null"
 */
function readJSONMetadataWrapper(clip) {
  return readJSONMetadata(clip, File, $);
}

/**
 * ExtendScript Wrapper: Write JSON metadata
 * Uses global File, $ variables
 * @param {ProjectItem} clip - Premiere Pro clip object
 * @param {Object} updates - Metadata updates
 * @returns {String} 'true' or 'false'
 */
function writeJSONMetadataWrapper(clip, updates) {
  return writeJSONMetadata(clip, updates, File, $);
}

/**
 * ExtendScript Wrapper: Read JSON metadata by nodeId
 * Uses global app, File, $ variables
 * @param {String} nodeId - Premiere Pro clip node ID
 * @returns {String} JSON string or "null"
 */
function readJSONMetadataByNodeIdWrapper(nodeId) {
  return readJSONMetadataByNodeId(
    nodeId,
    app,
    findProjectItemByNodeId,
    File,
    $
  );
}

/**
 * ExtendScript Wrapper: Write JSON metadata by nodeId
 * Uses global app, File, $ variables
 * @param {String} nodeId - Premiere Pro clip node ID
 * @param {String} updatesJSON - JSON string of updates
 * @returns {String} 'true' or 'false'
 */
function writeJSONMetadataByNodeIdWrapper(nodeId, updatesJSON) {
  return writeJSONMetadataByNodeId(
    nodeId,
    updatesJSON,
    app,
    findProjectItemByNodeId,
    File,
    $
  );
}
EOF

echo "✅ Build complete: jsx/generated/track-a-integration.jsx"
echo "   - Transpiled to ES3"
echo "   - Removed export statements"
echo "   - Added ExtendScript wrapper functions"
echo "   - Ready for ExtendScript inclusion"
