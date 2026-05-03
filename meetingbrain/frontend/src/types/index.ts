// ─── Auth & User ──────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    ownedWorkspaces: number;
    memberships: number;
    assignedTasks: number;
  };
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  message: string;
}

// ─── Workspace ────────────────────────────────────────────────────────────────
export type WorkspaceRole = 'ADMIN' | 'MEMBER';

export interface WorkspaceMember {
  id: string;
  role: WorkspaceRole;
  joinedAt: string;
  workspaceId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  members: WorkspaceMember[];
  meetings?: Meeting[];
  _count: {
    meetings: number;
    members: number;
  };
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export interface InviteMemberInput {
  email: string;
  role?: WorkspaceRole;
}

// ─── Meeting ──────────────────────────────────────────────────────────────────
export type MeetingStatus =
  | 'SCHEDULED'
  | 'RECORDING'
  | 'PROCESSING'
  | 'REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  status: MeetingStatus;
  startedAt: string | null;
  endedAt: string | null;
  transcript: string | null;
  audioUrl: string | null;
  duration: number | null;
  workspaceId: string;
  hostId: string;
  createdAt: string;
  updatedAt: string;
  host: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  workspace?: {
    id: string;
    name: string;
    ownerId?: string;
    members?: { userId: string; role: WorkspaceRole }[];
  };
  tasks?: Task[];
  mom?: MinutesOfMeeting | null;
  _count?: {
    tasks: number;
  };
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  workspaceId: string;
}

// ─── Minutes of Meeting ───────────────────────────────────────────────────────
export interface MinutesOfMeeting {
  id: string;
  title: string;
  date: string;
  attendees: string[];
  agenda: string | null;
  summary: string;
  decisions: string[];
  nextSteps: string[];
  rawContent: string;
  confirmedAt: string | null;
  meetingId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  reminderSentAt: string | null;
  emailSentAt: string | null;
  calendarEventId: string | null;
  confirmedAt: string | null;
  meetingId: string;
  assigneeId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  meeting?: {
    id: string;
    title: string;
    workspace?: {
      id: string;
      name: string;
    };
  };
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  assigneeId?: string | null;
  deadline?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface TaskConfirmInput {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  deadline: string | null;
  priority: TaskPriority;
}

export interface GroupedTasks {
  pending: Task[];
  inProgress: Task[];
  completed: Task[];
  cancelled: Task[];
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  urgent: number;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_REMINDER'
  | 'TASK_UPDATED'
  | 'MEETING_STARTED'
  | 'MEETING_ENDED'
  | 'WORKSPACE_INVITE';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link: string | null;
  createdAt: string;
  userId: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export interface ApiError {
  error: string;
  status: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Speech Recognition ───────────────────────────────────────────────────────
export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  htmlLink: string;
}

// ─── AI Processing ────────────────────────────────────────────────────────────
export interface AIProcessingResult {
  tasks: {
    title: string;
    description: string;
    assigneeName: string | null;
    assigneeId: string | null;
    deadline: string | null;
    priority: TaskPriority;
  }[];
  mom: {
    title: string;
    summary: string;
    decisions: string[];
    nextSteps: string[];
    attendees: string[];
    agenda: string;
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalWorkspaces: number;
  totalMeetings: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingDeadlines: Task[];
  recentMeetings: Meeting[];
}

// ─── Forms ────────────────────────────────────────────────────────────────────
export interface FormField {
  value: string;
  error: string | null;
  touched: boolean;
}

export type FormState<T> = {
  [K in keyof T]: FormField;
};

// ─── Component Props ──────────────────────────────────────────────────────────
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}