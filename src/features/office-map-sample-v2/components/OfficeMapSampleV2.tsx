import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Book,
  Building2,
  Bug,
  Calendar,
  ChevronDown,
  ChevronUp,
  Code,
  Database,
  Eye,
  EyeOff,
  FileEdit,
  FileText,
  KeyRound,
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  RefreshCw,
  Rocket,
  ScrollText,
  Search,
  Server,
  Shield,
  Sparkles,
  TrendingUp,
  UserCircle2,
  UserCheck,
  Users,
  UsersRound,
  Webhook,
  Workflow,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getActiveSessions } from '../../../lib/supabaseAdmin';
import { getAllowedUserEmails } from '../../../lib/allowedUsers';
import { supabase } from '../../../lib/supabase';

type OfficeMapSampleV2View =
  | 'dashboard'
  | 'connection-analytics'
  | 'office-map'
  | 'user-activity'
  | 'user-details'
  | 'visitors'
  | 'staff-management'
  | 'api-monitoring'
  | 'system-logs'
  | 'activity-logs'
  | 'message-error-logs'
  | 'cache-system'
  | 'webhook-analytics'
  | 'queue-management'
  | 'frontend-infrastructure'
  | 'feature-rollouts'
  | 'developer-mode'
  | 'template-management'
  | 'schedule-trigger-runs'
  | 'run-debugger'
  | 'documentation'
  | 'mcp-permissions'
  | 'admin';

type MapMode = 'demo' | 'live' | 'blend';
type DensityMode = 'comfortable' | 'compact';

interface Neighborhood {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tintClass: string;
}

interface OfficeNode {
  id: OfficeMapSampleV2View;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  neighborhoodId: string;
  x: number;
  y: number;
  dockX: number;
  dockY: number;
  accentClass: string;
  heatColor: string;
}

interface Edge {
  from: OfficeMapSampleV2View;
  to: OfficeMapSampleV2View;
}

interface Avatar {
  id: string;
  label: string;
  email: string | null;
  current: OfficeMapSampleV2View;
  target: OfficeMapSampleV2View;
  destination: OfficeMapSampleV2View;
  progress: number;
  speed: number;
  lane: number;
  colorClass: string;
  isCurrentUser: boolean;
  isLive: boolean;
}

interface PositionedAvatar extends Avatar {
  x: number;
  y: number;
}

interface LaneGeometry {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
}

interface ViewportMetrics {
  width: number;
  height: number;
}

interface CursorFxState {
  x: number;
  y: number;
  visible: boolean;
  overOffice: boolean;
  burstId: number;
  burstX: number;
  burstY: number;
}

interface LiveSessionRecord {
  id?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  currentPage?: string;
  mostUsedFeature?: string;
  status?: string;
}

interface LiveSessionSnapshot {
  key: string;
  label: string;
  email: string | null;
  office: OfficeMapSampleV2View;
  isCurrentUser: boolean;
}

interface OfficeMapSampleV2Props {
  onViewChange: (view: OfficeMapSampleV2View) => void;
  currentUserEmail: string | null;
}

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2.2;
const LIVE_REFRESH_VISIBLE_MS = 60000;
const LIVE_REALTIME_DEBOUNCE_MS = 600;
const ANIMATION_FRAME_MS = 40;
const DEMO_BOT_COUNT = 11;
const LANE_OPTIONS = [-2, -1, 0, 1, 2];
const AVATAR_COLORS = ['bg-sky-500', 'bg-emerald-500', 'bg-fuchsia-500', 'bg-orange-500', 'bg-violet-500', 'bg-cyan-500'];
const BOT_NAMES = ['Maya', 'Nina', 'Aria', 'Jamal', 'Kai', 'Sora', 'Leo', 'Ivy', 'Noah', 'Zara', 'Milo'];

const NEIGHBORHOODS: Neighborhood[] = [
  {
    id: 'overview',
    label: 'Overview Neighborhood',
    x: 2,
    y: 6,
    width: 27,
    height: 34,
    tintClass: 'from-sky-500/12 to-cyan-400/5',
  },
  {
    id: 'users',
    label: 'Users Neighborhood',
    x: 36,
    y: 6,
    width: 27,
    height: 34,
    tintClass: 'from-emerald-500/12 to-teal-400/5',
  },
  {
    id: 'monitoring',
    label: 'Monitoring Neighborhood',
    x: 70,
    y: 6,
    width: 27,
    height: 34,
    tintClass: 'from-orange-500/12 to-yellow-400/5',
  },
  {
    id: 'system',
    label: 'System Neighborhood',
    x: 2,
    y: 46,
    width: 27,
    height: 46,
    tintClass: 'from-violet-500/12 to-fuchsia-400/5',
  },
  {
    id: 'tools',
    label: 'Tools Neighborhood',
    x: 36,
    y: 46,
    width: 27,
    height: 46,
    tintClass: 'from-blue-500/12 to-indigo-400/5',
  },
  {
    id: 'admin-ops',
    label: 'Admin + Docs Neighborhood',
    x: 70,
    y: 46,
    width: 27,
    height: 46,
    tintClass: 'from-rose-500/12 to-pink-400/5',
  },
];

