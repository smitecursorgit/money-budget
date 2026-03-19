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

  const btnSize = 80;
  const ringSize = 112;
  const ringHalf = ringSize / 2;
  const innerRingSize = ringSize - 12;

  const primaryRingGradient = isRecording
    ? 'conic-gradient(from 0deg, rgba(239,83,80,0.95) 0deg, rgba(255,180,180,0.35) 72deg, rgba(239,83,80,0.12) 140deg, rgba(255,255,255,0.22) 220deg, rgba(239,83,80,0.45) 300deg, rgba(239,83,80,0.95) 360deg)'
    : 'conic-gradient(from 0deg, rgba(102,187,106,0.9) 0deg, rgba(180,230,185,0.4) 80deg, rgba(102,187,106,0.1) 150deg, rgba(255,255,255,0.2) 230deg, rgba(120,200,125,0.5) 310deg, rgba(102,187,106,0.9) 360deg)';

  const secondaryRingGradient = isRecording
    ? 'conic-gradient(from 180deg, transparent 0deg, rgba(239,83,80,0.5) 90deg, rgba(255,255,255,0.12) 180deg, rgba(239,83,80,0.35) 270deg, transparent 360deg)'
    : 'conic-gradient(from 180deg, transparent 0deg, rgba(102,187,106,0.45) 100deg, rgba(255,255,255,0.14) 200deg, rgba(102,187,106,0.35) 300deg, transparent 360deg)';

  const rotatePrimarySec = isProcessing ? 32 : isRecording ? 7.2 : 26;
  const rotateSecondarySec = isProcessing ? 40 : isRecording ? 9.5 : 34;

  /** Кольцо: прозрачное ядро, видимый только периметр (под ширину кнопки) */
  const donutMask = {
    WebkitMaskImage: 'radial-gradient(circle, transparent 69%, rgba(0,0,0,0.98) 71.5%)',
    maskImage: 'radial-gradient(circle, transparent 69%, rgba(0,0,0,0.98) 71.5%)',
    WebkitMaskRepeat: 'no-repeat' as const,
    maskRepeat: 'no-repeat' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div
        style={{
          position: 'relative',
          width: 124,
          height: 124,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Мягкое «дыхание» свечения */}
        <motion.div
          style={{
            position: 'absolute',
            width: 116,
            height: 116,
            left: '50%',
            top: '50%',
            marginLeft: -58,
            marginTop: -58,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: isRecording
              ? 'radial-gradient(circle, rgba(239,83,80,0.26) 0%, rgba(239,83,80,0.05) 48%, transparent 70%)'
              : 'radial-gradient(circle, rgba(102,187,106,0.24) 0%, rgba(102,187,106,0.06) 45%, transparent 68%)',
            filter: 'blur(3px)',
          }}
          animate={{
            scale: [1, 1.07, 1],
            opacity: isProcessing ? [0.5, 0.68, 0.5] : [0.72, 0.95, 0.72],
          }}
          transition={{
            duration: isRecording ? 3.4 : 5.2,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Внешнее кольцо — медленный оборот */}
        <motion.div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -ringHalf,
            marginTop: -ringHalf,
            width: ringSize,
            height: ringSize,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: primaryRingGradient,
            opacity: isProcessing ? 0.55 : 0.92,
            ...donutMask,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: rotatePrimarySec,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Внутреннее кольцо — в обратную сторону, другой ритм */}
        <motion.div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -innerRingSize / 2,
            marginTop: -innerRingSize / 2,
            width: innerRingSize,
            height: innerRingSize,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: secondaryRingGradient,
            opacity: isProcessing ? 0.35 : 0.65,
            ...donutMask,
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: rotateSecondarySec,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Лёгкий орбитальный блик */}
        <motion.div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -ringHalf,
            marginTop: -ringHalf,
            width: ringSize,
            height: ringSize,
            borderRadius: '50%',
            pointerEvents: 'none',
            border: isRecording ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: isRecording
              ? 'inset 0 0 20px rgba(239,83,80,0.12)'
              : 'inset 0 0 18px rgba(102,187,106,0.1)',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: rotatePrimarySec * 1.45,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <motion.button
          className="voice-btn"
          onClick={handleClick}
          disabled={isProcessing}
          animate={{
            scale: isRecording ? 1.025 : 1,
            opacity: isProcessing ? 0.88 : 1,
          }}
          whileHover={!isProcessing ? { scale: 1.04, boxShadow: '0 10px 36px rgba(102,187,106,0.42)' } : undefined}
          whileTap={!isProcessing ? { scale: 0.96 } : undefined}
          transition={{ type: 'spring', stiffness: 200, damping: 26, mass: 0.95 }}
          style={{
            position: 'relative',
            width: btnSize,
            height: btnSize,
            borderRadius: '50%',
            background: isRecording ? '#ef5350' : 'var(--income)',
            border: 'none',
            cursor: isProcessing ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
            boxShadow: isRecording
              ? '0 8px 32px rgba(239,83,80,0.38)'
              : '0 8px 32px rgba(102,187,106,0.33)',
            zIndex: 1,
          }}
        >
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.42, ease: [0.33, 0, 0.2, 1] }}
                style={{ display: 'flex' }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.45, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 size={32} color={isRecording ? '#fff' : '#1a2e1b'} />
                </motion.div>
              </motion.div>
            ) : isRecording ? (
              <motion.div
                key="stop"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.38, ease: [0.33, 0, 0.2, 1] }}
              >
                <MicOff size={32} color="#fff" />
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.38, ease: [0.33, 0, 0.2, 1] }}
              >
                <Mic size={32} color="#1a2e1b" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {(state === 'recording' || state === 'processing') && (
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
            {state === 'recording' && 'Говорите… нажмите для остановки'}
            {state === 'processing' && 'Распознаём...'}
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  );
}
