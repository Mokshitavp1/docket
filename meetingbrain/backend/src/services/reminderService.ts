import cron from 'node-cron';
import { prisma } from '../index';
import { logger } from '../index';
import { sendTaskReminderEmail } from './emailService';
import { NotificationType } from '@prisma/client';

// ─── Create in-app notification ───────────────────────────────────────────────
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  link?: string
): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link: link || null,
      },
    });
  } catch (error) {
    logger.error('Failed to create notification:', error);
  }
};

// ─── Send reminders for tasks due soon ───────────────────────────────────────
const sendUpcomingDeadlineReminders = async (): Promise<void> => {
  try {
    const now = new Date();

    // Find tasks due within 25 hours that haven't had a reminder sent
    const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcomingTasks = await prisma.task.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        deadline: {
          gte: now,
          lte: twentyFiveHoursFromNow,
        },
        reminderSentAt: null,
        assigneeId: { not: null },
        confirmedAt: { not: null },
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logger.info(`Found ${upcomingTasks.length} tasks needing upcoming reminders`);

    for (const task of upcomingTasks) {
      if (!task.assignee || !task.deadline) continue;

      const hoursUntilDeadline =
        (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60);

      // Send email reminder
      await sendTaskReminderEmail(
        task.assignee.email,
        task.assignee.name,
        task.title,
        task.deadline,
        hoursUntilDeadline
      );

      // Send in-app notification
      await createNotification(
        task.assignee.id,
        'Task Due Soon',
        `"${task.title}" is due in ${Math.round(hoursUntilDeadline)} hours`,
        NotificationType.TASK_REMINDER,
        '/tasks'
      );

      // Mark reminder as sent
      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSentAt: now },
      });

      logger.info(`Reminder sent for task: ${task.id} to ${task.assignee.email}`);
    }
  } catch (error) {
    logger.error('Error sending upcoming deadline reminders:', error);
  }
};

// ─── Send reminders for overdue tasks ────────────────────────────────────────
const sendOverdueReminders = async (): Promise<void> => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find tasks overdue by less than 24 hours (first overdue notification)
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        deadline: {
          gte: oneDayAgo,
          lt: now,
        },
        assigneeId: { not: null },
        confirmedAt: { not: null },
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    for (const task of overdueTasks) {
      if (!task.assignee || !task.deadline) continue;

      // Check if overdue notification already sent today
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: task.assignee.id,
          message: { contains: task.title },
          type: NotificationType.TASK_REMINDER,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (existingNotification) continue;

      const hoursOverdue =
        (now.getTime() - new Date(task.deadline).getTime()) / (1000 * 60 * 60);

      await sendTaskReminderEmail(
        task.assignee.email,
        task.assignee.name,
        task.title,
        task.deadline,
        -hoursOverdue
      );

      await createNotification(
        task.assignee.id,
        '⚠️ Task Overdue',
        `"${task.title}" is overdue by ${Math.round(hoursOverdue)} hours`,
        NotificationType.TASK_REMINDER,
        '/tasks'
      );

      logger.info(`Overdue reminder sent for task: ${task.id}`);
    }
  } catch (error) {
    logger.error('Error sending overdue reminders:', error);
  }
};

// ─── Send daily digest to admins ─────────────────────────────────────────────
const sendDailyDigest = async (): Promise<void> => {
  try {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Get all workspaces
    const workspaces = await prisma.workspace.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          where: { role: 'ADMIN' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    for (const workspace of workspaces) {
      // Get tasks due today
      const tasksDueToday = await prisma.task.count({
        where: {
          meeting: { workspaceId: workspace.id },
          deadline: { gte: startOfToday, lte: endOfToday },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });

      // Get overdue tasks
      const overdueCount = await prisma.task.count({
        where: {
          meeting: { workspaceId: workspace.id },
          deadline: { lt: startOfToday },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });

      if (tasksDueToday > 0 || overdueCount > 0) {
        // Notify all admins
        const adminIds = [
          workspace.ownerId,
          ...workspace.members.map((m) => m.userId),
        ];

        for (const adminId of [...new Set(adminIds)]) {
          await createNotification(
            adminId,
            'Daily Task Digest',
            `${tasksDueToday} task(s) due today, ${overdueCount} overdue in "${workspace.name}"`,
            NotificationType.TASK_REMINDER,
            `/workspaces/${workspace.id}`
          );
        }
      }
    }

    logger.info('Daily digest sent');
  } catch (error) {
    logger.error('Error sending daily digest:', error);
  }
};

// ─── Start all cron jobs ──────────────────────────────────────────────────────
export const startReminderCron = (): void => {
  // Check for upcoming deadlines every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running upcoming deadline reminder check...');
    await sendUpcomingDeadlineReminders();
  });

  // Check for overdue tasks every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running overdue task reminder check...');
    await sendOverdueReminders();
  });

  // Daily digest at 8 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running daily digest...');
    await sendDailyDigest();
  });

  logger.info('All reminder cron jobs scheduled');
};

// ─── Manual trigger for testing ──────────────────────────────────────────────
export const triggerRemindersManually = async (): Promise<{
  upcoming: number;
  overdue: number;
}> => {
  await sendUpcomingDeadlineReminders();
  await sendOverdueReminders();

  const now = new Date();
  const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const upcomingCount = await prisma.task.count({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      deadline: { gte: now, lte: twentyFiveHoursFromNow },
      assigneeId: { not: null },
    },
  });

  const overdueCount = await prisma.task.count({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      deadline: { lt: now },
      assigneeId: { not: null },
    },
  });

  return { upcoming: upcomingCount, overdue: overdueCount };
};