'use client';

/**
 * Rich Text Editor for Clinical Documentation
 * 
 * Medical-grade text editor built on Tiptap (ProseMirror).
 * Designed for professional clinical note-taking with:
 * - Rich formatting (bold, italic, lists, headings)
 * - Medical terminology support
 * - Auto-save integration
 * - Template support
 * 
 * Usage:
 * <RichTextEditor
 *   content={htmlContent}
 *   onChange={handleChange}
 *   placeholder="Document clinical findings..."
 * />
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
    Highlighter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
                    'px-4 py-3',
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
        <div className="border rounded-lg overflow-hidden bg-white">
            {/* Toolbar */}
            {!readOnly && (
                <div className="border-b bg-muted/30 p-2 flex flex-wrap items-center gap-1">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        isActive={editor.isActive('underline')}
                        title="Underline (Ctrl+U)"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        isActive={editor.isActive('highlight')}
                        title="Highlight"
                    >
                        <Highlighter className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-6 bg-border mx-1" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive('heading', { level: 2 })}
                        title="Heading"
                    >
                        <Heading2 className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        title="Bullet List"
                    >
                        <List className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        title="Numbered List"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-6 bg-border mx-1" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo className="h-4 w-4" />
                    </ToolbarButton>

                    {/* Character Count */}
                    <div className="ml-auto text-xs text-muted-foreground">
                        {editor.storage.characterCount.characters()} characters
                    </div>
                </div>
            )}

            {/* Editor Content */}
            <EditorContent
                editor={editor}
                className={cn(
                    'prose-headings:font-semibold prose-headings:text-foreground',
                    'prose-p:text-foreground prose-p:leading-relaxed',
                    'prose-strong:text-foreground prose-strong:font-semibold',
                    'prose-ul:text-foreground prose-ol:text-foreground',
                    'prose-li:text-foreground',
                    readOnly && 'cursor-default'
                )}
            />
        </div>
    );
}

/**
 * Toolbar Button Component
 */
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
    children
}: ToolbarButtonProps) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                'h-8 w-8 p-0',
                isActive && 'bg-muted text-foreground',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            {children}
        </Button>
    );
}
