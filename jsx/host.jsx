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

        var project = app.project;

        if (!project) {

            return JSON.stringify({ error: "No active project" });

        }



        var clips = [];

        collectClipsRecursive(project.rootItem, clips);



        return JSON.stringify({

            clips: clips.map(function(item) {

                return {

                    nodeId: item.nodeId,

                    name: item.name,

                    treePath: item.treePath

                };

            })

        });

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

        parseStructuredNaming: parseStructuredNaming

    };

})();



// Make functions available to CEP panel

EAVIngest;
