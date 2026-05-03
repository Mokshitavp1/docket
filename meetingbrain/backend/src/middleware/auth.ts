import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AppError } from './errorHandler';
import { WorkspaceRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

// ─── Verify JWT token ────────────────────────────────────────────────────────
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please log in.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Invalid token format.', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('Server configuration error.', 500);
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      email: string;
      iat: number;
      exp: number;
    };

    // Verify user still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new AppError('User no longer exists. Please log in again.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// ─── Verify user is a member of a workspace ──────────────────────────────────
export const requireWorkspaceMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const workspaceId =
      req.params.workspaceId || req.body.workspaceId || req.query.workspaceId as string;

    if (!userId) {
      throw new AppError('Authentication required.', 401);
    }

    if (!workspaceId) {
      throw new AppError('Workspace ID is required.', 400);
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    // Also allow workspace owner
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!membership && workspace?.ownerId !== userId) {
      throw new AppError('You are not a member of this workspace.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ─── Verify user is an admin of a workspace ──────────────────────────────────
export const requireWorkspaceAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const workspaceId =
      req.params.workspaceId || req.body.workspaceId || req.query.workspaceId as string;

    if (!userId) {
      throw new AppError('Authentication required.', 401);
    }

    if (!workspaceId) {
      throw new AppError('Workspace ID is required.', 400);
    }

    // Check if owner
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) {
      throw new AppError('Workspace not found.', 404);
    }

    if (workspace.ownerId === userId) {
      return next();
    }

    // Check if admin member
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || membership.role !== WorkspaceRole.ADMIN) {
      throw new AppError('You must be an admin to perform this action.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ─── Verify user is the host of a meeting ────────────────────────────────────
export const requireMeetingHost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const meetingId = req.params.meetingId;

    if (!userId) {
      throw new AppError('Authentication required.', 401);
    }

    if (!meetingId) {
      throw new AppError('Meeting ID is required.', 400);
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        hostId: true,
        workspace: {
          select: {
            ownerId: true,
            members: {
              where: {
                userId,
                role: WorkspaceRole.ADMIN,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      throw new AppError('Meeting not found.', 404);
    }

    const isHost = meeting.hostId === userId;
    const isWorkspaceOwner = meeting.workspace.ownerId === userId;
    const isWorkspaceAdmin = meeting.workspace.members.length > 0;

    if (!isHost && !isWorkspaceOwner && !isWorkspaceAdmin) {
      throw new AppError('Only the meeting host or workspace admin can perform this action.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};