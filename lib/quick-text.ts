/**
 * Quick Text Library
 * 
 * Common medical phrases and findings for rapid documentation.
 * Organized by category for easy access.
 */

export interface QuickTextItem {
    id: string;
    label: string;
    text: string;
    category: string;
}

export interface QuickTextCategory {
    id: string;
    name: string;
    items: QuickTextItem[];
}

/**
 * Quick Text Categories
 */
export const QUICK_TEXT_LIBRARY: QuickTextCategory[] = [
    {
        id: 'opening-statements',
        name: 'Opening Statements',
        items: [
            {
                id: 'aesthetic-consult-opening',
                label: 'Aesthetic Consultation Opening',
                text: 'Patient presents for aesthetic consultation regarding ',
                category: 'opening-statements',
            },
            {
                id: 'follow-up-opening',
                label: 'Follow-up Visit',
                text: 'Patient returns for follow-up evaluation of ',
                category: 'opening-statements',
            },
            {
                id: 'new-patient',
                label: 'New Patient',
                text: 'New patient presents with concerns about ',
                category: 'opening-statements',
            },
        ],
    },
    {
        id: 'examination-findings',
        name: 'Examination Findings',
        items: [
            {
                id: 'normal-exam',
                label: 'Normal Examination',
                text: 'Physical examination reveals no acute abnormalities.',
                category: 'examination-findings',
            },
            {
                id: 'good-candidate',
                label: 'Good Surgical Candidate',
                text: 'Patient appears to be a good candidate for the proposed procedure with realistic expectations.',
                category: 'examination-findings',
            },
            {
                id: 'skin-quality',
                label: 'Good Skin Quality',
                text: 'Skin demonstrates good elasticity and texture.',
                category: 'examination-findings',
            },
        ],
    },
    {
        id: 'procedures',
        name: 'Common Procedures',
        items: [
            {
                id: 'rhinoplasty',
                label: 'Rhinoplasty',
                text: 'Rhinoplasty with dorsal hump reduction and tip refinement',
                category: 'procedures',
            },
            {
                id: 'facelift',
                label: 'Facelift',
                text: 'Facelift with SMAS plication and neck contouring',
                category: 'procedures',
            },
            {
                id: 'breast-aug',
                label: 'Breast Augmentation',
                text: 'Breast augmentation with silicone implants',
                category: 'procedures',
            },
            {
                id: 'liposuction',
                label: 'Liposuction',
                text: 'Liposuction with fat grafting',
                category: 'procedures',
            },
        ],
    },
    {
        id: 'risks-discussed',
        name: 'Risks & Consent',
        items: [
            {
                id: 'standard-risks',
                label: 'Standard Surgical Risks',
                text: 'Discussed risks including bleeding, infection, scarring, asymmetry, need for revision surgery, and anesthesia complications.',
                category: 'risks-discussed',
            },
            {
                id: 'informed-consent',
                label: 'Informed Consent',
                text: 'Patient demonstrates understanding of the procedure, risks, benefits, and alternatives. Informed consent obtained.',
                category: 'risks-discussed',
            },
            {
                id: 'realistic-expectations',
                label: 'Realistic Expectations',
                text: 'Patient has realistic expectations regarding outcomes and recovery timeline.',
                category: 'risks-discussed',
            },
        ],
    },
    {
        id: 'recommendations',
        name: 'Recommendations',
        items: [
            {
                id: 'proceed-surgery',
                label: 'Proceed with Surgery',
                text: 'Recommend proceeding with planned surgical intervention.',
                category: 'recommendations',
            },
            {
                id: 'conservative-management',
                label: 'Conservative Management',
                text: 'Recommend conservative management with non-surgical options at this time.',
                category: 'recommendations',
            },
            {
                id: 'additional-consultation',
                label: 'Additional Consultation',
                text: 'Recommend additional consultation to further discuss options and expectations.',
                category: 'recommendations',
            },
        ],
    },
    {
        id: 'follow-up',
        name: 'Follow-up Instructions',
        items: [
            {
                id: 'standard-follow-up',
                label: 'Standard Follow-up',
                text: 'Follow-up scheduled for post-operative evaluation.',
                category: 'follow-up',
            },
            {
                id: 'pre-op-instructions',
                label: 'Pre-op Instructions',
                text: 'Pre-operative instructions provided. Patient to discontinue blood thinners 2 weeks prior to surgery.',
                category: 'follow-up',
            },
            {
                id: 'call-with-questions',
                label: 'Call with Questions',
                text: 'Patient instructed to call with any questions or concerns.',
                category: 'follow-up',
            },
        ],
    },
];

/**
 * Get quick text by category
 */
export function getQuickTextByCategory(categoryId: string): QuickTextItem[] {
    const category = QUICK_TEXT_LIBRARY.find(c => c.id === categoryId);
    return category?.items || [];
}

/**
 * Search quick text
 */
export function searchQuickText(query: string): QuickTextItem[] {
    const lowerQuery = query.toLowerCase();
    return QUICK_TEXT_LIBRARY.flatMap(category =>
        category.items.filter(
            item =>
                item.label.toLowerCase().includes(lowerQuery) ||
                item.text.toLowerCase().includes(lowerQuery)
        )
    );
}
