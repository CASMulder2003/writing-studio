import { describe, expect, it } from 'vitest';
import {
  backup,
  chapterNumber,
  chapterLabel,
  chapterListTitle,
  chapterOpening,
  numberedChapters,
  orderChapters,
  changeChapterKind,
  bookWords,
  characterNameParts,
  updateCharacterName,
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
  removeCharacter,
  restoreCharacter,
  removeNote,
  restoreNote,
  moveNote,
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
describe('prologues and epilogues', () => {
  it('preserves note content, chapter links and attachments through reordering and recoverable deletion', () => {
    const book = newBook();
    const first = {
      id: 'note-a',
      title: 'Clue',
      body: 'Keep this clue.',
      chapterId: book.chapters[0].id,
      status: 'Planned' as const,
      updatedAt: 1,
      images: [
        {
          id: 'picture',
          name: 'Clue image',
          dataUrl: 'data:image/png;base64,AA==',
        },
      ],
    };
    const next = {
      ...first,
      id: 'note-b',
      title: 'Question',
      chapterId: null,
      images: [],
    };
    book.notes = [first, next];
    const moved = moveNote(book.notes, next.id, first.chapterId, first.id);
    expect(moved.map((n) => n.id)).toEqual([next.id, first.id]);
    expect(moved[0].chapterId).toBe(first.chapterId);
    expect(moved[1]).toBe(first);
    book.notes = moved;
    const deleted = removeNote(book, first.id);
    expect(deleted.notes).toHaveLength(1);
    expect(deleted.chapters).toBe(book.chapters);
    const restored = restoreNote(parseBackup(backup(deleted)), first.id);
    expect(restored.notes.find((n) => n.id === first.id)).toEqual(first);
    expect(restored.removedNotes).toEqual([]);
    expect(removeNote(deleted, first.id)).toBe(deleted);
    expect(restoreNote(restored, first.id)).toBe(restored);
    expect(
      parseBackup({
        ...backup(book),
        book: { ...book, removedNotes: undefined },
      }).removedNotes,
    ).toEqual([]);
  });
  it('converts existing writing without losing notes or content, and numbers only chapters', () => {
    const book = newBook('Book');
    const first = book.chapters[0];
    first.title = 'Before';
    first.scenes[0].content = paragraph('The opening stays intact.');
    const next = newChapter('Arrival');
    const last = newChapter('Epilogue', 'epilogue');
    last.scenes[0].content = paragraph('The ending stays intact.');
    book.chapters = [first, next, last];
    const total = bookWords(book);
    book.chapters = changeChapterKind(book.chapters, first.id, 'prologue');
    expect(book.chapters[0].scenes).toBe(first.scenes);
    expect(numberedChapters(book.chapters)).toEqual([next]);
    expect(
      book.chapters.map((c) => chapterNumber(book.chapters, c.id)),
    ).toEqual([null, 1, null]);
    expect(chapterLabel(book.chapters, book.chapters[0])).toBe('Prologue');
    expect(chapterListTitle(book.chapters[0], null)).toBe('Prologue: Before');
    expect(chapterOpening(last, null)).toEqual({
      label: '',
      title: 'Epilogue',
    });
    expect(bookWords(book)).toBe(total);
    const added = newChapter('Second');
    book.chapters = orderChapters([...book.chapters, added]);
    expect(book.chapters.map((c) => c.id)).toEqual([
      first.id,
      next.id,
      added.id,
      last.id,
    ]);
    const copy = parseBackup(backup(book));
    expect(copy.chapters.map((c) => c.kind)).toEqual([
      'prologue',
      'chapter',
      'chapter',
      'epilogue',
    ]);
    const selected = { ...book, chapters: [added, last] };
    expect(manuscriptText(selected, book.chapters)).toContain('2. Second');
    expect(manuscriptHtml(selected, book.chapters)).toContain(
      '<h2>Epilogue</h2>',
    );
    const convertedBack = changeChapterKind(book.chapters, first.id, 'chapter');
    expect(chapterNumber(convertedBack, next.id)).toBe(2);
  });
  it('recognises exact prologue and epilogue titles in old backups, while respecting explicit choices', () => {
    const book = newBook();
    book.chapters = [
      newChapter(' Prologue '),
      newChapter('The epilogue problem'),
      newChapter('EPILOGUE'),
    ];
    const old = {
      ...backup(book),
      book: {
        ...book,
        chapters: book.chapters.map(({ kind: _kind, ...chapter }) => chapter),
      },
    };
    const migrated = normaliseBook(parseBackup(old));
    expect(migrated.chapters.map((c) => c.kind)).toEqual([
      'prologue',
      'chapter',
      'epilogue',
    ]);
    expect(normaliseBook(migrated)).toEqual(migrated);
    expect(
      parseBackup(backup(book)).chapters.every((c) => c.kind === 'chapter'),
    ).toBe(true);
  });
});
describe('character references', () => {
  it('removes a profile and its links without changing manuscript text, then restores it from a backup', () => {
    const book = newBook('Character removal');
    const anna = {
      ...character('Anna Stone', ['Annie']),
      notes: 'Her private working notes.',
      description: 'A complete profile.',
      role: 'Protagonist',
    };
    book.characters = [anna, character('Mara Vale')];
    book.chapters[0].scenes[0].content = paragraph(
      'Anna Stone met Mara. Annie waited.',
    );
    const originalText = manuscriptText(book);
    const removed = removeCharacter(book, anna.id);
    expect(removed.characters.map((c) => c.name)).toEqual(['Mara Vale']);
    expect(removed.removedCharacters[0].character).toEqual(anna);
    expect(removed.chapters).toBe(book.chapters);
    expect(removed.notes).toBe(book.notes);
    expect(removed.snapshots).toBe(book.snapshots);
    expect(manuscriptText(removed)).toBe(originalText);
    expect(
      mentions(originalText, removed.characters).map((m) => m.name),
    ).toEqual(['Mara']);
    expect(book.characters).toHaveLength(2);
    expect(removeCharacter(removed, anna.id)).toBe(removed);
    const copied = importCopy(
      parseBackup(JSON.parse(JSON.stringify(backup(removed)))),
    );
    const restored = restoreCharacter(copied, anna.id);
    expect(restored.characters.find((c) => c.id === anna.id)).toEqual(anna);
    expect(restored.removedCharacters).toEqual([]);
    expect(manuscriptText(restored)).toContain(
      'Anna Stone met Mara. Annie waited.',
    );
    expect(
      mentions(originalText, restored.characters).map((m) => m.name),
    ).toEqual(['Anna Stone', 'Mara', 'Annie']);
    expect(restoreCharacter(restored, anna.id)).toBe(restored);
  });
  it('opens earlier backups without a removed-character list and can remove the last profile', () => {
    const old = backup(newBook());
    const migrated = parseBackup({
      ...old,
      book: { ...old.book, removedCharacters: undefined },
    });
    expect(migrated.removedCharacters).toEqual([]);
    migrated.characters = [character('Anna')];
    const removed = removeCharacter(migrated, 'Anna');
    expect(removed.characters).toEqual([]);
    expect(parseBackup(backup(removed)).removedCharacters).toHaveLength(1);
    expect(restoreCharacter(newBook(), 'Anna').characters).toEqual([]);
  });
  it('rejects a backup with the same character active and removed', () => {
    const book = newBook();
    book.characters = [character('Anna')];
    book.removedCharacters = [{ character: book.characters[0], deletedAt: 1 }];
    expect(() => parseBackup(backup(book))).toThrow(/duplicate/);
  });
  it('recognises a unique first name automatically, without matching parts of other words', () => {
    const matches = mentions('Anna Stone met Anna. Annabelle watched.', [
      character('Anna Stone'),
    ]);
    expect(matches.map((match) => match.name)).toEqual(['Anna Stone', 'Anna']);
    expect(matches.every((match) => match.characterId === 'Anna Stone')).toBe(
      true,
    );
  });
  it('keeps full names distinct when first names are shared', () => {
    const matches = mentions('Anna Stone spoke to Anna Reed. Anna listened.', [
      character('Anna Stone'),
      character('Anna Reed'),
    ]);
    expect(matches.map((match) => match.name)).toEqual([
      'Anna Stone',
      'Anna Reed',
    ]);
  });
  it('preserves existing full names and supports editable middle names', () => {
    const original = character('Anna Maria Stone', ['Annie']);
    expect(characterNameParts(original)).toEqual({
      firstName: 'Anna',
      middleNames: 'Maria',
      lastName: 'Stone',
    });
    const updated = updateCharacterName(original, {
      middleNames: 'Maria Louise',
      lastName: 'van Stone',
    });
    expect(updated.name).toBe('Anna Maria Louise van Stone');
    const book = newBook();
    book.characters = [updated];
    expect(parseBackup(backup(book)).characters[0]).toEqual(updated);
    expect(
      mentions('Anna and Annie waited.', [updated]).map((match) => match.name),
    ).toEqual(['Anna', 'Annie']);
  });
  it('handles single names and accented or hyphenated first names', () => {
    expect(characterNameParts(character('Mara'))).toEqual({
      firstName: 'Mara',
      middleNames: '',
      lastName: '',
    });
    expect(
      mentions('Émile met Anne-Marie.', [
        character('Émile Durand'),
        character('Anne-Marie Stone'),
      ]).map((match) => match.name),
    ).toEqual(['Émile', 'Anne-Marie']);
  });
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
