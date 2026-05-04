import { clsx } from 'clsx';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Flame,
} from 'lucide-react';
import { TaskStatus, TaskPriority, MeetingStatus, BadgeProps } from '../../types';

// ─── Generic Badge ────────────────────────────────────────────────────────────
export default function Badge({
  variant = 'ghost',
  size = 'md',
  children,
  className,
}: BadgeProps) {
  const variantClasses = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger:  'badge-danger',
    ghost:   'badge-ghost',
  };

  const sizeClasses = {
    sm: 'text-2xs px-1.5 py-0',
    md: 'text-xs px-2 py-0.5',
  };

  return (
    <span className={clsx('badge', variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </span>
  );
}

// ─── Task Status Badge ────────────────────────────────────────────────────────
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config: Record
    TaskStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    PENDING: {
      label: 'Pending',
      className: 'status-pending',
      icon: <Clock className="w-3 h-3" />,
    },
    IN_PROGRESS: {
      label: 'In Progress',
      className: 'status-in_progress',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    COMPLETED: {
      label: 'Completed',
      className: 'status-completed',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'status-cancelled',
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  const { label, className, icon } = config[status];

  return (
    <span className={clsx('badge', className)}>
      {icon}
      {label}
    </span>
  );
}

// ─── Task Priority Badge ──────────────────────────────────────────────────────
export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const config: Record
    TaskPriority,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    LOW: {
      label: 'Low',
      className: 'priority-low',
      icon: <ArrowDown className="w-3 h-3" />,
    },
    MEDIUM: {
      label: 'Medium',
      className: 'priority-medium',
      icon: <Minus className="w-3 h-3" />,
    },
    HIGH: {
      label: 'High',
      className: 'priority-high',
      icon: <ArrowUp className="w-3 h-3" />,
    },
    URGENT: {
      label: 'Urgent',
      className: 'priority-urgent',
      icon: <Flame className="w-3 h-3" />,
    },
  };

  const { label, className, icon } = config[priority];

  return (
    <span className={clsx('badge', className)}>
      {icon}
      {label}
    </span>
  );
}

// ─── Meeting Status Badge ─────────────────────────────────────────────────────
export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const config: Record
    MeetingStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    SCHEDULED: {
      label: 'Scheduled',
      className: 'badge-ghost',
      icon: <Clock className="w-3 h-3" />,
    },
    RECORDING: {
      label: 'Recording',
      className: 'badge-danger',
      icon: (
        <span className="w-2 h-2 rounded-full bg-danger-400 animate-recording" />
      ),
    },
    PROCESSING: {
      label: 'Processing',
      className: 'badge-warning',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    REVIEW: {
      label: 'Needs Review',
      className: 'badge-primary',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    COMPLETED: {
      label: 'Completed',
      className: 'badge-success',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'badge-ghost',
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  const { label, className, icon } = config[status];

  return (
    <span className={clsx('badge', className)}>
      {icon}
      {label}
    </span>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
export function RoleBadge({ role }: { role: 'ADMIN' | 'MEMBER' }) {
  return (
    <span
      className={clsx(
        'badge',
        role === 'ADMIN' ? 'badge-primary' : 'badge-ghost'
      )}
    >
      {role === 'ADMIN' ? '👑 Admin' : 'Member'}
    </span>
  );
}

// ─── Deadline Badge ───────────────────────────────────────────────────────────
export function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) {
    return <span className="badge badge-ghost">No deadline</span>;
  }

  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isOverdue = diffMs < 0;
  const isDueToday = diffDays === 0;
  const isDueSoon = diffDays > 0 && diffDays <= 2;

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });

  if (isOverdue) {
    return (
      <span className="badge badge-danger">
        <AlertCircle className="w-3 h-3" />
        Overdue · {formatted}
      </span>
    );
  }

  if (isDueToday) {
    return (
      <span className="badge badge-warning">
        <Flame className="w-3 h-3" />
        Due today
      </span>
    );
  }

  if (isDueSoon) {
    return (
      <span className="badge badge-warning">
        <Clock className="w-3 h-3" />
        Due in {diffDays}d · {formatted}
      </span>
    );
  }

  return (
    <span className="badge badge-ghost">
      <Clock className="w-3 h-3" />
      {formatted}
    </span>
  );
}