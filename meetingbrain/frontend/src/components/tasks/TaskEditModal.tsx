import { useState, useEffect } from 'react';
import { Calendar, User } from 'lucide-react';
import Modal, { ModalBody, ModalFooter } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/Input';
import Button from '../ui/Button';
import { Task, TaskPriority, TaskStatus, WorkspaceMember } from '../../types';
import { useUpdateTask } from '../../hooks/useMeeting';
import { format } from 'date-fns';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  members: WorkspaceMember[];
  isAdminOrHost: boolean;
}

export default function TaskEditModal({
  isOpen,
  onClose,
  task,
  members,
  isAdminOrHost,
}: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [deadline, setDeadline] = useState(
    task.deadline
      ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm")
      : ''
  );
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateTask = useUpdateTask();

  // Sync when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setAssigneeId(task.assigneeId || '');
    setDeadline(
      task.deadline
        ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm")
        : ''
    );
    setPriority(task.priority);
    setStatus(task.status);
    setErrors({});
  }, [task]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (title.trim().length > 200) newErrors.title = 'Title too long.';
    if (!description.trim()) newErrors.description = 'Description is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        data: {
          title: title.trim(),
          description: description.trim(),
          assigneeId: assigneeId || null,
          deadline: deadline || null,
          priority,
          status,
        },
      });
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const priorityOptions = [
    { value: 'LOW', label: '↓ Low' },
    { value: 'MEDIUM', label: '— Medium' },
    { value: 'HIGH', label: '↑ High' },
    { value: 'URGENT', label: '🔥 Urgent' },
  ];

  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...members.map((m) => ({
      value: m.userId,
      label: m.user.name,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task" size="lg">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          {/* Title */}
          <Input
            label="Task Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((p) => ({ ...p, title: '' }));
            }}
            error={errors.title}
            placeholder="Clear, actionable task title"
            required
            disabled={!isAdminOrHost}
          />

          {/* Description */}
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((p) => ({ ...p, description: '' }));
            }}
            error={errors.description}
            placeholder="Detailed description of what needs to be done..."
            rows={4}
            required
            disabled={!isAdminOrHost}
          />

          {/* Status & Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              options={statusOptions}
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              options={priorityOptions}
              disabled={!isAdminOrHost}
            />
          </div>

          {/* Assignee & Deadline row */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              options={memberOptions}
              disabled={!isAdminOrHost}
            />
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="form-input"
                disabled={!isAdminOrHost}
              />
            </div>
          </div>

          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-dark-700/30 rounded-xl
                          border border-dark-600 text-xs text-slate-500">
            <div>
              <p className="font-medium text-slate-400 mb-0.5">Created by</p>
              <p>{task.createdBy?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-400 mb-0.5">Meeting</p>
              <p className="truncate">{task.meeting?.title || '—'}</p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={updateTask.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={updateTask.isPending}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}