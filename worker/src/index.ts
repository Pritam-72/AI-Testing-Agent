import { Worker, Queue } from 'bullmq';
import dotenv from 'dotenv';
import path from 'path';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

// Explicitly load .env from the worker directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Loaded env:', {
    DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
    REDIS_URL: process.env.REDIS_URL ? 'set' : 'not set',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'not set'
});

const prisma = new PrismaClient();

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

// Create queue reference for recovery
const runQueue = new Queue('test-runs', { connection: redisConnection });

console.log('Starting Test Worker...');

import { generateTestScript } from './lib/llm';
import { executeTest } from './lib/runner';
import { recoverStalledJobs, cleanupOldJobs } from './lib/recovery';

// Job processor function
const processJob = async (job: any) => {
    console.log('Processing job:', job.id);
    const { runId, url, prompt, credentials } = job.data;

    try {
        // Update status to RUNNING
        await prisma.testRun.update({
            where: { id: runId },
            data: { status: 'RUNNING' }
        });

        // 1. Generate Test
        console.log(`Generating test for ${url}...`);
        const testCode = await generateTestScript(url, prompt, credentials);

        // 2. Execute Test
        console.log(`Executing test...`);
        const result = await executeTest(runId, testCode);

        console.log('Execution result:', result.success ? 'SUCCESS' : 'FAILURE');

        // 3. Update database with result
        await prisma.testRun.update({
            where: { id: runId },
            data: {
                status: result.success ? 'COMPLETED' : 'FAILED',
                result: {
                    success: result.success,
                    output: result.output,
                    testCode: testCode,
                    artifacts: result.artifacts || {}
                }
            }
        });

        return { status: result.success ? 'COMPLETED' : 'FAILED', result };

    } catch (err: any) {
        console.error('Job failed:', err);

        // Update database with failure
        await prisma.testRun.update({
            where: { id: runId },
            data: {
                status: 'FAILED',
                result: { error: err.message }
            }
        });

        throw err;
    }
};

// Create worker with enhanced configuration for reliability
const worker = new Worker('test-runs', processJob, {
    connection: redisConnection,
    stalledInterval: 30000,  // Check for stalled jobs every 30 seconds
    lockDuration: 120000,    // Job lock timeout (2 minutes)
    maxStalledCount: 2,      // Retry stalled jobs up to 2 times
});

// Event handlers
worker.on('completed', job => {
    console.log(`✅ ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`❌ ${job?.id} has failed with ${err.message}`);
});

worker.on('stalled', (jobId) => {
    console.log(`⚠️ Job ${jobId} stalled - will be retried`);
});

worker.on('error', (err) => {
    console.error('Worker error:', err);
});

// Startup: Recover any stalled jobs from previous runs
(async () => {
    console.log('\n🚀 Worker starting up...');

    // Wait a moment for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Recover stalled jobs
    await recoverStalledJobs(prisma, runQueue);

    // Cleanup old completed jobs
    await cleanupOldJobs(runQueue);

    console.log('✅ Worker ready and listening for jobs\n');
})();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down worker gracefully...');
    await worker.close();
    await runQueue.close();
    await prisma.$disconnect();
    await redisConnection.quit();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    await worker.close();
    await runQueue.close();
    await prisma.$disconnect();
    await redisConnection.quit();
    process.exit(0);
});

