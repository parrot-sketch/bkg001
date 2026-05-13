'use client';

import { useMemo, useState } from 'react';
import type {
  NurseIntraOpRecordDraft,
  MedicationRow,
  ImplantRow,
  SpecimenRow,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import { MedicationSearchModal } from '@/components/nurse/MedicationSearchModal';
import { ImplantSearchModal } from '@/components/nurse/ImplantSearchModal';
import { SpecimenSearchModal } from '@/components/nurse/SpecimenSearchModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';

import {
  FieldGroup,
  NumberField,
  TextAreaField,
  TextField,
  TimeField,
  YesNoField,
} from '../components/fields';

function ensureRows<T>(rows: T[], count: number, factory: () => T): T[] {
  const next = [...rows];
  while (next.length < count) next.push(factory());
  return next.slice(0, count);
}

export function Page2IntraOpSection(props: {
  data: NurseIntraOpRecordDraft;
  disabled: boolean;
  caseId: string;
  onChange: (next: NurseIntraOpRecordDraft) => void;
}) {
  const { data, disabled, onChange, caseId } = props;

  const set = <K extends keyof NurseIntraOpRecordDraft>(key: K, value: NurseIntraOpRecordDraft[K]) =>
    onChange({ ...data, [key]: value });

  type SwabsTable = NonNullable<NurseIntraOpRecordDraft['swabsCount']>;
  type SwabsRowKey = 'preliminaryCheck' | 'woundClosure' | 'finalCount';
  type SwabsColKey = 'abdominalSwabs' | 'raytecSwabs' | 'throatPacks' | 'other';

  const emptySwabRow = {
    abdominalSwabs: 0,
    raytecSwabs: 0,
    throatPacks: 0,
    other: 0,
  } satisfies SwabsTable[SwabsRowKey];

  const swabs: SwabsTable =
    data.swabsCount ?? {
      preliminaryCheck: { ...emptySwabRow },
      woundClosure: { ...emptySwabRow },
      finalCount: { ...emptySwabRow },
    };

  const setSwab = (row: SwabsRowKey, col: SwabsColKey, value: number) => {
    const next: SwabsTable = {
      ...swabs,
      [row]: { ...swabs[row], [col]: value },
    };
    set('swabsCount', next);
  };

  const meds = useMemo(
    () =>
      ensureRows<MedicationRow>(data.medications ?? [], 5, () => ({
        drug: '',
        route: '',
        time: '',
        sign: '',
      })),
    [data.medications],
  );

  const implants = useMemo(
    () =>
      ensureRows<ImplantRow>(data.implants ?? [], 5, () => ({
        item: '',
        lotNo: '',
        size: '',
      })),
    [data.implants],
  );

  const specimens = useMemo(
    () =>
      ensureRows<SpecimenRow>(data.specimens ?? [], 4, () => ({
        type: '',
        histology: false,
        cytology: false,
        notForAnalysis: false,
        disposition: '',
      })),
    [data.specimens],
  );

  const [medRowIndex, setMedRowIndex] = useState<number | null>(null);
  const [implantRowIndex, setImplantRowIndex] = useState<number | null>(null);
  const [specimenRowIndex, setSpecimenRowIndex] = useState<number | null>(null);

  const preliminary = swabs.preliminaryCheck;
  const woundClosure = swabs.woundClosure;
  const finalCount = swabs.finalCount;

  return (
    <div className="space-y-4">
      <FieldGroup
        title="Counts"
        description="Complete the count and mark whether it is correct. Signatures are applied on finalization."
      >
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Check point</th>
                  <th className="px-3 py-2 text-center font-semibold">Abdominal swabs</th>
                  <th className="px-3 py-2 text-center font-semibold">Raytec swabs</th>
                  <th className="px-3 py-2 text-center font-semibold">Throat packs</th>
                  <th className="px-3 py-2 text-center font-semibold">Other</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-700">Preliminary check</td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center bg-white" disabled={disabled} value={preliminary.abdominalSwabs ?? 0} onChange={(e) => setSwab('preliminaryCheck', 'abdominalSwabs', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center bg-white" disabled={disabled} value={preliminary.raytecSwabs ?? 0} onChange={(e) => setSwab('preliminaryCheck', 'raytecSwabs', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center bg-white" disabled={disabled} value={preliminary.throatPacks ?? 0} onChange={(e) => setSwab('preliminaryCheck', 'throatPacks', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center bg-white" disabled={disabled} value={preliminary.other ?? 0} onChange={(e) => setSwab('preliminaryCheck', 'other', Number(e.target.value) || 0)} />
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-700">Wound closure</td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center bg-white" disabled={disabled} value={woundClosure.abdominalSwabs ?? 0} onChange={(e) => setSwab('woundClosure', 'abdominalSwabs', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center bg-white" disabled={disabled} value={woundClosure.raytecSwabs ?? 0} onChange={(e) => setSwab('woundClosure', 'raytecSwabs', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center bg-white" disabled={disabled} value={woundClosure.throatPacks ?? 0} onChange={(e) => setSwab('woundClosure', 'throatPacks', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center bg-white" disabled={disabled} value={woundClosure.other ?? 0} onChange={(e) => setSwab('woundClosure', 'other', Number(e.target.value) || 0)} />
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-700">Final count</td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center font-semibold bg-white" disabled={disabled} value={finalCount.abdominalSwabs ?? 0} onChange={(e) => setSwab('finalCount', 'abdominalSwabs', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center font-semibold bg-white" disabled={disabled} value={finalCount.raytecSwabs ?? 0} onChange={(e) => setSwab('finalCount', 'raytecSwabs', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center font-semibold bg-white" disabled={disabled} value={finalCount.throatPacks ?? 0} onChange={(e) => setSwab('finalCount', 'throatPacks', Number(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" className="h-8 w-24 mx-auto text-center font-semibold bg-white" disabled={disabled} value={finalCount.other ?? 0} onChange={(e) => setSwab('finalCount', 'other', Number(e.target.value) || 0)} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
            <YesNoField label="Count correct" value={data.countCorrect} disabled={disabled} onChange={(v) => set('countCorrect', v)} />
            {data.countCorrect === 'N' && (
              <TextField label="Action taken (required if count is not correct)" value={data.countActionTaken ?? ''} disabled={disabled} onChange={(v) => set('countActionTaken', v)} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Scrub nurse signature</div>
                {data.scrubNurseSignature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Scrub nurse signature" src={data.scrubNurseSignature} className="h-20 max-w-[320px] border border-slate-200 rounded-md bg-white object-contain" />
                ) : (
                  <div className="text-xs text-slate-500">
                    Signature captured upon finalization (name: <span className="font-medium">{data.scrubNurse?.trim() || 'Scrub Nurse'}</span>)
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Circulating nurse signature</div>
                {data.circulatingNurseSignature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Circulating nurse signature" src={data.circulatingNurseSignature} className="h-20 max-w-[320px] border border-slate-200 rounded-md bg-white object-contain" />
                ) : (
                  <div className="text-xs text-slate-500">
                    Signature captured upon finalization (name: <span className="font-medium">{data.circulatingNurse?.trim() || 'Circulating Nurse'}</span>)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Wound closure">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Non-absorbable" value={data.nonAbsorbableSuture ?? ''} disabled={disabled} onChange={(v) => set('nonAbsorbableSuture', v)} />
          <TextField label="Absorbable" value={data.absorbableSuture ?? ''} disabled={disabled} onChange={(v) => set('absorbableSuture', v)} />
          <TextField label="Other" value={data.otherClosure ?? ''} disabled={disabled} onChange={(v) => set('otherClosure', v)} />
          <TextField label="Dressing applied" value={data.dressingApplied ?? ''} disabled={disabled} onChange={(v) => set('dressingApplied', v)} />
        </div>
      </FieldGroup>

      <FieldGroup title="Fluids & outputs (mL)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField label="Packed cells" value={data.packedCellsML} disabled={disabled} onChange={(v) => set('packedCellsML', v)} />
          <NumberField label="Whole blood" value={data.wholeBloodML} disabled={disabled} onChange={(v) => set('wholeBloodML', v)} />
          <NumberField label="Other blood products" value={data.otherBloodProductsML} disabled={disabled} onChange={(v) => set('otherBloodProductsML', v)} />
          <NumberField label="IV infusion" value={data.ivInfusionML} disabled={disabled} onChange={(v) => set('ivInfusionML', v)} />
          <NumberField label="Estimated blood loss" value={data.estimatedBloodLossML} disabled={disabled} onChange={(v) => set('estimatedBloodLossML', v)} />
          <NumberField label="Urinary output" value={data.urinaryOutputML} disabled={disabled} onChange={(v) => set('urinaryOutputML', v)} />
        </div>
      </FieldGroup>

      <FieldGroup title="Medication">
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 h-10">
              <tr>
                <th className="px-3 font-medium text-left">Medication / drug</th>
                <th className="px-3 font-medium text-left">Route</th>
                <th className="px-3 font-medium text-left w-32">Time</th>
                <th className="px-3 font-medium text-left w-32">Sign</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {meds.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-2">
                    <Input
                      value={row.drug || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = meds.slice();
                        next[idx] = { ...next[idx], drug: e.target.value };
                        set('medications', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.route || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = meds.slice();
                        next[idx] = { ...next[idx], route: e.target.value };
                        set('medications', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="time"
                      value={row.time || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = meds.slice();
                        next[idx] = { ...next[idx], time: e.target.value };
                        set('medications', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.sign || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = meds.slice();
                        next[idx] = { ...next[idx], sign: e.target.value };
                        set('medications', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => setMedRowIndex(idx)}
                      title="Search inventory"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FieldGroup>

      <FieldGroup title="Implants / prosthetics">
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 h-10">
              <tr>
                <th className="px-3 font-medium text-left">Item</th>
                <th className="px-3 font-medium text-left">Lot no.</th>
                <th className="px-3 font-medium text-left">Size</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {implants.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-2">
                    <Input
                      value={row.item || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = implants.slice();
                        next[idx] = { ...next[idx], item: e.target.value };
                        set('implants', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.lotNo || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = implants.slice();
                        next[idx] = { ...next[idx], lotNo: e.target.value };
                        set('implants', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.size || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = implants.slice();
                        next[idx] = { ...next[idx], size: e.target.value };
                        set('implants', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => setImplantRowIndex(idx)}
                      title="Search inventory"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FieldGroup>

      <FieldGroup title="Specimens">
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 h-10">
              <tr>
                <th className="px-3 font-medium text-left">Type</th>
                <th className="px-3 font-medium text-center">Histology</th>
                <th className="px-3 font-medium text-center">Cytology</th>
                <th className="px-3 font-medium text-center">Not for analysis</th>
                <th className="px-3 font-medium text-left">Disposition</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {specimens.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-2">
                    <Input
                      value={row.type || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = specimens.slice();
                        next[idx] = { ...next[idx], type: e.target.value };
                        set('specimens', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Checkbox
                      checked={row.histology === true}
                      disabled={disabled}
                      onCheckedChange={(v) => {
                        const next = specimens.slice();
                        next[idx] = { ...next[idx], histology: !!v };
                        set('specimens', next);
                      }}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Checkbox
                      checked={row.cytology === true}
                      disabled={disabled}
                      onCheckedChange={(v) => {
                        const next = specimens.slice();
                        next[idx] = { ...next[idx], cytology: !!v };
                        set('specimens', next);
                      }}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Checkbox
                      checked={row.notForAnalysis === true}
                      disabled={disabled}
                      onCheckedChange={(v) => {
                        const next = specimens.slice();
                        next[idx] = { ...next[idx], notForAnalysis: !!v };
                        set('specimens', next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.disposition || ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = specimens.slice();
                        next[idx] = { ...next[idx], disposition: e.target.value };
                        set('specimens', next);
                      }}
                      className="h-8 bg-white"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => setSpecimenRowIndex(idx)}
                      title="Search inventory"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FieldGroup>

      <FieldGroup title="Items to be returned to theatre">
        <TextAreaField label="Notes" value={data.itemsToBeReturnedToTheatre ?? ''} disabled={disabled} onChange={(v) => set('itemsToBeReturnedToTheatre', v)} rows={3} />
      </FieldGroup>

      <FieldGroup title="Charges">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="Anaesthetic materials charge" value={data.anaestheticMaterialsCharge} disabled={disabled} onChange={(v) => set('anaestheticMaterialsCharge', v)} />
          <NumberField label="Theatre fee" value={data.theatreFee} disabled={disabled} onChange={(v) => set('theatreFee', v)} />
        </div>
      </FieldGroup>

      {medRowIndex !== null && (
        <MedicationSearchModal
          caseId={caseId}
          isOpen={true}
          onClose={() => setMedRowIndex(null)}
          onSelect={(med) => {
            const next = meds.slice();
            next[medRowIndex] = {
              ...next[medRowIndex],
              drug: med.name,
              inventoryItemId: med.id,
              sku: med.sku || undefined,
              quantityUsed: 1,
            };
            set('medications', next);
            setMedRowIndex(null);
          }}
        />
      )}

      {implantRowIndex !== null && (
        <ImplantSearchModal
          caseId={caseId}
          isOpen={true}
          onClose={() => setImplantRowIndex(null)}
          onSelect={(implant) => {
            const next = implants.slice();
            next[implantRowIndex] = {
              ...next[implantRowIndex],
              item: implant.name,
              lotNo: implant.available_lot_numbers?.[0] || '',
              size: implant.available_sizes?.[0] || '',
              inventoryItemId: implant.id,
              sku: implant.sku || undefined,
              unitCost: implant.unit_cost,
              quantityUsed: 1,
            };
            set('implants', next);
            setImplantRowIndex(null);
          }}
        />
      )}

      {specimenRowIndex !== null && (
        <SpecimenSearchModal
          caseId={caseId}
          isOpen={true}
          onClose={() => setSpecimenRowIndex(null)}
          onSelect={(specimen) => {
            const next = specimens.slice();
            next[specimenRowIndex] = {
              ...next[specimenRowIndex],
              type: specimen.name,
              inventoryItemId: specimen.id,
              sku: specimen.sku || undefined,
            };
            set('specimens', next);
            setSpecimenRowIndex(null);
          }}
        />
      )}
    </div>
  );
}

