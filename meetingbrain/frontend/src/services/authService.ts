import api, { getErrorMessage } from './api';
import { useAuthStore } from '../store/authStore';
import {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  User,
  Notification,
} from '../types';
import toast from 'react-hot-toast';

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (
  credentials: RegisterCredentials
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', credentials);
  const { user, accessToken, refreshToken } = response.data;
  useAuthStore.getState().setAuth(user, accessToken, refreshToken);
  return response.data;
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  const { user, accessToken, refreshToken } = response.data;
  useAuthStore.getState().setAuth(user, accessToken, refreshToken);
  return response.data;
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logout = (): void => {
  useAuthStore.getState().logout();
  // Clear React Query cache on logout
  window.location.href = '/login';
};

// ─── Get current user ─────────────────────────────────────────────────────────
export const getMe = async (): Promise<User> => {
  const response = await api.get<{ user: User }>('/auth/me');
  useAuthStore.getState().setUser(response.data.user);
  return response.data.user;
};

// ─── Update profile ───────────────────────────────────────────────────────────
export const updateProfile = async (data: {
  name?: string;
  avatar?: string;
}): Promise<User> => {
  const response = await api.patch<{ user: User; message: string }>(
    '/auth/me',
    data
  );
  useAuthStore.getState().setUser(response.data.user);
  toast.success('Profile updated successfully.');
  return response.data.user;
};

// ─── Change password ──────────────────────────────────────────────────────────
export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  await api.post('/auth/change-password', data);
  toast.success('Password changed successfully.');
};

// ─── Get notifications ────────────────────────────────────────────────────────
export const getNotifications = async (): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> => {
  const response = await api.get('/auth/notifications');
  return response.data;
};

// ─── Mark notifications as read ───────────────────────────────────────────────
export const markNotificationsRead = async (
  notificationIds?: string[]
): Promise<void> => {
  await api.patch('/auth/notifications/read', { notificationIds });
};

// ─── Delete account ───────────────────────────────────────────────────────────
export const deleteAccount = async (password: string): Promise<void> => {
  await api.delete('/auth/me', { data: { password } });
  useAuthStore.getState().logout();
  toast.success('Account deleted successfully.');
};

// ─── Initialize auth on app start ────────────────────────────────────────────
export const initializeAuth = async (): Promise<void> => {
  const { isAuthenticated, accessToken } = useAuthStore.getState();

  if (!isAuthenticated || !accessToken) {
    useAuthStore.getState().setLoading(false);
    return;
  }

  try {
    await getMe();
  } catch (error) {
    // Token invalid — clear auth state
    useAuthStore.getState().logout();
  } finally {
    useAuthStore.getState().setLoading(false);
  }
};