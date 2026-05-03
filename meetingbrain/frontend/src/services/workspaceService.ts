import api from './api';
import {
  Workspace,
  WorkspaceMember,
  CreateWorkspaceInput,
  InviteMemberInput,
  WorkspaceRole,
} from '../types';
import toast from 'react-hot-toast';
import { useWorkspaceStore } from '../store/workspaceStore';

// ─── Create workspace ─────────────────────────────────────────────────────────
export const createWorkspace = async (
  data: CreateWorkspaceInput
): Promise<Workspace> => {
  const response = await api.post<{ workspace: Workspace; message: string }>(
    '/workspaces',
    data
  );
  useWorkspaceStore.getState().addWorkspace(response.data.workspace);
  toast.success('Workspace created successfully.');
  return response.data.workspace;
};

// ─── Get my workspaces ────────────────────────────────────────────────────────
export const getMyWorkspaces = async (): Promise<Workspace[]> => {
  const response = await api.get<{ workspaces: Workspace[] }>('/workspaces');
  useWorkspaceStore.getState().setWorkspaces(response.data.workspaces);
  return response.data.workspaces;
};

// ─── Get single workspace ─────────────────────────────────────────────────────
export const getWorkspace = async (
  workspaceId: string
): Promise<{ workspace: Workspace; currentUserRole: WorkspaceRole }> => {
  const response = await api.get<{
    workspace: Workspace;
    currentUserRole: WorkspaceRole;
  }>(`/workspaces/${workspaceId}`);

  useWorkspaceStore
    .getState()
    .setCurrentWorkspace(
      response.data.workspace,
      response.data.currentUserRole
    );

  return response.data;
};

// ─── Update workspace ─────────────────────────────────────────────────────────
export const updateWorkspace = async (
  workspaceId: string,
  data: Partial<CreateWorkspaceInput>
): Promise<Workspace> => {
  const response = await api.patch<{ workspace: Workspace; message: string }>(
    `/workspaces/${workspaceId}`,
    data
  );
  useWorkspaceStore.getState().updateWorkspace(workspaceId, response.data.workspace);
  toast.success('Workspace updated successfully.');
  return response.data.workspace;
};

// ─── Delete workspace ─────────────────────────────────────────────────────────
export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}`);
  useWorkspaceStore.getState().removeWorkspace(workspaceId);
  toast.success('Workspace deleted.');
};

// ─── Get workspace members ────────────────────────────────────────────────────
export const getWorkspaceMembers = async (
  workspaceId: string
): Promise<WorkspaceMember[]> => {
  const response = await api.get<{ members: WorkspaceMember[] }>(
    `/workspaces/${workspaceId}/members`
  );
  return response.data.members;
};

// ─── Invite member ────────────────────────────────────────────────────────────
export const inviteMember = async (
  workspaceId: string,
  data: InviteMemberInput
): Promise<WorkspaceMember> => {
  const response = await api.post<{
    member: WorkspaceMember;
    message: string;
  }>(`/workspaces/${workspaceId}/members`, data);
  useWorkspaceStore.getState().addMember(workspaceId, response.data.member);
  toast.success(response.data.message);
  return response.data.member;
};

// ─── Remove member ────────────────────────────────────────────────────────────
export const removeMember = async (
  workspaceId: string,
  memberId: string
): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  useWorkspaceStore.getState().removeMember(workspaceId, memberId);
  toast.success('Member removed from workspace.');
};

// ─── Update member role ───────────────────────────────────────────────────────
export const updateMemberRole = async (
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> => {
  const response = await api.patch<{
    member: WorkspaceMember;
    message: string;
  }>(`/workspaces/${workspaceId}/members/${memberId}/role`, { role });
  useWorkspaceStore
    .getState()
    .updateMember(workspaceId, memberId, { role });
  toast.success('Member role updated.');
  return response.data.member;
};