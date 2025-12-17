import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { AnalyzeRequest, AnalyzeResponse, AnalysisStatus } from '../types';
import { runAnalysis } from '../services/analyzer';

// In-memory store for demo (use Redis in production)
const analysisStore = new Map<string, AnalyzeResponse>();

export async function analyzeRoutes(fastify: FastifyInstance) {

    // POST /analyze - Start a new analysis
    fastify.post<{ Body: AnalyzeRequest }>('/analyze', async (request, reply) => {
        const { url, options, context } = request.body;

        if (!url) {
            return reply.code(400).send({ error: 'URL is required' });
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return reply.code(400).send({ error: 'Invalid URL format' });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        // Create initial response
        const response: AnalyzeResponse = {
            id,
            status: 'queued',
            createdAt: now
        };

        analysisStore.set(id, response);

        // Start analysis in background
        runAnalysis(id, { url, options, context }, (update) => {
            const existing = analysisStore.get(id);
            if (existing) {
                analysisStore.set(id, { ...existing, ...update });
            }
        }).catch((err) => {
            const existing = analysisStore.get(id);
            if (existing) {
                analysisStore.set(id, {
                    ...existing,
                    status: 'failed',
                    error: err.message
                });
            }
        });

        return reply.code(202).send(response);
    });

    // GET /analyze/:id - Get analysis results
    fastify.get<{ Params: { id: string } }>('/analyze/:id', async (request, reply) => {
        const { id } = request.params;

        const result = analysisStore.get(id);

        if (!result) {
            return reply.code(404).send({ error: 'Analysis not found' });
        }

        return result;
    });

    // GET /analyze/:id/stream - SSE for real-time updates
    fastify.get<{ Params: { id: string } }>('/analyze/:id/stream', async (request, reply) => {
        const { id } = request.params;

        const result = analysisStore.get(id);
        if (!result) {
            return reply.code(404).send({ error: 'Analysis not found' });
        }

        reply.hijack();
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        let lastStatus: AnalysisStatus | null = null;
        let pollCount = 0;
        const maxPolls = 300;
        let isClosed = false;
        let interval: NodeJS.Timeout;

        const cleanup = () => {
            if (!isClosed) {
                isClosed = true;
                if (interval) clearInterval(interval);
                try { reply.raw.end(); } catch { }
            }
        };

        const sendUpdate = () => {
            if (isClosed) return;

            const current = analysisStore.get(id);
            if (!current) {
                reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: 'Not found' })}\n\n`);
                cleanup();
                return;
            }

            if (current.status !== lastStatus) {
                lastStatus = current.status;
                reply.raw.write(`event: update\ndata: ${JSON.stringify(current)}\n\n`);
            }

            pollCount++;
            if (current.status === 'completed' || current.status === 'failed' || pollCount >= maxPolls) {
                reply.raw.write(`event: complete\ndata: ${JSON.stringify(current)}\n\n`);
                cleanup();
            }
        };

        sendUpdate();
        if (!isClosed) {
            interval = setInterval(sendUpdate, 1000);
            request.raw.on('close', cleanup);
        }
    });
}
