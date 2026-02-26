/**
 * Pure helpers for Dashboard stats: status data, activity data, approved count.
 */

export interface StatusChartItem {
  name: string;
  value: number;
  originalKey: string;
  percentage: string;
  label: string;
}

export interface StatsByStatus {
  [key: string]: number;
}

export interface StatsPayload {
  byStatus?: StatsByStatus;
  byCategory?: any[];
  byDepartment?: any[];
  totalTemplates?: number;
  totalVersions?: number;
  activityByMonth?: Array<{ month: string; newTemplates?: number; newVersions?: number }>;
  lastUpdated?: string;
}

export function getStatusData(stats: StatsPayload | undefined): Array<{ name: string; value: number; originalKey: string }> {
  if (!stats?.byStatus || typeof stats.byStatus !== 'object') {
    return [];
  }

  const statusEntries = Object.entries(stats.byStatus);
  console.log('Статистика по статусам:', stats.byStatus);
  console.log('Преобразованные записи:', statusEntries);

  return statusEntries
    .map(([statusKey, count]: [string, any]) => {
      let statusName: string;
      switch (statusKey.toLowerCase()) {
        case 'draft':
          statusName = 'Черновики';
          break;
        case 'approved':
          statusName = 'Утвержденные';
          break;
        case 'deprecated':
          statusName = 'Устаревшие';
          break;
        default:
          statusName = statusKey;
      }
      return {
        name: statusName,
        value: Number(count) || 0,
        originalKey: statusKey,
      };
    })
    .filter((item) => item.value > 0);
}

export function getStatusChartData(
  statusData: Array<{ name: string; value: number; originalKey: string }>
): { statusChartData: StatusChartItem[]; totalStatusCount: number } {
  const totalStatusCount = statusData.reduce((sum, item) => sum + item.value, 0);
  const statusChartData = statusData.map((item) => ({
    ...item,
    percentage: totalStatusCount > 0 ? ((item.value / totalStatusCount) * 100).toFixed(1) : '0.0',
    label: `${item.name}: ${item.value} (${totalStatusCount > 0 ? ((item.value / totalStatusCount) * 100).toFixed(1) : '0.0'}%)`,
  }));
  return { statusChartData, totalStatusCount };
}

export function getActivityData(stats: StatsPayload | undefined): Array<{ month: string; templates: number; versions: number }> {
  if (stats?.activityByMonth && Array.isArray(stats.activityByMonth)) {
    return stats.activityByMonth.map((item: any) => ({
      month: item.month,
      templates: item.newTemplates || 0,
      versions: item.newVersions || 0,
    }));
  }
  return [];
}

export function getApprovedCount(
  stats: StatsPayload | undefined,
  statusData: Array<{ value: number; originalKey: string }>
): number {
  if (stats?.byStatus?.approved !== undefined) {
    return Number(stats.byStatus.approved);
  }
  const approvedItem = statusData.find((item) => item.originalKey.toLowerCase() === 'approved');
  return approvedItem ? approvedItem.value : 0;
}
