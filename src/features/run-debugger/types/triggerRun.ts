export interface TriggerEventStyle {
  icon: string;
  variant: string;
}

export interface TriggerRunSubEvent {
  name: string;
  time: string;
  properties: Record<string, unknown>;
}

export interface TriggerRunEvent {
  spanId: string;
  parentId: string | null;
  runId: string;
  message: string;
  style: TriggerEventStyle;
  events: TriggerRunSubEvent[];
  startTime: string;
  duration: number;
  isError: boolean;
  isPartial: boolean;
  isCancelled: boolean;
  kind: string;
  attemptNumber: number | null;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export interface TriggerRunEventsResponse {
  events: TriggerRunEvent[];
}

export interface EventTreeNode {
  event: TriggerRunEvent;
  children: EventTreeNode[];
  depth: number;
}

export interface RunSummary {
  runId: string;
  totalEvents: number;
  totalDurationMs: number;
  errorCount: number;
  rootSpanMessage: string;
  startTime: Date;
  status: 'success' | 'error' | 'partial' | 'cancelled';
}

// --- Trace API types ---

export interface TraceSpanEvent {
  name: string;
  time: string;
  properties: Record<string, unknown>;
}

export interface TraceSpanData {
  message: string;
  startTime: string;
  duration: number;
  isError: boolean;
  isPartial: boolean;
  isCancelled: boolean;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  properties: Record<string, unknown>;
  events: TraceSpanEvent[];
}

export interface TraceSpan {
  id: string;
  parentId: string | null;
  runId: string;
  data: TraceSpanData;
  children: TraceSpan[];
}

export interface TraceResponse {
  trace: {
    traceId: string;
    rootSpan: TraceSpan;
  };
}
