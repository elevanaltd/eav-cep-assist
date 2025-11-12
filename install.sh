#!/bin/bash

# EAV CEP Panel Installation Script
# Enables CEP debugging and deploys both panels

echo "==================================="
echo "EAV CEP Panel Installation"
echo "==================================="
echo ""

# Detect macOS version
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script is for macOS only."
    echo "Windows users: See INSTALL.md for manual setup instructions."
    exit 1
fi

# Step 1: Check Premiere Pro version
echo "Step 1: Checking Premiere Pro installation..."
PP_PATHS=(
    "/Applications/Adobe Premiere Pro 2024"
    "/Applications/Adobe Premiere Pro 2023"
    "/Applications/Adobe Premiere Pro 2022"
    "/Applications/Adobe Premiere Pro 2021"
    "/Applications/Adobe Premiere Pro 2020"
)

PP_FOUND=false
PP_VERSION=""
CSXS_VERSION=""

for PP_PATH in "${PP_PATHS[@]}"; do
    if [ -d "$PP_PATH" ]; then
        PP_FOUND=true
        PP_VERSION=$(basename "$PP_PATH")
        echo "✓ Found: $PP_VERSION"

        # Determine CSXS version
        case "$PP_VERSION" in
            *2024*|*2023*)
                CSXS_VERSION="12"
                ;;
            *2022*|*2021*)
                CSXS_VERSION="11"
                ;;
            *2020*)
                CSXS_VERSION="10"
                ;;
            *)
                CSXS_VERSION="9"
                ;;
        esac
        break
    fi
done

if [ "$PP_FOUND" = false ]; then
    echo "❌ Error: Premiere Pro not found in /Applications/"
    echo "Please install Premiere Pro first."
    exit 1
fi

echo "Using CSXS Version: $CSXS_VERSION"
echo ""

# Step 2: Enable CEP Debug Mode
echo "Step 2: Enabling CEP Debug Mode..."
defaults write com.adobe.CSXS.$CSXS_VERSION PlayerDebugMode 1

# Verify it was set
DEBUG_MODE=$(defaults read com.adobe.CSXS.$CSXS_VERSION PlayerDebugMode 2>/dev/null)
if [ "$DEBUG_MODE" = "1" ]; then
    echo "✓ CEP Debug Mode enabled"
else
    echo "❌ Warning: Could not verify debug mode setting"
fi
echo ""

# Step 3: Deploy panels
echo "Step 3: Deploying CEP panels..."
./deploy-navigation.sh
echo ""
./deploy-metadata.sh
echo ""

# Step 4: Final instructions
echo "==================================="
echo "✓ Installation Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. 🔴 RESTART Premiere Pro (required!)"
echo "2. Open a project"
echo "3. Go to: Window → Extensions"
echo "4. Open both panels:"
echo "   - EAV Ingest Assistant - Navigation"
echo "   - EAV Ingest Assistant - Metadata"
echo ""
echo "Troubleshooting:"
echo "- If panels don't appear: Check CSXS version is correct for your PP"
echo "- If panels appear but don't open: Restart PP again"
echo "- Still issues? Check logs at:"
echo "  ~/Library/Logs/CSXS/CEPHtmlEngine*"
echo ""
