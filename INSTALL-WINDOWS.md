# Windows Installation Guide

## Prerequisites

- Adobe Premiere Pro (2020 or later)
- Git (optional, for cloning)

---

## Step 1: Enable CEP Debug Mode

**This is REQUIRED for CEP extensions to work!**

### Determine Your CSXS Version:

| Premiere Pro Version | CSXS Version |
|---------------------|--------------|
| 2018-2019 | 9 |
| 2020 | 10 |
| 2021-2022 | 11 |
| 2023+ | 12 |

### Enable Debug Mode:

1. Press **Win+R** to open Run dialog
2. Type `regedit` and press Enter
3. Navigate to: `HKEY_CURRENT_USER\Software\Adobe\CSXS.XX` (replace XX with your version)
   - If the key doesn't exist, create it: Right-click → New → Key
4. Create a new **String Value**:
   - Right-click in the right pane → New → String Value
   - Name: `PlayerDebugMode`
   - Value: `1`

**Example for Premiere Pro 2023:**
```
HKEY_CURRENT_USER\Software\Adobe\CSXS.12
PlayerDebugMode = "1" (String)
```

---

## Step 2: Deploy Extensions

### Option A: Using Git

```powershell
cd %USERPROFILE%\Desktop
git clone https://github.com/elevanaltd/eav-cep-assist.git
cd eav-cep-assist
```

### Option B: Download Zip

1. Download: https://github.com/elevanaltd/eav-cep-assist/archive/refs/heads/main.zip
2. Extract to Desktop
3. Open folder in File Explorer

### Deploy the Panels:

**Navigation Panel:**
```powershell
# Create target directories
mkdir "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\CSXS"
mkdir "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\js"
mkdir "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\css"
mkdir "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\jsx"

# Copy files
copy index-navigation.html "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\"
copy CSXS\manifest-navigation.xml "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\CSXS\manifest.xml"
copy js\navigation-panel.js "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\js\"
copy js\CSInterface.js "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\js\"
copy css\navigation-panel.css "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\css\"
copy jsx\host.jsx "%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\jsx\"
```

**Metadata Panel:**
```powershell
# Create target directories
mkdir "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\CSXS"
mkdir "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\js"
mkdir "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\css"
mkdir "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\jsx"

# Copy files
copy index-metadata.html "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\index-metadata.html"
copy CSXS\manifest-metadata.xml "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\CSXS\manifest.xml"
copy js\metadata-panel.js "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\js\"
copy js\CSInterface.js "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\js\"
copy css\metadata-panel.css "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\css\"
copy jsx\host.jsx "%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\jsx\"
```

---

## Step 3: Restart Premiere Pro

**Important:** You MUST restart Premiere Pro after enabling debug mode and deploying extensions.

---

## Step 4: Open the Panels

1. In Premiere Pro, go to: **Window → Extensions**
2. You should see:
   - **EAV Ingest Assistant - Navigation**
   - **EAV Ingest Assistant - Metadata**
3. Click both to open them

**Recommended Layout:**
- Navigation panel: Bottom (horizontal strip with clips)
- Metadata panel: Right side (vertical form)

---

## Troubleshooting

### Panels don't appear in Window → Extensions

**Cause:** Debug mode not enabled or wrong CSXS version

**Fix:**
1. Double-check registry key exists at correct CSXS version
2. Verify `PlayerDebugMode = "1"` (String, not DWORD)
3. Restart Premiere Pro

### Panels appear but don't open (no checkmark)

**Cause:** Files not deployed correctly or PP needs another restart

**Fix:**
1. Check files exist at:
   - `%APPDATA%\Adobe\CEP\extensions\eav-navigation-panel\`
   - `%APPDATA%\Adobe\CEP\extensions\eav-metadata-panel\`
2. Verify `manifest.xml` exists in each `CSXS\` folder
3. Restart Premiere Pro again
4. Check logs at: `%APPDATA%\Adobe\CEP\logs\`

### Panels open but show blank/error

**Cause:** Missing JavaScript or CSS files

**Fix:**
1. Verify all files copied correctly (see Step 2)
2. Open Chrome DevTools: Right-click panel → Inspect
3. Check Console tab for errors

---

## Need Help?

Report issues: https://github.com/elevanaltd/eav-cep-assist/issues
