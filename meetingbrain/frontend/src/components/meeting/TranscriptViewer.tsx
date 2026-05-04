import { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  X,
} from 'lucide-react';
import Button from '../ui/Button';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface TranscriptViewerProps {
  transcript: string;
  isLive?: boolean;
  interimText?: string;
  maxHeight?: string;
}

interface TranscriptLine {
  timestamp: string | null;
  text: string;
  index: number;
}

// ─── Parse transcript lines ───────────────────────────────────────────────────
const parseTranscriptLines = (transcript: string): TranscriptLine[] => {
  if (!transcript.trim()) return [];

  return transcript
    .split('\n')
    .filter((line) => line.trim())
    .map((line, index) => {
      // Match timestamp format [MM:SS] or [HH:MM:SS]
      const match = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*/);
      if (match) {
        return {
          timestamp: match[1],
          text: line.slice(match[0].length).trim(),
          index,
        };
      }
      return { timestamp: null, text: line.trim(), index };
    })
    .filter((line) => line.text);
};

export default function TranscriptViewer({
  transcript,
  isLive = false,
  interimText = '',
  maxHeight = '400px',
}: TranscriptViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lines = parseTranscriptLines(transcript);
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const charCount = transcript.length;

  // ── Auto-scroll to bottom when live ───────────────────────────────────────
  useEffect(() => {
    if (isLive && bottomRef.current && isExpanded) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, interimText, isLive, isExpanded]);

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      toast.success('Transcript copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy transcript');
    }
  };

  // ── Filter lines by search query ───────────────────────────────────────────
  const filteredLines = searchQuery.trim()
    ? lines.filter((line) =>
        line.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : lines;

  // ── Highlight search term ──────────────────────────────────────────────────
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-warning-500/30 text-warning-200 rounded px-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!transcript && !interimText) {
    return (
      <div className="card p-6 text-center">
        <FileText className="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">
          {isLive
            ? 'Transcript will appear here as you speak...'
            : 'No transcript available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-300">
            Transcript
          </span>
          {isLive && (
            <span className="badge-danger text-2xs animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-danger-400" />
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Word count */}
          <div className="flex items-center gap-3 text-xs text-slate-500 mr-2">
            <span>{wordCount.toLocaleString()} words</span>
            <span className="text-dark-600">·</span>
            <span>{lines.length} segments</span>
          </div>

          {/* Search toggle */}
          <button
            onClick={() => {
              setIsSearching((prev) => !prev);
              if (isSearching) setSearchQuery('');
            }}
            className={clsx(
              'btn-icon',
              isSearching
                ? 'text-primary-400 bg-primary-900/20'
                : 'text-slate-400 hover:text-slate-100'
            )}
            title="Search transcript"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className={clsx(
              'btn-icon transition-colors',
              copied
                ? 'text-success-400'
                : 'text-slate-400 hover:text-slate-100'
            )}
            title="Copy transcript"
          >
            {copied ? (
              <CheckCheck className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="btn-icon text-slate-400 hover:text-slate-100"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      {isSearching && (
        <div className="px-4 py-2.5 border-b border-dark-700 bg-dark-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in transcript..."
              autoFocus
              className="w-full pl-8 pr-8 py-2 bg-dark-700 border border-dark-600
                         rounded-lg text-sm text-slate-200 placeholder:text-slate-500
                         focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2
                           text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-slate-500 mt-1.5">
              {filteredLines.length} result{filteredLines.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {isExpanded && (
        <div
          ref={containerRef}
          className="overflow-y-auto scrollbar-thin p-4 space-y-0.5"
          style={{ maxHeight }}
        >
          {filteredLines.length === 0 && searchQuery ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="w-6 h-6 text-dark-600 mb-2" />
              <p className="text-sm text-slate-500">
                No results for "{searchQuery}"
              </p>
            </div>
          ) : (
            filteredLines.map((line) => (
              <div
                key={line.index}
                className="transcript-line flex items-start"
              >
                {/* Timestamp */}
                {line.timestamp && (
                  <span className="transcript-timestamp flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {line.timestamp}
                  </span>
                )}

                {/* Text */}
                <span className="text-slate-300 leading-relaxed">
                  {highlightText(line.text, searchQuery)}
                </span>
              </div>
            ))
          )}

          {/* Interim text (live only) */}
          {isLive && interimText && (
            <div className="transcript-line flex items-start opacity-60">
              <span className="text-slate-400 italic leading-relaxed">
                {interimText}...
              </span>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Collapsed state ── */}
      {!isExpanded && (
        <div className="px-4 py-3 text-sm text-slate-500 italic">
          {lines[0]?.text?.slice(0, 100)}
          {(lines[0]?.text?.length || 0) > 100 ? '...' : ''}
        </div>
      )}
    </div>
  );
}