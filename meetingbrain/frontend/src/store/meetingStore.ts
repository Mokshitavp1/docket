import { create } from 'zustand';
import { Meeting, Task, MinutesOfMeeting } from '../types';

interface MeetingStore {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isAdminOrHost: boolean;
  liveTranscript: string;
  interimTranscript: string;
  isRecording: boolean;
  isProcessing: boolean;

  // Actions
  setMeetings: (meetings: Meeting[]) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, data: Partial<Meeting>) => void;
  removeMeeting: (id: string) => void;
  setCurrentMeeting: (meeting: Meeting | null, isAdminOrHost?: boolean) => void;

  // Live recording
  appendTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  setLiveTranscript: (text: string) => void;
  clearTranscript: () => void;
  setIsRecording: (recording: boolean) => void;
  setIsProcessing: (processing: boolean) => void;

  // Tasks within meeting
  updateMeetingTask: (meetingId: string, taskId: string, data: Partial<Task>) => void;
  removeMeetingTask: (meetingId: string, taskId: string) => void;

  // MoM
  setMeetingMoM: (meetingId: string, mom: MinutesOfMeeting) => void;

  reset: () => void;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: [],
  currentMeeting: null,
  isAdminOrHost: false,
  liveTranscript: '',
  interimTranscript: '',
  isRecording: false,
  isProcessing: false,

  setMeetings: (meetings) => set({ meetings }),

  addMeeting: (meeting) =>
    set((state) => ({ meetings: [meeting, ...state.meetings] })),

  updateMeeting: (id, data) =>
    set((state) => ({
      meetings: state.meetings.map((m) =>
        m.id === id ? { ...m, ...data } : m
      ),
      currentMeeting:
        state.currentMeeting?.id === id
          ? { ...state.currentMeeting, ...data }
          : state.currentMeeting,
    })),

  removeMeeting: (id) =>
    set((state) => ({
      meetings: state.meetings.filter((m) => m.id !== id),
      currentMeeting:
        state.currentMeeting?.id === id ? null : state.currentMeeting,
    })),

  setCurrentMeeting: (meeting, isAdminOrHost = false) =>
    set({ currentMeeting: meeting, isAdminOrHost }),

  appendTranscript: (text) =>
    set((state) => ({
      liveTranscript: state.liveTranscript
        ? state.liveTranscript + '\n' + text
        : text,
      interimTranscript: '',
    })),

  setInterimTranscript: (text) => set({ interimTranscript: text }),

  setLiveTranscript: (text) => set({ liveTranscript: text }),

  clearTranscript: () =>
    set({ liveTranscript: '', interimTranscript: '' }),

  setIsRecording: (isRecording) => set({ isRecording }),

  setIsProcessing: (isProcessing) => set({ isProcessing }),

  updateMeetingTask: (meetingId, taskId, data) =>
    set((state) => ({
      currentMeeting:
        state.currentMeeting?.id === meetingId && state.currentMeeting.tasks
          ? {
              ...state.currentMeeting,
              tasks: state.currentMeeting.tasks.map((t) =>
                t.id === taskId ? { ...t, ...data } : t
              ),
            }
          : state.currentMeeting,
    })),

  removeMeetingTask: (meetingId, taskId) =>
    set((state) => ({
      currentMeeting:
        state.currentMeeting?.id === meetingId && state.currentMeeting.tasks
          ? {
              ...state.currentMeeting,
              tasks: state.currentMeeting.tasks.filter((t) => t.id !== taskId),
            }
          : state.currentMeeting,
    })),

  setMeetingMoM: (meetingId, mom) =>
    set((state) => ({
      currentMeeting:
        state.currentMeeting?.id === meetingId
          ? { ...state.currentMeeting, mom }
          : state.currentMeeting,
    })),

  reset: () =>
    set({
      meetings: [],
      currentMeeting: null,
      isAdminOrHost: false,
      liveTranscript: '',
      interimTranscript: '',
      isRecording: false,
      isProcessing: false,
    }),
}));