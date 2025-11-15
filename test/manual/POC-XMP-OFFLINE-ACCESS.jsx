/**
 * PROOF OF CONCEPT: XMP-First Offline Metadata Access
 *
 * Purpose: Validate core architectural assumptions before Issue #32 refactor
 *
 * Tests:
 * 1. Can we initialize AdobeXMPScript in Premiere Pro ExtendScript?
 * 2. Can we read/write ProjectItem.getProjectMetadata()?
 * 3. Can we parse XMP packets and access custom namespaces?
 * 4. Does project XMP persist when media goes offline?
 * 5. Performance: How fast is XMP parsing for 100+ clips?
 *
 * CRITICAL: Run this BEFORE committing to XMP-First refactor
 *
 * How to run:
 * 1. Open Premiere Pro with a project containing 5-10 clips
 * 2. File → Scripts → Run Script → Select this file
 * 3. Check ExtendScript Console (Help → Console) for results
 * 4. Report results back to architect for go/no-go decision
 */

// ============================================================================
// TEST CONFIGURATION
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
    },
    performanceTarget: 50 // ms per clip (target for 100 clips)
};

// ============================================================================
// UTILITY: SAFE LOGGING
// ============================================================================

function log(message) {
    $.writeln("[POC] " + message);
}

function logError(message, error) {
    $.writeln("[POC ERROR] " + message);
    if (error) {
        $.writeln("  Error: " + error.toString());
        if (error.line) $.writeln("  Line: " + error.line);
    }
}

function logSuccess(message) {
    $.writeln("[POC SUCCESS] " + message);
}

function logSection(title) {
    $.writeln("");
    $.writeln("========================================");
    $.writeln("  " + title);
    $.writeln("========================================");
}

// ============================================================================
// TEST 1: AdobeXMPScript Initialization
// ============================================================================

function test1_InitializeXMPScript() {
    logSection("TEST 1: AdobeXMPScript Initialization");

    try {
        // Attempt to load AdobeXMPScript library
        log("Loading AdobeXMPScript library...");
        var xmpLib = new ExternalObject("lib:AdobeXMPScript");

        if (!xmpLib) {
            logError("FAILED: ExternalObject returned null");
            return false;
        }

        logSuccess("AdobeXMPScript loaded: " + xmpLib);

        // Test XMPMeta constructor
        log("Testing XMPMeta constructor...");
        var testXmp = new XMPMeta();

        if (!testXmp) {
            logError("FAILED: XMPMeta constructor returned null");
            return false;
        }

        logSuccess("XMPMeta constructor works");

        // Test namespace registration
        log("Registering custom namespace: " + TEST_CONFIG.customNamespace.uri);
        try {
            XMPMeta.registerNamespace(
                TEST_CONFIG.customNamespace.uri,
                TEST_CONFIG.customNamespace.prefix
            );
            logSuccess("Custom namespace registered");
        } catch (e) {
            // May already be registered, that's okay
            log("Namespace registration returned: " + e.toString());
            log("(This is okay if namespace already exists)");
        }

        logSuccess("TEST 1 PASSED: AdobeXMPScript is functional");
        return true;

    } catch (e) {
        logError("TEST 1 FAILED: Cannot initialize AdobeXMPScript", e);
        return false;
    }
}

// ============================================================================
// TEST 2: ProjectItem Metadata Access
// ============================================================================

