import * as vscode from 'vscode';
import axios from 'axios';

// Configuration keys
const CONFIG_API_URL = 'aiTestingAgent.apiUrl';
const CONFIG_API_KEY = 'aiTestingAgent.apiKey';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Testing Agent extension is now active!');

    // Command: Test Webpage
    let testPageDisposable = vscode.commands.registerCommand('ai-testing-agent.testPage', async () => {
        const config = vscode.workspace.getConfiguration();
        const apiUrl = config.get<string>(CONFIG_API_URL, 'http://localhost:3002');
        const apiKey = config.get<string>(CONFIG_API_KEY, '');

        // Prompt for URL
        const url = await vscode.window.showInputBox({
            prompt: 'Enter the URL to test',
            placeHolder: 'http://localhost:3000',
            ignoreFocusOut: true
        });

        if (!url) return;

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Testing ${url}...`,
            cancellable: false
        }, async (progress) => {
            try {
                // Start analysis
                const startResponse = await axios.post(`${apiUrl}/api/v1/analyze`, {
                    url,
                    options: { testForms: true }
                }, {
                    headers: apiKey ? { 'x-api-key': apiKey } : {}
                });

                const analysisId = startResponse.data.id;
                progress.report({ message: 'Analysis started. Waiting for results...' });

                // Poll for results
                let attempts = 0;
                while (attempts < 60) {
                    await new Promise(r => setTimeout(r, 1000));

                    const resultResponse = await axios.get(`${apiUrl}/api/v1/analyze/${analysisId}`, {
                        headers: apiKey ? { 'x-api-key': apiKey } : {}
                    });

                    const status = resultResponse.data.status;

                    if (status === 'completed') {
                        const issues = resultResponse.data.issues || [];
                        vscode.window.showInformationMessage(`Analysis complete! Found ${issues.length} issues.`);

                        // Show issues in a new document
                        const doc = await vscode.workspace.openTextDocument({
                            content: JSON.stringify(resultResponse.data, null, 2),
                            language: 'json'
                        });
                        await vscode.window.showTextDocument(doc);
                        return;
                    } else if (status === 'failed') {
                        throw new Error(resultResponse.data.error || 'Analysis failed');
                    }

                    attempts++;
                }

                throw new Error('Analysis timed out');

            } catch (error: any) {
                vscode.window.showErrorMessage(`Error testing page: ${error.message}`);
                console.error(error);
            }
        });
    });

    // Command: Fix Issue (Placeholder)
    let fixIssueDisposable = vscode.commands.registerCommand('ai-testing-agent.fixIssue', async () => {
        vscode.window.showInformationMessage('This feature will automatically apply AI fixes to your code.');
    });

    context.subscriptions.push(testPageDisposable);
    context.subscriptions.push(fixIssueDisposable);
}

export function deactivate() { }
