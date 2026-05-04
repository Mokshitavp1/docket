import { useState } from 'react';
import { Mail, UserPlus, Shield, User } from 'lucide-react';
import Modal, { ModalBody, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import Button from '../ui/Button';
import { useInviteMember } from '../../hooks/useWorkspace';
import { WorkspaceRole } from '../../types';
import { clsx } from 'clsx';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [emailError, setEmailError] = useState('');

  const inviteMember = useInviteMember(workspaceId);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    try {
      await inviteMember.mutateAsync({ email: email.trim(), role });
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('MEMBER');
    setEmailError('');
    onClose();
  };

  const roleOptions: {
    value: WorkspaceRole;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: 'MEMBER',
      label: 'Member',
      description: 'Can view and participate in meetings. Sees only their assigned tasks.',
      icon: <User className="w-4 h-4" />,
    },
    {
      value: 'ADMIN',
      label: 'Admin',
      description: 'Full access. Can manage members, edit all tasks, and view everything.',
      icon: <Shield className="w-4 h-4" />,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Member"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          {/* Workspace context */}
          <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-xl
                          border border-dark-600">
            <div className="w-9 h-9 rounded-lg bg-gradient-brand flex items-center
                            justify-center text-white font-bold flex-shrink-0">
              {workspaceName[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-500">Inviting to workspace</p>
              <p className="text-sm font-semibold text-slate-200">{workspaceName}</p>
            </div>
          </div>

          {/* Email input */}
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            onBlur={() => validateEmail(email)}
            error={emailError}
            placeholder="colleague@company.com"
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoFocus
          />

          {/* Role selector */}
          <div className="form-group">
            <label className="form-label">Role</label>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={clsx(
                    'flex flex-col items-start gap-2 p-3.5 rounded-xl border-2',
                    'text-left transition-all duration-150',
                    role === option.value
                      ? 'border-primary-500 bg-primary-900/20'
                      : 'border-dark-600 bg-dark-700/30 hover:border-dark-500'
                  )}
                >
                  <div className={clsx(
                    'flex items-center gap-2',
                    role === option.value ? 'text-primary-300' : 'text-slate-400'
                  )}>
                    {option.icon}
                    <span className="text-sm font-semibold">{option.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="alert-info">
            <p className="text-xs text-primary-300">
              📧 The user must already have a MeetingBrain account. They'll
              receive an email notification about being added to this workspace.
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={inviteMember.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={inviteMember.isPending}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add Member
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}