import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { authenticateApiKey } from '../lib/auth';
import { addTestRunJob } from '../lib/queue';

export default async function analyzeRoutes(fastify: FastifyInstance) {
    // Analyze code and detect testable elements
    fastify.post('/analyze', { preHandler: authenticateApiKey }, async (request, reply) => {
        const { code, filename, language } = request.body as {
            code: string;
            filename: string;
            language?: string;
        };

        if (!code || !filename) {
            return reply.code(400).send({ error: 'code and filename are required' });
        }

        // Simple pattern-based analysis (can be enhanced with AST parsing)
        const analysis = analyzeCode(code, language || detectLanguage(filename));

        return {
            filename,
            language: language || detectLanguage(filename),
            components: analysis.components,
            functions: analysis.functions,
            eventHandlers: analysis.eventHandlers,
            testSuggestions: analysis.testSuggestions,
        };
    });

    // Generate tests for analyzed code
    fastify.post('/test/generate', { preHandler: authenticateApiKey }, async (request, reply) => {
        const { code, filename, targetElement, url } = request.body as {
            code: string;
            filename: string;
            targetElement?: string;
            url?: string;
        };

        if (!code || !filename) {
            return reply.code(400).send({ error: 'code and filename are required' });
        }

        // Create a test run for the code
        const run = await prisma.testRun.create({
            data: {
                url: url || `file://${filename}`,
                prompt: `Analyze this code and generate comprehensive tests:\n\nFilename: ${filename}\n${targetElement ? `Target: ${targetElement}\n` : ''}\n\nCode:\n${code}`,
                status: 'QUEUED',
            },
        });

        // Queue the job
        await addTestRunJob(run.id, run.url, run.prompt);

        return {
            runId: run.id,
            status: 'QUEUED',
            message: 'Test generation started. Poll /api/runs/:id for status.',
        };
    });
}

function detectLanguage(filename: string): string {
    if (filename.endsWith('.tsx')) return 'tsx';
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.jsx')) return 'jsx';
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.vue')) return 'vue';
    if (filename.endsWith('.svelte')) return 'svelte';
    return 'unknown';
}

function analyzeCode(code: string, language: string) {
    const components: string[] = [];
    const functions: string[] = [];
    const eventHandlers: string[] = [];
    const testSuggestions: string[] = [];

    // Detect React components (function or arrow)
    const componentRegex = /(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/g;
    let match;
    while ((match = componentRegex.exec(code)) !== null) {
        components.push(match[1]);
        testSuggestions.push(`Test that ${match[1]} renders without crashing`);
    }

    // Detect event handlers
    const handlerRegex = /on(Click|Submit|Change|Focus|Blur|KeyDown|KeyUp|MouseEnter|MouseLeave)\s*=\s*\{([^}]+)\}/g;
    while ((match = handlerRegex.exec(code)) !== null) {
        eventHandlers.push(`on${match[1]}: ${match[2].trim()}`);
        testSuggestions.push(`Test ${match[1].toLowerCase()} handler ${match[2].trim()}`);
    }

    // Detect exported functions
    const funcRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z][a-zA-Z0-9]*)/g;
    while ((match = funcRegex.exec(code)) !== null) {
        if (!components.includes(match[1])) {
            functions.push(match[1]);
            testSuggestions.push(`Test function ${match[1]} with various inputs`);
        }
    }

    // Detect buttons
    const buttonRegex = /<button[^>]*>([^<]*)<\/button>/gi;
    while ((match = buttonRegex.exec(code)) !== null) {
        testSuggestions.push(`Test button "${match[1].trim() || 'unnamed'}" click behavior`);
    }

    return { components, functions, eventHandlers, testSuggestions };
}
