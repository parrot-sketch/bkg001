'use client';

import { Button } from '@/components/ui/button';
import { Camera, Upload, ImageIcon } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';

interface PhotosTabProps {
    casePlan?: CasePlanResponseDto | null;
}

export function PhotosTab({ casePlan }: PhotosTabProps) {
    const images = casePlan?.images || [];

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Pre-operative Photos</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Standard views for surgical planning</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                    </Button>
                    <Button size="sm" className="gap-2">
                        <Camera className="h-4 w-4" />
                        Capture
                    </Button>
                </div>
            </div>

            {/* Gallery */}
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
                    <div className="bg-muted p-3 rounded-full mb-4">
                        <ImageIcon className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold text-foreground">No photos uploaded yet</h4>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Upload standard medical photography views for surgical reference.
                    </p>
                    <div className="flex gap-2 mt-5">
                        <Button variant="outline" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Photos
                        </Button>
                    </div>
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
                                alt={img.description}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                            />
                            {img.description && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2.5 pt-8">
                                    <p className="text-white text-xs font-medium">{img.description}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
