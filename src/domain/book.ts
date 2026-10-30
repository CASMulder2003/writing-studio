import { z } from 'zod';

export type DocNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null>;
  marks?: {
    type: string;
    attrs?: Record<string, string | number | boolean | null>;
  }[];
  content?: DocNode[];
};
const attrs = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);
const nodeSchema: z.ZodType<DocNode> = z.lazy(() =>
  z.object({
    type: z.enum([
      'doc',
      'paragraph',
      'heading',
      'text',
      'hardBreak',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'codeBlock',
      'horizontalRule',
      'image',
    ]),
    text: z.string().optional(),
    attrs: attrs.optional(),
    marks: z
      .array(
        z.object({
          type: z.enum([
            'bold',
            'italic',
            'strike',
            'underline',
            'code',
            'link',
          ]),
          attrs: attrs.optional(),
        }),
      )
      .optional(),
    content: z.array(nodeSchema).optional(),
  }),
);
const statusSchema = z.enum(['Planned', 'Drafting', 'Revising', 'Complete']);
const sceneSchema = z.object({
  id: z.string(),
  title: z.string().max(300),
  content: nodeSchema,
  notes: z.string(),
  updatedAt: z.number(),
});
const chapterSchema = z.object({
  id: z.string(),
  title: z.string().max(300),
  synopsis: z.string(),
  status: statusSchema,
  scenes: z.array(sceneSchema).min(1).max(1000),
});
const characterSchema = z.object({
  id: z.string(),
  name: z.string().max(300),
  firstName: z.string().max(200).optional(),
  middleNames: z.string().max(200).optional(),
  lastName: z.string().max(200).optional(),
  aliases: z.array(z.string().max(200)),
  role: z.string(),
  description: z.string(),
  notes: z.string(),
  color: z.string(),
});
const imageSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/),
});
const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  chapterId: z.string().nullable().default(null),
  status: z
    .enum(['Idea', 'Planned', 'In progress', 'Resolved'])
    .default('Idea'),
  images: z.array(imageSchema).max(100).default([]),
  updatedAt: z.number(),
});
const snapshotSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  title: z.string(),
  content: nodeSchema,
  createdAt: z.number(),
});
export const bookSchema = z.object({
  id: z.string(),
  title: z.string().max(300),
  author: z.string(),
  subtitle: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  chapters: z.array(chapterSchema).min(1).max(1000),
  characters: z.array(characterSchema).max(2000),
  removedCharacters: z
    .array(z.object({ character: characterSchema, deletedAt: z.number() }))
    .max(10000)
    .default([]),
  notes: z.array(noteSchema).max(5000),
  snapshots: z.array(snapshotSchema).max(10000),
  trash: z
    .array(z.object({ chapter: chapterSchema, deletedAt: z.number() }))
    .max(1000),
});
export type Book = z.infer<typeof bookSchema>;
export type Chapter = Book['chapters'][number];
export type Scene = Chapter['scenes'][number];
export type Character = Book['characters'][number];
export type Note = Book['notes'][number];
export type NoteImage = Note['images'][number];
export type Status = Chapter['status'];
export const statuses: Status[] = [
  'Planned',
  'Drafting',
  'Revising',
  'Complete',
];
export const emptyDoc = (): DocNode => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});
export const id = () => crypto.randomUUID();
export const newScene = (title = 'Scene 1'): Scene => ({
  id: id(),
  title,
  content: emptyDoc(),
  notes: '',
  updatedAt: Date.now(),
});
export const newChapter = (title = 'Untitled chapter'): Chapter => ({
  id: id(),
  title,
  synopsis: '',
  status: 'Planned',
  scenes: [newScene()],
});
export function newBook(title = 'Untitled book', author = ''): Book {
  return {
    id: id(),
    title,
    author,
    subtitle: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: [newChapter('Chapter one')],
    characters: [],
    removedCharacters: [],
    notes: [],
    snapshots: [],
    trash: [],
  };
}
export function plainText(node: DocNode): string {
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  const text = (node.content || []).map(plainText).join('');
  return [
    'paragraph',
    'heading',
    'blockquote',
    'listItem',
    'codeBlock',
  ].includes(node.type)
    ? text + '\n'
    : text;
}
export const words = (node: DocNode) =>
  plainText(node)
    .trim()
    .match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length || 0;
export const chapterWords = (chapter: Chapter) =>
  chapter.scenes.reduce((n, s) => n + words(s.content), 0);
export const bookWords = (book: Book) =>
  book.chapters.reduce((n, c) => n + chapterWords(c), 0);
export const imageCount = (node: DocNode): number =>
  (node.type === 'image' ? 1 : 0) +
  (node.content || []).reduce((n, c) => n + imageCount(c), 0);
export const hasContent = (node: DocNode) =>
  Boolean(plainText(node).trim() || imageCount(node));
