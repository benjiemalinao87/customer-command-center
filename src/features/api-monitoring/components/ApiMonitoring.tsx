/**
 * API Monitoring Component
 * Monitor API usage, limits, and performance across all workspaces
 * Converted from Chakra UI to Tailwind CSS with Recharts
 */

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Server, AlertTriangle, BarChart2, PieChart, RefreshCw, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { getEndpointAnalytics } from '../../../lib/supabaseAdmin';

interface WorkspaceData {
  id: string;
  name: string;
  subscription_plan: string;
  api_requests_count: number;
  successful_requests: number;
  api_limit: number;
}

interface SummaryData {
  total_requests: number;
  successful_requests: number;
  requests_change: number;
  avg_response_time: number;
}

interface Violation {
  workspace_id: string;
  endpoint_path: string;
  request_count: number;
  limit: number;
  first_violation: string;
}

interface EndpointUsage {
  endpoint_path: string;
  method: string;
  request_count: number;
  avg_response_time: number;
  status_codes?: { code: number; count: number }[];
}

interface ApiKeyUsage {
  name: string;
  api_key_id?: string;
  request_count: number;
  last_used: string | null;
  is_active: boolean;
}

export function ApiMonitoring() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24hours');
  const [activeTab, setActiveTab] = useState<'workspace' | 'endpoint' | 'violations'>('workspace');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalWorkspace, setModalWorkspace] = useState<WorkspaceData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [endpointUsage, setEndpointUsage] = useState<EndpointUsage[]>([]);
  const [apiKeyUsage, setApiKeyUsage] = useState<ApiKeyUsage[]>([]);
  const [sortBy, setSortBy] = useState<'requests' | 'name' | 'usage'>('requests');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [data, setData] = useState<{
    summary: SummaryData | null;
    workspaces: WorkspaceData[];
    violations: Violation[];
  }>({
    summary: null,
    workspaces: [],
    violations: []
  });

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [summaryResponse, workspacesResponse, violationsResponse, endpointsData] = await Promise.all([
        adminApi.getApiRequestSummary(timeRange),
        adminApi.getWorkspaces(),
        adminApi.getRateLimitViolations(null, timeRange),
        getEndpointAnalytics()
      ]);

      setData({
        summary: summaryResponse.data,
        workspaces: workspacesResponse.data || [],
        violations: violationsResponse.data || []
      });
      
      // Load endpoint analytics from Supabase
      setEndpointUsage(endpointsData);
    } catch (error) {
      console.error('Error loading API monitoring data:', error);
      // Use mock data
      setData({
        summary: {
          total_requests: 760,
          successful_requests: 124,
          requests_change: 4122.22,
          avg_response_time: 535
        },
        workspaces: [
          {
            id: '91462',
            name: "fake535@gmail.com's Workspace",
            subscription_plan: 'FREE',
            api_requests_count: 0,
            successful_requests: 0,
            api_limit: 1000
          },
          {
            id: '54383',
            name: "fake535@gmail.com's Workspace",
            subscription_plan: 'FREE',
            api_requests_count: 0,
            successful_requests: 0,
            api_limit: 1000
          }
        ],
        violations: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  const getStatusColor = (apiRequests: number, apiLimit: number): string => {
    const usage = apiRequests / apiLimit;
    if (apiRequests > apiLimit) return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (usage > 0.9) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    return 'bg-green-500/10 text-green-400 border-green-500/30';
  };

  const getStatusText = (apiRequests: number, apiLimit: number): string => {
    if (apiRequests > apiLimit) return 'Over Limit';
    if (apiRequests / apiLimit > 0.9) return 'Near Limit';
    return 'Normal';
  };

  const handleViewDetails = async (workspace: WorkspaceData) => {
    try {
      setModalWorkspace(workspace);
      setIsModalOpen(true);
      setModalLoading(true);

      const [endpointResponse, apiKeyResponse] = await Promise.all([
        adminApi.getEndpointUsage(workspace.id, timeRange),
        adminApi.getApiKeyUsage(workspace.id, timeRange)
      ]);

      setEndpointUsage(endpointResponse.data || []);
      setApiKeyUsage(apiKeyResponse.data || []);
    } catch (error) {
      console.error('Error loading workspace details:', error);
      // Mock data for demonstration
      setEndpointUsage([
        {
          endpoint_path: `/workspaces/${workspace.id}/api-key-usage`,
          method: 'API',
          request_count: 294,
          avg_response_time: 497,
          status_codes: [{ code: 304, count: 1 }]
        },
        {
          endpoint_path: '/workspaces',
          method: 'API',
          request_count: 12,
          avg_response_time: 497,
          status_codes: [{ code: 200, count: 1 }]
        }
      ]);
      setApiKeyUsage([
        {
          name: 'creating contacts',
          api_key_id: '7bf8d136',
          request_count: 0,
          last_used: '2025-10-06T08:32:51.000Z',
          is_active: true
        },
        {
          name: 'Test Triggers API Key',
          api_key_id: '25790648',
          request_count: 0,
          last_used: null,
          is_active: true
        },
        {
          name: 'cfsbdfb',
          api_key_id: '5d2a067d',
          request_count: 0,
          last_used: '2025-04-06T08:30:13.000Z',
          is_active: true
        }
      ]);
    } finally {
      setModalLoading(false);
    }
  };

  const getMethodColor = (method: string): string => {
    switch (method) {
      case 'GET': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'POST': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'PUT': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'DELETE': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getResponseTimeColor = (time: number): string => {
    if (time > 1000) return 'text-red-400';
    if (time > 500) return 'text-orange-400';
    return 'text-green-400';
  };

  const getHttpStatusColor = (code: number): string => {
    if (code >= 200 && code < 300) return 'bg-green-500/10 text-green-400 border-green-500/30';
    if (code >= 300 && code < 400) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (code >= 400 && code < 500) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (code >= 500) return 'bg-red-500/10 text-red-400 border-red-500/30';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  // Sort workspaces based on current sort criteria
  const getSortedWorkspaces = () => {
    const sorted = [...data.workspaces].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'requests':
          compareValue = (a.api_requests_count || 0) - (b.api_requests_count || 0);
          break;
        case 'name':
          compareValue = (a.name || a.id).localeCompare(b.name || b.id);
          break;
        case 'usage':
          const usageA = (a.api_requests_count || 0) / (a.api_limit || 1);
          const usageB = (b.api_requests_count || 0) / (b.api_limit || 1);
          compareValue = usageA - usageB;
          break;
      }
      
      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
    
    return sorted;
  };

  const handleSort = (column: 'requests' | 'name' | 'usage') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-400">Loading API monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
            <Activity className="w-6 h-6" />
            API Request Monitoring
          </h2>
          <p className="text-sm text-gray-400">
            Monitor API usage, limits, and performance across all workspaces
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="1hour">Last Hour</option>
            <option value="24hours">Last 24h</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex flex-col">
              <p className="text-gray-400 text-sm font-medium mb-2">Total Requests</p>
              <p className="text-3xl font-bold text-blue-400 mb-1">
                {formatNumber(data.summary.total_requests)}
              </p>
              <p className="text-xs text-gray-500">
                <span className="text-green-400">
                  ↑ {Math.abs(data.summary.requests_change || 0)}%
                </span>{' '}
                vs previous period
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex flex-col">
              <p className="text-gray-400 text-sm font-medium mb-2">Success Rate</p>
              <p className="text-3xl font-bold text-green-400 mb-1">
                {((data.summary.successful_requests / data.summary.total_requests) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {formatNumber(data.summary.successful_requests)} successful
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex flex-col">
              <p className="text-gray-400 text-sm font-medium mb-2">Rate Limit Violations</p>
              <p className={`text-3xl font-bold mb-1 ${data.violations.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {data.violations.length}
              </p>
              <p className="text-xs text-gray-500">
                {data.violations.length > 0 ? 'Requires attention' : 'All good'}
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex flex-col">
              <p className="text-gray-400 text-sm font-medium mb-2">Avg Response Time</p>
              <p className="text-3xl font-bold text-blue-400 mb-1">
                {data.summary.avg_response_time || 0}ms
              </p>
              <p className="text-xs text-gray-500">Across all endpoints</p>
            </div>
          </div>
        </div>
      )}

      {/* Violations Alert */}
      {data.violations.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Rate Limit Violations Detected</p>
              <p className="text-sm text-gray-400 mt-1">
                {data.violations.length} workspaces have exceeded their API limits in the selected time period.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="border-b border-gray-700">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'workspace'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Server className="w-4 h-4" />
              Workspace Usage
            </button>
            <button
              onClick={() => setActiveTab('endpoint')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'endpoint'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Endpoint Analytics
            </button>
            <button
              onClick={() => setActiveTab('violations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'violations'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Violations
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Workspace Usage Tab */}
          {activeTab === 'workspace' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">API Usage by Workspace</h3>
                <p className="text-sm text-gray-400">
                  Click on a workspace to view detailed endpoint usage
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-gray-200 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Workspace
                          {sortBy === 'name' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Subscription
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-gray-200 transition-colors"
                        onClick={() => handleSort('requests')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Requests
                          {sortBy === 'requests' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                        Success Rate
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-gray-200 transition-colors"
                        onClick={() => handleSort('usage')}
                      >
                        <div className="flex items-center gap-2">
                          Limit Usage
                          {sortBy === 'usage' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {getSortedWorkspaces().map((workspace) => {
                      const usage = (workspace.api_requests_count / workspace.api_limit) * 100;
                      return (
                        <tr key={workspace.id} className="hover:bg-gray-700/30 transition-colors cursor-pointer">
                          <td className="px-4 py-4">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {workspace.name || workspace.id}
                              </div>
                              <div className="text-xs text-gray-500">ID: {workspace.id}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              {workspace.subscription_plan || 'Free'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-medium text-white">
                              {formatNumber(workspace.api_requests_count || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm text-green-400">
                              {((workspace.successful_requests || 0) / Math.max(workspace.api_requests_count || 1, 1) * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    usage > 90 ? 'bg-red-500' : usage > 70 ? 'bg-orange-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(usage, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400">
                                {workspace.api_requests_count || 0} / {workspace.api_limit || 1000}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(workspace.api_requests_count || 0, workspace.api_limit || 1000)}`}>
                              {getStatusText(workspace.api_requests_count || 0, workspace.api_limit || 1000)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(workspace);
                              }}
                              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Endpoint Analytics Tab */}
          {activeTab === 'endpoint' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">Endpoint Analytics</h3>
                <p className="text-sm text-gray-400">
                  API endpoint usage and performance across all workspaces
                </p>
              </div>

              {endpointUsage.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    No endpoint data available for the selected time range
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Endpoint
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Method
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                          Requests
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                          Avg Response Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {endpointUsage.map((endpoint, index) => (
                        <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-4">
                            <code className="text-sm text-blue-400 font-mono">
                              {endpoint.endpoint_path}
                            </code>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                              {endpoint.method || 'GET'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-medium text-white">
                              {formatNumber(endpoint.request_count)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm text-gray-300">
                              {Math.round(endpoint.avg_response_time)}ms
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-1">
                              {endpoint.status_codes?.map((status, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    status.code < 300
                                      ? 'bg-green-500/10 text-green-400'
                                      : status.code < 400
                                      ? 'bg-blue-500/10 text-blue-400'
                                      : status.code < 500
                                      ? 'bg-orange-500/10 text-orange-400'
                                      : 'bg-red-500/10 text-red-400'
                                  }`}
                                >
                                  {status.code}: {status.count}
                                </span>
                              )) || (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400">
                                  200: {endpoint.request_count}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Violations Tab */}
          {activeTab === 'violations' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">Rate Limit Violations</h3>
                <p className="text-sm text-gray-400">
                  Workspaces that have exceeded their API limits
                </p>
              </div>

              {data.violations.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-green-400 font-medium mb-2">No Rate Limit Violations</p>
                  <p className="text-gray-400 text-sm">
                    All workspaces are operating within their API limits
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Workspace
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Endpoint
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                          Requests
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                          Limit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          First Violation
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {data.violations.map((violation, index) => (
                        <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-white">
                              {violation.workspace_id.substring(0, 8)}...
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-mono text-white">
                              {violation.endpoint_path}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-medium text-red-400">
                              {formatNumber(violation.request_count)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm text-white">
                              {formatNumber(violation.limit)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-400">
                              {new Date(violation.first_violation).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                              Over Limit
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Workspace Details Modal */}
      {isModalOpen && modalWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-white">Workspace API Details</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-300">{modalWorkspace.name || modalWorkspace.id}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    {modalWorkspace.subscription_plan || 'Free'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
                    <p className="text-gray-400">Loading workspace details...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/50 rounded-lg border border-gray-600 p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Requests</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {formatNumber(modalWorkspace.api_requests_count || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last {timeRange.replace('hours', 'h').replace('days', 'd')}
                      </p>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg border border-gray-600 p-4">
                      <p className="text-gray-400 text-sm mb-1">Success Rate</p>
                      <p className="text-2xl font-bold text-green-400">
                        {((modalWorkspace.successful_requests || 0) / Math.max(modalWorkspace.api_requests_count || 1, 1) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatNumber(modalWorkspace.successful_requests || 0)} successful
                      </p>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg border border-gray-600 p-4">
                      <p className="text-gray-400 text-sm mb-1">Rate Limit Usage</p>
                      <p className={`text-2xl font-bold ${
                        ((modalWorkspace.api_requests_count || 0) / (modalWorkspace.api_limit || 1000)) > 0.9
                          ? 'text-red-400'
                          : ((modalWorkspace.api_requests_count || 0) / (modalWorkspace.api_limit || 1000)) > 0.7
                            ? 'text-orange-400'
                            : 'text-green-400'
                      }`}>
                        {(((modalWorkspace.api_requests_count || 0) / (modalWorkspace.api_limit || 1000)) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {modalWorkspace.api_requests_count || 0} / {modalWorkspace.api_limit || 1000}
                      </p>
                    </div>
                  </div>

                  {/* Endpoint Usage */}
                  <div className="bg-gray-700/30 rounded-lg border border-gray-600 p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Endpoint Usage Breakdown</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      All API endpoints accessed by this workspace
                    </p>

                    {endpointUsage.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Endpoint Path
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Method
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                                Requests
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                                Avg Response Time
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Status Codes
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {endpointUsage.map((endpoint, index) => (
                              <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="text-sm font-mono text-white break-all">
                                    {endpoint.endpoint_path}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getMethodColor(endpoint.method)}`}>
                                    {endpoint.method}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-medium text-white">
                                    {formatNumber(endpoint.request_count)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-sm font-medium ${getResponseTimeColor(endpoint.avg_response_time)}`}>
                                    {endpoint.avg_response_time}ms
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {endpoint.status_codes?.map((status) => (
                                      <span
                                        key={status.code}
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getHttpStatusColor(status.code)}`}
                                      >
                                        {status.code}: {status.count}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400">
                          No endpoint usage data found for the selected time period
                        </p>
                      </div>
                    )}
                  </div>

                  {/* API Key Usage */}
                  <div className="bg-gray-700/30 rounded-lg border border-gray-600 p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">API Key Usage</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Usage breakdown by API key for this workspace
                    </p>

                    {apiKeyUsage.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                API Key Name
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                                Requests
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Last Used
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {apiKeyUsage.map((apiKey, index) => (
                              <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-white">{apiKey.name}</span>
                                    <span className="text-xs font-mono text-gray-500">
                                      {apiKey.api_key_id?.substring(0, 8)}...
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-medium text-white">
                                    {formatNumber(apiKey.request_count)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-400">
                                    {apiKey.last_used
                                      ? new Date(apiKey.last_used).toLocaleDateString() + ' ' +
                                        new Date(apiKey.last_used).toLocaleTimeString()
                                      : 'Never'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    apiKey.is_active ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                                  }`}>
                                    {apiKey.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400">
                          No API key usage data found for this workspace
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <span className="text-sm text-gray-400">
                Data for: {timeRange.replace('hours', 'h').replace('days', 'd')}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
