/**
 * QE DOM Payload Capture Script (SELF-CONTAINED)
 *
 * PURPOSE: Manually capture getAllProjectClips() output for characterization tests.
 *
 * USAGE:
 * 1. Open test project in Premiere Pro (with representative clips)
 * 2. Premiere Pro → File → Scripts → Run Script File
 * 3. Select this file (capture-qe-dom-payload.jsx)
 * 4. Script writes output to ~/Desktop/qe-dom-output.json
 * 5. Copy output to test/fixtures/qe-dom-offline.json
 *
 * CONTEXT: Part of B2.1 (Characterization Tests) in XMP-First refactor plan.
 * This captures ACTUAL QE DOM behavior before refactoring to XMP-First.
 *
 * IMPORTANT: This script is 100% self-contained (no #include dependencies).
 * All required functions are inlined from jsx/host.jsx for portability.
 *
 * ExtendScript Compatibility: ES3 syntax only (no arrow functions, const, let, template literals)
 */

// ========== INLINED HELPER FUNCTIONS FROM jsx/host.jsx ==========

/**
 * Helper: Recursively collect all clips from project
 * (Inlined from jsx/host.jsx lines 1173-1197)
 */
function collectClipsRecursive(parentItem, clips) {
  // Add current item if it's a clip
  if (parentItem.type === ProjectItemType.CLIP || parentItem.type === ProjectItemType.FILE) {
    clips.push(parentItem);
  }

  // Recurse into children
  if (parentItem.children && parentItem.children.numItems > 0) {
    for (var i = 0; i < parentItem.children.numItems; i++) {
      collectClipsRecursive(parentItem.children[i], clips);
    }
  }
}

/**
 * Get all clips in the project (for navigation)
 * (Inlined from jsx/host.jsx lines 835-1163)
 */
