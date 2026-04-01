'use client';

import { TimeField } from '../fields';

interface TimingsSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled: boolean;
}

export function TimingsSection({ data, onChange, disabled }: TimingsSectionProps) {
    const d = data.timings ?? {};
    const set = (field: string, value: any) =>
        onChange({ ...data, timings: { ...d, [field]: value } });

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TimeField label="Time in Theatre" value={d.timeIntoTheatre} onChange={(v) => set('timeIntoTheatre', v)} disabled={disabled} />
            <TimeField label="Time out of Theatre" value={d.timeOutOfTheatre} onChange={(v) => set('timeOutOfTheatre', v)} disabled={disabled} />
            <TimeField label="Operation Start" value={d.operationStart} onChange={(v) => set('operationStart', v)} disabled={disabled} />
            <TimeField label="Operation Finish" value={d.operationFinish} onChange={(v) => set('operationFinish', v)} disabled={disabled} />
        </div>
    );
}
