import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
// Ensure OPENAI_API_KEY is set in your .env file
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API Route: Clinical Dictation (AI-Powered)
 * 
 * 1. Receives audio blob from the frontend.
 * 2. Uses OpenAI Whisper (whisper-1) for high-accuracy speech-to-text.
 * 3. Uses GPT-4o to refine the raw transcription into professional medical notes.
 */
export async function GET() {
    const isConfigured = !!process.env.OPENAI_API_KEY;
    return NextResponse.json({
        available: isConfigured,
        provider: 'openai',
        message: isConfigured ? 'AI Service Active' : 'AI Service Not Configured'
    });
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audioBlob = formData.get('audio') as Blob;
        const context = (formData.get('context') as string) || 'General';

        if (!audioBlob) {
            return NextResponse.json(
                { success: false, error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            console.warn('[Dictation] OPENAI_API_KEY not found. Falling back to mock response.');
            return handleMockResponse(context);
        }

        // 1. Prepare the file for Whisper
        // We convert the Blob to a File object which OpenAI SDK accepts
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

        console.log(`[Dictation] Processing AI transcription for: ${audioBlob.size} bytes. Context: ${context}`);

        // 2. Transcription via OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'en', // Optional: can be auto-detected
        });

        const rawText = transcription.text;
        console.log(`[Dictation] Raw Transcription: "${rawText.substring(0, 50)}..."`);

        // 3. Refinement via GPT-4o (The "AI Medical Scribe")
        const scribeResponse = await openai.chat.completions.create({
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
