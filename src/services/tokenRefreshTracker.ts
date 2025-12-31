import { supabase } from '../lib/supabase';

/**
 * TokenRefreshTracker Service
 * Monitors Supabase authentication token refresh performance
 * and tracks success rates for debugging auth issues
 */

export interface TokenRefreshEvent {
  refresh_triggered_at: Date;
  refresh_completed_at?: Date;
  success: boolean;
  time_to_refresh_ms?: number;
  time_before_expiry_ms?: number;
  error_message?: string;
  error_code?: string;
  token_expires_at?: Date;
  was_proactive: boolean;
}

class TokenRefreshTrackerService {
  private currentUserId: string | null = null;
  private refreshStartTime: number | null = null;

  /**
   * Initialize with user context
   */
  initialize(userId: string | null) {
    this.currentUserId = userId;
    console.log('[TokenRefreshTracker] Initialized for user:', userId);
  }

  /**
   * Track when a token refresh is triggered
   */
  onRefreshStart(expiresAt: Date, wasProactive: boolean = true): void {
    this.refreshStartTime = Date.now();

    const timeBeforeExpiry = expiresAt.getTime() - Date.now();

    console.log('[TokenRefreshTracker] Refresh started:', {
      expiresAt,
      wasProactive,
      timeBeforeExpiry,
    });
  }

  /**
   * Track successful token refresh
   */
  async onRefreshSuccess(newExpiresAt: Date, wasProactive: boolean = true): Promise<void> {
    const refreshCompletedAt = new Date();
    const timeToRefresh = this.refreshStartTime
      ? Date.now() - this.refreshStartTime
      : undefined;

    try {
      const { error } = await supabase.from('token_refresh_analytics').insert({
        user_id: this.currentUserId,
        refresh_triggered_at: new Date(this.refreshStartTime || Date.now()).toISOString(),
        refresh_completed_at: refreshCompletedAt.toISOString(),
        success: true,
        time_to_refresh_ms: timeToRefresh,
        time_before_expiry_ms: newExpiresAt.getTime() - Date.now(),
        token_expires_at: newExpiresAt.toISOString(),
        was_proactive: wasProactive,
      });

      if (error) {
        console.error('[TokenRefreshTracker] Failed to track success:', error);
      } else {
        console.log('[TokenRefreshTracker] Success tracked:', {
          timeToRefresh,
          wasProactive,
        });
      }
    } catch (error) {
      console.error('[TokenRefreshTracker] Error tracking success:', error);
    }

    this.refreshStartTime = null;
  }

  /**
   * Track failed token refresh
   */
  async onRefreshFailure(
    error: { message: string; code?: string },
    wasProactive: boolean = true
  ): Promise<void> {
    const timeToRefresh = this.refreshStartTime
      ? Date.now() - this.refreshStartTime
      : undefined;

    try {
      const { error: insertError } = await supabase.from('token_refresh_analytics').insert({
        user_id: this.currentUserId,
        refresh_triggered_at: new Date(this.refreshStartTime || Date.now()).toISOString(),
        refresh_completed_at: new Date().toISOString(),
        success: false,
        time_to_refresh_ms: timeToRefresh,
        error_message: error.message,
        error_code: error.code,
        was_proactive: wasProactive,
      });

      if (insertError) {
        console.error('[TokenRefreshTracker] Failed to track failure:', insertError);
      } else {
        console.log('[TokenRefreshTracker] Failure tracked:', {
          error: error.message,
          wasProactive,
        });
      }
    } catch (err) {
      console.error('[TokenRefreshTracker] Error tracking failure:', err);
    }

    this.refreshStartTime = null;
  }

  /**
   * Get token refresh metrics
   */
  async getRefreshMetrics(hours: number = 24) {
    try {
      const { data, error } = await supabase
        .from('token_refresh_metrics')
        .select('*')
        .gte('hour', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('hour', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[TokenRefreshTracker] Failed to fetch metrics:', error);
      return [];
    }
  }

  /**
   * Get overall success rate
   */
  async getSuccessRate(hours: number = 24): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('token_refresh_analytics')
        .select('success')
        .gte(
          'refresh_triggered_at',
          new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
        );

      if (error) throw error;

      if (!data || data.length === 0) return 100; // No data = assume healthy

      const successCount = data.filter((r) => r.success).length;
      return (successCount / data.length) * 100;
    } catch (error) {
      console.error('[TokenRefreshTracker] Failed to calculate success rate:', error);
      return 0;
    }
  }

  /**
   * Get average refresh time
   */
  async getAverageRefreshTime(hours: number = 24): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('token_refresh_analytics')
        .select('time_to_refresh_ms')
        .eq('success', true)
        .gte(
          'refresh_triggered_at',
          new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
        )
        .not('time_to_refresh_ms', 'is', null);

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      const total = data.reduce((sum, r) => sum + (r.time_to_refresh_ms || 0), 0);
      return Math.round(total / data.length);
    } catch (error) {
      console.error('[TokenRefreshTracker] Failed to calculate average time:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const tokenRefreshTracker = new TokenRefreshTrackerService();
export default tokenRefreshTracker;
