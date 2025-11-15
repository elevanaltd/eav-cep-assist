/**
 * File Logger Test
 *
 * Purpose: Test file logging as alternative to console
 *
 * If ExtendScript console is not available, we can write logs to a file instead.
 * This test verifies file logging works before running POC.
 *
 * How to run:
 * 1. Premiere Pro → File → Scripts → Run Script
 * 2. Select this file
 * 3. Alert appears → Click OK
 * 4. Check Desktop for "premiere-test-log.txt"
 */

// Create log file on Desktop
var logFile = new File("~/Desktop/premiere-test-log.txt");

// Open file for writing
if (!logFile.open("w")) {
    alert("ERROR: Cannot create log file on Desktop\n\nTry running Premiere Pro with admin privileges.");
} else {
    // Write test content
    logFile.writeln("========================================");
    logFile.writeln("FILE LOGGER TEST - " + new Date().toString());
    logFile.writeln("========================================");
    logFile.writeln("");
    logFile.writeln("If you can read this, file logging works!");
    logFile.writeln("");
    logFile.writeln("System Info:");
    logFile.writeln("  Premiere Pro version: " + app.version);
    logFile.writeln("  Operating System: " + $.os);
    logFile.writeln("  Active project: " + (app.project ? app.project.name : "(No project open)"));
    logFile.writeln("");
    logFile.writeln("File location: " + logFile.fsName);
    logFile.writeln("");
    logFile.writeln("========================================");
    logFile.writeln("File logger test COMPLETE");
    logFile.writeln("========================================");

    // Close file
    logFile.close();

    // Show success message
    alert("File logger test complete!\n\nLog written to:\n" + logFile.fsName + "\n\nOpen this file to see test output.");

    // Try to open file in default text editor
    logFile.execute();
}
