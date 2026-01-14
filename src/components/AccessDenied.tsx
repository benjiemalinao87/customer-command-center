/**
 * Access Denied Component
 * Displayed when a user is authenticated but not in the allowed users list
 */

import { ShieldX, LogOut, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AccessDeniedProps {
  userEmail: string | null;
}

export function AccessDenied({ userEmail }: AccessDeniedProps) {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your account is not authorized to access this application.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-8 py-6 space-y-6">
            {/* Current User Info */}
            {userEmail && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Signed in as
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                If you believe you should have access, please contact your administrator 
                to add your email to the allowed users list.
              </p>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out and try another account</span>
            </button>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Access controlled by administrator allowlist
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
