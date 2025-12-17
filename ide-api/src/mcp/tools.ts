/**
 * MCP Tool Definition for IDE Integration
 * 
 * This file defines the MCP (Model Context Protocol) tools that can be used
 * by AI agents in IDEs like VS Code, Cursor, and Antigravity to test webpages.
 */

export interface MCPToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description: string;
            required?: boolean;
            default?: any;
        }>;
        required?: string[];
    };
}

// Tool definitions for MCP servers
export const MCP_TOOLS: MCPToolDefinition[] = [
    {
        name: 'test_webpage',
        description: 'Automatically test a generated webpage for issues. Navigates to the URL, tests all interactive elements (buttons, links, forms), captures screenshots of issues, and returns AI-generated fix suggestions.',
        parameters: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The URL of the webpage to test (e.g., http://localhost:3000)'
                },
                depth: {
                    type: 'number',
                    description: 'How many levels of links to follow (1 = current page only)',
                    default: 1
                },
                testForms: {
                    type: 'boolean',
                    description: 'Whether to test form submissions',
                    default: true
                },
                testResponsive: {
                    type: 'boolean',
                    description: 'Whether to test mobile and tablet viewports',
                    default: false
                }
            },
            required: ['url']
        }
    },
    {
        name: 'get_webpage_issues',
        description: 'Get the list of issues found during webpage testing, with AI-generated fix suggestions for each issue.',
        parameters: {
            type: 'object',
            properties: {
                analysisId: {
                    type: 'string',
                    description: 'The analysis ID returned from test_webpage'
                }
            },
            required: ['analysisId']
        }
    },
    {
        name: 'capture_screenshot',
        description: 'Capture a screenshot of a webpage at a specific URL for visual inspection.',
        parameters: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The URL to capture'
                },
                viewport: {
                    type: 'string',
                    description: 'Viewport size: mobile, tablet, or desktop',
                    default: 'desktop'
                },
                fullPage: {
                    type: 'boolean',
                    description: 'Capture full page or just viewport',
                    default: false
                }
            },
            required: ['url']
        }
    },
    {
        name: 'analyze_screenshot',
        description: 'Analyze a screenshot using Gemini Vision AI to detect visual issues, accessibility problems, and UI bugs.',
        parameters: {
            type: 'object',
            properties: {
                screenshotPath: {
                    type: 'string',
                    description: 'Path to the screenshot file or base64 data URL'
                },
                context: {
                    type: 'string',
                    description: 'Optional context about what the page should look like'
                }
            },
            required: ['screenshotPath']
        }
    }
];

// MCP Server configuration for VS Code / Cursor / Windsurf
export const MCP_SERVER_CONFIG = {
    name: 'ai-testing-agent',
    version: '1.0.0',
    description: 'AI-powered webpage testing agent that finds issues and suggests fixes',
    tools: MCP_TOOLS.map(t => t.name),
    transport: {
        type: 'http',
        baseUrl: 'http://localhost:3002',
        endpoints: {
            test_webpage: 'POST /api/v1/analyze',
            get_webpage_issues: 'GET /api/v1/analyze/:analysisId',
            capture_screenshot: 'POST /api/v1/screenshot',
            analyze_screenshot: 'POST /api/v1/analyze-screenshot'
        }
    }
};

// Example usage in IDE extension
export const EXAMPLE_USAGE = `
// In your IDE extension or AI agent:

// 1. After generating a webpage, test it:
const result = await mcp.callTool('test_webpage', {
    url: 'http://localhost:3000',
    testForms: true
});

// 2. Get the issues with fix suggestions:
const issues = await mcp.callTool('get_webpage_issues', {
    analysisId: result.id
});

// 3. Apply fixes automatically:
for (const issue of issues) {
    console.log('Issue:', issue.description);
    console.log('Fix:', issue.suggestedFix.prompt);
    // Pass the fix prompt to your AI coding assistant
}
`;

export default MCP_TOOLS;
