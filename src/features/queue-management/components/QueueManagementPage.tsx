import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Loader2, AlertCircle, Layers, Activity, Users, Search, X } from 'lucide-react';
import { QueueStatusCard } from './QueueStatusCard';
import { WorkspaceTierTable } from './WorkspaceTierTable';
import {
  listQueues,
  overrideConcurrency,
  resetConcurrency,
  pauseQueue,
  resumeQueue,
  getRunCounts,
  type QueueInfo,
  type RunCounts,
} from '../services/queueApi';

type Tab = 'queues' | 'tiers';

export function QueueManagementPage() {
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [runCounts, setRunCounts] = useState<RunCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('queues');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'custom' | 'task'>('all');

  const fetchQueues = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Fetch queue list and accurate run counts in parallel
      const [response, counts] = await Promise.all([
        listQueues(1, 100),
        getRunCounts().catch(() => null),
      ]);
      setQueues(response.data || []);
      setRunCounts(counts);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(() => fetchQueues(), 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchQueues]);

  const handleOverride = async (name: string, limit: number) => {
    await overrideConcurrency(name, limit);
    await fetchQueues(true);
  };

  const handleReset = async (name: string) => {
    await resetConcurrency(name);
    await fetchQueues(true);
  };

  const handlePause = async (name: string) => {
    await pauseQueue(name);
    await fetchQueues(true);
  };

  const handleResume = async (name: string) => {
    await resumeQueue(name);
    await fetchQueues(true);
  };

  // Filter then sort by running (desc), queued (desc), name (asc)
  const filteredQueues = useMemo(() => {
    let result = queues;

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((q) => q.type === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((q) => q.name.toLowerCase().includes(query));
    }

    // Sort
    return [...result].sort((a, b) => {
      if (b.running !== a.running) return b.running - a.running;
      if (b.queued !== a.queued) return b.queued - a.queued;
      return a.name.localeCompare(b.name);
    });
  }, [queues, typeFilter, searchQuery]);

  const customCount = queues.filter((q) => q.type === 'custom').length;
  const taskCount = queues.filter((q) => q.type === 'task').length;

  // Summary stats — use runs API for accurate executing/waiting counts
  const totalExecuting = runCounts?.executing ?? queues.reduce((sum, q) => sum + q.running, 0);
  const totalWaiting = runCounts?.waiting ?? 0;
  const totalQueued = queues.reduce((sum, q) => sum + q.queued, 0);
  const pausedCount = queues.filter((q) => q.paused).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading queue data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Queue Management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Monitor and control per-workspace workflow queue isolation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchQueues(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load queue data</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Queues</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{queues.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Executing</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
            {totalExecuting}{runCounts?.executingHasMore ? '+' : ''}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Waiting</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {totalWaiting}{runCounts?.waitingHasMore ? '+' : ''}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Queued</div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{totalQueued}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Paused</div>
          <div className={`text-3xl font-bold mt-1 ${pausedCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {pausedCount}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('queues')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'queues'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Activity className="w-4 h-4" />
            Queue Status
            {totalExecuting > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                {totalExecuting}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tiers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tiers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Users className="w-4 h-4" />
            Workspace Tiers
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'queues' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search queues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {([
                { value: 'all', label: 'All', count: queues.length },
                { value: 'custom', label: 'Custom', count: customCount },
                { value: 'task', label: 'Task', count: taskCount },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTypeFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    typeFilter === opt.value
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {opt.label}
                  <span className="ml-1 opacity-60">{opt.count}</span>
                </button>
              ))}
            </div>

            {/* Result count */}
            {(searchQuery || typeFilter !== 'all') && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {filteredQueues.length} of {queues.length}
              </span>
            )}
          </div>

          {/* Queue Cards */}
          {filteredQueues.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {queues.length === 0
                  ? 'No queues found. Deploy trigger tasks with queue definitions first.'
                  : 'No queues match your filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQueues.map((queue) => (
                <QueueStatusCard
                  key={queue.name}
                  queue={queue}
                  onOverride={handleOverride}
                  onReset={handleReset}
                  onPause={handlePause}
                  onResume={handleResume}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tiers' && <WorkspaceTierTable />}
    </div>
  );
}
