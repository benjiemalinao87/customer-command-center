/**
 * Audit Logger Service
 * Logs user logins, logouts, page navigations, and actions to the audit_logs table.
 */

import { supabase } from '../lib/supabase';
import { getSessionViewLabel } from '../lib/sessionViews';

class AuditLoggerService {
  private userId: string | null = null;
  private userEmail: string | null = null;
  private lastLoggedView: string | null = null;

  initialize(userId: string, userEmail: string | null): void {
    this.userId = userId;
    this.userEmail = userEmail;
  }

  reset(): void {
    this.userId = null;
    this.userEmail = null;
    this.lastLoggedView = null;
  }

  async logLogin(): Promise<void> {
    await this.log('login', 'authentication', 'User signed in');
  }

  async logLogout(): Promise<void> {
    await this.log('logout', 'authentication', 'User signed out');
  }

  async logPageView(view: string): Promise<void> {
    // Avoid duplicate logs for the same view
    if (view === this.lastLoggedView) return;
    this.lastLoggedView = view;

    const label = getSessionViewLabel(view);
    await this.log('page_view', view, `Viewed ${label}`);
  }

  async logAction(section: string, details: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log('action', section, details, metadata);
  }

  private async log(
    action: string,
    section: string,
    details: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.userId) return;

    try {
      await supabase.from('audit_logs').insert({
        user_id: this.userId,
        user_email: this.userEmail,
        action,
        section,
        details,
        metadata: metadata || {},
      });
    } catch (err) {
      console.warn('[AuditLogger] Failed to write audit log:', err);
    }
  }
}

export const auditLogger = new AuditLoggerService();
