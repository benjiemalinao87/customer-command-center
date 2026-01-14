/**
 * Basic Info Step Component
 * 
 * First step in the connector builder wizard.
 * Collects basic connector information: name, description, icon, category, and type.
 * 
 * @file connector-builder/BasicInfoStep.tsx
 */

import React from 'react';
import { Info } from 'lucide-react';

interface BasicInfoStepProps {
  data: {
    name: string;
    description: string;
    icon: string;
    category: string;
    type: string;
  };
  onChange: (data: Partial<BasicInfoStepProps['data']>) => void;
}

const CATEGORIES = [
  { value: 'data-enrichment', label: 'Data Enrichment' },
  { value: 'communication', label: 'Communication' },
  { value: 'crm', label: 'CRM' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'payment', label: 'Payment' },
  { value: 'ai-ml', label: 'AI & ML' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'other', label: 'Other' },
];

const CONNECTOR_TYPES = [
  { value: 'rest_api', label: 'REST API' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'database', label: 'Database' },
  { value: 'multi_step', label: 'Multi-Step' },
];

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  const handleChange = (field: keyof BasicInfoStepProps['data'], value: string) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Basic Information
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Provide basic details about your connector. This information will be displayed
            in the marketplace.
          </p>
        </div>
      </div>

      {/* Connector Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Connector Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Phone Number Validator"
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe what your connector does and how it can be used..."
          rows={4}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 resize-none"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {data.description.length} / 500 characters
        </p>
      </div>

      {/* Icon & Category Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Icon (Emoji) <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
              placeholder="📞"
              maxLength={2}
              className="w-20 px-3 py-2 text-center text-2xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="flex-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
              Preview: {data.icon || '?'}
            </div>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={data.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
            required
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Connector Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Connector Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CONNECTOR_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleChange('type', type.value)}
              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                data.type === type.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Select the type of integration this connector will use
        </p>
      </div>
    </div>
  );
}
