'use client';

/**
 * Template Selector
 * 
 * Component to select and apply clinical documentation templates.
 * Supports aesthetic consultation, SOAP notes, and procedure templates.
 */

import { FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CLINICAL_TEMPLATES, type ClinicalTemplate } from '@/lib/clinical-templates';

interface TemplateSelectorProps {
    onSelect: (template: ClinicalTemplate) => void;
    className?: string;
}

export function TemplateSelector({ onSelect, className }: TemplateSelectorProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={className}>
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    Apply Template
                    <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Clinical Templates</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
                    Aesthetic & Cosmetic
                </DropdownMenuLabel>
                {CLINICAL_TEMPLATES.filter(t => t.specialty === 'aesthetic').map(template => (
                    <DropdownMenuItem
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="cursor-pointer"
                    >
                        {template.name}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
                    General & Surgical
                </DropdownMenuLabel>
                {CLINICAL_TEMPLATES.filter(t => t.specialty !== 'aesthetic').map(template => (
                    <DropdownMenuItem
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="cursor-pointer"
                    >
                        {template.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
