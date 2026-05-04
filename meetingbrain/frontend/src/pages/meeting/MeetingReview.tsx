import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Trash2,
  Plus,
  AlertCircle,
  Brain,
  Send,
  User,
  Calendar,
  Flag,
} from 'lucide-react';
import { useMeeting, useConfirmTasks } from '../../hooks/useMeeting';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuthStore } from '../../store/authStore';
import { TaskConfirmInput, TaskPriority, WorkspaceMember } from '../../types';
import { Input, Textarea, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { TaskPriorityBadge, DeadlineBadge } from '../../components/ui/Badge';
import MoMViewer from '../../components/mom/MoMViewer';
import { PageLoading } from '../../components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface EditableTask extends TaskConfirmInput {
  isEditing: boolean;
  isNew?: boolean;
}

export default function MeetingReview() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { meeting, isAdminOrHost, isLoading } = useMeeting(meetingId!);
  const confirmTasks = useConfirmTasks(meetingId!);
  const { workspace } = useWorkspace(meeting?.workspaceId || '');

  const [tasks, setTasks] = useState<EditableTask[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'mom'>('tasks');
  const [initialized, setInitialized] = useState(false);

  // ── Initialize editable tasks from meeting data ────────────────────────────
  useEffect(() => {
    if (meeting?.tasks && !initialized) {
      setTasks(
        meeting.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          assigneeId: t.assigneeId,
          deadline: t.deadline,
          priority: t.priority,
          isEditing: false,
        }))
      );
      setInitialized(true);
    }
  }, [meeting?.tasks, initialized]);

  if (isLoading) return <PageLoading message="Loading review..." />;
  if (!meeting) return <div className="p-6 text-center text-slate-400">Meeting not found.</div>;

  if (!isAdminOrHost) {
    navigate(`/meetings/${meetingId}`);
    return null;
  }

  const members = workspace?.members || [];

  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...members.map((m) => ({ value: m.userId, label: m.user.name })),
  ];

  const priorityOptions = [
    { value: 'LOW', label: '↓ Low' },
    { value: 'MEDIUM', label: '— Medium' },
    { value: 'HIGH', label: '↑ High' },
    { value: 'URGENT', label: '🔥 Urgent' },
  ];

  // ── Task actions ───────────────────────────────────────────────────────────
  const updateTask = (id: string, updates: Partial<EditableTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = () => {
    const newTask: EditableTask = {
      id: `new-${Date.now()}`,
      title: '',
      description: '',
      assigneeId: null,
      deadline: null,
      priority: 'MEDIUM',
      isEditing: true,
      isNew: true,
    };
    setTasks((prev) => [...prev, newTask]);
  };

  // ── Confirm all tasks ──────────────────────────────────────────────────────
  const handleConfirm = async () => {
    // Validate tasks
    const invalidTasks = tasks.filter((t) => !t.title.trim() || !t.description.trim());
    if (invalidTasks.length > 0) {
      toast.error('Please fill in title and description for all tasks.');
      setTasks((prev) =>
        prev.map((t) =>
          !t.title.trim() || !t.description.trim()
            ? { ...t, isEditing: true }
            : t
        )
      );
      return;
    }

    if (tasks.length === 0) {
      toast.error('No tasks to confirm.');
      return;
    }

    const payload: TaskConfirmInput[] = tasks.map((t) => ({
      id: t.id,
      title: t.title.trim(),
      description: t.description.trim(),
      assigneeId: t.assigneeId || null,
      deadline: t.deadline || null,
      priority: t.priority,
    }));

    await confirmTasks.mutateAsync(payload);
  };

  const assigneeName = (id: string | null) => {
    if (!id) return 'Unassigned';
    const member = members.find((m) => m.userId === id);
    return member?.user.name || 'Unknown';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* ── Back ── */}
      <button
        onClick={() => navigate(`/meetings/${meetingId}`)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200
                   transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Meeting
      </button>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-warning-900/30 border border-warning-800/30
                            flex items-center justify-center">
              <Brain className="w-5 h-5 text-warning-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-50">Review & Confirm</h1>
          </div>
          <p className="text-slate-400 text-sm">
            {meeting.title} · {tasks.length} task{tasks.length !== 1 ? 's' : ''} extracted
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleConfirm}
          loading={confirmTasks.isPending}
          leftIcon={<Send className="w-4 h-4" />}
          size="lg"
        >
          Confirm & Send
        </Button>
      </div>

      {/* ── Info banner ── */}
      <div className="alert-info mb-6">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-primary-400" />
        <div className="text-xs text-primary-300 space-y-1">
          <p className="font-medium">Review before confirming</p>
          <p>
            Edit tasks, assign members, and set deadlines. Once confirmed, emails
            will be sent to all assignees and tasks will appear on their dashboards.
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-6 border-b border-dark-700">
        {[
          { id: 'tasks' as const, label: `Tasks (${tasks.length})` },
          { id: 'mom' as const, label: 'Minutes of Meeting', show: !!meeting.mom },
        ]
          .filter((t) => t.show !== false)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
      </div>

      {/* ── Tasks tab ── */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16, height: 0 }}
                transition={{ duration: 0.2 }}
                className="card overflow-hidden"
              >
                {task.isEditing ? (
                  /* ── Edit mode ── */
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Task {index + 1}
                      </span>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="btn-icon text-slate-500 hover:text-danger-400 w-7 h-7"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <Input
                      label="Task Title"
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      placeholder="What needs to be done?"
                      required
                    />

                    <Textarea
                      label="Description"
                      value={task.description}
                      onChange={(e) =>
                        updateTask(task.id, { description: e.target.value })
                      }
                      placeholder="Detailed description with context..."
                      rows={3}
                      required
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Assign To"
                        value={task.assigneeId || ''}
                        onChange={(e) =>
                          updateTask(task.id, {
                            assigneeId: e.target.value || null,
                          })
                        }
                        options={memberOptions}
                      />
                      <Select
                        label="Priority"
                        value={task.priority}
                        onChange={(e) =>
                          updateTask(task.id, {
                            priority: e.target.value as TaskPriority,
                          })
                        }
                        options={priorityOptions}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Deadline</label>
                      <input
                        type="datetime-local"
                        value={
                          task.deadline
                            ? format(
                                new Date(task.deadline),
                                "yyyy-MM-dd'T'HH:mm"
                              )
                            : ''
                        }
                        onChange={(e) =>
                          updateTask(task.id, {
                            deadline: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          })
                        }
                        className="form-input"
                      />
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateTask(task.id, { isEditing: false })}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Done Editing
                    </Button>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-900/40 border border-primary-800/40
                                      flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-2xs font-bold text-primary-400">
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 mb-1">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">
                          {task.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <TaskPriorityBadge priority={task.priority} />
                          <DeadlineBadge deadline={task.deadline} />

                          {/* Assignee */}
                          <div className="flex items-center gap-1.5">
                            <div className={clsx(
                              'w-4 h-4 rounded-full flex items-center justify-center',
                              task.assigneeId
                                ? 'bg-gradient-brand'
                                : 'bg-dark-600'
                            )}>
                              <User className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className={clsx(
                              'text-xs',
                              task.assigneeId ? 'text-slate-300' : 'text-slate-500'
                            )}>
                              {assigneeName(task.assigneeId)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => updateTask(task.id, { isEditing: true })}
                          className="btn-icon text-slate-400 hover:text-slate-100 w-7 h-7"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeTask(task.id)}
                          className="btn-icon text-slate-400 hover:text-danger-400 w-7 h-7"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add task button */}
          <button
            onClick={addTask}
            className="w-full card border-dashed border-dark-600 hover:border-primary-600/40
                       hover:bg-primary-900/5 transition-all p-4
                       flex items-center justify-center gap-2
                       text-slate-500 hover:text-primary-400"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Task Manually</span>
          </button>

          {/* Bottom confirm */}
          {tasks.length > 0 && (
            <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-dark-900 to-transparent">
              <Button
                variant="primary"
                onClick={handleConfirm}
                loading={confirmTasks.isPending}
                className="w-full"
                size="lg"
                leftIcon={<Send className="w-5 h-5" />}
              >
                Confirm {tasks.length} Task{tasks.length !== 1 ? 's' : ''} & Notify Assignees
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── MoM tab ── */}
      {activeTab === 'mom' && meeting.mom && (
        <MoMViewer mom={meeting.mom} showRaw />
      )}
    </div>
  );
}