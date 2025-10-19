/**
 * Admin Dashboard - SaaS Owner Control Panel
 * Connects to deepseek-test-livechat backend for workspace management
 * Follows Customer Connect Command Center design patterns
 * Simplified to focus on workspace management (removed duplicate navigation)
 */

import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  DollarSign,
  Shield,
  Database,
  Zap
} from 'lucide-react';
import { adminApi } from '../lib/adminApi';
import { MetricCard } from '../shared/components/ui/MetricCard';
import { AdminWorkspaceTable } from './AdminWorkspaceTable';

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    checkAdminAccessAndLoadData();
  }, []);

  const checkAdminAccessAndLoadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check admin access
      const hasAccess = await adminApi.checkAdminAccess();
      setHasAdminAccess(hasAccess);

      if (hasAccess) {
        // Load dashboard overview
        const response = await adminApi.getDashboardOverview();
        setDashboardData(response.data);
      }
    } catch (error: any) {
      console.error('Error loading admin dashboard:', error);
      setError(error.message);
      setHasAdminAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen-minus-nav">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center h-screen-minus-nav px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full shadow-lg">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-xl mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            {error || 'You do not have permission to access the admin dashboard. Please contact support if you believe this is an error.'}
          </p>
        </div>
      </div>
    );
  }

  const { overview } = dashboardData || {};
  const totalRevenue = (overview?.planDistribution?.pro || 0) * 99 +
                       (overview?.planDistribution?.advanced || 0) * 199 +
                       (overview?.planDistribution?.developer || 0) * 399;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workspace Management</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage subscriptions, plans, and workspace settings
        </p>
      </div>

      {/* Premium Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Workspaces"
          value={overview?.totalWorkspaces || 0}
          subtitle="Active organizations"
          icon={Users}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Active Subscriptions"
          value={overview?.activeSubscriptions || 0}
          subtitle="Paying customers"
          icon={TrendingUp}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          subtitle="Recurring revenue"
          icon={DollarSign}
          iconColor="text-emerald-600"
        />
        <MetricCard
          title="System Health"
          value="99.9%"
          subtitle="Uptime this month"
          icon={Zap}
          iconColor="text-purple-600"
        />
      </div>

      {/* Plan Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Subscription Plan Distribution
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Customer breakdown by plan tier
            </p>
          </div>
          <Database className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {overview?.planDistribution && Object.entries(overview.planDistribution).map(([plan, count]) => (
            <div
              key={plan}
              className="group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden relative"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20" />
              <div className="relative">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {plan}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 group-hover:scale-105 transition-transform duration-300">
                  {count as number}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workspace Management Table */}
      <AdminWorkspaceTable />
    </div>
  );
}
