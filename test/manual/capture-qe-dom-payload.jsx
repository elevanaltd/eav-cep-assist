/**
 * QE DOM Payload Capture Script
 *
 * PURPOSE: Manually capture getAllProjectClips() output for characterization tests.
 *
 * USAGE:
 * 1. Open test project in Premiere Pro (with representative clips)
 * 2. File > Scripts > Run Script File...
 * 3. Select this file (capture-qe-dom-payload.jsx)
 * 4. Script writes output to ~/Desktop/qe-dom-output.json
 * 5. Copy output to test/fixtures/qe-dom-offline.json
 *
 * CONTEXT: Part of B2.1 (Characterization Tests) in XMP-First refactor plan.
 * This captures ACTUAL QE DOM behavior before refactoring to XMP-First.
 *
 * IMPORTANT: This script uses ES3 syntax (ExtendScript limitation).
 */

// Include the host.jsx file to get access to getAllProjectClips()
#include "../../jsx/host.jsx"

/**
 * Capture QE DOM payload to JSON file on Desktop
 */
function captureQEDOMPayload() {
  try {
    $.writeln('=== QE DOM Payload Capture Starting ===');

    // Call existing getAllProjectClips() function
    var resultJSON = getAllProjectClips();
    $.writeln('getAllProjectClips() returned: ' + resultJSON.substring(0, 200) + '...');

    // Parse to validate it's valid JSON
    var resultObj;
    try {
      resultObj = JSON.parse(resultJSON);
      $.writeln('JSON parsed successfully. Clips count: ' + resultObj.length);
    } catch (parseError) {
      alert('ERROR: getAllProjectClips() returned invalid JSON:\n' + parseError.toString());
      return;
    }

    // Write to Desktop for easy access
    var desktopPath = Folder.desktop.fsName;
    var outputFile = new File(desktopPath + '/qe-dom-output.json');

    $.writeln('Writing to: ' + outputFile.fsName);

    outputFile.open('w');
    // Pretty-print JSON for readability (manual verification)
    outputFile.write(JSON.stringify(resultObj, null, 2));
    outputFile.close();

    $.writeln('=== Capture Complete ===');
    alert(
      'QE DOM Payload Captured!\n\n' +
      'Output file: ~/Desktop/qe-dom-output.json\n' +
      'Clips captured: ' + resultObj.length + '\n\n' +
      'Next steps:\n' +
      '1. Review the JSON file for accuracy\n' +
      '2. Copy to test/fixtures/qe-dom-offline.json\n' +
      '3. Run npm test to validate fixtures'
    );

  } catch (error) {
    $.writeln('ERROR: ' + error.toString());
    alert('Capture failed:\n' + error.toString());
  }
}

// Execute capture
captureQEDOMPayload();
