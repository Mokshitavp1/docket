import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  createMeeting,
  getWorkspaceMeetings,
  getMeeting,
  startMeeting,
  endMeeting,
  uploadMeetingAudio,
  confirmMeeting,
  deleteMeeting,
} from '../services/meetingService';
import { confirmTasks } from '../services/taskService';
import { useMeetingStore } from '../store/meetingStore';
import { CreateMeetingInput, TaskConfirmInput } from '../types';
import { getErrorMessage } from '../services/api';

// ─── useWorkspaceMeetings ─────────────────────────────────────────────────────
export const useWorkspaceMeetings = (workspaceId: string) => {
  const { meetings } = useMeetingStore();

  const query = useQuery({
    queryKey: ['meetings', workspaceId],
    queryFn: () => getWorkspaceMeetings(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  });

  return {
    meetings: query.data?.meetings || meetings,
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

// ─── useMeeting ───────────────────────────────────────────────────────────────
export const useMeeting = (meetingId: string) => {
  const { currentMeeting, isAdminOrHost } = useMeetingStore();

  const query = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => getMeeting(meetingId),
    enabled: !!meetingId,
    staleTime: 30 * 1000,
    refetchInterval: (data) => {
      // Poll every 5s while processing
      const status = data?.state?.data?.meeting?.status;
      return status === 'PROCESSING' ? 5000 : false;
    },
  });

  return {
    meeting: query.data?.meeting || currentMeeting,
    isAdminOrHost: query.data?.isAdminOrHost ?? isAdminOrHost,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

// ─── useCreateMeeting ─────────────────────────────────────────────────────────
export const useCreateMeeting = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateMeetingInput) => createMeeting(data),
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', meeting.workspaceId] });
      navigate(`/meetings/${meeting.id}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useStartMeeting ──────────────────────────────────────────────────────────
export const useStartMeeting = (meetingId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startMeeting(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useEndMeeting ────────────────────────────────────────────────────────────
export const useEndMeeting = (meetingId: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (transcript: string) => endMeeting(meetingId, transcript),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      navigate(`/meetings/${meetingId}/review`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useUploadAudio ───────────────────────────────────────────────────────────
export const useUploadAudio = (meetingId: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (p: number) => void;
    }) => uploadMeetingAudio(meetingId, file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      navigate(`/meetings/${meetingId}/review`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useConfirmTasks ──────────────────────────────────────────────────────────
export const useConfirmTasks = (meetingId: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (tasks: TaskConfirmInput[]) => confirmTasks(meetingId, tasks),
    onSuccess: async () => {
      // Confirm meeting status after tasks confirmed
      try {
        await confirmMeeting(meetingId);
      } catch {
        // Non-fatal
      }
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
      navigate(`/meetings/${meetingId}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useDeleteMeeting ─────────────────────────────────────────────────────────
export const useDeleteMeeting = (workspaceId: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (meetingId: string) => deleteMeeting(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
      navigate(`/workspaces/${workspaceId}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ─── useMeetingTasks ──────────────────────────────────────────────────────────
export const useMeetingTasks = (meetingId: string) => {
  const query = useQuery({
    queryKey: ['tasks', 'meeting', meetingId],
    queryFn: async () => {
      const { getMeetingTasks } = await import('../services/taskService');
      return getMeetingTasks(meetingId);
    },
    enabled: !!meetingId,
    staleTime: 30 * 1000,
  });

  return {
    tasks: query.data?.tasks || [],
    isAdminOrHost: query.data?.isAdminOrHost || false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

// ─── useMyTasks ───────────────────────────────────────────────────────────────
export const useMyTasks = (filters?: {
  status?: string;
  priority?: string;
}) => {
  const query = useQuery({
    queryKey: ['tasks', 'my', filters],
    queryFn: async () => {
      const { getMyTasks } = await import('../services/taskService');
      return getMyTasks(filters as any);
    },
    staleTime: 60 * 1000,
  });

  return {
    tasks: query.data?.tasks || [],
    grouped: query.data?.grouped || {
      pending: [],
      inProgress: [],
      completed: [],
      cancelled: [],
    },
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

// ─── useUpdateTask ────────────────────────────────────────────────────────────
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: any;
    }) => {
      const { updateTask } = await import('../services/taskService');
      return updateTask(taskId, data);
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'meeting', task.meetingId],
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};