const OFFICES: OfficeNode[] = [
  {
    id: 'dashboard',
    title: 'Command Bridge',
    subtitle: 'Dashboard',
    icon: BarChart3,
    neighborhoodId: 'overview',
    x: 6,
    y: 14,
    dockX: 6,
    dockY: 22,
    accentClass: 'bg-sky-500',
    heatColor: 'rgba(56, 189, 248, 0.8)',
  },
  {
    id: 'connection-analytics',
    title: 'Insight Atrium',
    subtitle: 'Analytics',
    icon: TrendingUp,
    neighborhoodId: 'overview',
    x: 25,
    y: 22,
    dockX: 25,
    dockY: 30,
    accentClass: 'bg-cyan-500',
    heatColor: 'rgba(34, 211, 238, 0.8)',
  },
  {
    id: 'office-map',
    title: 'Atlas Hub',
    subtitle: 'Office Map',
    icon: Building2,
    neighborhoodId: 'overview',
    x: 15.5,
    y: 33,
    dockX: 15.5,
    dockY: 39,
    accentClass: 'bg-blue-500',
    heatColor: 'rgba(59, 130, 246, 0.8)',
  },
  {
    id: 'user-activity',
    title: 'Activity Hall',
    subtitle: 'Activity',
    icon: Activity,
    neighborhoodId: 'users',
    x: 40,
    y: 14,
    dockX: 40,
    dockY: 22,
    accentClass: 'bg-emerald-500',
    heatColor: 'rgba(16, 185, 129, 0.85)',
  },
  {
    id: 'user-details',
    title: 'User Registry',
    subtitle: 'Users',
    icon: UserCheck,
    neighborhoodId: 'users',
    x: 59,
    y: 14,
    dockX: 59,
    dockY: 22,
    accentClass: 'bg-green-500',
    heatColor: 'rgba(34, 197, 94, 0.85)',
  },
  {
    id: 'visitors',
    title: 'Visitor Lounge',
    subtitle: 'Logins',
    icon: Users,
    neighborhoodId: 'users',
    x: 40,
    y: 30,
    dockX: 40,
    dockY: 37,
    accentClass: 'bg-teal-500',
    heatColor: 'rgba(20, 184, 166, 0.8)',
  },
  {
    id: 'staff-management',
    title: 'Staff Deck',
    subtitle: 'Staff',
    icon: UsersRound,
    neighborhoodId: 'users',
    x: 59,
    y: 30,
    dockX: 59,
    dockY: 37,
    accentClass: 'bg-emerald-600',
    heatColor: 'rgba(5, 150, 105, 0.85)',
  },
  {
    id: 'api-monitoring',
    title: 'API Watchtower',
    subtitle: 'API',
    icon: Workflow,
    neighborhoodId: 'monitoring',
    x: 74,
    y: 14,
    dockX: 74,
    dockY: 22,
    accentClass: 'bg-orange-500',
    heatColor: 'rgba(249, 115, 22, 0.85)',
  },
  {
    id: 'system-logs',
    title: 'Signal Vault',
    subtitle: 'System Logs',
    icon: ScrollText,
    neighborhoodId: 'monitoring',
    x: 93,
    y: 14,
    dockX: 93,
    dockY: 22,
    accentClass: 'bg-amber-500',
    heatColor: 'rgba(245, 158, 11, 0.85)',
  },
  {
    id: 'activity-logs',
    title: 'Audit Console',
    subtitle: 'Audit Logs',
    icon: FileText,
    neighborhoodId: 'monitoring',
    x: 74,
    y: 30,
    dockX: 74,
    dockY: 37,
    accentClass: 'bg-yellow-500',
    heatColor: 'rgba(234, 179, 8, 0.85)',
  },
  {
    id: 'message-error-logs',
    title: 'Error Beacon',
    subtitle: 'Msg Errors',
    icon: AlertTriangle,
    neighborhoodId: 'monitoring',
    x: 93,
    y: 30,
    dockX: 93,
    dockY: 37,
    accentClass: 'bg-rose-500',
    heatColor: 'rgba(244, 63, 94, 0.85)',
  },
  {
    id: 'cache-system',
    title: 'Cache Core',
    subtitle: 'Cache',
    icon: Database,
    neighborhoodId: 'system',
    x: 6,
    y: 56,
    dockX: 6,
    dockY: 49,
    accentClass: 'bg-violet-500',
    heatColor: 'rgba(139, 92, 246, 0.82)',
  },
  {
    id: 'webhook-analytics',
    title: 'Webhook Dock',
    subtitle: 'Webhooks',
    icon: Webhook,
    neighborhoodId: 'system',
    x: 25,
    y: 56,
    dockX: 25,
    dockY: 49,
    accentClass: 'bg-fuchsia-500',
    heatColor: 'rgba(217, 70, 239, 0.82)',
  },
  {
    id: 'frontend-infrastructure',
    title: 'Infra Bay',
    subtitle: 'Infra',
    icon: Server,
    neighborhoodId: 'system',
    x: 6,
    y: 74,
    dockX: 6,
    dockY: 66,
    accentClass: 'bg-purple-500',
    heatColor: 'rgba(168, 85, 247, 0.82)',
  },
  {
    id: 'queue-management',
    title: 'Queue Hub',
    subtitle: 'Queues',
    icon: Layers,
    neighborhoodId: 'system',
    x: 25,
    y: 74,
    dockX: 25,
    dockY: 66,
    accentClass: 'bg-indigo-500',
    heatColor: 'rgba(99, 102, 241, 0.82)',
  },
  {
    id: 'feature-rollouts',
    title: 'Launch Pad',
    subtitle: 'Feature Rollouts',
    icon: Rocket,
    neighborhoodId: 'tools',
    x: 40,
    y: 54,
    dockX: 40,
    dockY: 48,
    accentClass: 'bg-sky-500',
    heatColor: 'rgba(14, 165, 233, 0.82)',
  },
  {
    id: 'developer-mode',
    title: 'Builder Studio',
    subtitle: 'Developer',
    icon: Code,
    neighborhoodId: 'tools',
    x: 59,
    y: 54,
    dockX: 59,
    dockY: 48,
    accentClass: 'bg-blue-500',
    heatColor: 'rgba(59, 130, 246, 0.8)',
  },
  {
    id: 'template-management',
    title: 'Template Forge',
    subtitle: 'Templates',
    icon: FileEdit,
    neighborhoodId: 'tools',
    x: 40,
    y: 70,
    dockX: 40,
    dockY: 64,
    accentClass: 'bg-fuchsia-500',
    heatColor: 'rgba(217, 70, 239, 0.82)',
  },
  {
    id: 'schedule-trigger-runs',
    title: 'Scheduler Bay',
    subtitle: 'Schedule Runs',
    icon: Calendar,
    neighborhoodId: 'tools',
    x: 59,
    y: 70,
    dockX: 59,
    dockY: 64,
    accentClass: 'bg-pink-500',
    heatColor: 'rgba(236, 72, 153, 0.82)',
  },
  {
    id: 'run-debugger',
    title: 'Debug Garage',
    subtitle: 'Run Debugger',
    icon: Bug,
    neighborhoodId: 'tools',
    x: 49.5,
    y: 84,
    dockX: 49.5,
    dockY: 76,
    accentClass: 'bg-indigo-500',
    heatColor: 'rgba(99, 102, 241, 0.8)',
  },
  {
    id: 'documentation',
    title: 'Playbook Library',
    subtitle: 'Docs',
    icon: Book,
    neighborhoodId: 'admin-ops',
    x: 74.5,
    y: 58,
    dockX: 74.5,
    dockY: 50,
    accentClass: 'bg-rose-500',
    heatColor: 'rgba(244, 63, 94, 0.8)',
  },
  {
    id: 'mcp-permissions',
    title: 'MCP Gate',
    subtitle: 'MCP Access',
    icon: KeyRound,
    neighborhoodId: 'admin-ops',
    x: 92.5,
    y: 58,
    dockX: 92.5,
    dockY: 50,
    accentClass: 'bg-cyan-500',
    heatColor: 'rgba(34, 211, 238, 0.82)',
  },
  {
    id: 'admin',
    title: 'Control Office',
    subtitle: 'Admin',
    icon: Shield,
    neighborhoodId: 'admin-ops',
    x: 83.5,
    y: 78,
    dockX: 83.5,
    dockY: 70,
    accentClass: 'bg-pink-500',
    heatColor: 'rgba(236, 72, 153, 0.8)',
  },
];

const EDGES: Edge[] = [
  { from: 'dashboard', to: 'connection-analytics' },
  { from: 'dashboard', to: 'office-map' },
  { from: 'dashboard', to: 'admin' },
  { from: 'office-map', to: 'user-activity' },
  { from: 'office-map', to: 'user-details' },
  { from: 'office-map', to: 'documentation' },
  { from: 'user-activity', to: 'user-details' },
  { from: 'connection-analytics', to: 'api-monitoring' },
  { from: 'user-activity', to: 'visitors' },
  { from: 'user-details', to: 'staff-management' },
  { from: 'visitors', to: 'staff-management' },
  { from: 'visitors', to: 'activity-logs' },
  { from: 'api-monitoring', to: 'system-logs' },
  { from: 'api-monitoring', to: 'activity-logs' },
  { from: 'system-logs', to: 'message-error-logs' },
  { from: 'activity-logs', to: 'message-error-logs' },
  { from: 'activity-logs', to: 'cache-system' },
  { from: 'message-error-logs', to: 'webhook-analytics' },
  { from: 'cache-system', to: 'webhook-analytics' },
  { from: 'cache-system', to: 'frontend-infrastructure' },
  { from: 'webhook-analytics', to: 'queue-management' },
  { from: 'frontend-infrastructure', to: 'queue-management' },
  { from: 'queue-management', to: 'feature-rollouts' },
  { from: 'feature-rollouts', to: 'developer-mode' },
  { from: 'developer-mode', to: 'template-management' },
  { from: 'template-management', to: 'schedule-trigger-runs' },
  { from: 'schedule-trigger-runs', to: 'run-debugger' },
  { from: 'connection-analytics', to: 'feature-rollouts' },
  { from: 'developer-mode', to: 'run-debugger' },
  { from: 'system-logs', to: 'documentation' },
  { from: 'documentation', to: 'admin' },
  { from: 'documentation', to: 'mcp-permissions' },
  { from: 'mcp-permissions', to: 'admin' },
  { from: 'staff-management', to: 'mcp-permissions' },
  { from: 'run-debugger', to: 'documentation' },
];

