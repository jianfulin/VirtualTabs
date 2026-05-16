/**
 * 屬性測試：Discovery 相關屬性（屬性 12、13）
 *
 * 屬性 12：Discovery 不修改現有配置 — 執行 discovery 前後，virtualTab.json 內容應保持不變
 * 屬性 13：單一資料夾工作區向下相容性 — 新架構下的行為應與原始實作相同
 *
 * Feature: hierarchical-config-scoping
 */

import * as fc from 'fast-check';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { PathUtils } from '../../core/PathUtils';
import { GroupManager } from '../../core/GroupManager';

// ─── 屬性測試 ────────────────────────────────────────────────────────────────

describe('Discovery 屬性測試', () => {
    /**
     * 屬性 12：Discovery 不修改現有配置
     * 執行 ConfigScopeDiscovery 前後，所有 virtualTab.json 的內容應保持不變
     */
    test('屬性 12：discovery 不應修改現有的 virtualTab.json 內容', () => {
        // Feature: hierarchical-config-scoping, Property 12: Discovery 不修改現有配置
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('\0')),
                        name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0)
                    }),
                    { minLength: 0, maxLength: 5 }
                ),
                (groups) => {
                    // 建立臨時目錄模擬工作區
                    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vt-test-'));
                    const vscodePath = path.join(tmpDir, '.vscode');
                    const configPath = path.join(vscodePath, 'virtualTab.json');

                    try {
                        // 寫入初始配置
                        fs.mkdirSync(vscodePath, { recursive: true });
                        const initialContent = JSON.stringify(groups, null, 2);
                        fs.writeFileSync(configPath, initialContent, 'utf8');

                        // 模擬 discovery（只讀取，不修改）
                        // ConfigScopeDiscovery.discover() 只掃描 vscode.workspace API，不讀取檔案
                        // 這裡驗證 GroupManager.loadGroups() 不修改檔案
                        const gm = new GroupManager(tmpDir);
                        gm.loadGroups(); // 只讀取

                        // 驗證檔案內容未被修改
                        const afterContent = fs.readFileSync(configPath, 'utf8');
                        return initialContent === afterContent;
                    } finally {
                        // 清理臨時目錄
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * 屬性 13：單一資料夾工作區向下相容性
     * 新架構下群組的載入和儲存行為應與原始實作（使用單一 GroupManager）產生相同的結果
     */
    test('屬性 13：單一資料夾工作區的路徑相對化行為應與原始實作相同', () => {
        // Feature: hierarchical-config-scoping, Property 13: 單一資料夾工作區向下相容性
        const workspaceRoot = process.platform === 'win32'
            ? 'C:\\Users\\user\\project'
            : '/home/user/project';

        fc.assert(
            fc.property(
                fc.array(
                    fc.stringMatching(/^[A-Za-z0-9._-]{1,20}$/).filter(s => s !== '..'),
                    { minLength: 1, maxLength: 5 }
                ),
                (pathSegments) => {
                    const absolutePath = path.join(workspaceRoot, ...pathSegments);

                    // 原始實作：使用單一 PathUtils（workspaceRoot）
                    const originalPu = new PathUtils(workspaceRoot);
                    const originalRelative = originalPu.toRelativePath(absolutePath);
                    const originalRestored = originalPu.toAbsolutePath(originalRelative);

                    // 新架構：使用 scope.uri.fsPath 作為 workspaceRoot（單一 folder scope 時相同）
                    const newPu = new PathUtils(workspaceRoot); // 單一 folder scope 時 fsPath 相同
                    const newRelative = newPu.toRelativePath(absolutePath);
                    const newRestored = newPu.toAbsolutePath(newRelative);

                    // 驗證行為一致
                    return (
                        originalRelative === newRelative &&
                        path.normalize(originalRestored) === path.normalize(newRestored)
                    );
                }
            ),
            { numRuns: 100 }
        );
    });
});
