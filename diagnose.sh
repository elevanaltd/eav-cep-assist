#!/bin/bash

# Diagnostic script for CEP panel installation issues

echo "======================================"
echo "EAV CEP Panel Diagnostic Tool"
echo "======================================"
echo ""

# Check macOS version
echo "1. System Information:"
echo "   macOS: $(sw_vers -productVersion)"
echo ""

# Check Premiere Pro installations
echo "2. Premiere Pro Installations:"
PP_FOUND=false
for year in 2024 2023 2022 2021 2020 2019 2018; do
    PP_PATH="/Applications/Adobe Premiere Pro $year"
    if [ -d "$PP_PATH" ]; then
        PP_FOUND=true
        echo "   ✓ Found: Adobe Premiere Pro $year"

        # Try to get exact version from Info.plist
        if [ -f "$PP_PATH/Adobe Premiere Pro $year.app/Contents/Info.plist" ]; then
            VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "$PP_PATH/Adobe Premiere Pro $year.app/Contents/Info.plist" 2>/dev/null)
            if [ -n "$VERSION" ]; then
                echo "      Version: $VERSION"
            fi
        fi
    fi
done

if [ "$PP_FOUND" = false ]; then
    echo "   ✗ No Premiere Pro installations found"
fi
echo ""

# Check CSXS debug mode for all versions
echo "3. CEP Debug Mode Status:"
for version in 9 10 11 12; do
    DEBUG_MODE=$(defaults read com.adobe.CSXS.$version PlayerDebugMode 2>/dev/null)
    if [ -n "$DEBUG_MODE" ]; then
        if [ "$DEBUG_MODE" = "1" ]; then
            echo "   ✓ CSXS.$version: ENABLED (PlayerDebugMode = 1)"
        else
            echo "   ✗ CSXS.$version: DISABLED (PlayerDebugMode = $DEBUG_MODE)"
        fi
    else
        echo "   - CSXS.$version: Not set"
    fi
done
echo ""

# Check if extensions are deployed
echo "4. Extension Deployment:"
EXTENSIONS_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"

if [ ! -d "$EXTENSIONS_DIR" ]; then
    echo "   ✗ Extensions directory does not exist: $EXTENSIONS_DIR"
else
    echo "   ✓ Extensions directory exists"

    # Check Navigation Panel
    NAV_DIR="$EXTENSIONS_DIR/eav-navigation-panel"
    if [ -d "$NAV_DIR" ]; then
        echo "   ✓ Navigation Panel deployed"
        echo "      Files:"
        [ -f "$NAV_DIR/index-navigation.html" ] && echo "        ✓ index-navigation.html" || echo "        ✗ index-navigation.html (MISSING)"
        [ -f "$NAV_DIR/CSXS/manifest.xml" ] && echo "        ✓ CSXS/manifest.xml" || echo "        ✗ CSXS/manifest.xml (MISSING)"
        [ -f "$NAV_DIR/js/navigation-panel.js" ] && echo "        ✓ js/navigation-panel.js" || echo "        ✗ js/navigation-panel.js (MISSING)"
        [ -f "$NAV_DIR/jsx/host.jsx" ] && echo "        ✓ jsx/host.jsx" || echo "        ✗ jsx/host.jsx (MISSING)"
    else
        echo "   ✗ Navigation Panel NOT deployed"
    fi

    # Check Metadata Panel
    META_DIR="$EXTENSIONS_DIR/eav-metadata-panel"
    if [ -d "$META_DIR" ]; then
        echo "   ✓ Metadata Panel deployed"
        echo "      Files:"
        [ -f "$META_DIR/index-metadata.html" ] && echo "        ✓ index-metadata.html" || echo "        ✗ index-metadata.html (MISSING)"
        [ -f "$META_DIR/CSXS/manifest.xml" ] && echo "        ✓ CSXS/manifest.xml" || echo "        ✗ CSXS/manifest.xml (MISSING)"
        [ -f "$META_DIR/js/metadata-panel.js" ] && echo "        ✓ js/metadata-panel.js" || echo "        ✗ js/metadata-panel.js (MISSING)"
        [ -f "$META_DIR/jsx/host.jsx" ] && echo "        ✓ jsx/host.jsx" || echo "        ✗ jsx/host.jsx (MISSING)"
    else
        echo "   ✗ Metadata Panel NOT deployed"
    fi
fi
echo ""

# Check CEP logs
echo "5. Recent CEP Logs:"
LOG_DIR="$HOME/Library/Logs/CSXS"
if [ -d "$LOG_DIR" ]; then
    echo "   Log directory: $LOG_DIR"
    echo "   Recent log files:"
    ls -lt "$LOG_DIR" | head -5 | tail -4 | awk '{print "      " $9 " (" $6 " " $7 " " $8 ")"}'
    echo ""
    echo "   Checking for errors in latest log..."
    LATEST_LOG=$(ls -t "$LOG_DIR"/CEPHtmlEngine*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "   Latest: $(basename "$LATEST_LOG")"
        ERRORS=$(grep -i "error\|failed\|exception" "$LATEST_LOG" 2>/dev/null | tail -5)
        if [ -n "$ERRORS" ]; then
            echo "   Recent errors found:"
            echo "$ERRORS" | while read line; do
                echo "      $line"
            done
        else
            echo "   ✓ No recent errors found"
        fi
    else
        echo "   ✗ No CEP log files found"
    fi
else
    echo "   ✗ Log directory does not exist: $LOG_DIR"
fi
echo ""

# Check if PP is running
echo "6. Premiere Pro Status:"
if pgrep -x "Adobe Premiere Pro" > /dev/null; then
    echo "   ⚠️  Premiere Pro is currently RUNNING"
    echo "       You must quit and restart PP after enabling debug mode!"
else
    echo "   ✓ Premiere Pro is not running"
fi
echo ""

# Recommendations
echo "======================================"
echo "Recommendations:"
echo "======================================"
echo ""

# Which CSXS version should be enabled?
if [ -d "/Applications/Adobe Premiere Pro 2024" ] || [ -d "/Applications/Adobe Premiere Pro 2023" ]; then
    echo "1. Enable debug mode for CSXS.12:"
    echo "   defaults write com.adobe.CSXS.12 PlayerDebugMode 1"
elif [ -d "/Applications/Adobe Premiere Pro 2022" ] || [ -d "/Applications/Adobe Premiere Pro 2021" ]; then
    echo "1. Enable debug mode for CSXS.11:"
    echo "   defaults write com.adobe.CSXS.11 PlayerDebugMode 1"
elif [ -d "/Applications/Adobe Premiere Pro 2020" ]; then
    echo "1. Enable debug mode for CSXS.10:"
    echo "   defaults write com.adobe.CSXS.10 PlayerDebugMode 1"
else
    echo "1. Enable debug mode (try all versions):"
    echo "   defaults write com.adobe.CSXS.11 PlayerDebugMode 1"
    echo "   defaults write com.adobe.CSXS.12 PlayerDebugMode 1"
fi
echo ""

echo "2. Deploy extensions:"
echo "   ./deploy-navigation.sh && ./deploy-metadata.sh"
echo ""

echo "3. RESTART Premiere Pro (must quit completely)"
echo ""

echo "4. If still not working, check logs:"
echo "   open ~/Library/Logs/CSXS"
echo "   Look for errors in CEPHtmlEngine*.log files"
echo ""
