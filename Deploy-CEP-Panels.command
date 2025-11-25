#!/bin/bash
# Deploy CEP Panels - Double-click to deploy both Navigation and Metadata panels
# Location: /Volumes/HestAI-Projects/eav-cep-assist/Deploy-CEP-Panels.command

cd "$(dirname "$0")"

echo "=========================================="
echo "  CEP Panel Deployment"
echo "=========================================="
echo ""
echo "Deploying Navigation Panel..."
./deploy-navigation.sh

echo ""
echo "Deploying Metadata Panel..."
./deploy-metadata.sh

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Quit Premiere Pro (Cmd+Q)"
echo "  2. Reopen Premiere Pro"
echo "  3. Window > Extensions > EAV Ingest Assistant"
echo ""
echo "Press any key to close this window..."
read -n 1
