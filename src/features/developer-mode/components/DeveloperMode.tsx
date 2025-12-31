/**
 * Developer Mode - Main Container Component
 * 
 * This is the main entry point for the Developer Mode admin feature.
 * It provides tab-based navigation between four admin panels:
 * 
 * 1. Applications - Review and approve developer mode applications
 * 2. Workspaces - Manage developer workspaces and monitor usage
 * 3. Connectors - Review connector submissions for marketplace
 * 4. Revenue - View platform revenue analytics
 * 
 * @file components/DeveloperMode.tsx
 * @component DeveloperMode
 * @module developer-mode/components
 * 
 * Usage:
 * ```tsx
 * import { DeveloperMode } from '@/features/developer-mode';
 * 
 * // In App.tsx
 * {currentView === 'developer-mode' && <DeveloperMode />}
 * ```
 */

import { useState } from 'react';
import React from 'react';
import { FileText, Package, DollarSign, Building2, Users } from 'lucide-react';
import { DeveloperApplications } from './DeveloperApplications';
import { ConnectorReview } from './ConnectorReview';
import { RevenueDashboard } from './RevenueDashboard';
import { DeveloperWorkspaces } from './DeveloperWorkspaces';
import { DeveloperLeads } from './DeveloperLeads';

/**
 * Tab identifier type
 * Defines the available tabs in the Developer Mode interface
 */
type Tab = 'leads' | 'applications' | 'workspaces' | 'connectors' | 'revenue';

/**
 * DeveloperMode Component
 * 
 * Main container component that manages tab navigation and renders
 * the appropriate panel component based on active tab selection.
 * 
 * @returns JSX.Element - The Developer Mode interface with tab navigation
 */
export function DeveloperMode() {
  // State to track which tab is currently active
  // Defaults to 'leads' tab on initial load (most common action)
  const [activeTab, setActiveTab] = useState<Tab>('leads');

  /**
   * Tab Configuration
   * 
   * Defines all available tabs with their metadata:
   * - id: Unique identifier for the tab
   * - label: Display name shown in the UI
   * - icon: Lucide icon component for visual representation
   * - component: React component to render when tab is active
   */
  const tabs = [
    {
      id: 'leads' as Tab,
      label: 'Leads',
      icon: Users,
      component: DeveloperLeads
    },
    {
      id: 'applications' as Tab,
      label: 'Applications',
      icon: FileText,
      component: DeveloperApplications
    },
    {
      id: 'workspaces' as Tab,
      label: 'Workspaces',
      icon: Building2,
      component: DeveloperWorkspaces
    },
    {
      id: 'connectors' as Tab,
      label: 'Connectors',
      icon: Package,
      component: ConnectorReview
    },
    {
      id: 'revenue' as Tab,
      label: 'Revenue',
      icon: DollarSign,
      component: RevenueDashboard
    }
  ];

  /**
   * Find the component to render based on active tab
   * Falls back to DeveloperApplications if tab not found (shouldn't happen)
   */
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || DeveloperApplications;
  
  // Type assertion to ensure TypeScript knows this is a valid React component
  const ComponentToRender = ActiveComponent as React.ComponentType;

  return (
    <div className="space-y-6">
      {/* 
        Tab Navigation Bar
        Displays all available tabs with active state styling.
        Uses macOS-inspired segmented control design.
      */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 
        Active Tab Content
        Dynamically renders the component for the currently active tab.
        This allows us to switch between panels without unmounting/remounting
        unnecessarily, though each component manages its own data fetching.
      */}
      <ComponentToRender />
    </div>
  );
}

