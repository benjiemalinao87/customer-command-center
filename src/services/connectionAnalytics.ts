import { supabase } from '../lib/supabase';

/**
 * ConnectionAnalytics Service
 * Tracks Socket.IO connection events and performance metrics
 * for real-time monitoring and debugging
 */

export interface ConnectionEvent {
  event_type: 'connect' | 'disconnect' | 'connect_error' | 'reconnecting';
  socket_id?: string;
  transport?: 'polling' | 'websocket';
  url?: string;
  connection_duration_ms?: number;
  reconnection_attempts?: number;
  time_to_connect_ms?: number;
  error_message?: string;
  error_type?: string;
  circuit_breaker_triggered?: boolean;
  user_agent?: string;
  ip_address?: string;
}

export interface RetrySession {
  session_start: Date;
  session_end?: Date;
  total_attempts: number;
  successful_connect: boolean;
  circuit_breaker_opened: boolean;
  total_retry_duration_ms?: number;
  time_to_recovery_ms?: number;
  average_delay_between_retries_ms?: number;
  retry_delays_ms?: number[];
  transports_attempted?: string[];
}

class ConnectionAnalyticsService {
  private currentSessionStart: Date | null = null;
  private connectionStartTime: number | null = null;
  private lastDisconnectTime: number | null = null;
  private retryAttempts: number = 0;
  private retryDelays: number[] = [];
  private transportsAttempted: string[] = [];
  private currentWorkspaceId: number | null = null;
  private currentUserId: string | null = null;

  /**
   * Initialize the analytics service with user context
   */
  async initialize(workspaceId: number | null, userId: string | null) {
    this.currentWorkspaceId = workspaceId;
    this.currentUserId = userId;
    console.log('[ConnectionAnalytics] Initialized for user:', userId, 'workspace:', workspaceId);
  }

  /**
   * Track a connection event
   */
  async trackConnectionEvent(event: ConnectionEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('connection_analytics')
        .insert({
          workspace_id: this.currentWorkspaceId,
          user_id: this.currentUserId,
          event_type: event.event_type,
          socket_id: event.socket_id,
          transport: event.transport,
          url: event.url,
          connection_duration_ms: event.connection_duration_ms,
          reconnection_attempts: event.reconnection_attempts,
          time_to_connect_ms: event.time_to_connect_ms,
          error_message: event.error_message,
          error_type: event.error_type,
          circuit_breaker_triggered: event.circuit_breaker_triggered,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('[ConnectionAnalytics] Failed to track event:', error);
      } else {
        console.log('[ConnectionAnalytics] Tracked event:', event.event_type);
      }
    } catch (error) {
      console.error('[ConnectionAnalytics] Error tracking event:', error);
    }
  }

  /**
   * Track connection start
   */
  onConnectStart(): void {
    this.connectionStartTime = Date.now();
  }

  /**
   * Track successful connection
   */
  async onConnect(socketId: string, transport: string, url: string): Promise<void> {
    const timeToConnect = this.connectionStartTime
      ? Date.now() - this.connectionStartTime
      : undefined;

    await this.trackConnectionEvent({
      event_type: 'connect',
      socket_id: socketId,
      transport: transport as 'polling' | 'websocket',
      url,
      time_to_connect_ms: timeToConnect,
    });

    // Reset retry tracking
    this.retryAttempts = 0;
    this.retryDelays = [];
    this.transportsAttempted = [];
    this.connectionStartTime = null;

    // End retry session if one was in progress
    if (this.currentSessionStart) {
      await this.endRetrySession(true);
    }
  }

  /**
   * Track disconnection
   */
  async onDisconnect(
    reason: string,
    socketId?: string,
    connectionDuration?: number
  ): Promise<void> {
    this.lastDisconnectTime = Date.now();

    await this.trackConnectionEvent({
      event_type: 'disconnect',
      socket_id: socketId,
      connection_duration_ms: connectionDuration,
      error_message: reason,
    });
  }

  /**
   * Track connection error
   */
  async onConnectError(
    error: { message: string; type: string },
    transport: string,
    circuitBreakerOpen: boolean
  ): Promise<void> {
    // Start retry session if not already started
    if (!this.currentSessionStart) {
      this.currentSessionStart = new Date();
    }

    this.retryAttempts++;
    if (!this.transportsAttempted.includes(transport)) {
      this.transportsAttempted.push(transport);
    }

    // Track delay between retries
    if (this.lastDisconnectTime) {
      const delay = Date.now() - this.lastDisconnectTime;
      this.retryDelays.push(delay);
    }

    await this.trackConnectionEvent({
      event_type: 'connect_error',
      transport: transport as 'polling' | 'websocket',
      error_message: error.message,
      error_type: error.type,
      circuit_breaker_triggered: circuitBreakerOpen,
      reconnection_attempts: this.retryAttempts,
    });

    // End retry session if circuit breaker opened
    if (circuitBreakerOpen) {
      await this.endRetrySession(false);
    }
  }

  /**
   * Track reconnecting state
   */
  async onReconnecting(attempt: number): Promise<void> {
    await this.trackConnectionEvent({
      event_type: 'reconnecting',
      reconnection_attempts: attempt,
    });
  }

  /**
   * End a retry session and save to database
   */
  private async endRetrySession(successful: boolean): Promise<void> {
    if (!this.currentSessionStart) return;

    const sessionEnd = new Date();
    const totalDuration = sessionEnd.getTime() - this.currentSessionStart.getTime();
    const timeToRecovery = successful ? totalDuration : undefined;
    const avgDelay =
      this.retryDelays.length > 0
        ? this.retryDelays.reduce((a, b) => a + b, 0) / this.retryDelays.length
        : undefined;

    try {
      const { error } = await supabase.from('retry_pattern_analytics').insert({
        workspace_id: this.currentWorkspaceId,
        user_id: this.currentUserId,
        session_start: this.currentSessionStart.toISOString(),
        session_end: sessionEnd.toISOString(),
        total_attempts: this.retryAttempts,
        successful_connect: successful,
        circuit_breaker_opened: !successful && this.retryAttempts >= 3,
        total_retry_duration_ms: totalDuration,
        time_to_recovery_ms: timeToRecovery,
        average_delay_between_retries_ms: avgDelay,
        retry_delays_ms: this.retryDelays,
        transports_attempted: this.transportsAttempted,
      });

      if (error) {
        console.error('[ConnectionAnalytics] Failed to save retry session:', error);
      } else {
        console.log('[ConnectionAnalytics] Retry session saved:', {
          attempts: this.retryAttempts,
          successful,
          duration: totalDuration,
        });
      }
    } catch (error) {
      console.error('[ConnectionAnalytics] Error saving retry session:', error);
    }

    // Reset session tracking
    this.currentSessionStart = null;
    this.retryAttempts = 0;
    this.retryDelays = [];
    this.transportsAttempted = [];
  }

  /**
   * Get connection metrics summary
   */
  async getMetricsSummary(hours: number = 24) {
    try {
      const { data, error } = await supabase
        .from('connection_metrics_summary')
        .select('*')
        .gte('hour', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('hour', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[ConnectionAnalytics] Failed to fetch metrics summary:', error);
      return [];
    }
  }

  /**
   * Get retry insights
   */
  async getRetryInsights(hours: number = 24) {
    try {
      const { data, error } = await supabase
        .from('retry_insights')
        .select('*')
        .gte('hour', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('hour', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[ConnectionAnalytics] Failed to fetch retry insights:', error);
      return [];
    }
  }
}

// Export singleton instance
export const connectionAnalytics = new ConnectionAnalyticsService();
export default connectionAnalytics;
