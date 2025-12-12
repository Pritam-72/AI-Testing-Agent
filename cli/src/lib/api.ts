import fetch from 'node-fetch';
import { getApiKey, getApiUrl } from './config';

export async function apiRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
) {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();

    if (!apiKey) {
        throw new Error('API key not configured. Run: ai-tester config set-key <YOUR_KEY>');
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any).error || `API error: ${response.status}`);
    }

    return response.json();
}
