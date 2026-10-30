# Product scope

Writing Studio is a personal workspace for full books and smaller writing projects.
The main unit of the manuscript is a chapter. A short story or poem can use a single
chapter without adopting novel-length goals.

## Implemented

The workspace combines ordered chapters, summaries and drafting status, a rich-text
editor, character cards, and a notebook. Character names and aliases link to their
profiles without modifying manuscript text. Character names have first, last, and
optional middle-name fields. Unique first names also link automatically; ambiguous
shared names and aliases remain unlinked.
Profiles can be deleted from Characters or the writing context panel and restored
from Recently removed. Removing a profile clears its links without editing the
manuscript. Removed profiles remain in local storage and complete project backups.

Notes can stand alone or belong to a chapter; either kind remains visible in the
Notebook. Notes have planning status and support attached images and simple drawings.
The manuscript also supports images.

The project switcher opens the saved-project library and supports creating or closing
a project. Projects open in Outline. Chapter tabs represent open editors; closing a
tab preserves its manuscript. Each project keeps its own open tabs, and breadcrumbs
provide a direct return to the outline.

Automatic local saving, manual chapter versions, recovery of removed chapters,
complete JSON backups, and validated imports protect the writing workflow. Selected
chapters can be exported as a novel-style PDF, HTML, or plain text. Word counts and
formatted pages describe the existing manuscript; there is no target or word limit.
Read book shows scrollable sheets using the exact PDF layout, including front matter,
chapter openings, mirrored margins, running headers and page numbers. The editor
uses book-sized sheets and the same typefaces and spacing, with an optional Continuous
layout. Its visual page breaks are approximate; PDF-based counts recalculate after
edits. Page boundaries never alter the manuscript document or its undo history.

## Boundaries

The app is a static website with browser-local data. It does not include accounts,
cloud synchronization, collaborative editing, offline loading, automatic AI writing,
relationship diagrams, or a separate timeline tool. The notebook can hold research
and planning that does not need a dedicated interface.

The public repository contains application code and blank initial projects only.
Personal manuscripts and research are not bundled with the application.
