import * as vscode from 'vscode';

// Sort criteria for files in a group
export type SortCriteria =
    | 'none'        // Insertion order (default)
    | 'name'        // Filename A-Z
    | 'path'        // Full path
    | 'extension'   // File extension
    | 'modified';   // Last modified time

// Group by criteria
export type GroupByCriteria =
    | 'none'
    | 'extension'
    | 'modifiedDate';

// Date group categories
export type DateGroup =
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'lastWeek'
    | 'thisMonth'
    | 'older';

/**
 * VirtualTabs Bookmark (v0.2.0)
 * Represents a specific code location within a file in a group
 */
export interface VTBookmark {
    /**
     * Unique identifier
     */
    id: string;

    /**
     * Line number (0-based)
     */
    line: number;

    /**
     * Character position (0-based, optional)
     */
    character?: number;

    /**
     * Bookmark label (required)
     * Example: "Login function", "TODO: Refactor", "Bug location"
     */
    label: string;

    /**
     * Detailed description (optional)
     * Example: "This logic needs optimization, current complexity is O(n²)"
     */
    description?: string;

    /**
     * Creation timestamp
     */
    created: number;

    /**
     * Last modified timestamp (optional)
     */
    modified?: number;
}

// Group data structure
export interface TempGroup {
    id: string;                        // Unique identifier (Enforced in v0.3.0)
    name: string;
    files?: string[];                   // Array of file URIs in the group
    readonly builtIn?: boolean;         // Mark if this is a built-in group
    auto?: boolean;                     // Mark if this is an auto group

    // Display preferences (v0.1.0)
    sortBy?: SortCriteria;              // Sort preference
    sortOrder?: 'asc' | 'desc';         // Sort direction
    groupBy?: GroupByCriteria;          // Grouping preference
    autoGroupType?: 'extension' | 'modifiedDate';  // Type of auto-grouping
    parentGroupId?: string;             // Parent group ID (for nested groups)

    // Bookmarks (v0.2.0)
    /**
     * Bookmarks within this group
     * Key: File URI string
     * Value: Array of bookmarks for that file
     */
    bookmarks?: Record<string, VTBookmark[]>;

    // Reserved for future use
    metadata?: Record<string, any>;     // For bookmarks, colors, etc.
}

/**
 * Transmit Target (v0.3.5)
 * Defines a destination path for file transmission
 */
export interface TransmitTarget {
    /**
     * Display name for the target
     * Example: "Production Server", "Backup Folder"
     */
    name: string;

    /**
     * Destination path (absolute path or network path)
     * Example: "D:\\Deploy", "\\\\server\\share"
     */
    path: string;
}

/**
 * VirtualTab Configuration File Structure
 * Stored in .vscode/virtualTab.json
 */
export interface VirtualTabConfig {
    /**
     * Group definitions (existing format - array of TempGroup)
     * For backward compatibility, the root can be an array
     */
    groups?: TempGroup[];

    /**
     * Transmit targets for file transmission feature
     */
    transmitTargets?: TransmitTarget[];
}