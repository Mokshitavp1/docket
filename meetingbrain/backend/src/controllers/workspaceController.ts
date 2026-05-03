import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { WorkspaceRole } from '@prisma/client';
import { sendWorkspaceInviteEmail } from '../services/emailService';
import { createNotification } from '../services/reminderService';

// ─── Create workspace ─────────────────────────────────────────────────────────
export const createWorkspace = async (
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

    const { name, description } = req.body;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: WorkspaceRole.ADMIN,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        _count: { select: { meetings: true, members: true } },
      },
    });

    res.status(201).json({
      message: 'Workspace created successfully.',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get all workspaces for current user ──────────────────────────────────────
export const getMyWorkspaces = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        _count: { select: { meetings: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ workspaces });
  } catch (error) {
    next(error);
  }
};

// ─── Get single workspace ─────────────────────────────────────────────────────
export const getWorkspace = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { workspaceId } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        meetings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            status: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
            host: {
              select: { id: true, name: true, avatar: true },
            },
            _count: { select: { tasks: true } },
          },
        },
        _count: { select: { meetings: true, members: true } },
      },
    });

    if (!workspace) throw new AppError('Workspace not found.', 404);

    // Check membership
    const isMember =
      workspace.ownerId === userId ||
      workspace.members.some((m) => m.userId === userId);

    if (!isMember) throw new AppError('You are not a member of this workspace.', 403);

    // Attach current user's role
    const currentMember = workspace.members.find((m) => m.userId === userId);
    const currentUserRole =
      workspace.ownerId === userId ? WorkspaceRole.ADMIN : currentMember?.role;

    res.status(200).json({ workspace, currentUserRole });
  } catch (error) {
    next(error);
  }
};

// ─── Update workspace ─────────────────────────────────────────────────────────
export const updateWorkspace = async (
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

    const { workspaceId } = req.params;
    const { name, description } = req.body;

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        _count: { select: { meetings: true, members: true } },
      },
    });

    res.status(200).json({
      message: 'Workspace updated successfully.',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete workspace ─────────────────────────────────────────────────────────
export const deleteWorkspace = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { workspaceId } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) throw new AppError('Workspace not found.', 404);
    if (workspace.ownerId !== userId) {
      throw new AppError('Only the workspace owner can delete it.', 403);
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });

    res.status(200).json({ message: 'Workspace deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── Invite member ────────────────────────────────────────────────────────────
export const inviteMember = async (
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

    const inviterId = req.user?.id;
    if (!inviterId) throw new AppError('Authentication required.', 401);

    const { workspaceId } = req.params;
    const { email, role = 'MEMBER' } = req.body;

    // Find the user to invite
    const userToInvite = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!userToInvite) {
      throw new AppError('No account found with that email address.', 404);
    }

    // Check not already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: userToInvite.id,
        },
      },
    });

    if (existingMember) {
      throw new AppError('This user is already a member of the workspace.', 409);
    }

    // Check not the owner
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true, name: true },
    });

    if (!workspace) throw new AppError('Workspace not found.', 404);
    if (workspace.ownerId === userToInvite.id) {
      throw new AppError('This user is already the workspace owner.', 409);
    }

    // Add member
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userToInvite.id,
        role: role as WorkspaceRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Send invite email
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { name: true },
    });

    await sendWorkspaceInviteEmail(
      userToInvite.email,
      userToInvite.name,
      workspace.name,
      inviter?.name || 'A team member'
    );

    // Send notification
    await createNotification(
      userToInvite.id,
      'Workspace Invitation',
      `You have been added to workspace "${workspace.name}"`,
      'WORKSPACE_INVITE',
      `/workspaces/${workspaceId}`
    );

    res.status(201).json({
      message: `${userToInvite.name} has been added to the workspace.`,
      member,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Remove member ────────────────────────────────────────────────────────────
export const removeMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    if (!requesterId) throw new AppError('Authentication required.', 401);

    const { workspaceId, memberId } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) throw new AppError('Workspace not found.', 404);

    // Cannot remove the owner
    if (workspace.ownerId === memberId) {
      throw new AppError('Cannot remove the workspace owner.', 403);
    }

    // Members can remove themselves
    if (requesterId !== memberId && workspace.ownerId !== requesterId) {
      const requesterMembership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: requesterId } },
      });
      if (!requesterMembership || requesterMembership.role !== WorkspaceRole.ADMIN) {
        throw new AppError('Only admins can remove other members.', 403);
      }
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: memberId } },
    });

    res.status(200).json({ message: 'Member removed from workspace.' });
  } catch (error) {
    next(error);
  }
};

// ─── Update member role ───────────────────────────────────────────────────────
export const updateMemberRole = async (
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

    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) throw new AppError('Workspace not found.', 404);
    if (workspace.ownerId === memberId) {
      throw new AppError('Cannot change the role of the workspace owner.', 403);
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: memberId } },
      data: { role: role as WorkspaceRole },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    res.status(200).json({
      message: 'Member role updated successfully.',
      member: updatedMember,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get workspace members ────────────────────────────────────────────────────
export const getWorkspaceMembers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { workspaceId } = req.params;

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
};