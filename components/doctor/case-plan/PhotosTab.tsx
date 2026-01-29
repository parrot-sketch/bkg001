'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Plus } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';

interface PhotosTabProps {
    casePlan?: CasePlanResponseDto | null;
}

export function PhotosTab({ casePlan }: PhotosTabProps) {
    const images = casePlan?.images || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Pre-operative Photos</h3>
                    <p className="text-sm text-muted-foreground">Standard views for surgical planning</p>
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

            {images.length === 0 ? (
                <Card className="border-dashed h-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="bg-slate-100 p-4 rounded-full inline-flex mb-4">
                            <Camera className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Upload standard medical photography views</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((img) => (
                        <div key={img.id} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border">
                            {/* Placeholder for real image since backend might mock links */}
                            <img src={img.imageUrl} alt={img.description} className="object-cover w-full h-full" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                                {img.description}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
