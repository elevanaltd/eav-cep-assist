/**
 * POC: XMP-First Architecture Validation (AUTO-RUN VERSION)
 *
 * SETUP (One-time):
 * 1. Copy this file to: ~/Library/Application Support/Adobe/Premiere Pro/[version]/Scripts/Startup/
 * 2. Restart Premiere Pro
 * 3. Script auto-runs on startup
 * 4. Check Desktop for: POC-Results.txt
 *
 * OR MANUAL RUN:
 * - Open this file in ExtendScript Toolkit
 * - Target: Adobe Premiere Pro (top-left dropdown)
 * - Press F5 to run
 * - Check Desktop for: POC-Results.txt
 */

// ============================================================================
// FILE LOGGER SETUP
// ============================================================================

var LOG_FILE_PATH = "~/Desktop/POC-Results.txt";
var logFile = new File(LOG_FILE_PATH);

function initLog() {
    logFile.open("w");
    logFile.encoding = "UTF-8";
}

function log(message) {
    if (logFile.isOpen) {
        logFile.writeln(message);
    }
}

function logError(message, error) {
    log("[ERROR] " + message);
    if (error) {
        log("  Error: " + error.toString());
    }
}

function logSuccess(message) {
    log("[SUCCESS] " + message);
}

function logSection(title) {
    log("");
    log("========================================");
    log("  " + title);
    log("========================================");
}

function closeLog() {
    if (logFile.isOpen) {
        logFile.close();
    }
}

// ============================================================================
// POC CONFIGURATION
// ============================================================================

var TEST_CONFIG = {
    customNamespace: {
        uri: "http://eav.com/ns/cep/1.0/",
        prefix: "eav"
    },
    testFields: {
        location: "test-kitchen",
        subject: "test-oven",
        action: "test-opening",
        shotType: "test-CU"
    }
};

// ============================================================================
// TEST 1: AdobeXMPScript Initialization
// ============================================================================

function test1_InitializeXMPScript() {
    logSection("TEST 1: AdobeXMPScript Initialization");

    try {
        log("Loading AdobeXMPScript library...");

        if (ExternalObject.AdobeXMPScript === undefined) {
            ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
        }

        if (!ExternalObject.AdobeXMPScript) {
            logError("FAILED: Cannot load AdobeXMPScript");
            return false;
        }

        logSuccess("AdobeXMPScript loaded");

        // Test XMPMeta constructor
        log("Testing XMPMeta constructor...");
        var testXmp = new XMPMeta();

        if (!testXmp) {
            logError("FAILED: XMPMeta constructor failed");
            return false;
        }

        logSuccess("XMPMeta constructor works");

        // Register custom namespace
        log("Registering custom namespace: " + TEST_CONFIG.customNamespace.uri);
        try {
            XMPMeta.registerNamespace(
                TEST_CONFIG.customNamespace.uri,
                TEST_CONFIG.customNamespace.prefix
            );
            logSuccess("Custom namespace registered");
        } catch (e) {
            log("Namespace may already be registered: " + e.toString());
        }

        logSuccess("TEST 1 PASSED");
        return true;

    } catch (e) {
        logError("TEST 1 FAILED", e);
        return false;
    }
}

// ============================================================================
// TEST 2: ProjectItem Metadata Access
// ============================================================================

function test2_ProjectItemMetadataAccess() {
    logSection("TEST 2: ProjectItem Metadata Access");

    try {
        var project = app.project;
        if (!project) {
            logError("FAILED: No active project - please open a project with clips");
            return false;
        }

        log("Finding test clip...");

        function findFirstClip(item) {
            if (item.type === 1) { // CLIP
                return item;
            }
            if (item.children && item.children.numItems > 0) {
                for (var i = 0; i < item.children.numItems; i++) {
                    var found = findFirstClip(item.children[i]);
                    if (found) return found;
                }
            }
            return null;
        }

        var testItem = findFirstClip(project.rootItem);

        if (!testItem) {
            logError("FAILED: No clips found - please import clips to project");
            return false;
        }

        log("Found test clip: " + testItem.name);

        // Test getProjectMetadata
        log("Testing getProjectMetadata()...");
        var projectXmpStr = testItem.getProjectMetadata();

        if (typeof projectXmpStr === "undefined") {
            logError("FAILED: getProjectMetadata() returned undefined");
            log("  This API may not be available in your Premiere Pro version");
            log("  CRITICAL: XMP-First architecture NOT FEASIBLE");
            return false;
        }

        log("Project metadata accessible (length: " +
            (projectXmpStr ? projectXmpStr.length : 0) + " chars)");

        // Test XMP parsing
        var xmp = projectXmpStr && projectXmpStr.length > 0 ?
                  new XMPMeta(projectXmpStr) : new XMPMeta();

        // Test write
        log("Testing setProjectMetadata()...");
        var testNS = TEST_CONFIG.customNamespace.uri;
        var testValue = "poc-test-" + new Date().getTime();

        xmp.setProperty(testNS, "pocTest", testValue);
        testItem.setProjectMetadata(xmp.serialize());

        // Verify
        var verifyXmpStr = testItem.getProjectMetadata();
        var verifyXmp = new XMPMeta(verifyXmpStr);

        if (!verifyXmp.doesPropertyExist(testNS, "pocTest")) {
            logError("FAILED: Property not persisted");
            return false;
        }

        var readValue = verifyXmp.getProperty(testNS, "pocTest").toString();
        if (readValue !== testValue) {
            logError("FAILED: Value mismatch");
            return false;
        }

        logSuccess("TEST 2 PASSED: ProjectItem metadata read/write works");
        log("  Written: " + testValue);
        log("  Read:    " + readValue);

        return true;

    } catch (e) {
        logError("TEST 2 FAILED", e);
        return false;
    }
}

