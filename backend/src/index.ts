import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

dotenv.config();

const server = fastify({ logger: true });

server.register(cors, {
    origin: '*',
});

server.get('/', async (request, reply) => {
    return { status: 'ok', service: 'ai-testing-backend' };
});


server.register(import('./routes/runs'), { prefix: '/api' });
server.register(import('./routes/keys'), { prefix: '/api' });
server.register(import('./routes/analyze'), { prefix: '/api' });

const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3001');
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening at http://0.0.0.0:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
