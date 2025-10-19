import { useState } from 'react';
import { RefreshCw, Clock, MapPin, Building2, Zap } from 'lucide-react';

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
  status: 'active' | 'idle';
}

// Mock active sessions data for SaaS platform
const mockActiveSessions: ActiveSession[] = [
  {
    id: '1',
    userId: 'usr_001',
    userName: 'Sarah Johnson',
    userEmail: 'sarah@techflow.com',
    workspaceName: 'TechFlow Inc',
    workspaceId: 'ws_001',
    role: 'admin',
    location: 'San Francisco, CA',
    loginTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    lastActivity: 'Just now',
    sessionDuration: '15m',
    currentPage: '/dashboard/analytics',
    mostUsedFeature: 'SMS Campaigns',
    status: 'active'
  },
  {
    id: '2',
    userId: 'usr_002',
    userName: 'Michael Chen',
    userEmail: 'michael@datavision.com',
    workspaceName: 'DataVision Corp',
    workspaceId: 'ws_002',
    role: 'owner',
    location: 'New York, NY',
    loginTime: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    lastActivity: '2 mins ago',
    sessionDuration: '45m',
    currentPage: '/settings/billing',
    mostUsedFeature: 'Billing & Usage',
    status: 'active'
  },
  {
    id: '3',
    userId: 'usr_003',
    userName: 'Emily Rodriguez',
    userEmail: 'emily@cloudscale.io',
    workspaceName: 'CloudScale Solutions',
    workspaceId: 'ws_003',
    role: 'agent',
    location: 'Austin, TX',
    loginTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastActivity: '5 mins ago',
    sessionDuration: '30m',
    currentPage: '/livechat/messages',
    mostUsedFeature: 'Live Chat',
    status: 'idle'
  },
  {
    id: '4',
    userId: 'usr_004',
    userName: 'David Kim',
    userEmail: 'david@aidynamics.com',
    workspaceName: 'AI Dynamics Ltd',
    workspaceId: 'ws_004',
    role: 'admin',
    location: 'Seattle, WA',
    loginTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    lastActivity: '1 min ago',
    sessionDuration: '2h',
    currentPage: '/api/documentation',
    mostUsedFeature: 'API Integration',
    status: 'active'
  },
  {
    id: '5',
    userId: 'usr_005',
    userName: 'Jessica Brown',
    userEmail: 'jessica@digitalfrontier.com',
    workspaceName: 'Digital Frontier',
    workspaceId: 'ws_005',
    role: 'agent',
    location: 'Miami, FL',
    loginTime: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    lastActivity: 'Just now',
    sessionDuration: '25m',
    currentPage: '/dashboard/overview',
    mostUsedFeature: 'Dashboard',
    status: 'active'
  },
  {
    id: '6',
    userId: 'usr_006',
    userName: 'James Wilson',
    userEmail: 'james@techflow.com',
    workspaceName: 'TechFlow Inc',
    workspaceId: 'ws_001',
    role: 'agent',
    location: 'San Francisco, CA',
    loginTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    lastActivity: '10 mins ago',
    sessionDuration: '1h',
    currentPage: '/sms/campaigns',
    mostUsedFeature: 'SMS Campaigns',
    status: 'idle'
  },
  {
    id: '7',
    userId: 'usr_007',
    userName: 'Maria Garcia',
    userEmail: 'maria@datavision.com',
    workspaceName: 'DataVision Corp',
    workspaceId: 'ws_002',
    role: 'admin',
    location: 'New York, NY',
    loginTime: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    lastActivity: 'Just now',
    sessionDuration: '1h 30m',
    currentPage: '/users/management',
    mostUsedFeature: 'User Management',
    status: 'active'
  },
  {
    id: '8',
    userId: 'usr_008',
    userName: 'Robert Taylor',
    userEmail: 'robert@cloudscale.io',
    workspaceName: 'CloudScale Solutions',
    workspaceId: 'ws_003',
    role: 'owner',
    location: 'Austin, TX',
    loginTime: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    lastActivity: '3 mins ago',
    sessionDuration: '3h',
    currentPage: '/integrations/setup',
    mostUsedFeature: 'Integrations',
    status: 'active'
  },
  {
    id: '9',
    userId: 'usr_009',
    userName: 'Linda Martinez',
    userEmail: 'linda@aidynamics.com',
    workspaceName: 'AI Dynamics Ltd',
    workspaceId: 'ws_004',
    role: 'agent',
    location: 'Seattle, WA',
    loginTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    lastActivity: 'Just now',
    sessionDuration: '10m',
    currentPage: '/dashboard/analytics',
    mostUsedFeature: 'Analytics',
    status: 'active'
  },
  {
    id: '10',
    userId: 'usr_010',
    userName: 'Thomas Anderson',
    userEmail: 'thomas@digitalfrontier.com',
    workspaceName: 'Digital Frontier',
    workspaceId: 'ws_005',
    role: 'admin',
    location: 'Miami, FL',
    loginTime: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    lastActivity: '7 mins ago',
    sessionDuration: '50m',
    currentPage: '/settings/workspace',
    mostUsedFeature: 'Workspace Settings',
    status: 'idle'
  },
  {
    id: '11',
    userId: 'usr_011',
    userName: 'Patricia Lee',
    userEmail: 'patricia@techflow.com',
    workspaceName: 'TechFlow Inc',
    workspaceId: 'ws_001',
    role: 'agent',
    location: 'Los Angeles, CA',
    loginTime: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    lastActivity: '4 mins ago',
    sessionDuration: '35m',
    currentPage: '/livechat/inbox',
    mostUsedFeature: 'Live Chat',
    status: 'active'
  },
  {
    id: '12',
    userId: 'usr_012',
    userName: 'Christopher Moore',
    userEmail: 'chris@cloudscale.io',
    workspaceName: 'CloudScale Solutions',
    workspaceId: 'ws_003',
    role: 'agent',
    location: 'Denver, CO',
    loginTime: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    lastActivity: 'Just now',
    sessionDuration: '20m',
    currentPage: '/triggers/automation',
    mostUsedFeature: 'Automation Triggers',
    status: 'active'
  }
];

export function Visitors() {
  const [sessions] = useState<ActiveSession[]>(mockActiveSessions);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate stats
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const idleSessions = sessions.filter(s => s.status === 'idle').length;
  const uniqueWorkspaces = new Set(sessions.map(s => s.workspaceId)).size;

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

      {/* Active Sessions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Active Sessions ({sessions.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Users currently logged into the platform
          </p>
        </div>

        <div className="overflow-x-auto">
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
                  Most Used Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sessions.map((session) => (
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
                          {session.lastActivity}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