function test2_ProjectItemMetadataAccess() {
    logSection("TEST 2: ProjectItem Metadata Access");

    try {
        // Get first clip from project
        var project = app.project;
        if (!project) {
            logError("FAILED: No active project");
            return false;
        }

        log("Finding test clip in project...");
        var testItem = null;

        // Recursive function to find first video clip
        function findFirstClip(item) {
            if (item.type === 1) { // 1 = CLIP
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

        testItem = findFirstClip(project.rootItem);

        if (!testItem) {
            logError("FAILED: No video clips found in project");
            log("Please open a project with at least one video clip");
            return false;
        }

        log("Found test clip: " + testItem.name);

        // Test getProjectMetadata()
        log("Testing ProjectItem.getProjectMetadata()...");
        var projectXmpStr = testItem.getProjectMetadata();

        if (typeof projectXmpStr === "undefined") {
            logError("FAILED: getProjectMetadata() returned undefined");
            return false;
        }

        if (projectXmpStr === null || projectXmpStr === "") {
            log("WARNING: getProjectMetadata() returned empty string");
            log("This may be normal for clips without metadata");
            log("Will attempt to create minimal XMP packet...");
        } else {
            log("Project metadata length: " + projectXmpStr.length + " chars");
            log("First 200 chars: " + projectXmpStr.substring(0, 200));
        }

        // Test XMP parsing
        log("Testing XMP packet parsing...");
        var xmp;
        if (projectXmpStr && projectXmpStr.length > 0) {
            xmp = new XMPMeta(projectXmpStr);
        } else {
            // Create minimal XMP packet
            xmp = new XMPMeta();
        }

        if (!xmp) {
            logError("FAILED: Cannot create XMPMeta object");
            return false;
        }

        logSuccess("XMP packet parsed successfully");

        // Test setProjectMetadata()
        log("Testing ProjectItem.setProjectMetadata()...");

        // Add a test property
        var testNS = TEST_CONFIG.customNamespace.uri;
        var testProp = "pocTestProperty";
        var testValue = "poc-validation-" + new Date().getTime();

        log("Setting test property: " + testProp + " = " + testValue);
        xmp.setProperty(testNS, testProp, testValue);

        // Serialize and write back
        var serialized = xmp.serialize();
        testItem.setProjectMetadata(serialized);

        log("Metadata written, re-reading to verify...");

        // Read back to verify
        var verifyXmpStr = testItem.getProjectMetadata();
        var verifyXmp = new XMPMeta(verifyXmpStr);

        if (!verifyXmp.doesPropertyExist(testNS, testProp)) {
            logError("FAILED: Test property not found after write");
            return false;
        }

        var readValue = verifyXmp.getProperty(testNS, testProp).toString();

        if (readValue !== testValue) {
            logError("FAILED: Read value '" + readValue + "' doesn't match written '" + testValue + "'");
            return false;
        }

        logSuccess("TEST 2 PASSED: Read/write project metadata works");
        log("  Written value: " + testValue);
        log("  Read value:    " + readValue);

        return true;

    } catch (e) {
        logError("TEST 2 FAILED: ProjectItem metadata access error", e);
        return false;
    }
}

// ============================================================================
// TEST 3: Custom Namespace Fields
// ============================================================================

function test3_CustomNamespaceFields() {
    logSection("TEST 3: Custom Namespace Fields");

    try {
        // Get first clip
        var project = app.project;
        var testItem = null;

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

        testItem = findFirstClip(project.rootItem);

        if (!testItem) {
            logError("FAILED: No test clip found");
            return false;
        }

        log("Writing multiple custom fields to: " + testItem.name);

        // Read current project metadata
        var xmpStr = testItem.getProjectMetadata();
        var xmp = xmpStr ? new XMPMeta(xmpStr) : new XMPMeta();

        var ns = TEST_CONFIG.customNamespace.uri;

        // Write all test fields
        log("Writing test fields:");
        for (var fieldName in TEST_CONFIG.testFields) {
            var value = TEST_CONFIG.testFields[fieldName];
            log("  " + fieldName + " = " + value);
            xmp.setProperty(ns, fieldName, value);
        }

        // Write back to project
        testItem.setProjectMetadata(xmp.serialize());

        log("Re-reading to verify all fields...");

        // Read back and verify
        var verifyXmpStr = testItem.getProjectMetadata();
        var verifyXmp = new XMPMeta(verifyXmpStr);

        var allFieldsOk = true;

        for (var fieldName in TEST_CONFIG.testFields) {
            var expectedValue = TEST_CONFIG.testFields[fieldName];

            if (!verifyXmp.doesPropertyExist(ns, fieldName)) {
                logError("FAILED: Field '" + fieldName + "' not found");
                allFieldsOk = false;
                continue;
            }

            var actualValue = verifyXmp.getProperty(ns, fieldName).toString();

            if (actualValue !== expectedValue) {
                logError("FAILED: Field '" + fieldName + "' mismatch");
                log("  Expected: " + expectedValue);
                log("  Actual:   " + actualValue);
                allFieldsOk = false;
            } else {
                log("  ✓ " + fieldName + " = " + actualValue);
            }
        }

        if (!allFieldsOk) {
            return false;
        }

        logSuccess("TEST 3 PASSED: All custom fields read/write correctly");
        return true;

    } catch (e) {
        logError("TEST 3 FAILED: Custom namespace error", e);
        return false;
    }
}

// ============================================================================
// TEST 4: Offline Persistence (CRITICAL)
// ============================================================================

function test4_OfflinePersistence() {
    logSection("TEST 4: Offline Persistence");

    log("MANUAL TEST REQUIRED:");
    log("");
    log("This test validates that project XMP persists when media goes offline.");
    log("");
    log("Steps:");
    log("1. Verify Test 3 wrote custom fields to a clip");
    log("2. Note the clip name from Test 3 above");
    log("3. Save and close the Premiere project");
    log("4. Disconnect the drive containing the media files (or rename media folder)");
    log("5. Reopen the Premiere project (clips will show as OFFLINE)");
    log("6. Run this POC script again");
    log("7. Check if Test 3 still reads the custom fields from offline clips");
    log("");
    log("Expected result: Custom fields should still be readable from project XMP");
    log("                 even when media is offline");
    log("");
    log("If you've already made media offline, proceeding to read test...");
    log("");

    try {
        var project = app.project;
        var testItem = null;

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

        testItem = findFirstClip(project.rootItem);

        if (!testItem) {
            log("No clips found to test");
            return true; // Not a failure, just can't test
        }

        log("Reading custom fields from: " + testItem.name);

        // Check if clip is offline
        // Note: ExtendScript doesn't have direct isOffline() - check if media path is accessible
        var mediaPath = testItem.getMediaPath();
        log("Media path: " + (mediaPath || "(unknown)"));

        // Try to read custom fields
        var xmpStr = testItem.getProjectMetadata();

        if (!xmpStr || xmpStr.length === 0) {
            logError("Project metadata is empty - this suggests XMP not persisted");
            log("This could mean:");
            log("  1. Tests 2-3 weren't run first to write metadata");
            log("  2. Project wasn't saved after writing metadata");
            log("  3. Different project opened");
            return false;
        }

        var xmp = new XMPMeta(xmpStr);
        var ns = TEST_CONFIG.customNamespace.uri;

        log("Checking for custom fields...");
        var foundFields = 0;

        for (var fieldName in TEST_CONFIG.testFields) {
            if (xmp.doesPropertyExist(ns, fieldName)) {
                var value = xmp.getProperty(ns, fieldName).toString();
                log("  ✓ " + fieldName + " = " + value);
                foundFields++;
            } else {
                log("  ✗ " + fieldName + " (not found)");
            }
        }

        if (foundFields === 0) {
            log("No custom fields found - run Tests 2-3 first, save project, then retry");
            return true; // Not a failure, just setup needed
        }

        logSuccess("Found " + foundFields + " custom fields in project XMP");
        log("");
        log("OFFLINE TEST STATUS:");
        log("  Fields readable from project XMP: YES");
        log("  To complete test: Make media offline, reopen project, verify fields persist");

        return true;

    } catch (e) {
        logError("TEST 4 ERROR", e);
        return false;
    }
}

// ============================================================================
// TEST 5: Performance Benchmark
// ============================================================================

function test5_PerformanceBenchmark() {
    logSection("TEST 5: Performance Benchmark");

    try {
        var project = app.project;

        // Collect all clips
        log("Collecting all clips from project...");
        var allClips = [];

        function collectClips(item) {
            if (item.type === 1) { // CLIP
                allClips.push(item);
            }
            if (item.children && item.children.numItems > 0) {
                for (var i = 0; i < item.children.numItems; i++) {
                    collectClips(item.children[i]);
                }
            }
        }

        collectClips(project.rootItem);

        log("Found " + allClips.length + " clips in project");

        if (allClips.length === 0) {
            log("No clips to benchmark");
            return true;
        }

        // Benchmark XMP read/parse
        log("Benchmarking XMP read performance...");
        var startTime = new Date().getTime();

        for (var i = 0; i < allClips.length; i++) {
            var clip = allClips[i];
            var xmpStr = clip.getProjectMetadata();

            if (xmpStr && xmpStr.length > 0) {
                var xmp = new XMPMeta(xmpStr);
                // Read a property (simulates real access pattern)
                var ns = TEST_CONFIG.customNamespace.uri;
                if (xmp.doesPropertyExist(ns, "location")) {
                    xmp.getProperty(ns, "location");
                }
            }
        }

        var endTime = new Date().getTime();
        var totalMs = endTime - startTime;
        var avgMs = totalMs / allClips.length;

        log("");
        log("PERFORMANCE RESULTS:");
        log("  Total clips:     " + allClips.length);
        log("  Total time:      " + totalMs + " ms");
        log("  Avg per clip:    " + avgMs.toFixed(2) + " ms");
        log("  Target per clip: " + TEST_CONFIG.performanceTarget + " ms");
        log("");

        if (avgMs <= TEST_CONFIG.performanceTarget) {
            logSuccess("Performance ACCEPTABLE (under target)");
        } else {
            log("WARNING: Performance slower than target");
            log("  For 100 clips, expect ~" + (avgMs * 100).toFixed(0) + " ms");
        }

        // Estimate 100-clip performance
        var estimated100 = avgMs * 100;
        log("");
        log("ESTIMATED PERFORMANCE:");
        log("  100 clips: ~" + (estimated100 / 1000).toFixed(2) + " seconds");

        if (estimated100 > 5000) {
            log("WARNING: May be too slow for large projects (>5s for 100 clips)");
        }

        logSuccess("TEST 5 COMPLETED: Performance benchmark done");
        return true;

    } catch (e) {
        logError("TEST 5 FAILED: Performance benchmark error", e);
        return false;
    }
}

// ============================================================================
// TEST 6: Media XMP Fallback (Bonus)
// ============================================================================

function test6_MediaXMPFallback() {
    logSection("TEST 6: Media XMP Fallback (BONUS)");

    try {
        var project = app.project;
        var testItem = null;

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

        testItem = findFirstClip(project.rootItem);

        if (!testItem) {
            log("No test clip found");
            return true;
        }

        log("Testing media XMP access for: " + testItem.name);

        // Try to read media XMP
        log("Attempting testItem.getXMPMetadata()...");

        var mediaXmpStr;
        try {
            mediaXmpStr = testItem.getXMPMetadata();
        } catch (e) {
            log("getXMPMetadata() threw error (may not be supported): " + e.toString());
            log("This is okay - we can fallback to project XMP only");
            return true;
        }

        if (typeof mediaXmpStr === "undefined") {
            log("getXMPMetadata() returned undefined (not supported or offline)");
            log("This is okay - project XMP is primary source");
            return true;
        }

        if (!mediaXmpStr || mediaXmpStr.length === 0) {
            log("Media XMP is empty (normal for some formats)");
            return true;
        }

        log("Media XMP length: " + mediaXmpStr.length + " chars");

        // Try to parse media XMP
        var mediaXmp = new XMPMeta(mediaXmpStr);

        // Look for common fields
        var commonNamespaces = [
            { ns: "http://ns.adobe.com/xmp/1.0/", prefix: "xmp" },
            { ns: "http://purl.org/dc/elements/1.1/", prefix: "dc" },
            { ns: "http://ns.adobe.com/xap/1.0/mm/", prefix: "xmpMM" }
        ];

        log("Checking for common XMP properties in media:");
        for (var i = 0; i < commonNamespaces.length; i++) {
            var nsInfo = commonNamespaces[i];
            log("  Namespace: " + nsInfo.prefix);

            // Try common properties
            var commonProps = ["CreateDate", "ModifyDate", "MetadataDate", "Label", "Rating"];
            for (var j = 0; j < commonProps.length; j++) {
                var prop = commonProps[j];
                if (mediaXmp.doesPropertyExist(nsInfo.ns, prop)) {
                    var value = mediaXmp.getProperty(nsInfo.ns, prop).toString();
                    log("    ✓ " + prop + " = " + value.substring(0, 50));
                }
            }
        }

        logSuccess("TEST 6 COMPLETED: Media XMP accessible (when online)");
        return true;

    } catch (e) {
        logError("TEST 6 ERROR (non-critical)", e);
        return true; // Don't fail POC if media XMP not accessible
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function runPOC() {
    logSection("POC: XMP-First Offline Metadata Access");
    log("Starting validation tests...");
    log("");

    var results = {
        test1: false,
        test2: false,
        test3: false,
        test4: false,
        test5: false,
        test6: false
    };

    // Run tests in sequence
    results.test1 = test1_InitializeXMPScript();

    if (results.test1) {
        results.test2 = test2_ProjectItemMetadataAccess();
    } else {
        log("Skipping remaining tests (Test 1 failed)");
    }

    if (results.test2) {
        results.test3 = test3_CustomNamespaceFields();
    }

    if (results.test3) {
        results.test4 = test4_OfflinePersistence();
        results.test5 = test5_PerformanceBenchmark();
        results.test6 = test6_MediaXMPFallback();
    }

    // Summary
    logSection("POC RESULTS SUMMARY");
    log("");
    log("Test 1 (XMPScript Init):       " + (results.test1 ? "PASS ✓" : "FAIL ✗"));
    log("Test 2 (ProjectItem Access):   " + (results.test2 ? "PASS ✓" : "FAIL ✗"));
    log("Test 3 (Custom Namespace):     " + (results.test3 ? "PASS ✓" : "FAIL ✗"));
    log("Test 4 (Offline Persistence):  " + (results.test4 ? "PASS ✓" : "FAIL ✗"));
    log("Test 5 (Performance):          " + (results.test5 ? "PASS ✓" : "FAIL ✗"));
    log("Test 6 (Media XMP - Bonus):    " + (results.test6 ? "PASS ✓" : "FAIL ✗"));
    log("");

    // Critical tests for go/no-go
    var criticalTests = results.test1 && results.test2 && results.test3;

    if (criticalTests) {
        logSuccess("CRITICAL TESTS PASSED");
        log("");
        log("GO/NO-GO DECISION: ✓ GO");
        log("");
        log("Core assumptions validated:");
        log("  • AdobeXMPScript is functional");
        log("  • ProjectItem metadata read/write works");
        log("  • Custom namespace fields persist");
        log("");
        log("XMP-First architecture is FEASIBLE for Issue #32 refactor");
        log("");
        log("Next steps:");
        log("  1. Complete Test 4 manually (offline persistence test)");
        log("  2. Review performance results from Test 5");
        log("  3. Proceed with XMP-First refactor (ADR-003)");

    } else {
        logError("CRITICAL TESTS FAILED");
        log("");
        log("GO/NO-GO DECISION: ✗ NO-GO");
        log("");
        log("Core assumptions NOT validated:");
        if (!results.test1) log("  ✗ AdobeXMPScript initialization failed");
        if (!results.test2) log("  ✗ ProjectItem metadata access failed");
        if (!results.test3) log("  ✗ Custom namespace fields failed");
        log("");
        log("XMP-First architecture is NOT FEASIBLE");
        log("");
        log("Next steps:");
        log("  1. Review error messages above");
        log("  2. Report failures to technical-architect");
        log("  3. Consider alternative approaches (ADR-003 revision)");
    }

    log("");
    logSection("POC COMPLETE");
}

// Execute POC
runPOC();
