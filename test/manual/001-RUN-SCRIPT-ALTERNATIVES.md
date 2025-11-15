# Running ExtendScript Files in Premiere Pro - Alternative Methods

**Problem:** File → Scripts → Run Script menu option doesn't exist

**Solution:** Multiple alternative methods to execute .jsx files

---

## METHOD 1: Run via Console Command (EASIEST)

**You already have the console open (Cmd+F12)!** Use this method:

### **Step-by-Step:**

1. **Console is already open** (from Cmd+F12)

2. **Type this command** in the console:
   ```
   es.processFile /Volumes/HestAI-Projects/eav-cep-assist/test/manual/test-console-simple.jsx
   ```

3. **Press Enter**

4. **Look for output** in console window:
   ```
   ========================================
   CONSOLE TEST - ...
   ========================================
   ```

**Important:**
- Use the FULL absolute path (starts with `/Volumes/...`)
- No quotes needed around the path
- If path has spaces, you might need quotes: `es.processFile "/path/with spaces/file.jsx"`

---

## METHOD 2: Check Different Menu Locations

**The Scripts menu moved in different Premiere versions:**

### **Try these locations:**

**Option A: File Menu**
- File → Automate → Run Script
- File → Scripts → Run Script

**Option B: Window Menu**
- Window → Extensions → Scripts

**Option C: Tools Menu (some versions)**
- Tools → Scripts

**Option D: Right-click in Project Panel**
- Right-click in Project Panel → Scripts

---

## METHOD 3: Place Script in Scripts Folder (Auto-Load)

**Premiere auto-loads scripts from specific folders:**

### **macOS Script Locations:**

**User Scripts Folder:**
```
~/Library/Application Support/Adobe/Premiere Pro/[version]/Scripts/
```

**System Scripts Folder:**
```
/Library/Application Support/Adobe/Premiere Pro/[version]/Scripts/
```

**How to use:**

1. **Find your Premiere version:**
   - Example: `24.0` for Premiere Pro 2024

2. **Navigate to Scripts folder:**
   ```bash
   # In Finder, press Cmd+Shift+G (Go to Folder)
   # Paste this path (replace [version]):
   ~/Library/Application Support/Adobe/Premiere Pro/24.0/Scripts/
   ```

3. **Copy test script to this folder:**
   - Copy: `test-console-simple.jsx`
   - To: `~/Library/Application Support/Adobe/Premiere Pro/24.0/Scripts/`

4. **Restart Premiere Pro**

5. **Check menu:**
   - File → Scripts → (your script name should appear)
   - OR Window → Extensions → Scripts → (your script name)

---

## METHOD 4: What's Your Premiere Pro Version?

**Let's identify your version to find correct method:**

1. **Menu: Premiere Pro → About Premiere Pro**

2. **Look for version number:**
   - Example: "Premiere Pro 2024 (version 24.1.0)"

3. **Tell me your version**, and I'll provide exact instructions

**Common versions and script access:**

| Version | Script Location | Method |
|---------|----------------|--------|
| **2024** | Console: `es.processFile` | METHOD 1 |
| **2023** | Console: `es.processFile` | METHOD 1 |
| **2022** | File → Scripts → Run Script | Different menu |
| **2021** | File → Scripts → Run Script | Different menu |
| **2020** | Scripts folder auto-load | METHOD 3 |

---

## METHOD 5: Use Console to Run Script Content Directly

**If file path doesn't work, paste script content directly:**

### **Step-by-Step:**

1. **Open the test script file** in a text editor:
   - File: `test-console-simple.jsx`
   - Open with: TextEdit, VS Code, or any text editor

2. **Copy the ENTIRE script content** (all lines)

3. **In Premiere console**, type:
   ```
   es.process
   ```
   (then press Enter)

4. **Paste the script content**

5. **Press Enter again**

**This runs the script inline without needing file path**

---

## METHOD 6: ExtendScript Toolkit (If Installed)

**Older Premiere versions came with ExtendScript Toolkit:**

1. **Check Applications folder:**
   - `/Applications/Adobe ExtendScript Toolkit CC/`
   - OR search Spotlight: "ExtendScript Toolkit"

2. **If found, open it**

3. **Target Premiere Pro:**
   - Top-left dropdown → Select "Adobe Premiere Pro"

4. **Open test script:**
   - File → Open → Select `test-console-simple.jsx`

5. **Run:**
   - Press **F5** or click **Play button**
   - Output appears in bottom panel

---

## RECOMMENDED: Try Console Command First

**Since you already have console open, try this NOW:**

### **Copy/paste this into console:**

```
es.processFile /Volumes/HestAI-Projects/eav-cep-assist/test/manual/test-console-simple.jsx
```

**Press Enter**

**Expected result:**
```
========================================
CONSOLE TEST - Thu Nov 14 2024 ...
========================================

If you see this, console is working!
...
```

**If you get an error like "file not found":**
- Check the file path is correct
- Try METHOD 5 (paste script content directly)

---

## Quick Test: Inline Console Command

**Want to test console immediately? Type this:**

```
es.process $.writeln("Console test: " + new Date());
```

**Press Enter**

**You should see:**
```
Console test: Thu Nov 14 2024 15:45:00 GMT-0800
```

**If this works:** Console is functional, we can run scripts via console commands

---

## What to Report Back

**After trying METHOD 1 (console command), tell me:**

1. **Did it work?**
   - "Yes, I see console output" ✓
   - "No, got error: [paste error message]" ✗
   - "Nothing happened" ⚠️

2. **What's your Premiere Pro version?**
   - Premiere Pro → About Premiere Pro
   - Example: "2024 (24.1.0)"

3. **Did the inline test work?**
   - `es.process $.writeln("Console test: " + new Date());`
   - Yes/No

---

**Try the console command method now (METHOD 1) and let me know the result!**
