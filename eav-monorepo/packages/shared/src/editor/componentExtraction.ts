import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { ComponentData } from '../database/validation.js';

// Pattern to detect [[HEADER]] paragraphs (these are NOT components)
const HEADER_PATTERN = /^\[\[([A-Z0-9\s\-_]+)\]\]$/;

/**
 * Extract text content with list prefix for list items
 * Lists (both bullet and ordered) are normalized to dash prefix for plain text
 *
 * @param textContent - Raw text content from node
 * @returns Prefixed content "- text" for list items, unchanged for paragraphs
 */
function extractListItemContent(textContent: string): string {
  return `- ${textContent.trim()}`;
}

/**
 * Calculate word count from text content
 * Splits on whitespace and filters empty strings
 *
 * @param textContent - Text to count words in
 * @returns Number of words
 */
function calculateWordCount(textContent: string): number {
  return textContent.split(/\s+/).filter(Boolean).length;
}

/**
 * Extract components from a ProseMirror document
 *
 * Core business logic for the paragraph=component model.
 * Each paragraph becomes a numbered component (C1, C2, C3...)
 * except [[HEADER]] paragraphs which are visual markers for ElevenLabs.
 *
 * List items are extracted with dash prefix for plain text preservation:
 * - Bullet lists → "- Item text"
 * - Ordered lists → "- Item text" (consistent formatting)
 *
 * Reusable across all workflow phases: Script → Scenes → Voice → Edit
 *
 * @param doc - ProseMirror document node
 * @param generateHash - Hash function for component content
 * @returns Array of ComponentData with sequential numbering
 *
 * @example
 * ```typescript
 * const components = extractComponents(editor.state.doc, generateHash);
 * // Returns: [{ number: 1, content: "...", wordCount: 5, hash: "abc" }, ...]
 * ```
 */
export function extractComponents(
  doc: ProseMirrorNode,
  generateHash: (text: string) => string
): ComponentData[] {
  const components: ComponentData[] = [];
  let componentNum = 0;

  doc.forEach((node: ProseMirrorNode) => {
    const textContent = node.textContent.trim();

    // Skip empty nodes
    if (textContent.length === 0) {
      return;
    }

    // Handle list items: prefix with dash for ElevenLabs compatibility
    if (node.type.name === 'list_item') {
      componentNum++;
      const prefixedContent = extractListItemContent(node.textContent);
      components.push({
        number: componentNum,
        content: prefixedContent,
        wordCount: calculateWordCount(textContent),
        hash: generateHash(prefixedContent)
      });
      return;
    }

    // Handle paragraphs
    if (node.type.name === 'paragraph') {
      // Skip paragraphs that are ONLY [[HEADER]] patterns
      // These are visual subheaders for ElevenLabs, not production components
      if (HEADER_PATTERN.test(textContent)) {
        return;
      }

      componentNum++;
      components.push({
        number: componentNum,
        content: node.textContent,
        wordCount: calculateWordCount(node.textContent),
        hash: generateHash(node.textContent)
      });
    }
  });

  return components;
}

/**
 * Check if a paragraph should be numbered as a component
 * Used by visual decorations (ParagraphComponentTracker)
 *
 * @param text - Paragraph text content
 * @returns true if paragraph is a component (not a header)
 *
 * @example
 * ```typescript
 * isComponentParagraph("[[INTRO]]") // false
 * isComponentParagraph("This is content") // true
 * ```
 */
export function isComponentParagraph(text: string): boolean {
  const headerPattern = /^\[\[([A-Z0-9\s\-_]+)\]\]$/;
  return !headerPattern.test(text.trim());
}
