import { Router } from 'express';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
  getWorkspaceMembers,
} from '../controllers/workspaceController';
import { authenticate, requireWorkspaceAdmin, requireWorkspaceMember } from '../middleware/auth';
import {
  createWorkspaceValidator,
  updateWorkspaceValidator,
  inviteMemberValidator,
  updateMemberRoleValidator,
} from '../utils/validators';

const router = Router();

// All workspace routes require authentication
router.use(authenticate);

// ─── Workspace CRUD ───────────────────────────────────────────────────────────
router.post('/', createWorkspaceValidator, createWorkspace);
router.get('/', getMyWorkspaces);
router.get('/:workspaceId', requireWorkspaceMember, getWorkspace);
router.patch('/:workspaceId', requireWorkspaceAdmin, updateWorkspaceValidator, updateWorkspace);
router.delete('/:workspaceId', requireWorkspaceAdmin, deleteWorkspace);

// ─── Member management ────────────────────────────────────────────────────────
router.get('/:workspaceId/members', requireWorkspaceMember, getWorkspaceMembers);
router.post('/:workspaceId/members', requireWorkspaceAdmin, inviteMemberValidator, inviteMember);
router.delete('/:workspaceId/members/:memberId', requireWorkspaceMember, removeMember);
router.patch('/:workspaceId/members/:memberId/role', requireWorkspaceAdmin, updateMemberRoleValidator, updateMemberRole);

export default router;