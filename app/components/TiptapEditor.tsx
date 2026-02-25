'use client';

import { EditorContent, JSONContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

type TiptapEditorProps = {
  content: JSONContent;
  onChange: (value: { json: JSONContent; html: string; text: string }) => void;
  onUploadImage: (file: File) => Promise<string>;
};

function toolbarButton(active?: boolean) {
  return `px-2.5 py-1.5 border rounded text-xs transition-colors ${
    active
      ? 'bg-green-600 text-white border-green-600'
      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
  }`;
}

export default function TiptapEditor({ content, onChange, onUploadImage }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https'],
      }),
      Image,
      Placeholder.configure({
        placeholder: 'Start writing your post...',
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'tiptap-content min-h-[420px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-[15px] leading-7 text-gray-900 dark:text-gray-100 focus:outline-none',
      },
    },
    onUpdate: ({ editor: current }: { editor: { getJSON: () => JSONContent; getHTML: () => string; getText: () => string } }) => {
      onChange({
        json: current.getJSON(),
        html: current.getHTML(),
        text: current.getText(),
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = JSON.stringify(content);
    const current = JSON.stringify(editor.getJSON());
    if (next !== current) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url.trim() }).run();
  };

  const addImageFromUrl = () => {
    if (!editor) return;
    const url = window.prompt('Image URL', 'https://');
    if (!url) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const uploadImage = async (file: File) => {
    if (!editor) return;
    const url = await onUploadImage(file);
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  if (!editor) {
    return (
      <div className="min-h-[420px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 py-2 px-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-md border border-gray-200 dark:border-gray-700">
        <button type="button" className={toolbarButton()} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          Undo
        </button>
        <button type="button" className={toolbarButton()} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          Redo
        </button>
        <span className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
        <select
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : 'p'
          }
          onChange={(event) => {
            const value = event.target.value;
            if (value === 'p') {
              editor.chain().focus().setParagraph().run();
              return;
            }
            editor.chain().focus().toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
          }}
          className="px-2.5 py-1.5 border rounded text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <span className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
        <button type="button" className={toolbarButton(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button type="button" className={toolbarButton(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button type="button" className={toolbarButton(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}>List</button>
        <button type="button" className={toolbarButton(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered</button>
        <button type="button" className={toolbarButton(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
        <button type="button" className={toolbarButton(editor.isActive('codeBlock'))} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>Code</button>
        <button type="button" className={toolbarButton(editor.isActive('link'))} onClick={setLink}>Link</button>
        <span className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
        <button type="button" className={toolbarButton()} onClick={addImageFromUrl}>Image URL</button>
        <label className={`${toolbarButton()} cursor-pointer`}>
          Upload Image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadImage(file);
              event.currentTarget.value = '';
            }}
          />
        </label>
        <button type="button" className={toolbarButton()} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Clear</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
