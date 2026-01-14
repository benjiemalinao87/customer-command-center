/**
 * Field Mapping Step Component
 * 
 * Third step in the connector builder wizard.
 * Maps API response fields to contact/lead fields in the system.
 * 
 * @file connector-builder/FieldMappingStep.tsx
 */

import React, { useMemo, useEffect, useState } from 'react';
import { ArrowRight, Plus, X, Info, CheckCircle, Copy } from 'lucide-react';

interface FieldMappingStepProps {
  data: {
    field_mappings: Array<{
      source_path: string;
      target_field: string;
      transform?: string;
    }>;
    input_schema: Record<string, unknown>;
    testResponse?: unknown;
    selectedField?: string;
  };
  onChange: (data: Partial<FieldMappingStepProps['data']>) => void;
}

// Extract all paths from a nested object
function extractPaths(obj: unknown, prefix = ''): string[] {
  const paths: string[] = [];
  
  if (obj === null || obj === undefined) return paths;
  
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        paths.push(...extractPaths(value, path));
      }
    }
  }
  
  return paths;
}

const TARGET_FIELDS = [
  { value: 'email', label: 'Email', type: 'string' },
  { value: 'phone', label: 'Phone Number', type: 'string' },
  { value: 'first_name', label: 'First Name', type: 'string' },
  { value: 'last_name', label: 'Last Name', type: 'string' },
  { value: 'company', label: 'Company', type: 'string' },
  { value: 'title', label: 'Job Title', type: 'string' },
  { value: 'address', label: 'Address', type: 'string' },
  { value: 'city', label: 'City', type: 'string' },
  { value: 'state', label: 'State/Province', type: 'string' },
  { value: 'zip', label: 'ZIP/Postal Code', type: 'string' },
  { value: 'country', label: 'Country', type: 'string' },
  { value: 'website', label: 'Website', type: 'string' },
  { value: 'linkedin', label: 'LinkedIn URL', type: 'string' },
  { value: 'custom_field_1', label: 'Custom Field 1', type: 'string' },
  { value: 'custom_field_2', label: 'Custom Field 2', type: 'string' },
  { value: 'tags', label: 'Tags', type: 'array' },
];

const TRANSFORMS = [
  { value: '', label: 'None' },
  { value: 'lowercase', label: 'Convert to Lowercase' },
  { value: 'uppercase', label: 'Convert to Uppercase' },
  { value: 'trim', label: 'Trim Whitespace' },
  { value: 'phone_format', label: 'Format Phone Number' },
];

export function FieldMappingStep({ data, onChange }: FieldMappingStepProps) {
  const fieldMappings = data.field_mappings || [];
  const [lastSelectedField, setLastSelectedField] = useState<string | undefined>();
  
  // Extract available fields from test response
  const availableFields = useMemo(() => {
    if (!data.testResponse) return [];
    return extractPaths(data.testResponse);
  }, [data.testResponse]);

  // Auto-add mapping when a field is selected from the previous step
  useEffect(() => {
    if (data.selectedField && data.selectedField !== lastSelectedField) {
      setLastSelectedField(data.selectedField);
      
      // Check if this field is already mapped
      const alreadyMapped = fieldMappings.some(m => m.source_path === data.selectedField);
      
      if (!alreadyMapped) {
        addMapping(data.selectedField);
      }
    }
  }, [data.selectedField]);

  const addMapping = (sourcePath?: string) => {
    onChange({
      field_mappings: [
        ...fieldMappings,
        { source_path: sourcePath || '', target_field: '', transform: '' },
      ],
    });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const updateMapping = (
    index: number,
    field: 'source_path' | 'target_field' | 'transform',
    value: string
  ) => {
    const mappings = [...fieldMappings];
    mappings[index] = { ...mappings[index], [field]: value };
    onChange({ field_mappings: mappings });
  };

  const removeMapping = (index: number) => {
    const mappings = [...fieldMappings];
    mappings.splice(index, 1);
    onChange({ field_mappings: mappings });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Field Mapping
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Map API response fields to contact/lead fields in your system.
            Use dot notation for nested fields (e.g., data.user.email).
          </p>
        </div>
      </div>

      {/* Available Fields from Test Response */}
      {availableFields.length > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
              Available Fields from API Response
            </h4>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mb-3">
            Click a field to add it as a mapping, or copy the path.
          </p>
          <div className="flex flex-wrap gap-2">
            {availableFields.map((field) => (
              <div
                key={field}
                className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-700"
              >
                <button
                  type="button"
                  onClick={() => addMapping(field)}
                  className="text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 font-mono"
                  title="Click to add mapping"
                >
                  {field}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(field)}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Copy path"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field Mappings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Response Field Mappings
          </label>
          <button
            type="button"
            onClick={() => addMapping()}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Mapping
          </button>
        </div>

        {fieldMappings.length > 0 ? (
          <div className="space-y-3">
            {fieldMappings.map((mapping, index) => (
              <div
                key={index}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {/* Source Path */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      API Response Field
                    </label>
                    <input
                      type="text"
                      value={mapping.source_path}
                      onChange={(e) => updateMapping(index, 'source_path', e.target.value)}
                      placeholder="e.g., data.phone_number"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-5 flex-shrink-0" />

                  {/* Target Field */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Target Field
                    </label>
                    <select
                      value={mapping.target_field}
                      onChange={(e) => updateMapping(index, 'target_field', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 text-sm"
                    >
                      <option value="">Select field</option>
                      {TARGET_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transform */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Transform
                    </label>
                    <select
                      value={mapping.transform || ''}
                      onChange={(e) => updateMapping(index, 'transform', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 text-sm"
                    >
                      {TRANSFORMS.map((transform) => (
                        <option key={transform.value} value={transform.value}>
                          {transform.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeMapping(index)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mt-5 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              No field mappings configured yet
            </p>
            <button
              type="button"
              onClick={() => addMapping()}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Add your first mapping
            </button>
          </div>
        )}
      </div>

      {/* Input Schema Configuration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Input Schema (JSON)
        </label>
        <textarea
          value={JSON.stringify(data.input_schema || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({ input_schema: parsed });
            } catch {
              // Invalid JSON, don't update
            }
          }}
          placeholder={`{\n  "phone_number": {\n    "type": "string",\n    "label": "Phone Number",\n    "required": true\n  }\n}`}
          rows={8}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 font-mono text-sm resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Define the input fields users need to provide when installing this connector
        </p>
      </div>

      {/* Example Preview */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
          💡 Example Mapping
        </p>
        <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
          <p>API Response: <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 rounded">{'{ "data": { "phone": "+1234567890" } }'}</code></p>
          <p>Source Path: <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 rounded">data.phone</code></p>
          <p>Target Field: <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 rounded">phone</code></p>
          <p>Result: Phone field will be populated with "+1234567890"</p>
        </div>
      </div>
    </div>
  );
}
