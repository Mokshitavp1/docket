import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  AlertCircle,
  Volume2,
  Clock,
} from 'lucide-react';
import { useSpeechRecognition, useMediaRecorder } from '../../hooks/useSpeechRecognition';
import { useMeetingStore } from '../../store/meetingStore';
import Button from '../ui/Button';
import { clsx } from 'clsx';

interface MeetingRecorderProps {
  meetingId: string;
  onStop: (transcript: string, audioBlob: Blob | null) => void;
  isDisabled?: boolean;
}

export default function MeetingRecorder({
  meetingId,
  onStop,
  isDisabled = false,
}: MeetingRecorderProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isListening,
    isSupported: speechSupported,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    confidence,
  } = useSpeechRecognition();

  const {
    isRecording: isAudioRecording,
    audioBlob,
    duration: audioDuration,
    error: audioError,
    startRecording,
    stopRecording,
  } = useMediaRecorder();

  const { isRecording, setIsRecording } = useMeetingStore();

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // ── Format elapsed time ────────────────────────────────────────────────────
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Start recording ────────────────────────────────────────────────────────
  const handleStart = async () => {
    resetTranscript();
    setElapsed(0);
    setIsPaused(false);
    setIsRecording(true);
    startListening();
    await startRecording();
  };

  // ── Stop recording ─────────────────────────────────────────────────────────
  const handleStop = () => {
    stopListening();
    stopRecording();
    setIsRecording(false);
    setIsPaused(false);

    // Small delay to allow final transcript to come in
    setTimeout(() => {
      onStop(transcript, audioBlob);
    }, 800);
  };

  // ── Toggle pause ───────────────────────────────────────────────────────────
  const handleTogglePause = () => {
    if (isPaused) {
      startListening();
      setIsPaused(false);
    } else {
      stopListening();
      setIsPaused(true);
    }
  };

  // ── Audio level visualization ──────────────────────────────────────────────
  const AudioWave = () => (
    <div className="flex items-end gap-0.5 h-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'w-1 rounded-full transition-all',
            isListening && !isPaused
              ? 'bg-danger-400 animate-pulse'
              : 'bg-dark-600'
          )}
          style={{
            height: isListening && !isPaused
              ? `${Math.random() * 80 + 20}%`
              : '20%',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Main recorder card ── */}
      <div className={clsx(
        'card p-6 transition-all duration-300',
        isRecording && 'border-danger-500/40 bg-danger-900/5',
      )}>
        {/* Status header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isRecording ? (
              <>
                <span className="recording-dot" />
                <div>
                  <p className="text-sm font-semibold text-danger-400">
                    {isPaused ? 'Paused' : 'Recording'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isPaused
                      ? 'Microphone muted'
                      : 'Listening and transcribing...'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-dark-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-300">
                    Ready to Record
                  </p>
                  <p className="text-xs text-slate-500">
                    Click start to begin transcription
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className={clsx(
              'font-mono text-lg font-semibold tabular-nums',
              isRecording && !isPaused ? 'text-danger-400' : 'text-slate-400'
            )}>
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Audio wave */}
        <div className="flex items-center justify-center py-4 mb-4">
          <AudioWave />
        </div>

        {/* Confidence indicator */}
        {isRecording && confidence > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex-1 progress h-1.5">
              <div
                className="progress-bar bg-success-500"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 w-10 text-right">
              {confidence}%
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isRecording ? (
            <Button
              variant="danger"
              size="lg"
              onClick={handleStart}
              disabled={isDisabled || !speechSupported}
              leftIcon={<Mic className="w-5 h-5" />}
              className="px-8"
            >
              Start Recording
            </Button>
          ) : (
            <>
              {/* Pause/Resume */}
              <Button
                variant="secondary"
                onClick={handleTogglePause}
                leftIcon={
                  isPaused
                    ? <Play className="w-4 h-4" />
                    : <Pause className="w-4 h-4" />
                }
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>

              {/* Stop */}
              <Button
                variant="danger"
                onClick={handleStop}
                leftIcon={<Square className="w-4 h-4" />}
              >
                Stop & Process
              </Button>
            </>
          )}
        </div>

        {/* Browser support warning */}
        {!speechSupported && (
          <div className="mt-4 alert-warning">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs">
              Live transcription requires Chrome or Edge. Use the audio upload
              option instead.
            </p>
          </div>
        )}

        {/* Errors */}
        {(speechError || audioError) && (
          <div className="mt-4 alert-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs">{speechError || audioError}</p>
          </div>
        )}
      </div>

      {/* ── Live transcript preview ── */}
      {isRecording && (transcript || interimTranscript) && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-3.5 h-3.5 text-primary-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Live Transcript
            </p>
            <span className="ml-auto text-xs text-slate-500">
              {transcript.split(' ').filter(Boolean).length} words
            </span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
            {transcript && (
              <p className="text-slate-300 leading-relaxed">{transcript}</p>
            )}
            {interimTranscript && (
              <p className="text-slate-500 italic">{interimTranscript}...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}