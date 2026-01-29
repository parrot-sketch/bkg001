/**
 * Clinical Templates Library
 * 
 * Pre-defined templates for common clinical documentation patterns.
 * Designed for aesthetic surgery and general medical consultations.
 */

export interface TemplateSection {
    id: string;
    title: string;
    placeholder: string;
    content?: string;
    required?: boolean;
}

export interface ClinicalTemplate {
    id: string;
    name: string;
    description: string;
    specialty: 'aesthetic' | 'general' | 'surgical';
    sections: TemplateSection[];
}

/**
 * Aesthetic Consultation Template
 * Standard format for cosmetic/aesthetic surgery consultations
 */
export const AESTHETIC_CONSULTATION_TEMPLATE: ClinicalTemplate = {
    id: 'aesthetic-consultation',
    name: 'Aesthetic Consultation',
    description: 'Comprehensive aesthetic surgery consultation format',
    specialty: 'aesthetic',
    sections: [
        {
            id: 'chief-complaint',
            title: 'Chief Complaint & Aesthetic Goals',
            placeholder: 'Document patient\'s primary aesthetic concerns and desired outcomes...',
            content: '<h2>Chief Complaint & Aesthetic Goals</h2><p></p>',
            required: true,
        },
        {
            id: 'medical-history',
            title: 'Medical History Review',
            placeholder: 'Review relevant medical history, medications, allergies...',
            content: '<h2>Medical History Review</h2><ul><li>Previous surgeries: </li><li>Current medications: </li><li>Allergies: </li><li>Medical conditions: </li></ul>',
        },
        {
            id: 'physical-examination',
            title: 'Physical Examination',
            placeholder: 'Document clinical findings and anatomical assessment...',
            content: '<h2>Physical Examination</h2><p><strong>General appearance:</strong> </p><p><strong>Area of concern:</strong> </p><p><strong>Skin quality:</strong> </p>',
            required: true,
        },
        {
            id: 'photographic-documentation',
            title: 'Photographic Documentation',
            placeholder: 'Note photos captured and angles documented...',
            content: '<h2>Photographic Documentation</h2><p>Standard views captured: </p>',
        },
        {
            id: 'assessment',
            title: 'Clinical Assessment',
            placeholder: 'Clinical impression and suitability for procedure...',
            content: '<h2>Clinical Assessment</h2><p></p>',
            required: true,
        },
        {
            id: 'recommendations',
            title: 'Recommendations & Treatment Plan',
            placeholder: 'Recommended procedures, alternatives, expected outcomes...',
            content: '<h2>Recommendations & Treatment Plan</h2><p><strong>Recommended procedure:</strong> </p><p><strong>Alternative options:</strong> </p><p><strong>Expected outcomes:</strong> </p>',
            required: true,
        },
        {
            id: 'risks-consent',
            title: 'Risks & Consent Discussion',
            placeholder: 'Document risks discussed and patient understanding...',
            content: '<h2>Risks & Consent Discussion</h2><p>Discussed risks including:</p><ul><li>Bleeding</li><li>Infection</li><li>Scarring</li><li>Asymmetry</li><li>Need for revision</li></ul><p>Patient demonstrates understanding and provides informed consent.</p>',
        },
        {
            id: 'follow-up',
            title: 'Follow-up Instructions',
            placeholder: 'Next steps, pre-op requirements, scheduling...',
            content: '<h2>Follow-up Instructions</h2><p></p>',
        },
    ],
};

/**
 * SOAP Note Template
 * Standard medical documentation format
 */
export const SOAP_TEMPLATE: ClinicalTemplate = {
    id: 'soap-note',
    name: 'SOAP Note',
    description: 'Subjective, Objective, Assessment, Plan format',
    specialty: 'general',
    sections: [
        {
            id: 'subjective',
            title: 'Subjective',
            placeholder: 'Patient\'s reported symptoms, concerns, history...',
            content: '<h2>Subjective</h2><p><strong>Chief Complaint:</strong> </p><p><strong>History of Present Illness:</strong> </p>',
            required: true,
        },
        {
            id: 'objective',
            title: 'Objective',
            placeholder: 'Physical examination findings, vital signs, test results...',
            content: '<h2>Objective</h2><p><strong>Vital Signs:</strong> </p><p><strong>Physical Examination:</strong> </p>',
            required: true,
        },
        {
            id: 'assessment',
            title: 'Assessment',
            placeholder: 'Clinical impression, diagnosis...',
            content: '<h2>Assessment</h2><p></p>',
            required: true,
        },
        {
            id: 'plan',
            title: 'Plan',
            placeholder: 'Treatment plan, medications, follow-up...',
            content: '<h2>Plan</h2><p></p>',
            required: true,
        },
    ],
};

/**
 * Procedure Note Template
 * For documenting surgical/procedural interventions
 */
export const PROCEDURE_NOTE_TEMPLATE: ClinicalTemplate = {
    id: 'procedure-note',
    name: 'Procedure Note',
    description: 'Surgical/procedural documentation',
    specialty: 'surgical',
    sections: [
        {
            id: 'pre-operative',
            title: 'Pre-operative Assessment',
            placeholder: 'Pre-op diagnosis, consent, patient preparation...',
            content: '<h2>Pre-operative Assessment</h2><p><strong>Pre-op Diagnosis:</strong> </p><p><strong>Procedure:</strong> </p><p><strong>Consent obtained:</strong> Yes</p>',
            required: true,
        },
        {
            id: 'intra-operative',
            title: 'Intra-operative Findings',
            placeholder: 'Procedure details, technique, findings...',
            content: '<h2>Intra-operative Findings</h2><p><strong>Anesthesia:</strong> </p><p><strong>Technique:</strong> </p><p><strong>Findings:</strong> </p>',
            required: true,
        },
        {
            id: 'post-operative',
            title: 'Post-operative Plan',
            placeholder: 'Recovery, medications, follow-up...',
            content: '<h2>Post-operative Plan</h2><p><strong>Patient tolerated procedure well</strong></p><p><strong>Medications:</strong> </p><p><strong>Follow-up:</strong> </p>',
            required: true,
        },
    ],
};

/**
 * Get all available templates
 */
export const CLINICAL_TEMPLATES: ClinicalTemplate[] = [
    AESTHETIC_CONSULTATION_TEMPLATE,
    SOAP_TEMPLATE,
    PROCEDURE_NOTE_TEMPLATE,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ClinicalTemplate | undefined {
    return CLINICAL_TEMPLATES.find(t => t.id === id);
}

/**
 * Generate full HTML from template
 */
export function generateTemplateHTML(template: ClinicalTemplate): string {
    return template.sections
        .map(section => section.content || `<h2>${section.title}</h2><p></p>`)
        .join('\n');
}
