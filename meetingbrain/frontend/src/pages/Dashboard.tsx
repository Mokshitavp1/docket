import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWorkspaces } from '../hooks/useWorkspace';
import { useMyTasks } from '../hooks/useMeeting';
import { MeetingStatusBadge, TaskPriorityBadge, DeadlineBadge } from '../components/ui/Badge';
import { PageLoading, CardSkeleton } from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

// ─── Stat card component ──────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color,
  change,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  change?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : {}}
      onClick={onClick}
      className={clsx(
        'card p-5 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-dark-600 hover:shadow-medium'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          color
        )}>
          {icon}
        </div>
        {change && (
          <span className="text-xs text-success-400 font-medium">{change}</span>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-50 tabular-nums">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-slate-300">{title}</h2>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs text-primary-400 hover:text-primary-300
                     transition-colors flex items-center gap-1"
        >
          {action.label}
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const { tasks, grouped, isLoading: loadingTasks } = useMyTasks();

  const isLoading = loadingWorkspaces || loadingTasks;

  // ── Derived stats ──────────────────────────────────────────────────────────
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) =>
      t.deadline &&
      isBefore(new Date(t.deadline), now) &&
      t.status !== 'COMPLETED' &&
      t.status !== 'CANCELLED'
  );

  const upcomingTasks = tasks
    .filter(
      (t) =>
        t.deadline &&
        isAfter(new Date(t.deadline), now) &&
        isBefore(new Date(t.deadline), addDays(now, 7)) &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED'
    )
    .sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
    )
    .slice(0, 5);

  const recentWorkspaces = workspaces.slice(0, 4);

  const totalMeetings = workspaces.reduce(
    (sum, w) => sum + w._count.meetings,
    0
  );

  if (isLoading) return <PageLoading message="Loading dashboard..." />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* ── Welcome header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">
            Good{' '}
            {new Date().getHours() < 12
              ? 'morning'
              : new Date().getHours() < 17
              ? 'afternoon'
              : 'evening'}
            , {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Here's what's happening across your workspaces.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/workspaces')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Meeting
        </Button>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Workspaces"
          value={workspaces.length}
          icon={<Building2 className="w-5 h-5 text-primary-400" />}
          color="bg-primary-900/30"
          onClick={() => navigate('/workspaces')}
        />
        <StatCard
          label="Total Meetings"
          value={totalMeetings}
          icon={<Calendar className="w-5 h-5 text-violet-400" />}
          color="bg-violet-900/30"
        />
        <StatCard
          label="Pending Tasks"
          value={grouped.pending.length + grouped.inProgress.length}
          icon={<CheckSquare className="w-5 h-5 text-warning-400" />}
          color="bg-warning-900/30"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          label="Overdue"
          value={overdueTasks.length}
          icon={<AlertTriangle className="w-5 h-5 text-danger-400" />}
          color="bg-danger-900/30"
          onClick={() => navigate('/tasks')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming deadlines */}
          <div>
            <SectionHeader
              title="Upcoming Deadlines"
              action={{
                label: 'View all tasks',
                onClick: () => navigate('/tasks'),
              }}
            />

            {upcomingTasks.length === 0 ? (
              <div className="card p-6 text-center">
                <CheckSquare className="w-8 h-8 text-dark-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  No upcoming deadlines in the next 7 days. 
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate('/tasks')}
                    className="card-hover p-4 flex items-center gap-3"
                  >
                    {/* Priority dot */}
                    <div className={clsx(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      task.priority === 'URGENT' ? 'bg-danger-400' :
                      task.priority === 'HIGH' ? 'bg-orange-400' :
                      task.priority === 'MEDIUM' ? 'bg-warning-400' :
                      'bg-slate-500'
                    )} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {task.meeting?.workspace?.name} ·{' '}
                        {task.meeting?.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TaskPriorityBadge priority={task.priority} />
                      <DeadlineBadge deadline={task.deadline} />
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue tasks */}
          {overdueTasks.length > 0 && (
            <div>
              <SectionHeader
                title={`⚠️ Overdue Tasks (${overdueTasks.length})`}
                action={{
                  label: 'View all',
                  onClick: () => navigate('/tasks'),
                }}
              />
              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate('/tasks')}
                    className="card-hover p-4 border-danger-800/30 flex items-center gap-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-danger-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-danger-400 mt-0.5">
                        Overdue ·{' '}
                        {formatDistanceToNow(new Date(task.deadline!), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Task progress */}
          <div>
            <SectionHeader title="Task Progress" />
            <div className="card p-5 space-y-4">
              {/* Completion rate */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">Completion Rate</span>
                  <span className="font-semibold text-slate-200">
                    {tasks.length > 0
                      ? Math.round(
                          (grouped.completed.length / tasks.length) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="progress h-2">
                  <div
                    className="progress-bar bg-success-500"
                    style={{
                      width: `${
                        tasks.length > 0
                          ? (grouped.completed.length / tasks.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Status breakdown */}
              {[
                {
                  label: 'Pending',
                  count: grouped.pending.length,
                  color: 'bg-slate-500',
                },
                {
                  label: 'In Progress',
                  count: grouped.inProgress.length,
                  color: 'bg-primary-500',
                },
                {
                  label: 'Completed',
                  count: grouped.completed.length,
                  color: 'bg-success-500',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={clsx('w-2 h-2 rounded-full', item.color)} />
                  <span className="text-sm text-slate-400 flex-1">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent workspaces */}
          <div>
            <SectionHeader
              title="Your Workspaces"
              action={{
                label: 'View all',
                onClick: () => navigate('/workspaces'),
              }}
            />

            {recentWorkspaces.length === 0 ? (
              <div className="card p-5 text-center">
                <Building2 className="w-7 h-7 text-dark-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-3">
                  No workspaces yet
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/workspaces')}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Create Workspace
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentWorkspaces.map((ws, i) => (
                  <motion.button
                    key={ws.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/workspaces/${ws.id}`)}
                    className="w-full card-hover p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center
                                    justify-center text-white text-sm font-bold flex-shrink-0">
                      {ws.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {ws.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ws._count.members} members · {ws._count.meetings}{' '}
                        meetings
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Quick tip */}
          <div className="card p-4 bg-primary-900/10 border-primary-800/30">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-900/50 flex items-center
                              justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary-300 mb-1">
                  💡 Quick Tip
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start a meeting in any workspace and speak naturally — AI will
                  automatically extract tasks and assign them to your team
                  members.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}