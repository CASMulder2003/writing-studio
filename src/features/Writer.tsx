import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { characterDecorations } from './characterReferences';
import { WritingPages } from './WritingPages';
import type { BookSize } from './bookFormat';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Minus,
  Heading2,
  ImagePlus,
} from 'lucide-react';
import { readImage } from '../shared/images';
import { type Character, type DocNode, type Scene } from '../domain/book';

export function Writer({
  scene,
  characters,
  onChange,
  onCharacter,
  readOnly,
  size,
  chapterTitle,
  chapterLabel,
  onPages,
  initialSelection,
  onSelectionChange,
}: {
  scene: Scene;
  characters: Character[];
  onChange: (content: DocNode) => void;
  onCharacter: (id: string) => void;
  readOnly: boolean;
  size: BookSize;
  chapterTitle: string;
  chapterLabel: string;
  onPages: (pages: number) => void;
  initialSelection?: { from: number; to: number };
  onSelectionChange: (selection: { from: number; to: number }) => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');
  const [paged, setPaged] = useState(() => {
    try {
      return localStorage.getItem('writing-studio-page-view') !== 'continuous';
    } catch {
      return true;
    }
  });
  const savedSelection = useRef(initialSelection);
  const current = useRef({
    characters,
    onChange,
    onCharacter,
    onSelectionChange,
  });
  current.current = { characters, onChange, onCharacter, onSelectionChange };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, protocols: ['http', 'https', 'mailto'] },
      }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Extension.create({
        name: 'characterReferences',
        addProseMirrorPlugins() {
          return [
            new Plugin({
              key: new PluginKey('characterReferences'),
              props: {
                decorations(state) {
                  return characterDecorations(
                    state.doc,
                    current.current.characters,
                  );
                },
                handleClick(_view, _pos, event) {
                  const element = (event.target as HTMLElement).closest(
                    '[data-character-id]',
                  );
                  if (element) {
                    current.current.onCharacter(
                      element.getAttribute('data-character-id')!,
                    );
                    return true;
                  }
                  return false;
                },
              },
            }),
          ];
        },
      }),
    ],
    content: scene.content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'manuscript-editor',
        'aria-label': 'Chapter manuscript',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) =>
      current.current.onChange(editor.getJSON() as DocNode),
    onCreate: ({ editor }) => {
      const selection = savedSelection.current;
      if (selection)
        editor.commands.setTextSelection({
          from: Math.min(selection.from, editor.state.doc.content.size),
          to: Math.min(selection.to, editor.state.doc.content.size),
        });
    },
    onSelectionUpdate: ({ editor }) =>
      current.current.onSelectionChange({
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      }),
  });
  useEffect(() => {
    if (editor)
      editor.view.dispatch(editor.state.tr.setMeta('charactersChanged', true));
  }, [characters, editor]);
  useEffect(() => {
    editor?.setEditable(!readOnly, false);
  }, [readOnly, editor]);
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold'),
      italic: e?.isActive('italic'),
      underline: e?.isActive('underline'),
      heading: e?.isActive('heading', { level: 2 }),
      bullet: e?.isActive('bulletList'),
      ordered: e?.isActive('orderedList'),
      quote: e?.isActive('blockquote'),
      undo: e?.can().undo(),
      redo: e?.can().redo(),
    }),
  });
  if (!editor) return null;
  const tools = [
    {
      label: 'Bold',
      icon: Bold,
      on: active?.bold,
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      on: active?.italic,
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      icon: Underline,
      on: active?.underline,
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Heading',
      icon: Heading2,
      on: active?.heading,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Bullet list',
      icon: List,
      on: active?.bullet,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      on: active?.ordered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Quotation',
      icon: Quote,
      on: active?.quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Section break',
      icon: Minus,
      on: false,
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];
  return (
    <>
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Text formatting"
      >
        {tools.map((t) => (
          <button
            key={t.label}
            className="icon-button"
            title={t.label}
            aria-label={t.label}
            aria-pressed={Boolean(t.on)}
            disabled={readOnly}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.action}
          >
            <t.icon size={17} />
          </button>
        ))}
        <span className="toolbar-divider" />
        <button
          className="icon-button"
          title="Undo"
          aria-label="Undo"
          disabled={!active?.undo || readOnly}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="icon-button"
          title="Redo"
          aria-label="Redo"
          disabled={!active?.redo || readOnly}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Insert image"
          title="Insert image"
          disabled={readOnly}
          onClick={() => imageInput.current?.click()}
        >
          <ImagePlus size={17} />
        </button>
        <input
          ref={imageInput}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const image = await readImage(file);
              editor
                .chain()
                .focus()
                .setImage({ src: image.dataUrl, alt: image.name })
                .run();
              setImageError('');
            } catch (error) {
              setImageError(
                error instanceof Error
                  ? error.message
                  : 'Image could not be opened.',
              );
            }
            if (imageInput.current) imageInput.current.value = '';
          }}
        />
        <label className="writing-layout-label">
          <span>Layout</span>
          <select
            aria-label="Writing layout"
            value={paged ? 'pages' : 'continuous'}
            onChange={(e) => {
              const next = e.target.value === 'pages';
              setPaged(next);
              try {
                localStorage.setItem(
                  'writing-studio-page-view',
                  next ? 'pages' : 'continuous',
                );
              } catch {
                /* Optional preference. */
              }
            }}
          >
            <option value="pages">Pages</option>
            <option value="continuous">Continuous</option>
          </select>
        </label>
      </div>
      {imageError && (
        <p className="inline-error" role="alert">
          {imageError}
        </p>
      )}
      <WritingPages
        editor={editor}
        size={size}
        zoom="fit"
        paged={paged}
        chapterTitle={chapterTitle}
        chapterLabel={chapterLabel}
        onPages={onPages}
      >
        <EditorContent editor={editor} />
      </WritingPages>
    </>
  );
}
