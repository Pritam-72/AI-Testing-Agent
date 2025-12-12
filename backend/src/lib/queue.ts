import { Queue } from 'bullmq';

const connection = {
    host: 'localhost',
    port: 6379,
};

export const runQueue = new Queue('test-runs', { connection });

export async function addTestRunJob(runId: string, url: string, prompt: string, credentials?: any) {
    await runQueue.add('test-run', {
        runId,
        url,
        prompt,
        credentials,
    });
}
