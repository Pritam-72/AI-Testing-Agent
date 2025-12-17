import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { addTestRunJob } from '../lib/queue';
import { z } from 'zod';

const CreateRunSchema = z.object({
    url: z.string().url(),
    prompt: z.string(),
    credentials: z.any().optional(),
});

export default async function runRoutes(fastify: FastifyInstance) {
    fastify.post('/runs', async (request, reply) => {
        try {
            const body = CreateRunSchema.parse(request.body);

            const run = await prisma.testRun.create({
                data: {
                    url: body.url,
                    prompt: body.prompt,
                    credentials: body.credentials ?? {},
                    status: 'QUEUED',
                },
            });

            await addTestRunJob(run.id, run.url, run.prompt, run.credentials);

            return reply.send(run);
        } catch (error) {
            request.log.error(error);
            return reply.code(400).send({ error: 'Invalid request' });
        }
    });

    fastify.get('/runs/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const run = await prisma.testRun.findUnique({
            where: { id },
            include: { logs: true, artifacts: true },
        });

        if (!run) {
            return reply.code(404).send({ error: 'Run not found' });
        }

        return run;
    });

    fastify.get('/runs', async (request, reply) => {
        const runs = await prisma.testRun.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return runs;
    });

    // Server-Sent Events (SSE) endpoint for real-time status updates
    fastify.get('/runs/:id/stream', async (request, reply) => {
        const { id } = request.params as { id: string };

        // Check if run exists
        const runExists = await prisma.testRun.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!runExists) {
            return reply.code(404).send({ error: 'Run not found' });
        }

        // Hijack the response to prevent Fastify from sending automatic response
        reply.hijack();

        // Set SSE headers
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        });

        let lastStatus: string | null = null;
        let pollCount = 0;
        const maxPolls = 300; // 5 minutes max (300 * 1 second)
        let isClosed = false;
        let interval: ReturnType<typeof setInterval>;

        const cleanup = () => {
            if (!isClosed) {
                isClosed = true;
                if (interval) clearInterval(interval);
                try {
                    reply.raw.end();
                } catch (e) {
                    // Ignore errors when ending response
                }
            }
        };

        const sendUpdate = async () => {
            if (isClosed) return;

            try {
                const run = await prisma.testRun.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        status: true,
                        result: true,
                        updatedAt: true
                    }
                });

                if (!run) {
                    reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: 'Run not found' })}\n\n`);
                    cleanup();
                    return;
                }

                // Only send update if status changed
                if (run.status !== lastStatus) {
                    lastStatus = run.status;
                    reply.raw.write(`event: update\ndata: ${JSON.stringify(run)}\n\n`);
                }

                pollCount++;

                // Stop polling if job is complete or max polls reached
                if (run.status === 'COMPLETED' || run.status === 'FAILED' || pollCount >= maxPolls) {
                    reply.raw.write(`event: complete\ndata: ${JSON.stringify(run)}\n\n`);
                    cleanup();
                }
            } catch (error) {
                console.error('SSE error:', error);
                cleanup();
            }
        };

        // Send initial update immediately
        await sendUpdate();

        // Only start polling if not already closed (job not completed/failed)
        if (!isClosed) {
            interval = setInterval(sendUpdate, 1000);
            // Cleanup on client disconnect
            request.raw.on('close', cleanup);
        }
    });
}
