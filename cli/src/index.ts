#!/usr/bin/env node

import { Command } from 'commander';
import { configCommand } from './commands/config';
import { analyzeCommand } from './commands/analyze';
import { testCommand } from './commands/test';

const program = new Command();

program
    .name('ai-tester')
    .description('AI-powered testing agent CLI - integrates with any code editor')
    .version('1.0.0');

program.addCommand(configCommand);
program.addCommand(analyzeCommand);
program.addCommand(testCommand);

program.parse();
