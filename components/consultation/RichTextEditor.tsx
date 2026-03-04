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
import { useEffect, useRef } from 'react';
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
import { DictationControl } from './DictationControl';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  minHeight?: string;
  changeDebounceMs?: number;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  readOnly = false,
  autoFocus = false,
  className,
  minHeight = '300px',
  changeDebounceMs = 500,
}: RichTextEditorProps) {
  // Track internal content updates (prop sync) vs user edits.
  const isInternalUpdateRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const lastEmittedContentRef = useRef(content);
  const pendingContentRef = useRef(content);
  const emitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const flushPendingChange = () => {
    if (pendingContentRef.current === lastEmittedContentRef.current) {
      return;
    }
    lastEmittedContentRef.current = pendingContentRef.current;
    onChangeRef.current(pendingContentRef.current);
  };

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
      // Skip onChange if this update came from content prop synchronization.
      if (isInternalUpdateRef.current) {
        isInternalUpdateRef.current = false;
        return;
      }

      const html = editor.getHTML();
      pendingContentRef.current = html;

      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current);
      }

      emitTimerRef.current = setTimeout(() => {
        flushPendingChange();
      }, changeDebounceMs);
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'px-5 py-4',
          className
        ),
      },
    },
  });

  // Update content when prop changes (for external updates only).
  useEffect(() => {
    if (!editor) return;

    const editorHtml = editor.getHTML();
    const isRoundTripFromThisEditor =
      content === pendingContentRef.current ||
      content === lastEmittedContentRef.current ||
      content === editorHtml;

    if (isRoundTripFromThisEditor) {
      return;
    }

    isInternalUpdateRef.current = true;
    pendingContentRef.current = content;
    lastEmittedContentRef.current = content;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  useEffect(() => {
    return () => {
      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current);
      }
      flushPendingChange();
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn(
      'rounded-xl border border-slate-200 overflow-hidden bg-white transition-all duration-200',
      !readOnly && 'focus-within:border-indigo-300 focus-within:shadow-[0_0_15px_-5px_rgba(79,70,229,0.1)] ring-0',
    )}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="border-b border-slate-100 bg-slate-50/50 px-3 py-2 flex flex-wrap items-center gap-0.5">
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

          <ToolbarDivider />

          {/* AI / Voice Intelligence Group */}
          <ToolbarGroup>
            <DictationControl
              onTranscription={(text: string) => {
                editor.chain().focus().insertContent(text + ' ').run();
              }}
              context={placeholder?.includes('complaint') ? 'Chief Complaint' : placeholder?.includes('examination') ? 'Examination' : 'default'}
            />
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
        style={{ minHeight }}
        className={cn(
          'prose-headings:font-bold prose-headings:text-slate-900 prose-headings:tracking-tight',
          'prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-[14px]',
          'prose-strong:text-slate-900 prose-strong:font-bold',
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
  return <div className="w-px h-4 bg-slate-200 mx-1.5" />;
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
        'inline-flex items-center justify-center h-7 w-7 rounded-lg transition-all',
        isActive
          ? 'bg-indigo-50 text-indigo-600 font-bold'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}
