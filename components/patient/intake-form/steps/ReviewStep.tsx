'use client';

import { UseFormReturn } from 'react-hook-form';

interface ReviewStepProps {
  form: UseFormReturn<any>;
}

export function ReviewStep({ form }: ReviewStepProps) {
  const data = form.watch();

  const sections = [
    {
      title: 'Personal Information',
      fields: [
        { label: 'Name', value: `${data.firstName} ${data.lastName}` },
        { label: 'Date of Birth', value: data.dateOfBirth },
        { label: 'Gender', value: data.gender },
      ],
    },
    {
      title: 'Contact Information',
      fields: [
        { label: 'Email', value: data.email },
        { label: 'Phone', value: data.phone },
        { label: 'WhatsApp', value: data.whatsappPhone || '—' },
        { label: 'Address', value: data.address },
        { label: 'Marital Status', value: data.maritalStatus },
        { label: 'Occupation', value: data.occupation || '—' },
      ],
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
      title: 'Medical Information',
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
        <h2 className="text-xl font-semibold text-gray-900">Review Your Information</h2>
        <p className="text-gray-600 mt-1">Please verify everything is correct before submitting</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{section.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((field) => (
                <div key={field.label}>
                  <p className="text-sm text-gray-600">{field.label}</p>
                  <p className="font-medium text-gray-900 mt-1">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          ✅ Everything looks good? Click Submit to send your intake form. You can still go back to edit any information.
        </p>
      </div>
    </div>
  );
}
