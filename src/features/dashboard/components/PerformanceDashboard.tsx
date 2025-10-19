import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Activity,
  TrendingUp,
  Globe,
  Zap,
  Clock,
  Database,
  BarChart3
} from 'lucide-react';
import { MetricCard } from '../../../shared/components/ui';
import { MultiLineChart } from '../../../shared/components/charts';
import { DonutChart } from '../../../shared/components/charts';
import { useSettings } from '../../../shared/components/ui/Settings';
import { adminApi } from '../../../lib/adminApi';
import {
  getTotalUsers,
  getUserRoleBreakdown,
  getApiRequestsCount,
  getTotalLoginsToday,
  getPlatformUsageTrends,
  getGeographicDistribution,
  getMostUsedEndpoints,
  getTopCompaniesByUsage
} from '../../../lib/supabaseAdmin';

interface PerformanceDashboardProps {
  dateRange: { from: string; to: string };
}

export function PerformanceDashboard({ dateRange }: PerformanceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const settings = useSettings();

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch data from both backend API and Supabase in parallel
      console.log('🔵 Fetching dashboard data from backend and Supabase...');

      const [backendResponse, totalUsers, roleBreakdown, apiRequests, totalLogins, usageTrends, geoDistribution, topEndpoints, topCompanies] = await Promise.all([
        adminApi.getDashboardOverview().catch(err => {
          console.warn('Backend API failed:', err);
          return null;
        }),
        getTotalUsers(),
        getUserRoleBreakdown(),
        getApiRequestsCount(),
        getTotalLoginsToday(),
        getPlatformUsageTrends(7),
        getGeographicDistribution(),
        getMostUsedEndpoints(),
        getTopCompaniesByUsage()
      ]);

      console.log('✅ Backend Response:', backendResponse);
      console.log('✅ Supabase Metrics:', { totalUsers, roleBreakdown, apiRequests, totalLogins });

      // Merge backend data with Supabase metrics
      const mergedData = {
        overview: {
          // From backend
          totalWorkspaces: backendResponse?.data?.overview?.totalWorkspaces || 0,
          activeSubscriptions: backendResponse?.data?.overview?.activeSubscriptions || 0,
          planDistribution: backendResponse?.data?.overview?.planDistribution || {},
          // From Supabase
          totalUsers: totalUsers,
          totalAdmins: roleBreakdown.admins,
          totalAgents: roleBreakdown.agents,
          apiRequests: apiRequests,
          totalLogins: totalLogins
        },
        usageTrends,
        geoDistribution,
        topEndpoints,
        topCompanies
      };

      setDashboardData(mergedData);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : error);
      // Use minimal fallback data
      setDashboardData({
        overview: {
          totalWorkspaces: 0,
          activeSubscriptions: 0,
          totalUsers: 0,
          totalAdmins: 0,
          totalAgents: 0,
          apiRequests: 0,
          totalLogins: 0,
          planDistribution: {}
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Use real data from Supabase or fallback to empty data
  const usageTrends = dashboardData?.usageTrends;
  const usageTrendsSeries = usageTrends ? [
    {
      name: 'API Requests',
      data: usageTrends.labels.map((label: string, i: number) => ({
        label,
        value: usageTrends.apiRequests[i]
      })),
      color: '#3b82f6' // Blue
    },
    {
      name: 'Active Users',
      data: usageTrends.labels.map((label: string, i: number) => ({
        label,
        value: usageTrends.activeUsers[i]
      })),
      color: '#10b981' // Green
    },
    {
      name: 'New Signups',
      data: usageTrends.labels.map((label: string, i: number) => ({
        label,
        value: usageTrends.newSignups[i]
      })),
      color: '#8b5cf6' // Purple
    }
  ] : [];

  // Use real endpoint data from Supabase or show message
  const topEndpoints = dashboardData?.topEndpoints || [];

  // Use real geographic data from Supabase
  const locationData = dashboardData?.geoDistribution || [];

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
    <div className={`space-y-6 transition-all duration-300 ${settings.wideLayout ? 'max-w-none' : ''}`}>
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
            {topEndpoints.length > 0 ? topEndpoints.map((endpoint: any, index: number) => (
              <div key={endpoint.label || index}>
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
            )) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No endpoint data available
              </p>
            )}
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
          {dashboardData?.topCompanies && dashboardData.topCompanies.length > 0 ? (
            dashboardData.topCompanies.map((company: any, index: number) => (
              <div key={company.name || index} className="flex items-center justify-between">
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
                      {company.industry && ` • ${company.industry}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {company.requests.toLocaleString()}
                  </span>
                  {company.size && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {company.size}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No company data available yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
