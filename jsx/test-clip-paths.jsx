// Test script: What paths does Premiere Pro expose for clips with proxies?
// Run this from ExtendScript Toolkit or PP Console

function testClipPaths() {
    if (!app.project || !app.project.rootItem) {
        return "ERROR: No project open";
    }

    var results = [];

    // Get all project items
    function walkProjectItems(item, depth) {
        if (!item) return;

        // Check if this is a clip (not a bin)
        if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) {
            var info = {
                name: item.name,
                tapeName: "",
                mediaPath: "",
                proxyPath: "",
                hasProxy: false
            };

            // Try to get Tape Name (immutable ID)
            try {
                info.tapeName = item.getProjectMetadata().tapeName || "N/A";
            } catch(e) {
                info.tapeName = "ERROR: " + e.message;
            }

            // Try to get media path
            try {
                info.mediaPath = item.getMediaPath() || "N/A";
            } catch(e) {
                info.mediaPath = "ERROR: " + e.message;
            }

            // Try to get proxy path (if attached)
            try {
                if (item.hasProxy && item.hasProxy()) {
                    info.hasProxy = true;
                    // Try different methods to get proxy path
                    if (item.getProxyPath) {
                        info.proxyPath = item.getProxyPath();
                    } else if (item.proxyMediaPath) {
                        info.proxyPath = item.proxyMediaPath;
                    } else {
                        info.proxyPath = "PROXY EXISTS but no getter";
                    }
                } else {
                    info.proxyPath = "No proxy attached";
                }
            } catch(e) {
                info.proxyPath = "ERROR: " + e.message;
            }

            results.push(info);
        }

        // Recurse into bins
        if (item.children && item.children.numItems > 0) {
            for (var i = 0; i < item.children.numItems; i++) {
                walkProjectItems(item.children[i], depth + 1);
            }
        }
    }

    walkProjectItems(app.project.rootItem, 0);

    // Format results
    var output = "=== CLIP PATH ANALYSIS ===\n\n";
    for (var i = 0; i < results.length; i++) {
        var clip = results[i];
        output += "Clip: " + clip.name + "\n";
        output += "  Tape Name: " + clip.tapeName + "\n";
        output += "  Media Path: " + clip.mediaPath + "\n";
        output += "  Has Proxy: " + clip.hasProxy + "\n";
        output += "  Proxy Path: " + clip.proxyPath + "\n";
        output += "\n";
    }

    return output;
}

// Run the test
var result = testClipPaths();
$.writeln(result);
result;  // Return for ExtendScript Toolkit
