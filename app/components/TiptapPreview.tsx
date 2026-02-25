'use client';

import { EditorContent, JSONContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';

type TiptapPreviewProps = {
  content: JSONContent;
};

export default function TiptapPreview({ content }: TiptapPreviewProps) {
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        autolink: true,
        protocols: ['http', 'https'],
      }),
      Image,
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap-content min-h-[420px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-gray-900 dark:text-gray-100',
      },
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

  if (!editor) {
    return (
      <div className="min-h-[420px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-sm text-gray-500 dark:text-gray-400">
        Loading preview...
      </div>
    );
  }

  return <EditorContent editor={editor} />;
}
