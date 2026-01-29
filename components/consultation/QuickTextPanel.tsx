'use client';

/**
 * Quick Text Panel
 * 
 * Sidebar panel for quick insertion of common medical phrases.
 * Organized by category with search functionality.
 */

import { useState } from 'react';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { QUICK_TEXT_LIBRARY, searchQuickText, type QuickTextItem } from '@/lib/quick-text';

interface QuickTextPanelProps {
    onInsert: (text: string) => void;
    className?: string;
}

export function QuickTextPanel({ onInsert, className }: QuickTextPanelProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter items based on search
    const filteredItems = searchQuery
        ? searchQuickText(searchQuery)
        : [];

    const handleInsert = (text: string) => {
        onInsert(text);
    };

    return (
        <div className={`flex flex-col h-full bg-muted/10 border-l ${className}`}>
            <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Quick Text</h3>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search phrases..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                {searchQuery ? (
                    <div className="p-4 space-y-2">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <QuickTextItemButton
                                    key={item.id}
                                    item={item}
                                    onClick={() => handleInsert(item.text)}
                                />
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-xs">
                                No results found
                            </div>
                        )}
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={['opening-statements', 'examination-findings']} className="w-full">
                        {QUICK_TEXT_LIBRARY.map((category) => (
                            <AccordionItem key={category.id} value={category.id} className="border-b-0">
                                <AccordionTrigger className="px-4 py-2 hover:bg-muted/50 text-xs font-semibold">
                                    {category.name}
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-2 pt-0 space-y-1">
                                    {category.items.map((item) => (
                                        <QuickTextItemButton
                                            key={item.id}
                                            item={item}
                                            onClick={() => handleInsert(item.text)}
                                        />
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </ScrollArea>

            <div className="p-3 border-t bg-muted/20">
                <Button variant="outline" size="sm" className="w-full text-xs h-7">
                    <Plus className="h-3 w-3 mr-1.5" />
                    Create New Quick Text
                </Button>
            </div>
        </div>
    );
}

function QuickTextItemButton({ item, onClick }: { item: QuickTextItem; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-2 rounded-md hover:bg-muted/80 transistion-colors group"
        >
            <div className="text-xs font-medium text-foreground group-hover:text-primary mb-0.5">
                {item.label}
            </div>
            <div className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                {item.text}
            </div>
        </button>
    );
}
