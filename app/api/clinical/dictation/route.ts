import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { resolveDoctorCaseAccess } from '@/lib/doctor/surgicalCaseDocumentAccess';

const DICTATION_ROLES = [Role.DOCTOR, Role.NURSE];
const DICTATION_CONTEXTS = new Set(['default', 'Chief Complaint', 'Examination', 'General']);

async function canDictateInContext(user: { userId: string; role: string }, contextType: string, contextId: string): Promise<boolean> {
    if (!contextId || contextId.length > 100) return false;

    if (contextType === 'case') {
        if (user.role !== Role.DOCTOR) return false;
        const access = await resolveDoctorCaseAccess(user.userId, contextId);
        if (!access?.canEdit) return false;
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: contextId },
            select: { status: true },
        });
        return !!surgicalCase && surgicalCase.status !== 'COMPLETED' && surgicalCase.status !== 'CANCELLED';
    }

    if (contextType === 'patient') {
        if (user.role === Role.DOCTOR) {
            const doctor = await db.doctor.findUnique({ where: { user_id: user.userId }, select: { id: true } });
            if (!doctor) return false;
            return !!await db.patient.findFirst({
                where: {
                    id: contextId,
                    patient_assignments: {
                        some: { doctor_id: doctor.id, status: 'ACTIVE' },
                    },
                },
                select: { id: true },
            });
        }
        return !!await db.patient.findFirst({
            where: { id: contextId, nurse_assignments: { some: { nurse_user_id: user.userId } } },
            select: { id: true },
        });
    }

    const appointmentId = Number(contextId);
    if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) return false;

    if (contextType === 'consultation') {
        const consultation = await db.consultation.findUnique({
            where: { id: appointmentId },
            select: {
                id: true,
                completed_at: true,
                appointment_id: true,
                doctor: { select: { user_id: true } },
                appointment: { select: { status: true } },
            },
        });
        if (!consultation || consultation.completed_at || consultation.appointment.status !== 'IN_CONSULTATION') return false;
        if (user.role === Role.DOCTOR) return consultation.doctor.user_id === user.userId;
        return !!await db.nurseAssignment.findFirst({
            where: { appointment_id: consultation.appointment_id, nurse_user_id: user.userId },
            select: { id: true },
        });
    }

    if (contextType === 'appointment') {
        const consultation = await db.consultation.findFirst({
            where: {
                appointment_id: appointmentId,
                completed_at: null,
                appointment: { is: { status: 'IN_CONSULTATION' } },
            },
            select: { id: true, appointment_id: true, doctor: { select: { user_id: true } } },
        });
        if (!consultation) return false;
        if (user.role === Role.DOCTOR) return consultation.doctor.user_id === user.userId;
        return !!await db.nurseAssignment.findFirst({
            where: { appointment_id: appointmentId, nurse_user_id: user.userId },
            select: { id: true },
        });
    }

    return false;
}

