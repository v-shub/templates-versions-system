/**
 * Pure utility functions for template display (icons, size, status).
 */

export function getFileIcon(mimeType?: string): string {
  if (!mimeType) return '';
  if (mimeType.includes('pdf')) return '';
  if (mimeType.includes('word') || mimeType.includes('doc')) return '';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '';
  if (mimeType.includes('image')) return '';
  return '';
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'draft':
      return 'warning';
    case 'deprecated':
      return 'error';
    default:
      return 'default';
  }
}
