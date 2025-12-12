import { Command } from 'commander';
import chalk from 'chalk';
import { getApiKey, setApiKey, getApiUrl, setApiUrl, clearConfig } from '../lib/config';

export const configCommand = new Command('config')
    .description('Manage CLI configuration');

configCommand
    .command('set-key <key>')
    .description('Set the API key for authentication')
    .action((key: string) => {
        setApiKey(key);
        console.log(chalk.green('✓ API key saved successfully'));
    });

configCommand
    .command('set-url <url>')
    .description('Set the API server URL (default: http://localhost:3001)')
    .action((url: string) => {
        setApiUrl(url);
        console.log(chalk.green(`✓ API URL set to ${url}`));
    });

configCommand
    .command('show')
    .description('Show current configuration')
    .action(() => {
        const apiKey = getApiKey();
        const apiUrl = getApiUrl();

        console.log(chalk.bold('\nCurrent Configuration:\n'));
        console.log(`  API URL: ${chalk.cyan(apiUrl)}`);
        console.log(`  API Key: ${apiKey ? chalk.green(apiKey.substring(0, 8) + '...') : chalk.red('Not set')}`);
        console.log('');
    });

configCommand
    .command('clear')
    .description('Clear all configuration')
    .action(() => {
        clearConfig();
        console.log(chalk.yellow('Configuration cleared'));
    });
