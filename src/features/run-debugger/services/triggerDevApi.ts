import type {
  TriggerRunEventsResponse,
  TriggerRunEvent,
  EventTreeNode,
  RunSummary,
} from '../types/triggerRun';

const TRIGGER_API_BASE = 'https://api.trigger.dev/api/v1';

function getApiKey(): string {
  const key = import.meta.env.VITE_TRIGGER_DEV_API_KEY;
  if (!key) {
    throw new Error('VITE_TRIGGER_DEV_API_KEY is not set. Add it to your .env file.');
  }
  return key;
}

export async function fetchRunEvents(runId: string): Promise<TriggerRunEventsResponse> {
  const url = `${TRIGGER_API_BASE}/runs/${encodeURIComponent(runId)}/events`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Run "${runId}" not found. Check the run ID and try again.`);
    }
    if (response.status === 401) {
      throw new Error('Unauthorized. The Trigger.dev API key may be invalid or expired.');
    }
    const body = await response.text().catch(() => '');
    throw new Error(`Trigger.dev API error (${response.status}): ${body || response.statusText}`);
  }

  return response.json();
}

// --- Timestamp & duration helpers ---

export function nanoToDate(nanoStr: string): Date {
  const ms = Math.floor(Number(nanoStr) / 1_000_000);
  return new Date(ms);
}

export function formatDuration(nanos: number): string {
  const ms = nanos / 1_000_000;
  if (ms < 1) return '< 1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatFullTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

// --- Tree building ---

export function buildEventTree(events: TriggerRunEvent[]): EventTreeNode[] {
  const nodeMap = new Map<string, EventTreeNode>();

  for (const event of events) {
    nodeMap.set(event.spanId, { event, children: [], depth: 0 });
  }

  const roots: EventTreeNode[] = [];

  for (const event of events) {
    const node = nodeMap.get(event.spanId)!;
    if (event.parentId && nodeMap.has(event.parentId)) {
      const parent = nodeMap.get(event.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortAndSetDepth = (nodes: EventTreeNode[], depth: number) => {
    nodes.sort((a, b) => Number(a.event.startTime) - Number(b.event.startTime));
    for (const node of nodes) {
      node.depth = depth;
      sortAndSetDepth(node.children, depth + 1);
    }
  };
  sortAndSetDepth(roots, 0);

  return roots;
}

export function flattenTree(nodes: EventTreeNode[], expandedSpans: Set<string>): EventTreeNode[] {
  const result: EventTreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0 && expandedSpans.has(node.event.spanId)) {
      result.push(...flattenTree(node.children, expandedSpans));
    }
  }
  return result;
}

export function getDefaultExpanded(roots: EventTreeNode[]): Set<string> {
  const set = new Set<string>();
  const walk = (nodes: EventTreeNode[], depth: number) => {
    for (const node of nodes) {
      if (depth <= 1 && node.children.length > 0) {
        set.add(node.event.spanId);
        walk(node.children, depth + 1);
      }
    }
  };
  walk(roots, 0);
  return set;
}

export function computeRunSummary(events: TriggerRunEvent[], runId: string): RunSummary {
  const root = events.find((e) => e.parentId === null);
  const errorCount = events.filter((e) => e.isError).length;
  const hasCancelled = events.some((e) => e.isCancelled);
  const hasPartial = events.some((e) => e.isPartial && !e.isCancelled);

  let status: RunSummary['status'] = 'success';
  if (errorCount > 0) status = 'error';
  else if (hasCancelled) status = 'cancelled';
  else if (hasPartial) status = 'partial';

  return {
    runId,
    totalEvents: events.length,
    totalDurationMs: root ? root.duration / 1_000_000 : 0,
    errorCount,
    rootSpanMessage: root?.message || 'Unknown',
    startTime: root ? nanoToDate(root.startTime) : new Date(),
    status,
  };
}
