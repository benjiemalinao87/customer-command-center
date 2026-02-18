import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock, MapPin, Building2, Zap, MousePointer2, LogIn } from 'lucide-react';
import { getActiveSessions } from '../../../lib/supabaseAdmin';
import { supabase } from '../../../lib/supabase';

// Active user session interface for SaaS platform
interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  workspaceName: string;
  workspaceId: string;
  role: 'admin' | 'agent' | 'owner';
  location: string;
  loginTime: string;
  lastActivity: string;
  sessionDuration: string;
  currentPage: string;
  mostUsedFeature: string;
  lastSignIn: string;
  pageVisits: number;
  activityEvents: number;
  status: 'active' | 'idle';
  trackingStatus: 'tracked' | 'untracked';
}


export function Visitors() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle'>('all');

  // Load real session data
  const loadSessions = useCallback(async () => {
    try {
      const realSessions = await getActiveSessions() as ActiveSession[];
      setSessions(realSessions);
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
      // Fallback to empty array if error
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();

    // Keep a polling fallback in case realtime misses an event
    const interval = setInterval(() => {
      void loadSessions();
    }, 30000);

    // Subscribe to session activity changes for real-time updates
    const activityChannel = supabase
      .channel('active-user-session-activity')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_session_activity' },
        () => {
          void loadSessions();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(activityChannel);
    };
  }, [loadSessions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  // Calculate stats
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const idleSessions = sessions.filter(s => s.status === 'idle').length;
  const uniqueWorkspaces = new Set(sessions.map(s => s.workspaceId)).size;
  const filteredSessions = sessions.filter((session) => {
    if (statusFilter === 'all') {
      return true;
    }

    return session.status === statusFilter;
  });
  const featureUsageMap = filteredSessions.reduce<Record<string, number>>((acc, session) => {
    const feature = session.mostUsedFeature || 'Unknown';
    acc[feature] = (acc[feature] || 0) + 1;
    return acc;
  }, {});
  const featureUsageData = Object.entries(featureUsageMap)
    .map(([feature, count]) => ({
      feature,
      count,
      percent: filteredSessions.length > 0 ? Math.round((count / filteredSessions.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxFeatureCount = featureUsageData[0]?.count || 1;
  const featureBarColors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#eab308', '#ec4899', '#14b8a6', '#ef4444'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Active User Sessions</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Loading real-time session data...
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Active User Sessions</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time tracking of logged-in users across all workspaces
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Total Sessions
              </p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {sessions.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Active Now
              </p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {activeSessions}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {idleSessions} idle
              </p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Workspaces
              </p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {uniqueWorkspaces}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Most Used Features Graph */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Most Used Features</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Distribution across {statusFilter === 'all' ? 'all' : statusFilter} sessions
            </p>
          </div>
          <Zap className="w-5 h-5 text-orange-500" />
        </div>

        {featureUsageData.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No feature usage data available.</div>
        ) : (
          <div className="space-y-3">
            {featureUsageData.map((item, index) => {
              const barColor = featureBarColors[index % featureBarColors.length];
              return (
                <div key={item.feature} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                      <Zap className="w-4 h-4" style={{ color: barColor }} />
                      {item.feature}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.count} ({item.percent}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max((item.count / maxFeatureCount) * 100, 4)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Sessions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Active Sessions ({filteredSessions.length})
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Users currently logged into the platform
              </p>
            </div>
            <div className="inline-flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All ({sessions.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Active ({activeSessions})
              </button>
              <button
                onClick={() => setStatusFilter('idle')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'idle'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Idle ({idleSessions})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {statusFilter === 'all' ? 'No Active Sessions' : `No ${statusFilter} Sessions`}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {statusFilter === 'all'
                  ? 'No users are currently logged in. Sessions will appear here when users sign in.'
                  : `No sessions match the "${statusFilter}" filter right now.`}
              </p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Check Again
              </button>
            </div>
          ) : (
	            <table className="w-full">
	              <thead className="bg-gray-50 dark:bg-gray-700/50">
	                <tr>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    User
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Workspace
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Role
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Location
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Current Page
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Last Sign In
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Most Used Feature
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Session
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Status
	                  </th>
	                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
	                    Tracking
	                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {session.userName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {session.userName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {session.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {session.workspaceName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      session.role === 'owner'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : session.role === 'admin'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
	                    }`}>
	                      {session.role}
	                    </span>
	                  </td>
	                  <td className="px-6 py-4 whitespace-nowrap">
	                    <div className="flex items-center gap-2">
	                      <MapPin className="w-4 h-4 text-gray-400" />
	                      <span className="text-sm text-gray-900 dark:text-gray-100">
	                        {session.location}
	                      </span>
	                    </div>
	                  </td>
	                  <td className="px-6 py-4 whitespace-nowrap">
	                    <div className="flex items-center gap-2">
	                      <MousePointer2 className="w-4 h-4 text-blue-500" />
	                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
	                        {session.currentPage}
	                      </span>
	                    </div>
	                  </td>
	                  <td className="px-6 py-4 whitespace-nowrap">
	                    <div className="flex items-center gap-2">
	                      <LogIn className="w-4 h-4 text-emerald-500" />
	                      <span className="text-sm text-gray-900 dark:text-gray-100">
	                        {session.lastSignIn}
	                      </span>
	                    </div>
	                  </td>
	                  <td className="px-6 py-4 whitespace-nowrap">
	                    <div className="flex items-center gap-2">
	                      <Zap className="w-4 h-4 text-orange-500" />
	                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
	                        {session.mostUsedFeature}
	                      </span>
	                    </div>
	                  </td>
	                  <td className="px-6 py-4 whitespace-nowrap">
	                    <div className="flex items-center gap-2">
	                      <Clock className="w-4 h-4 text-gray-400" />
	                      <div>
	                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
	                          {session.sessionDuration}
	                        </div>
	                        <div className="text-xs text-gray-500 dark:text-gray-400">
	                          {session.lastActivity} • {session.pageVisits} views • {session.activityEvents} events
	                        </div>
	                      </div>
	                    </div>
	                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        session.status === 'active'
                          ? 'bg-green-500 animate-pulse'
                          : 'bg-yellow-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {session.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        session.trackingStatus === 'tracked'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {session.trackingStatus === 'tracked' ? 'Tracked' : 'Untracked'}
                    </span>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
