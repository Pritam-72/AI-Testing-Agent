// Analysis Request/Response Types

export interface AnalyzeRequest {
    url: string;
    options?: AnalyzeOptions;
    context?: AnalyzeContext;
}

export interface AnalyzeOptions {
    depth?: number;              // How deep to crawl (1 = current page only)
    testForms?: boolean;         // Test form submissions
    testResponsive?: boolean;    // Test different viewports
    viewports?: ViewportName[];  // Which viewports to test
    timeout?: number;            // Max time for analysis (ms)
    credentials?: {              // For authenticated pages
        username?: string;
        password?: string;
    };
}

export type ViewportName = 'mobile' | 'tablet' | 'desktop';

export interface AnalyzeContext {
    sourceCode?: string;         // Original code for better analysis
    framework?: string;          // nextjs, react, vue, etc.
    prompt?: string;             // Original prompt that generated this
}

export interface AnalyzeResponse {
    id: string;
    status: AnalysisStatus;
    summary?: AnalysisSummary;
    issues?: Issue[];
    screenshots?: Screenshot[];
    elementTree?: ElementNode;
    error?: string;
    createdAt: string;
    completedAt?: string;
}

export type AnalysisStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface AnalysisSummary {
    totalElements: number;
    testedElements: number;
    issuesFound: number;
    criticalIssues: number;
    warnings: number;
    duration: number;  // ms
}

export interface Issue {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    type: IssueType;
    element?: string;           // CSS selector or description
    screenshot?: string;        // URL to screenshot
    description: string;
    suggestedFix: SuggestedFix;
}

export type IssueType =
    | 'broken_button'
    | 'broken_link'
    | 'console_error'
    | 'network_error'
    | 'visual_bug'
    | 'accessibility'
    | 'form_error'
    | 'missing_element'
    | 'performance';

export interface SuggestedFix {
    prompt: string;             // Natural language fix for AI agent
    codeSnippet?: string;       // Optional code snippet
    lineNumber?: number;        // If we can identify the line
    file?: string;              // If we know which file
}

export interface Screenshot {
    id: string;
    url: string;
    viewport: ViewportName;
    timestamp: string;
    description?: string;
}

export interface ElementNode {
    tag: string;
    id?: string;
    classes?: string[];
    text?: string;
    interactable: boolean;
    tested: boolean;
    issues?: string[];          // Issue IDs
    children?: ElementNode[];
}

// Job Queue Types
export interface AnalysisJob {
    id: string;
    request: AnalyzeRequest;
    status: AnalysisStatus;
    result?: AnalyzeResponse;
    createdAt: Date;
    updatedAt: Date;
}

// Gemini Analysis Types
export interface GeminiAnalysisResult {
    issues: Issue[];
    summary: string;
}