const ADJACENCY: Record<OfficeMapSampleV2View, OfficeMapSampleV2View[]> = OFFICES.reduce((acc, office) => {
  acc[office.id] = [];
  return acc;
}, {} as Record<OfficeMapSampleV2View, OfficeMapSampleV2View[]>);

EDGES.forEach((edge) => {
  ADJACENCY[edge.from].push(edge.to);
  ADJACENCY[edge.to].push(edge.from);
});

function seed(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value << 5) - value + input.charCodeAt(index);
    value |= 0;
  }
  return Math.abs(value);
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').toLowerCase().trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getEdgeKey(a: OfficeMapSampleV2View, b: OfficeMapSampleV2View): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function getLaneGeometry(from: OfficeNode, to: OfficeNode): LaneGeometry {
  const x0 = from.dockX;
  const y0 = from.dockY;
  const x1 = to.dockX;
  const y1 = to.dockY;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;
  const midpointX = (x0 + x1) / 2;
  const midpointY = (y0 + y1) / 2;

  const edgeSeed = seed(getEdgeKey(from.id, to.id));
  const curvature = 4.5 + (edgeSeed % 8) * 0.55;
  const direction = edgeSeed % 2 === 0 ? 1 : -1;

  return {
    x0,
    y0,
    cx: midpointX + perpX * curvature * direction,
    cy: midpointY + perpY * curvature * direction,
    x1,
    y1,
  };
}

function getQuadraticPoint(geometry: LaneGeometry, t: number): { x: number; y: number } {
  const oneMinus = 1 - t;
  return {
    x: oneMinus * oneMinus * geometry.x0 + 2 * oneMinus * t * geometry.cx + t * t * geometry.x1,
    y: oneMinus * oneMinus * geometry.y0 + 2 * oneMinus * t * geometry.cy + t * t * geometry.y1,
  };
}

function getQuadraticTangent(geometry: LaneGeometry, t: number): { x: number; y: number } {
  return {
    x: 2 * (1 - t) * (geometry.cx - geometry.x0) + 2 * t * (geometry.x1 - geometry.cx),
    y: 2 * (1 - t) * (geometry.cy - geometry.y0) + 2 * t * (geometry.y1 - geometry.cy),
  };
}

function getAvatarColorById(id: string): string {
  return AVATAR_COLORS[seed(id) % AVATAR_COLORS.length];
}

function getLaneById(id: string): number {
  return LANE_OPTIONS[seed(id) % LANE_OPTIONS.length];
}

function getRandomSpeed(): number {
  return 0.0028 + Math.random() * 0.0024;
}

function pickLane(): number {
  return LANE_OPTIONS[Math.floor(Math.random() * LANE_OPTIONS.length)];
}

function pickNextOffice(current: OfficeMapSampleV2View): OfficeMapSampleV2View {
  const neighbors = ADJACENCY[current];
  if (neighbors.length === 0) {
    return current;
  }
  return neighbors[Math.floor(Math.random() * neighbors.length)];
}

