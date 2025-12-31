import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PerformanceDashboard } from './features/dashboard';
import { Visitors } from './features/visitors';
import { UserActivity } from './features/user-activity/components/UserActivity';
import { UserDetails } from './features/user-details/components/UserDetails';
import { ApiMonitoring } from './features/api-monitoring/components/ApiMonitoring';
import { ActivityLogs } from './features/activity-logs/components/ActivityLogs';
import { MessageErrorLogs } from './features/message-error-logs';
import { CacheSystem } from './features/cache-system/components/CacheSystem';
import { Documentation } from './features/documentation';
import { WebhookAnalytics } from './features/webhook-analytics';
import { AnalyticsDashboard } from './features/connection-analytics/AnalyticsDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { DeveloperMode } from './features/developer-mode';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { useSettings } from './shared/components/ui/Settings';
import { supabase, getCurrentUser } from './lib/supabase';
import { connectionAnalytics } from './services/connectionAnalytics';
import { tokenRefreshTracker } from './services/tokenRefreshTracker';

type View = 'dashboard' | 'visitors' | 'user-activity' | 'user-details' | 'api-monitoring' | 'activity-logs' | 'message-error-logs' | 'cache-system' | 'documentation' | 'webhook-analytics' | 'connection-analytics' | 'admin' | 'developer-mode';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
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

  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);

      // Initialize analytics services with user context
      if (session?.user) {
        connectionAnalytics.initialize(null, session.user.id);
        tokenRefreshTracker.initialize(session.user.id);
        console.log('[Analytics] Initialized for user:', session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
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

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);

      // Initialize analytics services with user context
      if (user) {
        connectionAnalytics.initialize(null, user.id);
        tokenRefreshTracker.initialize(user.id);
        console.log('[Analytics] Initialized for user:', user.id);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    }
  };

  const handleLoginSuccess = () => {
    checkAuth();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUserEmail(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // Show loading state while checking auth
  if (isAuthenticated === null) {
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

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className={`${settings.wideLayout ? 'max-w-none' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300`}>
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

          {currentView === 'developer-mode' && (
            <DeveloperMode />
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
