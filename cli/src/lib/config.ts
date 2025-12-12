import Conf from 'conf';

interface Config {
    apiKey?: string;
    apiUrl: string;
}

const config = new Conf<Config>({
    projectName: 'ai-tester',
    defaults: {
        apiUrl: 'http://localhost:3001',
    },
});

export function getApiKey(): string | undefined {
    return config.get('apiKey');
}

export function setApiKey(key: string): void {
    config.set('apiKey', key);
}

export function getApiUrl(): string {
    return config.get('apiUrl');
}

export function setApiUrl(url: string): void {
    config.set('apiUrl', url);
}

export function clearConfig(): void {
    config.clear();
}
