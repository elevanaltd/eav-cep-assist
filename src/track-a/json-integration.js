/**
 * Track A: JSON Sidecar Integration
 *
 * Pure JavaScript implementation of JSON metadata read/write functions.
 * This file is:
 * 1. Tested directly in Vitest (ES6)
 * 2. Transpiled to ES3 for ExtendScript (via Babel)
 * 3. Included in jsx/host.jsx as production code
 *
 * Schema: R1.1 (see .coord/docs/005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md)
 */

/**
 * Compute shotName from component metadata fields
 * Format: {location}-{subject}-{action}-{shotType}-#{shotNumber}
 * @param {Object} metadata - Clip metadata object
 * @returns {String} Computed shotName
 */
export function computeShotName(metadata) {
  if (!metadata) {
    return '';
  }

  const parts = [];

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

  const baseName = parts.join('-');

  if (metadata.shotNumber) {
    return baseName + '-#' + metadata.shotNumber;
  }

  return baseName;
}

/**
 * Helper: Read and parse JSON file, lookup clip metadata by ID
 * @param {File} jsonFile - ExtendScript File object
 * @param {String} clipName - Clip filename (e.g., "EAV0TEST3.MOV")
 * @param {Object} $ - ExtendScript global (optional for logging)
 * @returns {String} JSON string of metadata or "null"
 */
export function readJSONFromFile(jsonFile, clipName, $) {
  try {
    // Read file contents
    jsonFile.open('r');
    const jsonString = jsonFile.read();
    jsonFile.close();

    // Parse JSON
    const jsonData = JSON.parse(jsonString);

    // Extract clip ID (remove file extension)
    // "EAV0TEST3.MOV" → "EAV0TEST3"
    const clipID = clipName.replace(/\.[^.]+$/, '');

    // Lookup metadata for this clip
    const metadata = jsonData[clipID];

    if (!metadata) {
      if ($) {
        $.writeln('WARNING: Clip ID "' + clipID + '" not found in JSON');
      }
      return 'null';
    }

    // Compute shotName if missing (defensive programming)
    if (!metadata.shotName) {
      metadata.shotName = computeShotName(metadata);
      if ($) {
        $.writeln('INFO: shotName computed client-side: ' + metadata.shotName);
      }
    }

    // Return as JSON string (for CEP panel consumption)
    return JSON.stringify(metadata);

  } catch (e) {
    if ($) {
      $.writeln('ERROR parsing JSON file: ' + e.message);
    }
    return 'null';
  }
}

/**
 * Read metadata from JSON sidecar files
 * Prioritizes PP edits file (.ingest-metadata-pp.json) over IA original (.ingest-metadata.json)
 * Looks in proxy folder first, falls back to raw media folder
 * Computes shotName client-side if missing from JSON
 * @param {ProjectItem} clip - Premiere Pro clip object
 * @param {Function} FileConstructor - File constructor (ExtendScript File or mock)
 * @param {Object} $ - ExtendScript global (optional for logging)
 * @returns {String} JSON string of metadata object or "null" if not found
 */
