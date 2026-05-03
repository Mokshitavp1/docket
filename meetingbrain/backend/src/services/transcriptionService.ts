import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { logger } from '../index';
import { AppError } from '../middleware/errorHandler';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Max file size Whisper accepts: 25MB
const MAX_WHISPER_SIZE = 25 * 1024 * 1024;

// ─── Transcribe audio file using OpenAI Whisper ───────────────────────────────
export const transcribeAudio = async (filePath: string): Promise<string> => {
  logger.info(`Starting transcription for: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new AppError('Audio file not found.', 404);
  }

  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;

  if (fileSizeInBytes === 0) {
    throw new AppError('Audio file is empty.', 400);
  }

  try {
    // If file is under 25MB, transcribe directly
    if (fileSizeInBytes <= MAX_WHISPER_SIZE) {
      return await transcribeFile(filePath);
    }

    // For larger files, chunk and transcribe
    logger.info(`File too large (${(fileSizeInBytes / 1024 / 1024).toFixed(1)}MB), chunking...`);
    return await transcribeLargeFile(filePath);
  } catch (error: any) {
    logger.error('Transcription error:', error);

    if (error?.status === 400) {
      throw new AppError('Invalid audio file format. Please use MP3, WAV, MP4, or WebM.', 400);
    }

    if (error?.status === 429) {
      throw new AppError('Transcription service is busy. Please try again in a moment.', 429);
    }

    throw new AppError(
      'Transcription failed. Please check your audio file and try again.',
      500
    );
  }
};

// ─── Transcribe a single file directly ───────────────────────────────────────
const transcribeFile = async (filePath: string): Promise<string> => {
  const fileStream = fs.createReadStream(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');

  // Map extension to supported format
  const formatMap: Record<string, string> = {
    webm: 'webm',
    mp3: 'mp3',
    wav: 'wav',
    mp4: 'mp4',
    m4a: 'm4a',
    ogg: 'ogg',
    flac: 'flac',
  };

  const format = formatMap[ext] || 'webm';

  const transcription = await openai.audio.transcriptions.create({
    file: fileStream as any,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
    language: 'en',
  });

  // Format with timestamps for better context
  if (transcription.segments && transcription.segments.length > 0) {
    return transcription.segments
      .map((seg: any) => {
        const start = formatTimestamp(seg.start);
        return `[${start}] ${seg.text.trim()}`;
      })
      .join('\n');
  }

  return transcription.text;
};

// ─── Handle large files by splitting into chunks ──────────────────────────────
const transcribeLargeFile = async (filePath: string): Promise<string> => {
  // Read file in chunks and transcribe each
  // For simplicity, we'll just take the first 25MB if it's too large
  // In production you'd use ffmpeg to split properly
  const tempPath = filePath + '_chunk.webm';

  try {
    const readStream = fs.createReadStream(filePath, {
      start: 0,
      end: MAX_WHISPER_SIZE - 1,
    });

    const writeStream = fs.createWriteStream(tempPath);

    await new Promise<void>((resolve, reject) => {
      readStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const transcript = await transcribeFile(tempPath);

    // Clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    return transcript + '\n[Note: Transcript may be incomplete due to file size limits]';
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
};

// ─── Format seconds to MM:SS ──────────────────────────────────────────────────
const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// ─── Transcribe audio from buffer (live chunks) ───────────────────────────────
export const transcribeBuffer = async (
  buffer: Buffer,
  mimeType: string = 'audio/webm'
): Promise<string> => {
  try {
    // Create a temporary file from buffer
    const tempPath = path.join(
      process.cwd(),
      'uploads',
      'temp',
      `chunk-${Date.now()}.webm`
    );

    fs.writeFileSync(tempPath, buffer);

    try {
      const transcript = await transcribeFile(tempPath);
      return transcript;
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  } catch (error) {
    logger.error('Buffer transcription error:', error);
    throw new AppError('Failed to transcribe audio chunk.', 500);
  }
};

// ─── Validate audio file before processing ───────────────────────────────────
export const validateAudioFile = (filePath: string): boolean => {
  const validExtensions = ['.mp3', '.wav', '.mp4', '.m4a', '.ogg', '.webm', '.flac'];
  const ext = path.extname(filePath).toLowerCase();
  return validExtensions.includes(ext);
};