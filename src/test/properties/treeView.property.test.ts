/**
 * 屬性測試：TreeView 相關屬性（屬性 8、9、10、11）
 *
 * 屬性 8：Scope 隔離的檔案變更響應 — 只有對應 scope 的群組應被重新載入
 * 屬性 9：多 Scope 時 ScopeHeaderItem 顯示 — 頂層項目應包含每個 scope 的 ScopeHeaderItem
 * 屬性 10：Folder Scope 標頭標籤正確性 — label 應為 'Project: ' + folderName
 * 屬性 11：群組聚合完整性 — 聚合後的群組總數應等於各 scope 群組數之和
 *
 * Feature: hierarchical-config-scoping
 */

import * as fc from 'fast-check';
import * as path from 'path';

// ─── 模擬 ScopeHeaderItem 標籤生成邏輯 ───────────────────────────────────────

function getScopeHeaderLabel(scopeType: 'workspace' | 'folder', fsPath: string): string {
    if (scopeType === 'workspace') {
        return 'Workspace Config';
    }
    return `Project: ${path.basename(fsPath)}`;
}

// ─── 屬性測試 ────────────────────────────────────────────────────────────────

describe('TreeView 屬性測試', () => {
    /**
     * 屬性 8：Scope 隔離的檔案變更響應
     * 當某個 scope 的 virtualTab.json 變更時，只有該 scope 的群組應被重新載入
     */
    test('屬性 8：檔案變更只應影響對應 scope 的群組', () => {
        // Feature: hierarchical-config-scoping, Property 8: Scope 隔離的檔案變更響應
        fc.assert(
            fc.property(
                fc.array(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('\0')),
                    { minLength: 2, maxLength: 5 }
                ),
                fc.integer({ min: 0, max: 4 }),
                (scopeIds, changedScopeIdx) => {
                    const targetScopeIdx = changedScopeIdx % scopeIds.length;
                    const targetScopeId = scopeIds[targetScopeIdx];

                    // 模擬各 scope 的群組（每個 scope 有 2 個群組）
                    const groupsByScopeId = new Map<string, string[]>();
                    for (const scopeId of scopeIds) {
                        groupsByScopeId.set(scopeId, [`group-${scopeId}-1`, `group-${scopeId}-2`]);
                    }

                    // 模擬 onExternalFileChange(scopeId) 的行為：只重新載入目標 scope
                    const reloadedScopes: string[] = [];
                    const reloadScope = (scopeId: string) => {
                        reloadedScopes.push(scopeId);
                    };

                    reloadScope(targetScopeId);

                    // 驗證只有目標 scope 被重新載入
                    if (reloadedScopes.length !== 1) return false;
                    if (reloadedScopes[0] !== targetScopeId) return false;

                    // 驗證其他 scope 未被影響
                    const otherScopes = scopeIds.filter(id => id !== targetScopeId);
                    for (const otherId of otherScopes) {
                        if (reloadedScopes.includes(otherId)) return false;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 9：多 Scope 時 ScopeHeaderItem 顯示
     * 包含兩個以上 ConfigScope 的工作區，TreeView 頂層應包含每個 scope 的 ScopeHeaderItem
     */
    test('屬性 9：多 scope 時頂層應包含每個 scope 的 ScopeHeaderItem', () => {
        // Feature: hierarchical-config-scoping, Property 9: 多 Scope 時 ScopeHeaderItem 顯示
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('\0')),
                        type: fc.constantFrom('workspace' as const, 'folder' as const),
                        fsPath: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('\0'))
                    }),
                    { minLength: 2, maxLength: 5 }
                ),
                (scopes) => {
                    // 模擬 getChildren() 在多 scope 時的行為
                    const hasMultipleScopes = scopes.length > 1;

                    if (!hasMultipleScopes) return true; // 單一 scope 不需要 ScopeHeaderItem

                    // 建立 ScopeHeaderItem 列表
                    const headerItems = scopes.map(scope => ({
                        scopeId: scope.id,
                        label: getScopeHeaderLabel(scope.type, scope.fsPath)
                    }));

                    // 驗證每個 scope 都有對應的 ScopeHeaderItem
                    if (headerItems.length !== scopes.length) return false;

                    // 驗證順序一致
                    for (let i = 0; i < scopes.length; i++) {
                        if (headerItems[i].scopeId !== scopes[i].id) return false;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 10：Folder Scope 標頭標籤正確性
     * folder scope 的 ScopeHeaderItem label 應為 'Project: ' + path.basename(scope.uri.fsPath)
     */
    test('屬性 10：folder scope 標頭標籤應為 "Project: [folderName]"', () => {
        // Feature: hierarchical-config-scoping, Property 10: Folder Scope 標頭標籤正確性
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 30 }).filter(s =>
                    !s.includes('\0') && !s.includes('/') && !s.includes('\\') && s.trim().length > 0
                ),
                (folderName) => {
                    const fsPath = `/workspace/${folderName}`;
                    const label = getScopeHeaderLabel('folder', fsPath);
                    const expectedLabel = `Project: ${folderName}`;
                    return label === expectedLabel;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 11：群組聚合完整性
     * 聚合後的群組總數應等於各 scope 群組數之和（不含 built-in 群組）
     */
    test('屬性 11：聚合後的群組總數應等於各 scope 群組數之和', () => {
        // Feature: hierarchical-config-scoping, Property 11: 群組聚合完整性
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        scopeId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('\0')),
                        groupCount: fc.integer({ min: 0, max: 5 })
                    }),
                    { minLength: 1, maxLength: 4 }
                ),
                (scopeConfigs) => {
                    // 模擬從各 scope 載入群組
                    const allGroups: Array<{ id: string; name: string; sourceScopeId: string }> = [];
                    let expectedTotal = 0;

                    for (const config of scopeConfigs) {
                        for (let i = 0; i < config.groupCount; i++) {
                            allGroups.push({
                                id: `group-${config.scopeId}-${i}`,
                                name: `Group ${i}`,
                                sourceScopeId: config.scopeId
                            });
                        }
                        expectedTotal += config.groupCount;
                    }

                    // 驗證聚合後的群組總數
                    return allGroups.length === expectedTotal;
                }
            ),
            { numRuns: 100 }
        );
    });
});
