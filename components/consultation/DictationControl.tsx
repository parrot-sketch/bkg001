'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DictationControlProps {
    onTranscription: (text: string) => void;
    context?: string;
    disabled?: boolean;
}

/**
 * DictationControl Component
 * 
 * Provides a UI and logic for recording audio, sending it to the STT API,
 * and returning the transcribed text to the parent.
 */
export function DictationControl({
    onTranscription,
    context = 'default',
    disabled = false
}: DictationControlProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUnavailable, setIsUnavailable] = useState(false);
    const [unavailableReason, setUnavailableReason] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Clean up timer on unmount and check availability
    useEffect(() => {
        const checkAvailability = async () => {
            try {
                const response = await fetch('/api/clinical/dictation');
                const data = await response.json();
                if (!data.available) {
                    setIsUnavailable(true);
                    setUnavailableReason(data.message || 'AI Service Not Configured');
                }
            } catch (err) {
                console.error('Failed to check AI availability:', err);
            }
        };

        checkAvailability();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await handleTranscription(audioBlob);

                // Stop all tracks to release the microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            toast.info('Listening...', { icon: <Mic className="h-4 w-4 animate-pulse text-indigo-500" /> });
        } catch (err) {
            console.error('Failed to start recording:', err);
            toast.error('Microphone access denied or unavailable');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleTranscription = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'record.webm');
            formData.append('context', context);

            const response = await fetch('/api/clinical/dictation', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.status === 401 || response.status === 429) {
                setIsUnavailable(true);
                setUnavailableReason(result.error || 'AI Service Unavailable');
                toast.error(result.error || 'AI Service Unavailable');
                return;
            }

            if (result.success && result.text) {
                onTranscription(result.text);
                toast.success('Dictation transcribed');
            } else {
                throw new Error(result.error || 'Transcription failed');
            }
        } catch (err: any) {
            console.error('Transcription error:', err);
            toast.error(err.message || 'Failed to process audio');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
                {isRecording ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 px-2 py-1 bg-red-50 text-red-600 rounded-lg border border-red-100"
                    >
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[11px] font-bold tabular-nums">{formatTime(recordingTime)}</span>
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="p-1 hover:bg-red-100 rounded-md transition-colors"
                            title="Stop Recording"
                        >
                            <Square className="h-3.5 w-3.5 fill-current" />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-1"
                    >
                        <button
                            type="button"
                            onClick={startRecording}
                            disabled={isProcessing || disabled || isUnavailable}
                            title={isUnavailable ? (unavailableReason || 'AI Service Unavailable') : undefined}
                            className={cn(
                                "inline-flex items-center justify-center h-8 px-2.5 rounded-lg transition-all gap-1.5",
                                "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[12px]",
                                isUnavailable && "bg-slate-100 text-slate-400 cursor-not-allowed opacity-70 border-slate-200",
                                isProcessing && "bg-amber-50 text-amber-700 animate-pulse border-amber-100",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isProcessing ? (
                                <Wand2 className="h-3.5 w-3.5 animate-pulse" />
                            ) : (
                                <Mic className="h-3.5 w-3.5" />
                            )}
                            {isProcessing ? 'AI Processing...' : isUnavailable ? 'Service Disabled' : 'Dictate'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
