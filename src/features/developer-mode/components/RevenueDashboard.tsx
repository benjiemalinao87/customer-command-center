/**
 * Revenue Dashboard Panel Component
 * 
 * This component displays platform revenue analytics for the Developer Mode feature.
 * Admins can view:
 * 
 * - Total revenue from connector sales
 * - Platform share (30%) vs Developer payouts (70%)
 * - Revenue trends over time
 * - Top selling connectors
 * - Top earning developers
 * - Export data to CSV
 * 
 * @file components/RevenueDashboard.tsx
 * @component RevenueDashboard
 * @module developer-mode/components
 * 
 * Data Flow:
 * 1. Component mounts → loadRevenue() called
 * 2. Fetches data from developerModeApi.getRevenueStats()
 * 3. Displays metrics, charts, and top lists
 * 4. Period selector updates data
 * 5. CSV export generates downloadable file
 */

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Download, Calendar } from 'lucide-react';
import { developerModeApi } from '../services/developerModeApi';
import type { RevenueStats } from '../types/developerMode';

/**
 * RevenueDashboard Component
 * 
 * Displays comprehensive revenue analytics for the Developer Mode platform.
 * 
 * @returns JSX.Element - The revenue analytics dashboard
 */
export function RevenueDashboard() {
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadRevenue();
  }, [period]);

  const loadRevenue = async () => {
    setLoading(true);
    try {
      // Calculate date range based on period
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();
      const data = await developerModeApi.getRevenueStats(startDate, endDate);
      setRevenue(data);
    } catch (error) {
      console.error('Error loading revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleExport = () => {
    if (!revenue) return;
    
    const csv = [
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(revenue.total_revenue)],
      ['Platform Revenue (30%)', formatCurrency(revenue.platform_revenue)],
      ['Developer Payouts (70%)', formatCurrency(revenue.developer_payouts)],
      ['Period Start', formatDate(revenue.period_start)],
      ['Period End', formatDate(revenue.period_end)],
      [],
      ['Top Connectors', 'Revenue', 'Installs'],
      ...revenue.top_connectors.map(c => [c.name, formatCurrency(c.revenue), c.installs.toString()]),
      [],
      ['Top Developers', 'Revenue', 'Connectors'],
      ...revenue.top_developers.map(d => [d.workspace_name, formatCurrency(d.revenue), d.connector_count.toString()])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `developer-mode-revenue-${period}days-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!revenue) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No revenue data available
          </p>
        </div>
      </div>
    );
  }

  const revenueGrowth = 12; // Mock growth percentage

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Developer Mode Revenue
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Platform revenue and developer payout analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Revenue
              </span>
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              ↑ {revenueGrowth}%
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(revenue.total_revenue)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(revenue.period_start)} - {formatDate(revenue.period_end)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Platform (30%)
              </span>
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              ↑ {revenueGrowth}%
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(revenue.platform_revenue)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Platform's share of revenue
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Dev Payouts
              </span>
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              ↑ {revenueGrowth}%
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(revenue.developer_payouts)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Paid to developers (70%)
          </p>
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Revenue Over Time
        </h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            Chart visualization would go here
            <br />
            <span className="text-xs">(Integration with charting library like Recharts or Chart.js)</span>
          </p>
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Selling Connectors */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Selling Connectors
          </h3>
          <div className="space-y-3">
            {revenue.top_connectors.map((connector, index) => (
              <div
                key={connector.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {connector.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {connector.installs} installs
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(connector.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Earning Developers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Earning Developers
          </h3>
          <div className="space-y-3">
            {revenue.top_developers.map((developer, index) => (
              <div
                key={developer.workspace_id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {developer.workspace_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {developer.connector_count} connectors
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(developer.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Split Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
              Revenue Split
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Platform receives 30% of all connector sales. Developers receive 70% of revenue through Stripe Connect payouts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

