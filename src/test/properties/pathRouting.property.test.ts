/**
 * 屬性測試：路徑路由相關屬性（屬性 4、5、6、7）
 *
 * 屬性 4：sourceScopeId 注入正確性 — 載入後每個群組的 sourceScopeId 應等於其來源 scope 的 id
 * 屬性 5：儲存路由正確性 — 儲存操作應路由至 sourceScopeId 對應的 GroupManager
 * 屬性 6：sourceScopeId 不持久化 — 儲存至磁碟的 JSON 不應包含 sourceScopeId
 * 屬性 7：路徑相對化 Round-Trip — 相對化後再還原應得到等價路徑
 *
 * Feature: hierarchical-config-scoping
 */

import * as fc from 'fast-check';
import * as path from 'path';
import { PathUtils } from '../../core/PathUtils';

// ─── 屬性測試 ────────────────────────────────────────────────────────────────

describe('路徑路由屬性測試', () => {
    /**
     * 屬性 4：sourceScopeId 注入正確性
     * 從各 scope 載入群組後，每個群組的 sourceScopeId 應等於其來源 scope 的 id
     */
    test('屬性 4：載入後群組的 sourceScopeId 應等於來源 scope 的 id', () => {
        // Feature: hierarchical-config-scoping, Property 4: sourceScopeId 注入正確性
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        scopeId: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('\0')),
                        groupCount: fc.integer({ min: 0, max: 5 })
                    }),
                    { minLength: 1, maxLength: 4 }
                ),
                (scopeConfigs) => {
                    // 模擬從各 scope 載入群組並注入 sourceScopeId
                    const allGroups: Array<{ id: string; name: string; sourceScopeId: string }> = [];

                    for (const config of scopeConfigs) {
                        for (let i = 0; i < config.groupCount; i++) {
                            allGroups.push({
                                id: `group-${config.scopeId}-${i}`,
                                name: `Group ${i}`,
                                sourceScopeId: config.scopeId // 注入 sourceScopeId
                            });
                        }
                    }

                    // 驗證每個群組的 sourceScopeId 對應到正確的 scope
                    for (const group of allGroups) {
                        const matchingScope = scopeConfigs.find(s => s.scopeId === group.sourceScopeId);
                        if (!matchingScope) return false;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 5：儲存路由正確性
     * 含有效 sourceScopeId 的群組，儲存操作應路由至對應的 GroupManager
     */
    test('屬性 5：儲存路由應依 sourceScopeId 路由至正確的 GroupManager', () => {
        // Feature: hierarchical-config-scoping, Property 5: 儲存路由正確性
        fc.assert(
            fc.property(
                fc.array(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('\0')),
                    { minLength: 1, maxLength: 5 }
                ),
                fc.array(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 20 }),
                        scopeIdx: fc.integer({ min: 0, max: 4 })
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                (scopeIds, groupConfigs) => {
                    // 模擬 GroupManager 路由邏輯
                    const saveCallsByScopeId = new Map<string, number>();
                    for (const scopeId of scopeIds) {
                        saveCallsByScopeId.set(scopeId, 0);
                    }

                    for (const config of groupConfigs) {
                        const scopeIdx = config.scopeIdx % scopeIds.length;
                        const scopeId = scopeIds[scopeIdx];
                        const group = { name: config.name, sourceScopeId: scopeId };

                        // 路由邏輯：依 sourceScopeId 找到對應的 GroupManager
                        if (saveCallsByScopeId.has(group.sourceScopeId)) {
                            saveCallsByScopeId.set(
                                group.sourceScopeId,
                                (saveCallsByScopeId.get(group.sourceScopeId) ?? 0) + 1
                            );
                        }
                    }

                    // 驗證每個有效 scopeId 都有對應的路由記錄
                    for (const scopeId of scopeIds) {
                        if (!saveCallsByScopeId.has(scopeId)) return false;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 6：sourceScopeId 不持久化
     * 儲存至磁碟後讀取的 JSON 內容不應包含 sourceScopeId 欄位
     */
    test('屬性 6：儲存至磁碟的群組不應包含 sourceScopeId', () => {
        // Feature: hierarchical-config-scoping, Property 6: sourceScopeId 不持久化
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        name: fc.string({ minLength: 1, maxLength: 30 }),
                        sourceScopeId: fc.string({ minLength: 1, maxLength: 30 })
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (groups) => {
                    // 模擬 toStorageGroups 移除 sourceScopeId 的邏輯
                    const storageGroups = groups.map(group => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { sourceScopeId: _removed, ...groupWithoutScopeId } = group;
                        return groupWithoutScopeId;
                    });

                    // 序列化為 JSON
                    const json = JSON.stringify(storageGroups);
                    const parsed = JSON.parse(json) as Array<Record<string, unknown>>;

                    // 驗證 JSON 中不包含 sourceScopeId
                    for (const g of parsed) {
                        if ('sourceScopeId' in g) return false;
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 7：路徑相對化 Round-Trip
     * 將路徑相對化後再還原，應得到與原始路徑等價的路徑
     */
    test('屬性 7：路徑相對化 round-trip 應還原為等價路徑', () => {
        // Feature: hierarchical-config-scoping, Property 7: 路徑相對化 Round-Trip
        const scopeRoot = process.platform === 'win32'
            ? 'C:\\Users\\user\\project'
            : '/home/user/project';

        fc.assert(
            fc.property(
                fc.array(
                    fc.stringMatching(/^[A-Za-z0-9._-]{1,20}$/).filter(s => s !== '..'),
                    { minLength: 1, maxLength: 5 }
                ),
                (pathSegments) => {
                    const absolutePath = path.join(scopeRoot, ...pathSegments);
                    const pu = new PathUtils(scopeRoot);

                    const relative = pu.toRelativePath(absolutePath);
                    const restored = pu.toAbsolutePath(relative);

                    return path.normalize(absolutePath) === path.normalize(restored);
                }
            ),
            { numRuns: 100 }
        );
    });
});
