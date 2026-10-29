# Architecture

## Application

React and TypeScript render a single-page workspace, bundled by Vite. Navigation is
application state, so static hosting requires no route rewrites. The Pages workflow
sets Vite's base path; font requests use the same base path.

Tiptap stores manuscript content as structured JSON. Character mentions are transient
ProseMirror decorations, not text edits. The notebook uses plain text and embedded
PNG/JPEG/WebP images. Local image uploads are resized before storage.

## Data and compatibility

A book owns ordered chapters, characters, notes, saved versions, and removed chapters.
Records have stable IDs. Notes refer to chapter IDs, so reordering or renaming a
chapter does not break the connection.

The version-1 backup retains the earlier `scenes` field internally for compatibility.
The visible editor works with a single manuscript document per chapter. Loading an
earlier multi-document chapter merges its writing, moves its notes into linked
notebook entries, and adapts saved versions without discarding their text.

Zod validates imported backups before adding a separate project. Imports check nesting,
record IDs, and local manuscript image sources. HTML export escapes text and filters
links. Importing never replaces an existing project.

## Persistence

Dexie stores complete book records in IndexedDB. Autosave is debounced and serialized
per book to prevent an earlier write from replacing a later one. Failed saves retain
pending data and expose retry and backup actions. An unload handler attempts local
recovery storage and warns when writing is still pending.

Where Web Locks are supported, only one browser tab edits the library at a time. Other
tabs show a read-only workspace and acquire the editing lock after it is released.
Open project IDs and the last selected project are navigation preferences in localStorage.

Storage is scoped to the origin and browser profile. It is neither a cloud service
nor a backup. No service worker is installed; offline application loading is not
implemented.

## Exports

jsPDF generates a separate, lazily loaded book PDF. Crimson Text fonts are bundled
locally with their license. The writer selects chapters and a 5.5 × 8.5 or 6 × 9 inch
trim size. Chapter numbers retain their manuscript positions; body pagination starts
after the title page. Rich text, hard line breaks, and embedded images are included.
Planning notes and character profiles are excluded from manuscript exports.

The complete JSON backup includes all planning records, images, versions, and removed
chapters. HTML and plain-text exports provide additional readable formats.

## Verification

Vitest covers domain behavior, backward-compatible migration, backup validation,
IndexedDB round trips, and PDF dimensions, selection, and pagination. Production
builds include a TypeScript check. UI checks use a separate localhost origin so test
writing does not change the main workspace's stored projects.
