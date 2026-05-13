'use client';

import type { NurseIntraOpRecordDraft } from '@/domain/clinical-forms/NurseIntraOpRecord';
import {
  ANAESTHESIA_TYPE_OPTIONS,
  ARRIVAL_MODE_OPTIONS,
  ASA_CLASS_OPTIONS,
  CANNULA_POSITION_OPTIONS,
  DRAIN_TYPE_OPTIONS,
  PATIENT_POSITION_OPTIONS,
  SEX_OPTIONS,
  SKIN_PREP_AGENT_OPTIONS,
  TOURNIQUET_SIDE_OPTIONS,
  WOUND_CLASS_OPTIONS,
  WOUND_IRRIGATION_OPTIONS,
} from '@/domain/clinical-forms/NurseIntraOpRecord';

import {
  DateField,
  FieldGroup,
  MultiSelectField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
  TimeField,
  YesNoField,
} from '../components/fields';

export function Page1PreOpSection(props: {
  data: NurseIntraOpRecordDraft;
  disabled: boolean;
  onChange: (next: NurseIntraOpRecordDraft) => void;
}) {
  const { data, disabled, onChange } = props;

  const set = <K extends keyof NurseIntraOpRecordDraft>(key: K, value: NurseIntraOpRecordDraft[K]) =>
    onChange({ ...data, [key]: value });

  const skinPrepAgents = data.skinPrepAgents ?? [];
  const drainTypes = data.drainTypes ?? [];
  const woundIrrigation = data.woundIrrigation ?? [];

  return (
    <div className="space-y-4">
      <FieldGroup title="Patient identification">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Patient file no." value={data.patientFileNo ?? ''} disabled={disabled} onChange={(v) => set('patientFileNo', v)} />
          <TextField label="Name" value={data.patientName ?? ''} disabled={disabled} onChange={(v) => set('patientName', v)} />
          <NumberField label="Age" value={data.age} disabled={disabled} onChange={(v) => set('age', v)} />
          <SelectField label="Sex" value={data.sex} disabled={disabled} onChange={(v) => set('sex', v)} options={SEX_OPTIONS} placeholder="Select sex" />
          <DateField label="Date" value={data.date ?? ''} disabled={disabled} onChange={(v) => set('date', v)} />
          <TextField className="md:col-span-2" label="Doctor" value={data.doctor ?? ''} disabled={disabled} onChange={(v) => set('doctor', v)} />
        </div>
      </FieldGroup>

      <FieldGroup title="Arrival details">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DateField label="Arrival date" value={data.arrivalDate ?? ''} disabled={disabled} onChange={(v) => set('arrivalDate', v)} />
          <TimeField label="Time in" value={data.timeIn ?? ''} disabled={disabled} onChange={(v) => set('timeIn', v)} />
          <SelectField label="Mode" value={data.arrivalMode} disabled={disabled} onChange={(v) => set('arrivalMode', v)} options={ARRIVAL_MODE_OPTIONS} placeholder="Select mode" />
          <TextField className="md:col-span-2" label="Allergies" value={data.allergies ?? ''} disabled={disabled} onChange={(v) => set('allergies', v)} />
          <SelectField label="ASA class" value={data.asaClass} disabled={disabled} onChange={(v) => set('asaClass', v)} options={ASA_CLASS_OPTIONS} placeholder="Select ASA" />
          <TextAreaField className="md:col-span-3" label="Comments" value={data.comments ?? ''} disabled={disabled} onChange={(v) => set('comments', v)} rows={2} />
        </div>
      </FieldGroup>

      <FieldGroup title="Pre-op checklist" description="All items are required (Y/N) for finalization.">
        <div className="space-y-2">
          <YesNoField label="Patient ID verified with Reg No." value={data.patientIdVerified} disabled={disabled} onChange={(v) => set('patientIdVerified', v)} />
          <YesNoField label="Informed consent signed" value={data.informedConsentSigned} disabled={disabled} onChange={(v) => set('informedConsentSigned', v)} />
          <YesNoField label="Pre-op checklist completed" value={data.preOpChecklistCompleted} disabled={disabled} onChange={(v) => set('preOpChecklistCompleted', v)} />
          <YesNoField label="WHO checklist completed" value={data.whoChecklistCompleted} disabled={disabled} onChange={(v) => set('whoChecklistCompleted', v)} />
          <YesNoField label="Arrived with IV infusing" value={data.arrivedWithIVInfusing} disabled={disabled} onChange={(v) => set('arrivedWithIVInfusing', v)} />
        </div>

        <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="IV started by" value={data.ivStartedBy ?? ''} disabled={disabled} onChange={(v) => set('ivStartedBy', v)} />
          <TimeField label="IV start time" value={data.ivStartTime ?? ''} disabled={disabled} onChange={(v) => set('ivStartTime', v)} />
          <SelectField label="Cannula position" value={data.cannulaPosition} disabled={disabled} onChange={(v) => set('cannulaPosition', v)} options={CANNULA_POSITION_OPTIONS} placeholder="Select position" />
          {data.cannulaPosition === 'Other' && (
            <TextField className="md:col-span-3" label="Cannula position (other)" value={data.cannulaPositionOther ?? ''} disabled={disabled} onChange={(v) => set('cannulaPositionOther', v)} />
          )}
        </div>
      </FieldGroup>

      <FieldGroup title="Theatre timing & safety">
        <div className="space-y-2">
          <YesNoField label="Antibiotic ordered" value={data.antibioticOrdered} disabled={disabled} onChange={(v) => set('antibioticOrdered', v)} />
        </div>

        <div className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <TextField label="Antibiotic type" value={data.antibioticType ?? ''} disabled={disabled} onChange={(v) => set('antibioticType', v)} />
          <TextField label="Ordered by" value={data.antibioticOrderedBy ?? ''} disabled={disabled} onChange={(v) => set('antibioticOrderedBy', v)} />
          <TimeField label="Antibiotic time" value={data.antibioticTime ?? ''} disabled={disabled} onChange={(v) => set('antibioticTime', v)} />
          <div />
          <TimeField label="Time in theatre" value={data.timeInTheatre ?? ''} disabled={disabled} onChange={(v) => set('timeInTheatre', v)} />
          <TimeField label="Time out of theatre" value={data.timeOutOfTheatre ?? ''} disabled={disabled} onChange={(v) => set('timeOutOfTheatre', v)} />
          <TimeField label="Operation start" value={data.operationStart ?? ''} disabled={disabled} onChange={(v) => set('operationStart', v)} />
          <TimeField label="Operation finish" value={data.operationFinish ?? ''} disabled={disabled} onChange={(v) => set('operationFinish', v)} />
        </div>

        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
            <YesNoField label="Safety belt applied" value={data.safetyBeltApplied} disabled={disabled} onChange={(v) => set('safetyBeltApplied', v)} />
            <TextField label="Safety belt position" value={data.safetyBeltPosition ?? ''} disabled={disabled} onChange={(v) => set('safetyBeltPosition', v)} />
            <YesNoField label="Arms secured" value={data.armsSecured} disabled={disabled} onChange={(v) => set('armsSecured', v)} />
            <TextField label="Arms position" value={data.armsPosition ?? ''} disabled={disabled} onChange={(v) => set('armsPosition', v)} />
            <YesNoField label="Proper body alignment" value={data.properBodyAlignment} disabled={disabled} onChange={(v) => set('properBodyAlignment', v)} />
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <TextField label="Pressure points (describe)" value={data.pressurePointsDescription ?? ''} disabled={disabled} onChange={(v) => set('pressurePointsDescription', v)} />
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Urinary catheter">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YesNoField label="Urinary catheter in-situ" value={data.urinaryCatheterInSitu} disabled={disabled} onChange={(v) => set('urinaryCatheterInSitu', v)} />
          <YesNoField label="Urinary catheter inserted in theatre" value={data.urinaryCatheterInsertedInTheatre} disabled={disabled} onChange={(v) => set('urinaryCatheterInsertedInTheatre', v)} />
          <TextField label="Catheter type" value={data.catheterType ?? ''} disabled={disabled} onChange={(v) => set('catheterType', v)} />
          <TextField label="Catheter size" value={data.catheterSize ?? ''} disabled={disabled} onChange={(v) => set('catheterSize', v)} />
        </div>
      </FieldGroup>

      <FieldGroup title="Patient position">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Position" value={data.patientPosition} disabled={disabled} onChange={(v) => set('patientPosition', v)} options={PATIENT_POSITION_OPTIONS} placeholder="Select position" />
          {data.patientPosition === 'Other' && (
            <TextField label="Position (other)" value={data.patientPositionOther ?? ''} disabled={disabled} onChange={(v) => set('patientPositionOther', v)} />
          )}
        </div>
      </FieldGroup>

      <FieldGroup title="Skin prep">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Shaved by" value={data.shavedBy ?? ''} disabled={disabled} onChange={(v) => set('shavedBy', v)} />
          <div />
          <MultiSelectField label="Prep agents" value={skinPrepAgents} disabled={disabled} onChange={(v) => set('skinPrepAgents', v)} options={SKIN_PREP_AGENT_OPTIONS} columns={2} />
          {skinPrepAgents.includes('Other') && (
            <TextField className="md:col-span-2" label="Prep agent (other)" value={data.skinPrepOther ?? ''} disabled={disabled} onChange={(v) => set('skinPrepOther', v)} />
          )}
        </div>
      </FieldGroup>

      <FieldGroup title="Electrosurgical unit">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Unit no." value={data.electrosurgicalUnitNo ?? ''} disabled={disabled} onChange={(v) => set('electrosurgicalUnitNo', v)} />
          <TextField label="Mode" value={data.electrosurgicalMode ?? ''} disabled={disabled} onChange={(v) => set('electrosurgicalMode', v)} />
          <TextField label="Coat set" value={data.coatSet ?? ''} disabled={disabled} onChange={(v) => set('coatSet', v)} />
          <TextField label="Cut set" value={data.cutSet ?? ''} disabled={disabled} onChange={(v) => set('cutSet', v)} />
          <TextField label="Skin checked before" value={data.electrosurgicalSkinCheckedBefore ?? ''} disabled={disabled} onChange={(v) => set('electrosurgicalSkinCheckedBefore', v)} />
          <TextField label="Skin checked after" value={data.electrosurgicalSkinCheckedAfter ?? ''} disabled={disabled} onChange={(v) => set('electrosurgicalSkinCheckedAfter', v)} />
        </div>
      </FieldGroup>

      <FieldGroup title="Tourniquet">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <TextField label="Type" value={data.tourniquetType ?? ''} disabled={disabled} onChange={(v) => set('tourniquetType', v)} />
          <TextField label="Site" value={data.tourniquetSite ?? ''} disabled={disabled} onChange={(v) => set('tourniquetSite', v)} />
          <SelectField label="Side" value={data.tourniquetSide} disabled={disabled} onChange={(v) => set('tourniquetSide', v)} options={TOURNIQUET_SIDE_OPTIONS} placeholder="Select side" />
          <NumberField label="Pressure" value={data.tourniquetPressure} disabled={disabled} onChange={(v) => set('tourniquetPressure', v)} />
          <TimeField label="Time on" value={data.tourniquetTimeOn ?? ''} disabled={disabled} onChange={(v) => set('tourniquetTimeOn', v)} />
          <TimeField label="Time off" value={data.tourniquetTimeOff ?? ''} disabled={disabled} onChange={(v) => set('tourniquetTimeOff', v)} />
          <TextField label="Skin checked before" value={data.tourniquetSkinCheckedBefore ?? ''} disabled={disabled} onChange={(v) => set('tourniquetSkinCheckedBefore', v)} />
          <TextField label="Skin checked after" value={data.tourniquetSkinCheckedAfter ?? ''} disabled={disabled} onChange={(v) => set('tourniquetSkinCheckedAfter', v)} />
        </div>
      </FieldGroup>

      <FieldGroup title="Drains & wound irrigation">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiSelectField label="Drain types" value={drainTypes} disabled={disabled} onChange={(v) => set('drainTypes', v)} options={DRAIN_TYPE_OPTIONS} columns={2} />
          <MultiSelectField label="Wound irrigation" value={woundIrrigation} disabled={disabled} onChange={(v) => set('woundIrrigation', v)} options={WOUND_IRRIGATION_OPTIONS} columns={2} />
          {drainTypes.includes('Other') && (
            <TextField className="md:col-span-2" label="Drain type (other)" value={data.drainTypeOther ?? ''} disabled={disabled} onChange={(v) => set('drainTypeOther', v)} />
          )}
          {woundIrrigation.includes('Other') && (
            <TextField className="md:col-span-2" label="Wound irrigation (other)" value={data.woundIrrigationOther ?? ''} disabled={disabled} onChange={(v) => set('woundIrrigationOther', v)} />
          )}
        </div>
      </FieldGroup>

      <FieldGroup title="Wound pack & class">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Wound pack type" value={data.woundPackType ?? ''} disabled={disabled} onChange={(v) => set('woundPackType', v)} />
          <TextField label="Wound pack site" value={data.woundPackSite ?? ''} disabled={disabled} onChange={(v) => set('woundPackSite', v)} />
          <SelectField label="Wound class" value={data.woundClass} disabled={disabled} onChange={(v) => set('woundClass', v)} options={WOUND_CLASS_OPTIONS} placeholder="Select class" />
        </div>
      </FieldGroup>

      <FieldGroup title="Surgical team & anaesthesia">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Surgeon" value={data.surgeon ?? ''} disabled={disabled} onChange={(v) => set('surgeon', v)} />
          <TextField label="Assistant" value={data.assistant ?? ''} disabled={disabled} onChange={(v) => set('assistant', v)} />
          <TextField label="Anaesthesiologist" value={data.anaesthesiologist ?? ''} disabled={disabled} onChange={(v) => set('anaesthesiologist', v)} />
          <TextField label="Scrub nurse" value={data.scrubNurse ?? ''} disabled={disabled} onChange={(v) => set('scrubNurse', v)} />
          <TextField label="Circulating nurse" value={data.circulatingNurse ?? ''} disabled={disabled} onChange={(v) => set('circulatingNurse', v)} />
          <TextField label="Observers / other" value={data.observers ?? ''} disabled={disabled} onChange={(v) => set('observers', v)} />
        </div>

        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Anaesthesia type" value={data.anaesthesiaType} disabled={disabled} onChange={(v) => set('anaesthesiaType', v)} options={ANAESTHESIA_TYPE_OPTIONS} placeholder="Select type" />
          <TextField label="Anaesthesia detail" value={data.anaesthesiaDetail ?? ''} disabled={disabled} onChange={(v) => set('anaesthesiaDetail', v)} />
        </div>
      </FieldGroup>

      <FieldGroup title="Diagnosis & operation">
        <div className="grid grid-cols-1 gap-4">
          <TextField label="Pre-op diagnosis" value={data.preOpDiagnosis ?? ''} disabled={disabled} onChange={(v) => set('preOpDiagnosis', v)} />
          <TextField label="Intra-op diagnosis" value={data.intraOpDiagnosis ?? ''} disabled={disabled} onChange={(v) => set('intraOpDiagnosis', v)} />
          <TextField label="Operation(s)" value={data.operationsPerformed ?? ''} disabled={disabled} onChange={(v) => set('operationsPerformed', v)} />
        </div>
      </FieldGroup>
    </div>
  );
}
