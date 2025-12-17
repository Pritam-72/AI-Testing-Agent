import { GoogleGenerativeAI } from '@google/generative-ai';
import { Issue, Screenshot, GeminiAnalysisResult } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const ANALYSIS_PROMPT = `You are an expert QA engineer analyzing a webpage screenshot for issues.

Analyze the screenshot and identify any of the following issues:
1. **Visual Bugs**: Overlapping elements, misaligned content, broken layouts
2. **Accessibility Issues**: Poor contrast, missing labels, small touch targets
3. **Missing Elements**: Empty sections, broken images, placeholder text left in
4. **UI/UX Problems**: Confusing navigation, unclear CTAs, poor hierarchy

For each issue found, provide:
- severity: "critical", "warning", or "info"
- type: One of: visual_bug, accessibility, missing_element, broken_button, broken_link
- description: Clear explanation of the issue
- suggestedFix: A prompt that an AI coding assistant could use to fix this issue

Respond in JSON format:
{
  "issues": [
    {
      "severity": "critical|warning|info",
      "type": "visual_bug|accessibility|missing_element|...",
      "description": "Description of the issue",
      "suggestedFix": {
        "prompt": "Fix prompt for AI assistant",
        "codeSnippet": "Optional code snippet"
      }
    }
  ],
  "summary": "Overall assessment of the page"
}

If the page looks good with no issues, return:
{
  "issues": [],
  "summary": "Page looks good with no visible issues"
}`;

export async function analyzeScreenshot(
    screenshot: Screenshot,
    context?: { sourceCode?: string; framework?: string }
): Promise<GeminiAnalysisResult> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Build the prompt with context
        let prompt = ANALYSIS_PROMPT;
        if (context?.framework) {
            prompt += `\n\nThe page was built with: ${context.framework}`;
        }
        if (context?.sourceCode) {
            prompt += `\n\nRelevant source code:\n\`\`\`\n${context.sourceCode.slice(0, 2000)}\n\`\`\``;
        }

        // Extract base64 data from data URL
        const base64Data = screenshot.url.replace(/^data:image\/\w+;base64,/, '');

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: base64Data
                }
            }
        ]);

        const responseText = result.response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in Gemini response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Add IDs and screenshot references to issues
        const issues: Issue[] = (parsed.issues || []).map((issue: any, index: number) => ({
            id: `issue-${Date.now()}-${index}`,
            severity: issue.severity || 'info',
            type: issue.type || 'visual_bug',
            description: issue.description || '',
            screenshot: screenshot.url,
            suggestedFix: {
                prompt: issue.suggestedFix?.prompt || issue.description,
                codeSnippet: issue.suggestedFix?.codeSnippet
            }
        }));

        return {
            issues,
            summary: parsed.summary || 'Analysis complete'
        };
    } catch (error: any) {
        console.error('Gemini analysis failed:', error.message);

        // Return empty result on failure
        return {
            issues: [],
            summary: `Analysis failed: ${error.message}`
        };
    }
}

export async function analyzeConsoleErrors(errors: string[]): Promise<Issue[]> {
    if (errors.length === 0) return [];

    return errors.slice(0, 5).map((error, index) => ({
        id: `console-error-${Date.now()}-${index}`,
        severity: 'critical' as const,
        type: 'console_error' as const,
        description: `Console error: ${error}`,
        suggestedFix: {
            prompt: `Fix the following console error: "${error}". This error is preventing the page from functioning correctly.`
        }
    }));
}

export async function analyzeNetworkErrors(errors: string[]): Promise<Issue[]> {
    if (errors.length === 0) return [];

    return errors.slice(0, 5).map((error, index) => ({
        id: `network-error-${Date.now()}-${index}`,
        severity: 'warning' as const,
        type: 'network_error' as const,
        description: `Network request failed: ${error}`,
        suggestedFix: {
            prompt: `A network request is failing: "${error}". Check if the API endpoint exists and is correctly configured.`
        }
    }));
}
