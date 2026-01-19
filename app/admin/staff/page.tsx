'use client';

/**
 * Admin Staff Page
 * 
 * Manage all staff members:
 * - View all staff
 * - Create new staff accounts
 * - Update staff information
 * - Activate/deactivate accounts
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/patient/useAuth';
import { adminApi } from '../../../../lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { UserCheck, Search, Plus, UserX, UserCheck2 } from 'lucide-react';
import { toast } from 'sonner';
import type { UserResponseDto } from '../../../../application/dtos/UserResponseDto';
import { Role } from '../../domain/enums/Role';
import { Status } from '../../domain/enums/Status';
import { CreateStaffDialog } from '../../../../components/admin/CreateStaffDialog';
import { UpdateStaffDialog } from '../../../../components/admin/UpdateStaffDialog';

export default function AdminStaffPage() {
  const { user, isAuthenticated } = useAuth();
  const [staff, setStaff] = useState<UserResponseDto[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<UserResponseDto | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadStaff();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    let filtered = staff;

    // Filter by role
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter((s) => s.role === roleFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.firstName?.toLowerCase().includes(query) ||
          s.lastName?.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.role.toLowerCase().includes(query),
      );
    }

    setFilteredStaff(filtered);
  }, [staff, roleFilter, searchQuery]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllStaff();

      if (response.success && response.data) {
        setStaff(response.data);
        setFilteredStaff(response.data);
      } else {
        toast.error(response.error || 'Failed to load staff');
      }
    } catch (error) {
      toast.error('An error occurred while loading staff');
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setShowCreateDialog(true);
  };

  const handleUpdate = (staffMember: UserResponseDto) => {
    setSelectedStaff(staffMember);
    setShowUpdateDialog(true);
  };

  const handleToggleStatus = async (staffMember: UserResponseDto) => {
    const newStatus = staffMember.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
    const action = newStatus === Status.ACTIVE ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} ${staffMember.firstName} ${staffMember.lastName || staffMember.email}?`)) {
      return;
    }

    try {
      const response = await adminApi.updateStaffStatus({
        userId: staffMember.id,
        status: newStatus,
        updatedBy: user!.id,
      });

      if (response.success && response.data) {
        toast.success(`Staff member ${action}d successfully`);
        loadStaff();
      } else {
        toast.error(response.error || `Failed to ${action} staff member`);
      }
    } catch (error) {
      toast.error(`An error occurred while ${action}ing staff member`);
      console.error(`Error ${action}ing staff member:`, error);
    }
  };

  const handleSuccess = () => {
    setShowCreateDialog(false);
    setShowUpdateDialog(false);
    setSelectedStaff(null);
    loadStaff();
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view staff</p>
        </div>
      </div>
    );
  }

  const doctors = filteredStaff.filter((s) => s.role === Role.DOCTOR).length;
  const nurses = filteredStaff.filter((s) => s.role === Role.NURSE).length;
  const frontdesk = filteredStaff.filter((s) => s.role === Role.FRONTDESK).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="mt-2 text-muted-foreground">Manage all staff members</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doctors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nurses</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nurses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frontdesk</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{frontdesk}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="ALL">All Roles</option>
                <option value={Role.DOCTOR}>Doctor</option>
                <option value={Role.NURSE}>Nurse</option>
                <option value={Role.FRONTDESK}>Frontdesk</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="search" className="text-sm font-medium">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>All Staff</CardTitle>
          <CardDescription>Total: {filteredStaff.length} staff member(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading staff...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery || roleFilter !== 'ALL' ? 'No staff match your filters' : 'No staff found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStaff.map((staffMember) => (
                <div
                  key={staffMember.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                        staffMember.status === Status.ACTIVE ? 'bg-success/10' : 'bg-muted'
                      }`}
                    >
                      {staffMember.status === Status.ACTIVE ? (
                        <UserCheck2 className="h-6 w-6 text-success" />
                      ) : (
                        <UserX className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {staffMember.firstName || ''} {staffMember.lastName || ''} (
                        {staffMember.email})
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Role: {staffMember.role}</span>
                        <span>•</span>
                        <span
                          className={
                            staffMember.status === Status.ACTIVE ? 'text-success' : 'text-muted-foreground'
                          }
                        >
                          Status: {staffMember.status}
                        </span>
                        {staffMember.phone && (
                          <>
                            <span>•</span>
                            <span>{staffMember.phone}</span>
                          </>
                        )}
                      </div>
                      {staffMember.lastLoginAt && (
                        <p className="text-xs text-muted-foreground">
                          Last login: {new Date(staffMember.lastLoginAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleUpdate(staffMember)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(staffMember)}
                      className={
                        staffMember.status === Status.ACTIVE
                          ? 'text-destructive hover:text-destructive'
                          : 'text-success hover:text-success'
                      }
                    >
                      {staffMember.status === Status.ACTIVE ? (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck2 className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Staff Dialog */}
      {showCreateDialog && (
        <CreateStaffDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Update Staff Dialog */}
      {showUpdateDialog && selectedStaff && (
        <UpdateStaffDialog
          open={showUpdateDialog}
          onClose={() => {
            setShowUpdateDialog(false);
            setSelectedStaff(null);
          }}
          onSuccess={handleSuccess}
          staff={selectedStaff}
        />
      )}
    </div>
  );
}
