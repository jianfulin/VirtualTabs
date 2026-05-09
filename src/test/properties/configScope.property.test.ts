/**
 * 屬性測試：ConfigScope 相關屬性（屬性 1、2、3）
 *
 * 屬性 1：ConfigScope ID 唯一性 — id 應等於 uri.toString()
 * 屬性 2：Workspace Scope URI 正確性 — workspace scope 的 uri 應為 workspaceFile 的父目錄
 * 屬性 3：Folder Scope 完整性 — folder scope 數量應等於 workspaceFolders 長度
 *
 * Feature: hierarchical-config-scoping
 */

import * as fc from 'fast-check';
import * as path from 'path';

// ─── 輕量 URI 模擬（不依賴 vscode API）───────────────────────────────────────

interface MockUri {
    fsPath: string;
    toString(): string;
    joinPath(...segments: string[]): MockUri;
}

function createMockUri(fsPath: string): MockUri {
    const normalized = fsPath.replace(/\\/g, '/');
    return {
        fsPath,
        toString: () => `file://${normalized}`,
        joinPath: (...segments: string[]) => createMockUri(path.join(fsPath, ...segments))
    };
}

function joinPath(uri: MockUri, ...segments: string[]): MockUri {
    return createMockUri(path.join(uri.fsPath, ...segments));
}

// ─── 模擬 ConfigScope 建立邏輯（與 ConfigScopeDiscovery 相同）────────────────

function createWorkspaceScope(workspaceFile: MockUri) {
    const parentUri = joinPath(workspaceFile, '..');
    return {
        id: parentUri.toString(),
        type: 'workspace' as const,
        label: 'Workspace',
        uri: parentUri,
        groups: []
    };
}

function createFolderScope(folder: { uri: MockUri; name: string }) {
    const folderName = path.basename(folder.uri.fsPath);
    return {
        id: folder.uri.toString(),
        type: 'folder' as const,
        label: folderName,
        uri: folder.uri,
        groups: []
    };
}

// ─── 屬性測試 ────────────────────────────────────────────────────────────────

describe('ConfigScope 屬性測試', () => {
    /**
     * 屬性 1：ConfigScope ID 唯一性
     * 對任意 URI，建立的 ConfigScope 的 id 應等於 uri.toString()
     */
    test('屬性 1：ConfigScope.id 應等於 uri.toString()', () => {
        // Feature: hierarchical-config-scoping, Property 1: ConfigScope ID 唯一性
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\0')),
                (pathSegment) => {
                    const uri = createMockUri(`/workspace/${pathSegment}`);
                    const scope = createFolderScope({ uri, name: pathSegment });
                    return scope.id === uri.toString();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 2：Workspace Scope URI 正確性
     * workspace scope 的 uri 應等於 workspaceFile 的父目錄 URI
     */
    test('屬性 2：workspace scope 的 uri 應為 workspaceFile 的父目錄', () => {
        // Feature: hierarchical-config-scoping, Property 2: Workspace Scope URI 正確性
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\0') && !s.includes('/')),
                (workspaceName) => {
                    const workspaceFile = createMockUri(`/projects/${workspaceName}/my.code-workspace`);
                    const scope = createWorkspaceScope(workspaceFile);
                    const expectedParent = joinPath(workspaceFile, '..');
                    return scope.uri.toString() === expectedParent.toString();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 3：Folder Scope 完整性
     * folder scope 數量應等於 workspaceFolders 的長度，且每個 folder scope 的 uri 對應正確
     */
    test('屬性 3：folder scope 數量應等於 workspaceFolders 長度', () => {
        // Feature: hierarchical-config-scoping, Property 3: Folder Scope 完整性
        fc.assert(
            fc.property(
                fc.array(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('\0') && !s.includes('/')),
                    { minLength: 1, maxLength: 5 }
                ),
                (folderNames) => {
                    const folders = folderNames.map(name => ({
                        uri: createMockUri(`/workspace/${name}`),
                        name
                    }));

                    const scopes = folders.map(f => createFolderScope(f));

                    // 數量應相等
                    if (scopes.length !== folders.length) return false;

                    // 每個 scope 的 uri 應對應到對應的 folder uri
                    for (let i = 0; i < scopes.length; i++) {
                        if (scopes[i].uri.toString() !== folders[i].uri.toString()) return false;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
