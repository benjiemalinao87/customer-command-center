/**
 * Message Error Logs Component
 * Displays SMS and Email sending/receiving errors for support monitoring
 * Provides filtering by message type, direction, and workspace
 */

import React, { useState, useEffect } from 'react';
import { Filter, Mail, MessageSquare, AlertTriangle, Clock, RefreshCw, Phone, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MessageErrorLog {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  message_type: 'sms' | 'email' | 'mms';
  direction: 'inbound' | 'outbound';
  error_code: string | null;
  error_message: string;
  details: Record<string, any>;
  recipient: string | null;
  sender: string | null;
  message_body: string | null;
  twilio_sid: string | null;
  created_at: string;
}

interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  byDirection: Record<string, number>;
}

export function MessageErrorLogs() {
  const [logs, setLogs] = useState<MessageErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMessageType, setFilterMessageType] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(50);
  const [stats, setStats] = useState<ErrorStats>({ total: 0, byType: {}, byDirection: {} });

  useEffect(() => {
    loadLogs();
  }, [filterMessageType, filterDirection, limit]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('message_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filterMessageType) {
        query = query.eq('message_type', filterMessageType);
      }

      if (filterDirection) {
        query = query.eq('direction', filterDirection);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading message error logs:', error);
        setLogs([]);
        return;
      }

      setLogs(data || []);
      
      // Calculate stats
      const allLogs = data || [];
      const newStats: ErrorStats = {
        total: allLogs.length,
        byType: {},
        byDirection: {}
      };
      
      allLogs.forEach(log => {
        newStats.byType[log.message_type] = (newStats.byType[log.message_type] || 0) + 1;
        newStats.byDirection[log.direction] = (newStats.byDirection[log.direction] || 0) + 1;
      });
      
      setStats(newStats);
    } catch (error) {
      console.error('Error loading message error logs:', error);
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
      default: return AlertTriangle;
    }
  };

  const getMessageTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'sms': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'mms': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'email': return 'bg-green-500/10 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getDirectionBadgeColor = (direction: string): string => {
    return direction === 'outbound'
      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
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

  // Filter logs based on search term
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      log.error_message?.toLowerCase().includes(searchLower) ||
      log.error_code?.toLowerCase().includes(searchLower) ||
      log.recipient?.toLowerCase().includes(searchLower) ||
      log.sender?.toLowerCase().includes(searchLower) ||
      log.workspace_id?.toLowerCase().includes(searchLower) ||
      log.twilio_sid?.toLowerCase().includes(searchLower)
    );
  });

  const messageTypes = [
    { value: '', label: 'All Types' },
    { value: 'sms', label: 'SMS' },
    { value: 'mms', label: 'MMS' },
    { value: 'email', label: 'Email' }
  ];

  const directions = [
    { value: '', label: 'All Directions' },
    { value: 'outbound', label: 'Outbound' },
    { value: 'inbound', label: 'Inbound' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-400">Loading message error logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Message Error Logs</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            SMS and Email sending/receiving failures
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
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
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
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
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {log.recipient || 'N/A'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {log.workspace_id || 'N/A'}
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
                ? 'No message errors found. This is good news! 🎉'
                : 'No errors match your search criteria.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
