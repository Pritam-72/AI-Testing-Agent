import { chromium, Browser, Page, Locator } from 'playwright';
import { ElementNode, Screenshot, ViewportName } from '../types';

interface CrawlResult {
    elements: ElementNode;
    screenshots: Screenshot[];
    consoleErrors: string[];
    networkErrors: string[];
}

const VIEWPORTS: Record<ViewportName, { width: number; height: number }> = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 }
};

export class Crawler {
    private browser: Browser | null = null;

    async init() {
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async crawlPage(
        url: string,
        viewport: ViewportName = 'desktop',
        onScreenshot?: (screenshot: Screenshot) => void
    ): Promise<CrawlResult> {
        if (!this.browser) {
            await this.init();
        }

        const context = await this.browser!.newContext({
            viewport: VIEWPORTS[viewport]
        });
        const page = await context.newPage();

        const consoleErrors: string[] = [];
        const networkErrors: string[] = [];
        const screenshots: Screenshot[] = [];

        // Capture console errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Capture network errors
        page.on('requestfailed', (request) => {
            networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
        });

        try {
            // Navigate to page
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

            // Take initial screenshot
            const initialScreenshot = await this.captureScreenshot(page, viewport, 'Initial page load');
            screenshots.push(initialScreenshot);
            onScreenshot?.(initialScreenshot);

            // Build element tree
            const elements = await this.buildElementTree(page);

            await context.close();

            return {
                elements,
                screenshots,
                consoleErrors,
                networkErrors
            };
        } catch (error: any) {
            await context.close();
            throw new Error(`Failed to crawl ${url}: ${error.message}`);
        }
    }

    async testInteractiveElements(
        url: string,
        viewport: ViewportName = 'desktop',
        onScreenshot?: (screenshot: Screenshot) => void,
        onProgress?: (tested: number, total: number) => void
    ): Promise<{
        testedElements: number;
        issues: Array<{ element: string; error: string; screenshot?: Screenshot }>;
    }> {
        if (!this.browser) {
            await this.init();
        }

        const context = await this.browser!.newContext({
            viewport: VIEWPORTS[viewport]
        });
        const page = await context.newPage();

        const issues: Array<{ element: string; error: string; screenshot?: Screenshot }> = [];
        let testedElements = 0;

        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

            // Find all interactive elements
            const interactiveSelectors = [
                'button',
                'a[href]',
                'input[type="submit"]',
                '[role="button"]',
                '[onclick]'
            ];

            const allElements: Locator[] = [];
            for (const selector of interactiveSelectors) {
                const elements = await page.locator(selector).all();
                allElements.push(...elements.map(() => page.locator(selector)));
            }

            // Get unique visible elements
            const buttons = await page.locator('button:visible').all();
            const links = await page.locator('a[href]:visible').all();
            const total = buttons.length + links.length;

            onProgress?.(0, total);

            // Test buttons
            for (let i = 0; i < Math.min(buttons.length, 10); i++) {
                const button = buttons[i];
                try {
                    const text = await button.textContent() || `Button ${i}`;

                    // Check if button is enabled
                    const isDisabled = await button.isDisabled();
                    if (isDisabled) continue;

                    // Try to click
                    await button.click({ timeout: 3000 });
                    testedElements++;

                    // Wait for any navigation or state change
                    await page.waitForTimeout(500);

                } catch (error: any) {
                    const screenshot = await this.captureScreenshot(page, viewport, `Error on button ${i}`);
                    onScreenshot?.(screenshot);
                    issues.push({
                        element: `button:nth-of-type(${i + 1})`,
                        error: error.message,
                        screenshot
                    });
                }
                onProgress?.(testedElements, total);
            }

            // Test links (just check they're valid, don't navigate)
            for (let i = 0; i < Math.min(links.length, 10); i++) {
                const link = links[i];
                try {
                    const href = await link.getAttribute('href');
                    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                        // Check if link is broken
                        if (href.startsWith('/') || href.startsWith('http')) {
                            testedElements++;
                        }
                    }
                } catch (error: any) {
                    issues.push({
                        element: `a:nth-of-type(${i + 1})`,
                        error: error.message
                    });
                }
                onProgress?.(testedElements, total);
            }

            await context.close();

            return { testedElements, issues };
        } catch (error: any) {
            await context.close();
            throw error;
        }
    }

    private async captureScreenshot(page: Page, viewport: ViewportName, description: string): Promise<Screenshot> {
        const buffer = await page.screenshot({ fullPage: false });
        const base64 = buffer.toString('base64');

        return {
            id: `screenshot-${Date.now()}`,
            url: `data:image/png;base64,${base64}`,
            viewport,
            timestamp: new Date().toISOString(),
            description
        };
    }

    private async buildElementTree(page: Page): Promise<ElementNode> {
        return await page.evaluate(() => {
            function buildNode(element: Element): any {
                const tag = element.tagName.toLowerCase();
                const isInteractable = ['button', 'a', 'input', 'select', 'textarea'].includes(tag) ||
                    element.hasAttribute('onclick') ||
                    element.getAttribute('role') === 'button';

                const node: any = {
                    tag,
                    id: element.id || undefined,
                    classes: typeof element.className === 'string' && element.className
                        ? element.className.split(' ').filter(Boolean)
                        : undefined,
                    text: element.textContent?.trim().slice(0, 50) || undefined,
                    interactable: isInteractable,
                    tested: false
                };

                // Only include first 2 levels of children to avoid huge trees
                const children = Array.from(element.children)
                    .slice(0, 10)
                    .map(child => buildNode(child))
                    .filter(child => child.tag !== 'script' && child.tag !== 'style');

                if (children.length > 0) {
                    node.children = children;
                }

                return node;
            }

            return buildNode(document.body);
        });
    }
}

export const crawler = new Crawler();
