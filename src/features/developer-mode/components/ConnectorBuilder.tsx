/**
 * Connector Builder Component
 * 
 * Multi-step wizard for creating official connector templates.
 * Allows admins to build connectors with API configuration, field mappings,
 * and publish them directly to the marketplace.
 * 
 * @file components/ConnectorBuilder.tsx
 */

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { BasicInfoStep } from './connector-builder/BasicInfoStep';
import { ApiConfigStep } from './connector-builder/ApiConfigStep';
import { FieldMappingStep } from './connector-builder/FieldMappingStep';
import { SettingsStep } from './connector-builder/SettingsStep';
import { developerModeApi } from '../services/developerModeApi';
import type { CreateConnectorTemplateData, ConnectorTemplate } from '../types/developerMode';

interface ConnectorBuilderProps {
  connector?: ConnectorTemplate;
  onSave: (connector: ConnectorTemplate) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'api', label: 'API Config' },
  { id: 'mapping', label: 'Field Mapping' },
  { id: 'settings', label: 'Settings' },
];

export function ConnectorBuilder({ connector, onSave, onCancel }: ConnectorBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testResponse, setTestResponse] = useState<unknown>(null);
  const [selectedField, setSelectedField] = useState<string | undefined>();

  // Initialize connector data
  const [connectorData, setConnectorData] = useState<Partial<CreateConnectorTemplateData>>({
    name: connector?.name || '',
    description: connector?.description || '',
    icon: connector?.icon || '🔌',
    category: connector?.category || '',
    type: connector?.type || 'rest_api',
    config: connector?.config || {
      method: 'GET',
      url: '',
      headers: [],
      params: [],
      auth: { type: 'none' },
    },
    input_schema: connector?.input_schema || {},
    field_mappings: connector?.field_mappings || [],
    pricing_type: connector?.pricing_type || 'free',
    base_price: connector?.base_price || 0,
    subscription_interval: connector?.subscription_interval,
    tags: connector?.tags || [],
    is_featured: connector?.is_featured || false,
    timeout_ms: connector?.timeout_ms || 30000,
    max_retries: connector?.max_retries || 3,
    continue_on_error: connector?.continue_on_error || false,
  });

  const updateData = (stepData: Partial<typeof connectorData> & { testResponse?: unknown; selectedField?: string }) => {
    // Handle testResponse separately
    if ('testResponse' in stepData) {
      setTestResponse(stepData.testResponse);
      delete stepData.testResponse;
    }
    
    // Handle selectedField separately
    if ('selectedField' in stepData) {
      setSelectedField(stepData.selectedField);
      delete stepData.selectedField;
    }
    
    setConnectorData((prev) => ({
      ...prev,
      ...stepData,
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Info
        if (!connectorData.name || !connectorData.description || !connectorData.icon || !connectorData.category || !connectorData.type) {
          setError('Please fill in all required fields');
          return false;
        }
        break;
      case 1: // API Config
        if (!connectorData.config?.url) {
          setError('Please enter an API endpoint URL');
          return false;
        }
        break;
      case 2: // Field Mapping
        if (!connectorData.field_mappings || connectorData.field_mappings.length === 0) {
          setError('Please add at least one field mapping');
          return false;
        }
        break;
      case 3: // Settings
        if (connectorData.pricing_type !== 'free' && !connectorData.base_price) {
          setError('Please enter a price for paid connectors');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSave = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Validate all required fields
      if (
        !connectorData.name ||
        !connectorData.description ||
        !connectorData.category ||
        !connectorData.type ||
        !connectorData.config ||
        !connectorData.field_mappings ||
        !connectorData.pricing_type
      ) {
        throw new Error('Missing required fields');
      }

      const payload: CreateConnectorTemplateData = {
        name: connectorData.name,
        description: connectorData.description,
        icon: connectorData.icon || '🔌',
        category: connectorData.category,
        type: connectorData.type,
        config: connectorData.config,
        input_schema: connectorData.input_schema || {},
        field_mappings: connectorData.field_mappings,
        pricing_type: connectorData.pricing_type,
        base_price: connectorData.base_price,
        subscription_interval: connectorData.subscription_interval,
        tags: connectorData.tags || [],
        is_featured: connectorData.is_featured,
        timeout_ms: connectorData.timeout_ms,
        max_retries: connectorData.max_retries,
        continue_on_error: connectorData.continue_on_error,
      };

      let result: ConnectorTemplate;
      if (connector?.id) {
        // Update existing connector
        result = await developerModeApi.updateOfficialConnector(connector.id, payload);
      } else {
        // Create new connector
        result = await developerModeApi.createOfficialConnector(payload);
      }

      setSuccess(true);
      setTimeout(() => {
        onSave(result);
      }, 1500);
    } catch (err) {
      console.error('Error saving connector:', err);
      setError(err instanceof Error ? err.message : 'Failed to save connector');
    } finally {
      setIsSaving(false);
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            data={{
              name: connectorData.name || '',
              description: connectorData.description || '',
              icon: connectorData.icon || '🔌',
              category: connectorData.category || '',
              type: connectorData.type || 'rest_api',
            }}
            onChange={updateData}
          />
        );
      case 1:
        return (
          <ApiConfigStep
            data={{
              config: connectorData.config || {},
              testResponse,
              selectedField,
            }}
            onChange={updateData}
          />
        );
      case 2:
        return (
          <FieldMappingStep
            data={{
              field_mappings: connectorData.field_mappings || [],
              input_schema: connectorData.input_schema || {},
              testResponse,
              selectedField,
            }}
            onChange={updateData}
          />
        );
      case 3:
        return (
          <SettingsStep
            data={{
              pricing_type: connectorData.pricing_type || 'free',
              base_price: connectorData.base_price,
              subscription_interval: connectorData.subscription_interval,
              tags: connectorData.tags || [],
              is_featured: connectorData.is_featured,
              timeout_ms: connectorData.timeout_ms,
              max_retries: connectorData.max_retries,
              continue_on_error: connectorData.continue_on_error,
            }}
            onChange={updateData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {connector ? 'Edit Connector' : 'Create New Connector'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Official connectors are published directly to the marketplace
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    index === currentStep
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-20px] transition-colors ${
                    index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Connector saved successfully!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Redirecting...
            </p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
          disabled={isSaving}
        >
          Cancel
        </button>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handlePrevious}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {connector ? 'Update Connector' : 'Create Connector'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
