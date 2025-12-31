import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, Zap, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { connectionAnalytics } from '../../services/connectionAnalytics';
import { tokenRefreshTracker } from '../../services/tokenRefreshTracker';

/**
 * Analytics Dashboard
 * Real-time monitoring of connection health, Socket.IO performance,
 * and token refresh metrics
 */

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  purple: '#8b5cf6',
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold mt-1" style={{ color }}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center mt-2">
            <TrendingUp
              className={`w-4 h-4 ${
                trend.isPositive ? 'text-green-500' : 'text-red-500 transform rotate-180'
              }`}
            />
            <span
              className={`text-sm ml-1 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.value}%
            </span>
          </div>
        )}
      </div>
      <div
        className="p-3 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
    </div>
  </div>
);

export const AnalyticsDashboard: React.FC = () => {
  const [connectionMetrics, setConnectionMetrics] = useState<any[]>([]);
  const [retryInsights, setRetryInsights] = useState<any[]>([]);
  const [tokenMetrics, setTokenMetrics] = useState<any[]>([]);
  const [tokenSuccessRate, setTokenSuccessRate] = useState<number>(0);
  const [avgRefreshTime, setAvgRefreshTime] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(24);

  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [connMetrics, retryData, tokenData, successRate, avgTime] =
          await Promise.all([
            connectionAnalytics.getMetricsSummary(timeRange),
            connectionAnalytics.getRetryInsights(timeRange),
            tokenRefreshTracker.getRefreshMetrics(timeRange),
            tokenRefreshTracker.getSuccessRate(timeRange),
            tokenRefreshTracker.getAverageRefreshTime(timeRange),
          ]);

        setConnectionMetrics(connMetrics || []);
        setRetryInsights(retryData || []);
        setTokenMetrics(tokenData || []);
        setTokenSuccessRate(successRate);
        setAvgRefreshTime(avgTime);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Calculate summary metrics
  const totalConnections = connectionMetrics.reduce(
    (sum, m) => sum + (m.successful_connections || 0),
    0
  );
  const totalErrors = connectionMetrics.reduce(
    (sum, m) => sum + (m.failed_connections || 0),
    0
  );
  const successRate = totalConnections + totalErrors > 0
    ? ((totalConnections / (totalConnections + totalErrors)) * 100).toFixed(1)
    : '100';
  const avgConnectionTime = connectionMetrics.length > 0
    ? (
        connectionMetrics.reduce((sum, m) => sum + (m.avg_connection_time_ms || 0), 0) /
        connectionMetrics.length
      ).toFixed(0)
    : '0';

  const circuitBreakerTriggers = connectionMetrics.reduce(
    (sum, m) => sum + (m.circuit_breaker_triggers || 0),
    0
  );

  const avgRecoveryTime = retryInsights.length > 0
    ? (
        retryInsights.reduce((sum, r) => sum + (r.avg_recovery_time_ms || 0), 0) /
        retryInsights.length
      ).toFixed(0)
    : '0';

  // Transform data for charts
  const connectionChartData = connectionMetrics.map((m) => ({
    time: new Date(m.hour).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    successful: m.successful_connections || 0,
    failed: m.failed_connections || 0,
    circuitBreaker: m.circuit_breaker_triggers || 0,
  })).reverse();

  const tokenChartData = tokenMetrics.map((m) => ({
    time: new Date(m.hour).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    successful: m.successful_refreshes || 0,
    failed: m.failed_refreshes || 0,
    avgTime: m.avg_refresh_time_ms || 0,
  })).reverse();

  const retryChartData = retryInsights.map((r) => ({
    time: new Date(r.hour).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    totalSessions: r.total_retry_sessions || 0,
    recovered: r.recovered_sessions || 0,
    avgAttempts: parseFloat(r.avg_attempts_per_session || 0).toFixed(1),
    avgRecoveryTime: r.avg_recovery_time_ms || 0,
  })).reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Connection Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Real-time monitoring of Socket.IO and authentication performance
        </p>

        {/* Time Range Selector */}
        <div className="mt-4 flex gap-2">
          {[6, 12, 24, 48].map((hours) => (
            <button
              key={hours}
              onClick={() => setTimeRange(hours)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === hours
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {hours}h
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Connection Success Rate"
          value={`${successRate}%`}
          subtitle={`${totalConnections} successful / ${totalErrors} failed`}
          icon={<CheckCircle className="w-6 h-6" />}
          color={COLORS.success}
        />

        <MetricCard
          title="Avg Connection Time"
          value={`${avgConnectionTime}ms`}
          subtitle="Time to establish connection"
          icon={<Clock className="w-6 h-6" />}
          color={COLORS.primary}
        />

        <MetricCard
          title="Token Refresh Success"
          value={`${tokenSuccessRate.toFixed(1)}%`}
          subtitle={`${avgRefreshTime}ms avg refresh time`}
          icon={<Zap className="w-6 h-6" />}
          color={COLORS.purple}
        />

        <MetricCard
          title="Circuit Breaker Triggers"
          value={circuitBreakerTriggers}
          subtitle={`${avgRecoveryTime}ms avg recovery time`}
          icon={<AlertCircle className="w-6 h-6" />}
          color={circuitBreakerTriggers > 0 ? COLORS.warning : COLORS.success}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Events Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Connection Events
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={connectionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="successful"
                stroke={COLORS.success}
                strokeWidth={2}
                name="Successful"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke={COLORS.error}
                strokeWidth={2}
                name="Failed"
              />
              <Line
                type="monotone"
                dataKey="circuitBreaker"
                stroke={COLORS.warning}
                strokeWidth={2}
                name="Circuit Breaker"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Token Refresh Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Token Refresh Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tokenChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="successful" fill={COLORS.success} name="Successful" />
              <Bar dataKey="failed" fill={COLORS.error} name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Retry Pattern Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Retry Pattern Analysis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={retryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalSessions"
                stroke={COLORS.primary}
                strokeWidth={2}
                name="Total Retry Sessions"
              />
              <Line
                type="monotone"
                dataKey="recovered"
                stroke={COLORS.success}
                strokeWidth={2}
                name="Recovered"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Average Recovery Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Average Recovery Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={retryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="avgRecoveryTime"
                fill={COLORS.purple}
                name="Avg Recovery (ms)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Key Insights
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <Activity className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                <strong>{totalConnections + totalErrors}</strong> total connection attempts in
                the last {timeRange} hours
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                <strong>{successRate}%</strong> of connections were successful
              </span>
            </li>
            <li className="flex items-start">
              <Zap className="w-5 h-5 text-purple-500 mr-2 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                Token refreshes completing in <strong>{avgRefreshTime}ms</strong> on average
              </span>
            </li>
            {circuitBreakerTriggers > 0 && (
              <li className="flex items-start">
                <AlertCircle className="w-5 h-5 text-orange-500 mr-2 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">
                  Circuit breaker triggered <strong>{circuitBreakerTriggers}</strong> times
                </span>
              </li>
            )}
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Health Status
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Connection Health
                </span>
                <span className="text-sm font-medium">{successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Token Refresh Health
                </span>
                <span className="text-sm font-medium">{tokenSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${tokenSuccessRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Recovery Success Rate
                </span>
                <span className="text-sm font-medium">
                  {retryInsights.length > 0
                    ? (
                        (retryInsights.reduce((sum, r) => sum + (r.recovered_sessions || 0), 0) /
                          retryInsights.reduce((sum, r) => sum + (r.total_retry_sessions || 0), 0)) *
                        100
                      ).toFixed(1)
                    : '100'}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      retryInsights.length > 0
                        ? (retryInsights.reduce((sum, r) => sum + (r.recovered_sessions || 0), 0) /
                            retryInsights.reduce(
                              (sum, r) => sum + (r.total_retry_sessions || 0),
                              0
                            )) *
                          100
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
