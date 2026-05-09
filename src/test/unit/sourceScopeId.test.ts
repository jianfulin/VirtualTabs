/**
 * 單元測試：sourceScopeId 注入和移除邏輯
 *
 * 測試：
 * - 載入時注入 sourceScopeId
 * - 儲存時移除 sourceScopeId（不持久化至磁碟）
 * - 無效 sourceScopeId 的處理
 */

// ─── 模擬注入/移除邏輯 ────────────────────────────────────────────────────────

interface MockGroup {
    id: string;
    name: string;
    files?: string[];
    sourceScopeId?: string;
    metadata?: Record<string, unknown>;
}

/** 注入 sourceScopeId（載入時） */
function injectScopeId(groups: MockGroup[], scopeId: string): MockGroup[] {
    return groups.map(g => ({ ...g, sourceScopeId: scopeId }));
}

/** 移除 sourceScopeId（儲存時） */
function removeScopeId(groups: MockGroup[]): MockGroup[] {
    return groups.map(group => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sourceScopeId: _removed, ...groupWithoutScopeId } = group;
        return groupWithoutScopeId;
    });
}

/** 路由儲存：依 sourceScopeId 分組 */
function routeGroupsByScopeId(
    groups: MockGroup[],
    knownScopeIds: string[]
): { routed: Map<string, MockGroup[]>; skipped: MockGroup[] } {
    const routed = new Map<string, MockGroup[]>();
    const skipped: MockGroup[] = [];

    for (const group of groups) {
        const scopeId = group.sourceScopeId;
        if (!scopeId || !knownScopeIds.includes(scopeId)) {
            skipped.push(group);
            continue;
        }
        if (!routed.has(scopeId)) {
            routed.set(scopeId, []);
        }
        routed.get(scopeId)!.push(group);
    }

    return { routed, skipped };
}

// ─── 測試 ─────────────────────────────────────────────────────────────────────

describe('sourceScopeId 注入和移除邏輯單元測試', () => {
    describe('注入邏輯', () => {
        test('應為所有群組注入正確的 sourceScopeId', () => {
            const groups: MockGroup[] = [
                { id: 'g1', name: 'Group 1' },
                { id: 'g2', name: 'Group 2' }
            ];

            const injected = injectScopeId(groups, 'scope-A');

            expect(injected[0].sourceScopeId).toBe('scope-A');
            expect(injected[1].sourceScopeId).toBe('scope-A');
        });

        test('注入後原始群組的其他欄位應保持不變', () => {
            const groups: MockGroup[] = [
                { id: 'g1', name: 'My Group', files: ['file1.ts'] }
            ];

            const injected = injectScopeId(groups, 'scope-A');

            expect(injected[0].id).toBe('g1');
            expect(injected[0].name).toBe('My Group');
            expect(injected[0].files).toEqual(['file1.ts']);
        });

        test('空群組陣列注入後應仍為空', () => {
            const injected = injectScopeId([], 'scope-A');
            expect(injected).toHaveLength(0);
        });
    });

    describe('移除邏輯', () => {
        test('應移除所有群組的 sourceScopeId', () => {
            const groups: MockGroup[] = [
                { id: 'g1', name: 'Group 1', sourceScopeId: 'scope-A' },
                { id: 'g2', name: 'Group 2', sourceScopeId: 'scope-B' }
            ];

            const removed = removeScopeId(groups);

            expect(removed[0].sourceScopeId).toBeUndefined();
            expect(removed[1].sourceScopeId).toBeUndefined();
        });

        test('移除後序列化的 JSON 不應包含 sourceScopeId', () => {
            const groups: MockGroup[] = [
                { id: 'g1', name: 'Group 1', sourceScopeId: 'scope-A' }
            ];

            const removed = removeScopeId(groups);
            const json = JSON.stringify(removed);
            const parsed = JSON.parse(json) as Array<Record<string, unknown>>;

            expect('sourceScopeId' in parsed[0]).toBe(false);
        });

        test('移除後其他欄位應保持不變', () => {
            const groups: MockGroup[] = [
                { id: 'g1', name: 'My Group', files: ['file1.ts'], sourceScopeId: 'scope-A' }
            ];

            const removed = removeScopeId(groups);

            expect(removed[0].id).toBe('g1');
            expect(removed[0].name).toBe('My Group');
            expect(removed[0].files).toEqual(['file1.ts']);
        });
    });

    describe('路由邏輯', () => {
        test('應依 sourceScopeId 正確路由群組', () => {
            const groups: MockGroup[] = [
                { id: 'g1', name: 'Group 1', sourceScopeId: 'scope-A' },
                { id: 'g2', name: 'Group 2', sourceScopeId: 'scope-B' },
                { id: 'g3', name: 'Group 3', sourceScopeId: 'scope-A' }
            ];

            const { routed } = routeGroupsByScopeId(groups, ['scope-A', 'scope-B']);

            expect(routed.get('scope-A')).toHaveLength(2);
            expect(routed.get('scope-B')).toHaveLength(1);
        });

        test('無效 sourceScopeId 的群組應被跳過', () => {
            const groups: MockGroup[] = [
                { id: 'g1', name: 'Group 1', sourceScopeId: 'scope-A' },
                { id: 'g2', name: 'Group 2', sourceScopeId: 'invalid-scope' }
            ];

            const { routed, skipped } = routeGroupsByScopeId(groups, ['scope-A']);

            expect(routed.get('scope-A')).toHaveLength(1);
            expect(skipped).toHaveLength(1);
            expect(skipped[0].id).toBe('g2');
        });

        test('無 sourceScopeId 的群組應被跳過', () => {
            const groups: MockGroup[] = [
                { id: 'g1', name: 'Group 1' } // 無 sourceScopeId
            ];

            const { skipped } = routeGroupsByScopeId(groups, ['scope-A']);

            expect(skipped).toHaveLength(1);
        });
    });
});
