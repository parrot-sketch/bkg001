'use client';

/**
 * ClinicalRichTextEditor
 *
 * Medical-grade rich text editor for SOAP documentation.
 * Built on Tiptap (ProseMirror). Presentation-only component.
 *
 * Responsibilities:
 * - Render HTML content
 * - Capture edits and emit HTML via onChange
 * - Render clinical toolbar
 * - Manage selection, focus, blur
 * - Support keyboard shortcuts
 * - Support readOnly, disabled, loading states
 *
 * Must NOT:
 * - Call SessionService, DraftService, doctorApi, apiClient
 * - Import Application, Domain (runtime), Infrastructure
 * - Own persistence, business rules, dirty tracking, auto-save
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useRef, useCallback } from 'react';
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
  Quote,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DictationControl } from './DictationControl';

interface ClinicalRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  minHeight?: string;
  changeDebounceMs?: number;
  ariaLabel?: string;
  disabled?: boolean;
}

export function ClinicalRichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  readOnly = false,
  autoFocus = false,
  className,
  minHeight = '300px',
  changeDebounceMs = 0,
  ariaLabel = 'Clinical documentation editor',
  disabled = false,
}: ClinicalRichTextEditorProps) {
  const isInternalUpdateRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const lastEmittedContentRef = useRef(content);
  const pendingContentRef = useRef(content);
  const emitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const flushPendingChange = useCallback(() => {
    if (pendingContentRef.current === lastEmittedContentRef.current) {
      return;
    }
    lastEmittedContentRef.current = pendingContentRef.current;
    onChangeRef.current(pendingContentRef.current);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: {},
        horizontalRule: {},
        link: {},
      }),
      Underline.configure({
        HTMLAttributes: { style: 'text-decoration: underline' },
      }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content,
    editable: !readOnly && !disabled,
    autofocus: autoFocus,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (isInternalUpdateRef.current) {
        isInternalUpdateRef.current = false;
        return;
      }

      const html = editor.getHTML();
      pendingContentRef.current = html;

      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current);
      }

      if (changeDebounceMs > 0) {
        emitTimerRef.current = setTimeout(() => {
          flushPendingChange();
        }, changeDebounceMs);
      } else {
        flushPendingChange();
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'px-5 py-4',
          className
        ),
        'aria-label': ariaLabel,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-readonly': String(readOnly),
      },
    },
  });

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
  }, [flushPendingChange]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 overflow-hidden bg-white transition-all duration-200 flex flex-col',
        !readOnly && !disabled && 'focus-within:border-indigo-300 focus-within:shadow-[0_0_15px_-5px_rgba(79,70,229,0.1)] ring-0',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      role="application"
      aria-label={ariaLabel}
    >
      {/* Toolbar */}
      {!readOnly && !disabled && (
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-3 py-2 flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatting tools">
          {/* Formatting group */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
              aria-pressed={editor.isActive('bold')}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
              aria-pressed={editor.isActive('italic')}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
              aria-pressed={editor.isActive('underline')}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive('highlight')}
              title="Highlight"
              aria-label="Highlight"
              aria-pressed={editor.isActive('highlight')}
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
              aria-label="Heading"
              aria-pressed={editor.isActive('heading', { level: 2 })}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
              aria-label="Bullet list"
              aria-pressed={editor.isActive('bulletList')}
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
              aria-label="Numbered list"
              aria-pressed={editor.isActive('orderedList')}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Block Quote"
              aria-label="Block quote"
              aria-pressed={editor.isActive('blockquote')}
            >
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* History group */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo className="h-3.5 w-3.5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Voice / AI group */}
          <ToolbarGroup>
            <DictationControl
              onTranscription={(text: string) => {
                editor.chain().focus().insertContent(text + ' ').run();
              }}
              context={placeholder?.toLowerCase().includes('complaint') ? 'Chief Complaint' : placeholder?.toLowerCase().includes('examination') ? 'Examination' : 'default'}
            />
          </ToolbarGroup>

          {/* Character Count */}
          <div className="ml-auto text-[11px] text-slate-400 font-medium tabular-nums px-1" aria-live="polite">
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
          readOnly && 'cursor-default'
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
  return <div className="w-px h-4 bg-slate-200 mx-1.5" aria-hidden="true" />;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  ariaLabel,
  ariaPressed,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
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
