import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { characterDecorations } from './characterReferences';
import type { Character } from '../domain/book';
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
    hardBreak: { inline: true, group: 'inline' },
  },
  marks: { bold: {} },
});
const character = (name: string): Character => ({
  id: name,
  name,
  aliases: [],
  role: '',
  description: '',
  notes: '',
  color: '',
});

describe('character annotations in rich text', () => {
  it('identifies a full name split across formatting even when first names are ambiguous', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Anna', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' Stone arrived.' },
          ],
        },
      ],
    });
    const decorations = characterDecorations(doc, [
      character('Anna Stone'),
      character('Anna Reed'),
    ]).find();
    expect(decorations).toHaveLength(1);
    expect(decorations[0].from).toBe(1);
    expect(decorations[0].to).toBe(11);
  });
  it('does not join names across hard breaks and keeps later annotation positions accurate', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Anna' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Stone met Anna.' },
          ],
        },
      ],
    });
    const decorations = characterDecorations(doc, [
      character('Anna Stone'),
    ]).find();
    expect(decorations.map((d) => [d.from, d.to])).toEqual([
      [1, 5],
      [16, 20],
    ]);
  });
});
