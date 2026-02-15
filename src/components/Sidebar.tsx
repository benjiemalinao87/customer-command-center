import { BarChart3, Activity, UserCheck, BarChart2, Users, FileText, Database, Book, Webhook, TrendingUp, Code, Shield, LogOut, Moon, Sun, ChevronLeft, ChevronRight, AlertTriangle, ScrollText, FileEdit, Calendar, UsersRound, Server, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

type View = 'dashboard' | 'visitors' | 'user-activity' | 'user-details' | 'api-monitoring' | 'activity-logs' | 'cache-system' | 'documentation' | 'webhook-analytics' | 'connection-analytics' | 'admin' | 'developer-mode' | 'message-error-logs' | 'system-logs' | 'template-management' | 'schedule-trigger-runs' | 'staff-management' | 'frontend-infrastructure';

interface MenuSection {
  label: string;
  items: { id: View; icon: LucideIcon; label: string }[];
}

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  userEmail: string | null;
}

export function Sidebar({ currentView, onViewChange, darkMode, onToggleDarkMode, onLogout, userEmail }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuSections: MenuSection[] = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
        { id: 'connection-analytics', icon: TrendingUp, label: 'Analytics' },
      ],
    },
    {
      label: 'Users',
      items: [
        { id: 'user-activity', icon: Activity, label: 'Activity' },
        { id: 'user-details', icon: UserCheck, label: 'Users' },
        { id: 'visitors', icon: Users, label: 'Logins' },
        { id: 'staff-management', icon: UsersRound, label: 'Staff' },
      ],
    },
    {
      label: 'Monitoring',
      items: [
        { id: 'api-monitoring', icon: BarChart2, label: 'API' },
        { id: 'system-logs', icon: ScrollText, label: 'System Logs' },
        { id: 'activity-logs', icon: FileText, label: 'Audit Logs' },
        { id: 'message-error-logs', icon: AlertTriangle, label: 'Msg Errors' },
      ],
    },
    {
      label: 'System',
      items: [
        { id: 'cache-system', icon: Database, label: 'Cache' },
        { id: 'webhook-analytics', icon: Webhook, label: 'Webhooks' },
        { id: 'frontend-infrastructure', icon: Server, label: 'Infra' },
      ],
    },
    {
      label: 'Tools',
      items: [
        { id: 'developer-mode', icon: Code, label: 'Developer' },
        { id: 'template-management', icon: FileEdit, label: 'Templates' },
        { id: 'schedule-trigger-runs', icon: Calendar, label: 'Schedule Runs' },
      ],
    },
    {
      label: 'Documentation',
      items: [
        { id: 'documentation', icon: Book, label: 'Docs' },
      ],
    },
    {
      label: 'Admin',
      items: [
        { id: 'admin', icon: Shield, label: 'Admin' },
      ],
    },
  ];

  return (
    <aside
      className={`flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Command Center</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* User Info */}
      {userEmail && (
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${isCollapsed ? 'hidden' : 'block'}`}>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {userEmail}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {menuSections.map((section, sectionIdx) => (
          <div key={section.label} className={sectionIdx > 0 ? 'mt-3' : ''}>
            {isCollapsed ? (
              sectionIdx > 0 && (
                <div className="mx-2 mb-2 border-t border-gray-200 dark:border-gray-700" />
              )
            ) : (
              <div className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isCollapsed ? 'justify-center' : ''
            }`}
          title={isCollapsed ? (darkMode ? 'Light mode' : 'Dark mode') : ''}
        >
          {darkMode ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          {!isCollapsed && <span className="text-sm">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${isCollapsed ? 'justify-center' : ''
            }`}
          title={isCollapsed ? 'Sign out' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
