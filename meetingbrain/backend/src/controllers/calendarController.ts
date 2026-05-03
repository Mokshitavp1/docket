import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../index';
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getUpcomingEvents,
  revokeCalendarAccess,
  addTaskToCalendar,
} from '../services/calendarService';

// ─── Get Google OAuth URL ─────────────────────────────────────────────────────
export const getAuthUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new AppError('Google Calendar integration is not configured.', 503);
    }

    const url = getGoogleAuthUrl(userId);
    res.status(200).json({ url });
  } catch (error) {
    next(error);
  }
};

// ─── Handle OAuth callback ────────────────────────────────────────────────────
export const handleCallback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, state: userId, error } = req.query;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
      return res.redirect(
        `${frontendUrl}/settings?calendar=error&message=${encodeURIComponent('Calendar access denied.')}`
      ) as any;
    }

    if (!code || !userId) {
      return res.redirect(
        `${frontendUrl}/settings?calendar=error&message=${encodeURIComponent('Invalid callback parameters.')}`
      ) as any;
    }

    await exchangeCodeForTokens(code as string, userId as string);

    res.redirect(`${frontendUrl}/settings?calendar=success`);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(
      `${frontendUrl}/settings?calendar=error&message=${encodeURIComponent('Failed to connect calendar.')}`
    );
  }
};

// ─── Get calendar status ──────────────────────────────────────────────────────
export const getCalendarStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarToken: true },
    });

    const isConnected = !!user?.googleCalendarToken;

    res.status(200).json({ isConnected });
  } catch (error) {
    next(error);
  }
};

// ─── Get upcoming calendar events ─────────────────────────────────────────────
export const getEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarToken: true },
    });

    if (!user?.googleCalendarToken) {
      throw new AppError('Google Calendar is not connected.', 400);
    }

    const maxResults = parseInt(req.query.maxResults as string) || 10;
    const events = await getUpcomingEvents(user.googleCalendarToken, maxResults);

    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
};

// ─── Manually add a task to calendar ─────────────────────────────────────────
export const addTaskEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { taskId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarToken: true },
    });

    if (!user?.googleCalendarToken) {
      throw new AppError('Google Calendar is not connected. Please connect first.', 400);
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        deadline: true,
        assigneeId: true,
        calendarEventId: true,
      },
    });

    if (!task) throw new AppError('Task not found.', 404);
    if (task.assigneeId !== userId) {
      throw new AppError('You can only add your own tasks to your calendar.', 403);
    }
    if (!task.deadline) {
      throw new AppError('Task has no deadline to add to calendar.', 400);
    }
    if (task.calendarEventId) {
      throw new AppError('Task is already in your calendar.', 409);
    }

    const eventId = await addTaskToCalendar(
      user.googleCalendarToken,
      task.title,
      task.description,
      task.deadline
    );

    if (eventId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { calendarEventId: eventId },
      });
    }

    res.status(200).json({
      message: 'Task added to Google Calendar.',
      eventId,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Disconnect Google Calendar ───────────────────────────────────────────────
export const disconnectCalendar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    await revokeCalendarAccess(userId);

    res.status(200).json({ message: 'Google Calendar disconnected successfully.' });
  } catch (error) {
    next(error);
  }
};