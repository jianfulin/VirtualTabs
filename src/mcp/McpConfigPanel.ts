import * as vscode from 'vscode';
import * as path from 'path';
import { I18n } from '../i18n';

interface ToolConfig {
    name: string;
    description: string;
    instruction: string;
    config: Record<string, unknown>;
    note?: string;
}

export class McpConfigPanel {
    public static currentPanel: McpConfigPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private readonly _extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static show(extensionUri: vscode.Uri) {
        if (McpConfigPanel.currentPanel) {
            McpConfigPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'virtualTabsMcpConfig',
            I18n.getMessage('mcp.webview.title'),
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        McpConfigPanel.currentPanel = new McpConfigPanel(panel, extensionUri);
    }

    public dispose() {
        McpConfigPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        // Get the MCP Server entry-point path
        const serverPath = path.join(this._extensionUri.fsPath, 'dist', 'mcp', 'index.js').replace(/\\/g, '/');

        // Get the actual workspace path (used in config so ${workspaceFolder} is resolved correctly)
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const actualWorkspaceRoot = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath.replace(/\\/g, '/')
            : '/path/to/your/workspace';

        // Generate the common config structure for each AI tool
        const baseConfig = {
            "virtualtabs": {
                "command": "node",
                "args": [
                    serverPath,
                    "--workspace-root"
                ]
            }
        };

        const toolConfigs = {
            cursor: {
                name: I18n.getMessage('mcp.tool.cursor.name'),
                description: I18n.getMessage('mcp.tool.cursor.description'),
                instruction: I18n.getMessage('mcp.tool.cursor.instruction'),
                config: {
                    ...baseConfig,
                    virtualtabs: {
                        ...baseConfig.virtualtabs,
                        // Cursor supports ${workspaceFolder} variable expansion — kept for portability
                        args: [...baseConfig.virtualtabs.args, "${workspaceFolder}"]
                    }
                }
            },
            copilot: {
                name: I18n.getMessage('mcp.tool.copilot.name'),
                description: I18n.getMessage('mcp.tool.copilot.description'),
                instruction: I18n.getMessage('mcp.tool.copilot.instruction'),
                config: {
                    ...baseConfig,
                    virtualtabs: {
                        ...baseConfig.virtualtabs,
                        // VS Code settings.json MCP config does not expand ${workspaceFolder},
                        // so the actual path must be used
                        args: [...baseConfig.virtualtabs.args, actualWorkspaceRoot]
                    }
                }
            },
            kiro: {
                name: I18n.getMessage('mcp.tool.kiro.name'),
                description: I18n.getMessage('mcp.tool.kiro.description'),
                instruction: I18n.getMessage('mcp.tool.kiro.instruction'),
                config: {
                    ...baseConfig,
                    virtualtabs: {
                        ...baseConfig.virtualtabs,
                        args: [...baseConfig.virtualtabs.args, actualWorkspaceRoot]
                    }
                },
                note: I18n.getMessage('mcp.tool.kiro.note')
            },
            claudeDesktop: {
                name: I18n.getMessage('mcp.tool.claudeDesktop.name'),
                description: I18n.getMessage('mcp.tool.claudeDesktop.description'),
                instruction: I18n.getMessage('mcp.tool.claudeDesktop.instruction'),
                config: {
                    ...baseConfig,
                    virtualtabs: {
                        ...baseConfig.virtualtabs,
                        args: [...baseConfig.virtualtabs.args, actualWorkspaceRoot]
                    }
                },
                note: I18n.getMessage('mcp.tool.claudeDesktop.note')
            },
            antigravity: {
                name: I18n.getMessage('mcp.tool.antigravity.name'),
                description: I18n.getMessage('mcp.tool.antigravity.description'),
                instruction: I18n.getMessage('mcp.tool.antigravity.instruction'),
                config: {
                    ...baseConfig,
                    virtualtabs: {
                        ...baseConfig.virtualtabs,
                        args: [...baseConfig.virtualtabs.args, actualWorkspaceRoot]
                    }
                }
            }
        };

        this._panel.webview.html = this._getHtmlForWebview(serverPath, toolConfigs, {
            title: I18n.getMessage('mcp.webview.title'),
            tipTitle: I18n.getMessage('mcp.webview.tipTitle'),
            tipBody: I18n.getMessage('mcp.webview.tipBody'),
            configTitle: I18n.getMessage('mcp.webview.configTitle'),
            skillTitle: I18n.getMessage('mcp.webview.skillTitle'),
            skillBody: I18n.getMessage('mcp.webview.skillBody'),
            concurrencyNote: I18n.getMessage('mcp.webview.concurrencyNote'),
            copyButton: I18n.getMessage('mcp.webview.copyButton'),
            copied: I18n.getMessage('mcp.webview.copied'),
        });

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'copyToClipboard':
                        vscode.env.clipboard.writeText(message.text);
                        vscode.window.showInformationMessage(I18n.getMessage('mcp.configCopied'));
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private _getHtmlForWebview(serverPath: string, toolConfigs: Record<string, ToolConfig>, i18n: {
        title: string; tipTitle: string; tipBody: string;
        configTitle: string; skillTitle: string; skillBody: string;
        concurrencyNote: string; copyButton: string; copied: string;
    }) {
        const toolsHtml = Object.entries(toolConfigs).map(([key, tool]) => {
            const configJson = { "mcpServers": tool.config };
            const configString = JSON.stringify(configJson, null, 2);
            const configId = `config-${key}`;
            
            return `
                <div class="tool-section">
                    <h3>${tool.name}</h3>
                    <p class="tool-description">${tool.description}</p>
                    <p class="tool-instruction"><strong>${tool.instruction}</strong></p>
                    ${tool.note ? `<p class="tool-note">${tool.note}</p>` : ''}
                    <div class="code-block">
                        <button class="copy-btn" onclick="copyConfig('${configId}', this)">${i18n.copyButton}</button>
                        <pre><code id="${configId}">${configString}</code></pre>
                    </div>
                </div>
            `;
        }).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${i18n.title}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
        }
        h2 {
            margin-top: 40px;
            color: var(--vscode-textPreformat-foreground);
        }
        h3 {
            border-bottom: none;
            margin-top: 24px;
            margin-bottom: 8px;
        }
        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 16px;
            border-radius: 6px;
            position: relative;
            margin: 16px 0;
            overflow-x: auto;
        }
        pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 13px;
        }
        .copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .copy-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .instructions {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 10px 16px;
            margin: 16px 0;
        }
        .tool-section {
            margin-bottom: 32px;
            padding: 16px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            background-color: var(--vscode-editor-background);
        }
        .tool-description {
            color: var(--vscode-descriptionForeground);
            margin: 4px 0;
            font-size: 13px;
        }
        .tool-instruction {
            margin: 8px 0;
            font-size: 13px;
        }
        .tool-note {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin: 8px 0;
            white-space: pre-wrap;
            padding: 8px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
        }
        .skill-section {
            background-color: var(--vscode-sideBar-background);
            padding: 24px;
            border-radius: 8px;
            border: 1px dashed var(--vscode-panel-border);
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${i18n.title}</h1>
        
        <div class="instructions">
            <p><strong>${i18n.tipTitle}</strong> ${i18n.tipBody}</p>
            <p style="margin-top: 8px;">${i18n.concurrencyNote}</p>
        </div>

        <h2>${i18n.configTitle}</h2>
        
        ${toolsHtml}

        <div class="skill-section">
            <h2>${i18n.skillTitle}</h2>
            <p>${i18n.skillBody}</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function copyConfig(configId, btn) {
            const code = document.getElementById(configId).innerText;
            vscode.postMessage({
                command: 'copyToClipboard',
                text: code
            });
            
            const originalText = btn.innerText;
            btn.innerText = '${i18n.copied}';
            setTimeout(() => {
                btn.innerText = originalText;
            }, 2000);
        }
    </script>
</body>
</html>`;
    }
}
