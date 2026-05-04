import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Square,
  Clock,
  Users,
  CheckSquare,
  FileText,
  AlertCircle,
  Mic,
  ChevronRight,
} from 'lucide-react';
import { useMeeting, useStartMeeting, useEndMeeting, useDeleteMeeting } from '../../hooks/useMeeting';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuthStore } from '../../store/authStore';
import { useMeetingStore } from '../../store/meetingStore';
import MeetingRecorder from '../../components/meeting/MeetingRecorder';
import TranscriptViewer from '../../components/meeting/TranscriptViewer';
import TaskCard from '../../components/tasks/TaskCard';
import MoMViewer from '../../components/mom/MoMViewer';
import { MeetingStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoading, ProcessingAnimation } from '../../components/ui/LoadingSpinner';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

type Tab = 'recorder' | 'transcript' | 'tasks' | 'mom';

export default function MeetingDetail() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('recorder');

  const { meeting, isAdminOrHost, isLoading } = useMeeting(meetingId!);
  const { liveTranscript, interimTranscript, isProcessing } = useMeetingStore();

  const startMeeting = useStartMeeting(meetingId!);
  const endMeeting = useEndMeeting(meetingId!);
  const deleteMeeting = useDeleteMeeting(meeting?.workspaceId || '');

  if (isLoading) return <PageLoading message="Loading meeting..." />;
  if (!meeting) return (
    <div className="p-6 text-center text-slate-400">Meeting not found.</div>
  );

  const isHost = meeting.hostId === user?.id;
  const canControl = isHost || isAdminOrHost;

  const handleRecordingStop = async (
    transcript: string,
    audioBlob: Blob | null
  ) => {
    if (!transcript.trim()) {
      alert('No transcript captured. Please try recording again.');
      return;
    }
    await endMeeting.mutateAsync(transcript);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this meeting? All tasks and minutes will be lost.')) {
      deleteMeeting.mutate(meetingId!);
    }
  };

  // ── Tab config ─────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; count?: number; show: boolean }[] = [
    {
      id: 'recorder',
      label: 'Recorder',
      show: meeting.status === 'SCHEDULED' || meeting.status === 'RECORDING',
    },
    {
      id: 'transcript',
      label: 'Transcript',
      show: !!meeting.transcript || !!liveTranscript,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      count: meeting.tasks?.length || 0,
      show: !!meeting.tasks && meeting.tasks.length > 0,
    },
    {
      id: 'mom',
      label: 'Minutes',
      show: !!meeting.mom,
    },
  ].filter((t) => t.show);

  // ── Processing state ───────────────────────────────────────────────────────
  if (meeting.status === 'PROCESSING' || isProcessing) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <ProcessingAnimation message="Processing meeting with AI..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* ── Back ── */}
      <button
        onClick={() => navigate(`/workspaces/${meeting.workspaceId}`)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200
                   transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {meeting.workspace?.name || 'Workspace'}
      </button>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-50">{meeting.title}</h1>
            <MeetingStatusBadge status={meeting.status} />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Hosted by {meeting.host.name}</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {meeting.startedAt
                  ? format(new Date(meeting.startedAt), 'MMM d, yyyy h:mm a')
                  : format(new Date(meeting.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
            {meeting.duration && (
              <>
                <span>·</span>
                <span>
                  {Math.floor(meeting.duration / 60)}m {meeting.duration % 60}s
                </span>
              </>
            )}
          </div>

          {meeting.description && (
            <p className="text-sm text-slate-400 mt-2">{meeting.description}</p>
          )}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Review button */}
          {meeting.status === 'REVIEW' && canControl && (
            <Button
              variant="primary"
              onClick={() => navigate(`/meetings/${meetingId}/review`)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Review Tasks
            </Button>
          )}

          {/* Start button */}
          {meeting.status === 'SCHEDULED' && canControl && (
            <Button
              variant="success"
              onClick={() => startMeeting.mutate()}
              loading={startMeeting.isPending}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Start Meeting
            </Button>
          )}

          {/* Delete */}
          {canControl && meeting.status !== 'RECORDING' && (
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* ── Review banner ── */}
      {meeting.status === 'REVIEW' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert-warning mb-6"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning-200">
              AI processing complete — review required
            </p>
            <p className="text-xs text-warning-300/80 mt-0.5">
              {meeting.tasks?.length || 0} tasks have been extracted. Review and
              confirm them before they are sent to assignees.
            </p>
          </div>
          {canControl && (
            <Button
              variant="warning"
              size="sm"
              onClick={() => navigate(`/meetings/${meetingId}/review`)}
            >
              Review Now
            </Button>
          )}
        </motion.div>
      )}

      {/* ── Tabs ── */}
      {tabs.length > 0 && (
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
              {tab.count !== undefined && tab.count > 0 && (
                <span className={clsx(
                  'badge text-2xs',
                  activeTab === tab.id ? 'badge-primary' : 'badge-ghost'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab content ── */}
      <div>
        {/* Recorder tab */}
        {(activeTab === 'recorder' || tabs.length === 0) &&
          (meeting.status === 'SCHEDULED' || meeting.status === 'RECORDING') && (
            <div className="max-w-2xl">
              {meeting.status === 'SCHEDULED' ? (
                <div className="card p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary-900/20 border border-primary-800/30
                                  flex items-center justify-center mx-auto">
                    <Mic className="w-8 h-8 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-1">
                      Ready to start recording
                    </h3>
                    <p className="text-sm text-slate-400">
                      Click "Start Meeting" to begin live transcription
                    </p>
                  </div>
                  {canControl && (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => startMeeting.mutate()}
                      loading={startMeeting.isPending}
                      leftIcon={<Play className="w-5 h-5" />}
                      className="mx-auto"
                    >
                      Start Meeting
                    </Button>
                  )}
                </div>
              ) : (
                <MeetingRecorder
                  meetingId={meetingId!}
                  onStop={handleRecordingStop}
                  isDisabled={endMeeting.isPending}
                />
              )}
            </div>
          )}

        {/* Transcript tab */}
        {activeTab === 'transcript' && (
          <TranscriptViewer
            transcript={meeting.transcript || liveTranscript}
            isLive={meeting.status === 'RECORDING'}
            interimText={interimTranscript}
            maxHeight="500px"
          />
        )}

        {/* Tasks tab */}
        {activeTab === 'tasks' && meeting.tasks && (
          <div className="space-y-3">
            {meeting.tasks.length === 0 ? (
              <div className="empty-state">
                <CheckSquare className="w-8 h-8 text-dark-600 mx-auto mb-2" />
                <p className="text-slate-500">No tasks yet</p>
              </div>
            ) : (
              meeting.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isAdminOrHost={isAdminOrHost}
                />
              ))
            )}
          </div>
        )}

        {/* MoM tab */}
        {activeTab === 'mom' && meeting.mom && (
          <MoMViewer mom={meeting.mom} showRaw={isAdminOrHost} />
        )}
      </div>
    </div>
  );
}