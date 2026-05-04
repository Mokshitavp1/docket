import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileAudio,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Button from '../ui/Button';
import { clsx } from 'clsx';

interface UploadRecordingProps {
  meetingId: string;
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<void>;
  isLoading?: boolean;
}

const ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/mp4',
  'audio/m4a',
  'audio/ogg',
  'audio/webm',
  'video/webm',
  'audio/flac',
];

const MAX_SIZE_MB = 500;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function UploadRecording({
  meetingId,
  onUpload,
  isLoading = false,
}: UploadRecordingProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const validateFile = (f: File): boolean => {
    setFileError('');

    if (f.size > MAX_SIZE_BYTES) {
      setFileError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return false;
    }

    const ext = f.name.split('.').pop()?.toLowerCase();
    const validExts = ['mp3', 'wav', 'mp4', 'm4a', 'ogg', 'webm', 'flac'];

    if (!ACCEPTED_TYPES.includes(f.type) && !validExts.includes(ext || '')) {
      setFileError(
        'Unsupported file format. Please use MP3, WAV, MP4, M4A, OGG, WebM, or FLAC.'
      );
      return false;
    }

    return true;
  };

  const handleFileSelect = (f: File) => {
    if (validateFile(f)) {
      setFile(f);
      setProgress(0);
    }
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await onUpload(file, (p) => setProgress(p));
    } catch {
      // Error handled by parent
    }
  };

  const handleRemove = () => {
    setFile(null);
    setProgress(0);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* ── Drop zone ── */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-10 text-center',
            'cursor-pointer transition-all duration-200',
            isDragging
              ? 'border-primary-500 bg-primary-900/20'
              : 'border-dark-600 hover:border-dark-500 hover:bg-dark-700/30'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div className={clsx(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
              isDragging ? 'bg-primary-600/20' : 'bg-dark-700'
            )}>
              <Upload
                className={clsx(
                  'w-7 h-7 transition-colors',
                  isDragging ? 'text-primary-400' : 'text-slate-500'
                )}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                {isDragging ? 'Drop your file here' : 'Upload Meeting Recording'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Drag & drop or click to browse
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 mt-1">
              {['MP3', 'WAV', 'MP4', 'M4A', 'WebM', 'OGG', 'FLAC'].map((fmt) => (
                <span key={fmt} className="badge-ghost text-2xs">
                  {fmt}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Maximum file size: {MAX_SIZE_MB}MB
            </p>
          </div>
        </div>
      ) : (
        // ── File preview ──
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-900/30 border border-primary-800/30
                            flex items-center justify-center flex-shrink-0">
              <FileAudio className="w-5 h-5 text-primary-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">
                {file.name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatSize(file.size)}
              </p>
            </div>

            {!isLoading && (
              <button
                onClick={handleRemove}
                className="btn-icon text-slate-400 hover:text-slate-100 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          {isLoading && progress > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="progress h-1.5">
                <div
                  className="progress-bar bg-primary-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Transcribing indicator */}
          {isLoading && progress === 100 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
              <span>Transcribing audio with AI...</span>
            </div>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {fileError && (
        <div className="alert-danger">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">{fileError}</p>
        </div>
      )}

      {/* ── Info ── */}
      <div className="alert-info">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-primary-400" />
        <div className="text-xs text-primary-300 space-y-1">
          <p className="font-medium">How this works:</p>
          <p>
            Your audio will be transcribed using OpenAI Whisper, then Claude AI
            will extract tasks, deadlines, assignees, and generate minutes of
            meeting.
          </p>
        </div>
      </div>

      {/* ── Upload button ── */}
      {file && !isLoading && (
        <Button
          variant="primary"
          onClick={handleUpload}
          className="w-full"
          leftIcon={<Upload className="w-4 h-4" />}
        >
          Transcribe & Process
        </Button>
      )}
    </div>
  );
}