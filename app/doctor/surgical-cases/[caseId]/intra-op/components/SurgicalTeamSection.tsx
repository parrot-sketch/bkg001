'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Users } from 'lucide-react';

interface SurgicalTeamSectionProps {
    surgicalTeam: {
        surgeon: string;
        anaesthesiologist: string;
        assistants: string;
        scrubNurse: string;
        circulatingNurse: string;
    };
    updateField: (path: string, value: any) => void;
    readOnly: boolean;
}

export function SurgicalTeamSection({ 
    surgicalTeam, 
    updateField, 
    readOnly 
}: SurgicalTeamSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-700">Surgical Team</h3>
            </div>
            
            <table className="w-full">
                <tbody>
                    <tr>
                        <td className="py-2 pr-4 w-48">
                            <Label className="text-sm text-stone-600 flex items-center gap-2">
                                <User className="h-3.5 w-3.5" /> Surgeon
                            </Label>
                        </td>
                        <td className="py-2">
                            <Input 
                                value={surgicalTeam.surgeon}
                                onChange={(e) => updateField('surgicalTeam.surgeon', e.target.value)}
                                disabled={readOnly}
                                placeholder="Surgeon name"
                                className="max-w-md"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2 pr-4">
                            <Label className="text-sm text-stone-600">Anaesthesiologist</Label>
                        </td>
                        <td className="py-2">
                            <Input 
                                value={surgicalTeam.anaesthesiologist}
                                onChange={(e) => updateField('surgicalTeam.anaesthesiologist', e.target.value)}
                                disabled={readOnly}
                                placeholder="Anaesthesiologist name"
                                className="max-w-md"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2 pr-4">
                            <Label className="text-sm text-stone-600">Assistant(s)</Label>
                        </td>
                        <td className="py-2">
                            <Input 
                                value={surgicalTeam.assistants}
                                onChange={(e) => updateField('surgicalTeam.assistants', e.target.value)}
                                disabled={readOnly}
                                placeholder="Surgical assistants"
                                className="max-w-md"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2 pr-4">
                            <Label className="text-sm text-stone-600">Scrub Nurse</Label>
                        </td>
                        <td className="py-2">
                            <Input 
                                value={surgicalTeam.scrubNurse}
                                onChange={(e) => updateField('surgicalTeam.scrubNurse', e.target.value)}
                                disabled={readOnly}
                                placeholder="Scrub nurse name"
                                className="max-w-md"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="py-2 pr-4">
                            <Label className="text-sm text-stone-600">Circulating Nurse</Label>
                        </td>
                        <td className="py-2">
                            <Input 
                                value={surgicalTeam.circulatingNurse}
                                onChange={(e) => updateField('surgicalTeam.circulatingNurse', e.target.value)}
                                disabled={readOnly}
                                placeholder="Circulating nurse name"
                                className="max-w-md"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