function getAllProjectClips() {
  try {
    var project = app.project;
    if (!project) {
      return JSON.stringify({ error: 'No active project' });
    }

    var clips = [];
    collectClipsRecursive(project.rootItem, clips);

    // Convert clips to JSON-friendly objects (ES3-compatible, no .map())
    var clipsData = [];
    for (var i = 0; i < clips.length; i++) {
      var item = clips[i];

      // Safely get metadata with try-catch per item
      var metadata = {};
      // DIAGNOSTIC: Test direct access to known Project Column names
      try {
        var projectCols = item.getProjectColumnsMetadata();

        // Try direct access to known columns
        var directAccess = [];

        if (projectCols.Tape !== undefined) {
          directAccess.push('Tape=' + projectCols.Tape);
        }

        if (projectCols.Description !== undefined) {
          directAccess.push('Desc=' + projectCols.Description);
        }

        if (projectCols.Shot !== undefined) {
          directAccess.push('Shot=' + projectCols.Shot);
        }

        // Try "Log Comment" with different variations
        if (projectCols['Log Comment'] !== undefined) {
          directAccess.push('LogComment(space)=' + projectCols['Log Comment']);
        }

        if (projectCols.LogComment !== undefined) {
          directAccess.push('LogComment(noSpace)=' + projectCols.LogComment);
        }

        if (projectCols.Comment !== undefined) {
          directAccess.push('Comment=' + projectCols.Comment);
        }

        if (projectCols['Shot Name'] !== undefined) {
          directAccess.push('ShotName(space)=' + projectCols['Shot Name']);
        }

        metadata.availableColumns = directAccess.length > 0 ? directAccess.join(' | ') : 'NO_DIRECT_ACCESS';

        $.writeln('DEBUG PROJECT COLUMNS DIRECT ACCESS: ' + metadata.availableColumns);

      } catch (colError) {
        metadata.availableColumns = 'ERROR: ' + colError.toString();
      }

      // Try reading from XMP metadata instead of Project Columns
      try {
        var xmpString = item.getXMPMetadata();
        $.writeln('DEBUG: Got XMP metadata (length: ' + xmpString.length + ')');

        // DIAGNOSTIC: Show snippet of XMP to debug console
        var xmpSnippet = xmpString.substring(0, 500);
        $.writeln('DEBUG XMP SNIPPET: ' + xmpSnippet);

        // DIAGNOSTIC: Pass XMP snippet to CEP panel diagnostics (since console doesn't work)
        metadata.xmpSnippet = xmpSnippet;

        // DIAGNOSTIC: Search for LogComment anywhere in XMP (case-insensitive)
        var logCommentIndex = xmpString.toLowerCase().indexOf('logcomment');
        if (logCommentIndex !== -1) {
          // Found it! Extract 200 chars around it for debugging
          var start = Math.max(0, logCommentIndex - 50);
          var end = Math.min(xmpString.length, logCommentIndex + 150);
          metadata.logCommentContext = xmpString.substring(start, end);
        } else {
          metadata.logCommentContext = 'NOT_FOUND_IN_XMP_STRING';
        }

        // Parse XMP for Dublin Core description
        var descMatch = xmpString.match(/<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>(.*?)<\/rdf:li>/);
        if (descMatch) {
          metadata.description = descMatch[1] || '';
          $.writeln('DEBUG: Found description in XMP: \'' + metadata.description + '\'');
        } else {
          metadata.description = '';
          $.writeln('DEBUG: No description found in XMP');
        }

        // Parse Dublin Core identifier (standard XMP field)
        var identifierMatch = xmpString.match(/<dc:identifier>(.*?)<\/dc:identifier>/);
        metadata.identifier = (identifierMatch && identifierMatch[1]) ? identifierMatch[1] : '';
        $.writeln('DEBUG: Found identifier in XMP: \'' + metadata.identifier + '\'');

        // Parse xmpDM:logComment for structured components (IA compatibility)
        // NOTE: Premiere Pro returns XMP as ELEMENTS, and IA writes lowercase 'logComment'
        var logCommentMatch = xmpString.match(/<xmpDM:logComment>(.*?)<\/xmpDM:logComment>/);
        metadata.regexAttempt = 'lowercase-c-element'; // DIAGNOSTIC
        if (!logCommentMatch) {
          // Fallback: Try capital C for CEP Panel-written XMP
          $.writeln('DEBUG: logComment (lowercase c) not found, trying capital C...');
          logCommentMatch = xmpString.match(/<xmpDM:LogComment>(.*?)<\/xmpDM:LogComment>/);
          metadata.regexAttempt = 'capital-C-element'; // DIAGNOSTIC
        }

        if (logCommentMatch) {
          var logComment = logCommentMatch[1];
          $.writeln('DEBUG: Found LogComment: \'' + logComment + '\'');

          // DIAGNOSTIC: Return raw logComment so it shows in CEP diagnostic panel
          metadata.rawLogComment = logComment;
          metadata.regexAttempt = metadata.regexAttempt + '-MATCHED'; // DIAGNOSTIC

          // Parse location=X, subject=Y, action=Z, shotType=W
          var locationMatch = logComment.match(/location=([^,]*)/);
          metadata.location = (locationMatch && locationMatch[1]) ? locationMatch[1].replace(/^\s+|\s+$/g, '') : '';

          var subjectMatch = logComment.match(/subject=([^,]*)/);
          metadata.subject = (subjectMatch && subjectMatch[1]) ? subjectMatch[1].replace(/^\s+|\s+$/g, '') : '';

          var actionMatch = logComment.match(/action=([^,]*)/);
          metadata.action = (actionMatch && actionMatch[1]) ? actionMatch[1].replace(/^\s+|\s+$/g, '') : '';

          var shotTypeMatch = logComment.match(/shotType=([^,]*)/);
          metadata.shot = (shotTypeMatch && shotTypeMatch[1]) ? shotTypeMatch[1].replace(/^\s+|\s+$/g, '') : '';

        } else {
          // Fallback: Try legacy individual XMP fields for backward compatibility
          $.writeln('DEBUG: LogComment not found, using legacy XMP fields');
          // DIAGNOSTIC: Show we didn't find it
          metadata.rawLogComment = 'NOT_FOUND_IN_XMP';
          metadata.regexAttempt = metadata.regexAttempt + '-NO_MATCH'; // DIAGNOSTIC

          var shotMatch = xmpString.match(/<xmp:Shot>(.*?)<\/xmp:Shot>/);
          metadata.shot = (shotMatch && shotMatch[1]) ? shotMatch[1] : '';

          var locationMatch = xmpString.match(/<xmp:Location>(.*?)<\/xmp:Location>/);
          metadata.location = (locationMatch && locationMatch[1]) ? locationMatch[1] : '';

          var subjectMatch = xmpString.match(/<xmp:Subject>(.*?)<\/xmp:Subject>/);
          metadata.subject = (subjectMatch && subjectMatch[1]) ? subjectMatch[1] : '';

          var actionMatch = xmpString.match(/<xmp:Action>(.*?)<\/xmp:Action>/);
          metadata.action = (actionMatch && actionMatch[1]) ? actionMatch[1] : '';
        }

        var sceneMatch = xmpString.match(/<xmp:Scene>(.*?)<\/xmp:Scene>/);
        metadata.good = (sceneMatch && sceneMatch[1]) ? sceneMatch[1] : '';

        $.writeln('DEBUG FINAL XMP VALUES for ' + item.name + ':');
        $.writeln('  identifier: \'' + metadata.identifier + '\'');
        $.writeln('  description: \'' + metadata.description + '\'');
        $.writeln('  shot: \'' + metadata.shot + '\'');
        $.writeln('  good: \'' + metadata.good + '\'');
        $.writeln('  location: \'' + metadata.location + '\'');
        $.writeln('  subject: \'' + metadata.subject + '\'');
        $.writeln('  action: \'' + metadata.action + '\'');

      } catch (xmpError) {
        $.writeln('DEBUG XMP ERROR: ' + xmpError.toString());
        // DIAGNOSTIC: Pass error to CEP panel diagnostics
        metadata.xmpSnippet = 'ERROR: ' + xmpError.toString();
        metadata.regexAttempt = 'ERROR_BEFORE_REGEX';
        metadata.rawLogComment = 'ERROR: ' + xmpError.toString();
        metadata.logCommentContext = 'ERROR: ' + xmpError.toString();

        metadata.identifier = '';
        metadata.description = '';
        metadata.shot = '';
        metadata.good = '';
        metadata.location = '';
        metadata.subject = '';
        metadata.action = '';
      }

      clipsData.push({
        nodeId: item.nodeId,
        name: item.name || '',
        treePath: item.treePath || '',
        mediaPath: item.getMediaPath() || '',
        identifier: metadata.identifier,
        description: metadata.description,
        shot: metadata.shot,
        good: metadata.good,
        location: metadata.location,
        subject: metadata.subject,
        action: metadata.action,

        // DIAGNOSTIC fields for debugging
        rawLogComment: metadata.rawLogComment || 'NOT_SET',
        regexAttempt: metadata.regexAttempt || 'NOT_SET',
        xmpSnippet: metadata.xmpSnippet || 'NOT_SET',
        logCommentContext: metadata.logCommentContext || 'NOT_SET',
        availableColumns: metadata.availableColumns || 'NOT_SET'
      });
    }

    return JSON.stringify({ clips: clipsData });

  } catch (e) {
    return JSON.stringify({
      error: 'getAllProjectClips failed',
      details: e.toString(),
      message: e.message || 'Unknown error'
    });
  }
}