export function readJSONMetadata(clip, FileConstructor, $) {
  try {
    // Get proxy path (preferred - proxy folders usually online)
    const proxyPath = clip.getProxyPath();
    let folder = null;

    // Priority 1: Proxy folder (PP edits first, then IA original)
    if (proxyPath && proxyPath !== '') {
      folder = proxyPath.substring(0, proxyPath.lastIndexOf('/'));

      // Try PP edits file first (user corrections take precedence)
      const proxyPPFile = new FileConstructor(folder + '/.ingest-metadata-pp.json');
      if (proxyPPFile.exists) {
        if ($) {
          $.writeln('DEBUG JSON: Reading from proxy folder (.ingest-metadata-pp.json): ' + folder);
        }
        const ppResult = readJSONFromFile(proxyPPFile, clip.name, $);
        if (ppResult !== 'null') {
          return ppResult;  // Clip found in PP file
        }
        // Clip not in PP file - fall through to check IA file
      }

      // Fall back to IA original
      const proxyJSONFile = new FileConstructor(folder + '/.ingest-metadata.json');
      if (proxyJSONFile.exists) {
        if ($) {
          $.writeln('DEBUG JSON: Reading from proxy folder (.ingest-metadata.json): ' + folder);
        }
        return readJSONFromFile(proxyJSONFile, clip.name, $);
      }
    }

    // Priority 2: Raw media folder (PP edits first, then IA original)
    const mediaPath = clip.getMediaPath();
    if (mediaPath && mediaPath !== '') {
      folder = mediaPath.substring(0, mediaPath.lastIndexOf('/'));

      // Try PP edits file first (user corrections take precedence)
      const rawPPFile = new FileConstructor(folder + '/.ingest-metadata-pp.json');
      if (rawPPFile.exists) {
        if ($) {
          $.writeln('DEBUG JSON: Reading from raw folder (.ingest-metadata-pp.json): ' + folder);
        }
        const ppResult = readJSONFromFile(rawPPFile, clip.name, $);
        if (ppResult !== 'null') {
          return ppResult;  // Clip found in PP file
        }
        // Clip not in PP file - fall through to check IA file
      }

      // Fall back to IA original
      const rawJSONFile = new FileConstructor(folder + '/.ingest-metadata.json');
      if (rawJSONFile.exists) {
        if ($) {
          $.writeln('DEBUG JSON: Reading from raw folder (.ingest-metadata.json): ' + folder);
        }
        return readJSONFromFile(rawJSONFile, clip.name, $);
      }
    }

    // No JSON file found
    if ($) {
      $.writeln('WARNING: No .ingest-metadata.json found for clip: ' + clip.name);
    }
    return 'null';

  } catch (e) {
    if ($) {
      $.writeln('ERROR in readJSONMetadata: ' + e.message);
    }
    return 'null';
  }
}

/**
 * Helper: Write metadata updates to JSON file atomically
 * @param {File} jsonFile - ExtendScript File object
 * @param {String} clipName - Clip filename (e.g., "EAV0TEST3.MOV")
 * @param {Object} updates - Metadata fields to update
 * @param {Object} $ - ExtendScript global (optional for logging)
 * @returns {String} "true" if successful, "false" if failed
 */
export function writeJSONToFile(jsonFile, clipName, updates, $) {
  try {
    // Read existing JSON
    jsonFile.open('r');
    const jsonString = jsonFile.read();
    jsonFile.close();

    // Parse JSON
    const jsonData = JSON.parse(jsonString);

    // Extract clip ID (remove extension)
    const clipID = clipName.replace(/\.[^.]+$/, '');

    // Get existing metadata or create new entry
    let metadata = jsonData[clipID] || {
      id: clipID,
      originalFilename: clipName
    };

    // Merge updates into metadata
    for (const key in updates) {
      if (updates[key] !== undefined) {
        metadata[key] = updates[key];
      }
    }

    // Compute shotName from updated fields
    metadata.shotName = computeShotName(metadata);

    // Update audit fields
    metadata.modifiedAt = new Date().toISOString();
    metadata.modifiedBy = 'cep-panel';

    // Update JSON data
    jsonData[clipID] = metadata;

    // Write atomically (temp file + rename to prevent corruption)
    const folder = jsonFile.parent.fsName;
    const FileConstructor = jsonFile.constructor;
    const tempFile = new FileConstructor(folder + '/.ingest-metadata.tmp.json');

    tempFile.open('w');
    tempFile.write(JSON.stringify(jsonData, null, 2)); // Pretty print
    tempFile.close();

    // Remove old file first (ExtendScript rename doesn't replace existing files)
    if (jsonFile.exists) {
      jsonFile.remove();
    }

    // Now rename temp file to original name
    tempFile.rename(jsonFile.name);

    if ($) {
      $.writeln('DEBUG JSON WRITE: Successfully wrote metadata for ' + clipID);
      $.writeln('  shotName: ' + metadata.shotName);
      $.writeln('  modifiedAt: ' + metadata.modifiedAt);
    }

    return 'true';

  } catch (e) {
    if ($) {
      $.writeln('ERROR writing JSON file: ' + e.message);
    }
    return 'false';
  }
}

/**
 * Write metadata updates to .ingest-metadata.json sidecar file
 * Uses atomic write (temp file + rename) to prevent corruption
 * Updates modifiedAt timestamp and modifiedBy field
 * Computes shotName from component fields if not provided
 * @param {ProjectItem} clip - Premiere Pro clip object
 * @param {Object} updates - Metadata fields to update (location, subject, action, etc.)
 * @param {Function} FileConstructor - File constructor (ExtendScript File or mock)
 * @param {Object} $ - ExtendScript global (optional for logging)
 * @returns {String} "true" if successful, "false" if failed
 */
