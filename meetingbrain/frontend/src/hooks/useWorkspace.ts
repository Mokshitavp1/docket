import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
} from '../services/workspaceService';
import { useWorkspaceStore } from '../store/workspaceStore';
import {
  CreateWorkspaceInput,
  InviteMemberInput,
  WorkspaceRole,
} from '../types';
import { getErrorMessage } from '../services/api';

// ─── useWorkspaces — list of all user's workspaces ────────────────────────────
export const useWorkspaces = () => {
  const { workspaces, isLoading } = useWorkspaceStore();

  const query = useQuery({
    queryKey: ['workspaces'],
    queryFn: getMyWorkspaces,
    staleTime: 2 * 60 * 1000,
  });

  return {
    workspaces: query.data || workspaces,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

// ─── useWorkspace — single workspace detail ───────────────────────────────────
export const useWorkspace = (workspaceId: string) => {
  const { currentWorkspace, currentUserRole } = useWorkspaceStore();

  const query = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    workspace: query.data?.workspace || currentWorkspace,
    currentUserRole: query.data?.currentUserRole || currentUserRole,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

// ─── useCreateWorkspace ───────────────────────────────────────────────────────
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateWorkspaceInput) => createWorkspace(data),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      navigate(`/workspaces/${workspace.id}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useUpdateWorkspace ───────────────────────────────────────────────────────
export const useUpdateWorkspace = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateWorkspaceInput>) =>
      updateWorkspace(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useDeleteWorkspace ───────────────────────────────────────────────────────
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (workspaceId: string) => deleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      navigate('/workspaces');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useInviteMember ─────────────────────────────────────────────────────────
export const useInviteMember = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberInput) => inviteMember(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useRemoveMember ─────────────────────────────────────────────────────────
export const useRemoveMember = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeMember(workspaceId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useUpdateMemberRole ──────────────────────────────────────────────────────
export const useUpdateMemberRole = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: WorkspaceRole;
    }) => updateMemberRole(workspaceId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useIsAdmin — check if current user is admin of workspace ─────────────────
export const useIsAdmin = (workspaceId: string): boolean => {
  const { currentUserRole, currentWorkspace } = useWorkspaceStore();
  const { user } = useWorkspaceStore((s) => ({
    user: null as any,
  }));

  return (
    currentUserRole === 'ADMIN' ||
    currentWorkspace?.ownerId === user?.id
  );
};