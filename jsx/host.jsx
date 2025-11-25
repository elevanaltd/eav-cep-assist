// ExtendScript for Premiere Pro

// Handles communication between the CEP panel and Premiere Pro

// ============================================================================
// TRACK A: Load JSON integration functions at TOP LEVEL (true global scope)
// ============================================================================
// CRITICAL: $.evalFile() must run at top level (not inside any function)
// to create TRUE globals. Any function wrapper (even IIFE) creates local scope.

// Build path to track-a-integration.jsx
// CEP context: Use CEP_EXTENSION_ROOT global (set by CEP JavaScript before loading)
// Desktop Console: Fall back to $.fileName
var _trackAScriptDir;
if (typeof CEP_EXTENSION_ROOT !== 'undefined' && CEP_EXTENSION_ROOT) {
  // CEP context - use path set by panel JavaScript
  _trackAScriptDir = new Folder(CEP_EXTENSION_ROOT + '/jsx');
} else {
  // Desktop Console context - use $.fileName
  var _trackAScriptFile = new File($.fileName);
  _trackAScriptDir = _trackAScriptFile.parent;
}

var _trackAFile = new File(_trackAScriptDir.fsName + '/track-a-integration.jsx');
$.writeln('HOST_TRYING_PRIMARY: ' + _trackAScriptDir.fsName + '/track-a-integration.jsx exists=' + _trackAFile.exists);

if (!_trackAFile.exists) {
  // Fallback to generated/ subdirectory (for deployed extension)
  _trackAFile = new File(_trackAScriptDir.fsName + '/generated/track-a-integration.jsx');
  $.writeln('HOST_TRYING_GENERATED: ' + _trackAScriptDir.fsName + '/generated/track-a-integration.jsx exists=' + _trackAFile.exists);
}

if (_trackAFile.exists) {
  $.writeln('HOST_BEFORE_EVALFILE: About to load ' + _trackAFile.fsName);
  try {
    $.evalFile(_trackAFile);  // ← TRUE top-level execution creates globals
    $.writeln('HOST_EVALFILE_SUCCESS: track-a-integration.jsx loaded');
  } catch(e) {
    $.writeln('HOST_EVALFILE_ERROR: ' + e.message);
  }
} else {
  // Neither location found - warn and continue without Track A
  $.writeln('WARNING: track-a-integration.jsx not found at: ' + _trackAScriptDir.fsName + '/track-a-integration.jsx');
  $.writeln('         Also tried: ' + _trackAScriptDir.fsName + '/generated/track-a-integration.jsx');
}

// Clean up temporary variables (they're globals but we don't need them anymore)
_trackAScriptFile = undefined;
_trackAScriptDir = undefined;
_trackAFile = undefined;

