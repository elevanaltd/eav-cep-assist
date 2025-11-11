// ExtendScript for Premiere Pro

// Handles communication between the CEP panel and Premiere Pro



var EAVIngest = (function() {

    'use strict';



    /**

     * Escape XML entities to prevent injection attacks

     * @param {string} str - Raw string value

     * @returns {string} XML-safe escaped string

     */

    function escapeXML(str) {

        if (!str) return '';

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

            return JSON.stringify({ error: "No active project" });

        }



        var selection = project.getSelection();

        if (!selection || selection.length === 0) {

            return JSON.stringify({ error: "No clips selected" });

        }



        var clips = [];

        for (var i = 0; i < selection.length; i++) {

            var item = selection[i];



            // Only process video/image items, not bins

            if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) {

                clips.push({

                    nodeId: item.nodeId,

                    name: item.name || "",

                    treePath: item.treePath || "",

                    mediaPath: item.getMediaPath() || "",

                    // Get existing metadata from PP fields

                    tapeName: item.getProjectColumnsMetadata().Tape || "",

                    description: item.getProjectColumnsMetadata().Description || "",

                    shot: item.getProjectColumnsMetadata().Shot || "",

                    // File info

                    videoFrameRate: item.getFootageInterpretation().frameRate || "",

                    duration: item.getOutPoint().seconds || 0,

                    type: item.type

                });

            }

        }



        if (clips.length === 0) {

            return JSON.stringify({ error: "No video/image clips in selection" });

        }



        return JSON.stringify({ clips: clips });

    }



    /**

     * Update PP project item metadata fields

     * Updates: Name, Tape Name, Description, Shot

     */

    function updateClipMetadata(nodeId, metadata) {

        var project = app.project;

        if (!project) {

            return JSON.stringify({ success: false, error: "No active project" });

        }



        // Find the project item by nodeId

        var item = findProjectItemByNodeId(project.rootItem, nodeId);

        if (!item) {

            return JSON.stringify({ success: false, error: "Clip not found" });

        }



        try {

            // Update Name field (visible in Project Panel)

            if (metadata.name !== undefined) {

                item.name = metadata.name;

            }



            // Update metadata via XMP

            try {

                var xmpString = item.getXMPMetadata();

                $.writeln("DEBUG SAVE: Got XMP (length: " + xmpString.length + ")");



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

                        regex: /<dc:identifier[^>]*>.*?<\/dc:identifier>/

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

                                dcBlockContent = dcBlockContent.replace(field.regex, field.value);

                            } else {

                                // Field doesn't exist - append it

                                dcBlockContent += field.value;

                            }

                            $.writeln("DEBUG SAVE: " + field.tag + " updated");

                        }



                        // Replace the entire DC block with updated content

                        var newDcBlock = dcBlockFull.substring(0, dcBlockFull.lastIndexOf('</rdf:Description>')) + dcBlockContent + '</rdf:Description>';

                        xmpString = xmpString.replace(dcBlockFull, newDcBlock);



                    } else {

                        // DC block doesn't exist - create it

                        var dcBlock = '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">';

                        for (var i = 0; i < dcFields.length; i++) {

                            dcBlock += dcFields[i].value;

                            $.writeln("DEBUG SAVE: " + dcFields[i].tag + " created");

                        }

                        dcBlock += '</rdf:Description>';



                        // Insert before closing </rdf:RDF>

                        xmpString = xmpString.replace(/<\/rdf:RDF>/, dcBlock + '</rdf:RDF>');

                    }

                }



                // ========== XMP NAMESPACE FIELDS ==========

                // Collect all XMP fields to update

                var xmpFields = [];

                if (metadata.shot !== undefined) {

                    xmpFields.push({

                        tag: 'xmp:Shot',

                        value: '<xmp:Shot>' + escapeXML(metadata.shot) + '</xmp:Shot>',

                        regex: /<xmp:Shot[^>]*>.*?<\/xmp:Shot>/

                    });

                }

                if (metadata.location !== undefined) {

                    xmpFields.push({

                        tag: 'xmp:Location',

                        value: '<xmp:Location>' + escapeXML(metadata.location) + '</xmp:Location>',

                        regex: /<xmp:Location[^>]*>.*?<\/xmp:Location>/

                    });

                }

                if (metadata.subject !== undefined) {

                    xmpFields.push({

                        tag: 'xmp:Subject',

                        value: '<xmp:Subject>' + escapeXML(metadata.subject) + '</xmp:Subject>',

                        regex: /<xmp:Subject[^>]*>.*?<\/xmp:Subject>/

                    });

                }

                if (metadata.action !== undefined) {

                    xmpFields.push({

                        tag: 'xmp:Action',

                        value: '<xmp:Action>' + escapeXML(metadata.action) + '</xmp:Action>',

                        regex: /<xmp:Action[^>]*>.*?<\/xmp:Action>/

                    });

                }



                // Update XMP fields in their namespace block

                if (xmpFields.length > 0) {

                    // Find the XMP rdf:Description block

                    var xmpBlockMatch = xmpString.match(/<rdf:Description[^>]*xmlns:xmp="http:\/\/ns\.adobe\.com\/xap\/1\.0\/"[^>]*>([\s\S]*?)<\/rdf:Description>/);



                    if (xmpBlockMatch) {

                        // XMP block exists - update fields within it

                        var xmpBlockContent = xmpBlockMatch[1];

                        var xmpBlockFull = xmpBlockMatch[0];



                        for (var i = 0; i < xmpFields.length; i++) {

                            var field = xmpFields[i];

                            if (xmpBlockContent.indexOf('<' + field.tag) > -1) {

                                // Field exists - replace it

                                xmpBlockContent = xmpBlockContent.replace(field.regex, field.value);

                            } else {

                                // Field doesn't exist - append it

                                xmpBlockContent += field.value;

                            }

                            $.writeln("DEBUG SAVE: " + field.tag + " updated");

                        }



                        // Replace the entire XMP block with updated content

                        var newXmpBlock = xmpBlockFull.substring(0, xmpBlockFull.lastIndexOf('</rdf:Description>')) + xmpBlockContent + '</rdf:Description>';

                        xmpString = xmpString.replace(xmpBlockFull, newXmpBlock);



                    } else {

                        // XMP block doesn't exist - create it

                        var xmpBlock = '<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">';

                        for (var i = 0; i < xmpFields.length; i++) {

                            xmpBlock += xmpFields[i].value;

                            $.writeln("DEBUG SAVE: " + xmpFields[i].tag + " created");

                        }

                        xmpBlock += '</rdf:Description>';



                        // Insert before closing </rdf:RDF>

                        xmpString = xmpString.replace(/<\/rdf:RDF>/, xmpBlock + '</rdf:RDF>');

                    }

                }



                item.setXMPMetadata(xmpString);

                $.writeln("DEBUG SAVE: XMP metadata updated");



            } catch (xmpError) {

                $.writeln("DEBUG SAVE ERROR: " + xmpError.toString());

            }



            return JSON.stringify({

                success: true,

                updatedName: item.name

            });

        } catch (e) {

            return JSON.stringify({

                success: false,

                error: "Failed to update metadata: " + e.toString()

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

        try {

            var project = app.project;

            if (!project) {

                return JSON.stringify({ error: "No active project" });

            }



            var clips = [];

            collectClipsRecursive(project.rootItem, clips);



            // Convert clips to JSON-friendly objects (ES3-compatible, no .map())

            var clipsData = [];

            for (var i = 0; i < clips.length; i++) {

                var item = clips[i];



                // Safely get metadata with try-catch per item

                var metadata = {};

                // Try reading from XMP metadata instead of Project Columns

                try {

                    var xmpString = item.getXMPMetadata();

                    $.writeln("DEBUG: Got XMP metadata (length: " + xmpString.length + ")");



                    // Parse XMP for Dublin Core description

                    var descMatch = xmpString.match(/<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>(.*?)<\/rdf:li>/);

                    if (descMatch) {

                        metadata.description = descMatch[1] || "";

                        $.writeln("DEBUG: Found description in XMP: '" + metadata.description + "'");

                    } else {

                        metadata.description = "";

                        $.writeln("DEBUG: No description found in XMP");

                    }



                    // Parse Dublin Core identifier (standard XMP field)

                    var identifierMatch = xmpString.match(/<dc:identifier>(.*?)<\/dc:identifier>/);

                    metadata.identifier = (identifierMatch && identifierMatch[1]) ? identifierMatch[1] : "";

                    $.writeln("DEBUG: Found identifier in XMP: '" + metadata.identifier + "'");



                    var shotMatch = xmpString.match(/<xmp:Shot>(.*?)<\/xmp:Shot>/);

                    metadata.shot = (shotMatch && shotMatch[1]) ? shotMatch[1] : "";



                    var sceneMatch = xmpString.match(/<xmp:Scene>(.*?)<\/xmp:Scene>/);

                    metadata.good = (sceneMatch && sceneMatch[1]) ? sceneMatch[1] : "";



                    // Parse Location, Subject, Action from XMP

                    var locationMatch = xmpString.match(/<xmp:Location>(.*?)<\/xmp:Location>/);

                    metadata.location = (locationMatch && locationMatch[1]) ? locationMatch[1] : "";



                    var subjectMatch = xmpString.match(/<xmp:Subject>(.*?)<\/xmp:Subject>/);

                    metadata.subject = (subjectMatch && subjectMatch[1]) ? subjectMatch[1] : "";



                    var actionMatch = xmpString.match(/<xmp:Action>(.*?)<\/xmp:Action>/);

                    metadata.action = (actionMatch && actionMatch[1]) ? actionMatch[1] : "";



                    $.writeln("DEBUG FINAL XMP VALUES for " + item.name + ":");

                    $.writeln("  identifier: '" + metadata.identifier + "'");

                    $.writeln("  description: '" + metadata.description + "'");

                    $.writeln("  shot: '" + metadata.shot + "'");

                    $.writeln("  good: '" + metadata.good + "'");

                    $.writeln("  location: '" + metadata.location + "'");

                    $.writeln("  subject: '" + metadata.subject + "'");

                    $.writeln("  action: '" + metadata.action + "'");



                } catch (xmpError) {

                    $.writeln("DEBUG XMP ERROR: " + xmpError.toString());

                    metadata.identifier = "";

                    metadata.description = "";

                    metadata.shot = "";

                    metadata.good = "";

                    metadata.location = "";

                    metadata.subject = "";

                    metadata.action = "";

                }



                clipsData.push({

                    nodeId: item.nodeId,

                    name: item.name || "",

                    treePath: item.treePath || "",

                    mediaPath: item.getMediaPath() || "",

                    identifier: metadata.identifier,

                    description: metadata.description,

                    shot: metadata.shot,

                    good: metadata.good,

                    location: metadata.location,

                    subject: metadata.subject,

                    action: metadata.action

                });

            }



            return JSON.stringify({ clips: clipsData });

        } catch (e) {

            return JSON.stringify({

                error: "getAllProjectClips failed",

                details: e.toString(),

                message: e.message || "Unknown error"

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

            return JSON.stringify({ success: false, error: "No active project" });

        }



        var item = findProjectItemByNodeId(project.rootItem, nodeId);

        if (!item) {

            return JSON.stringify({ success: false, error: "Clip not found" });

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

            return JSON.stringify({ success: false, error: "No active project" });

        }



        var item = findProjectItemByNodeId(project.rootItem, nodeId);

        if (!item) {

            return JSON.stringify({ success: false, error: "Clip not found" });

        }



        try {

            // Open in Source Monitor

            app.sourceMonitor.openProjectItem(item);

            return JSON.stringify({ success: true });

        } catch (e) {

            return JSON.stringify({

                success: false,

                error: "Failed to open in Source Monitor: " + e.toString()

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

            return JSON.stringify({ success: false, error: "No active project" });

        }



        var item = findProjectItemByNodeId(project.rootItem, nodeId);

        if (!item) {

            return JSON.stringify({ success: false, error: "Clip not found" });

        }



        try {

            // Create a temporary folder for frame exports

            var tempFolder = Folder.temp + "/eav-cep-frames";

            var folder = new Folder(tempFolder);

            if (!folder.exists) {

                folder.create();

            }



            // Generate unique filename

            var timestamp = new Date().getTime();

            var outputPath = tempFolder + "/frame-" + nodeId + "-" + timestamp + ".jpg";



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

                        method: "encoder API"

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

                        method: "exportFramePNG"

                    });

                }

            }



            // Method 3: Ultimate fallback - return media path

            // CEP panel will handle frame extraction client-side if needed

            return JSON.stringify({

                success: false,

                error: "Frame export API not available in this PP version",

                fallback: "use_media_path",

                mediaPath: item.getMediaPath(),

                timeInSeconds: timeInSeconds

            });



        } catch (e) {

            return JSON.stringify({

                success: false,

                error: "Failed to export frame: " + e.toString(),

                details: "Time: " + timeInSeconds + "s"

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

        var id = idMatch ? idMatch[1] : "";



        return JSON.stringify({

            id: id,

            originalFilename: filename

        });

    }



    // Public API

    return {

        getSelectedClips: getSelectedClips,

        updateClipMetadata: updateClipMetadata,

        getAllProjectClips: getAllProjectClips,

        selectClip: selectClip,

        openInSourceMonitor: openInSourceMonitor,

        exportFrameAtTime: exportFrameAtTime,

        parseStructuredNaming: parseStructuredNaming

    };

})();



// Make functions available to CEP panel

EAVIngest;
