import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { newBook, importCopy, backup, parseBackup } from '../domain/book';
import { StudioDatabase, storeBook } from './database';
const names: string[] = [];
afterEach(async () => {
  for (const name of names.splice(0)) {
    const db = new StudioDatabase(name);
    await db.delete();
  }
});
describe('local book storage', () => {
  it('survives a database close and reopening', async () => {
    const name = 'test-' + crypto.randomUUID();
    names.push(name);
    const db = new StudioDatabase(name);
    const book = newBook('A durable draft');
    book.chapters[0].scenes[0].notes = 'Keep this detail';
    await storeBook(book, db);
    db.close();
    const reopened = new StudioDatabase(name);
    expect(await reopened.books.get(book.id)).toEqual(book);
    reopened.close();
  });
  it('imports as a separate book without replacing the original', async () => {
    const name = 'test-' + crypto.randomUUID();
    names.push(name);
    const db = new StudioDatabase(name);
    const original = newBook('Original');
    await storeBook(original, db);
    const copy = importCopy(parseBackup(backup(original)));
    copy.title = 'Imported';
    await storeBook(copy, db);
    expect(await db.books.count()).toBe(2);
    expect((await db.books.get(original.id))?.title).toBe('Original');
    db.close();
  });
});
