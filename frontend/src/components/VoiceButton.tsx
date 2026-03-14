import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { voiceApi } from '../api/client.ts';
import { ParsedEntry } from '../types/index.ts';

interface VoiceButtonProps {
  onResult: (transcription: string, parsed: ParsedEntry) => void;
  onError?: (msg: string) => void;
}

type State = 'idle' | 'recording' | 'processing';

export function VoiceButton({ onResult, onError }: VoiceButtonProps) {
  const [state, setState] = useState<State>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick best supported mimeType — try webm first (Chrome), fall back to mp4 (iOS Safari)
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
      ].find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
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
          onResult(data.transcription, data.parsed);
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { error?: string } } };
          const serverMsg = axiosErr?.response?.data?.error;
          onError?.(serverMsg ? `${serverMsg} [${blob.type || 'no-type'}]` : 'Не удалось распознать голос');
        } finally {
          setState('idle');
        }
      };

      mediaRecorder.start();
      setState('recording');
    } catch {
      onError?.('Нет доступа к микрофону');
    }
  }, [onResult, onError]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handlePress = () => {
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <motion.button
        onPointerDown={state === 'idle' ? startRecording : undefined}
        onPointerUp={state === 'recording' ? stopRecording : undefined}
        onClick={state === 'processing' ? undefined : handlePress}
        disabled={isProcessing}
        animate={{
          scale: isRecording ? 1.05 : 1,
          boxShadow: isRecording
            ? '0 0 0 0px rgba(108,99,255,0.6), 0 0 40px rgba(108,99,255,0.4)'
            : '0 0 0 0px rgba(108,99,255,0)',
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: isRecording
            ? 'linear-gradient(135deg, #ef4444, #f97316)'
            : 'linear-gradient(135deg, #6c63ff, #a78bfa)',
          border: 'none',
          cursor: isProcessing ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
            >
              <Loader2 size={32} color="#fff" />
            </motion.div>
          ) : isRecording ? (
            <motion.div key="stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <MicOff size={32} color="#fff" />
            </motion.div>
          ) : (
            <motion.div key="mic" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Mic size={32} color="#fff" />
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording && <RecordingRipple />}
      </motion.button>

      <AnimatePresence mode="wait">
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          style={{ fontSize: '13px', color: 'rgba(240,240,245,0.5)', textAlign: 'center' }}
        >
          {state === 'idle' && 'Нажмите и скажите команду'}
          {state === 'recording' && 'Говорите... отпустите для остановки'}
          {state === 'processing' && 'Распознаём...'}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function RecordingRipple() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.4)',
          }}
          animate={{ scale: [1, 1.8 + i * 0.3], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}
