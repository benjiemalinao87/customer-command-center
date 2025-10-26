import { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Zap,
  BarChart3,
  Users,
  RefreshCw
} from 'lucide-react';

interface WebhookMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  average_processing_time: number;
  p50_processing_time: number;
  p95_processing_time: number;
  p99_processing_time: number;
  error_rate: number;
  duplicates_prevented: number;
  last_24h: {
    requests: number;
    success_rate: number;
    avg_processing_time: number;
  };
}

interface WebhookData {
  webhook_id: string;
  webhook_name: string;
  workspace_id: string;
  metrics: WebhookMetrics;
  last_updated: string;
}

export function WebhookAnalytics() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'cloudflare' | 'nodejs'>('all');

  useEffect(() => {
    fetchWebhookMetrics();
    // Auto-refresh every 5 minutes instead of 30 seconds to reduce page refreshing
    const interval = setInterval(fetchWebhookMetrics, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [timeRange, sourceFilter]);

  const fetchWebhookMetrics = async () => {
    try {
      setLoading(true);
      // Fetch from backend API
      const apiUrl = import.meta.env.VITE_API_URL || 'https://cc.automate8.com';
      const sourceParam = sourceFilter !== 'all' ? `&source=${sourceFilter}` : '';
      const response = await fetch(`${apiUrl}/api/webhook-analytics?range=${timeRange}${sourceParam}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setWebhooks(data);
    } catch (error) {
      console.error('Failed to fetch webhook metrics:', error);
      // Set empty array on error to show "no data" state
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedWebhookData = webhooks.find(w => w.webhook_id === selectedWebhook) || webhooks[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Webhook Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time webhook performance monitoring and analytics
          </p>
        </div>
        <button
          onClick={fetchWebhookMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['1h', '24h', '7d', '30d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {range === '1h' ? 'Last Hour' : range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
          </button>
        ))}
      </div>

      {/* Source Filter Selector */}
      <div className="flex gap-2">
        {(['all', 'cloudflare', 'nodejs'] as const).map((source) => (
          <button
            key={source}
            onClick={() => setSourceFilter(source)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sourceFilter === source
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {source === 'all' ? 'All Sources' : source === 'cloudflare' ? '☁️ Cloudflare' : '🟢 Node.js'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Requests"
              value={selectedWebhookData?.metrics.total_requests.toLocaleString() || '0'}
              icon={<Activity className="w-6 h-6" />}
              trend={`+${selectedWebhookData?.metrics.last_24h.requests || 0} (24h)`}
              color="blue"
            />
            <StatCard
              title="Success Rate"
              value={`${selectedWebhookData?.metrics.success_rate.toFixed(2) || '0'}%`}
              icon={<CheckCircle className="w-6 h-6" />}
              trend={`${selectedWebhookData?.metrics.last_24h.success_rate.toFixed(2) || '0'}% (24h)`}
              color="green"
            />
            <StatCard
              title="Avg Processing Time"
              value={`${selectedWebhookData?.metrics.average_processing_time || '0'}ms`}
              icon={<Clock className="w-6 h-6" />}
              trend={`${selectedWebhookData?.metrics.last_24h.avg_processing_time || '0'}ms (24h)`}
              color="purple"
            />
            <StatCard
              title="Error Rate"
              value={`${selectedWebhookData?.metrics.error_rate.toFixed(2) || '0'}%`}
              icon={<AlertCircle className="w-6 h-6" />}
              trend={`${selectedWebhookData?.metrics.failed_requests || 0} failures`}
              color="red"
            />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Processing Time Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Processing Time Distribution
              </h3>
              
              {/* Explanation */}
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                  <strong>Percentiles explained:</strong> These show how fast your webhooks process requests.
                  <br />
                  • <strong>P50 (Median):</strong> 50% of requests complete within this time
                  <br />
                  • <strong>P95:</strong> 95% of requests complete within this time
                  <br />
                  • <strong>P99:</strong> 99% of requests complete within this time (slowest 1%)
                </p>
              </div>

              <div className="space-y-4">
                <PercentileBar
                  label="P50 (Median)"
                  value={selectedWebhookData?.metrics.p50_processing_time || 0}
                  maxValue={selectedWebhookData?.metrics.p99_processing_time || 100}
                  color="bg-green-500"
                />
                <PercentileBar
                  label="P95"
                  value={selectedWebhookData?.metrics.p95_processing_time || 0}
                  maxValue={selectedWebhookData?.metrics.p99_processing_time || 100}
                  color="bg-yellow-500"
                />
                <PercentileBar
                  label="P99"
                  value={selectedWebhookData?.metrics.p99_processing_time || 0}
                  maxValue={selectedWebhookData?.metrics.p99_processing_time || 100}
                  color="bg-red-500"
                />
              </div>
            </div>

            {/* Duplicate Prevention Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Duplicate Prevention
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Duplicates Prevented</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {selectedWebhookData?.metrics.duplicates_prevented.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Prevention Rate</span>
                  <span className="text-2xl font-bold text-green-600">
                    {selectedWebhookData?.metrics.total_requests > 0
                      ? ((selectedWebhookData?.metrics.duplicates_prevented / selectedWebhookData?.metrics.total_requests) * 100).toFixed(2)
                      : '0'}%
                  </span>
                </div>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Database-level protection:</strong> UNIQUE constraint prevents duplicates within workspace
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Active Webhooks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Webhook Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Workspace
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Source
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Requests
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Success Rate
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Avg Time
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((webhook) => (
                    <tr
                      key={webhook.webhook_id}
                      onClick={() => setSelectedWebhook(webhook.webhook_id)}
                      className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selectedWebhook === webhook.webhook_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {webhook.webhook_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {webhook.webhook_id}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {webhook.workspace_id}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {webhook.source_breakdown && Object.entries(webhook.source_breakdown).map(([source, count]) => (
                            <span
                              key={source}
                              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                source === 'cloudflare' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  : source === 'nodejs'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {source === 'cloudflare' ? '☁️ Cloudflare' : source === 'nodejs' ? '🟢 Node.js' : '❓ Unknown'} ({count})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {webhook.metrics.total_requests.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          webhook.metrics.success_rate >= 99
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : webhook.metrics.success_rate >= 95
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {webhook.metrics.success_rate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {webhook.metrics.average_processing_time}ms
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Performance Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InsightCard
                title="Cloudflare Worker"
                value="~45ms"
                description="Average processing time at edge"
                status="excellent"
              />
              <InsightCard
                title="Node.js Backend"
                value="~3000ms"
                description="Average processing time on server"
                status="good"
              />
              <InsightCard
                title="Performance Gain"
                value="67x faster"
                description="Cloudflare vs Node.js"
                status="excellent"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  color: 'blue' | 'green' | 'purple' | 'red';
}

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {value}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {trend}
      </p>
    </div>
  );
}

interface PercentileBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

function PercentileBar({ label, value, maxValue, color }: PercentileBarProps) {
  const percentage = (value / maxValue) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{value}ms</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface InsightCardProps {
  title: string;
  value: string;
  description: string;
  status: 'excellent' | 'good' | 'warning';
}

function InsightCard({ title, value, description, status }: InsightCardProps) {
  const statusColors = {
    excellent: 'border-green-500 bg-green-50 dark:bg-green-900/10',
    good: 'border-blue-500 bg-blue-50 dark:bg-blue-900/10',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
  };

  return (
    <div className={`border-l-4 ${statusColors[status]} p-4 rounded-r-lg`}>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h4>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

