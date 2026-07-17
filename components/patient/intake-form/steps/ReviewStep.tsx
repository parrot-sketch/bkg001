'use client';

import { UseFormReturn } from 'react-hook-form';

interface ReviewStepProps {
  form: UseFormReturn<any>;
  isMinor?: boolean;
}

export function ReviewStep({ form, isMinor = false }: ReviewStepProps) {
  const data = form.watch();

  const contactFields = [
    { label: 'Email', value: data.email },
    { label: 'Phone', value: data.phone },
    { label: 'WhatsApp', value: data.whatsappPhone || '—' },
    { label: 'Address', value: data.address },
    ...(isMinor ? [] : [
      { label: 'Marital Status', value: data.maritalStatus },
      { label: 'Occupation', value: data.occupation || '—' },
    ]),
  ];

  const sections = [
    {
      title: 'About You',
      fields: [
        { label: 'Name', value: `${data.firstName} ${data.lastName}` },
        { label: 'Date of Birth', value: data.dateOfBirth },
        { label: 'Gender', value: data.gender },
      ],
    },
    {
      title: 'Contact Info',
      fields: contactFields,
    },
    {
      title: 'Emergency Contact',
      fields: [
        { label: 'Name', value: data.emergencyContactName },
        { label: 'Phone', value: data.emergencyContactNumber },
        { label: 'Relationship', value: data.emergencyContactRelation },
      ],
    },
    {
      title: 'Your Health',
      fields: [
        { label: 'Blood Group', value: data.bloodGroup || '—' },
        { label: 'Allergies', value: data.allergies || '—' },
        { label: 'Medical Conditions', value: data.medicalConditions || '—' },
        { label: 'Medical History', value: data.medicalHistory || '—' },
      ],
    },
    {
      title: 'Insurance',
      fields: [
        { label: 'Provider', value: data.insuranceProvider || '—' },
        { label: 'Policy Number', value: data.insuranceNumber || '—' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Your Info</h2>
        <p className="text-gray-500 mt-1">Please check that everything looks correct</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3">{section.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.fields.map((field) => (
                <div key={field.label}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{field.label}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm text-green-900">
          Everything looks good? Click Submit to send your form. You can still go back to edit anything.
        </p>
      </div>
    </div>
  );
}
