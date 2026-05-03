import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useMeetingStore } from '../store/meetingStore';
import {
  login as loginService,
  register as registerService,
  logout as logoutService,
  getMe,
  updateProfile as updateProfileService,
  changePassword as changePasswordService,
  getNotifications,
  markNotificationsRead,
} from '../services/authService';
import {
  LoginCredentials,
  RegisterCredentials,
  Notification,
} from '../types';
import { getErrorMessage } from '../services/api';

// ─── useAuth hook ─────────────────────────────────────────────────────────────
export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading, accessToken } = useAuthStore();
  const resetWorkspaces = useWorkspaceStore((s) => s.reset);
  const resetMeetings = useMeetingStore((s) => s.reset);

  // ── Login ──────────────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => loginService(credentials),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ── Register ───────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (credentials: RegisterCredentials) =>
      registerService(credentials),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(`Welcome to MeetingBrain, ${data.user.name}!`);
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    queryClient.clear();
    resetWorkspaces();
    resetMeetings();
    logoutService();
  }, [queryClient, resetWorkspaces, resetMeetings]);

  // ── Update profile ─────────────────────────────────────────────────────────
  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; avatar?: string }) =>
      updateProfileService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ── Change password ────────────────────────────────────────────────────────
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      changePasswordService(data),
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading,
    accessToken,

    // Mutations
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,

    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,

    logout,

    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,

    changePassword: changePasswordMutation.mutate,
    changePasswordAsync: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
  };
};

// ─── useNotifications hook ────────────────────────────────────────────────────
export const useNotifications = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    staleTime: 15 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    refetch,
    markRead: markReadMutation.mutate,
    markAllRead: () => markReadMutation.mutate(undefined),
    isMarkingRead: markReadMutation.isPending,
  };
};

// ─── useCurrentUser hook ──────────────────────────────────────────────────────
export const useCurrentUser = () => {
  const { user, isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: data || user,
    isLoading,
  };
};