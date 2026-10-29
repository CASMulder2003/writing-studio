import { describe, expect, it } from 'vitest';
import {
  backup,
  docHtml,
  estimatedChapterPages,
  importCopy,
  manuscriptHtml,
  manuscriptText,
  mentions,
  newBook,
  newChapter,
  normaliseBook,
  parseBackup,
  reorder,
  words,
  type Character,
  type DocNode,
} from './book';
const paragraph = (text: string): DocNode => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});
const character = (name: string, aliases: string[] = []): Character => ({
  id: name,
  name,
  aliases,
  role: '',
  description: '',
  notes: '',
  color: '',
});
describe('book structure and portable backups', () => {
  it('moves a chapter with its scenes without changing their contents', () => {
    const book = newBook('Test');
    book.chapters.push(newChapter('Second'), newChapter('Third'));
    book.chapters[0].scenes[0].content = paragraph('The original manuscript.');
    const reordered = reorder(book.chapters, book.chapters[0].id, 2);
    expect(reordered.map((c) => c.title)).toEqual([
      'Second',
      'Third',
      'Chapter one',
    ]);
    expect(reordered[2].scenes[0].content).toEqual(
      paragraph('The original manuscript.'),
    );
    expect(book.chapters[0].title).toBe('Chapter one');
  });
  it('round trips all writing, notes, characters, history, and removed chapters', () => {
    const book = newBook('Test');
    book.chapters[0].scenes[0].content = paragraph('Elias arrived.');
    book.characters = [character('Elias', ['Eli'])];
    book.notes = [
      {
        id: 'n',
        title: 'Private note',
        body: 'Author truth',
        chapterId: book.chapters[0].id,
        status: 'Planned',
        images: [],
        updatedAt: 1,
      },
    ];
    book.snapshots = [
      {
        id: 'snapshot',
        sceneId: book.chapters[0].scenes[0].id,
        title: 'Earlier',
        content: paragraph('Earlier draft'),
        createdAt: 2,
      },
    ];
    book.trash = [{ chapter: newChapter('Removed'), deletedAt: 3 }];
    const restored = parseBackup(JSON.parse(JSON.stringify(backup(book))));
    expect(restored).toEqual(book);
    const copy = importCopy(restored);
    expect(copy.id).not.toBe(book.id);
    expect(copy.chapters).toEqual(book.chapters);
  });
  it('rejects unsupported backup versions and duplicate scene identifiers', () => {
    const book = newBook();
    expect(() => parseBackup({ ...backup(book), version: 2 })).toThrow();
    book.chapters[0].scenes.push({ ...book.chapters[0].scenes[0] });
    expect(() => parseBackup(backup(book))).toThrow(/duplicate/);
  });
  it('preserves earlier multi-part drafts and their notes when moving to chapters', () => {
    const book = newBook('Migration');
    const first = book.chapters[0].scenes[0];
    first.content = paragraph('First passage');
    first.notes = 'Remember the key.';
    const second = newChapter('unused').scenes[0];
    second.content = paragraph('Second passage');
    book.chapters[0].scenes.push(second);
    book.snapshots.push({
      id: 'old-version',
      sceneId: second.id,
      title: 'Old',
      content: paragraph('Earlier second passage'),
      createdAt: 1,
    });
    const migrated = normaliseBook(book);
    expect(migrated.chapters[0].scenes).toHaveLength(1);
    expect(manuscriptText(migrated)).toContain('First passage');
    expect(manuscriptText(migrated)).toContain('Second passage');
    expect(migrated.notes[0]).toMatchObject({
      body: 'Remember the key.',
      chapterId: book.chapters[0].id,
    });
    expect(migrated.snapshots[0].sceneId).toBe(first.id);
    expect(docHtml(migrated.snapshots[0].content)).toContain(
      'Earlier second passage',
    );
    expect(normaliseBook(migrated)).toEqual(migrated);
  });
  it('rejects remotely loaded manuscript images in imports and archived versions', () => {
    const book = newBook();
    const unsafe: DocNode = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: 'https://example.com/tracking.png' } },
      ],
    };
    book.snapshots.push({
      id: 'v',
      sceneId: book.chapters[0].scenes[0].id,
      title: 'Old',
      content: unsafe,
      createdAt: 1,
    });
    expect(() => parseBackup(backup(book))).toThrow(/attached/);
  });
  it('estimates pages from layout, including line breaks in poems', () => {
    const chapter = newChapter('Poem');
    expect(estimatedChapterPages(chapter)).toBe(0);
    chapter.scenes[0].content = paragraph(Array(80).fill('one').join(' '));
    const prosePages = estimatedChapterPages(chapter);
    chapter.scenes[0].content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: Array.from({ length: 80 }, (_, i) =>
            i
              ? [{ type: 'hardBreak' }, { type: 'text', text: 'one' }]
              : [{ type: 'text', text: 'one' }],
          ).flat(),
        },
      ],
    };
    expect(estimatedChapterPages(chapter)).toBeGreaterThan(prosePages);
  });
  it('exports in manuscript order without private planning information', () => {
    const book = newBook('Book');
    book.chapters[0].synopsis = 'SECRET PLAN';
    book.chapters[0].scenes[0].notes = 'PRIVATE NOTE';
    book.chapters[0].scenes[0].content = paragraph('First passage');
    const second = newChapter('Afterwards');
    second.scenes[0].content = paragraph('Second passage');
    book.chapters.push(second);
    for (const output of [manuscriptText(book), manuscriptHtml(book)]) {
      expect(output.indexOf('First passage')).toBeLessThan(
        output.indexOf('Second passage'),
      );
      expect(output).not.toContain('SECRET PLAN');
      expect(output).not.toContain('PRIVATE NOTE');
    }
  });
});
describe('character references', () => {
  it('matches whole names and aliases while avoiding substrings', () => {
    const matches = mentions('Elias met Eli; Cornelius went home.', [
      character('Elias', ['Eli']),
    ]);
    expect(matches.map((m) => m.name)).toEqual(['Elias', 'Eli']);
  });
  it('prefers a full name over an overlapping short alias', () => {
    expect(
      mentions('Mara Vale entered.', [character('Mara Vale', ['Mara'])]).map(
        (m) => m.name,
      ),
    ).toEqual(['Mara Vale']);
  });
  it('does not guess when two characters share an alias', () => {
    expect(
      mentions('Alex waited.', [
        character('Alex Reed', ['Alex']),
        character('Alex Park', ['Alex']),
      ]),
    ).toEqual([]);
  });
  it('handles accented names and punctuation as literal text', () => {
    expect(
      mentions('Émile greeted A.J. outside.', [
        character('Émile'),
        character('A.J.'),
      ]).map((m) => m.name),
    ).toEqual(['Émile', 'A.J.']);
  });
});
describe('text and safe formatted export', () => {
  it('counts words across paragraph breaks and apostrophes', () => {
    expect(words(paragraph("Don't stop. Eén stap verder."))).toBe(5);
  });
  it('escapes manuscript HTML and discards executable links', () => {
    const result = docHtml({
      type: 'text',
      text: '<script>alert(1)</script>',
      marks: [
        { type: 'link', attrs: { href: 'javascript:alert(1)' } },
        { type: 'bold' },
      ],
    });
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('javascript:');
    expect(result).toContain('<strong>');
  });
});
