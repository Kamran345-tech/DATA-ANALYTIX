import pkg from '../../package.json';

/**
 * Single source of truth for application version derived directly from package.json (Phase 3.4).
 */
export const APP_VERSION: string = pkg.version || '2.4.0';
export const APP_VERSION_LABEL: string = `v${APP_VERSION}`;

/**
 * Produces a deterministic, human-readable Project Identifier slug that always matches
 * the active dataset name (Phase 3.4).
 */
export function toDatasetIdentifier(name?: string | null, sourceFileName?: string | null): string {
  const base = (name || sourceFileName || 'workspace-dataset')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'workspace-dataset';
}
