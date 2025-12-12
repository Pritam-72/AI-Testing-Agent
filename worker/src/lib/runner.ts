import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import { uploadArtifact, ensureBucket } from './storage';

const execAsync = util.promisify(exec);

export interface TestResult {
    success: boolean;
    output: string;
    error?: string;
    artifacts?: {
        screenshot?: string;
        video?: string;
        trace?: string;
    };
}

export async function executeTest(jobId: string, testCode: string): Promise<TestResult> {
    try {
        // Ensure MinIO bucket exists
        await ensureBucket();

        const testDir = path.join(__dirname, '../../temp', jobId);
        await fs.mkdir(testDir, { recursive: true });

        const testFile = path.join(testDir, 'test.spec.ts');
        await fs.writeFile(testFile, testCode);

        // Run Playwright with screenshots and video
        const command = `npx playwright test ${testFile} --reporter=json --output=${testDir}/results`;
        console.log(`Executing: ${command}`);

        let stdout = '';
        let stderr = '';
        let success = true;

        try {
            const result = await execAsync(command, {
                cwd: path.join(__dirname, '../../'),
                env: { ...process.env, PWTEST_SKIP_TEST_OUTPUT: '1' }
            });
            stdout = result.stdout;
            stderr = result.stderr;
        } catch (error: any) {
            stdout = error.stdout || '';
            stderr = error.stderr || error.message;
            success = false;
        }

        // Look for artifacts and upload to MinIO
        const artifacts: TestResult['artifacts'] = {};

        try {
            const resultsDir = path.join(testDir, 'results');
            const files = await fs.readdir(resultsDir).catch(() => []);

            for (const file of files) {
                const filePath = path.join(resultsDir, file);
                if (file.endsWith('.png')) {
                    artifacts.screenshot = await uploadArtifact(jobId, file, filePath);
                } else if (file.endsWith('.webm')) {
                    artifacts.video = await uploadArtifact(jobId, file, filePath);
                } else if (file.endsWith('.zip')) {
                    artifacts.trace = await uploadArtifact(jobId, file, filePath);
                }
            }
        } catch (artifactError) {
            console.log('No artifacts to upload or upload failed:', artifactError);
        }

        return { success, output: stdout, error: stderr, artifacts };
    } catch (error: any) {
        return {
            success: false,
            output: '',
            error: error.message
        };
    }
}