export function estimatedChapterPages(chapter: Chapter): number {
  if (!chapter.scenes.some((s) => hasContent(s.content))) return 0;
  const lines = chapter.scenes.reduce(
    (total, s) =>
      total +
      plainText(s.content)
        .split('\n')
        .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 60)), 0) +
      2 +
      imageCount(s.content) * 16,
    0,
  );
  return Math.max(1, Math.ceil((lines + 5) / 32));
}
export const estimatedBookPages = (book: Book) =>
  book.chapters.reduce((n, c) => n + estimatedChapterPages(c), 0);
export function reorder<T extends { id: string }>(
  items: T[],
  movingId: string,
  targetIndex: number,
): T[] {
  const from = items.findIndex((item) => item.id === movingId);
  if (
    from < 0 ||
    targetIndex < 0 ||
    targetIndex >= items.length ||
    from === targetIndex
  )
    return items;
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(targetIndex, 0, item);
  return copy;
}
export function characterNameParts(character: Character) {
  if (
    character.firstName !== undefined ||
    character.lastName !== undefined ||
    character.middleNames !== undefined
  )
    return {
      firstName: character.firstName || '',
      middleNames: character.middleNames || '',
      lastName: character.lastName || '',
    };
  // Older projects used one full-name field. Keep that name and infer editable parts.
  const parts = character.name.trim().split(/\s+/u);
  const firstName = parts.shift() || '';
  const lastName = parts.length ? parts.pop()! : '';
  return { firstName, middleNames: parts.join(' '), lastName };
}
export function updateCharacterName(
  character: Character,
  patch: Partial<ReturnType<typeof characterNameParts>>,
): Character {
  const parts = { ...characterNameParts(character), ...patch };
  return {
    ...character,
    ...parts,
    name: [parts.firstName, parts.middleNames, parts.lastName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' '),
  };
}
export function mentions(text: string, characters: Character[]) {
  const candidates: {
    from: number;
    to: number;
    characterId: string;
    name: string;
  }[] = [];
  const aliases = new Map<string, Character[]>();
  for (const character of characters)
    for (const raw of [
      character.name,
      characterNameParts(character).firstName,
      ...character.aliases,
    ]) {
      const name = raw.trim();
      if (!name) continue;
      const list = aliases.get(name.toLocaleLowerCase()) || [];
      if (!list.some((c) => c.id === character.id)) list.push(character);
      aliases.set(name.toLocaleLowerCase(), list);
    }
  for (const [name, list] of aliases) {
    if (list.length !== 1) continue;
    const pattern = new RegExp(
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'giu',
    );
    for (const match of text.matchAll(pattern)) {
      const from = match.index;
      const to = from + match[0].length;
      if (
        (from > 0 && /[\p{L}\p{N}_]/u.test(text[from - 1])) ||
        (to < text.length && /[\p{L}\p{N}_]/u.test(text[to]))
      )
        continue;
      candidates.push({ from, to, characterId: list[0].id, name: match[0] });
    }
  }
  candidates.sort((a, b) => a.from - b.from || b.to - a.to);
  return candidates.filter(
    (item, index, all) =>
      !all
        .slice(0, index)
        .some((other) => other.from <= item.from && other.to > item.from),
  );
}
export function backup(book: Book) {
  return {
    format: 'writing-studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    book,
  };
}
export function removeCharacter(book: Book, characterId: string): Book {
  const character = book.characters.find((c) => c.id === characterId);
  if (!character) return book;
  return {
    ...book,
    characters: book.characters.filter((c) => c.id !== characterId),
    removedCharacters: [
      { character, deletedAt: Date.now() },
      ...book.removedCharacters,
    ],
  };
}
export function restoreCharacter(book: Book, characterId: string): Book {
  const removed = book.removedCharacters.find(
    (item) => item.character.id === characterId,
  );
  if (!removed || book.characters.some((c) => c.id === characterId))
    return book;
  return {
    ...book,
    characters: [...book.characters, removed.character],
    removedCharacters: book.removedCharacters.filter(
      (item) => item.character.id !== characterId,
    ),
  };
}
export function parseBackup(input: unknown): Book {
  const checkDepth = (value: unknown, depth = 0): void => {
    if (depth > 50) throw new Error('This file is too deeply nested.');
    if (value && typeof value === 'object')
      for (const child of Object.values(value)) checkDepth(child, depth + 1);
  };
  checkDepth(input);
  const parsed = z
    .object({
      format: z.literal('writing-studio'),
      version: z.literal(1),
      book: bookSchema,
    })
    .parse(input);
  if (
    parsed.book.chapters.some((c) =>
      c.scenes.some((s) => s.content.type !== 'doc'),
    )
  )
    throw new Error('Invalid manuscript document.');
  const checkImages = (node: DocNode): void => {
    if (
      node.type === 'image' &&
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(
        String(node.attrs?.src || ''),
      )
    )
      throw new Error(
        'Backup images must be attached PNG, JPEG, or WebP files.',
      );
    node.content?.forEach(checkImages);
  };
  for (const chapter of [
    ...parsed.book.chapters,
    ...parsed.book.trash.map((item) => item.chapter),
  ])
    for (const draft of chapter.scenes) checkImages(draft.content);
  for (const snapshot of parsed.book.snapshots) checkImages(snapshot.content);
  const ids = [
    ...parsed.book.chapters.map((c) => c.id),
    ...parsed.book.chapters.flatMap((c) => c.scenes.map((s) => s.id)),
    ...parsed.book.characters.map((c) => c.id),
    ...parsed.book.removedCharacters.map((item) => item.character.id),
    ...parsed.book.notes.map((n) => n.id),
  ];
  if (new Set(ids).size !== ids.length)
    throw new Error('The backup contains duplicate record identifiers.');
  return parsed.book;
}
export function normaliseBook(input: Book): Book {
  const book = bookSchema.parse(input);
  const notes = [...book.notes];
  for (const chapter of book.chapters)
    for (const draft of chapter.scenes)
      if (
        draft.notes.trim() &&
        !notes.some((n) => n.id === 'legacy-' + draft.id)
      )
        notes.push({
          id: 'legacy-' + draft.id,
          title: chapter.title + ' notes',
          body: draft.notes,
          chapterId: chapter.id,
          status: 'Idea',
          images: [],
          updatedAt: draft.updatedAt,
        });
  const merged = (
    chapter: Chapter,
    replacement?: { id: string; content: DocNode },
  ): DocNode => ({
    type: 'doc',
    content: chapter.scenes.flatMap((draft, index) => [
      ...(index ? [{ type: 'horizontalRule' }] : []),
      ...((replacement?.id === draft.id ? replacement.content : draft.content)
        .content || []),
    ]),
  });
  return {
    ...book,
    notes,
    chapters: book.chapters.map((chapter) => ({
      ...chapter,
      scenes: [
        {
          ...chapter.scenes[0],
          notes: '',
          content:
            chapter.scenes.length === 1
              ? chapter.scenes[0].content
              : merged(chapter),
        },
      ],
    })),
    snapshots: book.snapshots.map((snapshot) => {
      const parent = book.chapters.find((c) =>
        c.scenes.some((s) => s.id === snapshot.sceneId),
      );
      return parent && parent.scenes.length > 1
        ? {
            ...snapshot,
            sceneId: parent.scenes[0].id,
            content: merged(parent, {
              id: snapshot.sceneId,
              content: snapshot.content,
            }),
          }
        : snapshot;
    }),
  };
}
export function importCopy(book: Book): Book {
  return {
    ...normaliseBook(book),
    id: id(),
    title: book.title + ' (imported)',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export function docHtml(node: DocNode): string {
  if (node.type === 'image') {
    const src = String(node.attrs?.src || '');
    return /^data:image\/(png|jpeg|webp);base64,/.test(src)
      ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(String(node.attrs?.alt || ''))}" style="max-width:100%;height:auto">`
      : '';
  }
  if (node.type === 'text') {
    let text = escapeHtml(node.text || '');
    for (const mark of node.marks || []) {
      const tag = (
        {
          bold: 'strong',
          italic: 'em',
          underline: 'u',
          strike: 's',
          code: 'code',
        } as Record<string, string>
      )[mark.type];
      if (tag) text = `<${tag}>${text}</${tag}>`;
      if (
        mark.type === 'link' &&
        /^(https?:|mailto:)/i.test(String(mark.attrs?.href))
      )
        text = `<a href="${escapeHtml(String(mark.attrs?.href))}">${text}</a>`;
    }
    return text;
  }
  if (node.type === 'hardBreak') return '<br>';
  if (node.type === 'horizontalRule') return '<hr>';
  const children = (node.content || []).map(docHtml).join('');
  const tag =
    node.type === 'heading'
      ? `h${Math.min(6, Math.max(1, Number(node.attrs?.level) || 2))}`
      : (
          {
            paragraph: 'p',
            bulletList: 'ul',
            orderedList: 'ol',
            listItem: 'li',
            blockquote: 'blockquote',
            codeBlock: 'pre',
          } as Record<string, string>
        )[node.type];
  return tag ? `<${tag}>${children}</${tag}>` : children;
}
export function manuscriptHtml(book: Book) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escapeHtml(book.title)}</title><style>body{max-width:720px;margin:60px auto;font:18px/1.8 Georgia,serif;padding:0 24px}h1,h2{text-align:center}section{break-before:page;margin-top:70px}.scene+ .scene:before{content:'* * *';display:block;text-align:center;margin:32px}p{white-space:pre-wrap}@media print{body{margin:0;max-width:none}section{margin-top:0}}</style><h1>${escapeHtml(book.title)}</h1><p style="text-align:center">${escapeHtml(book.author)}</p>${book.chapters.map((c, i) => `<section><h2>${i + 1}. ${escapeHtml(c.title)}</h2>${c.scenes.map((s) => `<div class="scene">${docHtml(s.content)}</div>`).join('')}</section>`).join('')}</html>`;
}
export function manuscriptText(book: Book) {
  return (
    `${book.title}\n${book.author}\n\n` +
    book.chapters
      .map(
        (c, i) =>
          `${i + 1}. ${c.title}\n\n` +
          c.scenes
            .map((s) => plainText(s.content).trim())
            .join('\n\n* * *\n\n'),
      )
      .join('\n\n\n')
  );
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const fileName = (s: string) =>
  s.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'manuscript';
