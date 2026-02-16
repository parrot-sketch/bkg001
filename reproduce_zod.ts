
import { z } from 'zod';

// Mock Enum
enum SurgicalRole {
    SURGEON = 'SURGEON',
    ASSISTANT_SURGEON = 'ASSISTANT_SURGEON',
    ANESTHESIOLOGIST = 'ANESTHESIOLOGIST',
    ANESTHETIST_NURSE = 'ANESTHETIST_NURSE',
    SCRUB_NURSE = 'SCRUB_NURSE',
    CIRCULATING_NURSE = 'CIRCULATING_NURSE',
    THEATER_TECHNICIAN = 'THEATER_TECHNICIAN',
}

const querySchema = z.object({
    caseId: z.string().min(1),
    surgicalRole: z.nativeEnum(SurgicalRole),
    q: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(50).default(20),
});

const runTest = (name: string, params: any) => {
    console.log(`--- Test: ${name} ---`);
    const result = querySchema.safeParse(params);
    if (result.success) {
        console.log('Success:', result.data);
    } else {
        console.log('Error:', JSON.stringify(result.error.format(), null, 2));
    }
};

// 1. Full valid params
runTest('Full Valid', {
    caseId: '123',
    surgicalRole: 'SCRUB_NURSE', // string from URL
    page: '1',
    pageSize: '20'
});

// 2. Missing optional params (simulating URLSearchParams.get returning null)
runTest('Missing page/pageSize (null)', {
    caseId: '123',
    surgicalRole: 'SURGEON',
    page: null,
    pageSize: null
});

// 3. Mixed types
runTest('Mixed types', {
    caseId: '123',
    surgicalRole: 'SURGEON',
    page: 1, // number
    pageSize: '20' // string
});
