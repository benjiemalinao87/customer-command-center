import { getSessionViewPath } from '../lib/sessionViews';
import { supabase } from '../lib/supabase';

interface InitializeSessionActivityInput {
  userId: string;
  userEmail: string | null;
  accessToken?: string | null;
  lastSignInAt?: string | null;
  currentView: string;
  currentPath?: string;
  authEvent?: string;
}

const HEARTBEAT_INTERVAL_MS = 15_000;

class UserSessionActivityTrackerService {
  private currentUserId: string | null = null;
  private currentUserEmail: string | null = null;
  private currentView = 'dashboard';
  private currentPath = '/dashboard';
  private currentWindow = 'Command Center';
  private sessionId: string | null = null;
  private lastSignInAt: string | null = null;
  private loginAt: string | null = null;
  private heartbeatTimer: number | null = null;
  private listenersAttached = false;
  private trackInFlight = false;

  initialize({
    userId,
    userEmail,
    accessToken,
    lastSignInAt,
    currentView,
    currentPath,
    authEvent = 'INITIAL_SESSION',
  }: InitializeSessionActivityInput): void {
    const nowIso = new Date().toISOString();
    const isNewIdentity = this.currentUserId !== userId;

    this.currentUserId = userId;
    this.currentUserEmail = userEmail;
    this.currentView = currentView;
    this.currentPath = currentPath || getSessionViewPath(currentView);
    this.lastSignInAt = lastSignInAt || this.lastSignInAt || nowIso;
    this.sessionId = this.decodeSessionId(accessToken) || this.sessionId;
    this.loginAt =
      isNewIdentity || authEvent === 'SIGNED_IN' || this.loginAt === null
        ? nowIso
        : this.loginAt;

    if (!this.listenersAttached) {
      this.attachEventListeners();
    }

    if (this.heartbeatTimer === null) {
      this.heartbeatTimer = window.setInterval(() => {
        void this.trackActivity('heartbeat');
      }, HEARTBEAT_INTERVAL_MS);
    }

    void this.trackActivity(authEvent.toLowerCase(), true);
  }

  updateView(view: string, path?: string): void {
    if (!this.currentUserId) {
      return;
    }

    this.currentView = view;
    this.currentPath = path || getSessionViewPath(view);

    void this.trackActivity('view_change', true);
  }

  async markOffline(reason: string = 'signed_out'): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    this.stopHeartbeat();

    const payload = {
      p_current_view: this.currentView,
      p_current_path: this.currentPath,
      p_reason: reason,
    };

    const { error } = await supabase.rpc('mark_user_session_offline', payload);
    if (!error) {
      return;
    }

    console.warn('[SessionActivity] mark_user_session_offline RPC failed:', error);
    const { error: fallbackError } = await supabase
      .from('user_session_activity')
      .update({
        is_online: false,
        current_view: this.currentView,
        current_path: this.currentPath,
        metadata: { last_event_type: reason, last_event_at: new Date().toISOString() },
      })
      .eq('user_id', this.currentUserId);

    if (fallbackError) {
      console.warn('[SessionActivity] Offline fallback update failed:', fallbackError);
    }
  }

  reset(): void {
    this.stopHeartbeat();
    this.currentUserId = null;
    this.currentUserEmail = null;
    this.sessionId = null;
    this.lastSignInAt = null;
    this.loginAt = null;
    this.currentView = 'dashboard';
    this.currentPath = '/dashboard';
  }

  async handleSignedOut(reason: string = 'signed_out'): Promise<void> {
    await this.markOffline(reason);
    this.reset();
  }

  dispose(): void {
    this.stopHeartbeat();
    this.removeEventListeners();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async trackActivity(eventType: string, force: boolean = false): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    if (this.trackInFlight && !force) {
      return;
    }

    this.trackInFlight = true;
    const nowIso = new Date().toISOString();

    const payload = {
      p_current_view: this.currentView,
      p_current_path: this.currentPath,
      p_current_window: this.currentWindow,
      p_current_window_title: document.title,
      p_event_type: eventType,
      p_last_sign_in_at: this.lastSignInAt,
      p_login_at: this.loginAt,
    };

    try {
      const { error } = await supabase.rpc('track_user_session_activity', payload);
      if (!error) {
        return;
      }

      console.warn('[SessionActivity] track_user_session_activity RPC failed:', error);
      const { error: fallbackError } = await supabase
        .from('user_session_activity')
        .upsert(
          {
            user_id: this.currentUserId,
            session_id: this.sessionId,
            user_email: this.currentUserEmail,
            current_view: this.currentView,
            current_path: this.currentPath,
            current_window: this.currentWindow,
            current_window_title: document.title,
            is_online: true,
            last_activity_at: nowIso,
            last_sign_in_at: this.lastSignInAt,
            login_at: this.loginAt,
            metadata: { last_event_type: eventType, last_event_at: nowIso },
          },
          { onConflict: 'user_id' }
        );

      if (fallbackError) {
        console.warn('[SessionActivity] Upsert fallback failed:', fallbackError);
      }
    } finally {
      this.trackInFlight = false;
    }
  }

  private attachEventListeners(): void {
    window.addEventListener('focus', this.onWindowFocus);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('beforeunload', this.onBeforeUnload);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.listenersAttached = true;
  }

  private removeEventListeners(): void {
    if (!this.listenersAttached) {
      return;
    }

    window.removeEventListener('focus', this.onWindowFocus);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.listenersAttached = false;
  }

  private onWindowFocus = (): void => {
    void this.trackActivity('focus', true);
  };

  private onWindowBlur = (): void => {
    void this.trackActivity('blur', true);
  };

  private onVisibilityChange = (): void => {
    const eventType = document.hidden ? 'hidden' : 'visible';
    void this.trackActivity(eventType, true);
  };

  private onBeforeUnload = (): void => {
    void this.markOffline('page_unload');
  };

  private decodeSessionId(accessToken?: string | null): string | null {
    if (!accessToken) {
      return null;
    }

    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    try {
      const payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = JSON.parse(atob(paddedPayload)) as { session_id?: string };

      return typeof decodedPayload.session_id === 'string'
        ? decodedPayload.session_id
        : null;
    } catch (error) {
      console.warn('[SessionActivity] Unable to decode session_id from access token:', error);
      return null;
    }
  }
}

export const userSessionActivityTracker = new UserSessionActivityTrackerService();
