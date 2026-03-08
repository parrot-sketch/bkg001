'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Edit } from 'lucide-react';

export function ClinicalNotesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinical Notes</CardTitle>
        <CardDescription>Doctor's notes and observations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">No clinical notes recorded</p>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
