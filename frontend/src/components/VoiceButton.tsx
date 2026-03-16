import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { voiceApi } from '../api/client.ts';
import { ParsedEntry } from '../types/index.ts';

interface VoiceButtonProps {
  onResult: (transcription: string, parsed: ParsedEntry[]) => void;
  onError?: (msg: string) => void;
}

type State = 'idle' | 'recording' | 'processing';

export function VoiceButton({ onResult, onError }: VoiceButtonProps) {
  const [state, setState] = useState<State>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
      ].find((m) => MediaRecorder.isTypeSupported(m)) || '';

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onError?.('Нет доступа к микрофону');
        return;
      }
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/mp4' });
        setState('processing');
        try {
          const { data } = await voiceApi.parseAudio(blob);
          const parsed: ParsedEntry[] = Array.isArray(data.parsed) ? data.parsed : [data.parsed];
          onResult(data.transcription, parsed);
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { error?: string } } };
          const serverMsg = axiosErr?.response?.data?.error;
          onError?.(serverMsg || 'Не удалось распознать голос. Попробуйте ещё раз.');
        } finally {
          setState('idle');
        }
      };

      mediaRecorder.start();
      setState('recording');

      maxTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 60000);
    } catch {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onError?.('Нет доступа к микрофону');
    }
  }, [onResult, onError]);

  const stopRecording = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => () => {
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const handleClick = useCallback(() => {
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  }, [state, startRecording, stopRecording]);

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  const buttonBg = isRecording
    ? 'linear-gradient(135deg, #e63930 0%, #f55a2e 100%)'
    : 'linear-gradient(135deg, #1eaa4f 0%, #22c55e 50%, #2dd96b 100%)';

  const buttonShadow = isRecording
    ? '0 0 0 0px rgba(255,69,58,0.4), 0 8px 32px rgba(255,69,58,0.30), 0 1px 0 rgba(255,255,255,0.22) inset'
    : '0 8px 32px rgba(34,197,94,0.28), 0 1px 0 rgba(255,255,255,0.22) inset';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <motion.button
        onClick={handleClick}
        disabled={isProcessing}
        animate={{
          scale: isRecording ? 1.04 : 1,
          boxShadow: buttonShadow,
          opacity: isProcessing ? 0.92 : 1,
        }}
        whileTap={{ scale: 0.94 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 24,
          mass: 0.8,
        }}
        style={{
          width: 76,
          height: 76,
          borderRadius: '50%',
          background: buttonBg,
          border: 'none',
          cursor: isProcessing ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {isRecording && <RecordingRipple />}
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ display: 'flex' }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={30} color="#fff" />
              </motion.div>
            </motion.div>
          ) : isRecording ? (
            <motion.div
              key="stop"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <MicOff size={30} color="#fff" />
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Mic size={30} color="#fff" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence mode="wait">
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            fontWeight: 400,
          }}
        >
          {state === 'idle' && 'Нажмите и скажите команду'}
          {state === 'recording' && 'Говорите… нажмите для остановки'}
          {state === 'processing' && 'Распознаём...'}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function RecordingRipple() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,100,80,0.45)',
            pointerEvents: 'none',
          }}
          animate={{ scale: [1, 1.9 + i * 0.2], opacity: [0.45, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.55,
            ease: [0.22, 0.61, 0.36, 1],
          }}
        />
      ))}
    </>
  );
}
