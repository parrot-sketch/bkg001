'use client';

/**
 * Profile Actions Panel Component
 * 
 * Provides quick access to profile management actions.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Calendar, Users, Settings } from 'lucide-react';
import Link from 'next/link';

interface ProfileActionsPanelProps {
  onEditProfile: () => void;
  doctorId: string;
}

export function ProfileActionsPanel({
  onEditProfile,
  doctorId,
}: ProfileActionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={onEditProfile}
          variant="outline"
          className="w-full justify-start"
          size="lg"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
        <Link href="/doctor/schedule" className="w-full">
          <Button
            variant="outline"
            className="w-full justify-start"
            size="lg"
          >
            <Settings className="mr-2 h-4 w-4" />
            Manage Schedule
          </Button>
        </Link>
        <Link href="/doctor/appointments">
          <Button variant="outline" className="w-full justify-start" size="lg">
            <Calendar className="mr-2 h-4 w-4" />
            View Appointments
          </Button>
        </Link>
        <Link href="/doctor/patients">
          <Button variant="outline" className="w-full justify-start" size="lg">
            <Users className="mr-2 h-4 w-4" />
            View Patients
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
