'use client';

/**
 * Frontdesk Patient Intake Page
 * 
 * Patient registration and intake form.
 * Allows creating new patients or searching for existing ones.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PatientRegistrationDialog } from '@/components/frontdesk/PatientRegistrationDialog';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { CreatePatientDto } from '@/application/dtos/CreatePatientDto';

export default function FrontdeskPatientIntakePage() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientResponseDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const response = await frontdeskApi.searchPatients(searchQuery);

      if (response.success && response.data) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          toast.info('No patients found. You can register a new patient.');
        }
      } else if (!response.success) {
        toast.error(response.error || 'Failed to search patients');
      } else {
        toast.error('Failed to search patients');
      }
    } catch (error) {
      toast.error('An error occurred while searching patients');
      console.error('Error searching patients:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegistrationSuccess = (patient: PatientResponseDto) => {
    setShowRegistrationDialog(false);
    toast.success(`Patient ${patient.firstName} ${patient.lastName} registered successfully`);
    // Optionally reload search results
    if (searchQuery.trim()) {
      handleSearch();
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access patient intake</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Patient Intake</h1>
          <p className="text-sm text-muted-foreground">Register new patients or search for existing ones</p>
        </div>
        <Button onClick={() => setShowRegistrationDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Register New Patient
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Patients</CardTitle>
          <CardDescription>Search for existing patients by email or phone number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>Found {searchResults.length} patient(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((patient) => (
                <Card
                  key={patient.id}
                  className="border-gray-200 hover:border-brand-primary/50 hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header with Avatar and Name */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-dusk flex items-center justify-center text-white font-semibold text-lg shadow-md">
                            {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {patient.firstName} {patient.lastName}
                            </h3>
                            {patient.fileNumber && (
                              <p className="text-xs font-mono text-brand-primary mt-0.5">
                                {patient.fileNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Patient Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-medium min-w-[80px]">Email:</span>
                          <span className="truncate">{patient.email}</span>
                        </div>
                        {patient.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium min-w-[80px]">Phone:</span>
                            <span>{patient.phone}</span>
                          </div>
                        )}
                        {patient.address && (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <span className="font-medium min-w-[80px]">Address:</span>
                            <span className="line-clamp-2">{patient.address}</span>
                          </div>
                        )}
                        {patient.dateOfBirth && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium min-w-[80px]">Age:</span>
                            <span>
                              {patient.age} years {patient.age < 18 && <span className="text-brand-secondary">(Minor)</span>}
                            </span>
                          </div>
                        )}
                        {patient.gender && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium min-w-[80px]">Gender:</span>
                            <span className="capitalize">{patient.gender.toLowerCase()}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Link href={`/patient/${patient.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowRegistrationDialog(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Dialog */}
      {showRegistrationDialog && (
        <PatientRegistrationDialog
          open={showRegistrationDialog}
          onClose={() => setShowRegistrationDialog(false)}
          onSuccess={handleRegistrationSuccess}
          frontdeskUserId={user.id}
        />
      )}
    </div>
  );
}
