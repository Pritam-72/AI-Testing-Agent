/**
 * AI Testing Agent SDK Client
 * 
 * Use this client in IDE extensions to interact with the Testing API.
 */

import { AnalyzeRequest, AnalyzeResponse } from '../types';

export interface SDKConfig {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
}

export class TestingAgentClient {
    private baseUrl: string;
    private apiKey?: string;
    private timeout: number;

    constructor(config: SDKConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 60000;
    }

    private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options?.headers as Record<string, string>)
        };

        if (this.apiKey) {
            headers['x-api-key'] = this.apiKey;
        }

        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Start analyzing a webpage
     */
    async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
        return this.fetch<AnalyzeResponse>('/api/v1/analyze', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    /**
     * Get analysis results by ID
     */
    async getAnalysis(id: string): Promise<AnalyzeResponse> {
        return this.fetch<AnalyzeResponse>(`/api/v1/analyze/${id}`);
    }

    /**
     * Wait for analysis to complete
     */
    async waitForCompletion(id: string, pollInterval = 1000): Promise<AnalyzeResponse> {
        const startTime = Date.now();

        while (Date.now() - startTime < this.timeout) {
            const result = await this.getAnalysis(id);

            if (result.status === 'completed' || result.status === 'failed') {
                return result;
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error('Analysis timeout');
    }

    /**
     * Analyze and wait for results (convenience method)
     */
    async analyzeAndWait(request: AnalyzeRequest): Promise<AnalyzeResponse> {
        const initial = await this.analyze(request);
        return this.waitForCompletion(initial.id);
    }

    /**
     * Get fix prompts from issues
     */
    getFixPrompts(response: AnalyzeResponse): string[] {
        return (response.issues || []).map(issue => issue.suggestedFix.prompt);
    }

    /**
     * Health check
     */
    async health(): Promise<{ status: string }> {
        return this.fetch('/api/v1/health');
    }
}

// Export for CommonJS/ESM compatibility
export default TestingAgentClient;
