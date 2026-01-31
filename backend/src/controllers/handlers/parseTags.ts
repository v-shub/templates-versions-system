/**
 * Parse tags from request body (string, array, or comma-separated).
 */

export function parseTags(body: { tags?: string | string[] }): string[] {
  if (!body.tags) return [];
  try {
    if (typeof body.tags === 'string') {
      try {
        return JSON.parse(body.tags);
      } catch {
        return body.tags.split(',').map((tag: string) => tag.trim());
      }
    }
    if (Array.isArray(body.tags)) return body.tags;
  } catch {
    if (typeof body.tags === 'string') {
      return body.tags.split(',').map((tag: string) => tag.trim());
    }
  }
  return [];
}
