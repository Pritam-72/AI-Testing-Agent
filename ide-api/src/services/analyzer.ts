import { AnalyzeRequest, AnalyzeResponse, Issue, Screenshot } from '../types';
import { crawler } from './crawler';
import { analyzeScreenshot, analyzeConsoleErrors, analyzeNetworkErrors } from './gemini';

type UpdateCallback = (update: Partial<AnalyzeResponse>) => void;

export async function runAnalysis(
    id: string,
    request: AnalyzeRequest,
    onUpdate: UpdateCallback
): Promise<void> {
    const { url, options, context } = request;
    const viewport = options?.viewports?.[0] || 'desktop';

    // Update status to running
    onUpdate({ status: 'running' });

    try {
        await crawler.init();

        const allIssues: Issue[] = [];
        const allScreenshots: Screenshot[] = [];

        // Step 1: Crawl the page
        const crawlResult = await crawler.crawlPage(url, viewport, (screenshot) => {
            allScreenshots.push(screenshot);
        });

        // Add console and network errors as issues
        const consoleIssues = await analyzeConsoleErrors(crawlResult.consoleErrors);
        const networkIssues = await analyzeNetworkErrors(crawlResult.networkErrors);
        allIssues.push(...consoleIssues, ...networkIssues);

        // Step 2: Test interactive elements
        const testResult = await crawler.testInteractiveElements(url, viewport, (screenshot) => {
            allScreenshots.push(screenshot);
        });

        // Add element test issues
        for (const issue of testResult.issues) {
            allIssues.push({
                id: `element-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                severity: 'warning',
                type: 'broken_button',
                element: issue.element,
                description: issue.error,
                screenshot: issue.screenshot?.url,
                suggestedFix: {
                    prompt: `Fix the issue with element "${issue.element}": ${issue.error}`
                }
            });
        }

        // Step 3: Analyze screenshots with Gemini (if API key available)
        if (process.env.GEMINI_API_KEY && allScreenshots.length > 0) {
            const geminiResult = await analyzeScreenshot(allScreenshots[0], context);
            allIssues.push(...geminiResult.issues);
        }

        // Calculate summary
        const summary = {
            totalElements: 0, // TODO: count from element tree
            testedElements: testResult.testedElements,
            issuesFound: allIssues.length,
            criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
            warnings: allIssues.filter(i => i.severity === 'warning').length,
            duration: Date.now() - new Date().getTime()
        };

        // Update with final result
        onUpdate({
            status: 'completed',
            summary,
            issues: allIssues,
            screenshots: allScreenshots,
            elementTree: crawlResult.elements,
            completedAt: new Date().toISOString()
        });

    } catch (error: any) {
        onUpdate({
            status: 'failed',
            error: error.message
        });
    } finally {
        await crawler.close();
    }
}
