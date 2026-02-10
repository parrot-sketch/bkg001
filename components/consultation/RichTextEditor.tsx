'use client';

/**
 * Rich Text Editor for Clinical Documentation
 * 
 * Medical-grade text editor built on Tiptap (ProseMirror).
 * Premium design with clean toolbar, proper spacing, and polished feel.
 * 
 * Features:
 * - Rich formatting (bold, italic, lists, headings)
 * - Medical terminology support
 * - Auto-save integration
 * - Template support
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Undo,
  Redo,
  Highlighter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  readOnly = false,
  autoFocus = false,
  className,
  minHeight = '300px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
    ],
    content,
    editable: !readOnly,
    autofocus: autoFocus,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Defer onChange to next tick to avoid setState during render
      setTimeout(() => onChange(html), 0);
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'min-h-[' + minHeight + ']',
          'px-5 py-4',
          className
        ),
      },
    },
  });

  // Update content when prop changes (for external updates)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn(
      'rounded-xl border border-slate-200 overflow-hidden bg-white transition-shadow',
      !readOnly && 'focus-within:border-slate-300 focus-within:shadow-sm focus-within:ring-1 focus-within:ring-slate-200/50',
    )}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 flex flex-wrap items-center gap-0.5">
          {/* Formatting group */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive('highlight')}
              title="Highlight"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Structure group */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* History group */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          {/* Character Count */}
          <div className="ml-auto text-[11px] text-slate-400 font-medium tabular-nums px-1">
            {editor.storage.characterCount.characters()} chars
          </div>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className={cn(
          'prose-headings:font-semibold prose-headings:text-slate-900',
          'prose-p:text-slate-700 prose-p:leading-relaxed',
          'prose-strong:text-slate-900 prose-strong:font-semibold',
          'prose-ul:text-slate-700 prose-ol:text-slate-700',
          'prose-li:text-slate-700',
          readOnly && 'cursor-default',
        )}
      />
    </div>
  );
}

// ============================================================================
// TOOLBAR COMPONENTS
// ============================================================================

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-slate-200 mx-1.5" />;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
        isActive
          ? 'bg-slate-200/80 text-slate-900'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}
