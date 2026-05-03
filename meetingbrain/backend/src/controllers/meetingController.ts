import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { MeetingStatus } from '@prisma/client';
import { processTranscript } from '../services/aiService';
import { transcribeAudio } from '../services/transcriptionService';
import { deleteFile } from '../middleware/upload';
import path from 'path';

// ─── Create meeting ───────────────────────────────────────────────────────────
export const createMeeting = async (
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

    const { title, description, workspaceId } = req.body;

    // Verify workspace membership
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { where: { userId } },
      },
    });

    if (!workspace) throw new AppError('Workspace not found.', 404);

    const isMember =
      workspace.ownerId === userId || workspace.members.length > 0;

    if (!isMember) {
      throw new AppError('You are not a member of this workspace.', 403);
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        workspaceId,
        hostId: userId,
        status: MeetingStatus.SCHEDULED,
      },
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
        workspace: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });

    res.status(201).json({
      message: 'Meeting created successfully.',
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get meetings for workspace ───────────────────────────────────────────────
export const getWorkspaceMeetings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { workspaceId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where: { workspaceId },
        include: {
          host: { select: { id: true, name: true, avatar: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.meeting.count({ where: { workspaceId } }),
    ]);

    res.status(200).json({
      meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get single meeting ───────────────────────────────────────────────────────
export const getMeeting = async (
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
        host: { select: { id: true, name: true, email: true, avatar: true } },
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            members: { select: { userId: true, role: true } },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        mom: true,
      },
    });

    if (!meeting) throw new AppError('Meeting not found.', 404);

    // Check workspace membership
    const isMember =
      meeting.workspace.ownerId === userId ||
      meeting.workspace.members.some((m) => m.userId === userId);

    if (!isMember) {
      throw new AppError('You do not have access to this meeting.', 403);
    }

    // For non-admins, only show their own tasks
    const isAdminOrHost =
      meeting.hostId === userId ||
      meeting.workspace.ownerId === userId ||
      meeting.workspace.members.some(
        (m) => m.userId === userId && m.role === 'ADMIN'
      );

    const filteredTasks = isAdminOrHost
      ? meeting.tasks
      : meeting.tasks.filter((t) => t.assigneeId === userId);

    res.status(200).json({
      meeting: { ...meeting, tasks: filteredTasks },
      isAdminOrHost,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Start meeting ────────────────────────────────────────────────────────────
export const startMeeting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { meetingId } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { status: true },
    });

    if (!meeting) throw new AppError('Meeting not found.', 404);

    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new AppError('Meeting has already been started or completed.', 400);
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.RECORDING,
        startedAt: new Date(),
      },
    });

    res.status(200).json({ message: 'Meeting started.', meeting: updated });
  } catch (error) {
    next(error);
  }
};

// ─── End meeting & process transcript ────────────────────────────────────────
export const endMeeting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { meetingId } = req.params;
    const { transcript } = req.body;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!meeting) throw new AppError('Meeting not found.', 404);

    if (meeting.status !== MeetingStatus.RECORDING) {
      throw new AppError('Meeting is not currently recording.', 400);
    }

    const now = new Date();
    const duration = meeting.startedAt
      ? Math.floor((now.getTime() - meeting.startedAt.getTime()) / 1000)
      : 0;

    // Save transcript and mark as processing
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.PROCESSING,
        endedAt: now,
        duration,
        transcript: transcript || '',
      },
    });

    // Process with AI
    const workspaceMembers = meeting.workspace.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    }));

    const aiResult = await processTranscript(
      transcript || '',
      meeting.title,
      workspaceMembers,
      meetingId
    );

    // Move to review stage
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.REVIEW },
      include: {
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        mom: true,
      },
    });

    res.status(200).json({
      message: 'Meeting ended. Please review and confirm the generated tasks.',
      meeting: updatedMeeting,
      aiResult,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Upload audio and transcribe ──────────────────────────────────────────────
export const uploadAndTranscribe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { meetingId } = req.params;

    if (!req.file) throw new AppError('No audio file uploaded.', 400);

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, status: true, workspaceId: true },
    });

    if (!meeting) {
      deleteFile(req.file.path);
      throw new AppError('Meeting not found.', 404);
    }

    // Update meeting with audio path
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        audioUrl: req.file.filename,
        status: MeetingStatus.PROCESSING,
      },
    });

    // Transcribe the audio
    const transcript = await transcribeAudio(req.file.path);

    // Save transcript
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { transcript },
    });

    res.status(200).json({
      message: 'Audio uploaded and transcribed successfully.',
      transcript,
      meetingId,
    });
  } catch (error) {
    if (req.file) deleteFile(req.file.path);
    next(error);
  }
};

// ─── Confirm meeting (after admin review) ────────────────────────────────────
export const confirmMeeting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { meetingId } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { status: true },
    });

    if (!meeting) throw new AppError('Meeting not found.', 404);
    if (meeting.status !== MeetingStatus.REVIEW) {
      throw new AppError('Meeting is not in review status.', 400);
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.COMPLETED },
      include: {
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        mom: true,
      },
    });

    res.status(200).json({
      message: 'Meeting confirmed successfully.',
      meeting: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete meeting ───────────────────────────────────────────────────────────
export const deleteMeeting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { meetingId } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { audioUrl: true },
    });

    if (!meeting) throw new AppError('Meeting not found.', 404);

    // Delete audio file if exists
    if (meeting.audioUrl) {
      const audioPath = path.join(process.cwd(), 'uploads', 'audio', meeting.audioUrl);
      deleteFile(audioPath);
    }

    await prisma.meeting.delete({ where: { id: meetingId } });

    res.status(200).json({ message: 'Meeting deleted successfully.' });
  } catch (error) {
    next(error);
  }
};