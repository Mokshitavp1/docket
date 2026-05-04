import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  UserPlus,
  Settings,
  Calendar,
  Users,
  Play,
  Upload,
  MoreVertical,
  Crown,
  Trash2,
  Shield,
  User,
} from 'lucide-react';
import { useWorkspace, useDeleteWorkspace, useRemoveMember, useUpdateMemberRole } from '../../hooks/useWorkspace';
import { useWorkspaceMeetings } from '../../hooks/useMeeting';
import { useAuthStore } from '../../store/authStore';
import InviteMemberModal from '../../components/workspace/InviteMemberModal';
import { MeetingStatusBadge, RoleBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoading } from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow, format } from 'date-fns';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export default function WorkspaceDetail() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<'meetings' | 'members'>('meetings');
  const [memberMenuOpen, setMemberMenuOpen] = useState<string | null>(null);

  const { workspace, currentUserRole, isLoading } = useWorkspace(workspaceId!);
  const { meetings, isLoading: meetingsLoading } = useWorkspaceMeetings(workspaceId!);
  const deleteWorkspace = useDeleteWorkspace();
  const removeMember = useRemoveMember(workspaceId!);
  const updateRole = useUpdateMemberRole(workspaceId!);

  if (isLoading) return <PageLoading message="Loading workspace..." />;
  if (!workspace) return (
    <div className="p-6 text-center text-slate-400">Workspace not found.</div>
  );

  const isAdmin =
    workspace.ownerId === user?.id || currentUserRole === 'ADMIN';

  const handleDeleteWorkspace = async () => {
    if (
      window.confirm(
        `Delete "${workspace.name}"? This will permanently delete all meetings and tasks.`
      )
    ) {
      deleteWorkspace.mutate(workspace.id);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (window.confirm(`Remove ${memberName} from this workspace?`)) {
      removeMember.mutate(memberId);
    }
    setMemberMenuOpen(null);
  };

  const handleRoleChange = async (
    memberId: string,
    role: 'ADMIN' | 'MEMBER'
  ) => {
    updateRole.mutate({ memberId, role });
    setMemberMenuOpen(null);
  };

  const tabs = [
    {
      id: 'meetings' as const,
      label: 'Meetings',
      count: workspace._count.meetings,
    },
    {
      id: 'members' as const,
      label: 'Members',
      count: workspace._count.members,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center
                          justify-center text-white text-2xl font-bold shadow-glow-sm">
            {workspace.name[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-50">
                {workspace.name}
              </h1>
              {workspace.ownerId === user?.id && (
                <Crown className="w-4 h-4 text-warning-400" />
              )}
            </div>
            {workspace.description && (
              <p className="text-sm text-slate-400 mt-0.5">
                {workspace.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>{workspace._count.members} members</span>
              <span>·</span>
              <span>{workspace._count.meetings} meetings</span>
              <span>·</span>
              <span>
                Created{' '}
                {formatDistanceToNow(new Date(workspace.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdmin && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowInvite(true)}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Invite
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  navigate(`/workspaces/${workspaceId}/meetings/new`)
                }
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                New Meeting
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-6 border-b border-dark-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
              'border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            {tab.label}
            <span className={clsx(
              'badge text-2xs',
              activeTab === tab.id ? 'badge-primary' : 'badge-ghost'
            )}>
              {tab.count}
            </span>
          </button>
        ))}

        {/* Delete workspace */}
        {isAdmin && workspace.ownerId === user?.id && (
          <button
            onClick={handleDeleteWorkspace}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs
                       text-slate-500 hover:text-danger-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Workspace
          </button>
        )}
      </div>

      {/* ── Meetings tab ── */}
      {activeTab === 'meetings' && (
        <div className="space-y-3">
          {meetingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-1/3 rounded" />
                      <div className="skeleton h-3 w-1/4 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="empty-state"
            >
              <div className="empty-state-icon">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="empty-state-title">No meetings yet</h3>
              <p className="empty-state-description">
                Start your first AI-powered meeting. Transcription and task
                extraction happen automatically.
              </p>
              {isAdmin && (
                <Button
                  variant="primary"
                  onClick={() =>
                    navigate(`/workspaces/${workspaceId}/meetings/new`)
                  }
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="mt-6"
                >
                  Start First Meeting
                </Button>
              )}
            </motion.div>
          ) : (
            meetings.map((meeting, i) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/meetings/${meeting.id}`)}
                className="card-hover p-4 flex items-center gap-4"
              >
                {/* Icon */}
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  meeting.status === 'COMPLETED'
                    ? 'bg-success-900/30'
                    : meeting.status === 'RECORDING'
                    ? 'bg-danger-900/30'
                    : meeting.status === 'REVIEW'
                    ? 'bg-warning-900/30'
                    : 'bg-dark-700'
                )}>
                  <Calendar className={clsx(
                    'w-5 h-5',
                    meeting.status === 'COMPLETED'
                      ? 'text-success-400'
                      : meeting.status === 'RECORDING'
                      ? 'text-danger-400'
                      : meeting.status === 'REVIEW'
                      ? 'text-warning-400'
                      : 'text-slate-400'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {meeting.title}
                    </p>
                    <MeetingStatusBadge status={meeting.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>by {meeting.host.name}</span>
                    <span>·</span>
                    <span>
                      {format(new Date(meeting.createdAt), 'MMM d, yyyy')}
                    </span>
                    {meeting._count && (
                      <>
                        <span>·</span>
                        <span>{meeting._count.tasks} tasks</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action hints */}
                {meeting.status === 'REVIEW' && isAdmin && (
                  <span className="badge-warning text-2xs flex-shrink-0">
                    Needs Review
                  </span>
                )}
                {meeting.status === 'SCHEDULED' && isAdmin && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/meetings/${meeting.id}`);
                    }}
                    leftIcon={<Play className="w-3 h-3" />}
                  >
                    Start
                  </Button>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ── Members tab ── */}
      {activeTab === 'members' && (
        <div className="space-y-2">
          {workspace.members.map((member, i) => {
            const isOwner = workspace.ownerId === member.userId;
            const isSelf = member.userId === user?.id;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card p-4 flex items-center gap-3"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center
                                justify-center text-white font-bold flex-shrink-0">
                  {member.user.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-200">
                      {member.user.name}
                      {isSelf && (
                        <span className="text-slate-500 font-normal"> (you)</span>
                      )}
                    </p>
                    {isOwner && <Crown className="w-3.5 h-3.5 text-warning-400" />}
                    <RoleBadge role={isOwner ? 'ADMIN' : member.role} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {member.user.email} ·{' '}
                    Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Member actions */}
                {isAdmin && !isOwner && !isSelf && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setMemberMenuOpen(
                          memberMenuOpen === member.userId ? null : member.userId
                        )
                      }
                      className="btn-icon text-slate-400 hover:text-slate-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {memberMenuOpen === member.userId && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMemberMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-9 w-48 bg-dark-800
                                        border border-dark-700 rounded-xl shadow-strong
                                        z-20 py-1 overflow-hidden">
                          {member.role === 'MEMBER' ? (
                            <button
                              onClick={() =>
                                handleRoleChange(member.userId, 'ADMIN')
                              }
                              className="w-full flex items-center gap-2.5 px-3 py-2
                                         text-sm text-slate-300 hover:bg-dark-700"
                            >
                              <Shield className="w-4 h-4 text-primary-400" />
                              Promote to Admin
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleRoleChange(member.userId, 'MEMBER')
                              }
                              className="w-full flex items-center gap-2.5 px-3 py-2
                                         text-sm text-slate-300 hover:bg-dark-700"
                            >
                              <User className="w-4 h-4 text-slate-400" />
                              Demote to Member
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleRemoveMember(
                                member.userId,
                                member.user.name
                              )
                            }
                            className="w-full flex items-center gap-2.5 px-3 py-2
                                       text-sm text-danger-400 hover:bg-danger-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove Member
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Leave option for self */}
                {!isOwner && isSelf && (
                  <button
                    onClick={() =>
                      handleRemoveMember(member.userId, 'yourself')
                    }
                    className="text-xs text-slate-500 hover:text-danger-400 transition-colors"
                  >
                    Leave
                  </button>
                )}
              </motion.div>
            );
          })}

          {/* Invite more */}
          {isAdmin && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowInvite(true)}
              className="w-full card border-dashed border-dark-600 hover:border-primary-600/40
                         hover:bg-primary-900/5 transition-all duration-200 p-4
                         flex items-center justify-center gap-2
                         text-slate-500 hover:text-primary-400"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-sm font-medium">Invite Team Member</span>
            </motion.button>
          )}
        </div>
      )}

      {/* ── Invite modal ── */}
      <InviteMemberModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        workspaceId={workspaceId!}
        workspaceName={workspace.name}
      />
    </div>
  );
}