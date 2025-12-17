import Fastify from 'fastify';
import 'dotenv-flow/config';

import { analyzeRoutes } from './routes/analyze';
import { healthRoutes } from './routes/health';

const PORT = parseInt(process.env.PORT || '3002');
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
    const fastify = Fastify({
        logger: true
    });

    // Manual CORS headers (avoiding version mismatch with plugin)
    fastify.addHook('onRequest', async (request, reply) => {
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

        if (request.method === 'OPTIONS') {
            reply.status(204).send();
        }
    });

    // API Key authentication hook
    fastify.addHook('preHandler', async (request, reply) => {
        // Skip auth for health endpoint
        if (request.url === '/api/v1/health') {
            return;
        }

        const apiKey = request.headers['x-api-key'] as string;
        const validKey = process.env.API_SECRET_KEY;

        // In development, allow requests without API key
        if (process.env.NODE_ENV === 'development' && !validKey) {
            return;
        }

        if (validKey && apiKey !== validKey) {
            reply.code(401).send({ error: 'Invalid or missing API key' });
        }
    });

    // Register routes
    await fastify.register(healthRoutes, { prefix: '/api/v1' });
    await fastify.register(analyzeRoutes, { prefix: '/api/v1' });

    // Start server
    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`\n🚀 IDE Testing API running at http://${HOST}:${PORT}`);
        console.log(`📚 Endpoints:`);
        console.log(`   POST /api/v1/analyze     - Start webpage analysis`);
        console.log(`   GET  /api/v1/analyze/:id - Get analysis results`);
        console.log(`   GET  /api/v1/health      - Health check\n`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

main();
