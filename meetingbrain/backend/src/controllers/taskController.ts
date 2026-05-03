import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { sendTaskAssignmentEmail } from '../services/emailService';
import { createNotification } from '../services/reminderService';
import { addTaskToCalendar } from '../services/calendarService';

// ─── Get my tasks ─────────────────────────────────────────────────────────────
export const getMyTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { status, priority } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        ...(status && { status: status as TaskStatus }),
        ...(priority && { priority: priority as TaskPriority }),
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            workspace: { select: { id: true, name: true } },
          },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { deadline: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Group by status
    const grouped = {
      pending: tasks.filter((t) => t.status === 'PENDING'),
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS'),
      completed: tasks.filter((t) => t.status === 'COMPLETED'),
      cancelled: tasks.filter((t) => t.status === 'CANCELLED'),
    };

    res.status(200).json({ tasks, grouped });
  } catch (error) {
    next(error);
  }
};

// ─── Get tasks for a meeting ──────────────────────────────────────────────────
export const getMeetingTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { meetingId } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        workspace: {
          include: {
            members: { where: { userId } },
          },
        },
      },
    });

    if (!meeting) throw new AppError('Meeting not found.', 404);

    const isAdminOrHost =
      meeting.hostId === userId ||
      meeting.workspace.ownerId === userId ||
      meeting.workspace.members.some((m) => m.role === 'ADMIN');

    const tasks = await prisma.task.findMany({
      where: {
        meetingId,
        ...(!isAdminOrHost && { assigneeId: userId }),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({ tasks, isAdminOrHost });
  } catch (error) {
    next(error);
  }
};

// ─── Update task ──────────────────────────────────────────────────────────────
export const updateTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { taskId } = req.params;
    const { title, description, assigneeId, deadline, priority, status } = req.body;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        meeting: {
          include: {
            workspace: {
              include: { members: { where: { userId } } },
            },
          },
        },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existingTask) throw new AppError('Task not found.', 404);

    // Check permission: admin/host can edit all fields; assignee can only update status
    const isAdminOrHost =
      existingTask.meeting.hostId === userId ||
      existingTask.meeting.workspace.ownerId === userId ||
      existingTask.meeting.workspace.members.some((m) => m.role === 'ADMIN');

    const isAssignee = existingTask.assigneeId === userId;

    if (!isAdminOrHost && !isAssignee) {
      throw new AppError('You do not have permission to update this task.', 403);
    }

    // Non-admins can only update status
    const updateData = isAdminOrHost
      ? {
          ...(title && { title }),
          ...(description && { description }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
          ...(priority && { priority: priority as TaskPriority }),
          ...(status && { status: status as TaskStatus }),
        }
      : {
          ...(status && { status: status as TaskStatus }),
        };

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        meeting: {
          select: { id: true, title: true },
        },
      },
    });

    // If assignee changed, send notification + email
    if (
      isAdminOrHost &&
      assigneeId &&
      assigneeId !== existingTask.assigneeId
    ) {
      const newAssignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true, name: true, email: true },
      });

      if (newAssignee) {
        await sendTaskAssignmentEmail(
          newAssignee.email,
          newAssignee.name,
          updatedTask.title,
          updatedTask.description,
          updatedTask.deadline,
          updatedTask.meeting.title
        );

        await createNotification(
          newAssignee.id,
          'New Task Assigned',
          `You have been assigned: "${updatedTask.title}"`,
          'TASK_ASSIGNED',
          `/tasks`
        );
      }
    }

    res.status(200).json({
      message: 'Task updated successfully.',
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Confirm tasks (bulk confirm after AI generation) ─────────────────────────
export const confirmTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { meetingId } = req.params;
    const { tasks: taskUpdates } = req.body;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, title: true, status: true },
    });

    if (!meeting) throw new AppError('Meeting not found.', 404);

    const confirmedTasks = [];

    for (const taskUpdate of taskUpdates) {
      const task = await prisma.task.update({
        where: { id: taskUpdate.id },
        data: {
          title: taskUpdate.title,
          description: taskUpdate.description,
          assigneeId: taskUpdate.assigneeId || null,
          deadline: taskUpdate.deadline ? new Date(taskUpdate.deadline) : null,
          priority: taskUpdate.priority || 'MEDIUM',
          confirmedAt: new Date(),
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      confirmedTasks.push(task);

      // Send emails and notifications to assignees
      if (task.assignee) {
        await sendTaskAssignmentEmail(
          task.assignee.email,
          task.assignee.name,
          task.title,
          task.description,
          task.deadline,
          meeting.title
        );

        await createNotification(
          task.assignee.id,
          'Task Assigned',
          `You have been assigned: "${task.title}"`,
          'TASK_ASSIGNED',
          `/tasks`
        );

        // Add to Google Calendar if assignee has token
        const assigneeUser = await prisma.user.findUnique({
          where: { id: task.assignee.id },
          select: { googleCalendarToken: true },
        });

        if (assigneeUser?.googleCalendarToken && task.deadline) {
          await addTaskToCalendar(
            assigneeUser.googleCalendarToken,
            task.title,
            task.description,
            task.deadline
          );
        }
      }
    }

    res.status(200).json({
      message: 'Tasks confirmed and notifications sent.',
      tasks: confirmedTasks,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete task ──────────────────────────────────────────────────────────────
export const deleteTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) throw new AppError('Task not found.', 404);

    await prisma.task.delete({ where: { id: taskId } });

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── Get task stats for workspace ─────────────────────────────────────────────
export const getTaskStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { workspaceId } = req.params;

    const tasks = await prisma.task.findMany({
      where: {
        meeting: { workspaceId },
      },
      select: {
        status: true,
        priority: true,
        deadline: true,
        assigneeId: true,
      },
    });

    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'PENDING').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
      cancelled: tasks.filter((t) => t.status === 'CANCELLED').length,
      overdue: tasks.filter(
        (t) =>
          t.deadline &&
          new Date(t.deadline) < new Date() &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED'
      ).length,
      urgent: tasks.filter((t) => t.priority === 'URGENT').length,
    };

    res.status(200).json({ stats });
  } catch (error) {
    next(error);
  }
};