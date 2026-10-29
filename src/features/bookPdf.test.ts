import { describe, expect, it } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { newBook, newChapter, type DocNode } from '../domain/book';
import { createBookPdf, type PdfFonts } from './bookPdf';

const fonts = Object.fromEntries(
  Object.entries({
    normal: 'Regular',
    italic: 'Italic',
    bold: 'Bold',
    bolditalic: 'BoldItalic',
  }).map(([style, file]) => [
    style,
    readFileSync(resolve('public/fonts/CrimsonText-' + file + '.ttf')).toString(
      'base64',
    ),
  ]),
) as PdfFonts;
const paragraph = (text: string): DocNode => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

describe('book PDF layout', () => {
  it('requires at least one chapter', async () => {
    await expect(
      createBookPdf(newBook(), new Set(), 'compact', fonts),
    ).rejects.toThrow(/Select/);
  });
  it('exports only the selected chapters at novel trim sizes', async () => {
    const book = newBook('A Book');
    book.chapters[0].scenes[0].content = {
      type: 'doc',
      content: Array.from({ length: 80 }, () =>
        paragraph('Excluded passage. '.repeat(30)),
      ),
    };
    const selected = newChapter('Selected');
    book.chapters.push(selected);
    selected.scenes[0].content = {
      type: 'doc',
      content: [paragraph('Only this short chapter.')],
    };
    for (const size of ['compact', 'large'] as const) {
      const pdf = await createBookPdf(
        book,
        new Set([selected.id]),
        size,
        fonts,
      );
      expect(pdf.getNumberOfPages()).toBe(2);
      expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(
        size === 'compact' ? 139.7 : 152.4,
        1,
      );
      expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(
        size === 'compact' ? 215.9 : 228.6,
        1,
      );
    }
  });
  it('paginates a long chapter with rich text and a following poem', async () => {
    const book = newBook('The Glass Harbour', 'Sample Author');
    book.chapters[0].scenes[0].content = {
      type: 'doc',
      content: [paragraph('EXCLUDED CHAPTER')],
    };
    const chapter = newChapter('The Late Train');
    chapter.scenes[0].content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Mara waited by the window. ' },
            {
              type: 'text',
              text: 'Émile would arrive at dusk.',
              marks: [{ type: 'italic' }],
            },
          ],
        },
        ...Array.from({ length: 30 }, () =>
          paragraph(
            'Beyond the station, the harbour was quiet. A light moved across the water, paused beside the old pier, and disappeared. Mara folded the letter and listened for the train.',
          ),
        ),
        { type: 'horizontalRule' },
        paragraph('FINAL PASSAGE'),
      ],
    };
    const poem = newChapter('At the Water');
    poem.scenes[0].content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'The harbour holds its breath.' },
            { type: 'hardBreak' },
            { type: 'text', text: 'The evening keeps its name.' },
            { type: 'hardBreak' },
            { type: 'text', text: 'We wait beside the water.' },
          ],
        },
      ],
    };
    book.chapters.push(chapter, poem);
    const pdf = await createBookPdf(
      book,
      new Set([chapter.id, poem.id]),
      'compact',
      fonts,
    );
    expect(pdf.getNumberOfPages()).toBeGreaterThan(4);
    if (process.env.WRITE_PDF_QA === '1') {
      mkdirSync(resolve('qa'), { recursive: true });
      writeFileSync(
        resolve('qa/book-preview.pdf'),
        Buffer.from(pdf.output('arraybuffer')),
      );
    }
  });
});