// ============================================================================
// TEST 3: Custom Namespace Fields
// ============================================================================

function test3_CustomNamespaceFields() {
    logSection("TEST 3: Custom Namespace Fields");

    try {
        var project = app.project;

        function findFirstClip(item) {
            if (item.type === 1) return item;
            if (item.children && item.children.numItems > 0) {
                for (var i = 0; i < item.children.numItems; i++) {
                    var found = findFirstClip(item.children[i]);
                    if (found) return found;
                }
            }
            return null;
        }

        var testItem = findFirstClip(project.rootItem);
        if (!testItem) {
            logError("No test clip found");
            return false;
        }

        log("Writing custom fields to: " + testItem.name);

        var xmpStr = testItem.getProjectMetadata();
        var xmp = xmpStr ? new XMPMeta(xmpStr) : new XMPMeta();
        var ns = TEST_CONFIG.customNamespace.uri;

        // Write test fields
        for (var fieldName in TEST_CONFIG.testFields) {
            var value = TEST_CONFIG.testFields[fieldName];
            log("  Writing: " + fieldName + " = " + value);
            xmp.setProperty(ns, fieldName, value);
        }

        testItem.setProjectMetadata(xmp.serialize());

        // Verify
        var verifyXmpStr = testItem.getProjectMetadata();
        var verifyXmp = new XMPMeta(verifyXmpStr);

        var allOk = true;
        for (var fieldName in TEST_CONFIG.testFields) {
            if (!verifyXmp.doesPropertyExist(ns, fieldName)) {
                logError("Field missing: " + fieldName);
                allOk = false;
            } else {
                var val = verifyXmp.getProperty(ns, fieldName).toString();
                log("  Verified: " + fieldName + " = " + val);
            }
        }

        if (allOk) {
            logSuccess("TEST 3 PASSED: All custom fields persisted");
        }

        return allOk;

    } catch (e) {
        logError("TEST 3 FAILED", e);
        return false;
    }
}

// ============================================================================
// SIMPLIFIED TESTS 4-6
// ============================================================================

function test4_OfflineNote() {
    logSection("TEST 4: Offline Persistence (Manual Test Required)");
    log("To test offline persistence:");
    log("1. Note the clip name from Test 3");
    log("2. Save and close project");
    log("3. Make media offline (disconnect drive or rename folder)");
    log("4. Reopen project");
    log("5. Run this POC again");
    log("6. Check if Test 3 fields still readable");
    log("");
    log("Expected: Custom fields should persist even when offline");
    return true;
}

function test5_PerformanceNote() {
    logSection("TEST 5: Performance (Simplified)");
    log("Performance test skipped in auto-run version");
    log("If needed, run full POC for detailed benchmarks");
    return true;
}

function test6_MediaXMPNote() {
    logSection("TEST 6: Media XMP (Bonus - Skipped)");
    log("Media XMP fallback test skipped in auto-run version");
    return true;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function runPOC() {
    initLog();

    logSection("POC: XMP-First Architecture Validation");
    log("Date: " + new Date().toString());
    log("Premiere Pro version: " + (app.version || "unknown"));
    log("");

    var results = {
        test1: false,
        test2: false,
        test3: false
    };

    results.test1 = test1_InitializeXMPScript();

    if (results.test1) {
        results.test2 = test2_ProjectItemMetadataAccess();
    }

    if (results.test2) {
        results.test3 = test3_CustomNamespaceFields();
    }

    test4_OfflineNote();
    test5_PerformanceNote();
    test6_MediaXMPNote();

    // Summary
    logSection("POC RESULTS SUMMARY");
    log("");
    log("Test 1 (XMPScript Init):     " + (results.test1 ? "PASS ✓" : "FAIL ✗"));
    log("Test 2 (ProjectItem Access): " + (results.test2 ? "PASS ✓" : "FAIL ✗"));
    log("Test 3 (Custom Namespace):   " + (results.test3 ? "PASS ✓" : "FAIL ✗"));
    log("");

    var critical = results.test1 && results.test2 && results.test3;

    if (critical) {
        logSuccess("CRITICAL TESTS PASSED");
        log("");
        log("GO/NO-GO DECISION: ✓ GO");
        log("");
        log("XMP-First architecture is FEASIBLE");
        log("Proceed with Issue #32 refactor (ADR-003)");
    } else {
        logError("CRITICAL TESTS FAILED");
        log("");
        log("GO/NO-GO DECISION: ✗ NO-GO");
        log("");
        log("XMP-First architecture NOT feasible");
        log("Alternative approach required");
    }

    log("");
    logSection("POC COMPLETE");
    log("Results saved to: " + logFile.fsName);

    closeLog();

    // Open log file
    logFile.execute();

    alert("POC Complete!\n\nResults saved to Desktop:\nPOC-Results.txt\n\n" +
          "The file should open automatically.\n\n" +
          (critical ? "✓ TESTS PASSED - Architecture is feasible!" :
                      "✗ TESTS FAILED - Alternative approach needed"));
}

// RUN POC
runPOC();
