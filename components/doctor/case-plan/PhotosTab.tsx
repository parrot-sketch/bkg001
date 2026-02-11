'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, Upload, ImageIcon, Loader2, Plus } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';
import { useAddPhoto } from '@/hooks/doctor/useCasePlan';

interface PhotosTabProps {
    casePlan?: CasePlanResponseDto | null;
    caseId?: string;
}

const ANGLES = [
    { value: 'FRONT', label: 'Front' },
    { value: 'OBLIQUE_LEFT', label: 'Oblique Left' },
    { value: 'OBLIQUE_RIGHT', label: 'Oblique Right' },
    { value: 'PROFILE_LEFT', label: 'Profile Left' },
    { value: 'PROFILE_RIGHT', label: 'Profile Right' },
    { value: 'BACK', label: 'Back' },
    { value: 'TOP', label: 'Top' },
    { value: 'BOTTOM', label: 'Bottom' },
];

const TIMEPOINTS = [
    { value: 'PRE_OP', label: 'Pre-Op' },
    { value: 'ONE_WEEK_POST_OP', label: '1 Week Post-Op' },
    { value: 'ONE_MONTH_POST_OP', label: '1 Month Post-Op' },
    { value: 'THREE_MONTHS_POST_OP', label: '3 Months Post-Op' },
    { value: 'SIX_MONTHS_POST_OP', label: '6 Months Post-Op' },
    { value: 'ONE_YEAR_POST_OP', label: '1 Year Post-Op' },
];

export function PhotosTab({ casePlan, caseId }: PhotosTabProps) {
    const images = casePlan?.images || [];
    const addPhoto = useAddPhoto(caseId ?? '');

    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [angle, setAngle] = useState('FRONT');
    const [timepoint, setTimepoint] = useState('PRE_OP');
    const [description, setDescription] = useState('');
    const [marketingConsent, setMarketingConsent] = useState(false);

    const canUpload = !!caseId;

    const preOpImages = images.filter(img => img.timepoint === 'PRE_OP');
    const otherImages = images.filter(img => img.timepoint !== 'PRE_OP');

    const handleUpload = async () => {
        if (!imageUrl.trim() || !caseId) return;
        await addPhoto.mutateAsync({
            imageUrl: imageUrl.trim(),
            angle,
            timepoint,
            description: description.trim() || undefined,
            consentForMarketing: marketingConsent,
        });
        setShowUploadDialog(false);
        resetForm();
    };

    const resetForm = () => {
        setImageUrl('');
        setAngle('FRONT');
        setTimepoint('PRE_OP');
        setDescription('');
        setMarketingConsent(false);
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Clinical Photography</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Standard views for surgical planning and documentation
                    </p>
                </div>
                {canUpload && (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => setShowUploadDialog(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Add Photo
                        </Button>
                    </div>
                )}
            </div>

            {/* Pre-Op Summary */}
            {images.length > 0 && (
                <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                        {preOpImages.length} Pre-Op
                    </Badge>
                    {otherImages.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {otherImages.length} Other
                        </Badge>
                    )}
                </div>
            )}

            {/* Gallery */}
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
                    <div className="bg-muted p-3 rounded-full mb-4">
                        <ImageIcon className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold text-foreground">No photos uploaded yet</h4>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Upload standard medical photography views for surgical reference.
                        At least one pre-op photo is required for readiness.
                    </p>
                    {canUpload && (
                        <Button
                            variant="outline"
                            className="mt-5 gap-2"
                            onClick={() => setShowUploadDialog(true)}
                        >
                            <Upload className="h-4 w-4" />
                            Upload Photos
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className="group relative aspect-square bg-muted rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
                        >
                            <img
                                src={img.imageUrl}
                                alt={img.description || `${img.angle} view`}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2">
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] bg-black/60 text-white border-0"
                                >
                                    {img.timepoint?.replace(/_/g, ' ')}
                                </Badge>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2.5 pt-8">
                                <p className="text-white text-xs font-medium">
                                    {img.description || img.angle?.replace(/_/g, ' ')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Upload Dialog ─────────────────────────────────────── */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Clinical Photo</DialogTitle>
                        <DialogDescription>
                            Provide the image URL and select the angle and timepoint.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Image URL</Label>
                            <Input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://storage.example.com/image.jpg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Angle</Label>
                                <Select value={angle} onValueChange={setAngle}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ANGLES.map((a) => (
                                            <SelectItem key={a.value} value={a.value}>
                                                {a.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Timepoint</Label>
                                <Select value={timepoint} onValueChange={setTimepoint}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIMEPOINTS.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                Description <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. AP view, standard lighting"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <Checkbox
                                id="marketing"
                                checked={marketingConsent}
                                onCheckedChange={(v) => setMarketingConsent(v === true)}
                            />
                            <label htmlFor="marketing" className="text-sm text-muted-foreground cursor-pointer">
                                Patient consents to marketing use (anonymized)
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={addPhoto.isPending || !imageUrl.trim()}
                            className="gap-2"
                        >
                            {addPhoto.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Camera className="h-4 w-4" />
                            Add Photo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
