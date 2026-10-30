import { describe, expect, it } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { newBook, newChapter, type DocNode } from '../domain/book';
import { createBookPdf, createBookPreview, type PdfFonts } from './bookPdf';

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
  it('keeps prologue and epilogue headings unnumbered, including in partial exports', async () => {
    const book = newBook('Section types');
    const prologue = newChapter('Prologue', 'prologue');
    const second = newChapter('Return');
    const epilogue = newChapter('Years later', 'epilogue');
    book.chapters = [prologue, book.chapters[0], second, epilogue];
    for (const chapter of book.chapters)
      chapter.scenes[0].content = {
        type: 'doc',
        content: [paragraph('A short passage.')],
      };
    const selected = new Set([prologue.id, second.id, epilogue.id]);
    const preview = await createBookPreview(book, selected, 'large', fonts);
    const headings = preview.pages
      .slice(2)
      .map((p) =>
        p.elements
          .filter((e) => e.kind === 'text' && e.y < 60)
          .map((e) => e.kind === 'text' && e.text),
      );
    expect(headings).toEqual([
      ['Prologue'],
      ['CHAPTER 2', 'Return'],
      ['EPILOGUE', 'Years later'],
    ]);
    expect(preview.pages.slice(2).map((p) => p.number)).toEqual([1, 2, 3]);
    const pdf = await createBookPdf(book, selected, 'large', fonts);
    expect(pdf.getNumberOfPages()).toBe(preview.pages.length);
  });
  it('uses identical page counts, trim and chapter numbers for the reader and PDF', async () => {
    const book = newBook('Shared layout', 'Test author');
    const chapter = newChapter('A long chapter');
    chapter.scenes[0].content = {
      type: 'doc',
      content: Array.from({ length: 60 }, () =>
        paragraph('A distant light moved slowly across the water. '.repeat(5)),
      ),
    };
    const last = newChapter('Final chapter');
    last.scenes[0].content = {
      type: 'doc',
      content: [paragraph('The last line.')],
    };
    book.chapters.push(chapter, last);
    const before = JSON.stringify(book);
    for (const size of ['compact', 'large'] as const) {
      const selected = new Set([chapter.id, last.id]);
      const preview = await createBookPreview(book, selected, size, fonts);
      const pdf = await createBookPdf(book, selected, size, fonts);
      expect(preview.pages.length).toBe(pdf.getNumberOfPages());
      expect(preview.width).toBeCloseTo(pdf.internal.pageSize.getWidth());
      expect(preview.height).toBeCloseTo(pdf.internal.pageSize.getHeight());
      expect(preview.pages[0].chapterId).toBeUndefined();
      expect(preview.pages[1].elements).toEqual([]);
      expect(preview.pages[2].number).toBe(1);
      expect(preview.pages[2].chapterId).toBe(chapter.id);
      expect(
        preview.pages[2].elements.some(
          (e) => e.kind === 'text' && e.text === 'CHAPTER 2',
        ),
      ).toBe(true);
      expect(preview.pages.at(-1)?.chapterId).toBe(last.id);
      expect(preview.pages.slice(2).every((p, i) => p.number === i + 1)).toBe(
        true,
      );
      for (const page of preview.pages.slice(2))
        for (const element of page.elements) {
          if (element.kind === 'text') {
            expect(element.y).toBeGreaterThan(0);
            expect(element.y).toBeLessThan(preview.height);
            expect(element.x).toBeGreaterThanOrEqual(16);
            expect(element.x).toBeLessThan(preview.width - 16);
          }
        }
    }
    expect(JSON.stringify(book)).toBe(before);
  });
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
      expect(pdf.getNumberOfPages()).toBe(3);
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
