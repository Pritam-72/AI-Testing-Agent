import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

/**
 * Recovery module for handling stalled and orphaned jobs
 * Runs on worker startup to clean up any jobs left in inconsistent state
 */

export async function recoverStalledJobs(
    prisma: PrismaClient,
    queue: Queue
): Promise<{ recovered: number; failed: number }> {
    console.log('🔄 Checking for stalled jobs...');

    let recovered = 0;
    let failed = 0;

    try {
        // 1. Find all jobs marked as RUNNING in the database
        const runningJobs = await prisma.testRun.findMany({
            where: { status: 'RUNNING' },
            select: { id: true, url: true, prompt: true, credentials: true, createdAt: true }
        });

        if (runningJobs.length === 0) {
            console.log('✅ No stalled RUNNING jobs found');
        } else {
            console.log(`⚠️ Found ${runningJobs.length} stalled RUNNING jobs`);

            for (const job of runningJobs) {
                // Check if the job exists in the Redis queue
                const queueJob = await queue.getJob(job.id);

                if (!queueJob) {
                    // Job doesn't exist in queue - it was lost
                    console.log(`  ❌ Job ${job.id.slice(0, 8)} lost - marking as FAILED`);

                    await prisma.testRun.update({
                        where: { id: job.id },
                        data: {
                            status: 'FAILED',
                            result: {
                                error: 'Worker was restarted while job was processing',
                                recoveredAt: new Date().toISOString()
                            }
                        }
                    });
                    failed++;
                } else {
                    // Job exists but was stalled - it will be retried by BullMQ
                    console.log(`  🔄 Job ${job.id.slice(0, 8)} exists in queue - will be retried`);
                    recovered++;
                }
            }
        }

        // 2. Find QUEUED jobs that are stuck (older than 5 minutes with no queue entry)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const queuedJobs = await prisma.testRun.findMany({
            where: {
                status: 'QUEUED',
                createdAt: { lt: fiveMinutesAgo }
            },
            select: { id: true, url: true, prompt: true, credentials: true }
        });

        if (queuedJobs.length > 0) {
            console.log(`⚠️ Found ${queuedJobs.length} stale QUEUED jobs`);

            for (const job of queuedJobs) {
                const queueJob = await queue.getJob(job.id);

                if (!queueJob) {
                    // Re-queue the job
                    console.log(`  🔄 Re-queuing job ${job.id.slice(0, 8)}`);

                    await queue.add('test-run', {
                        runId: job.id,
                        url: job.url,
                        prompt: job.prompt,
                        credentials: job.credentials
                    }, { jobId: job.id });

                    recovered++;
                }
            }
        }

        console.log(`\n📊 Recovery complete: ${recovered} recovered, ${failed} marked failed`);

    } catch (error) {
        console.error('❌ Error during job recovery:', error);
    }

    return { recovered, failed };
}

/**
 * Clean up old completed/failed jobs from the queue
 * Keeps the queue lean and prevents memory issues
 */
export async function cleanupOldJobs(queue: Queue): Promise<number> {
    try {
        const completed = await queue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // 24h old
        const failed = await queue.clean(7 * 24 * 60 * 60 * 1000, 100, 'failed');  // 7 days old

        const total = completed.length + failed.length;
        if (total > 0) {
            console.log(`🧹 Cleaned up ${total} old jobs from queue`);
        }
        return total;
    } catch (error) {
        console.error('Error cleaning up old jobs:', error);
        return 0;
    }
}
