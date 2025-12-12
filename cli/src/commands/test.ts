import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { apiRequest } from '../lib/api';
import { getApiUrl, getApiKey } from '../lib/config';

export const testCommand = new Command('test')
    .description('Generate and run tests for a code file')
    .argument('<file>', 'Path to the file to test')
    .option('-u, --url <url>', 'Target URL for browser tests')
    .option('-w, --watch', 'Watch for results (poll until complete)')
    .action(async (file: string, options: { url?: string; watch?: boolean }) => {
        const spinner = ora('Generating tests...').start();

        try {
            const filePath = path.resolve(file);

            if (!fs.existsSync(filePath)) {
                spinner.fail(`File not found: ${filePath}`);
                return;
            }

            const code = fs.readFileSync(filePath, 'utf-8');
            const filename = path.basename(filePath);

            const result = await apiRequest('/api/test/generate', 'POST', {
                code,
                filename,
                url: options.url,
            }) as any;

            spinner.succeed('Test generation queued!');

            console.log(chalk.bold(`\n🧪 Test Run Created`));
            console.log(`   Run ID: ${chalk.cyan(result.runId)}`);
            console.log(`   Status: ${chalk.yellow(result.status)}`);
            console.log('');

            if (options.watch) {
                await watchRun(result.runId);
            } else {
                console.log(chalk.gray(`To check status: ai-tester status ${result.runId}`));
                console.log(chalk.gray(`Or visit: ${getApiUrl()}/api/runs/${result.runId}`));
            }

        } catch (error: any) {
            spinner.fail(error.message);
        }
    });

async function watchRun(runId: string) {
    const spinner = ora('Waiting for results...').start();

    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (attempts < maxAttempts) {
        try {
            const apiKey = getApiKey();
            const apiUrl = getApiUrl();

            const response = await fetch(`${apiUrl}/api/runs/${runId}`, {
                headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
            });

            const run = await response.json() as any;

            if (run.status === 'COMPLETED') {
                spinner.succeed('Tests completed!');
                console.log(chalk.green.bold('\n✓ All tests passed'));
                if (run.result) {
                    console.log(chalk.gray(JSON.stringify(run.result, null, 2)));
                }
                return;
            }

            if (run.status === 'FAILED') {
                spinner.fail('Tests failed');
                console.log(chalk.red.bold('\n✗ Some tests failed'));
                if (run.result) {
                    console.log(chalk.gray(JSON.stringify(run.result, null, 2)));
                }
                return;
            }

            spinner.text = `Status: ${run.status} (attempt ${attempts + 1}/${maxAttempts})`;

        } catch (error) {
            // Ignore fetch errors, keep polling
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
    }

    spinner.warn('Timed out waiting for results');
}
