import { useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { useMyTasks, useUpdateTask } from '../../hooks/useMeeting';
import TaskCard from '../../components/tasks/TaskCard';
import TaskEditModal from '../../components/tasks/TaskEditModal';
import { PageLoading } from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { Task, TaskStatus, TaskPriority, WorkspaceMember } from '../../types';
import { useWorkspaces } from '../../hooks/useWorkspace';
import { isAfter, isBefore, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { deleteTask } from '../../services/taskService';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

type FilterStatus = 'ALL' | TaskStatus;
type FilterPriority = 'ALL' | TaskPriority;
type SortOption = 'deadline' | 'priority' | 'created' | 'status';

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
        'font-medium transition-all duration-150',
        active
          ? 'border-primary-500 bg-primary-900/20 text-primary-300'
          : 'border-dark-600 bg-dark-800 text-slate-400 hover:border-dark-500 hover:text-slate-200'
      )}
    >
      <span className={clsx('w-2 h-2 rounded-full', color)} />
      {label}
      <span className={clsx(
        'text-xs px-1.5 py-0.5 rounded-full font-semibold',
        active ? 'bg-primary-800/50 text-primary-200' : 'bg-dark-700 text-slate-400'
      )}>
        {count}
      </span>
    </button>
  );
}

export default function MyTasks() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { tasks, grouped, isLoading } = useMyTasks();
  const { workspaces } = useWorkspaces();
  const updateTask = useUpdateTask();

  // ── Gather all workspace members for edit modal ───────────────────────────
  const allMembers: WorkspaceMember[] = workspaces.flatMap((w) => w.members);

  // ── Filter and sort ────────────────────────────────────────────────────────
  const now = new Date();

  const filteredTasks = tasks
    .filter((task) => {
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.meeting?.title?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'priority': {
          const order = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return order[a.priority] - order[b.priority];
        }
        case 'created':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'status': {
          const order = {
            IN_PROGRESS: 0,
            PENDING: 1,
            COMPLETED: 2,
            CANCELLED: 3,
          };
          return order[a.status] - order[b.status];
        }
        default:
          return 0;
      }
    });

  // ── Derived counts ─────────────────────────────────────────────────────────
  const overdueTasks = tasks.filter(
    (t) =>
      t.deadline &&
      isBefore(new Date(t.deadline), now) &&
      t.status !== 'COMPLETED' &&
      t.status !== 'CANCELLED'
  );

  const dueSoonTasks = tasks.filter(
    (t) =>
      t.deadline &&
      isAfter(new Date(t.deadline), now) &&
      isBefore(new Date(t.deadline), addDays(now, 2)) &&
      t.status !== 'COMPLETED' &&
      t.status !== 'CANCELLED'
  );

  // ── Delete task ────────────────────────────────────────────────────────────
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    } catch {
      // Error handled by service
    }
  };

  if (isLoading) return <PageLoading message="Loading tasks..." />;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* ── Header ── */}
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">
            {tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}{' '}
            active · {grouped.completed.length} completed
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] })}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* ── Alert banners ── */}
      {overdueTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert-danger mb-4"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}</span>
            {' — '}these need your immediate attention.
          </p>
        </motion.div>
      )}

      {dueSoonTasks.length > 0 && overdueTasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert-warning mb-4"
        >
          <Clock className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{dueSoonTasks.length} task{dueSoonTasks.length !== 1 ? 's' : ''} due soon</span>
            {' — '}within the next 48 hours.
          </p>
        </motion.div>
      )}

      {/* ── Quick stats ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        <StatPill
          label="All"
          count={tasks.length}
          color="bg-slate-400"
          active={statusFilter === 'ALL'}
          onClick={() => setStatusFilter('ALL')}
        />
        <StatPill
          label="Pending"
          count={grouped.pending.length}
          color="bg-slate-500"
          active={statusFilter === 'PENDING'}
          onClick={() => setStatusFilter('PENDING')}
        />
        <StatPill
          label="In Progress"
          count={grouped.inProgress.length}
          color="bg-primary-500"
          active={statusFilter === 'IN_PROGRESS'}
          onClick={() => setStatusFilter('IN_PROGRESS')}
        />
        <StatPill
          label="Completed"
          count={grouped.completed.length}
          color="bg-success-500"
          active={statusFilter === 'COMPLETED'}
          onClick={() => setStatusFilter('COMPLETED')}
        />
        {overdueTasks.length > 0 && (
          <StatPill
            label="Overdue"
            count={overdueTasks.length}
            color="bg-danger-500"
            active={false}
            onClick={() => {
              setStatusFilter('ALL');
              setSortBy('deadline');
            }}
          />
        )}
      </div>

      {/* ── Search & filters ── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="form-input pl-9 w-full"
          />
        </div>

        <button
          onClick={() => setShowFilters((prev) => !prev)}
          className={clsx(
            'btn-secondary flex items-center gap-2 flex-shrink-0',
            showFilters && 'border-primary-500 text-primary-300'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(priorityFilter !== 'ALL' || sortBy !== 'deadline') && (
            <span className="w-2 h-2 rounded-full bg-primary-500" />
          )}
        </button>
      </div>

      {/* ── Filter panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-5"
          >
            <div className="card p-4 flex flex-wrap gap-4">
              {/* Priority filter */}
              <div className="form-group">
                <label className="form-label text-xs">Priority</label>
                <div className="flex gap-2">
                  {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p as FilterPriority)}
                      className={clsx(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                        priorityFilter === p
                          ? 'border-primary-500 bg-primary-900/20 text-primary-300'
                          : 'border-dark-600 text-slate-400 hover:border-dark-500'
                      )}
                    >
                      {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="form-group">
                <label className="form-label text-xs">Sort By</label>
                <div className="flex gap-2">
                  {[
                    { value: 'deadline', label: 'Deadline' },
                    { value: 'priority', label: 'Priority' },
                    { value: 'created', label: 'Newest' },
                    { value: 'status', label: 'Status' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value as SortOption)}
                      className={clsx(
                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                        sortBy === opt.value
                          ? 'border-primary-500 bg-primary-900/20 text-primary-300'
                          : 'border-dark-600 text-slate-400 hover:border-dark-500'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setPriorityFilter('ALL');
                    setSortBy('deadline');
                    setSearchQuery('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty states ── */}
      {tasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state"
        >
          <div className="empty-state-icon">
            <CheckSquare className="w-8 h-8" />
          </div>
          <h3 className="empty-state-title">No tasks assigned yet</h3>
          <p className="empty-state-description">
            Tasks will appear here when you're assigned work from a meeting.
            Participate in a meeting to get started.
          </p>
        </motion.div>
      )}

      {tasks.length > 0 && filteredTasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="empty-state"
        >
          <div className="empty-state-icon">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="empty-state-title">No tasks match your filters</h3>
          <p className="empty-state-description">
            Try adjusting your search or filter criteria.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </motion.div>
      )}

      {/* ── Task list ── */}
      {filteredTasks.length > 0 && (
        <div className="space-y-2">
          {/* Overdue section */}
          {statusFilter === 'ALL' && overdueTasks.length > 0 && sortBy === 'deadline' && (
            <>
              <p className="text-xs font-semibold text-danger-400 uppercase tracking-wider px-1 mb-2 mt-1">
                ⚠️ Overdue ({overdueTasks.length})
              </p>
              {filteredTasks
                .filter(
                  (t) =>
                    t.deadline &&
                    isBefore(new Date(t.deadline), now) &&
                    t.status !== 'COMPLETED' &&
                    t.status !== 'CANCELLED'
                )
                .map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <TaskCard
                      task={task}
                      isAdminOrHost={false}
                      onEdit={setEditingTask}
                      onDelete={handleDeleteTask}
                      showMeetingInfo
                    />
                  </motion.div>
                ))}

              <div className="divider my-4" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
                Active Tasks
              </p>
            </>
          )}

          {/* Main task list */}
          {filteredTasks
            .filter((t) => {
              if (
                statusFilter === 'ALL' &&
                sortBy === 'deadline' &&
                overdueTasks.length > 0
              ) {
                return !(
                  t.deadline &&
                  isBefore(new Date(t.deadline), now) &&
                  t.status !== 'COMPLETED' &&
                  t.status !== 'CANCELLED'
                );
              }
              return true;
            })
            .map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TaskCard
                  task={task}
                  isAdminOrHost={false}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                  showMeetingInfo
                />
              </motion.div>
            ))}
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingTask && (
        <TaskEditModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          members={allMembers}
          isAdminOrHost={false}
        />
      )}
    </div>
  );
}