// ========== CAPTURE SCRIPT ==========

/**
 * Capture QE DOM payload to JSON file on Desktop
 */
function captureQEDOMPayload() {
  try {
    $.writeln('=== QE DOM Payload Capture Starting ===');

    // Call inlined getAllProjectClips() function
    var resultJSON = getAllProjectClips();
    $.writeln('getAllProjectClips() returned: ' + resultJSON.substring(0, 200) + '...');

    // Parse to validate it's valid JSON
    var resultObj;
    try {
      resultObj = JSON.parse(resultJSON);

      // Check if error was returned
      if (resultObj.error) {
        alert('ERROR: getAllProjectClips() returned error:\n' + resultObj.error + '\n\nDetails: ' + (resultObj.details || 'none'));
        return;
      }

      var clipsCount = resultObj.clips ? resultObj.clips.length : 0;
      $.writeln('JSON parsed successfully. Clips count: ' + clipsCount);

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

    var clipsCount = resultObj.clips ? resultObj.clips.length : 0;

    alert(
      '✓ QE DOM Payload Captured!\n\n' +
      'Output file: ~/Desktop/qe-dom-output.json\n' +
      'Clips captured: ' + clipsCount + '\n\n' +
      'Next steps:\n' +
      '1. Review the JSON file for accuracy\n' +
      '2. Copy to test/fixtures/qe-dom-offline.json\n' +
      '3. Run npm test to validate fixtures'
    );

  } catch (error) {
    $.writeln('ERROR: ' + error.toString());
    alert('Capture failed:\n' + error.toString() + '\n\nStack: ' + (error.line ? ('Line ' + error.line) : 'unknown'));
  }
}

// Execute capture
captureQEDOMPayload();
