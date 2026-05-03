import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from './errorHandler';

// ─── Ensure upload directories exist ─────────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const AUDIO_DIR = path.join(UPLOAD_DIR, 'audio');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

[UPLOAD_DIR, AUDIO_DIR, TEMP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─── Allowed audio MIME types ─────────────────────────────────────────────────
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
  'video/webm',  // Browser MediaRecorder often outputs this
  'audio/flac',
];

const ALLOWED_AUDIO_EXTENSIONS = [
  '.mp3', '.wav', '.mp4', '.m4a',
  '.ogg', '.webm', '.flac',
];

// ─── Max file sizes ───────────────────────────────────────────────────────────
const MAX_AUDIO_SIZE = 500 * 1024 * 1024; // 500 MB

// ─── Disk storage for audio files ────────────────────────────────────────────
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AUDIO_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.webm';
    cb(null, `meeting-${uniqueSuffix}${ext}`);
  },
});

// ─── Memory storage for small payloads ───────────────────────────────────────
const memoryStorage = multer.memoryStorage();

// ─── Audio file filter ────────────────────────────────────────────────────────
const audioFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeAllowed = ALLOWED_AUDIO_TYPES.includes(file.mimetype);
  const isExtAllowed = ALLOWED_AUDIO_EXTENSIONS.includes(ext);

  // Allow if either mime or extension matches (browsers sometimes send wrong mime)
  if (isMimeAllowed || isExtAllowed) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type. Allowed formats: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`,
        400
      )
    );
  }
};

// ─── Multer instances ─────────────────────────────────────────────────────────

// For uploading meeting audio recordings (to disk)
export const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: MAX_AUDIO_SIZE,
    files: 1,
  },
});

// For uploading audio chunks in memory (live recording chunks)
export const uploadAudioChunk = multer({
  storage: memoryStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per chunk
    files: 1,
  },
});

// ─── File cleanup utility ─────────────────────────────────────────────────────
export const deleteFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Non-fatal — log but don't throw
    console.error(`Failed to delete file at ${filePath}:`, error);
  }
};

// ─── Get full path for a stored audio file ────────────────────────────────────
export const getAudioFilePath = (filename: string): string => {
  return path.join(AUDIO_DIR, filename);
};

// ─── Get public URL for an audio file ─────────────────────────────────────────
export const getAudioFileUrl = (filename: string): string => {
  return `/uploads/audio/${filename}`;
};

// ─── Serve uploads as static files (call in index.ts if needed) ───────────────
export const UPLOADS_STATIC_PATH = UPLOAD_DIR;