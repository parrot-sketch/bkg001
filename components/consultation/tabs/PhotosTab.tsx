'use client';

/**
 * Photos Tab
 * 
 * Photo management for consultation.
 * Critical for aesthetic surgery: before/after documentation.
 */

import { Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PhotosTabProps {
  appointmentId?: number;
  photoCount: number;
  isReadOnly?: boolean;
}

export function PhotosTab({
  appointmentId,
  photoCount,
  isReadOnly = false,
}: PhotosTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Consultation Photos</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {photoCount} photo{photoCount !== 1 ? 's' : ''} captured
          </p>
        </div>
        {!isReadOnly && (
          <Button size="sm" variant="outline">
            <Camera className="h-4 w-4 mr-2" />
            Capture Photo
          </Button>
        )}
      </div>

      {photoCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No photos captured for this consultation
            </p>
            {!isReadOnly && (
              <Button size="sm" variant="outline" className="mt-4">
                <Camera className="h-4 w-4 mr-2" />
                Capture First Photo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Photo grid placeholder - will be implemented with actual photo component */}
          {Array.from({ length: photoCount }).map((_, i) => (
            <Card key={i} className="aspect-square">
              <CardContent className="p-0 h-full flex items-center justify-center bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
