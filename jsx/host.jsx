// ExtendScript for Premiere Pro

// Handles communication between the CEP panel and Premiere Pro



var EAVIngest = (function() {

    'use strict';



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



            // Update Tape Name field (survives offline)

            if (metadata.tapeName !== undefined) {

                item.setProjectColumnsMetadata(["Tape"], [metadata.tapeName]);

            }



            // Update Description field (survives offline)

            if (metadata.description !== undefined) {

                item.setProjectColumnsMetadata(["Description"], [metadata.description]);

            }



            // Update Shot field (survives offline)

            if (metadata.shot !== undefined) {

                item.setProjectColumnsMetadata(["Shot"], [metadata.shot]);

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

                try {

                    var colData = item.getProjectColumnsMetadata();

                    metadata.tapeName = colData.Tape || "";

                    metadata.description = colData.Description || "";

                    metadata.shot = colData.Shot || "";

                } catch (metaError) {

                    // Metadata access failed for this item, use defaults

                    metadata.tapeName = "";

                    metadata.description = "";

                    metadata.shot = "";

                }



                clipsData.push({

                    nodeId: item.nodeId,

                    name: item.name || "",

                    treePath: item.treePath || "",

                    mediaPath: item.getMediaPath() || "",

                    tapeName: metadata.tapeName,

                    description: metadata.description,

                    shot: metadata.shot

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
