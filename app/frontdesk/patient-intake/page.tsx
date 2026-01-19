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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Intake</h1>
          <p className="mt-2 text-muted-foreground">Register new patients or search for existing ones</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>Found {searchResults.length} patient(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{patient.email}</span>
                        {patient.phone && (
                          <>
                            <span>•</span>
                            <span>{patient.phone}</span>
                          </>
                        )}
                      </div>
                      {patient.dateOfBirth && (
                        <p className="text-xs text-muted-foreground">
                          Age: {patient.age} years {patient.age < 18 ? '(Minor)' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Pre-fill registration form with existing patient data
                      setShowRegistrationDialog(true);
                      // You could pass patient data to dialog here
                    }}
                  >
                    Update Info
                  </Button>
                </div>
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
