// Metadata Panel: "Good" checkbox persists as `bestTake` in the JSON sidecar.
//
// Unlike the logic-mirroring tests elsewhere, this test executes the REAL
// js/metadata-panel.js against the REAL index-metadata.html markup in jsdom.
// ExtendScript is replaced by an in-memory sidecar store that merges written
// keys the same way jsx/host.jsx writeJSONToFileInline does.

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const PANEL_JS = fs.readFileSync(path.join(ROOT, 'js/metadata-panel.js'), 'utf8');
const PANEL_HTML = fs.readFileSync(path.join(ROOT, 'index-metadata.html'), 'utf8');
const BODY_HTML = PANEL_HTML
  .slice(PANEL_HTML.indexOf('<body>') + '<body>'.length, PANEL_HTML.indexOf('</body>'))
  .replace(/<script[\s\S]*?<\/script>/g, '');

const NODE_ID = 'node-001';
const CLIP = { nodeId: NODE_ID, name: 'EA001621.MOV' };

const CLIP_B = { nodeId: 'node-002', name: 'EA001622.MOV' };

const READ_RE = /^EAVIngest\.readJSONMetadataByNodeId\("((?:[^"\\]|\\.)*)"\)$/;
const WRITE_RE = /^EAVIngest\.writeJSONMetadataByNodeId\("((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\)$/;

// otherClips: optional { nodeId: metadata } for multi-clip navigation scenarios
function createFakeHost(initialMetadata, otherClips) {
  const store = Object.assign({ [NODE_ID]: Object.assign({}, initialMetadata) }, otherClips || {});
  const listeners = {};
  const writes = [];

  function respond(script) {
    if (script.indexOf('var CEP_EXTENSION_ROOT') === 0) {return 'undefined';}
    if (script.indexOf('try { $.evalFile') === 0) {return 'SUCCESS';}
    if (script === 'typeof EAVIngest') {return 'object';}
    if (script === 'typeof EAVIngest.readJSONMetadataByNodeId') {return 'function';}
    const read = script.match(READ_RE);
    if (read) {
      return store[read[1]] ? JSON.stringify(store[read[1]]) : 'null';
    }
    const write = script.match(WRITE_RE);
    if (write) {
      const updates = JSON.parse(JSON.parse('"' + write[2] + '"'));
      writes.push(updates);
      Object.assign(store[write[1]], updates); // mirrors host.jsx generic key merge
      return 'true';
    }
    return '';
  }

  class FakeCSInterface {
    getHostEnvironment() { return { appVersion: 'test' }; }
    getSystemPath() { return '/ext'; }
    evalScript(script, cb) { if (cb) {cb(respond(script));} }
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
    dispatchEvent() {}
  }

  return {
    store,
    writes,
    FakeCSInterface,
    selectClip(clip) {
      const target = clip || CLIP;
      (listeners['com.elevana.clip-selected'] || []).forEach(function(fn) {
        fn({ data: JSON.stringify({ clip: target, clipIndex: 0, totalClips: 1, filteredClips: [target] }) });
      });
    }
  };
}

function bootPanel(host) {
  document.body.innerHTML = BODY_HTML;
  global.CSInterface = host.FakeCSInterface;
  global.SystemPath = { EXTENSION: 'extension' };
  global.CSEvent = function(type, scope) { this.type = type; this.scope = scope; };
  // Execute the real panel script (IIFE auto-initialises on a ready document)
  new Function(PANEL_JS)();
}

const goodBox = () => document.getElementById('metadataGood');
const applyBtn = () => document.getElementById('applyBtn');

const IA_METADATA = {
  id: 'EA001621',
  originalFilename: 'EA001621.MOV',
  location: 'kitchen',
  subject: 'door',
  action: 'opening',
  shotType: 'WS',
  shotNumber: 1,
  keywords: ['door'],
  lockedFields: []
};

describe('Metadata Panel - Good checkbox persists as bestTake', () => {
  afterEach(() => {
    delete global.CSInterface;
    delete global.SystemPath;
    delete global.CSEvent;
  });

  it('loads a legacy clip without bestTake as unchecked (regression guard, passes pre/post)', () => {
    const host = createFakeHost(IA_METADATA);
    bootPanel(host);
    host.selectClip();
    expect(goodBox().checked).toBe(false);
  });

  it('loads bestTake: true as checked', () => {
    const host = createFakeHost(Object.assign({}, IA_METADATA, { bestTake: true }));
    bootPanel(host);
    host.selectClip();
    expect(goodBox().checked).toBe(true);
  });

  it('sends bestTake: true on Apply when the box is ticked', () => {
    const host = createFakeHost(IA_METADATA);
    bootPanel(host);
    host.selectClip();

    goodBox().checked = true;
    applyBtn().click();

    expect(host.writes).toHaveLength(1);
    expect(host.writes[0].bestTake).toBe(true);
  });

  it('sends bestTake: false on Apply when the box is cleared (un-marking a take)', () => {
    const host = createFakeHost(Object.assign({}, IA_METADATA, { bestTake: true }));
    bootPanel(host);
    host.selectClip();
    expect(goodBox().checked).toBe(true);  // precondition: loaded as ticked

    goodBox().checked = false;
    applyBtn().click();

    expect(host.writes[0].bestTake).toBe(false);
  });

  it('round-trips: ticked box survives Apply → reload', () => {
    const host = createFakeHost(IA_METADATA);
    bootPanel(host);
    host.selectClip();

    goodBox().checked = true;
    applyBtn().click();               // panel re-loads the clip after a successful write

    expect(host.store[NODE_ID].bestTake).toBe(true);
    expect(goodBox().checked).toBe(true);

    host.selectClip();                // navigate back to the clip
    expect(goodBox().checked).toBe(true);
  });

  it('does not carry a ticked box over to the next clip lacking bestTake', () => {
    const legacyClipB = Object.assign({}, IA_METADATA, { id: 'EA001622', originalFilename: 'EA001622.MOV' });
    const host = createFakeHost(
      Object.assign({}, IA_METADATA, { bestTake: true }),
      { [CLIP_B.nodeId]: legacyClipB }
    );
    bootPanel(host);

    host.selectClip(CLIP);
    expect(goodBox().checked).toBe(true);

    host.selectClip(CLIP_B);
    expect(goodBox().checked).toBe(false);
  });

  it('does not change the computed shotName (regression guard, passes pre/post)', () => {
    const host = createFakeHost(IA_METADATA);
    bootPanel(host);
    host.selectClip();

    goodBox().checked = true;
    applyBtn().click();

    expect(document.getElementById('shotNameDisplay').value).toBe('kitchen-door-opening-WS-#1');
  });
});
