import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Calendar,
  Bell,
  Shield,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';
import {
  getCalendarAuthUrl,
  getCalendarStatus,
  disconnectCalendar,
} from '../services/taskService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

// ─── Section wrapper ──────────────────────────────────────────────────────────
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {description && (
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, updateProfile, isUpdatingProfile, changePassword, isChangingPassword } = useAuth();

  // ── Profile state ──────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [nameError, setNameError] = useState('');

  // ── Password state ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // ── Delete account state ───────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // ── Calendar state ─────────────────────────────────────────────────────────
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isDisconnectingCalendar, setIsDisconnectingCalendar] = useState(false);

  // ── Calendar status query ──────────────────────────────────────────────────
  const { data: calendarData, refetch: refetchCalendar } = useQuery({
    queryKey: ['calendar-status'],
    queryFn: getCalendarStatus,
    staleTime: 60 * 1000,
  });

  const isCalendarConnected = calendarData?.isConnected || false;

  // ── Handle calendar OAuth callback ────────────────────────────────────────
  useEffect(() => {
    const calendarStatus = searchParams.get('calendar');
    const message = searchParams.get('message');

    if (calendarStatus === 'success') {
      toast.success('Google Calendar connected successfully!');
      refetchCalendar();
    } else if (calendarStatus === 'error') {
      toast.error(message || 'Failed to connect Google Calendar.');
    }
  }, [searchParams, refetchCalendar]);

  // ── Sync name from user ────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  // ── Update profile ─────────────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Name is required.');
      return;
    }
    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      return;
    }
    setNameError('');
    updateProfile({ name: name.trim() });
  };

  // ── Change password ────────────────────────────────────────────────────────
  const validatePassword = (): boolean => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.current = 'Current password is required.';
    if (!newPassword) {
      errors.new = 'New password is required.';
    } else if (newPassword.length < 8) {
      errors.new = 'Must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      errors.new = 'Must contain uppercase, lowercase, and a number.';
    }
    if (!confirmNewPassword) {
      errors.confirm = 'Please confirm your new password.';
    } else if (newPassword !== confirmNewPassword) {
      errors.confirm = 'Passwords do not match.';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    try {
      await (changePassword as any)({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordErrors({});
    } catch {
      // Error handled by hook
    }
  };

  // ── Google Calendar ────────────────────────────────────────────────────────
  const handleConnectCalendar = async () => {
    setIsConnectingCalendar(true);
    try {
      const url = await getCalendarAuthUrl();
      window.location.href = url;
    } catch {
      toast.error('Failed to get authorization URL.');
      setIsConnectingCalendar(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!window.confirm('Disconnect Google Calendar?')) return;
    setIsDisconnectingCalendar(true);
    try {
      await disconnectCalendar();
      queryClient.invalidateQueries({ queryKey: ['calendar-status'] });
    } catch {
      // Error handled by service
    } finally {
      setIsDisconnectingCalendar(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {/* ── Profile section ── */}
      <SettingsSection
        title="Profile"
        description="Update your personal information"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-4 p-4 bg-dark-700/30 rounded-xl
                          border border-dark-600">
            <div className="w-14 h-14 rounded-full bg-gradient-brand flex items-center
                            justify-center text-white text-xl font-bold flex-shrink-0">
              {name.trim()
                ? name.trim()[0].toUpperCase()
                : user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {name.trim() || user?.name}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            error={nameError}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="form-input pl-9 w-full opacity-60 cursor-not-allowed"
              />
            </div>
            <p className="form-hint">Email cannot be changed after registration.</p>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={isUpdatingProfile}
          >
            Save Changes
          </Button>
        </form>
      </SettingsSection>

      {/* ── Password section ── */}
      <SettingsSection
        title="Security"
        description="Change your password to keep your account secure"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (passwordErrors.current)
                setPasswordErrors((p) => ({ ...p, current: '' }));
            }}
            error={passwordErrors.current}
            leftIcon={<Lock className="w-4 h-4" />}
            autoComplete="current-password"
          />

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (passwordErrors.new)
                setPasswordErrors((p) => ({ ...p, new: '' }));
            }}
            error={passwordErrors.new}
            leftIcon={<Lock className="w-4 h-4" />}
            autoComplete="new-password"
            hint="Min 8 chars with uppercase, lowercase, and number"
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => {
              setConfirmNewPassword(e.target.value);
              if (passwordErrors.confirm)
                setPasswordErrors((p) => ({ ...p, confirm: '' }));
            }}
            error={passwordErrors.confirm}
            leftIcon={<Lock className="w-4 h-4" />}
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            loading={isChangingPassword}
            leftIcon={<Shield className="w-4 h-4" />}
          >
            Update Password
          </Button>
        </form>
      </SettingsSection>

      {/* ── Google Calendar ── */}
      <SettingsSection
        title="Integrations"
        description="Connect external services to enhance your workflow"
      >
        <div className="flex items-center justify-between p-4 bg-dark-700/30
                        rounded-xl border border-dark-600">
          <div className="flex items-center gap-3">
            {/* Google Calendar icon */}
            <div className="w-10 h-10 rounded-xl bg-white flex items-center
                            justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path fill="#4285F4" d="M20 3h-1V1h-2v2H7V1H5v2H4C2.9 3 2 3.9 2 5v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
                <path fill="#EA4335" d="M11 17h2v-6h-3v2h1z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Google Calendar
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isCalendarConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-success-400" />
                    <span className="text-xs text-success-400">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs text-slate-500">Not connected</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {isCalendarConnected ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDisconnectCalendar}
              loading={isDisconnectingCalendar}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnectCalendar}
              loading={isConnectingCalendar}
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Connect
            </Button>
          )}
        </div>

        {isCalendarConnected && (
          <p className="text-xs text-slate-500 mt-3">
            ✅ Task deadlines will be automatically added to your Google Calendar
            when tasks are confirmed.
          </p>
        )}

        {!isCalendarConnected && (
          <p className="text-xs text-slate-500 mt-3">
            Connect Google Calendar to automatically add task deadlines and
            meeting events to your calendar.
          </p>
        )}
      </SettingsSection>

      {/* ── Notifications section ── */}
      <SettingsSection
        title="Notifications"
        description="Configure how and when you receive notifications"
      >
        <div className="space-y-3">
          {[
            {
              label: 'Task assignments',
              desc: 'When you are assigned a new task',
              defaultOn: true,
            },
            {
              label: 'Deadline reminders',
              desc: '24 hours before a task is due',
              defaultOn: true,
            },
            {
              label: 'Overdue alerts',
              desc: 'When a task passes its deadline',
              defaultOn: true,
            },
            {
              label: 'Meeting invites',
              desc: 'When added to a workspace',
              defaultOn: true,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3 border-b
                         border-dark-700 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              {/* Toggle — purely visual for MVP */}
              <button
                className={clsx(
                  'relative w-10 h-5.5 rounded-full transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  'focus:ring-offset-dark-800',
                  item.defaultOn ? 'bg-primary-600' : 'bg-dark-600'
                )}
              >
                <span
                  className={clsx(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow',
                    'transition-transform duration-200',
                    item.defaultOn ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── Account info ── */}
      <SettingsSection title="Account Information">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-dark-700">
            <span className="text-slate-400">Account ID</span>
            <span className="text-slate-300 font-mono text-xs">
              {user?.id?.slice(0, 12)}...
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-dark-700">
            <span className="text-slate-400">Member since</span>
            <span className="text-slate-300">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">Workspaces</span>
            <span className="text-slate-300">
              {user?._count?.ownedWorkspaces || 0} owned ·{' '}
              {user?._count?.memberships || 0} joined
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* ── Danger zone ── */}
      <SettingsSection title="Danger Zone">
        <div className="space-y-4">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between p-4 rounded-xl
                            border border-danger-800/30 bg-danger-900/10">
              <div>
                <p className="text-sm font-semibold text-danger-300">
                  Delete Account
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-danger-700 bg-danger-900/20 space-y-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-danger-300">
                    This action is irreversible
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    All your workspaces, meetings, tasks, and data will be
                    permanently deleted. This cannot be undone.
                  </p>
                </div>
              </div>

              <Input
                label="Enter your password to confirm"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your current password"
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!deletePassword}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    if (!deletePassword) return;
                    const { deleteAccount } = await import('../services/authService');
                    await deleteAccount(deletePassword);
                  }}
                >
                  Permanently Delete Account
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}