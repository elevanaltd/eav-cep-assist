# Finding the ExtendScript Console in Premiere Pro

**Purpose:** Locate and enable the ExtendScript Console for debugging and POC execution

**Critical:** Without console access, we cannot run POC validation or debug ExtendScript issues

---

## Method 1: Standard Menu Location (Try First)

### **Premiere Pro CC 2019 and Later:**

1. **Open Premiere Pro**
2. **Top Menu → Window → Extensions Console**
   - OR **Top Menu → Window → Console**
   - OR **Top Menu → Help → Console**

**Keyboard Shortcut:**
- **macOS:** `Cmd + F12`
- **Windows:** `Ctrl + F12`

**What to Look For:**
- Window titled "Console" or "ExtendScript Toolkit Console"
- Blank text area (or previous log messages)
- Should show `[timestamp]` entries when scripts run

---

## Method 2: Enable Debug Mode (If Console Not Visible)

### **macOS Instructions:**

1. **Quit Premiere Pro completely** (Cmd+Q)

2. **Open Terminal** (Applications → Utilities → Terminal)

3. **Enable debug mode:**
   ```bash
   defaults write com.adobe.Premiere\ Pro.14.0 PlayerDebugMode -int 1
   ```

   **Note:** Replace `14.0` with your Premiere version:
   - Premiere Pro 2024: `com.adobe.Premiere Pro.24.0`
   - Premiere Pro 2023: `com.adobe.Premiere Pro.23.0`
   - Premiere Pro 2022: `com.adobe.Premiere Pro.22.0`
   - Premiere Pro 2021: `com.adobe.Premiere Pro.15.0`
   - Premiere Pro 2020: `com.adobe.Premiere Pro.14.0`

   **Find your version:**
   ```bash
   defaults domains | grep "Premiere Pro"
   ```

4. **Relaunch Premiere Pro**

5. **Try console access again:**
   - Menu: Window → Console
   - Keyboard: Cmd+F12

### **Windows Instructions:**

1. **Close Premiere Pro completely**

2. **Open Registry Editor:**
   - Press `Win + R`
   - Type `regedit`
   - Click OK

3. **Navigate to:**
   ```
   HKEY_CURRENT_USER\Software\Adobe\Premiere Pro\14.0
   ```
   (Replace `14.0` with your version number)

4. **Create new DWORD:**
   - Right-click → New → DWORD (32-bit) Value
   - Name: `PlayerDebugMode`
   - Value: `1`

5. **Restart Premiere Pro**

6. **Check for console** (Window → Console or Ctrl+F12)

---

## Method 3: Check Your Premiere Pro Version

**Menu:** Premiere Pro → About Premiere Pro

**Look for version number:**
- Example: "Premiere Pro 2024 (version 24.1.0)"

**Console Availability by Version:**

| Version | Console Location | Notes |
|---------|-----------------|-------|
| **CC 2024** | Window → Console | ✅ Available |
| **CC 2023** | Window → Console | ✅ Available |
| **CC 2022** | Window → Console | ✅ Available |
| **CC 2021** | Window → Console | ✅ Available |
| **CC 2020** | Help → Console | ✅ Available (different menu) |
| **CC 2019** | Help → Console | ⚠️ May require debug mode |
| **CC 2018 or earlier** | ExtendScript Toolkit (separate app) | ⚠️ External tool required |

---

## Method 4: Alternative - ExtendScript Toolkit (Legacy)

**If Premiere Pro doesn't have built-in console:**

### **macOS:**
1. **Open ExtendScript Toolkit** (Applications → Adobe ExtendScript Toolkit CC)
2. **Target Premiere Pro:**
   - Top-left dropdown → Select "Adobe Premiere Pro"
3. **Paste script** into editor window
4. **Run:** Press F5 or play button
5. **Console output** shows in bottom panel

### **Windows:**
1. **Start Menu → Adobe ExtendScript Toolkit CC**
2. **Select target:** Adobe Premiere Pro (dropdown)
3. **Paste and run script** (F5)

**Note:** ExtendScript Toolkit is deprecated but still works for older Premiere versions.

---

## Method 5: Log to File (Console Alternative)

