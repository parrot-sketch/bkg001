'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, X, Palette, Activity, Info } from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TheaterFormData, TheaterType } from './types';

interface TheaterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: TheaterFormData;
  setFormData: React.Dispatch<React.SetStateAction<TheaterFormData>>;
  isEditing: boolean;
  saving: boolean;
  onSave: () => void;
}

// Muted, professional clinical palette
const PRESET_COLORS = [
    '#475569', // Slate (Neutral)
    '#6366F1', // Indigo (Primary)
    '#059669', // Emerald (Clinical)
    '#0891B2', // Cyan (Modern)
    '#4F46E5', // Violet (Deep)
    '#1E293B', // Dark Slate (Corporate)
];

export function TheaterFormDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  isEditing,
  saving,
  onSave,
}: TheaterFormDialogProps) {
  const [capInput, setCapInput] = useState('');

  const capabilities: string[] = formData.capabilities
    ? JSON.parse(formData.capabilities)
    : [];

  const addCapability = () => {
    const trimmed = capInput.trim();
    if (!trimmed || capabilities.includes(trimmed)) return;
    const updated = [...capabilities, trimmed];
    setFormData((prev) => ({
      ...prev,
      capabilities: JSON.stringify(updated),
    }));
    setCapInput('');
  };

  const removeCapability = (cap: string) => {
    const updated = capabilities.filter((c) => c !== cap);
    setFormData((prev) => ({
      ...prev,
      capabilities: updated.length > 0 ? JSON.stringify(updated) : '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <div 
            className="h-2 w-full" 
            style={{ backgroundColor: formData.color_code || '#475569' }} 
        />
        
        <div className="p-8">
            <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-bold text-slate-900">
                    {isEditing ? 'Reconfigure Theater' : 'Provision New Theater'}
                </DialogTitle>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Enter clinical suite specifications and operational constraints.
                </p>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Theater Name</Label>
                        <Input
                            placeholder="e.g., OR-01 (Main Surgical Suite)"
                            className="rounded-xl border-slate-200 focus:ring-primary/20 bg-slate-50/50"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suite Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, type: val as TheaterType }))}
                        >
                            <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                <SelectItem value="MAJOR" className="rounded-lg">Major OR</SelectItem>
                                <SelectItem value="MINOR" className="rounded-lg">Minor Procedure Room</SelectItem>
                                <SelectItem value="PROCEDURE_ROOM" className="rounded-lg">Basic Procedure Suite</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Hours</Label>
                        <Input
                            placeholder="e.g., Mon-Fri, 08:00 - 18:00"
                            className="rounded-xl border-slate-200 bg-slate-50/50"
                            value={formData.operational_hours}
                            onChange={(e) => setFormData(prev => ({ ...prev, operational_hours: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-3 pt-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Palette className="h-4 w-4 text-slate-400" />
                            System Visual Identifier
                        </Label>
                        <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, color_code: color }))}
                                    className={cn(
                                        "h-8 w-8 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm ring-offset-2 ring-primary",
                                        formData.color_code === color ? "ring-2 scale-110" : "scale-100"
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suite Capabilities</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add capability (e.g., Laser, General)"
                                className="rounded-xl border-slate-200 bg-slate-50/50"
                                value={capInput}
                                onChange={(e) => setCapInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                            />
                            <Button type="button" variant="outline" size="icon" onClick={addCapability} className="rounded-xl shrink-0 h-10 w-10">
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 min-h-[40px]">
                            {capabilities.map((cap) => (
                                <Badge
                                    key={cap}
                                    className="pl-3 pr-1 py-1 rounded-lg bg-slate-100 text-slate-700 border-slate-200 font-bold text-[10px] group transition-all hover:bg-slate-200"
                                >
                                    {cap}
                                    <button
                                        type="button"
                                        onClick={() => removeCapability(cap)}
                                        className="ml-2 hover:bg-slate-300 rounded-md p-0.5 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            {capabilities.length === 0 && (
                                <span className="text-xs text-slate-400 italic">No specific specs added</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Info className="h-4 w-4 text-slate-400" />
                            Operations Notes
                        </Label>
                        <Textarea
                            placeholder="Maintenance schedules, specific OR restrictions or safety notes..."
                            className="rounded-2xl border-slate-200 bg-slate-50/50 min-h-[140px] resize-none focus:ring-primary/20"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>
                </div>
            </div>

            <DialogFooter className="mt-8 gap-3 sm:gap-0 border-t border-slate-100 pt-6">
                <Button 
                    variant="ghost" 
                    onClick={() => onOpenChange(false)} 
                    disabled={saving}
                    className="rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                    Discard Changes
                </Button>
                <Button 
                    onClick={onSave} 
                    disabled={saving}
                    className="rounded-xl bg-slate-900 group shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 px-8 font-bold"
                >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Apply Specification' : 'Commission Theater'}
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
