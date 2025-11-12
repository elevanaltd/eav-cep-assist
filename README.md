# EAV Ingest Assistant - CEP Panel

Adobe CEP extension for Premiere Pro that streamlines video/image ingestion and metadata tagging workflow with seamless integration to the Ingest Assistant desktop application.

## Overview

Two-panel CEP system that integrates directly into Premiere Pro, allowing editors to browse clips and apply structured metadata while viewing them in PP's native Source Monitor. Reads XMP metadata written by Ingest Assistant for seamless workflow integration.

## System Architecture

### **Two-Panel Design**

1. **Navigation Panel** (Bottom) - Clip browser with search/filter
   - Displays all project clips with thumbnails
   - Search and filter capabilities
   - Click to select and open in Source Monitor
   - Dispatches selection events to Metadata Panel

2. **Metadata Panel** (Right) - Metadata form editor
   - Auto-loads selected clip metadata
   - Structured fields (Location, Subject, Action, Shot Type)
   - Description field for searchable tags
   - Reads from and writes to XMP metadata
   - Previous/Next navigation

### **Communication Flow**
```
Navigation Panel → CEP Event → Metadata Panel → ExtendScript → XMP
```

## Features

### ✅ Current Features

**Navigation Panel:**
- Clip browser with all project clips
- Search and filter functionality
- Click to select and open in Source Monitor
- Visual indicators for processed clips
- Debug diagnostics panel

**Metadata Panel:**
- Auto-load from XMP metadata (Ingest Assistant compatibility)
- Structured naming fields: Location, Subject, Action, Shot Type
- Description field for metadata tags
- Live name preview (shows generated filename)
- Updates Premiere Pro clip name
- Writes to XMP metadata (`xmpDM:shotName`, `xmpDM:logComment`, `dc:description`)
- Previous/Next navigation through clips
- Debug diagnostics panel

**XMP Integration:**
- Reads `xmpDM:logComment` for structured components
- Reads `dc:description` for metadata tags
- Writes all fields back to XMP on save
- Compatible with Ingest Assistant XMP format

### 🔮 Planned Features

