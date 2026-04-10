'use client';

import {
    SkinPrepAgent,
    SkinPrepArea,
    SKIN_PREP_AGENT_LABELS,
    SKIN_PREP_AREA_LABELS,
} from '@/domain/clinical-forms/NursePreopWardChecklist';
import { SelectField } from './SelectField';
import { TextField } from './index';

interface SkinPrepSubSectionProps {
    value: {
        agent?: SkinPrepAgent;
        area?: SkinPrepArea;
        agentOther?: string;
        areaOther?: string;
        performerName?: string;
    } | undefined;
    onChange: (v: {
        agent?: SkinPrepAgent;
        area?: SkinPrepArea;
        agentOther?: string;
        areaOther?: string;
        performerName?: string;
    }) => void;
    disabled: boolean;
}

export function SkinPrepSubSection({ value, onChange, disabled }: SkinPrepSubSectionProps) {
    const sp = value ?? {};
    const set = (field: string, val: string) => onChange({ ...sp, [field]: val });

    const agentOptions = Object.values(SkinPrepAgent).map((a) => ({
        value: a,
        label: SKIN_PREP_AGENT_LABELS[a],
    }));

    const areaOptions = Object.values(SkinPrepArea).map((a) => ({
        value: a,
        label: SKIN_PREP_AREA_LABELS[a],
    }));

    return (
        <div className="ml-7 mt-3 p-3 border border-slate-200 rounded-lg bg-slate-50/60 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Skin Prep Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField<SkinPrepAgent>
                    label="Prep Agent"
                    value={sp.agent}
                    onChange={(v) => set('agent', v)}
                    options={agentOptions}
                    disabled={disabled}
                    placeholder="Select agent"
                />
                {sp.agent === SkinPrepAgent.OTHER && (
                    <TextField
                        label="Agent (specify)"
                        value={sp.agentOther}
                        onChange={(v) => set('agentOther', v)}
                        placeholder="e.g. Chlorhexidine 2%"
                        disabled={disabled}
                    />
                )}

                <SelectField<SkinPrepArea>
                    label="Prep Area"
                    value={sp.area}
                    onChange={(v) => set('area', v)}
                    options={areaOptions}
                    disabled={disabled}
                    placeholder="Select area"
                />
                {sp.area === SkinPrepArea.OTHER && (
                    <TextField
                        label="Area (specify)"
                        value={sp.areaOther}
                        onChange={(v) => set('areaOther', v)}
                        placeholder="e.g. Shoulder"
                        disabled={disabled}
                    />
                )}

                <TextField
                    label="Performed by (name)"
                    value={sp.performerName}
                    onChange={(v) => set('performerName', v)}
                    placeholder="Nurse / tech name"
                    disabled={disabled}
                />
            </div>
        </div>
    );
}