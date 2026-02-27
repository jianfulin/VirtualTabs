// src/core/index.ts — Single entry point, re-exports all core modules

export { GroupManager, OptimisticLockError } from './GroupManager.js';
export { FileManager } from './FileManager.js';
export type { AddFilesResult, RemoveFilesResult } from './FileManager.js';
export { AutoGrouper } from './AutoGrouper.js';
export { BookmarkManager } from './BookmarkManager.js';
export { FileSorter } from './FileSorter.js';
export { ProjectExplorer } from './ProjectExplorer.js';
export type { ExploreOptions } from './ProjectExplorer.js';
export { PathUtils } from './PathUtils.js';
