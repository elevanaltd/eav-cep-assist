/**
 * Fixture Loader Utility
 *
 * Loads JSON fixtures from test/fixtures directory for characterization tests.
 * Used to capture and replay actual QE DOM API responses for regression testing.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load a fixture file from test/fixtures directory
 * @param {string} filename - Fixture filename (e.g., 'qe-dom-offline.json')
 * @returns {Object} Parsed JSON fixture data
 * @throws {Error} If fixture file not found or invalid JSON
 */
export function loadFixture(filename) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', filename);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture file not found: ${fixturePath}`);
  }

  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}
