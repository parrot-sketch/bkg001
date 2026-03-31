/**
 * Team Tab View
 *
 * Uses server actions for all mutations — no REST API calls.
 * Reads initial team data from the server-loaded viewModel.
 */

'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, User, Search, X, Plus, Loader2, Link2Off, ShieldAlert, Syringe } from 'lucide-react';
import type { SurgicalCasePlanViewModel, TeamMember } from '../../core/types';
import { toast } from 'sonner';
import { assignTeamMember, removeTeamMember } from '@/actions/doctor/surgical-plan';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { RiskFactorsTabContainer } from '../risk-factors/RiskFactorsTab.container';
import { AnesthesiaTabContainer } from '../anesthesia/AnesthesiaTab.container';

interface TeamTabViewProps {
  data: SurgicalCasePlanViewModel;
  readOnly?: boolean;
}

const TEAM_ROLES = [
  { value: 'CO_SURGEON', label: 'Co-Surgeon' },
  { value: 'ANAESTHESIOLOGIST', label: 'Anaesthesiologist' },
  { value: 'SCRUB_NURSE', label: 'Scrub Nurse' },
  { value: 'CIRCULATING_NURSE', label: 'Circulating Nurse' },
  { value: 'THEATER_TECH', label: 'Theater Tech' },
  { value: 'OBSERVER', label: 'Observer' },
] as const;

type TeamRoleValue = (typeof TEAM_ROLES)[number]['value'];

export function TeamTabView({ data, readOnly = false }: TeamTabViewProps) {
  const caseId = data.caseId;
  const [isPending, startTransition] = useTransition();

  const [selectedRole, setSelectedRole] = useState<TeamRoleValue | ''>('');
  const [isExternal, setIsExternal] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [externalCredentials, setExternalCredentials] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([]);

  // Team members arrive from the shell's data (revalidatePath refreshes them)
  const teamMembers: TeamMember[] = data.teamMembers ?? [];

  const getRoleLabel = (role: string) =>
    TEAM_ROLES.find((r) => r.value === role)?.label ?? role.replace(/_/g, ' ');

  // Fetch staff when role changes
  useEffect(() => {
    if (selectedRole && !isExternal) {
      handleSearch(true); // Initial load (all eligible staff)
    } else {
      setSearchResults([]);
    }
  }, [selectedRole, isExternal]);

  const handleSearch = async (initial = false) => {
    if (!selectedRole) return;
    const query = initial ? '' : searchQuery.trim();
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/doctor/staff/eligible?caseId=${caseId}&surgicalRole=${selectedRole}&q=${encodeURIComponent(query)}`
      );
      const result = await res.json();
      if (result.success) {
        setSearchResults(
          (result.data?.items ?? []).map((item: any) => ({ id: item.id, name: item.fullName }))
        );
      } else {
        toast.error(result.error ?? 'Search failed');
      }
    } catch {
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSystemUser = (member: { id: string; name: string }) => {
    if (!selectedRole) return;
    startTransition(async () => {
      const result = await assignTeamMember(caseId, {
        role: selectedRole as TeamRoleValue,
        userId: member.id,
        isExternal: false,
      });
      if (result.success) {
        toast.success(`${member.name} assigned as ${getRoleLabel(selectedRole)}`);
        setSearchResults([]);
        setSearchQuery('');
        setSelectedRole('');
      } else {
        toast.error(result.msg);
      }
    });
  };

  const handleAddExternal = () => {
    if (!externalName.trim() || !selectedRole) return;
    startTransition(async () => {
      const result = await assignTeamMember(caseId, {
        role: selectedRole as TeamRoleValue,
        isExternal: true,
        externalName: externalName.trim(),
        externalCredentials: externalCredentials.trim() || undefined,
      });
      if (result.success) {
        toast.success(`${externalName} added as ${getRoleLabel(selectedRole)}`);
        setExternalName('');
        setExternalCredentials('');
        setSelectedRole('');
        setIsExternal(false);
      } else {
        toast.error(result.msg);
      }
    });
  };

  const handleRemove = (memberId: string, name: string) => {
    startTransition(async () => {
      const result = await removeTeamMember(caseId, memberId);
      if (result.success) {
        toast.success(`${name} removed from team`);
      } else {
        toast.error(result.msg);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Surgical Team</h3>
      </div>

      {/* Primary Surgeon — always read-only */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Primary Surgeon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{data.primarySurgeon?.name ?? 'Not assigned'}</p>
                <p className="text-xs text-muted-foreground">Primary Surgeon</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">Primary</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamMembers.length > 0 ? (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user
                          ? `${member.user.firstName} ${member.user.lastName}`
                          : `Staff ${member.userId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRoleLabel(member.role)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(String(member.id), member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Staff')}
                        disabled={isPending}
                        className="h-7 w-7 p-0"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No additional team members assigned yet
            </div>
          )}

          {/* Add form */}
          {!readOnly && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Add Team Member</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">External Professional</Label>
                  <Switch checked={isExternal} onCheckedChange={setIsExternal} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as TeamRoleValue)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isExternal ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      placeholder="e.g. Dr. Jane Smith"
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Credentials / Specialty</Label>
                    <Input
                      placeholder="e.g. Plastic Surgeon, FRCS"
                      value={externalCredentials}
                      onChange={(e) => setExternalCredentials(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddExternal}
                    disabled={!externalName.trim() || !selectedRole || isPending}
                    className="h-9 w-full"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Add External Member
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Select Team Member</Label>
                    {!selectedRole ? (
                      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg text-center border border-dashed">
                        Please select a role first to see eligible staff
                      </div>
                    ) : isSearching ? (
                      <div className="flex items-center justify-center p-6 border rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                           <div className="relative flex-1">
                             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                             <Input
                               placeholder="Filter by name..."
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                               className="h-9 pl-9 text-sm"
                             />
                           </div>
                           <Button 
                             variant="outline" 
                             size="sm" 
                             onClick={() => handleSearch(true)} 
                             className="h-9"
                             title="Refresh List"
                           >
                             <Loader2 className={`h-4 w-4 ${isSearching ? 'animate-spin' : ''}`} />
                           </Button>
                        </div>
                        
                        <div className="border rounded-lg max-h-[200px] overflow-y-auto divide-y shadow-sm">
                          {searchResults
                            .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((result) => (
                            <div
                              key={result.id}
                              className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => handleAddSystemUser(result)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-sm font-medium">{result.name}</p>
                              </div>
                              <div className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary">
                                <Plus className="h-4 w-4" />
                              </div>
                            </div>
                          ))}
                          {searchResults.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No staff matches your filter
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 p-3 bg-amber-50 rounded-lg text-center border border-amber-100">
                        No eligible staff found for this role
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Additional Safety Sections (Merged Tabs) */}
      <div className="pt-6 border-t">
        <Accordion type="multiple" className="w-full space-y-4">
          <AccordionItem value="risk-factors" className="border rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-stone-700">Risk Factors & Secondary Diagnoses</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <RiskFactorsTabContainer caseId={caseId} readOnly={readOnly} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="anesthesia" className="border rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Syringe className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-stone-700">Anesthesia & Special Instructions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <AnesthesiaTabContainer caseId={caseId} readOnly={readOnly} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