function easeInOut(t: number): number {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getNextHop(start: OfficeMapSampleV2View, destination: OfficeMapSampleV2View): OfficeMapSampleV2View {
  if (start === destination) {
    return destination;
  }

  const queue: OfficeMapSampleV2View[] = [start];
  const visited = new Set<OfficeMapSampleV2View>([start]);
  const parent = new Map<OfficeMapSampleV2View, OfficeMapSampleV2View>();

  while (queue.length > 0) {
    const node = queue.shift() as OfficeMapSampleV2View;
    if (node === destination) {
      break;
    }

    ADJACENCY[node].forEach((neighbor) => {
      if (visited.has(neighbor)) {
        return;
      }
      visited.add(neighbor);
      parent.set(neighbor, node);
      queue.push(neighbor);
    });
  }

  if (!parent.has(destination)) {
    return pickNextOffice(start);
  }

  let cursor = destination;
  while (parent.get(cursor) && parent.get(cursor) !== start) {
    cursor = parent.get(cursor) as OfficeMapSampleV2View;
  }

  return cursor;
}

function getOfficeFromSessionText(text: string): OfficeMapSampleV2View {
  if (text.includes('office map') || text.includes('office-map')) return 'office-map';
  if (text.includes('mcp') || text.includes('permission')) return 'mcp-permissions';
  if (text.includes('feature rollout') || text.includes('rollout')) return 'feature-rollouts';
  if (text.includes('template')) return 'template-management';
  if (text.includes('schedule') || text.includes('trigger run')) return 'schedule-trigger-runs';
  if (text.includes('queue')) return 'queue-management';
  if (text.includes('cache')) return 'cache-system';
  if (text.includes('webhook')) return 'webhook-analytics';
  if (text.includes('infra') || text.includes('frontend')) return 'frontend-infrastructure';
  if (text.includes('debug') || text.includes('run debugger')) return 'run-debugger';
  if (text.includes('developer') || text.includes('connector') || text.includes('builder')) return 'developer-mode';
  if (text.includes('doc') || text.includes('playbook')) return 'documentation';
  if (text.includes('admin') || text.includes('owner')) return 'admin';
  if (text.includes('system log')) return 'system-logs';
  if (text.includes('message error') || text.includes('msg error')) return 'message-error-logs';
  if (text.includes('audit') || text.includes('activity logs')) return 'activity-logs';
  if (text.includes('api')) return 'api-monitoring';
  if (text.includes('staff')) return 'staff-management';
  if (text.includes('user activity')) return 'user-activity';
  if (text.includes('user detail') || /\busers\b/.test(text)) return 'user-details';
  if (text.includes('visitor') || text.includes('login') || text.includes('session')) return 'visitors';
  if (text.includes('analytics') || text.includes('insight')) return 'connection-analytics';
  return 'dashboard';
}

function formatSessionLabel(userName: string | null | undefined, userEmail: string | null | undefined): string {
  const cleanName = (userName || '').trim();
  if (cleanName) {
    return cleanName.split(' ').slice(0, 2).join(' ');
  }

  const email = (userEmail || '').trim();
  if (!email) {
    return 'Member';
  }

  const localPart = email.split('@')[0] || 'Member';
  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createInitialDemoAvatars(currentUserLabel: string, currentUserEmail: string | null): Avatar[] {
  const avatars: Avatar[] = [
    {
      id: 'demo-current-user',
      label: currentUserLabel,
      email: currentUserEmail,
      current: 'dashboard',
      target: 'connection-analytics',
      destination: 'connection-analytics',
      progress: 0.12,
      speed: 0.0038,
      lane: 0,
      colorClass: 'bg-blue-600',
      isCurrentUser: true,
      isLive: false,
    },
  ];

  for (let index = 0; index < DEMO_BOT_COUNT; index += 1) {
    const startOffice = OFFICES[index % OFFICES.length].id;
    const destination = pickNextOffice(startOffice);
    avatars.push({
      id: `demo-bot-${index}`,
      label: BOT_NAMES[index % BOT_NAMES.length],
      email: null,
      current: startOffice,
      target: destination,
      destination,
      progress: Math.random(),
      speed: getRandomSpeed(),
      lane: pickLane(),
      colorClass: AVATAR_COLORS[index % AVATAR_COLORS.length],
      isCurrentUser: false,
      isLive: false,
    });
  }

  return avatars;
}

function clampPan(pan: { x: number; y: number }, zoom: number, viewport: ViewportMetrics): { x: number; y: number } {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return pan;
  }

  if (zoom <= 1) {
    return {
      x: (viewport.width - viewport.width * zoom) / 2,
      y: (viewport.height - viewport.height * zoom) / 2,
    };
  }

  const overscrollX = 96;
  const overscrollY = 96;
  const minX = viewport.width - viewport.width * zoom - overscrollX;
  const minY = viewport.height - viewport.height * zoom - overscrollY;
  const maxX = overscrollX;
  const maxY = overscrollY;

  return {
    x: clamp(pan.x, minX, maxX),
    y: clamp(pan.y, minY, maxY),
  };
}

export function OfficeMapSampleV2({ onViewChange, currentUserEmail }: OfficeMapSampleV2Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const liveSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStateRef = useRef({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const officeById = useMemo(() => {
    return new Map<OfficeMapSampleV2View, OfficeNode>(OFFICES.map((office) => [office.id, office]));
  }, []);

  const currentUserLabel = useMemo(() => {
    if (!currentUserEmail) {
      return 'You';
    }

    const localPart = currentUserEmail.split('@')[0] || 'You';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    if (!normalized) {
      return 'You';
    }

    return normalized
      .split(' ')
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [currentUserEmail]);

  const [mapMode, setMapMode] = useState<MapMode>('blend');
  const [density, setDensity] = useState<DensityMode>('comfortable');
  const [showHeat, setShowHeat] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<OfficeMapSampleV2View | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [cursorFx, setCursorFx] = useState<CursorFxState>({
    x: -9999,
    y: -9999,
    visible: false,
    overOffice: false,
    burstId: 0,
    burstX: -9999,
    burstY: -9999,
  });
  const [isFullMode, setIsFullMode] = useState(false);
  const [isTrafficLeadersMinimized, setIsTrafficLeadersMinimized] = useState(false);
  const [viewportMetrics, setViewportMetrics] = useState<ViewportMetrics>({ width: 0, height: 0 });

  const [demoAvatars, setDemoAvatars] = useState<Avatar[]>(() => createInitialDemoAvatars(currentUserLabel, currentUserEmail));
  const [liveAvatars, setLiveAvatars] = useState<Avatar[]>([]);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [liveSnapshots, setLiveSnapshots] = useState<LiveSessionSnapshot[]>([]);
  const [lastLiveSyncAt, setLastLiveSyncAt] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(() => document.visibilityState === 'visible');
  const allowlistedEmails = useMemo(() => new Set(getAllowedUserEmails()), []);
  const allowlistEnabled = allowlistedEmails.size > 0;

  const syncViewportMetrics = useCallback(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    setViewportMetrics({
      width: rect.width,
      height: rect.height,
    });
  }, []);

  useEffect(() => {
    syncViewportMetrics();
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncViewportMetrics();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [syncViewportMetrics]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullMode(document.fullscreenElement === viewportRef.current);
      syncViewportMetrics();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [syncViewportMetrics]);

  useEffect(() => {
    setPan((previousPan) => clampPan(previousPan, zoom, viewportMetrics));
  }, [zoom, viewportMetrics]);

  useEffect(() => {
    setDemoAvatars((previous) => previous.map((avatar) => (
      avatar.isCurrentUser ? { ...avatar, label: currentUserLabel, email: currentUserEmail } : avatar
    )));
  }, [currentUserEmail, currentUserLabel]);

  useEffect(() => {
    if (mapMode === 'live') {
      return;
    }

    const interval = window.setInterval(() => {
      setDemoAvatars((previous) => previous.map((avatar) => {
        const nextProgress = avatar.progress + avatar.speed;
        if (nextProgress < 1) {
          return { ...avatar, progress: nextProgress };
        }

        const arrived = avatar.target;
        const destination = pickNextOffice(arrived);
        return {
          ...avatar,
          current: arrived,
          target: destination,
          destination,
          progress: 0,
          speed: avatar.isCurrentUser ? 0.0038 : getRandomSpeed(),
          lane: avatar.isCurrentUser ? 0 : pickLane(),
        };
      }));
    }, ANIMATION_FRAME_MS);

    return () => window.clearInterval(interval);
  }, [mapMode]);

  const fetchLiveSessions = useCallback(async () => {
    setLiveStatus((previous) => (previous === 'ok' ? 'syncing' : previous === 'error' ? 'syncing' : 'syncing'));

    try {
      const raw = await getActiveSessions() as LiveSessionRecord[];
      const normalizedCurrentUser = normalizeText(currentUserEmail);

      const snapshots = (Array.isArray(raw) ? raw : [])
        .filter((record) => {
          const normalizedRecordEmail = normalizeText(record.userEmail);

          if (normalizedCurrentUser && normalizedRecordEmail === normalizedCurrentUser) {
            return true;
          }

          // If allowlist is configured, show only users allowed to access Command Center.
          if (allowlistEnabled) {
            return normalizedRecordEmail ? allowlistedEmails.has(normalizedRecordEmail) : false;
          }

          // No allowlist configured: keep all authenticated sessions.
          return true;
        })
        .map((record) => {
          const keyBase = record.userId || record.id || '';
          if (!keyBase) {
            return null;
          }

          const combined = `${record.currentPage || ''} ${record.mostUsedFeature || ''}`.toLowerCase();
          const office = getOfficeFromSessionText(combined);
          const email = record.userEmail || null;
          const label = formatSessionLabel(record.userName, email);
          const isCurrentUser = Boolean(email) && normalizeText(email) === normalizedCurrentUser;

          return {
            key: keyBase,
            label,
            email,
            office,
            isCurrentUser,
          } as LiveSessionSnapshot;
        })
        .filter((snapshot): snapshot is LiveSessionSnapshot => snapshot !== null);

      setLiveSnapshots(snapshots);
      setLiveStatus('ok');
      setLastLiveSyncAt(new Date().toISOString());
    } catch (error) {
      console.error('Failed to fetch live office-map sessions:', error);
      setLiveStatus('error');
    }
  }, [allowlistEnabled, allowlistedEmails, currentUserEmail]);

  const scheduleLiveSync = useCallback((delayMs: number = LIVE_REALTIME_DEBOUNCE_MS) => {
    if (liveSyncTimeoutRef.current) {
      window.clearTimeout(liveSyncTimeoutRef.current);
    }

    liveSyncTimeoutRef.current = window.setTimeout(() => {
      liveSyncTimeoutRef.current = null;
      void fetchLiveSessions();
    }, delayMs);
  }, [fetchLiveSessions]);

  useEffect(() => {
    return () => {
      if (liveSyncTimeoutRef.current) {
        window.clearTimeout(liveSyncTimeoutRef.current);
        liveSyncTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const nextVisible = document.visibilityState === 'visible';
      setIsTabVisible(nextVisible);

      if (nextVisible && mapMode !== 'demo') {
        scheduleLiveSync(200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mapMode, scheduleLiveSync]);

  useEffect(() => {
    if (mapMode === 'demo') {
      setLiveStatus('idle');
      return;
    }

    if (!isTabVisible) {
      return;
    }

    void fetchLiveSessions();
    const interval = window.setInterval(() => {
      void fetchLiveSessions();
    }, LIVE_REFRESH_VISIBLE_MS);

    return () => window.clearInterval(interval);
  }, [mapMode, fetchLiveSessions, isTabVisible]);

  useEffect(() => {
    if (mapMode === 'demo') {
      return;
    }

    const channelName = `office-map-v2-live-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_session_activity' },
        () => scheduleLiveSync()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => scheduleLiveSync()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          scheduleLiveSync(250);
        }
      });

    return () => {
      if (liveSyncTimeoutRef.current) {
        window.clearTimeout(liveSyncTimeoutRef.current);
        liveSyncTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [mapMode, scheduleLiveSync]);

  useEffect(() => {
    if (mapMode === 'demo') {
      return;
    }

    setLiveAvatars((previous) => {
      const previousById = new Map(previous.map((avatar) => [avatar.id, avatar]));
      const nextAvatars: Avatar[] = [];

      liveSnapshots.forEach((snapshot) => {
        const avatarId = `live-${snapshot.key}`;
        const existing = previousById.get(avatarId);

        if (!existing) {
          nextAvatars.push({
            id: avatarId,
            label: snapshot.label,
            email: snapshot.email,
            current: snapshot.office,
            target: snapshot.office,
            destination: snapshot.office,
            progress: 1,
            speed: 0.0033,
            lane: getLaneById(avatarId),
            colorClass: snapshot.isCurrentUser ? 'bg-blue-600' : getAvatarColorById(avatarId),
            isCurrentUser: snapshot.isCurrentUser,
            isLive: true,
          });
          return;
        }

        let target = existing.target;
        let progress = existing.progress;
        const destination = snapshot.office;

        if (existing.current === existing.target && existing.current !== destination) {
          target = getNextHop(existing.current, destination);
          progress = target === existing.current ? 1 : 0;
        }

        nextAvatars.push({
          ...existing,
          label: snapshot.label,
          email: snapshot.email,
          destination,
          target,
          progress,
          colorClass: snapshot.isCurrentUser ? 'bg-blue-600' : existing.colorClass,
          isCurrentUser: snapshot.isCurrentUser,
          lane: snapshot.isCurrentUser ? 0 : existing.lane,
        });
      });

      return nextAvatars;
    });
  }, [liveSnapshots, mapMode]);

  useEffect(() => {
    if (mapMode === 'demo') {
      return;
    }

    const interval = window.setInterval(() => {
      setLiveAvatars((previous) => previous.map((avatar) => {
        if (avatar.current === avatar.destination && avatar.target === avatar.destination && avatar.progress >= 1) {
          return avatar;
        }

        const movingTarget = avatar.target;
        const nextProgress = avatar.progress + avatar.speed;
        if (nextProgress < 1) {
          return { ...avatar, progress: nextProgress };
        }

        const arrived = movingTarget;
        const nextHop = getNextHop(arrived, avatar.destination);
        if (nextHop === arrived) {
          return {
            ...avatar,
            current: arrived,
            target: arrived,
            destination: avatar.destination,
            progress: 1,
            lane: avatar.isCurrentUser ? 0 : getLaneById(avatar.id),
          };
        }

        return {
          ...avatar,
          current: arrived,
          target: nextHop,
          progress: 0,
          lane: avatar.isCurrentUser ? 0 : pickLane(),
        };
      }));
    }, ANIMATION_FRAME_MS);

    return () => window.clearInterval(interval);
  }, [mapMode]);

  const activeAvatars = useMemo(() => {
    if (mapMode === 'demo') {
      return demoAvatars;
    }

    if (mapMode === 'live') {
      return liveAvatars;
    }

    const hasLiveCurrentUser = liveAvatars.some((avatar) => avatar.isCurrentUser);
    const demoSlice = hasLiveCurrentUser
      ? demoAvatars.filter((avatar) => !avatar.isCurrentUser).slice(0, 7)
      : demoAvatars.slice(0, 8);
    return [...liveAvatars, ...demoSlice];
  }, [mapMode, demoAvatars, liveAvatars]);

  const officeTraffic = useMemo(() => {
    const traffic = OFFICES.reduce((acc, office) => {
      acc[office.id] = 0;
      return acc;
    }, {} as Record<OfficeMapSampleV2View, number>);

    activeAvatars.forEach((avatar) => {
      const key = avatar.progress < 0.5 ? avatar.current : avatar.target;
      traffic[key] += 1;
    });

    return traffic;
  }, [activeAvatars]);

  const busiestOffices = useMemo(() => {
    return [...OFFICES]
      .sort((a, b) => officeTraffic[b.id] - officeTraffic[a.id])
      .slice(0, 4);
  }, [officeTraffic]);

  const maxTraffic = useMemo(() => {
    return Math.max(1, ...Object.values(officeTraffic));
  }, [officeTraffic]);

  const filteredOffices = useMemo(() => {
    const query = normalizeText(searchTerm);
    if (!query) {
      return [];
    }

    return OFFICES.filter((office) => {
      const haystack = `${office.title} ${office.subtitle} ${office.id}`.toLowerCase();
      return haystack.includes(query);
    }).slice(0, 6);
  }, [searchTerm]);

  // Set of matched office IDs for highlight/dim logic
  const matchedOfficeIds = useMemo(() => {
    return new Set(filteredOffices.map((o) => o.id));
  }, [filteredOffices]);

  const isSearchActive = searchTerm.trim().length > 0;

  // Set of neighborhood IDs that contain at least one matched office
  const matchedNeighborhoodIds = useMemo(() => {
    if (!isSearchActive) return new Set<string>();
    return new Set(filteredOffices.map((o) => o.neighborhoodId));
  }, [filteredOffices, isSearchActive]);

  const selectedOfficeNode = useMemo(() => {
    return selectedOffice ? officeById.get(selectedOffice) || null : null;
  }, [officeById, selectedOffice]);

  const setZoomWithAnchor = useCallback((nextZoomValue: number, anchorX: number, anchorY: number) => {
    setZoom((currentZoom) => {
      const nextZoom = clamp(nextZoomValue, MIN_ZOOM, MAX_ZOOM);
      setPan((currentPan) => {
        const worldX = (anchorX - currentPan.x) / currentZoom;
        const worldY = (anchorY - currentPan.y) / currentZoom;
        const nextPan = {
          x: anchorX - worldX * nextZoom,
          y: anchorY - worldY * nextZoom,
        };
        return clampPan(nextPan, nextZoom, viewportMetrics);
      });
      return nextZoom;
    });
  }, [viewportMetrics]);

  const centerOnOffice = useCallback((officeId: OfficeMapSampleV2View, desiredZoom?: number) => {
    const office = officeById.get(officeId);
    if (!office || viewportMetrics.width <= 0 || viewportMetrics.height <= 0) {
      return;
    }

    const nextZoom = clamp(desiredZoom ?? Math.max(zoom, 1.2), MIN_ZOOM, MAX_ZOOM);
    const nextPan = {
      x: viewportMetrics.width / 2 - (office.x / 100) * viewportMetrics.width * nextZoom,
      y: viewportMetrics.height / 2 - (office.y / 100) * viewportMetrics.height * nextZoom,
    };

    setZoom(nextZoom);
    setPan(clampPan(nextPan, nextZoom, viewportMetrics));
  }, [officeById, viewportMetrics, zoom]);

  // Auto-pan to first search match
  useEffect(() => {
    if (filteredOffices.length > 0) {
      centerOnOffice(filteredOffices[0].id);
    }
  }, [filteredOffices, centerOnOffice]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const anchorX = event.clientX - rect.left;
    const anchorY = event.clientY - rect.top;
    const scaleFactor = event.deltaY < 0 ? 1.12 : 0.9;
    setZoomWithAnchor(zoom * scaleFactor, anchorX, anchorY);
  }, [setZoomWithAnchor, zoom]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const isOfficeNode = Boolean(target.closest('[data-office-node="true"]'));
    const isUiControl = Boolean(target.closest('[data-no-pan="true"]')) && !isOfficeNode;

    setCursorFx((previous) => ({
      ...previous,
      x,
      y,
      visible: !isUiControl,
      overOffice: isOfficeNode,
      burstId: !isUiControl ? previous.burstId + 1 : previous.burstId,
      burstX: !isUiControl ? x : previous.burstX,
      burstY: !isUiControl ? y : previous.burstY,
    }));

    if (target.closest('[data-no-pan="true"]') || target.closest('button,input,select,textarea,a')) {
      return;
    }

    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }, [pan.x, pan.y]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const isOfficeNode = Boolean(target.closest('[data-office-node="true"]'));
    const isUiControl = Boolean(target.closest('[data-no-pan="true"]')) && !isOfficeNode;

    setCursorFx((previous) => {
      const samePosition = Math.abs(previous.x - x) < 0.2 && Math.abs(previous.y - y) < 0.2;
      const nextVisible = !isUiControl;
      if (samePosition && previous.visible === nextVisible && previous.overOffice === isOfficeNode) {
        return previous;
      }

      return {
        ...previous,
        x,
        y,
        visible: nextVisible,
        overOffice: isOfficeNode,
      };
    });

    if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.startClientX;
    const deltaY = event.clientY - dragStateRef.current.startClientY;
    const nextPan = {
      x: dragStateRef.current.startPanX + deltaX,
      y: dragStateRef.current.startPanY + deltaY,
    };

    setPan(clampPan(nextPan, zoom, viewportMetrics));
  }, [zoom, viewportMetrics]);

  const endPointerDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current.active = false;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handlePointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    setCursorFx((previous) => (
      previous.visible || previous.overOffice
        ? { ...previous, visible: false, overOffice: false }
        : previous
    ));
    endPointerDrag(event);
  }, [endPointerDrag]);

  const handleMiniMapClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (viewportMetrics.width <= 0 || viewportMetrics.height <= 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const relativeY = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    const nextPan = {
      x: viewportMetrics.width / 2 - relativeX * viewportMetrics.width * zoom,
      y: viewportMetrics.height / 2 - relativeY * viewportMetrics.height * zoom,
    };

    setPan(clampPan(nextPan, zoom, viewportMetrics));
  }, [viewportMetrics, zoom]);

  const focusSelectedOffice = useCallback((officeId: OfficeMapSampleV2View) => {
    setSelectedOffice(officeId);
    centerOnOffice(officeId);
    setSearchTerm('');
  }, [centerOnOffice]);

  const toggleFullMode = useCallback(async () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    try {
      if (document.fullscreenElement === viewport) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      await viewport.requestFullscreen();
    } catch (error) {
      console.error('Failed to toggle office map full mode:', error);
    }
  }, []);

  const positionedAvatars = useMemo(() => {
    const positions: PositionedAvatar[] = activeAvatars.map((avatar) => {
      const fromOffice = officeById.get(avatar.current);
      const toOffice = officeById.get(avatar.target);
      if (!fromOffice || !toOffice) {
        return { ...avatar, x: 50, y: 50 };
      }

      const geometry = getLaneGeometry(fromOffice, toOffice);
      const easedProgress = easeInOut(clamp(avatar.progress, 0, 1));
      const point = getQuadraticPoint(geometry, easedProgress);
      const tangent = getQuadraticTangent(geometry, easedProgress);
      const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
      const perpX = -tangent.y / tangentLength;
      const perpY = tangent.x / tangentLength;

      const laneOffset = avatar.lane * 0.8;
      const x = point.x + perpX * laneOffset;
      const y = point.y + perpY * laneOffset;

      return {
        ...avatar,
        x,
        y,
      };
    });

    // Two-pass repulsion to reduce collisions during dense traffic.
    for (let iteration = 0; iteration < 2; iteration += 1) {
      for (let i = 0; i < positions.length; i += 1) {
        for (let j = i + 1; j < positions.length; j += 1) {
          const a = positions[i];
          const b = positions[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy);
          const minimumDistance = a.isCurrentUser || b.isCurrentUser ? 2.8 : 2.25;

          if (distance === 0 || distance >= minimumDistance) {
            continue;
          }

          const push = (minimumDistance - distance) / 2;
          const unitX = dx / distance;
          const unitY = dy / distance;
          const aWeight = a.isCurrentUser ? 0.35 : 1;
          const bWeight = b.isCurrentUser ? 0.35 : 1;
          const totalWeight = aWeight + bWeight;

          positions[i] = {
            ...a,
            x: a.x - unitX * push * (aWeight / totalWeight),
            y: a.y - unitY * push * (aWeight / totalWeight),
          };
          positions[j] = {
            ...b,
            x: b.x + unitX * push * (bWeight / totalWeight),
            y: b.y + unitY * push * (bWeight / totalWeight),
          };
        }
      }
    }

    return positions.map((avatar) => ({
      ...avatar,
      x: clamp(avatar.x, 3.2, 96.8),
      y: clamp(avatar.y, 4.2, 95.8),
    }));
  }, [activeAvatars, officeById]);

  const worldTransform = useMemo(() => {
    return `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  }, [pan.x, pan.y, zoom]);

  const miniViewport = useMemo(() => {
    if (viewportMetrics.width <= 0 || viewportMetrics.height <= 0) {
      return { left: 0, top: 0, width: 100, height: 100 };
    }

    const width = clamp(100 / zoom, 0, 100);
    const height = clamp(100 / zoom, 0, 100);
    const left = clamp((-pan.x / (viewportMetrics.width * zoom)) * 100, 0, 100 - width);
    const top = clamp((-pan.y / (viewportMetrics.height * zoom)) * 100, 0, 100 - height);

    return { left, top, width, height };
  }, [pan.x, pan.y, viewportMetrics.height, viewportMetrics.width, zoom]);

  const liveStatusLabel = useMemo(() => {
    if (liveStatus === 'idle') return 'Live paused';
    if (liveStatus === 'syncing') return 'Syncing sessions...';
    if (liveStatus === 'error') return 'Live sync error';
    return 'Live synced';
  }, [liveStatus]);

  const liveCadenceLabel = useMemo(() => {
    if (mapMode === 'demo') {
      return 'Polling off';
    }

    return isTabVisible
      ? 'Fallback poll: 60s (visible)'
      : 'Polling paused (hidden)';
  }, [isTabVisible, mapMode]);

  const cardSizeClass = density === 'compact' ? 'w-32 sm:w-36' : 'w-36 sm:w-40';
  const cardPaddingClass = density === 'compact' ? 'px-2 py-2' : 'px-2.5 py-2.5';

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Office Map</h2>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{NEIGHBORHOODS.length} zones</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span>{activeAvatars.length} active</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className={liveStatusLabel === 'Live synced' ? 'text-emerald-500' : ''}>{liveStatusLabel}</span>
              {lastLiveSyncAt && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span>{new Date(lastLiveSyncAt).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>

          <div className="relative w-full lg:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-no-pan="true"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search offices..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-8 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                data-no-pan="true"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
            {filteredOffices.length > 0 && (
              <div
                data-no-pan="true"
                className="absolute z-30 mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
              >
                {filteredOffices.map((office) => {
                  const Icon = office.icon;
                  return (
                    <button
                      key={office.id}
                      type="button"
                      data-no-pan="true"
                      onClick={() => focusSelectedOffice(office.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                    >
                      <div className={`w-5 h-5 rounded ${office.accentClass} flex items-center justify-center`}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      {office.title}
                      <span className="ml-auto text-[11px] text-slate-400">{office.subtitle}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                data-no-pan="true"
                onClick={() => setMapMode('demo')}
                className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${mapMode === 'demo'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
              >
                Demo
              </button>
              <button
                type="button"
                data-no-pan="true"
                onClick={() => setMapMode('live')}
                className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${mapMode === 'live'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
              >
                Live
              </button>
              <button
                type="button"
                data-no-pan="true"
                onClick={() => setMapMode('blend')}
                className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${mapMode === 'blend'
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
              >
                Blend
              </button>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          <button
            type="button"
            data-no-pan="true"
            onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
            className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${density === 'compact'
              ? 'bg-slate-800 border-slate-700 text-white'
              : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
          >
            {density === 'compact' ? 'Compact' : 'Comfortable'}
          </button>
          <button
            type="button"
            data-no-pan="true"
            onClick={() => setShowHeat((previous) => !previous)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors inline-flex items-center gap-1 ${showHeat
              ? 'bg-orange-600 border-orange-600 text-white'
              : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
          >
            {showHeat ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Heat
          </button>
          <button
            type="button"
            data-no-pan="true"
            onClick={() => {
              setZoom(1);
              setPan(clampPan({ x: 0, y: 0 }, 1, viewportMetrics));
            }}
            className="rounded-md px-2 py-1 text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`relative bg-slate-950 overflow-hidden shadow-xl ${isFullMode ? 'h-full rounded-none border-0' : 'min-h-[940px] rounded-3xl border border-slate-200 dark:border-slate-700'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onPointerLeave={handlePointerLeave}
      >
        <div className="absolute inset-0 opacity-35 [background-size:28px_28px] [background-image:linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.16),transparent_42%)]" />

        <div className="absolute inset-0" style={{ transform: worldTransform, transformOrigin: '0 0' }}>
          {NEIGHBORHOODS.map((neighborhood) => {
            const dimNeighborhood = isSearchActive && !matchedNeighborhoodIds.has(neighborhood.id);
            return (
              <div
                key={neighborhood.id}
                className={`absolute rounded-2xl border border-white/10 bg-gradient-to-br ${neighborhood.tintClass} transition-opacity duration-300`}
                style={{
                  left: `${neighborhood.x}%`,
                  top: `${neighborhood.y}%`,
                  width: `${neighborhood.width}%`,
                  height: `${neighborhood.height}%`,
                  opacity: dimNeighborhood ? 0.2 : 1,
                }}
              />
            );
          })}

          {NEIGHBORHOODS.map((neighborhood) => {
            const dimNeighborhood = isSearchActive && !matchedNeighborhoodIds.has(neighborhood.id);
            return (
              <div
                key={`${neighborhood.id}-label`}
                className={`absolute z-30 rounded-md border border-slate-700/80 bg-slate-950/88 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 shadow-sm pointer-events-none transition-opacity duration-300`}
                style={{
                  left: `${neighborhood.x + neighborhood.width / 2}%`,
                  top: `${neighborhood.y - 2.5}%`,
                  transform: 'translateX(-50%)',
                  opacity: dimNeighborhood ? 0.2 : 1,
                }}
              >
                {neighborhood.label}
              </div>
            );
          })}

          {showHeat && OFFICES.map((office) => {
            const intensity = officeTraffic[office.id] / maxTraffic;
            const size = 120 + intensity * 120;
            const opacity = 0.1 + intensity * 0.32;
            return (
              <div
                key={`${office.id}-heat`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl pointer-events-none"
                style={{
                  left: `${office.x}%`,
                  top: `${office.y}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: office.heatColor,
                  opacity,
                }}
              />
            );
          })}

          <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true">
            <defs>
              <linearGradient id="office-map-v2-edge" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(96,165,250,0.35)" />
                <stop offset="50%" stopColor="rgba(56,189,248,0.8)" />
                <stop offset="100%" stopColor="rgba(167,139,250,0.4)" />
              </linearGradient>
            </defs>

            {EDGES.map((edge) => {
              const fromOffice = officeById.get(edge.from);
              const toOffice = officeById.get(edge.to);
              if (!fromOffice || !toOffice) {
                return null;
              }

              const geometry = getLaneGeometry(fromOffice, toOffice);
              const path = `M ${geometry.x0}% ${geometry.y0}% Q ${geometry.cx}% ${geometry.cy}% ${geometry.x1}% ${geometry.y1}%`;
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={path}
                  fill="none"
                  stroke="url(#office-map-v2-edge)"
                  strokeWidth="2.8"
                  strokeDasharray="6 8"
                  strokeLinecap="round"
                  opacity={1}
                />
              );
            })}
          </svg>

          {OFFICES.map((office) => {
            const Icon = office.icon;
            const isSelected = selectedOffice === office.id;
            const isMatch = isSearchActive && matchedOfficeIds.has(office.id);
            const isDimmed = isSearchActive && !matchedOfficeIds.has(office.id);
            return (
              <button
                key={office.id}
                type="button"
                data-office-node="true"
                data-no-pan="true"
                onClick={() => onViewChange(office.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setSelectedOffice(office.id);
                  centerOnOffice(office.id);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 text-left group focus:outline-none ${cardSizeClass} transition-opacity duration-300`}
                style={{ left: `${office.x}%`, top: `${office.y}%`, opacity: isDimmed ? 0.15 : 1 }}
                title={office.title}
              >
                <div
                  className={`relative rounded-xl border ${isMatch ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/40' : isSelected ? 'border-cyan-300 shadow-cyan-500/20' : 'border-slate-700'} bg-slate-900/90 ${cardPaddingClass} shadow-lg group-hover:-translate-y-0.5 group-hover:shadow-xl transition-all`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${office.accentClass} flex items-center justify-center text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-100 leading-tight">{office.title}</p>
                        <p className="text-[11px] text-slate-400">{office.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-slate-800 text-cyan-300 font-semibold">
                      {officeTraffic[office.id]}
                    </span>
                  </div>
                  {false && density === 'comfortable' && (
                    <div className="mt-2 text-[10px] text-slate-400">
                      Left click opens module. Right click recenters.
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {positionedAvatars.map((avatar) => (
            <div
              key={avatar.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
              style={{ left: `${avatar.x}%`, top: `${avatar.y}%` }}
              title={avatar.email ? `${avatar.email}: ${avatar.current} -> ${avatar.target}` : `${avatar.label}: ${avatar.current} -> ${avatar.target}`}
            >
              <div
                className={`rounded-full ${avatar.colorClass} border-2 border-white/90 dark:border-slate-900 shadow-lg flex items-center justify-center ${
                  avatar.isCurrentUser ? 'w-10 h-10 ring-2 ring-blue-300/80' : 'w-7 h-7'
                } ${avatar.isLive ? 'shadow-emerald-500/35' : ''}`}
              >
                <UserCircle2 className={`text-white ${avatar.isCurrentUser ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} />
              </div>
              {avatar.isCurrentUser && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="block text-[10px] text-center font-semibold text-blue-300">
                    You
                  </span>
                  {avatar.email && (
                    <span className="max-w-[180px] rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] text-center font-medium text-cyan-200 truncate">
                      {avatar.email}
                    </span>
                  )}
                </div>
              )}
              {!avatar.isCurrentUser && avatar.isLive && avatar.email && (
                <span className="mt-1 block max-w-[160px] rounded border border-emerald-500/20 bg-slate-900/80 px-1.5 py-0.5 text-[9px] text-center font-medium text-emerald-200 truncate">
                  {avatar.email}
                </span>
              )}
            </div>
          ))}
        </div>

        <div data-no-pan="true" className="absolute inset-0 z-30 pointer-events-none">
          <div
            className={`absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ${cursorFx.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} ${cursorFx.overOffice
              ? 'bg-emerald-400/18'
              : isDragging
              ? 'bg-violet-400/18'
              : 'bg-cyan-400/16'
              } blur-md`}
            style={{ left: `${cursorFx.x}px`, top: `${cursorFx.y}px` }}
          />
          <div
            className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-150 ${cursorFx.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} ${cursorFx.overOffice
              ? 'border-emerald-300/95'
              : isDragging
              ? 'border-violet-300/95'
              : 'border-cyan-300/95'
              }`}
            style={{ left: `${cursorFx.x}px`, top: `${cursorFx.y}px` }}
          />
          <div
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-100 ${cursorFx.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'} ${cursorFx.overOffice
              ? 'bg-emerald-300'
              : isDragging
              ? 'bg-violet-300'
              : 'bg-cyan-300'
              }`}
            style={{ left: `${cursorFx.x}px`, top: `${cursorFx.y}px` }}
          />
          <div
            className={`absolute h-[24px] w-px -translate-x-1/2 -translate-y-1/2 ${cursorFx.visible ? 'opacity-85' : 'opacity-0'} ${cursorFx.overOffice ? 'bg-emerald-200/80' : 'bg-cyan-200/80'}`}
            style={{ left: `${cursorFx.x}px`, top: `${cursorFx.y}px` }}
          />
          <div
            className={`absolute h-px w-[24px] -translate-x-1/2 -translate-y-1/2 ${cursorFx.visible ? 'opacity-85' : 'opacity-0'} ${cursorFx.overOffice ? 'bg-emerald-200/80' : 'bg-cyan-200/80'}`}
            style={{ left: `${cursorFx.x}px`, top: `${cursorFx.y}px` }}
          />
          <div
            key={`cursor-burst-${cursorFx.burstId}`}
            className={`${cursorFx.visible ? 'absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/75 animate-ping' : 'hidden'}`}
            style={{ left: `${cursorFx.burstX}px`, top: `${cursorFx.burstY}px` }}
          />
        </div>

        <div data-no-pan="true" className="absolute top-4 left-4 flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-2 text-slate-200 shadow-lg">
          <button
            type="button"
            data-no-pan="true"
            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
            onClick={() => setZoomWithAnchor(zoom * 1.15, viewportMetrics.width / 2, viewportMetrics.height / 2)}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-no-pan="true"
            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
            onClick={() => setZoomWithAnchor(zoom * 0.87, viewportMetrics.width / 2, viewportMetrics.height / 2)}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-no-pan="true"
            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
            onClick={() => {
              if (selectedOfficeNode) {
                centerOnOffice(selectedOfficeNode.id, Math.max(zoom, 1.25));
              } else {
                setZoomWithAnchor(1, viewportMetrics.width / 2, viewportMetrics.height / 2);
              }
            }}
          >
            <LocateFixed className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-no-pan="true"
            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
            onClick={() => {
              void toggleFullMode();
            }}
            title={isFullMode ? 'Exit full mode' : 'Open full mode'}
          >
            {isFullMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div
          data-no-pan="true"
          className={`absolute top-4 right-4 rounded-xl border border-slate-700/80 bg-slate-900/90 text-slate-200 shadow-lg ${isTrafficLeadersMinimized ? 'p-2' : 'w-56 p-3'}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Traffic Leaders
            </div>
            <button
              type="button"
              data-no-pan="true"
              onClick={() => setIsTrafficLeadersMinimized((previous) => !previous)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              title={isTrafficLeadersMinimized ? 'Expand traffic leaders' : 'Minimize traffic leaders'}
            >
              {isTrafficLeadersMinimized ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          </div>

          {!isTrafficLeadersMinimized && (
            <div className="mt-2 space-y-1.5">
              {busiestOffices.map((office) => (
                <button
                  key={office.id}
                  type="button"
                  data-no-pan="true"
                  onClick={() => focusSelectedOffice(office.id)}
                  className="w-full text-left rounded-md px-2 py-1 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-200 truncate">{office.title}</span>
                    <span className="text-[10px] text-cyan-300">{officeTraffic[office.id]}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div data-no-pan="true" className="absolute bottom-4 right-4 rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-lg">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Mini Map
          </div>
          <div
            data-no-pan="true"
            className="relative w-48 h-32 rounded-lg border border-slate-700 bg-slate-950 cursor-crosshair overflow-hidden"
            onClick={handleMiniMapClick}
          >
            {NEIGHBORHOODS.map((neighborhood) => (
              <div
                key={`mini-${neighborhood.id}`}
                className="absolute border border-slate-700/70 bg-slate-800/40 rounded-sm"
                style={{
                  left: `${neighborhood.x}%`,
                  top: `${neighborhood.y}%`,
                  width: `${neighborhood.width}%`,
                  height: `${neighborhood.height}%`,
                }}
              />
            ))}

            {OFFICES.map((office) => (
              <div
                key={`mini-office-${office.id}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${office.accentClass} ${selectedOffice === office.id ? 'ring-2 ring-white' : ''}`}
                style={{ left: `${office.x}%`, top: `${office.y}%` }}
              />
            ))}

            <div
              className="absolute border border-cyan-300 rounded-sm bg-cyan-300/15"
              style={{
                left: `${miniViewport.left}%`,
                top: `${miniViewport.top}%`,
                width: `${miniViewport.width}%`,
                height: `${miniViewport.height}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
