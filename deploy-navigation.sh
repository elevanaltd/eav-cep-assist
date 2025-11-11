#!/bin/bash

# Deploy Navigation Panel to Premiere Pro CEP Extensions

TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/eav-navigation-panel"

echo "=== Deploying Navigation Panel ==="
echo "Target: $TARGET_DIR"

# Create target directory
mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/CSXS"
mkdir -p "$TARGET_DIR/js"
mkdir -p "$TARGET_DIR/css"
mkdir -p "$TARGET_DIR/jsx"

# Copy files
echo "Copying files..."
cp index-navigation.html "$TARGET_DIR/index-navigation.html"
cp CSXS/manifest-navigation.xml "$TARGET_DIR/CSXS/manifest.xml"
cp js/navigation-panel.js "$TARGET_DIR/js/"
cp js/CSInterface.js "$TARGET_DIR/js/"
cp css/navigation-panel.css "$TARGET_DIR/css/"
cp jsx/host.jsx "$TARGET_DIR/jsx/"

echo "✓ Navigation Panel deployed to:"
echo "  $TARGET_DIR"
echo ""
echo "Next steps:"
echo "1. Restart Premiere Pro"
echo "2. Go to Window > Extensions > EAV Ingest Assistant - Navigation"
echo "3. Open a project with clips"
echo "4. Click a clip to test auto-open in Source Monitor"
echo "5. Watch the debug panel at the bottom for diagnostics"