See [GitHub Issues](https://github.com/elevanaltd/eav-cep-assist/issues) for roadmap:

- [#12](https://github.com/elevanaltd/eav-cep-assist/issues/12) **AI Analysis Investigation** - Evaluate AI integration options
- [#13](https://github.com/elevanaltd/eav-cep-assist/issues/13) **Auto-Apply XMP Metadata** - Automatic metadata application on import
- **Batch operations** - Process multiple clips at once
- **Lexicon support** - Custom vocabularies per project

## Installation

### Prerequisites

- Adobe Premiere Pro (2020 or later)
- macOS or Windows

### Step 1: Enable CEP Debug Mode

**macOS:**

```bash
defaults write com.adobe.CSXS.9 PlayerDebugMode 1
```

**Windows:**

Create registry key:

```
HKEY_CURRENT_USER/Software/Adobe/CSXS.9
PlayerDebugMode = "1" (String)
```

**Note:** Change `CSXS.9` to match your Premiere Pro version:
- CSXS.9 = CC 2019-2020
- CSXS.10 = CC 2021
- CSXS.11 = CC 2022+

### Step 2: Clone the Repository

```bash
git clone https://github.com/elevanaltd/eav-cep-assist.git
cd eav-cep-assist
```

### Step 3: Deploy Both Panels

**macOS:**

```bash
./deploy-navigation.sh && ./deploy-metadata.sh
```

**Windows:**

```cmd
deploy-navigation.bat && deploy-metadata.bat
```

This copies the panels to:
- **Navigation:** `~/Library/Application Support/Adobe/CEP/extensions/eav-navigation-panel/`
- **Metadata:** `~/Library/Application Support/Adobe/CEP/extensions/eav-metadata-panel/`

### Step 4: Restart Premiere Pro

### Step 5: Open Both Panels

In Premiere Pro:

1. Go to **Window** → **Extensions**
2. Click **EAV Ingest Assistant - Navigation** (position at bottom)
3. Click **EAV Ingest Assistant - Metadata** (position on right side)

## Usage

### Workflow: Ingest Assistant → Premiere Pro

**Recommended workflow for files processed in Ingest Assistant:**

1. Process files in Ingest Assistant (writes XMP metadata)
2. Import files to Premiere Pro
3. Open Navigation Panel → Browse clips
4. Click a clip → Opens in Source Monitor + loads in Metadata Panel
5. **Metadata auto-populates from XMP** (location, subject, action, shotType, description)
6. Review/edit if needed
7. Click **"Apply to Premiere"** → Updates PP clip name + writes back to XMP
8. Use Previous/Next to process remaining clips

### Workflow: Direct in Premiere Pro

**For files without existing XMP metadata:**

1. Select clip in Navigation Panel
2. Fill in metadata fields:
   - **Identifier** - Auto-extracted from filename
   - **Location** - Where the shot takes place (e.g., "kitchen", "bathroom")
   - **Subject** - Main subject/object (e.g., "oven", "sink")
   - **Action** - Action being performed (videos only, e.g., "cleaning", "installing")
   - **Shot Type** - Shot classification (WS, MID, CU, UNDER, FP, TRACK, ESTAB)
   - **Description** - Comma-separated metadata tags (e.g., "stainless-steel, gas-range")
3. **Preview generated name** in the preview area
4. Click **"Apply to Premiere"** to update PP metadata and write XMP
5. Use Previous/Next to move through clips

### Structured Naming Format

**Videos:**

```
{location}-{subject}-{action}-{shotType}
```

Example: `kitchen-oven-cleaning-CU`

**Images:**

```
{location}-{subject}-{shotType}
```

Example: `bathroom-sink-WS`

### XMP Metadata Fields

The panel reads and writes the following XMP fields:

- **`xmpDM:shotName`** - Combined structured name (maps to PP Shot field)
- **`xmpDM:logComment`** - Structured components (`location=X, subject=Y, action=Z, shotType=W`)
- **`dc:description`** - Metadata tags for searchability
- **`dc:identifier`** - Original filename/identifier

These fields are compatible with the Ingest Assistant desktop application.

## Debugging

Both panels include debug diagnostics at the bottom:

- **JavaScript console messages** - CEP panel operations
- **ExtendScript debug** - XMP read/write operations, Premiere Pro interactions

**To view ExtendScript debug output:**
1. Click "Apply to Premiere"
2. Scroll diagnostics panel to see `[ExtendScript Debug]` section
3. Check for "successfully replaced" or "ERROR" messages

## Troubleshooting

### Panels Don't Appear in Window → Extensions

1. Verify CEP Debug Mode is enabled (Step 1)
2. Check deployment paths exist:
   ```bash
   ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/
   ```
3. Restart Premiere Pro completely (Cmd+Q, not just close window)

### Metadata Not Loading from XMP

1. Check file was processed by Ingest Assistant
2. Verify XMP fields exist:
   ```bash
   exiftool -XMP-xmpDM:all -G1 your-file.mov
   ```
3. Check ExtendScript debug output for errors

### Fields Not Updating After "Apply to Premiere"

1. Check ExtendScript debug output shows "successfully replaced"
2. Verify PP metadata panel shows updated Shot Name
3. Try clicking the clip again to reload metadata

## Development

### Project Structure

```
eav-cep-assist/
├── CSXS/
│   ├── manifest-navigation.xml  # Navigation panel config
│   └── manifest-metadata.xml    # Metadata panel config
├── js/
│   ├── navigation-panel.js      # Navigation panel logic
│   ├── metadata-panel.js        # Metadata panel logic
│   └── CSInterface.js           # Adobe CEP API
├── jsx/
│   └── host.jsx                 # ExtendScript (PP integration)
├── css/
│   ├── navigation-panel.css
│   └── metadata-panel.css
├── index-navigation.html        # Navigation panel UI
├── index-metadata.html          # Metadata panel UI
├── deploy-navigation.sh         # Navigation deployment script
└── deploy-metadata.sh           # Metadata deployment script
```

### Key Files

- **`jsx/host.jsx`** - ExtendScript layer (lines 173-559: XMP read/write)
- **`js/metadata-panel.js`** - Metadata form logic and CEP event handling
- **`js/navigation-panel.js`** - Clip browser and selection dispatching

### Making Changes

After editing files, redeploy:

```bash
./deploy-navigation.sh && ./deploy-metadata.sh
# Restart Premiere Pro
```

## Related Projects

- **[Ingest Assistant](https://github.com/elevanaltd/ingest-assistant)** - Desktop app for AI-powered metadata generation (Issue #54: XMP alignment)

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Operational guide for AI assistance
- **[ARCHITECTURE-PATTERNS.md](./ARCHITECTURE-PATTERNS.md)** - Technical architecture documentation

---

**Version:** 1.0.1

**Last Updated:** 2025-11-12

**Author:** Elevana Development Team

**License:** Proprietary
