import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PerformanceDashboard } from './features/dashboard';
import { Visitors } from './features/visitors';
import { UserActivity } from './features/user-activity/components/UserActivity';
import { UserDetails } from './features/user-details/components/UserDetails';
import { ApiMonitoring } from './features/api-monitoring/components/ApiMonitoring';
import { ActivityLogs } from './features/activity-logs/components/ActivityLogs';
import { MessageErrorLogs } from './features/message-error-logs';
import { SystemLogs } from './features/system-logs';
import { CacheSystem } from './features/cache-system/components/CacheSystem';
import { Documentation } from './features/documentation';
import { WebhookAnalytics } from './features/webhook-analytics';
import { AnalyticsDashboard } from './features/connection-analytics/AnalyticsDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { FeatureRolloutControl } from './components/FeatureRolloutControl';
import { DeveloperMode } from './features/developer-mode';
import { TemplateManagement } from './features/template-management';
import { ScheduleTriggerRuns } from './features/schedule-trigger-runs';
import { StaffManagement } from './features/staff-management';
import { McpPermissions } from './features/mcp-permissions';
import { FrontendInfrastructure } from './features/frontend-infrastructure';
import { RunDebugger } from './features/run-debugger';
import { QueueManagementPage } from './features/queue-management';
import { OfficeMapSampleV2 } from './features/office-map-sample-v2/components/OfficeMapSampleV2';
import { Login } from './components/Login';
import { AccessDenied } from './components/AccessDenied';
import { Sidebar } from './components/Sidebar';
import { useSettings } from './shared/components/ui/Settings';
import { supabase, getCurrentUser } from './lib/supabase';
import { getSessionViewPath } from './lib/sessionViews';
import { isUserAllowed } from './lib/allowedUsers';
import { connectionAnalytics } from './services/connectionAnalytics';
import { tokenRefreshTracker } from './services/tokenRefreshTracker';
import { userSessionActivityTracker } from './services/userSessionActivityTracker';
import { auditLogger } from './services/auditLogger';

