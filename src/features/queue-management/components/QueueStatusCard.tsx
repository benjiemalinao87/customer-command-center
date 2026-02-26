import { useState } from 'react';
import { Pause, Play, Settings, RotateCcw, Loader2 } from 'lucide-react';
import type { QueueInfo } from '../services/queueApi';

interface QueueStatusCardProps {
  queue: QueueInfo;
  onOverride: (name: string, limit: number) => Promise<void>;
  onReset: (name: string) => Promise<void>;
  onPause: (name: string) => Promise<void>;
  onResume: (name: string) => Promise<void>;
}

export function QueueStatusCard({ queue, onOverride, onReset, onPause, onResume }: QueueStatusCardProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState(String(queue.concurrencyLimit));
  const [loading, setLoading] = useState<string | null>(null);

  const effectiveLimit = queue.concurrencyLimitOverride ?? queue.concurrencyLimit;
  const usagePercent = effectiveLimit > 0 ? Math.min((queue.running / effectiveLimit) * 100, 100) : 0;
  const isOverridden = queue.concurrencyLimitOverride != null;

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setLoading(action);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  const handleOverrideSubmit = async () => {
    const val = parseInt(overrideValue, 10);
    if (isNaN(val) || val < 1) return;
    await handleAction('override', () => onOverride(queue.name, val));
    setShowOverride(false);
  };

  const getBarColor = () => {
    if (queue.paused) return 'bg-yellow-500';
    if (usagePercent >= 90) return 'bg-red-500';
    if (usagePercent >= 70) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {queue.name}
          </h3>
          {isOverridden && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              OVERRIDE
            </span>
          )}
          {queue.paused && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
              PAUSED
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {queue.type}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{queue.running}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Running</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{queue.queued}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Queued</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{effectiveLimit}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Limit</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{queue.running} / {effectiveLimit} slots used</span>
          <span>{Math.round(usagePercent)}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Override Input */}
      {showOverride && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <input
            type="number"
            min="1"
            max="500"
            value={overrideValue}
            onChange={(e) => setOverrideValue(e.target.value)}
            className="w-20 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleOverrideSubmit()}
          />
          <button
            onClick={handleOverrideSubmit}
            disabled={loading === 'override'}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'override' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
          </button>
          <button
            onClick={() => setShowOverride(false)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowOverride(!showOverride)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Override concurrency limit"
        >
          <Settings className="w-3.5 h-3.5" />
          Override
        </button>

        {isOverridden && (
          <button
            onClick={() => handleAction('reset', () => onReset(queue.name))}
            disabled={loading === 'reset'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            title="Reset to code-defined limit"
          >
            {loading === 'reset' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset
          </button>
        )}

        <button
          onClick={() =>
            handleAction('pause', () =>
              queue.paused ? onResume(queue.name) : onPause(queue.name)
            )
          }
          disabled={loading === 'pause'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            queue.paused
              ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
              : 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
          }`}
          title={queue.paused ? 'Resume queue' : 'Pause queue'}
        >
          {loading === 'pause' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : queue.paused ? (
            <Play className="w-3.5 h-3.5" />
          ) : (
            <Pause className="w-3.5 h-3.5" />
          )}
          {queue.paused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  );
}
