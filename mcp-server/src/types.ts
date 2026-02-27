/**
 * MCP Server type definitions.
 *
 * Shared data-model types (TempGroup, VTBookmark, SortCriteria, GroupByCriteria,
 * BookmarkInfo) are re-exported from the core extension source to eliminate
 * duplication and drift risk.
 * Only MCP-specific types are defined here.
 */

// ── Re-export shared types from the core extension ────────────────────────────
export type {
  SortCriteria,
  GroupByCriteria,
  TempGroup,
  VTBookmark,
  BookmarkInfo,
} from '../../src/types.js';

// ── MCP-specific types ─────────────────────────────────────────────────────────

/**
 * Summary shape returned by list_groups.
 */
export interface GroupSummary {
  id: string;
  name: string;
  fileCount: number;
  isSubGroup: boolean;
  parentGroupId?: string;
  children?: GroupSummary[];
}

/**
 * Well-known error categories for MCP tool responses.
 */
export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  NOT_FOUND = 'not_found',
  IO_ERROR = 'io_error',
  PERMISSION_ERROR = 'permission_error',
  INTERNAL_ERROR = 'internal_error'
}

/** Successful MCP tool response. */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/** Failed MCP tool response. */
export interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    details?: unknown;
    suggestion?: string;
  };
}

/** Partially-successful MCP tool response (warnings present). */
export interface WarningResponse<T> {
  success: true;
  data: T;
  warnings: string[];
}

/** Union of all possible MCP tool response shapes. */
export type ToolResponse<T> = SuccessResponse<T> | ErrorResponse | WarningResponse<T>;