var EAVIngest = (function() {

  'use strict';



  /**

     * Log to file for debugging (when console not available)

     */

  function _logToFile(message) {

    try {

      // Use user data directory instead of desktop for privacy
      // Creates ~/.debug/ directory if it doesn't exist
      var debugDir = new Folder(Folder.userData.parent.fsName + '/.debug');
      if (!debugDir.exists) {
        debugDir.create();
      }

      var logFile = new File(debugDir.fsName + '/eav-cep-debug.txt');

      logFile.open('a'); // append mode

      logFile.writeln(new Date().toISOString() + ' - ' + message);

      logFile.close();

    } catch (e) {

      // Silently fail if file write errors

    }

    // Also write to console (if available)

    $.writeln(message);

  }



  /**

     * Escape XML entities to prevent injection attacks

     * @param {string} str - Raw string value

     * @returns {string} XML-safe escaped string

     */

  function escapeXML(str) {

    if (!str) {return '';}

    return String(str)

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&apos;');

  }



  /**

     * Get currently selected project item(s) from Project Panel

     * Returns array of selected clips with their metadata

     */

  function getSelectedClips() {

    var project = app.project;

    if (!project) {

      return JSON.stringify({ error: 'No active project' });

    }



    var selection = project.getSelection();

    if (!selection || selection.length === 0) {

      return JSON.stringify({ error: 'No clips selected' });

    }



    var clips = [];

    for (var i = 0; i < selection.length; i++) {

      var item = selection[i];



      // Only process video/image items, not bins

      if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) {

        // DIAGNOSTIC: Test Project Columns access in getSelectedClips() context
        /** @type {*} */
        var projectCols = item.getProjectColumnsMetadata();
        var colTest = 'Tape=' + (projectCols.Tape || 'NONE') +
                      ' | Desc=' + (projectCols.Description || 'NONE') +
                      ' | Shot=' + (projectCols.Shot || 'NONE') +
                      ' | LogComment(space)=' + (projectCols['Log Comment'] || 'NONE') +
                      ' | LogComment(noSpace)=' + (projectCols.LogComment || 'NONE');
        $.writeln('DEBUG getSelectedClips() PROJECT COLUMNS: ' + colTest);

        clips.push({

          nodeId: item.nodeId,

          name: item.name || '',

          treePath: item.treePath || '',

          mediaPath: item.getMediaPath() || '',

          // Get existing metadata from PP fields

          tapeName: projectCols.Tape || '',

          description: projectCols.Description || '',

          shot: projectCols.Shot || '',

          // DIAGNOSTIC: Test if we can read Log Comment
          logCommentFromColumn: projectCols['Log Comment'] || projectCols.LogComment || 'NO_COLUMN_ACCESS',

          // File info

          videoFrameRate: item.getFootageInterpretation().frameRate || '',

          duration: item.getOutPoint().seconds || 0,

          type: item.type

        });

      }

    }



    if (clips.length === 0) {

      return JSON.stringify({ error: 'No video/image clips in selection' });

    }



    return JSON.stringify({ clips: clips });

  }



  // ============================================================================
  // TRACK A: JSON SIDECAR INTEGRATION
  // ============================================================================
  //
  // Track A functions loaded BEFORE this IIFE (in global scope)
  // See lines 5-31 for loading logic
  //
  // Available functions from track-a-integration.jsx:
  // - readJSONMetadataWrapper(clip)
  // - writeJSONMetadataWrapper(clip, updates)
  // - readJSONMetadataByNodeIdWrapper(nodeId)
  // - writeJSONMetadataByNodeIdWrapper(nodeId, updatesJSON)
  //
  // ============================================================================





  /**

     * Update PP project item metadata fields

     * Updates: Name, Tape Name, Description, Shot

     */

  function updateClipMetadata(nodeId, metadata) {

    var debugLog = []; // Collect debug messages to return to CEP panel

    var project = app.project;

    if (!project) {

      return JSON.stringify({ success: false, error: 'No active project' });

    }



    // Find the project item by nodeId

    var item = findProjectItemByNodeId(project.rootItem, nodeId);

    if (!item) {

      return JSON.stringify({ success: false, error: 'Clip not found' });

    }



    try {

      // Update Name field (visible in Project Panel)

      if (metadata.name !== undefined) {

        item.name = metadata.name;

      }



      // Update metadata via XMP

      try {

        var xmpString = item.getXMPMetadata();

        debugLog.push('Got XMP (length: ' + xmpString.length + ')');

        debugLog.push('Incoming metadata:');

        debugLog.push('  description: \'' + metadata.description + '\'');

        debugLog.push('  location: \'' + metadata.location + '\'');

        debugLog.push('  subject: \'' + metadata.subject + '\'');

        debugLog.push('  action: \'' + metadata.action + '\'');

        debugLog.push('  shot: \'' + metadata.shot + '\'');



        // ========== DUBLIN CORE NAMESPACE FIELDS ==========

        // Collect all Dublin Core fields to update

        var dcFields = [];

        if (metadata.description !== undefined) {

          dcFields.push({

            tag: 'dc:description',

            value: '<dc:description><rdf:Alt><rdf:li xml:lang="x-default">' + escapeXML(metadata.description) + '</rdf:li></rdf:Alt></dc:description>',

            regex: /<dc:description[^>]*>[\s\S]*?<\/dc:description>/

          });

        }

        if (metadata.identifier !== undefined) {

          dcFields.push({

            tag: 'dc:identifier',

            value: '<dc:identifier>' + escapeXML(metadata.identifier) + '</dc:identifier>',

            regex: /<dc:identifier[^>]*>[\s\S]*?<\/dc:identifier>/

          });

        }



        // Update Dublin Core fields in their namespace block

        if (dcFields.length > 0) {

          // Find the Dublin Core rdf:Description block

          var dcBlockMatch = xmpString.match(/<rdf:Description[^>]*xmlns:dc="http:\/\/purl\.org\/dc\/elements\/1\.1\/"[^>]*>([\s\S]*?)<\/rdf:Description>/);



          if (dcBlockMatch) {

            // DC block exists - update fields within it

            var dcBlockContent = dcBlockMatch[1];

            var dcBlockFull = dcBlockMatch[0];



            for (var i = 0; i < dcFields.length; i++) {

              var field = dcFields[i];

              if (dcBlockContent.indexOf('<' + field.tag) > -1) {

                // Field exists - replace it

                debugLog.push(field.tag + ' FOUND, replacing...');

                var beforeReplace = dcBlockContent;

                dcBlockContent = dcBlockContent.replace(field.regex, field.value);

                if (beforeReplace === dcBlockContent) {

                  debugLog.push('ERROR: ' + field.tag + ' regex did NOT match!');

                } else {

                  debugLog.push(field.tag + ' successfully replaced');

                }

              } else {

                // Field doesn't exist - append it

                debugLog.push(field.tag + ' NOT FOUND, appending...');

                dcBlockContent += field.value;

              }

              debugLog.push(field.tag + ' updated');

            }



            // Replace the entire DC block with updated content

            // Extract just the opening tag (everything up to first '>')

            var openingTagEnd = dcBlockFull.indexOf('>') + 1;

            var openingTag = dcBlockFull.substring(0, openingTagEnd);

            var newDcBlock = openingTag + dcBlockContent + '</rdf:Description>';

            xmpString = xmpString.replace(dcBlockFull, newDcBlock);



          } else {

            // DC block doesn't exist - create it

            var dcBlock = '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">';

            for (var i = 0; i < dcFields.length; i++) {

              dcBlock += dcFields[i].value;

              $.writeln('DEBUG SAVE: ' + dcFields[i].tag + ' created');

            }

            dcBlock += '</rdf:Description>';



            // Insert before closing </rdf:RDF>

            xmpString = xmpString.replace(/<\/rdf:RDF>/, dcBlock + '</rdf:RDF>');

          }

        }



        // ========== XMPDM NAMESPACE FIELDS (IA COMPATIBILITY) ==========

        // Build combined shotName and structured LogComment

        var xmpDmFields = [];



        // Build shotName: location-subject-action-shotType (or without action for images)

        if (metadata.location && metadata.subject && metadata.shot) {

          var shotName = metadata.location + '-' + metadata.subject;

          if (metadata.action) {

            shotName += '-' + metadata.action;

          }

          shotName += '-' + metadata.shot;



          xmpDmFields.push({

            tag: 'xmpDM:shotName',

            value: '<xmpDM:shotName>' + escapeXML(shotName) + '</xmpDM:shotName>',

            regex: /<xmpDM:shotName[^>]*>[\s\S]*?<\/xmpDM:shotName>/

          });

        }



        // Build LogComment: location=X, subject=Y, action=Z, shotType=W

        if (metadata.location !== undefined && metadata.subject !== undefined && metadata.shot !== undefined) {

          var logComment = 'location=' + escapeXML(metadata.location || '') +

                                   ', subject=' + escapeXML(metadata.subject || '') +

                                   ', action=' + escapeXML(metadata.action || '') +

                                   ', shotType=' + escapeXML(metadata.shot || '');



          xmpDmFields.push({

            tag: 'xmpDM:LogComment',

            value: '<xmpDM:LogComment>' + logComment + '</xmpDM:LogComment>',

            regex: /<xmpDM:LogComment[^>]*>[\s\S]*?<\/xmpDM:LogComment>/

          });

        }



        // Update xmpDM fields in their namespace block

        if (xmpDmFields.length > 0) {

          // Find the xmpDM rdf:Description block

          var xmpDmBlockMatch = xmpString.match(/<rdf:Description[^>]*xmlns:xmpDM="http:\/\/ns\.adobe\.com\/xmp\/1\.0\/DynamicMedia\/"[^>]*>([\s\S]*?)<\/rdf:Description>/);



          if (xmpDmBlockMatch) {

            // xmpDM block exists - update fields within it

            var xmpDmBlockContent = xmpDmBlockMatch[1];

            var xmpDmBlockFull = xmpDmBlockMatch[0];



            for (var i = 0; i < xmpDmFields.length; i++) {

              var field = xmpDmFields[i];

              if (xmpDmBlockContent.indexOf('<' + field.tag) > -1) {

                // Field exists - replace it

                debugLog.push(field.tag + ' FOUND, replacing...');

                var beforeReplace = xmpDmBlockContent;

                xmpDmBlockContent = xmpDmBlockContent.replace(field.regex, field.value);

                if (beforeReplace === xmpDmBlockContent) {

                  debugLog.push('ERROR: ' + field.tag + ' regex did NOT match!');

                } else {

                  debugLog.push(field.tag + ' successfully replaced');

                }

              } else {

                // Field doesn't exist - append it

                debugLog.push(field.tag + ' NOT FOUND, appending...');

                xmpDmBlockContent += field.value;

              }

              debugLog.push(field.tag + ' updated');

            }



            // Replace the entire xmpDm block with updated content

            // Extract just the opening tag (everything up to first '>')

            var openingTagEnd = xmpDmBlockFull.indexOf('>') + 1;

            var openingTag = xmpDmBlockFull.substring(0, openingTagEnd);

            var newXmpDmBlock = openingTag + xmpDmBlockContent + '</rdf:Description>';

            xmpString = xmpString.replace(xmpDmBlockFull, newXmpDmBlock);



          } else {

            // xmpDm block doesn't exist - create it

            var xmpDmBlock = '<rdf:Description rdf:about="" xmlns:xmpDM="http://ns.adobe.com/xmp/1.0/DynamicMedia/">';

            for (var i = 0; i < xmpDmFields.length; i++) {

              xmpDmBlock += xmpDmFields[i].value;

              $.writeln('DEBUG SAVE: ' + xmpDmFields[i].tag + ' created');

            }

            xmpDmBlock += '</rdf:Description>';



            // Insert before closing </rdf:RDF>

            xmpString = xmpString.replace(/<\/rdf:RDF>/, xmpDmBlock + '</rdf:RDF>');

          }

        }



        item.setXMPMetadata(xmpString);

        debugLog.push('XMP metadata updated successfully');



      } catch (xmpError) {

        debugLog.push('XMP ERROR: ' + xmpError.toString());

      }



      // ========== WRITE PP EDITS JSON ==========

      // Write PP edits to original folder for ML feedback loop

      try {

        var mediaPath = item.getMediaPath();

        if (mediaPath) {

          // Extract directory and filename

          var lastSlash = mediaPath.lastIndexOf('/');

          var dirPath = mediaPath.substring(0, lastSlash);

          var filename = mediaPath.substring(lastSlash + 1);

          var filenameNoExt = filename.replace(/\.[^.]+$/, '');



          // Read existing .ingest-metadata.json (if exists)

          var iaJsonPath = dirPath + '/.ingest-metadata.json';

          var iaJsonFile = new File(iaJsonPath);

          var iaData = {};

          if (iaJsonFile.exists) {

            iaJsonFile.open('r');

            var iaJsonContent = iaJsonFile.read();

            iaJsonFile.close();

            try {

              iaData = JSON.parse(iaJsonContent);

            } catch (_parseError) {

              debugLog.push('Warning: Could not parse existing IA JSON');

            }

          }



          // Build PP edits entry (matches IA format)

          var fileId = metadata.identifier ? metadata.identifier.replace(/\.[^.]+$/, '') : filenameNoExt;

          var iaEntry = iaData[fileId] || {};



          var ppEditsEntry = {};

          ppEditsEntry[fileId] = {

            // File Identification (preserve from IA)

            id: fileId,

            originalFilename: iaEntry.originalFilename || filename,

            currentFilename: filename,

            filePath: mediaPath,

            extension: iaEntry.extension || filename.substring(filename.lastIndexOf('.')),

            fileType: iaEntry.fileType || 'video',



            // Core Metadata (from PP edits)

            mainName: metadata.location + '-' + metadata.subject + (metadata.action ? '-' + metadata.action : '') + '-' + metadata.shot,

            keywords: metadata.description ? metadata.description.split(',').map(function(k) { return k.replace(/^\s+|\s+$/g, ''); }) : [],



            // Structured Components

            location: metadata.location || '',

            subject: metadata.subject || '',

            action: metadata.action || '',

            shotType: metadata.shot || '',



            // Processing State (preserve from IA)

            processedByAI: iaEntry.processedByAI || false,



            // Audit Trail

            createdAt: iaEntry.createdAt || new Date().toISOString(),

            createdBy: iaEntry.createdBy || 'unknown',

            modifiedAt: new Date().toISOString(),

            modifiedBy: 'cep-panel',

            version: '1.0.0'

          };



          // Write to .ingest-metadata-pp.json

          var ppJsonPath = dirPath + '/.ingest-metadata-pp.json';

          var ppJsonFile = new File(ppJsonPath);



          // Read existing PP edits (if any)

          var existingPpData = { _schema: '2.0' };

          if (ppJsonFile.exists) {

            ppJsonFile.open('r');

            var existingContent = ppJsonFile.read();

            ppJsonFile.close();

            try {

              existingPpData = JSON.parse(existingContent);

            } catch (e) {

              existingPpData = { _schema: '2.0' };

            }

          }



          // Merge this entry

          existingPpData[fileId] = ppEditsEntry[fileId];



          // Write back

          ppJsonFile.open('w');

          ppJsonFile.write(JSON.stringify(existingPpData, null, 2));

          ppJsonFile.close();



          debugLog.push('PP edits JSON written: ' + ppJsonPath);

        } else {

          debugLog.push('Warning: No media path, skipping PP edits JSON');

        }

      } catch (jsonError) {

        debugLog.push('PP edits JSON error: ' + jsonError.toString());

      }



      return JSON.stringify({

        success: true,

        updatedName: item.name,

        debug: debugLog

      });

    } catch (e) {

      return JSON.stringify({

        success: false,

        error: 'Failed to update metadata: ' + e.toString()

      });

    }

  }



  /**

     * Helper: Find project item by nodeId (recursive search)

     */

  function findProjectItemByNodeId(parentItem, nodeId) {

    if (parentItem.nodeId === nodeId) {

      return parentItem;

    }



    // Search children recursively

    if (parentItem.children && parentItem.children.numItems > 0) {

      for (var i = 0; i < parentItem.children.numItems; i++) {

        var found = findProjectItemByNodeId(parentItem.children[i], nodeId);

        if (found) {

          return found;

        }

      }

    }



    return null;

  }



  /**

     * Get all clips in the project (for navigation)

     */

  function getAllProjectClips() {
    // SIMPLIFIED: Returns only essential clip identification
    // Metadata (location, subject, action, shotType) loaded via readJSONMetadataByNodeId()
    // from .ingest-metadata.json sidecars - not from XMP
    try {
      var project = app.project;
      if (!project) {
        return JSON.stringify({ error: 'No active project' });
      }

      var clips = [];
      collectClipsRecursive(project.rootItem, clips);

      // Convert clips to JSON-friendly objects (ES3-compatible)
      var clipsData = [];
      for (var i = 0; i < clips.length; i++) {
        var item = clips[i];

        // Get proxy path safely
        var proxyPath = '';
        try {
          proxyPath = item.getProxyPath() || '';
        } catch (proxyErr) {
          proxyPath = '';
        }

        clipsData.push({
          nodeId: item.nodeId,
          name: item.name || '',
          treePath: item.treePath || '',
          mediaPath: item.getMediaPath() || '',
          proxyPath: proxyPath
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



  /**

     * Helper: Recursively collect all clips from project

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

     * Select a specific clip in the Project Panel by nodeId

     */

  function selectClip(nodeId) {

    var project = app.project;

    if (!project) {

      return JSON.stringify({ success: false, error: 'No active project' });

    }



    var item = findProjectItemByNodeId(project.rootItem, nodeId);

    if (!item) {

      return JSON.stringify({ success: false, error: 'Clip not found' });

    }



    // Select the item in the project panel

    item.select();



    return JSON.stringify({ success: true });

  }



  /**

     * Open clip in Source Monitor

     */

  function openInSourceMonitor(nodeId) {

    var project = app.project;

    if (!project) {

      return JSON.stringify({ success: false, error: 'No active project' });

    }



    var item = findProjectItemByNodeId(project.rootItem, nodeId);

    if (!item) {

      return JSON.stringify({ success: false, error: 'Clip not found' });

    }



    try {

      // Open in Source Monitor

      app.sourceMonitor.openProjectItem(item);

      return JSON.stringify({ success: true });

    } catch (e) {

      return JSON.stringify({

        success: false,

        error: 'Failed to open in Source Monitor: ' + e.toString()

      });

    }

  }



  /**

     * Export frame at specified time from clip

     * @param {string} nodeId - Project item nodeId

     * @param {number} timeInSeconds - Time in seconds (e.g., 0.5 for half a second)

     * @returns {string} JSON with frame file path or error

     *

     * NOTE: This uses a workaround approach since PP ExtendScript doesn't have

     * a direct "export frame at time" API. We:

     * 1. Open clip in Source Monitor

     * 2. Seek to time

     * 3. Export current frame

     */

  function exportFrameAtTime(nodeId, timeInSeconds) {

    var project = app.project;

    if (!project) {

      return JSON.stringify({ success: false, error: 'No active project' });

    }



    var item = findProjectItemByNodeId(project.rootItem, nodeId);

    if (!item) {

      return JSON.stringify({ success: false, error: 'Clip not found' });

    }



    try {

      // Create a temporary folder for frame exports

      var tempFolder = Folder.temp + '/eav-cep-frames';

      var folder = new Folder(tempFolder);

      if (!folder.exists) {

        folder.create();

      }



      // Generate unique filename

      var timestamp = new Date().getTime();

      var outputPath = tempFolder + '/frame-' + nodeId + '-' + timestamp + '.jpg';



      // Method 1: Try using encoder API (PP 2018+)

      // This is the most reliable method if available

      if (app.encoder && typeof app.encoder.encodeFile === 'function') {

        // Convert time to ticks (254016000000 ticks per second)

        var ticksPerSecond = 254016000000;

        var inPoint = Math.floor(timeInSeconds * ticksPerSecond);

        var outPoint = inPoint + 1; // Single frame



        // Use JPEG export preset

        var success = app.encoder.encodeFile(

          item.getMediaPath(),

          outputPath,

          app.encoder.ENCODE_IN_TO_OUT,

          [item],

          inPoint,

          outPoint

        );



        if (success) {

          return JSON.stringify({

            success: true,

            framePath: outputPath,

            timeInSeconds: timeInSeconds,

            method: 'encoder API'

          });

        }

      }



      // Method 2: Fallback - Open in Source Monitor and export current frame

      // This is less reliable but works across more PP versions

      app.sourceMonitor.openProjectItem(item);



      // Seek to time (in ticks)

      var ticksPerSecond = 254016000000;

      var timeInTicks = Math.floor(timeInSeconds * ticksPerSecond);

      app.sourceMonitor.setPosition(timeInTicks);



      // Export current frame (if method exists)

      // Note: exportFramePNG may not exist in all PP versions

      if (typeof item.exportFramePNG === 'function') {

        var success = item.exportFramePNG(timeInTicks, outputPath);



        if (success) {

          return JSON.stringify({

            success: true,

            framePath: outputPath,

            timeInSeconds: timeInSeconds,

            method: 'exportFramePNG'

          });

        }

      }



      // Method 3: Ultimate fallback - return media path

      // CEP panel will handle frame extraction client-side if needed

      return JSON.stringify({

        success: false,

        error: 'Frame export API not available in this PP version',

        fallback: 'use_media_path',

        mediaPath: item.getMediaPath(),

        timeInSeconds: timeInSeconds

      });



    } catch (e) {

      return JSON.stringify({

        success: false,

        error: 'Failed to export frame: ' + e.toString(),

        details: 'Time: ' + timeInSeconds + 's'

      });

    }

  }



  /**

     * Parse structured naming from original filename

     * Expects format: {8-digit-id}-restofname.ext

     */

  function parseStructuredNaming(filename) {

    // Remove extension

    var nameWithoutExt = filename.replace(/\.[^.]+$/, '');



    // Try to extract 8-digit ID

    var idMatch = nameWithoutExt.match(/^(\d{8})/);

    var id = idMatch ? idMatch[1] : '';



    return JSON.stringify({

      id: id,

      originalFilename: filename

    });

  }


  // ============================================================================
  // TRACK A AVAILABILITY CHECK
  // ============================================================================
  // Guard against missing track-a-integration.jsx file
  // If Track A wrappers are undefined, provide stub functions that return null/false
  // This allows EAVIngest to be created even when Track A file is missing
  // (graceful degradation - core panel functionality works, JSON features unavailable)

  if (typeof readJSONMetadataWrapper === 'undefined') {
    $.writeln('WARNING: Track A wrappers not loaded from jsx/generated/track-a-integration.jsx');
    $.writeln('         Using inlined implementation instead');

    // ========================================================================
    // INLINED TRACK A IMPLEMENTATION (from track-a-integration.jsx)
    // ========================================================================

    /**
     * Helper: Find project item by nodeId (recursive search)
     */
    var findProjectItemByNodeIdInline = function(parentItem, nodeId) {
      if (parentItem.nodeId === nodeId) {
        return parentItem;
      }
      if (parentItem.children && parentItem.children.numItems > 0) {
        for (var i = 0; i < parentItem.children.numItems; i++) {
          var found = findProjectItemByNodeIdInline(parentItem.children[i], nodeId);
          if (found) {
            return found;
          }
        }
      }
      return null;
    }

    /**
     * Helper: Extract original filename from a file path
     * Handles both raw paths (/path/EA001622.JPG) and proxy paths (/path/EA001622_proxy.mov)
     */
    var extractOriginalFilename = function(filePath) {
      if (!filePath || filePath === '') {
        return null;
      }

      // Extract filename from path
      var pathParts = filePath.split('/');
      var filename = pathParts[pathParts.length - 1];

      // Remove _proxy suffix if present (proxy files are named EA001622_proxy.mov)
      filename = filename.replace(/_proxy(\.[^.]+)?$/, '$1');

      return filename;
    }

    /**
     * Helper: Read and parse JSON file, lookup clip metadata by ID
     * Uses originalFilename (from path) for lookup, NOT clip.name (which may be renamed)
     */
    var readJSONFromFileInline = function(jsonFile, originalFilename) {
      try {
        jsonFile.open('r');
        var jsonString = jsonFile.read();
        jsonFile.close();

        var jsonData = JSON.parse(jsonString);

        // Extract clipID from original filename (remove extension)
        var clipID = originalFilename.replace(/\.[^.]+$/, '');
        $.writeln('DEBUG JSON READ: Looking up clipID "' + clipID + '" from original filename "' + originalFilename + '"');

        var metadata = jsonData[clipID];

        if (metadata) {
          return JSON.stringify(metadata);
        } else {
          $.writeln('DEBUG JSON READ: clipID "' + clipID + '" not found in JSON');
          return 'null';
        }
      } catch (e) {
        $.writeln('ERROR in readJSONFromFileInline: ' + e.message);
        return 'null';
      }
    }

    /**
     * Read metadata from .ingest-metadata.json sidecar file
     * Looks in proxy folder first, falls back to raw media folder
     * CRITICAL: Uses original filename from path, NOT clip.name (which may be renamed)
     */
    var readJSONMetadataInline = function(clip, FileConstructor) {
      try {
        var proxyPath = clip.getProxyPath();
        var mediaPath = clip.getMediaPath();
        var folder = null;
        var originalFilename = null;

        // Extract original filename from available paths
        // Priority: mediaPath (raw) > proxyPath (may have _proxy suffix)
        if (mediaPath && mediaPath !== '') {
          originalFilename = extractOriginalFilename(mediaPath);
        } else if (proxyPath && proxyPath !== '') {
          originalFilename = extractOriginalFilename(proxyPath);
        }

        if (!originalFilename) {
          $.writeln('ERROR: Cannot determine original filename - both paths empty');
          return 'null';
        }

        $.writeln('DEBUG JSON READ: Original filename from path: "' + originalFilename + '" (clip.name: "' + clip.name + '")');

        // Priority 1: Proxy folder
        if (proxyPath && proxyPath !== '') {
          folder = proxyPath.substring(0, proxyPath.lastIndexOf('/'));
          var proxyJSONFile = new FileConstructor(folder + '/.ingest-metadata.json');
          if (proxyJSONFile.exists) {
            return readJSONFromFileInline(proxyJSONFile, originalFilename);
          }
        }

        // Priority 2: Raw media folder (fallback)
        if (mediaPath && mediaPath !== '') {
          folder = mediaPath.substring(0, mediaPath.lastIndexOf('/'));
          var jsonPath = folder + '/.ingest-metadata.json';
          var rawJSONFile = new FileConstructor(jsonPath);
          if (rawJSONFile.exists) {
            return readJSONFromFileInline(rawJSONFile, originalFilename);
          }
        }

        return 'null';
      } catch (e) {
        $.writeln('ERROR in readJSONMetadataInline: ' + e.message);
        return 'null';
      }
    }

    /**
     * Read metadata by nodeId
     */
    var readJSONMetadataByNodeIdInline = function(nodeId) {
      try {
        var project = app.project;
        if (!project) {
          return 'null';
        }

        var clip = findProjectItemByNodeIdInline(project.rootItem, nodeId);
        if (!clip) {
          return 'null';
        }

        return readJSONMetadataInline(clip, File);
      } catch (e) {
        return 'null';
      }
    }

    /**
     * Compute shotName from component metadata fields
     * Format: {location}-{subject}-{action}-{shotType}-#{shotNumber}
     */
    var computeShotNameInline = function(metadata) {
      if (!metadata) {
        return '';
      }

      var parts = [];

      if (metadata.location) {
        parts.push(metadata.location);
      }
      if (metadata.subject) {
        parts.push(metadata.subject);
      }
      if (metadata.action) {
        parts.push(metadata.action);
      }
      if (metadata.shotType) {
        parts.push(metadata.shotType);
      }

      var baseName = parts.join('-');

      if (metadata.shotNumber) {
        return baseName + '-#' + metadata.shotNumber;
      }

      return baseName;
    }

    /**
     * Helper: Write metadata updates to JSON file atomically
     * Uses temp file + rename pattern to prevent corruption
     * CRITICAL: Uses originalFilename (from path), NOT clip.name (which may be renamed)
     */
    var writeJSONToFileInline = function(jsonFile, originalFilename, updates) {
      try {
        // Read existing JSON
        jsonFile.open('r');
        var jsonString = jsonFile.read();
        jsonFile.close();

        // Parse JSON
        var jsonData = JSON.parse(jsonString);

        // Extract clip ID (remove extension)
        var clipID = originalFilename.replace(/\.[^.]+$/, '');
        $.writeln('DEBUG JSON WRITE: Writing to clipID "' + clipID + '" from original filename "' + originalFilename + '"');

        // Get existing metadata or create new entry
        var metadata = jsonData[clipID];
        if (!metadata) {
          metadata = {
            id: clipID,
            originalFilename: originalFilename
          };
        }

        // Merge updates into metadata
        for (var key in updates) {
          if (updates.hasOwnProperty(key) && updates[key] !== undefined) {
            metadata[key] = updates[key];
          }
        }

        // Compute shotName from updated fields
        metadata.shotName = computeShotNameInline(metadata);

        // Update audit fields
        metadata.modifiedAt = new Date().toISOString();
        metadata.modifiedBy = 'cep-panel';

        // Update JSON data
        jsonData[clipID] = metadata;

        // Write atomically (temp file + rename to prevent corruption)
        var folder = jsonFile.parent.fsName;
        var tempFile = new File(folder + '/.ingest-metadata.tmp.json');

        tempFile.open('w');
        tempFile.write(JSON.stringify(jsonData, null, 2)); // Pretty print
        tempFile.close();

        // Remove old file first (ExtendScript rename doesn't replace existing files)
        if (jsonFile.exists) {
          jsonFile.remove();
        }

        // Now rename temp file to original name
        tempFile.rename(jsonFile.name);

        $.writeln('DEBUG JSON WRITE: Successfully wrote metadata for ' + clipID);
        $.writeln('  shotName: ' + metadata.shotName);
        $.writeln('  modifiedAt: ' + metadata.modifiedAt);

        // Return computed shotName for Clip Name update
        return metadata.shotName || 'true';

      } catch (e) {
        $.writeln('ERROR writing JSON file: ' + e.message);
        return 'false';
      }
    }

    /**
     * Write metadata updates to JSON sidecar file
     * Priority: .ingest-metadata-pp.json first (ML feedback loop), .ingest-metadata.json fallback
     * Also updates Premiere Pro Clip Name with computed shotName
     * CRITICAL: Uses original filename from path, NOT clip.name (which may be renamed)
     *
     * ML Feedback Loop: PP edits go to -pp.json, preserving IA original for training diff
     */
    var writeJSONMetadataInline = function(clip, updates) {
      try {
        // Get paths
        var proxyPath = clip.getProxyPath();
        var mediaPath = clip.getMediaPath();
        var folder = null;
        var result = 'false';
        var originalFilename = null;

        // Extract original filename from available paths
        // Priority: mediaPath (raw) > proxyPath (may have _proxy suffix)
        if (mediaPath && mediaPath !== '') {
          originalFilename = extractOriginalFilename(mediaPath);
        } else if (proxyPath && proxyPath !== '') {
          originalFilename = extractOriginalFilename(proxyPath);
        }

        if (!originalFilename) {
          $.writeln('ERROR: Cannot determine original filename - both paths empty');
          return 'false';
        }

        $.writeln('DEBUG JSON WRITE: Original filename from path: "' + originalFilename + '" (clip.name: "' + clip.name + '")');

        // Try proxy folder first, then raw folder
        var foldersToTry = [];
        if (proxyPath && proxyPath !== '') {
          foldersToTry.push(proxyPath.substring(0, proxyPath.lastIndexOf('/')));
        }
        if (mediaPath && mediaPath !== '') {
          foldersToTry.push(mediaPath.substring(0, mediaPath.lastIndexOf('/')));
        }

        // For each folder, try -pp.json first, then .json
        for (var i = 0; i < foldersToTry.length && result === 'false'; i++) {
          folder = foldersToTry[i];

          // Priority 1: .ingest-metadata-pp.json (ML feedback - preserves IA original)
          var ppJsonFile = new File(folder + '/.ingest-metadata-pp.json');
          if (ppJsonFile.exists) {
            $.writeln('DEBUG JSON WRITE: Writing to PP edits file: ' + folder + '/.ingest-metadata-pp.json');
            result = writeJSONToFileInline(ppJsonFile, originalFilename, updates);
            continue;
          }

          // Priority 2: .ingest-metadata.json (fallback if no -pp.json exists)
          var iaJsonFile = new File(folder + '/.ingest-metadata.json');
          if (iaJsonFile.exists) {
            $.writeln('DEBUG JSON WRITE: Writing to IA file (no -pp.json): ' + folder + '/.ingest-metadata.json');
            result = writeJSONToFileInline(iaJsonFile, originalFilename, updates);
          }
        }

        // No JSON file found
        if (result === 'false') {
          $.writeln('ERROR: No .ingest-metadata.json or .ingest-metadata-pp.json found for writing');
          return 'false';
        }

        // Update Premiere Pro Clip Name with computed shotName
        // result contains the shotName from writeJSONToFileInline
        if (result && result !== 'true' && result !== 'false') {
          var shotName = result;
          clip.name = shotName;
          $.writeln('DEBUG: Updated Premiere Pro Clip Name to: ' + shotName);
        }

        return 'true';

      } catch (e) {
        $.writeln('ERROR in writeJSONMetadata: ' + e.message);
        return 'false';
      }
    }

    /**
     * Write metadata by nodeId
     * CEP Panel wrapper for Track A writeJSONMetadata
     */
    var writeJSONMetadataByNodeIdInline = function(nodeId, updatesJSON) {
      try {
        var project = app.project;
        if (!project) {
          $.writeln('ERROR: No active project');
          return 'false';
        }

        var clip = findProjectItemByNodeIdInline(project.rootItem, nodeId);
        if (!clip) {
          $.writeln('ERROR: Clip not found for nodeId: ' + nodeId);
          return 'false';
        }

        // Parse updates if it's a string (from CEP Panel)
        var updates = updatesJSON;
        if (typeof updatesJSON === 'string') {
          updates = JSON.parse(updatesJSON);
        }

        return writeJSONMetadataInline(clip, updates);
      } catch (e) {
        $.writeln('ERROR in writeJSONMetadataByNodeId: ' + e.message);
        return 'false';
      }
    }

    // ========================================================================
    // END INLINED IMPLEMENTATION
    // ========================================================================

    // Use inlined implementations
    var readJSONMetadataWrapper = function(mediaPath, FileConstructor) {
      return 'null'; // Not used in CEP panel, stub only
    };

    var writeJSONMetadataWrapper = function() {
      return 'false'; // Not used in CEP panel, stub only
    };

    var readJSONMetadataByNodeIdWrapper = function(nodeId) {
      return readJSONMetadataByNodeIdInline(nodeId);
    };

    var writeJSONMetadataByNodeIdWrapper = function(nodeId, updatesJSON) {
      return writeJSONMetadataByNodeIdInline(nodeId, updatesJSON);
    };
  }

  // Public API

  return {

    getSelectedClips: getSelectedClips,

    updateClipMetadata: updateClipMetadata,

    readJSONMetadata: readJSONMetadataWrapper,

    writeJSONMetadata: writeJSONMetadataWrapper,

    readJSONMetadataByNodeId: readJSONMetadataByNodeIdWrapper,

    writeJSONMetadataByNodeId: writeJSONMetadataByNodeIdWrapper,

    getAllProjectClips: getAllProjectClips,

    selectClip: selectClip,

    openInSourceMonitor: openInSourceMonitor,

    exportFrameAtTime: exportFrameAtTime,

    parseStructuredNaming: parseStructuredNaming

  };

})();



// Make functions available to CEP panel

EAVIngest;
