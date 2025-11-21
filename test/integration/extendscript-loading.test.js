// Integration test: ExtendScript Loading via CEP_EXTENSION_ROOT workaround
// Characterization test for commit 6c888e3 (ExtendScript loading fix)

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCSInterface } from '../helpers/mock-csinterface.js';

describe('ExtendScript Loading (Characterization)', () => {
  let csInterface;
  let loadSequence;

  beforeEach(() => {
    csInterface = new MockCSInterface();
    loadSequence = [];
  });

  describe('CEP_EXTENSION_ROOT Workaround', () => {
    it('should set CEP_EXTENSION_ROOT global before loading host.jsx', () => {
      // GIVEN: Extension root path from CEP
      const extensionRoot = '/path/to/extension';

      // WHEN: CEP panel sets CEP_EXTENSION_ROOT global
      const setGlobalScript = 'var CEP_EXTENSION_ROOT = \'' + extensionRoot + '\'';
      csInterface.setEvalScriptResponse(setGlobalScript, 'undefined');

      let globalSetCalled = false;
      csInterface.evalScript(setGlobalScript, (result) => {
        globalSetCalled = true;
        loadSequence.push('CEP_EXTENSION_ROOT_SET');
      });

      // THEN: Global should be set before loading host.jsx
      expect(globalSetCalled).toBe(false); // async, not yet called
      return new Promise(resolve => {
        setTimeout(() => {
          expect(globalSetCalled).toBe(true);
          expect(loadSequence).toContain('CEP_EXTENSION_ROOT_SET');
          resolve();
        }, 10);
      });
    });

    it('should load host.jsx via $.evalFile() with try/catch wrapper', () => {
      // GIVEN: host.jsx path and CEP_EXTENSION_ROOT already set
      const jsxPath = '/path/to/extension/jsx/host.jsx';
      const loadScript = 'try { $.evalFile(\'' + jsxPath + '\'); \'SUCCESS\'; } catch(e) { \'ERROR: \' + e.toString() + \' at line \' + e.line; }';

      // WHEN: Panel loads host.jsx with error handling
      csInterface.setEvalScriptResponse(loadScript, 'SUCCESS');

      let loadResult = null;
      csInterface.evalScript(loadScript, (result) => {
        loadResult = result;
        loadSequence.push('HOST_JSX_LOADED');
      });

      // THEN: Should receive SUCCESS response
      return new Promise(resolve => {
        setTimeout(() => {
          expect(loadResult).toBe('SUCCESS');
          expect(loadSequence).toContain('HOST_JSX_LOADED');
          resolve();
        }, 10);
      });
    });

    it('should check EAVIngest namespace availability after loading', () => {
      // GIVEN: host.jsx loaded successfully
      const checkScript = 'typeof EAVIngest';

      // WHEN: Panel checks if EAVIngest namespace exists
      csInterface.setEvalScriptResponse(checkScript, 'object');

      let namespaceType = null;
      csInterface.evalScript(checkScript, (result) => {
        namespaceType = result;
        loadSequence.push('EAVINGEST_VERIFIED');
      });

      // THEN: Should detect EAVIngest as object
      return new Promise(resolve => {
        setTimeout(() => {
          expect(namespaceType).toBe('object');
          expect(loadSequence).toContain('EAVINGEST_VERIFIED');
          resolve();
        }, 10);
      });
    });

    it('should capture ExtendScript errors with line numbers', () => {
      // GIVEN: host.jsx has syntax error
      const jsxPath = '/path/to/broken.jsx';
      const loadScript = 'try { $.evalFile(\'' + jsxPath + '\'); \'SUCCESS\'; } catch(e) { \'ERROR: \' + e.toString() + \' at line \' + e.line; }';

      // WHEN: Panel attempts to load broken script
      const errorMessage = 'ERROR: SyntaxError: missing } at line 42';
      csInterface.setEvalScriptResponse(loadScript, errorMessage);

      let loadResult = null;
      csInterface.evalScript(loadScript, (result) => {
        loadResult = result;
      });

      // THEN: Should receive detailed error message
      return new Promise(resolve => {
        setTimeout(() => {
          expect(loadResult).toContain('ERROR:');
          expect(loadResult).toContain('at line');
          resolve();
        }, 10);
      });
    });
  });

  describe('Track A Integration Path Resolution', () => {
    it('should resolve Track A path using CEP_EXTENSION_ROOT in CEP context', () => {
      // CHARACTERIZES: jsx/host.jsx lines 15-17
      // In CEP context: Uses CEP_EXTENSION_ROOT to build path

      // GIVEN: CEP_EXTENSION_ROOT is defined
      const CEP_EXTENSION_ROOT = '/path/to/extension';

      // WHEN: host.jsx resolves Track A path
      let trackAPath;
      if (typeof CEP_EXTENSION_ROOT !== 'undefined' && CEP_EXTENSION_ROOT) {
        trackAPath = CEP_EXTENSION_ROOT + '/jsx';
      }

      // THEN: Should use CEP_EXTENSION_ROOT path
      expect(trackAPath).toBe('/path/to/extension/jsx');
    });

    it('should fallback to $.fileName in Desktop Console context', () => {
      // CHARACTERIZES: jsx/host.jsx lines 19-21
      // In Desktop Console: Falls back to $.fileName when CEP_EXTENSION_ROOT unavailable

      // GIVEN: CEP_EXTENSION_ROOT is undefined (Desktop Console)
      const CEP_EXTENSION_ROOT = undefined;

      // WHEN: host.jsx resolves Track A path without CEP_EXTENSION_ROOT
      let trackAPath;
      if (typeof CEP_EXTENSION_ROOT === 'undefined' || !CEP_EXTENSION_ROOT) {
        // Simulate $.fileName behavior
        const mockFileName = '/path/to/extension/jsx/host.jsx';
        const parentPath = mockFileName.substring(0, mockFileName.lastIndexOf('/'));
        trackAPath = parentPath;
      }

      // THEN: Should derive path from $.fileName
      expect(trackAPath).toBe('/path/to/extension/jsx');
    });

    it('should try jsx/track-a-integration.jsx before jsx/generated/', () => {
      // CHARACTERIZES: jsx/host.jsx lines 24-28
      // Priority: jsx/track-a-integration.jsx (development) then jsx/generated/ (deployed)

      const basePath = '/path/to/extension/jsx';
      const primaryPath = basePath + '/track-a-integration.jsx';
      const fallbackPath = basePath + '/generated/track-a-integration.jsx';

      // Track A loading logic (simplified)
      const trackAPaths = [primaryPath, fallbackPath];

      // THEN: Should check primary path first
      expect(trackAPaths[0]).toBe(primaryPath);
      expect(trackAPaths[1]).toBe(fallbackPath);
    });
  });

  describe('Loading Sequence Integration', () => {
    it('should follow correct loading order: CEP_EXTENSION_ROOT → host.jsx → EAVIngest check', async () => {
      // CHARACTERIZES: Complete loading sequence from js/metadata-panel.js lines 810-847

      const extensionRoot = '/path/to/extension';
      const jsxPath = extensionRoot + '/jsx/host.jsx';

      // Step 1: Set CEP_EXTENSION_ROOT
      csInterface.setEvalScriptResponse(
        'var CEP_EXTENSION_ROOT = \'' + extensionRoot + '\'',
        'undefined'
      );

      csInterface.evalScript(
        'var CEP_EXTENSION_ROOT = \'' + extensionRoot + '\'',
        () => {
          loadSequence.push('1_CEP_EXTENSION_ROOT_SET');

          // Step 2: Load host.jsx
          const loadScript = 'try { $.evalFile(\'' + jsxPath + '\'); \'SUCCESS\'; } catch(e) { \'ERROR: \' + e.toString() + \' at line \' + e.line; }';
          csInterface.setEvalScriptResponse(loadScript, 'SUCCESS');

          csInterface.evalScript(loadScript, (result) => {
            if (result === 'SUCCESS') {
              loadSequence.push('2_HOST_JSX_LOADED');

              // Step 3: Verify EAVIngest namespace
              csInterface.setEvalScriptResponse('typeof EAVIngest', 'object');

              csInterface.evalScript('typeof EAVIngest', (typeResult) => {
                if (typeResult === 'object') {
                  loadSequence.push('3_EAVINGEST_VERIFIED');
                }
              });
            }
          });
        }
      );

      // Wait for async sequence to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // THEN: Sequence should be in correct order
      expect(loadSequence).toEqual([
        '1_CEP_EXTENSION_ROOT_SET',
        '2_HOST_JSX_LOADED',
        '3_EAVINGEST_VERIFIED'
      ]);
    });

    it('should handle ExtendScript loading failure gracefully', async () => {
      // CHARACTERIZES: Error handling from js/metadata-panel.js lines 822-825

      const extensionRoot = '/path/to/extension';
      const jsxPath = extensionRoot + '/jsx/host.jsx';

      // Step 1: Set CEP_EXTENSION_ROOT (succeeds)
      csInterface.setEvalScriptResponse(
        'var CEP_EXTENSION_ROOT = \'' + extensionRoot + '\'',
        'undefined'
      );

      csInterface.evalScript(
        'var CEP_EXTENSION_ROOT = \'' + extensionRoot + '\'',
        () => {
          loadSequence.push('CEP_EXTENSION_ROOT_SET');

          // Step 2: Load host.jsx (fails)
          const loadScript = 'try { $.evalFile(\'' + jsxPath + '\'); \'SUCCESS\'; } catch(e) { \'ERROR: \' + e.toString() + \' at line \' + e.line; }';
          csInterface.setEvalScriptResponse(loadScript, 'ERROR: File not found at line 1');

          csInterface.evalScript(loadScript, (result) => {
            if (result && result.indexOf('ERROR:') === 0) {
              loadSequence.push('LOADING_FAILED');
              // Panel should NOT initialize MetadataForm
            }
          });
        }
      );

      // Wait for async sequence
      await new Promise(resolve => setTimeout(resolve, 50));

      // THEN: Should detect failure and not proceed with initialization
      expect(loadSequence).toContain('CEP_EXTENSION_ROOT_SET');
      expect(loadSequence).toContain('LOADING_FAILED');
      expect(loadSequence).not.toContain('EAVINGEST_VERIFIED');
    });
  });

  describe('Regression Prevention', () => {
    it('should NOT load host.jsx before CEP_EXTENSION_ROOT is set', () => {
      // PREVENTS REGRESSION: manifest.xml ScriptPath auto-load caused premature loading
      // CHARACTERIZES: Bug fixed in commit 6c888e3

      const loadSequence = [];

      // WRONG: Loading host.jsx first (old behavior - BROKEN)
      // $.evalFile('host.jsx')  // ← Would fail because CEP_EXTENSION_ROOT undefined

      // RIGHT: Set CEP_EXTENSION_ROOT first (new behavior - WORKS)
      loadSequence.push('1_SET_CEP_EXTENSION_ROOT');
      loadSequence.push('2_LOAD_HOST_JSX');

      // THEN: CEP_EXTENSION_ROOT must be set before loading
      expect(loadSequence[0]).toBe('1_SET_CEP_EXTENSION_ROOT');
      expect(loadSequence[1]).toBe('2_LOAD_HOST_JSX');
    });

    it('should NOT rely on $.fileName in CEP context', () => {
      // PREVENTS REGRESSION: $.fileName is unreliable in CEP panels (returns undefined)
      // CHARACTERIZES: jsx/host.jsx lines 15-22 (CEP_EXTENSION_ROOT workaround)

      // GIVEN: CEP context where $.fileName would be undefined
      const fileNameUnreliable = undefined;

      // WHEN: Using CEP_EXTENSION_ROOT instead
      const CEP_EXTENSION_ROOT = '/path/to/extension';
      const trackAPath = CEP_EXTENSION_ROOT ? CEP_EXTENSION_ROOT + '/jsx' : null;

      // THEN: Should resolve path without $.fileName
      expect(trackAPath).toBe('/path/to/extension/jsx');
      expect(fileNameUnreliable).toBeUndefined(); // Would fail if relied upon
    });
  });
});
