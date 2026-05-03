import { Router } from 'express';
import {
  createMeeting,
  getWorkspaceMeetings,
  getMeeting,
  startMeeting,
  endMeeting,
  uploadAndTranscribe,
  confirmMeeting,
  deleteMeeting,
} from '../controllers/meetingController';
import {
  authenticate,
  requireWorkspaceMember,
  requireMeetingHost,
} from '../middleware/auth';
import {
  createMeetingValidator,
  updateMeetingValidator,
  transcriptValidator,
} from '../utils/validators';
import { uploadAudio } from '../middleware/upload';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

// ─── Meeting CRUD ─────────────────────────────────────────────────────────────
router.post('/', createMeetingValidator, createMeeting);
router.get('/workspace/:workspaceId', requireWorkspaceMember, getWorkspaceMeetings);
router.get('/:meetingId', getMeeting);
router.delete('/:meetingId', requireMeetingHost, deleteMeeting);

// ─── Meeting lifecycle ────────────────────────────────────────────────────────
router.post('/:meetingId/start', requireMeetingHost, startMeeting);
router.post('/:meetingId/end', requireMeetingHost, updateMeetingValidator, endMeeting);
router.post('/:meetingId/confirm', requireMeetingHost, confirmMeeting);

// ─── Audio upload & transcription ─────────────────────────────────────────────
router.post(
  '/:meetingId/upload',
  requireMeetingHost,
  uploadAudio.single('audio'),
  uploadAndTranscribe
);

export default router;