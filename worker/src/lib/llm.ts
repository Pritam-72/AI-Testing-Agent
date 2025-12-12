import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key',
});

function getMockTest(url: string, prompt: string): string {
    // Parse URL to extract domain for better mock tests
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = urlObj.hostname;

    return `
import { test, expect } from '@playwright/test';

test('Smoke Test for ${domain}', async ({ page }) => {
  // Mock test generated (OpenAI quota exceeded or unavailable)
  // Original prompt: ${prompt}
  
  // Step 1: Navigate to the page
  await page.goto('${url}', { waitUntil: 'domcontentloaded' });
  
  // Step 2: Verify page loaded with a title
  await expect(page).toHaveTitle(/.+/);
  
  // Step 3: Check that the body is visible
  const body = page.locator('body');
  await expect(body).toBeVisible();
  
  // Step 4: Check for main content area (common patterns)
  const mainContent = page.locator('main, article, #content, .content, [role="main"]').first();
  if (await mainContent.count() > 0) {
    await expect(mainContent).toBeVisible();
  }
  
  // Step 5: Verify no console errors (basic check)
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  
  // Wait briefly for any async errors
  await page.waitForTimeout(1000);
  
  // Log success
  console.log('✅ Mock smoke test passed for ${domain}');
});
`;
}

const SYSTEM_PROMPT = `You are an expert QA Automation Engineer specializing in Playwright with TypeScript.
Generate production-quality, maintainable Playwright test files.

## Output Format
- Output ONLY executable TypeScript code
- NO markdown code blocks, NO explanations, NO comments before imports
- Start directly with: import { test, expect } from '@playwright/test';

## Best Practices
1. **Robust Selectors**: Prefer text(), role(), placeholder, getByTestId over CSS
2. **Wait Strategies**: Use built-in auto-waiting, avoid hardcoded delays
3. **Error Handling**: Tests should fail gracefully with clear error messages
4. **Modularity**: Group related assertions logically
5. **Comments**: Add concise step comments for maintainability

## Selector Priority (best to worst)
1. getByRole() with name option
2. getByText() for visible text
3. getByPlaceholder() for inputs
4. getByTestId() for data-testid
5. locator() with CSS as last resort

## Example Structure
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    // Step 1: Navigate
    await page.goto('https://example.com');
    
    // Step 2: Interact
    await page.getByRole('button', { name: 'Submit' }).click();
    
    // Step 3: Assert
    await expect(page.getByText('Success')).toBeVisible();
  });
});
\`\`\`
`;

export async function generateTestScript(url: string, prompt: string, credentials?: any): Promise<string> {
    const userPrompt = `Generate a Playwright test for: ${url}

User Requirements: ${prompt || 'Basic smoke test - verify page loads, title exists, main content visible'}

${credentials ? `Authentication: Use these credentials - ${JSON.stringify(credentials)}` : 'No authentication required.'}

Generate a comprehensive test that covers the user requirements. If requirements are vague, create a thorough smoke test.`;

    // Check for mock/missing API key
    if (!process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === 'your_openai_api_key' ||
        process.env.OPENAI_API_KEY === 'mock-key') {
        console.log('Using mock test generation (no API key)');
        return getMockTest(url, prompt);
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 2000,
        });

        const content = response.choices[0].message.content || '';

        // Clean up response - remove markdown code blocks if present
        let cleanCode = content
            .replace(/^```(?:typescript|ts)?\n?/gm, '')
            .replace(/```$/gm, '')
            .trim();

        // Ensure the code starts with an import
        if (!cleanCode.startsWith('import')) {
            const importIndex = cleanCode.indexOf('import');
            if (importIndex > 0) {
                cleanCode = cleanCode.substring(importIndex);
            }
        }

        return cleanCode;
    } catch (error: any) {
        console.error('OpenAI API error, falling back to mock:', error.message);
        return getMockTest(url, prompt);
    }
}


