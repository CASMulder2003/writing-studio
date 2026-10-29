# Writing Studio

A personal writing application for novels, short stories, poetry, and notes.
Built with React, TypeScript, and Tiptap; runs locally or as a static GitHub Pages site.

## Workspace

- Open only the projects you want in closable tabs. The + button opens your library or creates a project.
- Write and reorder chapters, add summaries, and track Planned, Drafting, Revising, and Complete status.
- See chapter and book word counts and estimated pages, without targets or reading-time goals.
- Keep character profiles and aliases. Click highlighted names in your manuscript to open their profiles.
- Write standalone notes or attach them to chapters. Add images, captions, and drawings to the notebook.
- Use rich text, manuscript images, focus mode, search, and a compiled reading view.
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

Page counts in the workspace are estimates based on text, line breaks, chapter
openings, and images. The exported PDF provides the final pagination for its chosen
trim size. An export includes only the selected chapters and excludes planning notes.

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
