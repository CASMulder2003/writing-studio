# Writing Studio

A personal writing application for novels, short stories, poetry, and notes.
Built with React, TypeScript, and Tiptap; runs locally or as a static GitHub Pages site.

## Workspace

- Switch projects from the project name at the top. Open chapters from Outline into closable tabs; each project remembers its tabs.
- Drag tabs into a useful working order without rearranging the book. Right-click a tab to close it, close other/all tabs, or move it by keyboard. Middle-click also closes a tab. Switching chapters restores the scroll position and text selection during the current visit.
- Write and reorder chapters, add summaries, and track Planned, Drafting, Revising, and Complete status.
- Click Add section for a chapter; right-click it (or press Shift+F10) for an unnumbered prologue or epilogue. Change an existing section's type through its right-click menu. Chapter counts exclude these sections; word and page totals include them.
- See chapter and book word counts and formatted page counts, without targets or reading-time goals.
- Keep compact character profiles with first, last, optional middle names, and aliases. Click highlighted full names or unique first names to open their profiles.
- Arrange characters by dragging their names, or use Move up/down in their ⋯ menu.
- Right-click character names, notes, or outline sections for their actions. Characters and notes also have ⋯ menus; chapter cards keep their actions in the right-click menu. Delete entries and restore them from Recently removed. Deleting a profile leaves manuscript text intact. Text fields retain their usual browser context menus.
- Write standalone notes or attach them to chapters. Browse grouped previews and search note content. Drag notes to reorder them or move them onto another chapter group. Add images, captions, and drawings.
- Write on scrolling book-sized pages, or switch to Continuous in the formatting toolbar. The toolbar stays visible as you scroll.
- Click a chapter title directly on the page in writing or reading view to rename it. Enter or clicking away saves; Escape cancels. Titles stay in sync with the outline, tabs, and exports.
- Use rich text, manuscript images, focus mode, search, and a paginated reading view that shares the PDF layout.
- Save chapter versions, restore earlier drafts, and recover removed chapters.
- Export selected chapters as a novel-sized PDF with a title page, chapter openings, and page numbers. HTML and plain-text exports are also available.
- Back up a complete project as JSON and import it as a separate copy.

## Your writing

Projects save automatically in this browser's IndexedDB storage. The public site
serves the application; it does not upload your manuscripts to GitHub or a server.
Your writing is not stored in this source folder. Export backups regularly.

Localhost, GitHub Pages, different browsers, and different devices each have
separate storage. Use **Export → Back up this book**, then **Import a backup** at
the destination to move a project. Clearing browser data removes local projects.
There is no account, cloud sync, or offline application cache. The website or
local development server must be available to load the app.

Page counts recalculate from the PDF layout after edits. A tilde marks a temporary
estimate while pagination is pending. Workspace totals count body pages; Read book
also includes the title page and its blank reverse. Reading and PDF export share
the same page layout. Writing uses the same Crimson Text 10.5 pt / 14 pt typography
and trim size, with continuous editable text flowing across visual sheets. Its
browser line breaks can differ slightly from the final PDF. Writing, reading and
page counts use the standard 6 × 9 inch trade paperback size. PDF export defaults
to that size and offers 5.5 × 8.5 inches as an alternative without changing the
workspace layout. An export includes only selected sections and excludes planning notes.

## Run locally

Use Node.js 24.15 or newer and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the localhost address printed by Vite. Keep that server running while using
the local app.

```sh
pnpm test
pnpm build
```

The production build checks TypeScript and creates `dist/`. Tests cover backup
round trips, character matching, chapter migration, page estimates, storage, and
PDF selection and pagination.

## GitHub Pages

In the repository's **Settings → Pages**, select **GitHub Actions** as the source.
The publishing workflow builds and tests changes on `main`, determines the Pages
base path, and deploys the static output. It can also be run manually.

Only application source and bundled fonts belong in Git. Manuscripts, backups,
research attachments, and test exports must stay outside the tracked source.

## Project structure

```text
src/app/       Workspace and navigation
src/features/  Editor, project chooser, drawings, and book PDF
src/domain/    Project model, validation, migration, counting, and exports
src/storage/   IndexedDB, autosave, recovery, and single-writer coordination
src/shared/    Image preparation
src/styles/    Application styling and responsive layout
public/fonts/ Book PDF typefaces and their license
docs/         Scope, design decisions, and architecture
```

The book PDF uses Crimson Text, distributed under the SIL Open Font License;
see [the bundled font license](public/fonts/OFL.txt).
