import { Router } from 'express';
import {
  getMyTasks,
  getMeetingTasks,
  updateTask,
  confirmTasks,
  deleteTask,
  getTaskStats,
} from '../controllers/taskController';
import { authenticate, requireWorkspaceAdmin, requireMeetingHost } from '../middleware/auth';
import {
  updateTaskValidator,
  confirmTasksValidator,
} from '../utils/validators';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// ─── Personal task routes ─────────────────────────────────────────────────────
router.get('/my', getMyTasks);

// ─── Meeting task routes ──────────────────────────────────────────────────────
router.get('/meeting/:meetingId', getMeetingTasks);
router.post('/meeting/:meetingId/confirm', requireMeetingHost, confirmTasksValidator, confirmTasks);

// ─── Workspace task stats ─────────────────────────────────────────────────────
router.get('/stats/:workspaceId', getTaskStats);

// ─── Individual task routes ───────────────────────────────────────────────────
router.patch('/:taskId', updateTaskValidator, updateTask);
router.delete('/:taskId', deleteTask);

export default router;