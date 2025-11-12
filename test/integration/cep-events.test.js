// Integration test: CEP event communication (Navigation → Metadata)

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCSInterface } from '../helpers/mock-csinterface.js';

describe('CEP Event Communication', () => {
  let csInterface;

  beforeEach(() => {
    csInterface = new MockCSInterface();
    global.csInterface = csInterface;
  });

  it('should dispatch clip selection event', () => {
    const mockClip = { nodeId: '123', name: 'Test Clip' };
    const event = {
      type: 'com.eav.clipSelected',
      data: JSON.stringify(mockClip)
    };

    let receivedEvent = null;
    csInterface.addEventListener('com.eav.clipSelected', (e) => {
      receivedEvent = e;
    });

    csInterface.dispatchEvent(event);

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent.type).toBe('com.eav.clipSelected');
    expect(JSON.parse(receivedEvent.data)).toEqual(mockClip);
  });

  it('should handle multiple event listeners', () => {
    const event = {
      type: 'com.eav.clipSelected',
      data: JSON.stringify({ nodeId: '456' })
    };

    let listener1Called = false;
    let listener2Called = false;

    csInterface.addEventListener('com.eav.clipSelected', () => {
      listener1Called = true;
    });

    csInterface.addEventListener('com.eav.clipSelected', () => {
      listener2Called = true;
    });

    csInterface.dispatchEvent(event);

    expect(listener1Called).toBe(true);
    expect(listener2Called).toBe(true);
  });

  it('should mock ExtendScript evalScript calls', () => {
    return new Promise((resolve) => {
      const mockResponse = JSON.stringify({ clips: [{ nodeId: '123', name: 'Test' }] });
      csInterface.setEvalScriptResponse('EAVIngest.getAllProjectClips()', mockResponse);

      csInterface.evalScript('EAVIngest.getAllProjectClips()', (result) => {
        const parsed = JSON.parse(result);
        expect(parsed.clips).toHaveLength(1);
        expect(parsed.clips[0].name).toBe('Test');
        resolve();
      });
    });
  });
});