async function authorizeDictation(request: NextRequest, requireContext = true): Promise<NextResponse | null> {
    const auth = await JwtMiddleware.authenticate(request);
    if (!auth.success || !auth.user) {
        return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (!DICTATION_ROLES.includes(auth.user.role as Role)) {
        return NextResponse.json({ success: false, error: 'Clinical dictation is not permitted for this role' }, { status: 403 });
    }
    if (!requireContext) return null;

    const contextType = request.headers.get('x-clinical-context-type') || '';
    const contextId = request.headers.get('x-clinical-context-id') || '';
    if (!['appointment', 'consultation', 'case', 'patient'].includes(contextType) || !contextId) {
        return NextResponse.json({ success: false, error: 'Clinical context is required' }, { status: 400 });
    }
    if (!await canDictateInContext(auth.user, contextType, contextId)) {
        return NextResponse.json({ success: false, error: 'Clinical context not found' }, { status: 404 });
    }
    return null;
}

// Lazy initialize OpenAI client - only when API key is available
function getOpenAIClient(): OpenAI | null {
    if (!process.env.OPENAI_API_KEY) {
        return null;
    }
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

/**
 * API Route: Clinical Dictation (AI-Powered)
 * 
 * 1. Receives audio blob from the frontend.
 * 2. Uses OpenAI Whisper (whisper-1) for high-accuracy speech-to-text.
 * 3. Uses GPT-4o to refine the raw transcription into professional medical notes.
 */
export async function GET(request: NextRequest) {
    const denied = await authorizeDictation(request, false);
    if (denied) return denied;

    const isConfigured = !!process.env.OPENAI_API_KEY;
    return NextResponse.json({
        available: isConfigured,
        provider: 'openai',
        message: isConfigured ? 'AI Service Active' : 'AI Service Not Configured'
    });
}

export async function POST(req: NextRequest) {
    try {
        const denied = await authorizeDictation(req);
        if (denied) return denied;

        const formData = await req.formData();
        const audioBlob = formData.get('audio') as Blob;
        const context = (formData.get('context') as string) || 'default';

        if (!DICTATION_CONTEXTS.has(context)) {
            return NextResponse.json(
                { success: false, error: 'Invalid dictation context' },
                { status: 400 }
            );
        }

        if (!audioBlob) {
            return NextResponse.json(
                { success: false, error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // 1. Prepare the file for Whisper
        // We convert the Blob to a File object which OpenAI SDK accepts
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

        console.log(`[Dictation] Processing authorized audio request (${audioBlob.size} bytes)`);

        // Lazy initialize OpenAI client
        const client = getOpenAIClient();
        if (!client) {
            console.warn('[Dictation] OPENAI_API_KEY not found. Falling back to mock response.');
            return handleMockResponse(context);
        }

        // 2. Transcription via OpenAI Whisper
        const transcription = await client.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'en', // Optional: can be auto-detected
        });

        const rawText = transcription.text;
        // 3. Refinement via GPT-4o (The "AI Medical Scribe")
        const scribeResponse = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional Medical Scribe. Your task is to refine raw clinical dictations into polished, professional medical notes.
          
          Guidelines:
          - Remove filler words (ums, ahs, stutters).
          - Correct grammar and clinical terminology.
          - Maintain the clinical meaning exactly as dictated.
          - Format as professional medical documentation.
          - The current section context is: ${context}.
          - Return ONLY the refined text. No chat or explanations.`,
                },
                {
                    role: 'user',
                    content: rawText,
                },
            ],
            temperature: 0.3, // Low temperature for consistency
        });

        const refinedText = scribeResponse.choices[0]?.message?.content || rawText;

        return NextResponse.json({
            success: true,
            text: refinedText,
            metadata: {
                rawText,
                model: 'whisper-1 + gpt-4o',
                confidence: 0.99,
                timestamp: new Date().toISOString(),
                ai_refined: true,
            },
        });

    } catch (error: any) {
        console.error('[Dictation AI Error]:', error);

        // Handle specific AI errors
        if (error.status === 401) {
            return NextResponse.json(
                { success: false, error: 'Invalid OpenAI API key. Update required.' },
                { status: 401 }
            );
        }

        if (error.status === 429) {
            return NextResponse.json(
                { success: false, error: 'OpenAI quota exceeded. Billing update required.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to process AI dictation' },
            { status: 500 }
        );
    }
}

/**
 * Mock response fallback for development/testing without API keys
 */
async function handleMockResponse(context: string) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mockTranscriptions: Record<string, string> = {
        'Chief Complaint': 'Patient reports increasing discomfort in the lower abdominal region over the past three days, accompanied by mild nausea.',
        'Examination': 'On physical examination, there is localized tenderness in the right iliac fossa. No guarding or rebound tenderness noted.',
        'default': 'This is a simulated AI transcription. Configure OPENAI_API_KEY to enable real-time medical scribing.'
    };

    return NextResponse.json({
        success: true,
        text: mockTranscriptions[context] || mockTranscriptions['default'],
        metadata: {
            is_mock: true,
            timestamp: new Date().toISOString()
        }
    });
}
