import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import prisma from '../lib/prisma';

// Generate a secure API key
function generateApiKey(): string {
    return `ait_${crypto.randomBytes(32).toString('hex')}`;
}

export default async function apiKeyRoutes(fastify: FastifyInstance) {
    // Generate new API key
    fastify.post('/keys', async (request, reply) => {
        const { name } = request.body as { name?: string };

        const key = generateApiKey();
        const apiKey = await prisma.apiKey.create({
            data: {
                key,
                name: name || 'Default Key',
            },
        });

        return reply.send({
            id: apiKey.id,
            key: apiKey.key, // Only show full key on creation
            name: apiKey.name,
            createdAt: apiKey.createdAt,
        });
    });

    // List all API keys (masked)
    fastify.get('/keys', async (request, reply) => {
        const keys = await prisma.apiKey.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                createdAt: true,
                lastUsed: true,
                key: true,
            },
        });

        // Mask the keys for security
        const maskedKeys = keys.map(k => ({
            ...k,
            key: k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 4),
        }));

        return maskedKeys;
    });

    // Revoke an API key
    fastify.delete('/keys/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        await prisma.apiKey.update({
            where: { id },
            data: { isActive: false },
        });

        return { success: true };
    });
}
