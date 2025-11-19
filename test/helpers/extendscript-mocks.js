// ExtendScript API mocks for testing Track A functions
// These mocks simulate Adobe Premiere Pro ExtendScript APIs

import * as fs from 'fs';
import * as path from 'path';

/**
 * Mock ExtendScript File object
 * Simulates Adobe File API for JSON file operations
 */
export class MockFile {
  constructor(filePath) {
    this.fsName = filePath;
    this.name = path.basename(filePath);
    this._content = null;
    this._isOpen = false;
  }

  get exists() {
    try {
      return fs.existsSync(this.fsName);
    } catch (e) {
      return false;
    }
  }

  get parent() {
    return new MockFolder(path.dirname(this.fsName));
  }

  open(mode) {
    this._isOpen = true;
    if (mode === 'r' && this.exists) {
      try {
        this._content = fs.readFileSync(this.fsName, 'utf8');
        return true;
      } catch (e) {
        return false;
      }
    }
    if (mode === 'w') {
      this._content = '';
      return true;
    }
    return false;
  }

  read() {
    if (!this._isOpen) {
      throw new Error('File not open');
    }
    return this._content || '';
  }

  write(text) {
    if (!this._isOpen) {
      throw new Error('File not open');
    }
    this._content = text;
    return true;
  }

  close() {
    if (this._isOpen && this._content !== null) {
      try {
        fs.writeFileSync(this.fsName, this._content, 'utf8');
      } catch (e) {
        // Ignore write errors in tests
      }
    }
    this._isOpen = false;
  }

  remove() {
    try {
      if (this.exists) {
        fs.unlinkSync(this.fsName);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  rename(newName) {
    try {
      const newPath = path.join(path.dirname(this.fsName), newName);
      fs.renameSync(this.fsName, newPath);
      this.fsName = newPath;
      this.name = newName;
      return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * Mock ExtendScript Folder object
 */
export class MockFolder {
  constructor(folderPath) {
    this.fsName = folderPath;
  }

  get exists() {
    try {
      return fs.existsSync(this.fsName);
    } catch (e) {
      return false;
    }
  }

  get parent() {
    return new MockFolder(path.dirname(this.fsName));
  }
}

/**
 * Mock Premiere Pro ProjectItem (clip)
 */
export class MockProjectItem {
  constructor(config = {}) {
    this.name = config.name || 'TestClip.MOV';
    this.nodeId = config.nodeId || 'mock-node-id-123';
    this.type = 1; // CLIP type
    this._mediaPath = config.mediaPath || '/test-videos-raw/TestClip.MOV';
    this._proxyPath = config.proxyPath || '';
    this._metadata = config.metadata || {};
  }

  getMediaPath() {
    return this._mediaPath;
  }

  getProxyPath() {
    return this._proxyPath;
  }

  hasProxy() {
    return this._proxyPath !== '';
  }

  getProjectMetadata() {
    return JSON.stringify(this._metadata);
  }

  setProjectMetadata(metadata, fields) {
    this._metadata = JSON.parse(metadata);
  }
}

/**
 * Mock ExtendScript $ global
 */
export class MockExtendScriptGlobal {
  constructor() {
    this.logs = [];
  }

  writeln(message) {
    this.logs.push(message);
    // Optionally output to console for debugging
    // console.log('[ExtendScript]', message);
  }

  clearLogs() {
    this.logs = [];
  }

  getLogsByPrefix(prefix) {
    return this.logs.filter(log => log.startsWith(prefix));
  }
}

/**
 * Mock Premiere Pro app.project
 */
export class MockProject {
  constructor() {
    this.rootItem = new MockProjectItem({
      name: 'Root',
      nodeId: 'root',
      type: 2 // ROOT type
    });
    this._items = new Map();
  }

  addItem(nodeId, item) {
    this._items.set(nodeId, item);
  }

  getItemByNodeId(nodeId) {
    return this._items.get(nodeId) || null;
  }
}

/**
 * Setup ExtendScript globals for testing
 * Call this in beforeEach() to initialize mocked globals
 */
export function setupExtendScriptGlobals(config = {}) {
  const $ = new MockExtendScriptGlobal();
  const project = new MockProject();

  // Add any predefined clips
  if (config.clips) {
    config.clips.forEach(clip => {
      project.addItem(clip.nodeId, clip);
    });
  }

  return {
    $,
    app: {
      project
    },
    File: MockFile,
    Folder: MockFolder,
    JSON: global.JSON // Use native JSON
  };
}

/**
 * Helper to find project item by nodeId (mimics jsx/host.jsx helper)
 */
export function findProjectItemByNodeId(rootItem, targetNodeId, project) {
  // Simple mock implementation - just look in project._items
  return project.getItemByNodeId(targetNodeId);
}
