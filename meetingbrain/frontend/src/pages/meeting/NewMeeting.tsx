import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  Upload,
  Calendar,
  ArrowLeft,
  Info,
  Brain,
} from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useCreateMeeting, useUploadAudio } from '../../hooks/useMeeting';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import UploadRecording from '../../components/meeting/UploadRecording';
import { PageLoading } from '../../components/ui/LoadingSpinner';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

type Mode = 'live' | 'upload';

export default function NewMeeting() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<Mode>('live');
  const [titleError, setTitleError] = useState('');
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);

  const { workspace, isLoading: workspaceLoading } = useWorkspace(workspaceId!);
  const createMeeting = useCreateMeeting();
  const uploadAudio = useUploadAudio(createdMeetingId || '');

  if (workspaceLoading) return <PageLoading />;

  const validateTitle = (): boolean => {
    if (!title.trim()) {
      setTitleError('Meeting title is required.');
      return false;
    }
    if (title.trim().length < 2) {
      setTitleError('Title must be at least 2 characters.');
      return false;
    }
    setTitleError('');
    return true;
  };

  // ── Create meeting then navigate to it ────────────────────────────────────
  const handleCreateLive = async () => {
    if (!validateTitle()) return;

    const meeting = await createMeeting.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      workspaceId: workspaceId!,
    });

    // Navigate to the meeting detail page where recording happens
    navigate(`/meetings/${meeting.id}`);
  };

  // ── Create meeting then upload audio ──────────────────────────────────────
  const handleCreateForUpload = async (): Promise<string> => {
    if (!validateTitle()) throw new Error('Invalid title');

    const meeting = await createMeeting.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      workspaceId: workspaceId!,
    });

    setCreatedMeetingId(meeting.id);
    return meeting.id;
  };

  const handleUpload = async (
    file: File,
    onProgress: (p: number) => void
  ) => {
    let meetingId = createdMeetingId;

    if (!meetingId) {
      meetingId = await handleCreateForUpload();
    }

    await uploadAudio.mutateAsync({ file, onProgress });
    navigate(`/meetings/${meetingId}/review`);
  };

  const modeOptions: { id: Mode; label: string; description: string; icon: React.ReactNode }[] = [
    {
      id: 'live',
      label: 'Live Recording',
      description: 'Record your meeting in real-time with AI transcription.',
      icon: <Mic className="w-5 h-5" />,
    },
    {
      id: 'upload',
      label: 'Upload Recording',
      description: 'Upload an existing audio or video file for processing.',
      icon: <Upload className="w-5 h-5" />,
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      {/* ── Back button ── */}
      <button
        onClick={() => navigate(`/workspaces/${workspaceId}`)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200
                   transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {workspace?.name || 'Workspace'}
      </button>

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center
                          justify-center shadow-glow-sm">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-50">New Meeting</h1>
        </div>
        <p className="text-slate-400 text-sm">
          AI will automatically transcribe, extract tasks, and generate minutes.
        </p>
      </div>

      {/* ── Meeting details ── */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Meeting Details
        </h2>

        <div className="space-y-4">
          <Input
            label="Meeting Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
            onBlur={validateTitle}
            error={titleError}
            placeholder="e.g. Q4 Planning, Sprint Review, Product Demo"
            leftIcon={<Calendar className="w-4 h-4" />}
            required
            autoFocus
          />

          <div className="form-group">
            <label className="form-label">
              Description
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will be discussed in this meeting?"
              rows={3}
              maxLength={1000}
              className="form-textarea w-full"
            />
          </div>
        </div>
      </div>

      {/* ── Mode selection ── */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Recording Method
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {modeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={clsx(
                'flex flex-col items-start gap-3 p-4 rounded-xl border-2',
                'text-left transition-all duration-150',
                mode === option.id
                  ? 'border-primary-500 bg-primary-900/20'
                  : 'border-dark-600 bg-dark-700/30 hover:border-dark-500'
              )}
            >
              <div className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center',
                mode === option.id
                  ? 'bg-primary-600/30 text-primary-300'
                  : 'bg-dark-600 text-slate-400'
              )}>
                {option.icon}
              </div>
              <div>
                <p className={clsx(
                  'text-sm font-semibold mb-1',
                  mode === option.id ? 'text-primary-200' : 'text-slate-200'
                )}>
                  {option.label}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Live mode CTA ── */}
        {mode === 'live' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="alert-info">
              <Info className="w-4 h-4 flex-shrink-0 text-primary-400" />
              <div className="text-xs text-primary-300 space-y-1">
                <p className="font-medium">Before you start:</p>
                <ul className="space-y-0.5 text-primary-400/80">
                  <li>• Allow microphone access when prompted</li>
                  <li>• Use Chrome or Edge for best transcription quality</li>
                  <li>• Speak clearly and mention team members by name for auto-assignment</li>
                </ul>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleCreateLive}
              loading={createMeeting.isPending}
              className="w-full"
              size="lg"
              leftIcon={<Mic className="w-5 h-5" />}
            >
              Create & Start Meeting
            </Button>
          </motion.div>
        )}

        {/* ── Upload mode ── */}
        {mode === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {!title.trim() ? (
              <div className="alert-warning">
                <Info className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">
                  Please enter a meeting title before uploading.
                </p>
              </div>
            ) : (
              <UploadRecording
                meetingId={createdMeetingId || ''}
                onUpload={handleUpload}
                isLoading={createMeeting.isPending || uploadAudio.isPending}
              />
            )}
          </motion.div>
        )}
      </div>

      {/* ── How it works ── */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          How It Works
        </h3>
        <div className="space-y-3">
          {[
            {
              step: '1',
              title: 'Record or Upload',
              desc: 'Live transcription via your browser, or upload an audio file.',
            },
            {
              step: '2',
              title: 'AI Processing',
              desc: 'Claude AI extracts tasks, assignees, deadlines, and generates MoM.',
            },
            {
              step: '3',
              title: 'Review & Confirm',
              desc: 'Edit and confirm AI-generated tasks before they are sent out.',
            },
            {
              step: '4',
              title: 'Auto-Notify',
              desc: 'Emails sent to assignees. Deadlines added to calendar.',
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-900/40 border border-primary-800/40
                              flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-400">{item.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}