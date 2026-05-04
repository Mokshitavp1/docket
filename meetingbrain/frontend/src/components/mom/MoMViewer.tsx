import { useState } from 'react';
import {
  FileText,
  Calendar,
  Users,
  CheckSquare,
  ArrowRight,
  Copy,
  CheckCheck,
  Download,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
} from 'lucide-react';
import { MinutesOfMeeting } from '../../types';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface MoMViewerProps {
  mom: MinutesOfMeeting;
  showRaw?: boolean;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-dark-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-dark-800 hover:bg-dark-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-slate-400">{icon}</span>
          <span className="text-sm font-semibold text-slate-200">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="badge-primary text-2xs">{badge}</span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="px-4 py-4 bg-dark-800/30">
          {children}
        </div>
      )}
    </div>
  );
}

export default function MoMViewer({ mom, showRaw = false }: MoMViewerProps) {
  const [copied, setCopied] = useState(false);
  const [viewingRaw, setViewingRaw] = useState(false);

  // ── Copy MoM to clipboard ──────────────────────────────────────────────────
  const handleCopy = async () => {
    const text = generatePlainText(mom);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Minutes copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // ── Download as .txt ───────────────────────────────────────────────────────
  const handleDownload = () => {
    const text = generatePlainText(mom);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MoM-${mom.title.replace(/[^a-z0-9]/gi, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Minutes downloaded');
  };

  // ── Generate plain text version ────────────────────────────────────────────
  const generatePlainText = (m: MinutesOfMeeting): string => {
    const lines: string[] = [
      m.title,
      '='.repeat(m.title.length),
      '',
      `Date: ${format(new Date(m.date), 'MMMM d, yyyy')}`,
      '',
    ];

    if (m.attendees.length > 0) {
      lines.push('ATTENDEES');
      lines.push('-'.repeat(9));
      m.attendees.forEach((a) => lines.push(`• ${a}`));
      lines.push('');
    }

    if (m.agenda) {
      lines.push('AGENDA');
      lines.push('-'.repeat(6));
      lines.push(m.agenda);
      lines.push('');
    }

    lines.push('SUMMARY');
    lines.push('-'.repeat(7));
    lines.push(m.summary);
    lines.push('');

    if (m.decisions.length > 0) {
      lines.push('KEY DECISIONS');
      lines.push('-'.repeat(13));
      m.decisions.forEach((d) => lines.push(`• ${d}`));
      lines.push('');
    }

    if (m.nextSteps.length > 0) {
      lines.push('NEXT STEPS');
      lines.push('-'.repeat(10));
      m.nextSteps.forEach((s) => lines.push(`• ${s}`));
      lines.push('');
    }

    return lines.join('\n');
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{mom.title}</h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(mom.date), 'MMMM d, yyyy')}
            </div>
            {mom.confirmedAt && (
              <span className="badge-success text-2xs">
                <CheckCheck className="w-2.5 h-2.5" />
                Confirmed
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showRaw && (
            <button
              onClick={() => setViewingRaw((prev) => !prev)}
              className={clsx(
                'btn-ghost btn-sm',
                viewingRaw && 'text-primary-400 bg-primary-900/20'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              {viewingRaw ? 'Formatted' : 'Raw'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={clsx(
              'btn-ghost btn-sm',
              copied && 'text-success-400'
            )}
          >
            {copied ? (
              <CheckCheck className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={handleDownload} className="btn-secondary btn-sm">
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* ── Raw transcript view ── */}
      {viewingRaw ? (
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Raw Transcript
          </p>
          <pre className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed
                          max-h-96 overflow-y-auto font-mono">
            {mom.rawContent}
          </pre>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Attendees */}
          {mom.attendees.length > 0 && (
            <Section
              title="Attendees"
              icon={<Users className="w-4 h-4" />}
              badge={mom.attendees.length}
            >
              <div className="flex flex-wrap gap-2">
                {mom.attendees.map((attendee, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full
                               bg-dark-700 border border-dark-600"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-brand flex items-center
                                    justify-center text-white text-2xs font-bold flex-shrink-0">
                      {attendee[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-xs font-medium text-slate-300">
                      {attendee}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Agenda */}
          {mom.agenda && (
            <Section
              title="Agenda"
              icon={<Target className="w-4 h-4" />}
            >
              <p className="text-sm text-slate-300 leading-relaxed">
                {mom.agenda}
              </p>
            </Section>
          )}

          {/* Summary */}
          <Section
            title="Meeting Summary"
            icon={<FileText className="w-4 h-4" />}
            defaultOpen={true}
          >
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {mom.summary}
            </p>
          </Section>

          {/* Key Decisions */}
          {mom.decisions.length > 0 && (
            <Section
              title="Key Decisions"
              icon={<CheckSquare className="w-4 h-4" />}
              badge={mom.decisions.length}
            >
              <ul className="space-y-2">
                {mom.decisions.map((decision, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-success-900/30 border border-success-800/30
                                    flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-2xs font-bold text-success-400">
                        {i + 1}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {decision}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Next Steps */}
          {mom.nextSteps.length > 0 && (
            <Section
              title="Next Steps"
              icon={<ArrowRight className="w-4 h-4" />}
              badge={mom.nextSteps.length}
            >
              <ul className="space-y-2">
                {mom.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary-900/30 border border-primary-800/30
                                    flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ArrowRight className="w-2.5 h-2.5 text-primary-400" />
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {step}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {/* ── Confirmed notice ── */}
      {mom.confirmedAt && (
        <div className="alert-success">
          <CheckCheck className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">
            These minutes were confirmed on{' '}
            {format(new Date(mom.confirmedAt), 'MMMM d, yyyy')} and emails
            were sent to all attendees.
          </p>
        </div>
      )}
    </div>
  );
}