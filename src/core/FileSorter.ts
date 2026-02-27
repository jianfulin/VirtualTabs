import * as path from 'path';
import * as fs from 'fs';
import { SortCriteria } from '../types.js';
import { PathUtils } from './PathUtils.js';

/**
 * FileSorter — single source of truth for file URI sorting.
 * Pure Node.js (no vscode dependency) so it can be used by both the
 * VS Code extension layer and the MCP server.
 */
export class FileSorter {
  /**
   * Sort file URIs based on criteria
   * @param uris Array of file URI strings
   * @param criteria Sort criteria
   * @param order Sort order (ascending or descending)
   * @returns Sorted array of file URI strings
   */
  static sortFiles(
    uris: string[],
    criteria: SortCriteria,
    order: 'asc' | 'desc' = 'asc'
  ): string[] {
    if (criteria === 'none') {
      return uris; // Keep original order
    }

    // Pre-build mtime cache for 'modified' sort to avoid O(n log n) statSync calls
    let mtimeCache: Map<string, number> | undefined;
    if (criteria === 'modified') {
      mtimeCache = new Map();
      for (const uri of uris) {
        try {
          mtimeCache.set(uri, fs.statSync(PathUtils.toFsPath(uri)).mtime.getTime());
        } catch {
          mtimeCache.set(uri, 0);
        }
      }
    }

    const sorted = [...uris];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (criteria) {
        case 'name':
          comparison = FileSorter.compareByName(a, b);
          break;
        case 'path':
          comparison = FileSorter.compareByPath(a, b);
          break;
        case 'extension':
          comparison = FileSorter.compareByExtension(a, b);
          break;
        case 'modified':
          comparison = (mtimeCache!.get(a) ?? 0) - (mtimeCache!.get(b) ?? 0);
          break;
        default:
          return 0;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Compare files by name (natural sorting with numeric support)
   */
  private static compareByName(a: string, b: string): number {
    try {
      const nameA = path.basename(PathUtils.toFsPath(a)).toLowerCase();
      const nameB = path.basename(PathUtils.toFsPath(b)).toLowerCase();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    } catch {
      return 0;
    }
  }

  /**
   * Compare files by full path
   */
  private static compareByPath(a: string, b: string): number {
    try {
      const pathA = PathUtils.toFsPath(a).toLowerCase();
      const pathB = PathUtils.toFsPath(b).toLowerCase();
      return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' });
    } catch {
      return 0;
    }
  }

  /**
   * Compare files by extension, then by name if extensions are the same
   */
  private static compareByExtension(a: string, b: string): number {
    try {
      const extA = path.extname(PathUtils.toFsPath(a)).toLowerCase();
      const extB = path.extname(PathUtils.toFsPath(b)).toLowerCase();

      if (extA === extB) {
        return FileSorter.compareByName(a, b);
      }

      // Files without extension should come first
      if (!extA) return -1;
      if (!extB) return 1;

      return extA.localeCompare(extB);
    } catch {
      return 0;
    }
  }
}
