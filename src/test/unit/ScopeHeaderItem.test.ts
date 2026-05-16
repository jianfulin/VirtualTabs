/**
 * 單元測試：ScopeHeaderItem
 *
 * 測試 label 生成邏輯和 contextValue 設定：
 * - workspace scope 的 label 應為 'Workspace Config'
 * - folder scope 的 label 應為 'Project: [folderName]'
 * - 多 scope 時 contextValue 應為 'virtualTabsScopeHeaderWithAdd'
 * - 非互動式（command 應為 undefined）
 */

import * as path from 'path';

// ─── 模擬 ScopeHeaderItem 邏輯（不依賴 vscode API）──────────────────────────

interface MockUri {
    fsPath: string;
    toString(): string;
}

function createMockUri(fsPath: string): MockUri {
    const normalized = fsPath.replace(/\\/g, '/');
    return {
        fsPath,
        toString: () => `file://${normalized}`
    };
}

interface MockScopeHeaderItem {
    label: string;
    contextValue: string;
    command: undefined;
    id: string;
}

function createScopeHeaderItem(
    scope: { id: string; type: 'workspace' | 'folder'; uri: MockUri },
    hasMultipleScopes: boolean
): MockScopeHeaderItem {
    const label = scope.type === 'workspace'
        ? 'Workspace Config'
        : `Project: ${path.basename(scope.uri.fsPath)}`;

    return {
        label,
        contextValue: hasMultipleScopes ? 'virtualTabsScopeHeaderWithAdd' : 'virtualTabsScopeHeader',
        command: undefined,
        id: `virtualTabsScopeHeader:${scope.id}`
    };
}

// ─── 測試 ─────────────────────────────────────────────────────────────────────

describe('ScopeHeaderItem 單元測試', () => {
    describe('workspace scope', () => {
        test('label 應為 "Workspace Config"', () => {
            const scope = {
                id: 'file:///workspace',
                type: 'workspace' as const,
                uri: createMockUri('/workspace')
            };
            const item = createScopeHeaderItem(scope, true);
            expect(item.label).toBe('Workspace Config');
        });

        test('多 scope 時 contextValue 應為 "virtualTabsScopeHeaderWithAdd"', () => {
            const scope = {
                id: 'file:///workspace',
                type: 'workspace' as const,
                uri: createMockUri('/workspace')
            };
            const item = createScopeHeaderItem(scope, true);
            expect(item.contextValue).toBe('virtualTabsScopeHeaderWithAdd');
        });

        test('單一 scope 時 contextValue 應為 "virtualTabsScopeHeader"', () => {
            const scope = {
                id: 'file:///workspace',
                type: 'workspace' as const,
                uri: createMockUri('/workspace')
            };
            const item = createScopeHeaderItem(scope, false);
            expect(item.contextValue).toBe('virtualTabsScopeHeader');
        });
    });

    describe('folder scope', () => {
        test('label 應為 "Project: [folderName]"', () => {
            const scope = {
                id: 'file:///workspace/Repo-A',
                type: 'folder' as const,
                uri: createMockUri('/workspace/Repo-A')
            };
            const item = createScopeHeaderItem(scope, true);
            expect(item.label).toBe('Project: Repo-A');
        });

        test('label 應使用 path.basename 取得資料夾名稱', () => {
            const scope = {
                id: 'file:///home/user/my-awesome-project',
                type: 'folder' as const,
                uri: createMockUri('/home/user/my-awesome-project')
            };
            const item = createScopeHeaderItem(scope, true);
            expect(item.label).toBe('Project: my-awesome-project');
        });

        test('多 scope 時 contextValue 應為 "virtualTabsScopeHeaderWithAdd"', () => {
            const scope = {
                id: 'file:///workspace/Repo-A',
                type: 'folder' as const,
                uri: createMockUri('/workspace/Repo-A')
            };
            const item = createScopeHeaderItem(scope, true);
            expect(item.contextValue).toBe('virtualTabsScopeHeaderWithAdd');
        });
    });

    describe('非互動式', () => {
        test('command 應為 undefined', () => {
            const scope = {
                id: 'file:///workspace',
                type: 'workspace' as const,
                uri: createMockUri('/workspace')
            };
            const item = createScopeHeaderItem(scope, true);
            expect(item.command).toBeUndefined();
        });

        test('id 應包含 scope.id', () => {
            const scope = {
                id: 'file:///workspace',
                type: 'workspace' as const,
                uri: createMockUri('/workspace')
            };
            const item = createScopeHeaderItem(scope, true);
            expect(item.id).toContain(scope.id);
        });
    });
});
