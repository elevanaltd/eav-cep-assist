import { describe, it, expect } from 'vitest';
import { extractComponents, isComponentParagraph } from './componentExtraction';
import { generateContentHash } from '../scripts/domain/scriptService';
import { schema } from '@tiptap/pm/schema-basic';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

// Mock ProseMirror nodes for list testing
// This avoids dependency on schema configuration which may vary
function createMockNode(type: string, textContent: string = '', children: ProseMirrorNode[] = []): ProseMirrorNode {
  // Helper function to traverse all descendants (depth-first)
  const forEachHelper = (callback: (node: ProseMirrorNode, offset: number) => void) => {
    let offset = 0;
    children.forEach((child) => {
      callback(child, offset);
      offset++;
      // Recursively traverse child's children
      if (child.childCount && child.childCount > 0) {
        child.forEach((grandchild: ProseMirrorNode) => {
          callback(grandchild, offset);
          offset++;
        });
      }
    });
  };

  return {
    type: { name: type },
    textContent: textContent,
    content: {
      size: children.length,
      forEach: (callback: (node: ProseMirrorNode) => void) => {
        children.forEach(callback);
      }
    },
    isBlock: true,
    isInline: false,
    childCount: children.length,
    nodeSize: textContent.length + 2,
    forEach: forEachHelper
  } as unknown as ProseMirrorNode;
}

describe('extractComponents', () => {

  it('extracts numbered components from paragraphs', () => {
    // Create mock ProseMirror document with 3 paragraphs
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('First component')]),
      schema.node('paragraph', null, [schema.text('Second component')]),
      schema.node('paragraph', null, [schema.text('Third component')]),
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(3);
    expect(components[0]).toEqual({
      number: 1,
      content: 'First component',
      wordCount: 2,
      hash: generateContentHash('First component')
    });
    expect(components[2].number).toBe(3);
  });

  it('skips [[HEADER]] paragraphs', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Component 1')]),
      schema.node('paragraph', null, [schema.text('[[INTRO]]')]),
      schema.node('paragraph', null, [schema.text('Component 2')]),
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(2);
    expect(components[0].number).toBe(1);
    expect(components[1].number).toBe(2); // Not 3!
  });

  it('skips empty paragraphs', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Component 1')]),
      schema.node('paragraph', null, []), // Empty
      schema.node('paragraph', null, [schema.text('  ')]), // Whitespace only
      schema.node('paragraph', null, [schema.text('Component 2')]),
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(2);
  });

  it('calculates word count correctly', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('One two three four five')]),
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components[0].wordCount).toBe(5);
  });

  it('handles headers with numbers', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('[[SECTION 1]]')]),
      schema.node('paragraph', null, [schema.text('Component 1')]),
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(1);
    expect(components[0].number).toBe(1);
  });

  it('extracts list items with dash prefix', () => {
    const doc = createMockNode('doc', '', [
      createMockNode('bullet_list', '', [
        createMockNode('list_item', 'Rapid heating')
      ])
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(1);
    expect(components[0]).toEqual({
      number: 1,
      content: '- Rapid heating',
      wordCount: 2,
      hash: generateContentHash('- Rapid heating')
    });
  });

  it('handles multiple list items in sequence', () => {
    const doc = createMockNode('doc', '', [
      createMockNode('bullet_list', '', [
        createMockNode('list_item', 'Rapid heating'),
        createMockNode('list_item', '3D Hot Air')
      ])
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(2);
    expect(components[0].content).toBe('- Rapid heating');
    expect(components[0].number).toBe(1);
    expect(components[1].content).toBe('- 3D Hot Air');
    expect(components[1].number).toBe(2);
  });

  it('handles mixed paragraphs and list items', () => {
    const doc = createMockNode('doc', '', [
      createMockNode('paragraph', 'Introduction'),
      createMockNode('bullet_list', '', [
        createMockNode('list_item', 'Item 1'),
        createMockNode('list_item', 'Item 2')
      ]),
      createMockNode('paragraph', 'Conclusion')
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(4);
    expect(components[0].content).toBe('Introduction');
    expect(components[1].content).toBe('- Item 1');
    expect(components[2].content).toBe('- Item 2');
    expect(components[3].content).toBe('Conclusion');
  });

  it('calculates correct word count for list items (excluding dash)', () => {
    const doc = createMockNode('doc', '', [
      createMockNode('bullet_list', '', [
        createMockNode('list_item', 'One two three')
      ])
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components[0].wordCount).toBe(3); // "One two three" = 3 words, dash is not counted
  });

  it('skips empty list items', () => {
    const doc = createMockNode('doc', '', [
      createMockNode('bullet_list', '', [
        createMockNode('list_item', 'Item 1'),
        createMockNode('list_item', ''), // Empty
        createMockNode('list_item', 'Item 2')
      ])
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(2);
    expect(components[0].content).toBe('- Item 1');
    expect(components[1].content).toBe('- Item 2');
  });

  it('handles ordered lists with dash prefix (consistent formatting)', () => {
    const doc = createMockNode('doc', '', [
      createMockNode('ordered_list', '', [
        createMockNode('list_item', 'First step'),
        createMockNode('list_item', 'Second step')
      ])
    ]);

    const components = extractComponents(doc, generateContentHash);

    expect(components).toHaveLength(2);
    expect(components[0].content).toBe('- First step');
    expect(components[1].content).toBe('- Second step');
  });
});

describe('isComponentParagraph', () => {
  it('returns true for normal paragraphs', () => {
    expect(isComponentParagraph('This is content')).toBe(true);
  });

  it('returns false for [[HEADER]] paragraphs', () => {
    expect(isComponentParagraph('[[INTRO]]')).toBe(false);
    expect(isComponentParagraph('[[SECTION 1]]')).toBe(false);
  });

  it('handles whitespace around headers', () => {
    expect(isComponentParagraph('  [[HEADER]]  ')).toBe(false);
  });

  it('returns true for paragraphs containing [[HEADER]] as part of content', () => {
    expect(isComponentParagraph('This mentions [[HEADER]] in text')).toBe(true);
  });
});
