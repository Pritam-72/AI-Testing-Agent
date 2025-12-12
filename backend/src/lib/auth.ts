import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from './prisma';

export async function authenticateApiKey(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing or invalid API key' });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    const key = await prisma.apiKey.findUnique({
        where: { key: apiKey },
    });

    if (!key || !key.isActive) {
        return reply.code(401).send({ error: 'Invalid or revoked API key' });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsed: new Date() },
    });

    // Attach key info to request for later use
    (request as any).apiKey = key;
}
