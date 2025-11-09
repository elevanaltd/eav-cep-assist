# EAV Ingest Assistant - CEP Panel

Adobe CEP panel for Premiere Pro that streamlines video/image ingestion and metadata tagging workflow.

## Overview

This CEP panel integrates directly into Premiere Pro, allowing editors to tag clips with structured metadata while viewing them in PP's native Source Monitor. No custom video player needed - just a clean form interface that works with PP's existing tools.

## Features

### Phase 1 (Current)

- ✅ **Selection-aware UI** - Automatically loads selected clip from Project Panel
- ✅ **Structured naming** - ID, Location, Subject, Action, Shot Type
- ✅ **Live name preview** - See generated filename before applying
- ✅ **PP metadata fields** - Updates Name, Tape Name, Description, Shot
- ✅ **Previous/Next navigation** - Cycle through project clips
- ✅ **Source Monitor integration** - Open clips directly in PP's viewer
- ✅ **Horizontal strip layout** - Compact, efficient form design

### Phase 2 (Planned)

- 🔲 **AI analysis integration** - Auto-suggest metadata using computer vision
- 🔲 **Frame extraction** - Analyze video frames for intelligent tagging
- 🔲 **Lexicon support** - Custom vocabularies per project
- 🔲 **Batch operations** - Process multiple clips at once

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

### Step 2: Install the Extension

**macOS:**

```bash
cp -r eav-cep-assist ~/Library/Application\ Support/Adobe/CEP/extensions/
```

**Windows:**

```
Copy folder to: C:\Users\[Username]\AppData\Roaming\Adobe\CEP\extensions\
```

### Step 3: Restart Premiere Pro

### Step 4: Open the Panel

In Premiere Pro:

1. Go to **Window** → **Extensions**
2. Click **EAV Ingest Assistant**

## Usage

### Basic Workflow

1. **Select a clip** in the Project Panel
2. Panel automatically loads clip info
3. **Fill in metadata fields:**
   - **ID** - Auto-extracted from filename (8 digits)
   - **Location** - Where the shot takes place
   - **Subject** - Main subject/object
   - **Action** - Action being performed (videos only)
   - **Shot Type** - Shot classification (WS, MID, CU, etc.)
   - **Metadata Tags** - Comma-separated descriptors
4. **Preview generated name** in the preview area
5. Click **"Open in Source Monitor"** to review the clip (optional)
6. Click **"Apply to Premiere"** to update PP metadata
7. Use **Previous/Next** to move through clips

### Structured Naming Format

**Videos:**

```
{id}-{location}-{subject}-{action}-{shotType}
```

Example: `12345678-kitchen-oven-cleaning-CU`

**Images:**

```
{id}-{location}-{subject}-{shotType}
```

Example: `12345678-bathroom-sink-WS`

---

**Version:** 1.0.0

**Last Updated:** 2025-11-09

**Author:** Elevana Development Team
