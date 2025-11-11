// Smoke test: Verify Vitest is configured correctly

import { describe, it, expect } from 'vitest';

describe('Vitest Configuration', () => {
  it('should run tests', () => {
    expect(true).toBe(true);
  });

  it('should have access to browser APIs (jsdom)', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('should support modern JavaScript', () => {
    const arrow = (x) => x * 2;
    expect(arrow(5)).toBe(10);

    const obj = { a: 1, b: 2 };
    const { a, ...rest } = obj;
    expect(a).toBe(1);
    expect(rest).toEqual({ b: 2 });
  });
});