type View = 'dashboard' | 'visitors' | 'user-activity' | 'user-details' | 'api-monitoring' | 'activity-logs' | 'message-error-logs' | 'system-logs' | 'cache-system' | 'documentation' | 'webhook-analytics' | 'connection-analytics' | 'admin' | 'developer-mode' | 'template-management' | 'schedule-trigger-runs' | 'staff-management' | 'frontend-infrastructure' | 'feature-rollouts' | 'mcp-permissions' | 'run-debugger' | 'queue-management' | 'office-map';
const SIDEBAR_UNLOCKED_KEY = 'command_center_sidebar_unlocked';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    return sessionStorage.getItem(SIDEBAR_UNLOCKED_KEY) === '1';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const settings = useSettings();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString()
  });

  const hideSidebarForMapFocus = () => {
    setIsSidebarVisible(false);
    sessionStorage.removeItem(SIDEBAR_UNLOCKED_KEY);
  };

  const unlockSidebar = () => {
    setIsSidebarVisible(true);
    sessionStorage.setItem(SIDEBAR_UNLOCKED_KEY, '1');
  };

  const handleViewChange = (nextView: View) => {
    setCurrentView(nextView);
    if (nextView !== 'office-map') {
      unlockSidebar();
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      const email = session?.user?.email || null;
      setUserEmail(email);

      // Check if user is in the allowed list (only if authenticated)
      if (session) {
        setIsAllowed(isUserAllowed(email));
      } else {
        setIsAllowed(null);
      }

      // Initialize analytics services with user context
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          setCurrentView('dashboard');
          unlockSidebar();
        }

        connectionAnalytics.initialize(null, session.user.id);
        tokenRefreshTracker.initialize(session.user.id);
        userSessionActivityTracker.initialize({
          userId: session.user.id,
          userEmail: session.user.email || null,
          accessToken: session.access_token,
          lastSignInAt: session.user.last_sign_in_at || null,
          currentView,
          currentPath: getSessionViewPath(currentView),
          authEvent: event,
        });
        auditLogger.initialize(session.user.id, session.user.email || null);
        if (event === 'SIGNED_IN') {
          void auditLogger.logLogin();
        }
        console.log('[Analytics] Initialized for user:', session.user.id);
      } else if (event === 'SIGNED_OUT') {
        void userSessionActivityTracker.handleSignedOut(event);
        auditLogger.reset();
        hideSidebarForMapFocus();
      } else {
        userSessionActivityTracker.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
      userSessionActivityTracker.dispose();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    userSessionActivityTracker.updateView(currentView, getSessionViewPath(currentView));
    void auditLogger.logPageView(currentView);
  }, [currentView, isAuthenticated]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || await getCurrentUser();
      setIsAuthenticated(!!user);
      const email = user?.email || null;
      setUserEmail(email);

      // Check if user is in the allowed list (only if authenticated)
      if (user) {
        setIsAllowed(isUserAllowed(email));
        // Initialize analytics services with user context
        connectionAnalytics.initialize(null, user.id);
        tokenRefreshTracker.initialize(user.id);
        userSessionActivityTracker.initialize({
          userId: user.id,
          userEmail: email,
          accessToken: session?.access_token || null,
          lastSignInAt: user.last_sign_in_at || null,
          currentView,
          currentPath: getSessionViewPath(currentView),
          authEvent: 'INITIAL_SESSION',
        });
        auditLogger.initialize(user.id, email);
        console.log('[Analytics] Initialized for user:', user.id);
      } else {
        setIsAllowed(null);
        userSessionActivityTracker.reset();
        auditLogger.reset();
        hideSidebarForMapFocus();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setIsAllowed(null);
      userSessionActivityTracker.reset();
    }
  };

  const handleLoginSuccess = () => {
    setCurrentView('dashboard');
    unlockSidebar();
    checkAuth();
  };

  const handleLogout = async () => {
    try {
      await auditLogger.logLogout();
      await userSessionActivityTracker.markOffline('signed_out');
      await supabase.auth.signOut();
      userSessionActivityTracker.reset();
      auditLogger.reset();
      setIsAuthenticated(false);
      setIsAllowed(null);
      setUserEmail(null);
      hideSidebarForMapFocus();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const isOfficeMapView = currentView === 'office-map';
  const contentContainerClass = isOfficeMapView
    ? 'w-full max-w-none px-0 py-0'
    : `${settings.wideLayout ? 'max-w-none' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8`;

  // Show loading state while checking auth or access
  if (isAuthenticated === null || (isAuthenticated && isAllowed === null)) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show access denied if authenticated but not in allowed users list
  if (isAllowed === false) {
    return <AccessDenied userEmail={userEmail} />;
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Left Sidebar */}
      {isSidebarVisible && (
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onLogout={handleLogout}
          userEmail={userEmail}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className={`${contentContainerClass} transition-all duration-300`}>
            {currentView === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Platform Overview</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      SaaS metrics and system performance
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <select
                      defaultValue="14"
                      onChange={(e) => {
                        const days = parseInt(e.target.value);
                        setDateRange({
                          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                          to: new Date().toISOString()
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="7">Last 7 days</option>
                      <option value="14">Last 14 days</option>
                    </select>
                  </div>
                </div>

                <PerformanceDashboard
                  dateRange={dateRange}
                />
              </div>
            )}

            {currentView === 'user-activity' && (
              <UserActivity />
            )}

            {currentView === 'user-details' && (
              <UserDetails />
            )}

            {currentView === 'api-monitoring' && (
              <ApiMonitoring />
            )}

            {currentView === 'visitors' && (
              <Visitors />
            )}

            {currentView === 'activity-logs' && (
              <ActivityLogs />
            )}

            {currentView === 'message-error-logs' && (
              <MessageErrorLogs />
            )}

            {currentView === 'system-logs' && (
              <SystemLogs />
            )}

            {currentView === 'cache-system' && (
              <CacheSystem />
            )}

            {currentView === 'documentation' && (
              <Documentation />
            )}

            {currentView === 'webhook-analytics' && (
              <WebhookAnalytics />
            )}

            {currentView === 'connection-analytics' && (
              <AnalyticsDashboard />
            )}

            {currentView === 'office-map' && (
              <OfficeMapSampleV2
                onViewChange={handleViewChange}
                currentUserEmail={userEmail}
              />
            )}

            {currentView === 'developer-mode' && (
              <DeveloperMode />
            )}

            {currentView === 'template-management' && (
              <TemplateManagement />
            )}

            {currentView === 'schedule-trigger-runs' && (
              <ScheduleTriggerRuns />
            )}

            {currentView === 'staff-management' && (
              <StaffManagement />
            )}

            {currentView === 'frontend-infrastructure' && (
              <FrontendInfrastructure />
            )}

            {currentView === 'feature-rollouts' && (
              <FeatureRolloutControl />
            )}

            {currentView === 'mcp-permissions' && (
              <McpPermissions />
            )}

            {currentView === 'run-debugger' && (
              <RunDebugger />
            )}

            {currentView === 'queue-management' && (
              <QueueManagementPage />
            )}

            {currentView === 'admin' && (
              <AdminDashboard />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
