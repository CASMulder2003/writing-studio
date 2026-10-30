# Product scope

Writing Studio is a personal workspace for full books and smaller writing projects.
The main unit of the manuscript is a chapter. A short story or poem can use a single
chapter without adopting novel-length goals.
Prologues and epilogues are unnumbered sections placed before and after the
numbered chapters. Their words and pages contribute to the book totals. The
outline's right-click menu can convert existing writing without losing its
content or linked notes. Older projects recognise exact Prologue/Epilogue titles;
explicit section types always take precedence.

## Implemented

The workspace combines ordered chapters, summaries and drafting status, a rich-text
editor, character cards, and a notebook. Character names and aliases link to their
profiles without modifying manuscript text. Character names have first, last, and
optional middle-name fields. Unique first names also link automatically; ambiguous
shared names and aliases remain unlinked.
Profiles can be deleted from Characters or the writing context panel and restored
from Recently removed. Removing a profile clears its links without editing the
manuscript. Removed profiles remain in local storage and complete project backups.
Characters can be dragged into a preferred order, with keyboard Move up/down actions
in their options menu. Delete actions for profiles, notes and outline sections live
in right-click menus with keyboard navigation and Escape dismissal; character and note
menus also have visible ⋯ triggers. Chapter cards use drag ordering and right-click
actions without extra arrow or ⋯ buttons. Add section
opens a chapter form on left-click; right-click or Shift+F10 offers Prologue and Epilogue.
Editable text fields preserve the browser's spelling, copy and paste context menus.

Notes can stand alone or belong to a chapter; either kind remains visible in the
Notebook. Notes have planning status and support attached images and simple drawings.
The manuscript also supports images.
The notebook groups notes by chapter or Standalone, with collapsible groups, previews,
content search, and chapter/status filters. Notes can be dragged within a group to
reorder or onto another group to change their chapter attachment. Keyboard move
actions are available in note menus. Deleted notes can be recovered intact, including
images and chapter links, from Recently removed and are retained in project backups.

The project switcher opens the saved-project library and supports creating or closing
a project. Projects open in Outline. Chapter tabs represent open editors; closing a
tab preserves its manuscript. Each project keeps its own open tabs, and breadcrumbs
provide a direct return to the outline.
Tabs have their own saved order, separate from manuscript order. Drag or use the tab
context menu to rearrange them; the same menu can close one, other, or all tabs.
Middle-click closes a tab. Scroll positions and text selections are remembered per
project/chapter during the current visit, including while book pages finish laying out.

Automatic local saving, manual chapter versions, recovery of removed chapters,
complete JSON backups, and validated imports protect the writing workflow. Selected
chapters can be exported as a novel-style PDF, HTML, or plain text. Word counts and
formatted pages describe the existing manuscript; there is no target or word limit.
Read book shows scrollable sheets using the exact PDF layout, including front matter,
chapter openings, mirrored margins, running headers and page numbers. The editor
uses book-sized sheets and the same typefaces and spacing, with an optional Continuous
layout. Its visual page breaks are approximate; PDF-based counts recalculate after
edits. Page boundaries never alter the manuscript document or its undo history.
Writing, reading and page counts use the standard 6 × 9 inch trim. The formatting
toolbar stays pinned during scrolling and contains the Pages/Continuous switch.
Export defaults to the same layout, with an optional 5.5 × 8.5 inch version; choosing
the alternative does not change the workspace.

## Boundaries

The app is a static website with browser-local data. It does not include accounts,
cloud synchronization, collaborative editing, offline loading, automatic AI writing,
relationship diagrams, or a separate timeline tool. The notebook can hold research
and planning that does not need a dedicated interface.

The public repository contains application code and blank initial projects only.
Personal manuscripts and research are not bundled with the application.
