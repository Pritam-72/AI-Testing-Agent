import * as vscode from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Test Agent extension activated');

    // Command: Set API Key
    const setApiKeyCommand = vscode.commands.registerCommand('ai-test-agent.setApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your AI Test Agent API Key',
            password: true,
            placeHolder: 'ait_xxxxx...'
        });

        if (apiKey) {
            const config = vscode.workspace.getConfiguration('aiTestAgent');
            await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('API Key saved successfully!');
        }
    });

    // Command: Analyze File
    const analyzeCommand = vscode.commands.registerCommand('ai-test-agent.analyze', async (uri?: vscode.Uri) => {
        const editor = vscode.window.activeTextEditor;
        let filePath: string;
        let code: string;

        if (uri) {
            // Called from explorer context menu
            const document = await vscode.workspace.openTextDocument(uri);
            filePath = uri.fsPath;
            code = document.getText();
        } else if (editor) {
            // Called from editor context menu or command palette
            filePath = editor.document.uri.fsPath;
            code = editor.document.getText();
        } else {
            vscode.window.showErrorMessage('No file selected');
            return;
        }

        const config = vscode.workspace.getConfiguration('aiTestAgent');
        const apiKey = config.get<string>('apiKey');
        const apiUrl = config.get<string>('apiUrl') || 'http://localhost:3001';

        if (!apiKey) {
            const action = await vscode.window.showErrorMessage(
                'API Key not configured',
                'Set API Key'
            );
            if (action === 'Set API Key') {
                vscode.commands.executeCommand('ai-test-agent.setApiKey');
            }
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing code...',
            cancellable: false
        }, async () => {
            try {
                const response = await fetch(`${apiUrl}/api/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        code,
                        filename: filePath.split('/').pop()
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const result = await response.json() as any;

                // Show results in output channel
                const outputChannel = vscode.window.createOutputChannel('AI Test Agent');
                outputChannel.clear();
                outputChannel.appendLine(`📄 Analysis: ${result.filename}`);
                outputChannel.appendLine(`   Language: ${result.language}\n`);

                if (result.components?.length > 0) {
                    outputChannel.appendLine('🧩 Components:');
                    result.components.forEach((c: string) => outputChannel.appendLine(`   - ${c}`));
                    outputChannel.appendLine('');
                }

                if (result.functions?.length > 0) {
                    outputChannel.appendLine('⚡ Functions:');
                    result.functions.forEach((f: string) => outputChannel.appendLine(`   - ${f}`));
                    outputChannel.appendLine('');
                }

                if (result.eventHandlers?.length > 0) {
                    outputChannel.appendLine('🎯 Event Handlers:');
                    result.eventHandlers.forEach((h: string) => outputChannel.appendLine(`   - ${h}`));
                    outputChannel.appendLine('');
                }

                if (result.testSuggestions?.length > 0) {
                    outputChannel.appendLine('💡 Test Suggestions:');
                    result.testSuggestions.forEach((s: string, i: number) =>
                        outputChannel.appendLine(`   ${i + 1}. ${s}`)
                    );
                }

                outputChannel.show();
                vscode.window.showInformationMessage(`Found ${result.components?.length || 0} components, ${result.functions?.length || 0} functions`);

            } catch (error: any) {
                vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
            }
        });
    });

    // Command: Generate Tests
    const generateTestsCommand = vscode.commands.registerCommand('ai-test-agent.generateTests', async (uri?: vscode.Uri) => {
        const editor = vscode.window.activeTextEditor;
        let filePath: string;
        let code: string;

        if (uri) {
            const document = await vscode.workspace.openTextDocument(uri);
            filePath = uri.fsPath;
            code = document.getText();
        } else if (editor) {
            filePath = editor.document.uri.fsPath;
            code = editor.document.getText();
        } else {
            vscode.window.showErrorMessage('No file selected');
            return;
        }

        const config = vscode.workspace.getConfiguration('aiTestAgent');
        const apiKey = config.get<string>('apiKey');
        const apiUrl = config.get<string>('apiUrl') || 'http://localhost:3001';

        if (!apiKey) {
            const action = await vscode.window.showErrorMessage(
                'API Key not configured',
                'Set API Key'
            );
            if (action === 'Set API Key') {
                vscode.commands.executeCommand('ai-test-agent.setApiKey');
            }
            return;
        }

        // Ask for target URL if testing a frontend component
        const url = await vscode.window.showInputBox({
            prompt: 'Enter target URL for browser tests (optional)',
            placeHolder: 'https://example.com'
        });

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating tests...',
            cancellable: false
        }, async () => {
            try {
                const response = await fetch(`${apiUrl}/api/test/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        code,
                        filename: filePath.split('/').pop(),
                        url
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const result = await response.json() as any;

                vscode.window.showInformationMessage(
                    `Test generation queued! Run ID: ${result.runId}`,
                    'View in Dashboard'
                ).then(action => {
                    if (action === 'View in Dashboard') {
                        vscode.env.openExternal(vscode.Uri.parse(`${apiUrl.replace(':3001', ':3000')}/runs/${result.runId}`));
                    }
                });

            } catch (error: any) {
                vscode.window.showErrorMessage(`Test generation failed: ${error.message}`);
            }
        });
    });

    context.subscriptions.push(setApiKeyCommand, analyzeCommand, generateTestsCommand);
}

export function deactivate() { }
