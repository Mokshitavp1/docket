import { Router } from 'express';
import {
  getAuthUrl,
  handleCallback,
  getCalendarStatus,
  getEvents,
  addTaskEvent,
  disconnectCalendar,
} from '../controllers/calendarController';
import { authenticate } from '../middleware/auth';

const router = Router();

// ─── OAuth callback (no auth required — comes from Google redirect) ───────────
router.get('/callback', handleCallback);

// ─── All other calendar routes require authentication ─────────────────────────
router.use(authenticate);

router.get('/auth-url', getAuthUrl);
router.get('/status', getCalendarStatus);
router.get('/events', getEvents);
router.post('/tasks/:taskId/add', addTaskEvent);
router.delete('/disconnect', disconnectCalendar);

export default router;