import { useState, useEffect } from 'react';
import { BarChart3, Calendar, Moon, Sun, Users, Shield, LogOut, Activity, UserCheck, BarChart2, FileText, Database } from 'lucide-react';
import { PerformanceDashboard } from './features/dashboard';
import { Visitors } from './features/visitors';
import { UserActivity } from './features/user-activity/components/UserActivity';
import { UserDetails } from './features/user-details/components/UserDetails';
import { ApiMonitoring } from './features/api-monitoring/components/ApiMonitoring';
import { ActivityLogs } from './features/activity-logs/components/ActivityLogs';
import { CacheSystem } from './features/cache-system/components/CacheSystem';
import { AdminDashboard } from './components/AdminDashboard';
import { Login } from './components/Login';
import { useSettings } from './shared/components/ui/Settings';
import { supabase, getCurrentUser } from './lib/supabase';

type View = 'dashboard' | 'visitors' | 'user-activity' | 'user-details' | 'api-monitoring' | 'activity-logs' | 'cache-system' | 'admin';

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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Fixed Header */}
      <nav className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
            </div>

            <div className="flex items-center gap-4">
              {/* User Email Display */}
              {userEmail && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {userEmail}
                  </span>
                </div>
              )}

              {/* Premium Segmented Control Navigation */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto max-w-2xl">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap text-sm ${
                    currentView === 'dashboard'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('user-activity')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap text-sm ${
                    currentView === 'user-activity'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Activity
                </button>
                <button
                  onClick={() => setCurrentView('user-details')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap text-sm ${
                    currentView === 'user-details'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Users
                </button>
                <button
                  onClick={() => setCurrentView('api-monitoring')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap text-sm ${
                    currentView === 'api-monitoring'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  API
                </button>
                <button
                  onClick={() => setCurrentView('visitors')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap text-sm ${
                    currentView === 'visitors'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Logins
                </button>
                <button
                  onClick={() => setCurrentView('activity-logs')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap text-sm ${
                    currentView === 'activity-logs'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Logs
                </button>
                <button
                  onClick={() => setCurrentView('cache-system')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap text-sm ${
                    currentView === 'cache-system'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  Cache
                </button>
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap text-sm ${
                    currentView === 'admin'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto">
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

          {currentView === 'cache-system' && (
            <CacheSystem />
          )}

          {currentView === 'admin' && (
            <AdminDashboard />
          )}
        </div>
      </main>

      {/* Floating Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all duration-200 z-50"
        aria-label="Toggle dark mode"
        type="button"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </div>
  );
}

export default App;
