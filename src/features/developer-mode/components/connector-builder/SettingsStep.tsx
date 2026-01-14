/**
 * Settings Step Component
 * 
 * Fourth and final step in the connector builder wizard.
 * Configures pricing, tags, and advanced settings.
 * 
 * @file connector-builder/SettingsStep.tsx
 */

import React from 'react';
import { Settings, DollarSign, Tag, Zap } from 'lucide-react';

interface SettingsStepProps {
  data: {
    pricing_type: 'free' | 'one_time' | 'subscription';
    base_price?: number;
    subscription_interval?: 'monthly' | 'annual';
    tags: string[];
    is_featured?: boolean;
    timeout_ms?: number;
    max_retries?: number;
    continue_on_error?: boolean;
  };
  onChange: (data: Partial<SettingsStepProps['data']>) => void;
}

export function SettingsStep({ data, onChange }: SettingsStepProps) {
  const handleChange = <K extends keyof SettingsStepProps['data']>(
    field: K,
    value: SettingsStepProps['data'][K]
  ) => {
    onChange({ [field]: value });
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    onChange({ tags });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Connector Settings
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Configure pricing, tags, and advanced connector behavior.
          </p>
        </div>
      </div>

      {/* Pricing Configuration */}
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Pricing Model
          </h4>
        </div>

        {/* Pricing Type */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="radio"
              name="pricing_type"
              value="free"
              checked={data.pricing_type === 'free'}
              onChange={(e) => handleChange('pricing_type', e.target.value as any)}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Free
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Available to all users at no cost
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="radio"
              name="pricing_type"
              value="one_time"
              checked={data.pricing_type === 'one_time'}
              onChange={(e) => handleChange('pricing_type', e.target.value as any)}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                One-Time Payment
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Single purchase, lifetime access
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input
              type="radio"
              name="pricing_type"
              value="subscription"
              checked={data.pricing_type === 'subscription'}
              onChange={(e) => handleChange('pricing_type', e.target.value as any)}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Subscription
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recurring monthly or annual billing
              </p>
            </div>
          </label>
        </div>

        {/* Price Input */}
        {data.pricing_type !== 'free' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.base_price || ''}
                  onChange={(e) => handleChange('base_price', parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Subscription Interval */}
            {data.pricing_type === 'subscription' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Billing Interval
                </label>
                <select
                  value={data.subscription_interval || 'monthly'}
                  onChange={(e) => handleChange('subscription_interval', e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tags
          </label>
        </div>
        <input
          type="text"
          value={data.tags?.join(', ') || ''}
          onChange={(e) => handleTagsChange(e.target.value)}
          placeholder="e.g., phone, validation, enrichment"
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Separate tags with commas. Max 5 tags.
        </p>
      </div>

      {/* Featured Toggle */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Featured Connector
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Display prominently in the marketplace
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={data.is_featured || false}
            onChange={(e) => handleChange('is_featured', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Advanced Settings */}
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Advanced Settings
          </h4>
        </div>

        <div className="space-y-4">
          {/* Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeout (milliseconds)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={data.timeout_ms || 30000}
              onChange={(e) => handleChange('timeout_ms', parseInt(e.target.value) || 30000)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum time to wait for API response (default: 30000ms)
            </p>
          </div>

          {/* Max Retries */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Retries
            </label>
            <input
              type="number"
              min="0"
              max="5"
              value={data.max_retries || 3}
              onChange={(e) => handleChange('max_retries', parseInt(e.target.value) || 3)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Number of retry attempts on failure (default: 3)
            </p>
          </div>

          {/* Continue on Error */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Continue on Error
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Continue flow execution even if connector fails
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.continue_on_error || false}
                onChange={(e) => handleChange('continue_on_error', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