If you **cannot find console**, we can modify POC script to write to a file instead:

### **Quick File Logger Test:**

1. **Create this test script** (`test-console-alternative.jsx`):

```javascript
// Test: Write to file instead of console
var logFile = new File("~/Desktop/premiere-poc-log.txt");
logFile.open("w");
logFile.writeln("POC Test Log - " + new Date());
logFile.writeln("Premiere Pro Version: " + app.version);
logFile.writeln("Project Name: " + (app.project ? app.project.name : "No project"));
logFile.close();

alert("Log written to Desktop/premiere-poc-log.txt");
```

2. **Run in Premiere:** File → Scripts → Run Script → Select file

3. **Check Desktop** for `premiere-poc-log.txt`

4. **If this works**, I'll modify POC to use file logging instead of console

---

## Quick Diagnostic Test

**Once you think you've found the console, run this test:**

### **Test Script** (`test-console-simple.jsx`):

```javascript
// Simple console test
$.writeln("========================================");
$.writeln("Console Test - " + new Date());
$.writeln("========================================");
$.writeln("If you see this, console is working!");
$.writeln("Premiere Pro version: " + app.version);
$.writeln("Active project: " + (app.project ? app.project.name : "None"));
$.writeln("========================================");

alert("Check console for test output");
```

**How to Run:**
1. Copy script to file: `test-console-simple.jsx`
2. Premiere Pro → File → Scripts → Run Script
3. Select the test file
4. Alert appears → Click OK
5. **Check console window** for output

**Expected Output:**
```
========================================
Console Test - Thu Nov 14 2024 ...
========================================
If you see this, console is working!
Premiere Pro version: 24.1.0
Active project: My Project
========================================
```

---

## Troubleshooting

### "Window → Console menu doesn't exist"

**Causes:**
- Older Premiere version (pre-2020)
- Debug mode not enabled
- Menu customization hiding it

**Fixes:**
1. Try keyboard shortcut (Cmd+F12 / Ctrl+F12)
2. Enable debug mode (Method 2)
3. Check version (Method 3)
4. Use ExtendScript Toolkit (Method 4)
5. Use file logging (Method 5)

### "Console shows but script output doesn't appear"

**Causes:**
- Script error (silent fail)
- Output not using `$.writeln()`
- Console cleared between runs

**Fixes:**
1. Add `alert("Script started")` to verify script runs
2. Use `$.writeln()` instead of `alert()` for logging
3. Check for errors in script

### "Help menu doesn't have Console option"

**This is normal for newer versions.**

Try:
- Window → Console (newer location)
- Window → Extensions Console
- Cmd/Ctrl + F12

### "I have Premiere Pro 2018 or earlier"

**ExtendScript Toolkit required** (separate application)

Alternatives:
- Upgrade Premiere Pro (if possible)
- Use file logging method (Method 5)
- I can create modified POC that uses alerts instead of console

---

## What to Report Back

**Once you locate console (or alternative), tell me:**

1. **How you accessed it:**
   - Menu path you used
   - OR "Using ExtendScript Toolkit"
   - OR "Cannot find console, using file logging"

2. **Premiere Pro version:**
   - Example: "Premiere Pro 2024 (24.1.0)"

3. **Test script result:**
   - Did console show output from test script?
   - OR Did file logging work?

4. **Screenshot (optional but helpful):**
   - Console window showing test output

---

## Next Steps

### **If Console Found:**
✅ Proceed to run POC (`POC-XMP-OFFLINE-ACCESS.jsx`)
✅ Follow `POC-INSTRUCTIONS.md`

### **If Console NOT Found:**
🔄 I'll modify POC to use:
- File logging to Desktop
- Alert dialogs for critical results
- Fallback diagnostics that don't need console

### **If ExtendScript Toolkit:**
🔄 I'll provide ExtendScript Toolkit version of POC
🔄 Same tests, different execution environment

---

**Let me know which method works for you, and I'll adapt the POC accordingly.**

---

**LAST UPDATED:** 2025-11-14
**PURPOSE:** Unblock POC execution by finding console access
**PRIORITY:** BLOCKING (cannot proceed without logging capability)
