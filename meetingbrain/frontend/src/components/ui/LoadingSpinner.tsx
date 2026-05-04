import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

interface SkeletonProps {
  className?: string;
  count?: number;
}

interface PageLoadingProps {
  message?: string;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export default function LoadingSpinner({
  size = 'md',
  className,
  label,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3',
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
    >
      <Loader2
        className={clsx(
          'animate-spin text-primary-500',
          sizeClasses[size]
        )}
      />
      {label && (
        <p className="text-sm text-slate-400 animate-pulse">{label}</p>
      )}
    </div>
  );
}

// ─── Skeleton line ────────────────────────────────────────────────────────────
export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={clsx('skeleton', className)} />
      ))}
    </>
  );
}

// ─── Card skeleton ────────────────────────────────────────────────────────────
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Table skeleton ───────────────────────────────────────────────────────────
export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div
        className="grid gap-4 px-4 py-3 bg-dark-800 rounded-t-xl border border-dark-700"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 px-4 py-4 border-b border-dark-700 last:border-0"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={clsx('h-4 rounded', colIndex === 0 ? 'w-3/4' : '')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Page loading ─────────────────────────────────────────────────────────────
export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-700/30
                        flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-primary-400" />
        </div>
      </div>
      <p className="text-sm text-slate-400 animate-pulse">{message}</p>
    </div>
  );
}

// ─── Processing animation (for AI) ───────────────────────────────────────────
export function ProcessingAnimation({ message = 'AI is processing...' }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-12">
      {/* Animated brain dots */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-2xl bg-primary-600/20 border border-primary-700/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary-400"
                style={{
                  animation: `bounceSoft 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-base font-semibold text-slate-200">{message}</p>
        <p className="text-sm text-slate-400">
          Extracting tasks, deadlines, and generating minutes...
        </p>
      </div>

      {/* Progress steps */}
      <div className="w-full max-w-xs space-y-2">
        {[
          'Analyzing transcript',
          'Detecting action items',
          'Identifying assignees',
          'Generating MoM',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full border-2 border-primary-500 flex items-center justify-center"
              style={{
                animation: `pulse 2s ease-in-out ${i * 0.4}s infinite`,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            </div>
            <span
              className="text-xs text-slate-400"
              style={{
                opacity: 0.4 + i * 0.15,
              }}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}