export function writeJSONMetadata(clip, updates, FileConstructor, $) {
  try {
    // Get proxy path (preferred - write to proxy folder)
    const proxyPath = clip.getProxyPath();
    let folder = null;
    let jsonFilePath = null;

    // Priority 1: Proxy folder
    if (proxyPath && proxyPath !== '') {
      folder = proxyPath.substring(0, proxyPath.lastIndexOf('/'));
      jsonFilePath = folder + '/.ingest-metadata.json';
      const proxyJSONFile = new FileConstructor(jsonFilePath);

      if (proxyJSONFile.exists) {
        if ($) {
          $.writeln('DEBUG JSON WRITE: Writing to proxy folder: ' + folder);
        }
        return writeJSONToFile(proxyJSONFile, clip.name, updates, $);
      }
    }

    // Priority 2: Raw media folder (fallback)
    const mediaPath = clip.getMediaPath();
    if (mediaPath && mediaPath !== '') {
      folder = mediaPath.substring(0, mediaPath.lastIndexOf('/'));
      jsonFilePath = folder + '/.ingest-metadata.json';
      const rawJSONFile = new FileConstructor(jsonFilePath);

      if (rawJSONFile.exists) {
        if ($) {
          $.writeln('DEBUG JSON WRITE: Writing to raw folder: ' + folder);
        }
        return writeJSONToFile(rawJSONFile, clip.name, updates, $);
      }
    }

    // No JSON file found
    if ($) {
      $.writeln('ERROR: No .ingest-metadata.json found for writing');
    }
    return 'false';

  } catch (e) {
    if ($) {
      $.writeln('ERROR in writeJSONMetadata: ' + e.message);
    }
    return 'false';
  }
}

/**
 * CEP Panel Wrapper: Read JSON metadata by nodeId
 * @param {String} nodeId - Premiere Pro clip node ID
 * @param {Object} app - Premiere Pro app object
 * @param {Function} findProjectItemByNodeId - Helper to find clip by nodeId
 * @param {Function} FileConstructor - File constructor
 * @param {Object} $ - ExtendScript global (optional for logging)
 * @returns {String} JSON string or "null"
 */
export function readJSONMetadataByNodeId(nodeId, app, findProjectItemByNodeId, FileConstructor, $) {
  try {
    const project = app.project;
    if (!project) {
      if ($) {
        $.writeln('ERROR: No active project');
      }
      return 'null';
    }

    // Find clip by nodeId
    const clip = findProjectItemByNodeId(project.rootItem, nodeId, project);
    if (!clip) {
      if ($) {
        $.writeln('ERROR: Clip not found for nodeId: ' + nodeId);
      }
      return 'null';
    }

    // Call Track A function with clip object
    return readJSONMetadata(clip, FileConstructor, $);
  } catch (e) {
    if ($) {
      $.writeln('ERROR in readJSONMetadataByNodeId: ' + e.message);
    }
    return 'null';
  }
}

/**
 * CEP Panel Wrapper: Write JSON metadata by nodeId
 * @param {String} nodeId - Premiere Pro clip node ID
 * @param {String} updatesJSON - JSON string of updates (will be parsed)
 * @param {Object} app - Premiere Pro app object
 * @param {Function} findProjectItemByNodeId - Helper to find clip by nodeId
 * @param {Function} FileConstructor - File constructor
 * @param {Object} $ - ExtendScript global (optional for logging)
 * @returns {String} 'true' or 'false'
 */
export function writeJSONMetadataByNodeId(nodeId, updatesJSON, app, findProjectItemByNodeId, FileConstructor, $) {
  try {
    const project = app.project;
    if (!project) {
      if ($) {
        $.writeln('ERROR: No active project');
      }
      return 'false';
    }

    // Find clip by nodeId
    const clip = findProjectItemByNodeId(project.rootItem, nodeId, project);
    if (!clip) {
      if ($) {
        $.writeln('ERROR: Clip not found for nodeId: ' + nodeId);
      }
      return 'false';
    }

    // Parse updates if it's a string (from CEP Panel)
    let updates = updatesJSON;
    if (typeof updatesJSON === 'string') {
      updates = JSON.parse(updatesJSON);
    }

    // Call Track A function with clip object
    return writeJSONMetadata(clip, updates, FileConstructor, $);
  } catch (e) {
    if ($) {
      $.writeln('ERROR in writeJSONMetadataByNodeId: ' + e.message);
    }
    return 'false';
  }
}
