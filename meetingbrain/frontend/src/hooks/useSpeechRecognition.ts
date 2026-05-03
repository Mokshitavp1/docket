import { useState, useEffect, useRef, useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import toast from 'react-hot-toast';

interface SpeechRecognitionHook {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  confidence: number;
}

// ─── Browser SpeechRecognition type ──────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);

  const {
    appendTranscript,
    setInterimTranscript,
    liveTranscript,
    interimTranscript,
    clearTranscript,
  } = useMeetingStore();

  // ── Check support ──────────────────────────────────────────────────────────
  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // ── Initialize recognition ────────────────────────────────────────────────
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const conf = result[0].confidence;

        if (result.isFinal) {
          finalText += transcript;
          if (conf) setConfidence(Math.round(conf * 100));
        } else {
          interimText += transcript;
        }
      }

      if (finalText.trim()) {
        appendTranscript(finalText.trim());
      }

      if (interimText) {
        setInterimTranscript(interimText);
      }
    };

    recognition.onerror = (event: any) => {
      const errorMessages: Record<string, string> = {
        'no-speech': 'No speech detected. Still listening...',
        'audio-capture': 'Microphone not accessible.',
        'not-allowed': 'Microphone permission denied.',
        'network': 'Network error during transcription.',
        'aborted': 'Recognition was aborted.',
        'bad-grammar': 'Speech grammar error.',
        'language-not-supported': 'Language not supported.',
        'service-not-allowed': 'Speech service not allowed.',
      };

      const msg = errorMessages[event.error] || `Speech error: ${event.error}`;

      if (event.error === 'no-speech') {
        // Non-fatal — just log it
        console.warn(msg);
        return;
      }

      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
        setIsListening(false);
        toast.error('Microphone access denied.');
        return;
      }

      if (event.error === 'network') {
        // Try to restart on network errors
        console.warn('Network error — attempting restart...');
        return;
      }

      setError(msg);
    };

    recognition.onend = () => {
      // Auto-restart if we didn't intentionally stop
      if (!isStoppingRef.current && isListening) {
        restartTimeoutRef.current = setTimeout(() => {
          if (!isStoppingRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.warn('Failed to restart recognition:', e);
            }
          }
        }, 300);
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    return recognition;
  }, [isSupported, appendTranscript, setInterimTranscript, isListening]);

  // ── Start listening ────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error(
        'Speech recognition is not supported in your browser. Please use Chrome or Edge.'
      );
      return;
    }

    if (isListening) return;

    isStoppingRef.current = false;

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    try {
      recognitionRef.current?.start();
      setIsListening(true);
      setError(null);
      toast.success('🎙️ Recording started. Speak clearly into your microphone.');
    } catch (err) {
      console.error('Failed to start recognition:', err);
      // Re-initialize and try again
      recognitionRef.current = initRecognition();
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          toast.error('Failed to start speech recognition.');
        }
      }, 100);
    }
  }, [isSupported, isListening, initRecognition]);

  // ── Stop listening ─────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    isStoppingRef.current = true;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.warn('Error stopping recognition:', e);
    }

    setIsListening(false);
    setInterimTranscript('');
  }, [setInterimTranscript]);

  // ── Reset transcript ───────────────────────────────────────────────────────
  const resetTranscript = useCallback(() => {
    clearTranscript();
    setError(null);
    setConfidence(0);
  }, [clearTranscript]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // Ignore
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript: liveTranscript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    confidence,
  };
};

// ─── useMediaRecorder — captures audio blob for upload ───────────────────────
export const useMediaRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const isSupported =
    typeof window !== 'undefined' && 'MediaRecorder' in window;

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('MediaRecorder is not supported in your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Prefer webm/opus for browser compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setIsRecording(false);

        // Stop all tracks
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      recorder.onerror = (e) => {
        setError('Recording error occurred.');
        setIsRecording(false);
      };

      // Collect data every 10 seconds for smoother processing
      recorder.start(10000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setAudioBlob(null);
      setDuration(0);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      toast.success('🎙️ Audio recording started.');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied.');
        toast.error('Microphone access denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found.');
        toast.error('No microphone detected.');
      } else {
        setError('Failed to start recording.');
        toast.error('Failed to start audio recording.');
      }
    }
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      mediaRecorderRef.current?.stop();
    } catch (e) {
      console.warn('Error stopping media recorder:', e);
    }
  }, []);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    isRecording,
    isSupported,
    audioBlob,
    duration,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  };
};