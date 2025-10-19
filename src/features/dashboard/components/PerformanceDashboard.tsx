import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Activity,
  TrendingUp,
  Globe,
  MapPin,
  Zap,
  Clock,
  Database,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { MetricCard } from '../../../shared/components/ui';
import { MultiLineChart } from '../../../shared/components/charts';
import { DonutChart } from '../../../shared/components/charts';
import { BarChart } from '../../../shared/components/charts';
import { adminApi } from '../../../lib/adminApi';

interface PerformanceDashboardProps {
  dateRange: { from: string; to: string };
}

export function PerformanceDashboard({ dateRange }: PerformanceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Try to load admin dashboard data
      const response = await adminApi.getDashboardOverview();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use mock data if API fails
      setDashboardData({
        overview: {
          totalWorkspaces: 24,
          activeSubscriptions: 18,
          totalUsers: 156,
          totalAdmins: 12,
          totalAgents: 144,
          apiRequests: 45230,
          totalLogins: 892,
          planDistribution: {
            free: 6,
            pro: 8,
            advanced: 7,
            developer: 3
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Mock data for API usage trends - 7 days
  const usageLabels = ['Jan 8', 'Jan 9', 'Jan 10', 'Jan 11', 'Jan 12', 'Jan 13', 'Jan 14'];
  const apiRequestsData = [5200, 6100, 7500, 5800, 6900, 6200, 7300];
  const activeUsersData = [120, 135, 142, 128, 145, 138, 156];
  const newSignupsData = [8, 12, 15, 10, 18, 14, 20];

  const usageTrendsSeries = [
    {
      name: 'API Requests',
      data: usageLabels.map((label, i) => ({
        label,
        value: apiRequestsData[i]
      })),
      color: '#3b82f6' // Blue
    },
    {
      name: 'Active Users',
      data: usageLabels.map((label, i) => ({
        label,
        value: activeUsersData[i]
      })),
      color: '#10b981' // Green
    },
    {
      name: 'New Signups',
      data: usageLabels.map((label, i) => ({
        label,
        value: newSignupsData[i]
      })),
      color: '#8b5cf6' // Purple
    }
  ];

  // Top API Endpoints (most used)
  const topEndpoints = [
    { label: '/api/sms/send', value: 12450, color: '#ec4899' },
    { label: '/api/livechat/messages', value: 9830, color: '#8b5cf6' },
    { label: '/api/triggers/execute', value: 7620, color: '#3b82f6' },
    { label: '/api/billing/usage', value: 5340, color: '#10b981' },
    { label: '/api/integrations/sync', value: 4210, color: '#f59e0b' }
  ];

  // Geographic distribution of requests
  const locationData = [
    { label: 'United States', value: 45, color: '#3b82f6' },
    { label: 'Canada', value: 18, color: '#10b981' },
    { label: 'United Kingdom', value: 15, color: '#8b5cf6' },
    { label: 'Australia', value: 12, color: '#f59e0b' },
    { label: 'Others', value: 10, color: '#6b7280' }
  ];

  // Subscription plan distribution
  const planData = dashboardData?.overview?.planDistribution
    ? [
        { label: 'Free', value: dashboardData.overview.planDistribution.free || 0, color: '#6b7280' },
        { label: 'Pro', value: dashboardData.overview.planDistribution.pro || 0, color: '#3b82f6' },
        { label: 'Advanced', value: dashboardData.overview.planDistribution.advanced || 0, color: '#8b5cf6' },
        { label: 'Developer', value: dashboardData.overview.planDistribution.developer || 0, color: '#10b981' }
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  const { overview } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Workspaces"
          value={overview?.totalWorkspaces || 0}
          subtitle="Active organizations"
          icon={Building2}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Total Users"
          value={overview?.totalUsers || 0}
          subtitle={`${overview?.totalAdmins || 0} admins, ${overview?.totalAgents || 0} agents`}
          icon={Users}
          iconColor="text-green-600"
        />
        <MetricCard
          title="API Requests"
          value={(overview?.apiRequests || 45230).toLocaleString()}
          subtitle="Last 24 hours"
          icon={Activity}
          iconColor="text-orange-600"
          trend={{
            value: 12.5,
            isPositive: true
          }}
        />
        <MetricCard
          title="Total Logins"
          value={overview?.totalLogins || 892}
          subtitle="Active sessions today"
          icon={TrendingUp}
          iconColor="text-purple-600"
          trend={{
            value: 8.3,
            isPositive: true
          }}
        />
      </div>

      {/* Usage Trends & Location Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Platform Usage Trends</h3>
            <TrendingUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <MultiLineChart series={usageTrendsSeries} height={200} showLegend={true} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Geographic Distribution</h3>
            <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="flex justify-center py-4">
            <DonutChart data={locationData} size={200} innerSize={70} />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Avg Response Time"
          value="142ms"
          subtitle="API latency (p95)"
          icon={Zap}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Uptime"
          value="99.98%"
          subtitle="Last 30 days"
          icon={Clock}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Data Storage"
          value="2.4 TB"
          subtitle="Across all workspaces"
          icon={Database}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Top API Endpoints & Subscription Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top API Endpoints */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Most Used API Endpoints
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Request volume in last 24 hours
              </p>
            </div>
            <Activity className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="space-y-4">
            {topEndpoints.map((endpoint, index) => (
              <div key={endpoint.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-mono">
                    {endpoint.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {endpoint.value.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(endpoint.value / topEndpoints[0].value) * 100}%`,
                      backgroundColor: endpoint.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Plan Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Subscription Plans
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Customer breakdown by tier
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="space-y-4">
            {planData.map((plan) => (
              <div key={plan.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: plan.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {plan.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {plan.value} workspaces
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(plan.value / (overview?.totalWorkspaces || 1)) * 100}%`,
                      backgroundColor: plan.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Companies Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Top Companies by Usage
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Highest API request volume this month
            </p>
          </div>
          <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>

        <div className="space-y-3">
          {[
            { name: 'TechFlow Inc', requests: 28700, color: '#ec4899' },
            { name: 'DataVision Corp', requests: 24500, color: '#8b5cf6' },
            { name: 'CloudScale Solutions', requests: 19800, color: '#3b82f6' },
            { name: 'AI Dynamics Ltd', requests: 16200, color: '#10b981' },
            { name: 'Digital Frontier', requests: 12400, color: '#f59e0b' }
          ].map((company, index) => (
            <div key={company.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-1 h-12 rounded-full"
                  style={{ backgroundColor: company.color }}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {company.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {company.requests.toLocaleString()} requests
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {company.requests.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
