// Mock CSInterface for CEP tests (no Premiere Pro required)

export class MockCSInterface {
  constructor() {
    this.eventListeners = {};
    this.evalScriptResponses = {};
  }

  // Mock evalScript (calls to ExtendScript)
  evalScript(script, callback) {
    const response = this.evalScriptResponses[script] || '{}';
    if (callback) {
      // Simulate async ExtendScript call
      setTimeout(() => callback(response), 0);
    }
  }

  // Mock event dispatch
  dispatchEvent(event) {
    const listeners = this.eventListeners[event.type] || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  // Mock event listener registration
  addEventListener(type, listener) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  // Test helper: Set mock response for evalScript
  setEvalScriptResponse(script, response) {
    this.evalScriptResponses[script] = response;
  }

  // Test helper: Clear all mock responses
  clearEvalScriptResponses() {
    this.evalScriptResponses = {};
  }

  // Test helper: Get registered listeners
  getEventListeners(type) {
    return this.eventListeners[type] || [];
  }
}
