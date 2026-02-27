import { type WorkspaceHealthData, type Tier, getEffectiveLimit } from '../hooks/useWorkspaceHealth';

export type WorkspaceStatus = 'critical' | 'warning' | 'healthy';

export const WORKSPACE_ZONE_BOUNDS: Record<WorkspaceStatus, { top: number; bottom: number }> = {
  critical: { top: 8, bottom: 28 },
  warning: { top: 32, bottom: 60 },
  healthy: { top: 64, bottom: 94 },
};

export interface WorkspaceNode extends WorkspaceHealthData {
  x: number;
  y: number;
  healthColor: string;
  accentClass: string;
  status: WorkspaceStatus;
  usagePercent: number;
  riskScore: number;
}

function getHealthColor(status: WorkspaceStatus): string {
  if (status === 'critical') return 'rgba(239, 68, 68, 0.82)';
  if (status === 'warning') return 'rgba(245, 158, 11, 0.82)';
  return 'rgba(56, 189, 248, 0.78)';
}

function getTierAccentClass(tier: Tier): string {
  switch (tier) {
    case 'premium': return 'bg-purple-500';
    case 'enterprise': return 'bg-blue-500';
    case 'custom': return 'bg-amber-500';
    default: return 'bg-slate-500';
  }
}

export function getWorkspaceStatus(workspace: WorkspaceHealthData): WorkspaceStatus {
  const limit = getEffectiveLimit(workspace);
  // Use total running (active + waiting) as the workload measure
  const usagePercent = limit > 0 ? (workspace.stats.running / limit) * 100 : 0;

  if (usagePercent >= 90 || workspace.stats.failed24h >= 20 || workspace.stats.queued >= Math.max(1, limit)) {
    return 'critical';
  }

  if (
    usagePercent >= 70
    || workspace.stats.failed24h >= 5
    || (workspace.stats.queued > 0 && workspace.stats.running > 0)
  ) {
    return 'warning';
  }

  return 'healthy';
}

export function getWorkspaceRiskScore(workspace: WorkspaceHealthData): number {
  const limit = getEffectiveLimit(workspace);
  // Use total running (active + waiting) as the workload measure
  const usagePercent = limit > 0 ? (workspace.stats.running / limit) * 100 : 0;

  return (
    usagePercent * 0.55
    + Math.min(workspace.stats.failed24h, 50) * 0.3
    + Math.min(workspace.stats.queued, 200) * 0.15
  );
}

function computeZoneRows(count: number, density: 'comfortable' | 'compact'): number {
  if (count <= 0) return 0;
  if (density === 'compact') {
    if (count <= 6) return 1;
    if (count <= 12) return 2;
    return Math.ceil(count / 8);
  }

  if (count <= 5) return 1;
  if (count <= 10) return 2;
  return Math.ceil(count / 6);
}

function layoutZone(
  nodes: WorkspaceNode[],
  density: 'comfortable' | 'compact',
  top: number,
  bottom: number,
): WorkspaceNode[] {
  if (nodes.length === 0) {
    return [];
  }

  const rows = computeZoneRows(nodes.length, density);
  const cols = Math.ceil(nodes.length / rows);
  const left = 6;
  const right = 94;
  const width = right - left;
  // Reserve extra headroom for section labels so first-row cards never overlap chips.
  const topInset = density === 'compact' ? 10.5 : 11.8;
  const bottomInset = density === 'compact' ? 2.6 : 3.4;
  const innerTop = top + topInset;
  const innerBottom = Math.max(innerTop + 1.2, bottom - bottomInset);
  const zoneHeight = Math.max(1.2, innerBottom - innerTop);
  const rowSpacing = rows > 1 ? zoneHeight / (rows - 1) : 0;
  const colSpacing = cols > 1 ? width / (cols - 1) : 0;

  return nodes.map((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const isLastRow = row === rows - 1;
    const rowsBefore = row * cols;
    const itemsInRow = isLastRow ? nodes.length - rowsBefore : cols;
    const rowOffset = itemsInRow < cols ? ((cols - itemsInRow) * colSpacing) / 2 : 0;

    return {
      ...node,
      x: cols === 1 ? 50 : left + col * colSpacing + rowOffset,
      y: rows === 1 ? (innerTop + innerBottom) / 2 : innerTop + row * rowSpacing,
    };
  });
}

export function computeWorkspaceLayout(
  workspaces: WorkspaceHealthData[],
  density: 'comfortable' | 'compact',
): WorkspaceNode[] {
  if (workspaces.length === 0) return [];

  const withMetrics: WorkspaceNode[] = workspaces.map((workspace) => {
    const limit = getEffectiveLimit(workspace);
    const usagePercent = limit > 0 ? (workspace.stats.running / limit) * 100 : 0;
    const status = getWorkspaceStatus(workspace);
    const riskScore = getWorkspaceRiskScore(workspace);

    return {
      ...workspace,
      x: 50,
      y: 50,
      healthColor: getHealthColor(status),
      accentClass: getTierAccentClass(workspace.tier),
      status,
      usagePercent,
      riskScore,
    };
  });

  const critical = withMetrics
    .filter((workspace) => workspace.status === 'critical')
    .sort((a, b) => b.riskScore - a.riskScore);
  const warning = withMetrics
    .filter((workspace) => workspace.status === 'warning')
    .sort((a, b) => b.riskScore - a.riskScore);
  const healthy = withMetrics
    .filter((workspace) => workspace.status === 'healthy')
    .sort((a, b) => b.riskScore - a.riskScore);

  return [
    ...layoutZone(critical, density, WORKSPACE_ZONE_BOUNDS.critical.top, WORKSPACE_ZONE_BOUNDS.critical.bottom),
    ...layoutZone(warning, density, WORKSPACE_ZONE_BOUNDS.warning.top, WORKSPACE_ZONE_BOUNDS.warning.bottom),
    ...layoutZone(healthy, density, WORKSPACE_ZONE_BOUNDS.healthy.top, WORKSPACE_ZONE_BOUNDS.healthy.bottom),
  ];
}
