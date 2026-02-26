/**
 * Queue Management API Service
 *
 * Calls the backend proxy at /api/queue/trigger-queues/* which forwards
 * requests to the Trigger.dev REST API server-side (avoids browser CORS).
 */

const BACKEND_BASE = import.meta.env.VITE_ADMIN_API_URL?.replace('/api/admin', '') || 'https://cc.automate8.com';
const QUEUE_PROXY_BASE = `${BACKEND_BASE}/api/queue/trigger-queues`;
const RUNS_PROXY_BASE = `${BACKEND_BASE}/api/queue/trigger-runs`;

async function queueApiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${QUEUE_PROXY_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API error (${response.status}): ${body || response.statusText}`);
  }

  return response.json();
}

// --- Types ---

export interface QueueInfo {
  name: string;
  type: 'custom' | 'task';
  concurrencyLimit: number;
  concurrencyLimitOverride?: number | null;
  running: number;
  queued: number;
  paused: boolean;
}

export interface QueueListResponse {
  data: QueueInfo[];
  pagination: {
    currentPage: number;
    totalPages: number;
    count: number;
  };
}

export interface QueueDetailResponse {
  name: string;
  type: string;
  concurrencyLimit: number;
  concurrencyLimitOverride?: number | null;
  running: number;
  queued: number;
  paused: boolean;
  environments: Array<{
    id: string;
    type: string;
    concurrencyLimit: number;
    running: number;
    queued: number;
  }>;
}

// --- API Functions ---

export async function listQueues(page = 1, perPage = 50): Promise<QueueListResponse> {
  return queueApiFetch<QueueListResponse>(
    `?page=${page}&perPage=${perPage}`
  );
}

export async function getQueue(name: string): Promise<QueueDetailResponse> {
  return queueApiFetch<QueueDetailResponse>(
    `/${encodeURIComponent(name)}`
  );
}

export async function overrideConcurrency(
  queueName: string,
  concurrencyLimit: number
): Promise<void> {
  await queueApiFetch<unknown>(
    `/${encodeURIComponent(queueName)}/concurrency/override`,
    {
      method: 'POST',
      body: JSON.stringify({ concurrencyLimit }),
    }
  );
}

export async function resetConcurrency(queueName: string): Promise<void> {
  await queueApiFetch<unknown>(
    `/${encodeURIComponent(queueName)}/concurrency/reset`,
    { method: 'POST' }
  );
}

export async function pauseQueue(queueName: string): Promise<void> {
  await queueApiFetch<unknown>(
    `/${encodeURIComponent(queueName)}/pause`,
    { method: 'POST' }
  );
}

export async function resumeQueue(queueName: string): Promise<void> {
  await queueApiFetch<unknown>(
    `/${encodeURIComponent(queueName)}/resume`,
    { method: 'POST' }
  );
}

// --- Run Counts (source of truth for executing/waiting) ---

export interface RunCounts {
  executing: number;
  waiting: number;
  executingHasMore: boolean;
  waitingHasMore: boolean;
}

export async function getRunCounts(): Promise<RunCounts> {
  const url = `${RUNS_PROXY_BASE}/counts`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Run counts API error (${response.status})`);
  }
  return response.json();
}
