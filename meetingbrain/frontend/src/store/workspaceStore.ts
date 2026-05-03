import { create } from 'zustand';
import { Workspace, WorkspaceMember } from '../types';

interface WorkspaceStore {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentUserRole: 'ADMIN' | 'MEMBER' | null;
  isLoading: boolean;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setCurrentWorkspace: (workspace: Workspace | null, role?: 'ADMIN' | 'MEMBER' | null) => void;
  addMember: (workspaceId: string, member: WorkspaceMember) => void;
  removeMember: (workspaceId: string, userId: string) => void;
  updateMember: (workspaceId: string, userId: string, data: Partial<WorkspaceMember>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  currentUserRole: null,
  isLoading: false,

  setWorkspaces: (workspaces) =>
    set({ workspaces }),

  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [workspace, ...state.workspaces],
    })),

  updateWorkspace: (id, data) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, ...data } : w
      ),
      currentWorkspace:
        state.currentWorkspace?.id === id
          ? { ...state.currentWorkspace, ...data }
          : state.currentWorkspace,
    })),

  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspace:
        state.currentWorkspace?.id === id ? null : state.currentWorkspace,
    })),

  setCurrentWorkspace: (workspace, role = null) =>
    set({ currentWorkspace: workspace, currentUserRole: role }),

  addMember: (workspaceId, member) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, members: [...w.members, member] }
          : w
      ),
      currentWorkspace:
        state.currentWorkspace?.id === workspaceId
          ? {
              ...state.currentWorkspace,
              members: [...state.currentWorkspace.members, member],
            }
          : state.currentWorkspace,
    })),

  removeMember: (workspaceId, userId) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, members: w.members.filter((m) => m.userId !== userId) }
          : w
      ),
      currentWorkspace:
        state.currentWorkspace?.id === workspaceId
          ? {
              ...state.currentWorkspace,
              members: state.currentWorkspace.members.filter(
                (m) => m.userId !== userId
              ),
            }
          : state.currentWorkspace,
    })),

  updateMember: (workspaceId, userId, data) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              members: w.members.map((m) =>
                m.userId === userId ? { ...m, ...data } : m
              ),
            }
          : w
      ),
      currentWorkspace:
        state.currentWorkspace?.id === workspaceId
          ? {
              ...state.currentWorkspace,
              members: state.currentWorkspace.members.map((m) =>
                m.userId === userId ? { ...m, ...data } : m
              ),
            }
          : state.currentWorkspace,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      workspaces: [],
      currentWorkspace: null,
      currentUserRole: null,
      isLoading: false,
    }),
}));