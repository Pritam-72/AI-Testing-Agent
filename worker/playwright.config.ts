import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './temp',
    fullyParallel: false,
    forbidOnly: false,
    retries: 0,
    workers: 1,
    reporter: 'json',
    use: {
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Use system Chrome
        launchOptions: {
            executablePath: '/usr/bin/google-chrome-stable',
        },
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    executablePath: '/usr/bin/google-chrome-stable',
                },
            },
        },
    ],
});
