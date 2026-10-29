import Dexie, { type Table } from 'dexie';
import { type Book } from '../domain/book';

export class StudioDatabase extends Dexie {
  books!: Table<Book, string>;
  constructor(name = 'writing-studio-v1') {
    super(name);
    this.version(1).stores({ books: 'id, updatedAt' });
  }
}
export const database = new StudioDatabase();

export async function storeBook(book: Book, db = database) {
  await db.transaction('rw', db.books, () => db.books.put(book));
}
