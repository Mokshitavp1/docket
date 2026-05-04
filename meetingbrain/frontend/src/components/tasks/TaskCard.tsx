import { useState } from 'react';
import {
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  ExternalLink,
  CalendarPlus,
} from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { TaskStatusBadge, TaskPriorityBadge, DeadlineBadge } from '../ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { useUpdateTask } from '../../hooks/useMeeting';
import { addTaskToCalendar } from '../../services/taskService';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface TaskCardProps {
  task: Task;
  isAdminOrHost?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  showMeetingInfo?: boolean;
  compact?: boolean;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function TaskCard({
  task,
  isAdminOrHost = false,
  onEdit,
  onDelete,
  showMeetingInfo = false,
  compact = false,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const { user } = useAuthStore();
  const updateTask = useUpdateTask();

  const isAssignee = task.assigneeId === user?.id;
  const canEdit = isAdminOrHost || isAssignee;
  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELLED';

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!canEdit) return;
    setIsUpdatingStatus(true);
    try {
      await updateTask.mutateAsync({ taskId: task.id, data: { status: newStatus } });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddToCalendar = async () => {
    setIsAddingToCalendar(true);
    try {
      await addTaskToCalendar(task.id);
    } catch {
      // Error handled by service
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  return (
    <div
      className={clsx(
        'card transition-all duration-200',
        isOverdue && 'border-danger-800/40',
        task.status === 'COMPLETED' && 'opacity-70'
      )}
    >
      <div className={clsx('p-4', compact && 'p-3')}>
        {/* ── Top row ── */}
        <div className="flex items-start gap-3">
          {/* Status checkbox / selector */}
          <div className="flex-shrink-0 mt-0.5">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              disabled={!canEdit || isUpdatingStatus}
              className={clsx(
                'w-5 h-5 rounded border cursor-pointer appearance-none',
                'bg-transparent border-dark-500 text-transparent',
                'focus:outline-none focus:ring-1 focus:ring-primary-500',
                task.status === 'COMPLETED' && 'bg-success-600 border-success-600',
                task.status === 'IN_PROGRESS' && 'bg-primary-600/30 border-primary-600',
                task.status === 'CANCELLED' && 'bg-dark-700 border-dark-600',
                !canEdit && 'cursor-not-allowed'
              )}
              title="Update status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-dark-800 text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <h4
                className={clsx(
                  'text-sm font-semibold text-slate-200 leading-snug',
                  task.status === 'COMPLETED' && 'line-through text-slate-400',
                  task.status === 'CANCELLED' && 'line-through text-slate-500'
                )}
              >
                {task.title}
              </h4>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAdminOrHost && onEdit && (
                  <button
                    onClick={() => onEdit(task)}
                    className="btn-icon text-slate-500 hover:text-slate-200 w-7 h-7"
                    title="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {isAdminOrHost && onDelete && (
                  <button
                    onClick={() => onDelete(task.id)}
                    className="btn-icon text-slate-500 hover:text-danger-400 w-7 h-7"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setExpanded((prev) => !prev)}
                  className="btn-icon text-slate-500 hover:text-slate-200 w-7 h-7"
                  title={expanded ? 'Collapse' : 'Expand'}
                >
                  {expanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
              {task.deadline && (
                <DeadlineBadge deadline={task.deadline} />
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {/* Assignee */}
              {task.assignee && (
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-gradient-brand flex items-center
                                  justify-center text-white text-2xs font-bold flex-shrink-0">
                    {task.assignee.name[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-400">
                    {task.assignee.id === user?.id ? 'You' : task.assignee.name}
                  </span>
                </div>
              )}

              {!task.assignee && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <User className="w-3 h-3" />
                  <span className="text-xs">Unassigned</span>
                </div>
              )}

              {/* Meeting info */}
              {showMeetingInfo && task.meeting && (
                <span className="text-xs text-slate-500">
                  from <span className="text-slate-400">{task.meeting.title}</span>
                </span>
              )}

              {/* Created at */}
              <span className="text-xs text-slate-600 ml-auto">
                {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Expanded description ── */}
        {expanded && (
          <div className="mt-4 ml-8 space-y-3">
            <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Status dropdown */}
              {canEdit && (
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={isUpdatingStatus}
                  className="form-select text-xs py-1.5 px-2.5 h-auto"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Add to calendar */}
              {isAssignee && task.deadline && !task.calendarEventId && (
                <button
                  onClick={handleAddToCalendar}
                  disabled={isAddingToCalendar}
                  className="btn-secondary btn-sm flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Add to Calendar
                </button>
              )}

              {task.calendarEventId && (
                <span className="badge-success text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  In Calendar
                </span>
              )}

              {/* Meeting link */}
              {task.meeting && (
                
                  href={`/meetings/${task.meetingId}`}
                  className="btn-ghost btn-sm flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Meeting
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}