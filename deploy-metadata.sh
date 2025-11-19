#!/bin/bash

# Deploy Metadata Panel to Premiere Pro CEP Extensions

TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/eav-metadata-panel"

echo "=== Deploying Metadata Panel ==="
echo "Target: $TARGET_DIR"

# Create target directory
mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/CSXS"
mkdir -p "$TARGET_DIR/js"
mkdir -p "$TARGET_DIR/css"
mkdir -p "$TARGET_DIR/jsx"
mkdir -p "$TARGET_DIR/jsx/generated"

# Copy files
echo "Copying files..."
cp index-metadata.html "$TARGET_DIR/index-metadata.html"
cp CSXS/manifest-metadata.xml "$TARGET_DIR/CSXS/manifest.xml"
cp js/metadata-panel.js "$TARGET_DIR/js/"
cp js/CSInterface.js "$TARGET_DIR/js/"
cp css/metadata-panel.css "$TARGET_DIR/css/"
cp jsx/host.jsx "$TARGET_DIR/jsx/"
cp jsx/generated/track-a-integration.jsx "$TARGET_DIR/jsx/generated/" 2>/dev/null || echo "Warning: jsx/generated/track-a-integration.jsx not found - run npm run build first"

echo "✓ Metadata Panel deployed to:"
echo "  $TARGET_DIR"
echo ""
echo "Next steps:"
echo "1. Restart Premiere Pro"
echo "2. Go to Window > Extensions > EAV Ingest Assistant - Metadata"
echo "3. Position it next to the Navigation Panel"
echo "4. Click a clip in Navigation Panel"
echo "5. Verify Metadata Panel loads the clip data"
echo "6. Edit fields and click 'Apply to Premiere'"
echo "7. Watch both debug panels for inter-panel communication"

