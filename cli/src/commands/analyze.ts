import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { apiRequest } from '../lib/api';

export const analyzeCommand = new Command('analyze')
    .description('Analyze a code file to detect testable elements')
    .argument('<file>', 'Path to the file to analyze')
    .action(async (file: string) => {
        const spinner = ora('Analyzing code...').start();

        try {
            const filePath = path.resolve(file);

            if (!fs.existsSync(filePath)) {
                spinner.fail(`File not found: ${filePath}`);
                return;
            }

            const code = fs.readFileSync(filePath, 'utf-8');
            const filename = path.basename(filePath);

            const result = await apiRequest('/api/analyze', 'POST', {
                code,
                filename,
            }) as any;

            spinner.succeed('Analysis complete!');

            console.log(chalk.bold(`\n📄 ${result.filename}`));
            console.log(chalk.gray(`   Language: ${result.language}\n`));

            if (result.components.length > 0) {
                console.log(chalk.blue.bold('🧩 Components:'));
                result.components.forEach((c: string) => console.log(`   - ${c}`));
                console.log('');
            }

            if (result.functions.length > 0) {
                console.log(chalk.magenta.bold('⚡ Functions:'));
                result.functions.forEach((f: string) => console.log(`   - ${f}`));
                console.log('');
            }

            if (result.eventHandlers.length > 0) {
                console.log(chalk.yellow.bold('🎯 Event Handlers:'));
                result.eventHandlers.forEach((h: string) => console.log(`   - ${h}`));
                console.log('');
            }

            if (result.testSuggestions.length > 0) {
                console.log(chalk.green.bold('💡 Test Suggestions:'));
                result.testSuggestions.forEach((s: string, i: number) =>
                    console.log(`   ${i + 1}. ${s}`)
                );
                console.log('');
            }

        } catch (error: any) {
            spinner.fail(error.message);
        }
    });
