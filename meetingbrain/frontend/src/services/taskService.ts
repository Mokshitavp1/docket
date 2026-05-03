import api from './api';
import {
  Task,
  TaskUpdate,
  TaskConfirmInput,
  GroupedTasks,
  TaskStats,
  TaskStatus,
  TaskPriority,
} from '../types';
import toast from 'react-hot-toast';

// ─── Get my tasks ─────────────────────────────────────────────────────────────
export const getMyTasks = async (filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
}): Promise<{ tasks: Task[]; grouped: GroupedTasks }> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);

  const response = await api.get<{ tasks: Task[]; grouped: GroupedTasks }>(
    `/tasks/my?${params.toString()}`
  );
  return response.data;
};

// ─── Get meeting tasks ────────────────────────────────────────────────────────
export const getMeetingTasks = async (
  meetingId: string
): Promise<{ tasks: Task[]; isAdminOrHost: boolean }> => {
  const response = await api.get<{
    tasks: Task[];
    isAdminOrHost: boolean;
  }>(`/tasks/meeting/${meetingId}`);
  return response.data;
};

// ─── Update task ──────────────────────────────────────────────────────────────
export const updateTask = async (
  taskId: string,
  data: TaskUpdate
): Promise<Task> => {
  const response = await api.patch<{ task: Task; message: string }>(
    `/tasks/${taskId}`,
    data
  );
  toast.success('Task updated.');
  return response.data.task;
};

// ─── Update task status only (member action) ──────────────────────────────────
export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus
): Promise<Task> => {
  const response = await api.patch<{ task: Task; message: string }>(
    `/tasks/${taskId}`,
    { status }
  );

  const statusLabels: Record<TaskStatus, string> = {
    PENDING: 'marked as pending',
    IN_PROGRESS: 'marked as in progress',
    COMPLETED: 'marked as completed',
    CANCELLED: 'cancelled',
  };

  toast.success(`Task ${statusLabels[status]}.`);
  return response.data.task;
};

// ─── Confirm tasks (bulk after AI generation) ─────────────────────────────────
export const confirmTasks = async (
  meetingId: string,
  tasks: TaskConfirmInput[]
): Promise<{ tasks: Task[]; message: string }> => {
  const toastId = toast.loading('Confirming tasks and sending notifications...');

  try {
    const response = await api.post<{ tasks: Task[]; message: string }>(
      `/tasks/meeting/${meetingId}/confirm`,
      { tasks }
    );
    toast.success(
      `${response.data.tasks.length} task(s) confirmed! Emails sent to assignees.`,
      { id: toastId }
    );
    return response.data;
  } catch (error) {
    toast.error('Failed to confirm tasks.', { id: toastId });
    throw error;
  }
};

// ─── Delete task ──────────────────────────────────────────────────────────────
export const deleteTask = async (taskId: string): Promise<void> => {
  await api.delete(`/tasks/${taskId}`);
  toast.success('Task deleted.');
};

// ─── Get task stats for workspace ─────────────────────────────────────────────
export const getTaskStats = async (
  workspaceId: string
): Promise<TaskStats> => {
  const response = await api.get<{ stats: TaskStats }>(
    `/tasks/stats/${workspaceId}`
  );
  return response.data.stats;
};

// ─── Add task to Google Calendar ─────────────────────────────────────────────
export const addTaskToCalendar = async (
  taskId: string
): Promise<{ eventId: string; message: string }> => {
  const response = await api.post<{ eventId: string; message: string }>(
    `/calendar/tasks/${taskId}/add`
  );
  toast.success('Task added to Google Calendar!');
  return response.data;
};

// ─── Get calendar status ──────────────────────────────────────────────────────
export const getCalendarStatus = async (): Promise<{
  isConnected: boolean;
}> => {
  const response = await api.get<{ isConnected: boolean }>('/calendar/status');
  return response.data;
};

// ─── Get Google Calendar auth URL ─────────────────────────────────────────────
export const getCalendarAuthUrl = async (): Promise<string> => {
  const response = await api.get<{ url: string }>('/calendar/auth-url');
  return response.data.url;
};

// ─── Disconnect calendar ──────────────────────────────────────────────────────
export const disconnectCalendar = async (): Promise<void> => {
  await api.delete('/calendar/disconnect');
  toast.success('Google Calendar disconnected.');
};