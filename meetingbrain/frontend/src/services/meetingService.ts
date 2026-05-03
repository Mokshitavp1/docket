import api from './api';
import {
  Meeting,
  CreateMeetingInput,
  AIProcessingResult,
  MinutesOfMeeting,
} from '../types';
import toast from 'react-hot-toast';
import { useMeetingStore } from '../store/meetingStore';

// ─── Create meeting ───────────────────────────────────────────────────────────
export const createMeeting = async (
  data: CreateMeetingInput
): Promise<Meeting> => {
  const response = await api.post<{ meeting: Meeting; message: string }>(
    '/meetings',
    data
  );
  useMeetingStore.getState().addMeeting(response.data.meeting);
  toast.success('Meeting created successfully.');
  return response.data.meeting;
};

// ─── Get workspace meetings ───────────────────────────────────────────────────
export const getWorkspaceMeetings = async (
  workspaceId: string,
  page = 1,
  limit = 20
): Promise<{
  meetings: Meeting[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const response = await api.get(
    `/meetings/workspace/${workspaceId}?page=${page}&limit=${limit}`
  );
  useMeetingStore.getState().setMeetings(response.data.meetings);
  return response.data;
};

// ─── Get single meeting ───────────────────────────────────────────────────────
export const getMeeting = async (
  meetingId: string
): Promise<{ meeting: Meeting; isAdminOrHost: boolean }> => {
  const response = await api.get<{
    meeting: Meeting;
    isAdminOrHost: boolean;
  }>(`/meetings/${meetingId}`);
  useMeetingStore
    .getState()
    .setCurrentMeeting(response.data.meeting, response.data.isAdminOrHost);
  return response.data;
};

// ─── Start meeting ────────────────────────────────────────────────────────────
export const startMeeting = async (meetingId: string): Promise<Meeting> => {
  const response = await api.post<{ meeting: Meeting; message: string }>(
    `/meetings/${meetingId}/start`
  );
  useMeetingStore.getState().updateMeeting(meetingId, response.data.meeting);
  useMeetingStore.getState().setIsRecording(true);
  return response.data.meeting;
};

// ─── End meeting ──────────────────────────────────────────────────────────────
export const endMeeting = async (
  meetingId: string,
  transcript: string
): Promise<{ meeting: Meeting; aiResult: AIProcessingResult }> => {
  const toastId = toast.loading('Processing meeting with AI...');

  try {
    const response = await api.post<{
      meeting: Meeting;
      aiResult: AIProcessingResult;
      message: string;
    }>(`/meetings/${meetingId}/end`, { transcript });

    useMeetingStore.getState().updateMeeting(meetingId, response.data.meeting);
    useMeetingStore.getState().setIsRecording(false);
    useMeetingStore.getState().setIsProcessing(false);

    toast.success('Meeting processed! Please review the generated tasks.', {
      id: toastId,
    });

    return response.data;
  } catch (error) {
    toast.error('Failed to process meeting.', { id: toastId });
    throw error;
  }
};

// ─── Upload audio for transcription ──────────────────────────────────────────
export const uploadMeetingAudio = async (
  meetingId: string,
  audioFile: File,
  onProgress?: (progress: number) => void
): Promise<{ transcript: string; meetingId: string }> => {
  const formData = new FormData();
  formData.append('audio', audioFile);

  const toastId = toast.loading('Uploading and transcribing audio...');

  try {
    const response = await api.post(
      `/meetings/${meetingId}/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percent);
          }
        },
        timeout: 5 * 60 * 1000, // 5 min timeout for large files
      }
    );

    toast.success('Audio transcribed successfully!', { id: toastId });
    return response.data;
  } catch (error) {
    toast.error('Failed to transcribe audio.', { id: toastId });
    throw error;
  }
};

// ─── Confirm meeting ──────────────────────────────────────────────────────────
export const confirmMeeting = async (
  meetingId: string
): Promise<Meeting> => {
  const response = await api.post<{ meeting: Meeting; message: string }>(
    `/meetings/${meetingId}/confirm`
  );
  useMeetingStore.getState().updateMeeting(meetingId, response.data.meeting);
  toast.success('Meeting confirmed and notifications sent!');
  return response.data.meeting;
};

// ─── Delete meeting ───────────────────────────────────────────────────────────
export const deleteMeeting = async (meetingId: string): Promise<void> => {
  await api.delete(`/meetings/${meetingId}`);
  useMeetingStore.getState().removeMeeting(meetingId);
  toast.success('Meeting deleted.');
};