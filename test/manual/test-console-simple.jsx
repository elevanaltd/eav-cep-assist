/**
 * Simple Console Test
 *
 * Purpose: Verify ExtendScript console is working before running POC
 *
 * How to run:
 * 1. Premiere Pro → File → Scripts → Run Script
 * 2. Select this file
 * 3. Alert appears → Click OK
 * 4. Check console for output (Window → Console or Cmd+F12)
 */

$.writeln("========================================");
$.writeln("CONSOLE TEST - " + new Date().toString());
$.writeln("========================================");
$.writeln("");
$.writeln("If you see this, console is working!");
$.writeln("");
$.writeln("System Info:");
$.writeln("  Premiere Pro version: " + app.version);
$.writeln("  Operating System: " + $.os);
$.writeln("  Active project: " + (app.project ? app.project.name : "(No project open)"));
$.writeln("");
$.writeln("========================================");
$.writeln("Console test COMPLETE");
$.writeln("========================================");

// Alert so user knows script finished
alert("Console test complete!\n\nCheck console window for output.\n\nLocation: Window → Console (or Cmd+F12)");
