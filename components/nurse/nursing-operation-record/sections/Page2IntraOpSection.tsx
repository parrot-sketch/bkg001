'use client';

import { useMemo, useState } from 'react';
import type {
  NurseIntraOpRecordDraft,
  MedicationRow,
  ImplantRow,
  SpecimenRow,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import { YnCheckboxPair } from './shared';
import { MedicationSearchModal } from '@/components/nurse/MedicationSearchModal';
import { ImplantSearchModal } from '@/components/nurse/ImplantSearchModal';
import { SpecimenSearchModal } from '@/components/nurse/SpecimenSearchModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';

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

  const preliminary = swabs.preliminaryCheck;
  const woundClosure = swabs.woundClosure;
  const finalCount = swabs.finalCount;

  const setSwab = (
    row: SwabsRowKey,
    col: SwabsColKey,
    value: number,
  ) => {
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

  return (
    <div className="space-y-10">
      {/* Counts table */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Swabs, instruments &amp; sharps count
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center" disabled={disabled} value={preliminary.abdominalSwabs ?? 0} onChange={(e) => setSwab('preliminaryCheck', 'abdominalSwabs', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center" disabled={disabled} value={preliminary.raytecSwabs ?? 0} onChange={(e) => setSwab('preliminaryCheck', 'raytecSwabs', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center" disabled={disabled} value={preliminary.throatPacks ?? 0} onChange={(e) => setSwab('preliminaryCheck', 'throatPacks', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center" disabled={disabled} value={preliminary.other ?? 0} onChange={(e) => setSwab('preliminaryCheck', 'other', Number(e.target.value) || 0)} /></td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-700">Wound closure</td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center" disabled={disabled} value={woundClosure.abdominalSwabs ?? 0} onChange={(e) => setSwab('woundClosure', 'abdominalSwabs', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center" disabled={disabled} value={woundClosure.raytecSwabs ?? 0} onChange={(e) => setSwab('woundClosure', 'raytecSwabs', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center" disabled={disabled} value={woundClosure.throatPacks ?? 0} onChange={(e) => setSwab('woundClosure', 'throatPacks', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center" disabled={disabled} value={woundClosure.other ?? 0} onChange={(e) => setSwab('woundClosure', 'other', Number(e.target.value) || 0)} /></td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-700">Final count</td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center font-semibold" disabled={disabled} value={finalCount.abdominalSwabs ?? 0} onChange={(e) => setSwab('finalCount', 'abdominalSwabs', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center font-semibold" disabled={disabled} value={finalCount.raytecSwabs ?? 0} onChange={(e) => setSwab('finalCount', 'raytecSwabs', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center font-semibold" disabled={disabled} value={finalCount.throatPacks ?? 0} onChange={(e) => setSwab('finalCount', 'throatPacks', Number(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><Input type="number" className="h-8 w-24 mx-auto text-center font-semibold" disabled={disabled} value={finalCount.other ?? 0} onChange={(e) => setSwab('finalCount', 'other', Number(e.target.value) || 0)} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-slate-200 rounded-md p-4 bg-slate-50/30 space-y-3">
          <YnCheckboxPair
            label="Count correct"
            value={data.countCorrect}
            disabled={disabled}
            onChange={(v) => set('countCorrect', v)}
          />
          {data.countCorrect === 'N' && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-1">
                Action taken if not
              </label>
              <input
                className="w-full h-10 px-3 border rounded-md text-sm"
                value={data.countActionTaken ?? ''}
                disabled={disabled}
                onChange={(e) => set('countActionTaken', e.target.value)}
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Scrub nurse signature
              </label>
              {data.scrubNurseSignature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Scrub nurse signature"
                  src={data.scrubNurseSignature}
                  className="max-w-[320px] border rounded-md bg-white"
                  style={{ height: '80px' }}
                />
              ) : (
                <p className="text-xs text-slate-500 italic">Signature captured upon finalization</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
                Circulating nurse signature
              </label>
              {data.circulatingNurseSignature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Circulating nurse signature"
                  src={data.circulatingNurseSignature}
                  className="max-w-[320px] border rounded-md bg-white"
                  style={{ height: '80px' }}
                />
              ) : (
                <p className="text-xs text-slate-500 italic">Signature captured upon finalization</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wound closure */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Wound Closure
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Non-absorbable</label>
            <Input className="h-10" disabled={disabled} value={data.nonAbsorbableSuture ?? ''} onChange={(e) => set('nonAbsorbableSuture', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Absorbable</label>
            <Input className="h-10" disabled={disabled} value={data.absorbableSuture ?? ''} onChange={(e) => set('absorbableSuture', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Other</label>
            <Input className="h-10" disabled={disabled} value={data.otherClosure ?? ''} onChange={(e) => set('otherClosure', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dressing applied</label>
            <Input className="h-10" disabled={disabled} value={data.dressingApplied ?? ''} onChange={(e) => set('dressingApplied', e.target.value)} />
          </div>
        </div>
      </div>

      {/* IV infusion / transfusions */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Intravenous Infusion / Transfusions (mL)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Packed cells</label>
            <Input type="number" className="h-10" disabled={disabled} value={data.packedCellsML ?? ''} onChange={(e) => set('packedCellsML', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Whole</label>
            <Input type="number" className="h-10" disabled={disabled} value={data.wholeBloodML ?? ''} onChange={(e) => set('wholeBloodML', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Others</label>
            <Input type="number" className="h-10" disabled={disabled} value={data.otherBloodProductsML ?? ''} onChange={(e) => set('otherBloodProductsML', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Intravenous infusion</label>
            <Input type="number" className="h-10" disabled={disabled} value={data.ivInfusionML ?? ''} onChange={(e) => set('ivInfusionML', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estimated blood loss</label>
            <Input type="number" className="h-10" disabled={disabled} value={data.estimatedBloodLossML ?? ''} onChange={(e) => set('estimatedBloodLossML', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Urinary output (amount)</label>
            <Input type="number" className="h-10" disabled={disabled} value={data.urinaryOutputML ?? ''} onChange={(e) => set('urinaryOutputML', e.target.value === '' ? undefined : Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Medication table */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">Medication</div>
        <div className="border rounded-lg overflow-hidden">
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
                      className="h-8"
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
                      className="h-8"
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
                      className="h-8"
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
                      className="h-8"
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
      </div>

      {/* Implants table */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Surgical implants / prosthesis
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 h-10">
              <tr>
                <th className="px-3 font-medium text-left">Item</th>
                <th className="px-3 font-medium text-left">Lot No.</th>
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
                      className="h-8"
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
                      className="h-8"
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
                      className="h-8"
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
      </div>

      {/* Specimens table */}
      <div className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">Specimens</div>
        <div className="border rounded-lg overflow-hidden">
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
                      className="h-8"
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
                      className="h-8"
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
      </div>

      {/* Items to be returned */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Items to be returned to theatre
        </div>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border rounded-md text-sm"
          value={data.itemsToBeReturnedToTheatre ?? ''}
          disabled={disabled}
          onChange={(e) => set('itemsToBeReturnedToTheatre', e.target.value)}
        />
      </div>

      {/* Charges */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Charges
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Anaesthetic materials charge (amount)</label>
            <Input
              type="number"
              className="h-10"
              disabled={disabled}
              value={data.anaestheticMaterialsCharge ?? ''}
              onChange={(e) => set('anaestheticMaterialsCharge', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Theatre fee (amount)</label>
            <Input
              type="number"
              className="h-10"
              disabled={disabled}
              value={data.theatreFee ?? ''}
              onChange={(e) => set('theatreFee', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Inventory modals */}
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
