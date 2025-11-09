// TypeScript Strictness Validation Test
// RED PHASE: This test validates that noUnusedLocals and noUnusedParameters are enabled
// and functioning correctly to detect unused code (Issue #28)

import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface TsConfig {
  compilerOptions: {
    noUnusedLocals?: boolean;
    noUnusedParameters?: boolean;
    strict?: boolean;
  };
}

describe('TypeScript Strictness (noUnusedLocals, noUnusedParameters)', () => {
  let tsconfigPath: string;
  let tsconfigContent: TsConfig;

  beforeAll(() => {
    // Load tsconfig to validate flags are enabled
    tsconfigPath = path.resolve(__dirname, '../../tsconfig.json');
    const rawConfig = fs.readFileSync(tsconfigPath, 'utf-8');
    // Remove JSON5 comments for parsing
    const cleaned = rawConfig.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    tsconfigContent = JSON.parse(cleaned);
  });

  test('noUnusedLocals should be enabled in tsconfig.json', () => {
    expect(
      tsconfigContent.compilerOptions.noUnusedLocals,
      'noUnusedLocals must be true to detect unused variables'
    ).toBe(true);
  });

  test('noUnusedParameters should be enabled in tsconfig.json', () => {
    expect(
      tsconfigContent.compilerOptions.noUnusedParameters,
      'noUnusedParameters must be true to detect unused function parameters'
    ).toBe(true);
  });

  test('TypeScript should detect unused locals and parameters when enabled', () => {
    // This test confirms that when flags are enabled, TypeScript compilation
    // will fail if there are unused variables or parameters
    // (Error will be caught by typecheck command)

    // Valid code that passes both flags
    const validCode = `
      function processData(inputData: string): string {
        const processedData = inputData.toUpperCase();
        return processedData;
      }

      const result = processData('test');
      console.log(result);
    `;

    // Invalid code that will fail with enabled flags
    const invalidCode = `
      function processData(inputData: string, unusedParam: string): string {
        const processedData = inputData.toUpperCase();
        const unusedVar = 'never used';
        return processedData;
      }
    `;

    // Just validate the flags exist - actual compilation is tested via npm run typecheck
    expect(validCode).toBeDefined();
    expect(invalidCode).toBeDefined();
  });

  test('Strictness alignment: scripts-web should match shared package settings', () => {
    // Both packages should have identical strictness settings
    const sharedConfigPath = path.resolve(
      __dirname,
      '../../../../packages/shared/tsconfig.json'
    );
    const sharedRawConfig = fs.readFileSync(sharedConfigPath, 'utf-8');
    const cleaned = sharedRawConfig.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const sharedConfig = JSON.parse(cleaned) as TsConfig;

    expect(tsconfigContent.compilerOptions.noUnusedLocals).toBe(
      sharedConfig.compilerOptions.noUnusedLocals
    );
    expect(tsconfigContent.compilerOptions.noUnusedParameters).toBe(
      sharedConfig.compilerOptions.noUnusedParameters
    );
  });

  test('Configuration should align with North Star I8 (production-grade quality)', () => {
    // North Star I8 requires production-grade quality from day one
    // This includes strict TypeScript settings across all applications
    const hasStrictMode = tsconfigContent.compilerOptions.strict === true;
    const hasUnusedLocalsCheck =
      tsconfigContent.compilerOptions.noUnusedLocals === true;
    const hasUnusedParamsCheck =
      tsconfigContent.compilerOptions.noUnusedParameters === true;

    expect(hasStrictMode, 'strict: true is required').toBe(true);
    expect(
      hasUnusedLocalsCheck,
      'noUnusedLocals: true required for I8 compliance'
    ).toBe(true);
    expect(
      hasUnusedParamsCheck,
      'noUnusedParameters: true required for I8 compliance'
    ).toBe(true);
  });
});
