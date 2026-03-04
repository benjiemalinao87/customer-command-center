/**
 * Error Logs Component
 * Displays SMS, Email, and Voice sending/receiving errors for support monitoring
 * Provides filtering by type, direction, and workspace
 */

import { useState, useEffect } from 'react';
import { Filter, Mail, MessageSquare, AlertTriangle, Clock, RefreshCw, Phone, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../../lib/supabase';

type ErrorChannel = 'sms' | 'mms' | 'email' | 'voice';
type ErrorDirection = 'inbound' | 'outbound' | 'unknown';

interface UnifiedErrorLog {
  id: string;
  workspace_id: string;
  source_table: 'message_error_logs' | 'voice_error_logs';
  message_type: ErrorChannel;
  direction: ErrorDirection;
  error_code: string | null;
  error_message: string;
  details: Record<string, unknown>;
  recipient: string | null;
  sender: string | null;
  message_body: string | null;
  twilio_sid: string | null;
  created_at: string;
}

interface MessageErrorRow {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  message_type: 'sms' | 'email' | 'mms';
  direction: 'inbound' | 'outbound';
  error_code: string | null;
  error_message: string;
  details: Record<string, unknown> | null;
  recipient: string | null;
  sender: string | null;
  message_body: string | null;
  twilio_sid: string | null;
  created_at: string;
}

interface VoiceErrorRow {
  id: string;
  workspace_id: string;
  error_type: string | null;
  message: string | null;
  details: Record<string, unknown> | string | null;
  call_sid: string | null;
  created_at: string;
}

interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  byDirection: Record<string, number>;
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toDetailsObject = (value: unknown): Record<string, unknown> => {
  if (isObject(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isObject(parsed) ? parsed : { raw: value };
    } catch {
      return { raw: value };
    }
  }
  return {};
};

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const inferVoiceDirection = (details: Record<string, unknown>, errorType: string | null): ErrorDirection => {
  const source = readString(details.source)?.toLowerCase() || '';
  const explicitDirection = readString(details.direction)?.toLowerCase() || readString(details.call_direction)?.toLowerCase() || '';
  const status = readString(details.status)?.toLowerCase() || '';
  const fallbackType = (errorType || '').toLowerCase();

  if (explicitDirection === 'inbound' || explicitDirection === 'outbound') {
    return explicitDirection;
  }

  if (source.includes('outbound') || fallbackType.includes('outbound') || source.includes('twilio_status_callback') || status === 'failed') {
    return 'outbound';
  }

  if (source.includes('inbound') || fallbackType.includes('inbound')) {
    return 'inbound';
  }

  return 'unknown';
};

const inferVoiceRecipient = (details: Record<string, unknown>, callSid: string | null): string | null => {
  const context = isObject(details.context) ? details.context : {};
  return (
    readString((details as Record<string, unknown>).to_phone_number)
    || readString((details as Record<string, unknown>).to)
    || readString(context.to)
    || readString((details as Record<string, unknown>).recipient)
    || (callSid ? `Call ${callSid}` : null)
  );
};

const inferVoiceSender = (details: Record<string, unknown>): string | null => {
  const context = isObject(details.context) ? details.context : {};
  return (
    readString((details as Record<string, unknown>).from_phone_number)
    || readString((details as Record<string, unknown>).from)
    || readString(context.from)
    || null
  );
};

const inferVoiceErrorCode = (details: Record<string, unknown>): string | null => {
  return (
    readString((details as Record<string, unknown>).error_code)
    || readString((details as Record<string, unknown>).code)
    || readString((details as Record<string, unknown>).errorCode)
    || readString((details as Record<string, unknown>).status)
    || null
  );
};

export function MessageErrorLogs() {
  const [logs, setLogs] = useState<UnifiedErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMessageType, setFilterMessageType] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [filterWorkspaceId, setFilterWorkspaceId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(50);
  const [stats, setStats] = useState<ErrorStats>({ total: 0, byType: {}, byDirection: {} });
  const [workspaceNames, setWorkspaceNames] = useState<Record<string, string>>({});
  const [workspaceOptions, setWorkspaceOptions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadLogs();
  }, [filterMessageType, filterDirection, filterWorkspaceId, limit]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const fetchLimit = Math.min(Math.max(limit * 3, 150), 500);

      const [messageLogsResult, voiceLogsResult] = await Promise.all([
        supabase
          .from('message_error_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(fetchLimit),
        supabase
          .from('voice_error_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(fetchLimit)
      ]);

      if (messageLogsResult.error) {
        console.error('Error loading message_error_logs:', messageLogsResult.error);
      }
      if (voiceLogsResult.error) {
        console.error('Error loading voice_error_logs:', voiceLogsResult.error);
      }

      const messageRows = (messageLogsResult.data || []) as MessageErrorRow[];
      const voiceRows = (voiceLogsResult.data || []) as VoiceErrorRow[];

      const normalizedMessageLogs: UnifiedErrorLog[] = messageRows.map((row) => ({
        id: `msg-${row.id}`,
        workspace_id: row.workspace_id,
        source_table: 'message_error_logs',
        message_type: row.message_type,
        direction: row.direction,
        error_code: row.error_code,
        error_message: row.error_message,
        details: row.details || {},
        recipient: row.recipient,
        sender: row.sender,
        message_body: row.message_body,
        twilio_sid: row.twilio_sid,
        created_at: row.created_at
      }));

      const normalizedVoiceLogs: UnifiedErrorLog[] = voiceRows.map((row) => {
        const details = toDetailsObject(row.details);
        return {
          id: `voice-${row.id}`,
          workspace_id: row.workspace_id,
          source_table: 'voice_error_logs',
          message_type: 'voice',
          direction: inferVoiceDirection(details, row.error_type),
          error_code: inferVoiceErrorCode(details),
          error_message: row.message || row.error_type || 'Voice error',
          details,
          recipient: inferVoiceRecipient(details, row.call_sid),
          sender: inferVoiceSender(details),
          message_body: null,
          twilio_sid: row.call_sid,
          created_at: row.created_at
        };
      });

      let combinedLogs = [...normalizedMessageLogs, ...normalizedVoiceLogs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (filterMessageType) {
        combinedLogs = combinedLogs.filter((log) => log.message_type === filterMessageType);
      }

      if (filterDirection) {
        combinedLogs = combinedLogs.filter((log) => log.direction === filterDirection);
      }

      const uniqueIds = [...new Set(combinedLogs.map((l) => l.workspace_id).filter(Boolean))];

      if (filterWorkspaceId) {
        combinedLogs = combinedLogs.filter((log) => log.workspace_id === filterWorkspaceId);
      }

      const limitedLogs = combinedLogs.slice(0, limit);
      setLogs(limitedLogs);

      if (uniqueIds.length > 0) {
        if (filterWorkspaceId && !uniqueIds.includes(filterWorkspaceId)) {
          setFilterWorkspaceId('');
        }

        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('id, name')
          .in('id', uniqueIds);
        if (workspaces) {
          const nameMap: Record<string, string> = {};
          workspaces.forEach((ws: { id: string; name: string }) => {
            nameMap[String(ws.id)] = ws.name;
          });
          setWorkspaceNames(nameMap);
          setWorkspaceOptions(
            uniqueIds
              .map((workspaceId) => ({ id: workspaceId, name: nameMap[workspaceId] || workspaceId }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        } else {
          setWorkspaceNames({});
          setWorkspaceOptions(
            uniqueIds
              .map((workspaceId) => ({ id: workspaceId, name: workspaceId }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      } else {
        setWorkspaceNames({});
        setWorkspaceOptions([]);
      }

      const newStats: ErrorStats = {
        total: combinedLogs.length,
        byType: {},
        byDirection: {}
      };

      combinedLogs.forEach((log) => {
        newStats.byType[log.message_type] = (newStats.byType[log.message_type] || 0) + 1;
        newStats.byDirection[log.direction] = (newStats.byDirection[log.direction] || 0) + 1;
      });

      setStats(newStats);
    } catch (error) {
      console.error('Error loading error logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'sms': return MessageSquare;
      case 'mms': return Phone;
      case 'email': return Mail;
      case 'voice': return Phone;
      default: return AlertTriangle;
    }
  };

  const getMessageTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'sms': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'mms': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'email': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'voice': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getDirectionBadgeColor = (direction: string): string => {
    if (direction === 'outbound') {
      return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    }
    if (direction === 'inbound') {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
    return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatRelativeTime = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      log.error_message?.toLowerCase().includes(searchLower)
      || log.error_code?.toLowerCase().includes(searchLower)
      || log.recipient?.toLowerCase().includes(searchLower)
      || log.sender?.toLowerCase().includes(searchLower)
      || workspaceNames[log.workspace_id]?.toLowerCase().includes(searchLower)
      || log.workspace_id?.toLowerCase().includes(searchLower)
      || log.twilio_sid?.toLowerCase().includes(searchLower)
      || log.message_type?.toLowerCase().includes(searchLower)
    );
  });

  const messageTypes = [
    { value: '', label: 'All Types' },
    { value: 'sms', label: 'SMS' },
    { value: 'mms', label: 'MMS' },
    { value: 'email', label: 'Email' },
    { value: 'voice', label: 'Voice' }
  ];

  const directions = [
    { value: '', label: 'All Directions' },
    { value: 'outbound', label: 'Outbound' },
    { value: 'inbound', label: 'Inbound' },
    { value: 'unknown', label: 'Unknown' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-400">Loading error logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Error Logs</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            SMS, Email, and Voice sending/receiving failures
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Errors</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">SMS/MMS Errors</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {(stats.byType.sms || 0) + (stats.byType.mms || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email Errors</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.byType.email || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
              <Phone className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Voice Errors</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.byType.voice || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Outbound Errors</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.byDirection.outbound || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Rate by Workspace Chart */}
      {logs.length > 0 && (() => {
        const counts: Record<string, number> = {};
        logs.forEach((log) => {
          const name = workspaceNames[log.workspace_id] || log.workspace_id || 'Unknown';
          counts[name] = (counts[name] || 0) + 1;
        });
        const chartData = Object.entries(counts)
          .map(([name, count]) => ({ name, errors: count }))
          .sort((a, b) => b.errors - a.errors);
        const barColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-3">Errors by Workspace</h3>
            <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 28)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#d1d5db', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                  labelStyle={{ color: '#d1d5db' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="errors" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search by error message, code, recipient, workspace..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <select
          value={filterMessageType}
          onChange={(e) => setFilterMessageType(e.target.value)}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          {messageTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filterDirection}
          onChange={(e) => setFilterDirection(e.target.value)}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          {directions.map((dir) => (
            <option key={dir.value} value={dir.value}>
              {dir.label}
            </option>
          ))}
        </select>

        <select
          value={filterWorkspaceId}
          onChange={(e) => setFilterWorkspaceId(e.target.value)}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-52"
        >
          <option value="">All Workspaces</option>
          {workspaceOptions.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value={25}>25 logs</option>
          <option value={50}>50 logs</option>
          <option value={100}>100 logs</option>
          <option value={200}>200 logs</option>
        </select>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        <span className="text-gray-500 dark:text-gray-400 text-sm">
          {filteredLogs.length} of {logs.length} errors
        </span>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Error
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Workspace
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => {
                const Icon = getMessageTypeIcon(log.message_type);
                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatDate(log.created_at)}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${getMessageTypeBadgeColor(log.message_type).split(' ')[1]}`} />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMessageTypeBadgeColor(log.message_type)}`}>
                          {log.message_type.toUpperCase()}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.direction === 'outbound' ? (
                          <ArrowUpRight className="w-4 h-4 text-orange-400" />
                        ) : log.direction === 'inbound' ? (
                          <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDirectionBadgeColor(log.direction)}`}>
                          {log.direction}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex flex-col">
                        <div className="text-sm text-gray-900 dark:text-white truncate" title={log.error_message}>
                          {log.error_message}
                        </div>
                        {log.error_code && (
                          <span className="text-xs text-red-500 dark:text-red-400 mt-1">
                            Code: {log.error_code}
                          </span>
                        )}
                        {log.twilio_sid && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                            Ref: {log.twilio_sid}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {log.recipient || log.sender || log.twilio_sid || 'N/A'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400" title={`ID: ${log.workspace_id}`}>
                        {workspaceNames[log.workspace_id] || log.workspace_id || 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 px-6">
            <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {logs.length === 0
                ? 'No errors found. This is good news!'
                : 'No errors match your search criteria.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
