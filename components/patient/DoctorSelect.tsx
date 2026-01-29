'use client';

/**
 * Doctor Select Component
 * 
 * Dropdown component for selecting a doctor from available doctors.
 * Displays doctor name, title, specialization, and optional profile image.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, MapPin } from 'lucide-react';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface DoctorSelectProps {
  doctors: DoctorResponseDto[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onViewProfile?: (doctorId: string) => void;
}

export function DoctorSelect({
  doctors,
  value,
  onValueChange,
  placeholder = 'Select a doctor...',
  disabled = false,
  required = false,
  onViewProfile,
}: DoctorSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="doctor-select" className="text-foreground">
        Doctor {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled} required={required}>
        <SelectTrigger id="doctor-select" className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {doctors.length === 0 ? (
            <SelectItem value="none" disabled>
              No doctors available
            </SelectItem>
          ) : (
            doctors.map((doctor) => (
              <SelectItem
                key={doctor.id}
                value={doctor.id}
                className="py-3 cursor-pointer hover:bg-accent/10"
              >
                <div className="flex items-center space-x-3 w-full">
                  {doctor.profileImage ? (
                    <img
                      src={doctor.profileImage}
                      alt={doctor.name}
                      className="w-8 h-8 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm text-foreground truncate">
                        {doctor.name || `${doctor.title || ''} ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Doctor'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
                    {doctor.clinicLocation && (
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate">{doctor.clinicLocation}</span>
                      </div>
                    )}
                  </div>
                  {onViewProfile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProfile(doctor.id);
                      }}
                      className="ml-2 h-6 px-2 text-xs hover:bg-accent/20"
                    >
                      View
                    </Button>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
