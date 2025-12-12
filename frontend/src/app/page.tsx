'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface TestRun {
    id: string;
    url: string;
    prompt: string;
    status: string;
}

interface ApiKey {
    id: string;
    name: string;
    key: string;
}

// Status Badge Component with animation
function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { class: string; icon: string }> = {
        COMPLETED: { class: 'status-completed', icon: '✓' },
        FAILED: { class: 'status-failed', icon: '✕' },
        RUNNING: { class: 'status-running', icon: '◉' },
        QUEUED: { class: 'status-queued', icon: '◎' },
    };

    const config = statusConfig[status] || statusConfig.QUEUED;

    return (
        <motion.span
            className={`status-badge ${config.class}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            <span>{config.icon}</span>
            {status}
        </motion.span>
    );
}

// Test Run Card Component
function TestRunCard({ run, index }: { run: TestRun; index: number }) {
    return (
        <motion.div
            className="run-card flex justify-between items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
        >
            <div className="flex-1 min-w-0">
                <div className="text-[var(--foreground)] font-medium truncate">{run.url}</div>
                <div className="text-[var(--foreground-muted)] text-sm truncate mt-1">{run.prompt}</div>
            </div>
            <div className="flex items-center gap-4 ml-4">
                <StatusBadge status={run.status} />
                <Link
                    href={`/runs/${run.id}`}
                    className="text-[var(--accent-blue)] hover:text-[var(--accent-green)] text-sm font-medium transition-colors"
                >
                    View →
                </Link>
            </div>
        </motion.div>
    );
}

export default function Home() {
    const [runs, setRuns] = useState<TestRun[]>([]);
    const [url, setUrl] = useState('');
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKey, setNewKey] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'runs' | 'keys'>('runs');

    useEffect(() => {
        fetchRuns();
        fetchApiKeys();
    }, []);

    const fetchRuns = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/runs');
            if (res.ok) {
                const data = await res.json();
                setRuns(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchApiKeys = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/keys');
            if (res.ok) {
                const data = await res.json();
                setApiKeys(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const startRun = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, prompt }),
            });
            if (res.ok) {
                const newRun = await res.json();
                await fetchRuns();
                setUrl('');
                setPrompt('');

                // Subscribe to real-time updates for this run
                const eventSource = new EventSource(
                    `http://localhost:3001/api/runs/${newRun.id}/stream`
                );

                eventSource.addEventListener('update', () => {
                    fetchRuns();
                });

                eventSource.addEventListener('complete', () => {
                    fetchRuns();
                    eventSource.close();
                });

                eventSource.addEventListener('error', () => {
                    eventSource.close();
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createApiKey = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3001/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName }),
            });
            if (res.ok) {
                const data = await res.json();
                setNewKey(data.key);
                setNewKeyName('');
                await fetchApiKeys();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const revokeApiKey = async (id: string) => {
        try {
            await fetch(`http://localhost:3001/api/keys/${id}`, { method: 'DELETE' });
            await fetchApiKeys();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen p-8" style={{ background: 'var(--background)' }}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-4xl font-bold gradient-text mb-2">AI Test Agent</h1>
                    <p className="text-[var(--foreground-secondary)]">
                        AI-powered end-to-end testing automation
                    </p>
                </motion.div>

                {/* Tab Navigation */}
                <motion.div
                    className="flex gap-2 mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    {['runs', 'keys'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as 'runs' | 'keys')}
                            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === tab
                                ? 'bg-[var(--accent-green)] text-white'
                                : 'bg-[var(--background-card)] text-[var(--foreground-secondary)] hover:bg-[var(--background-elevated)]'
                                }`}
                        >
                            {tab === 'runs' ? '🧪 Test Runs' : '🔑 API Keys'}
                        </button>
                    ))}
                </motion.div>

                <AnimatePresence mode="wait">
                    {activeTab === 'runs' && (
                        <motion.div
                            key="runs"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            {/* New Test Run Form */}
                            <div className="glass-card p-6 mb-6">
                                <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
                                    ✨ New Test Run
                                </h2>
                                <form onSubmit={startRun} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                                            Target URL
                                        </label>
                                        <input
                                            type="url"
                                            required
                                            className="input-field"
                                            placeholder="https://example.com"
                                            value={url}
                                            onChange={e => setUrl(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
                                            Test Instructions
                                        </label>
                                        <textarea
                                            className="input-field min-h-[100px] resize-none"
                                            placeholder="E.g., Log in and verify the dashboard loads..."
                                            value={prompt}
                                            onChange={e => setPrompt(e.target.value)}
                                        />
                                    </div>
                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary w-full"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <motion.span
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                >
                                                    ◌
                                                </motion.span>
                                                Running...
                                            </span>
                                        ) : (
                                            '🚀 Start Test Run'
                                        )}
                                    </motion.button>
                                </form>
                            </div>

                            {/* Recent Runs */}
                            <div className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
                                    📋 Recent Runs
                                </h2>
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {runs.map((run, index) => (
                                            <TestRunCard key={run.id} run={run} index={index} />
                                        ))}
                                    </AnimatePresence>
                                    {runs.length === 0 && (
                                        <motion.div
                                            className="text-[var(--foreground-muted)] text-center py-8"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            No test runs yet. Create your first test above! ☝️
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'keys' && (
                        <motion.div
                            key="keys"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            {/* Generate API Key */}
                            <div className="glass-card p-6 mb-6">
                                <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">
                                    🔑 Generate API Key
                                </h2>
                                <p className="text-[var(--foreground-muted)] mb-4 text-sm">
                                    Use API keys to integrate with your code editor (VS Code, Cursor, etc.)
                                </p>
                                <form onSubmit={createApiKey} className="flex gap-3">
                                    <input
                                        type="text"
                                        className="input-field flex-1"
                                        placeholder="Key name (e.g., 'VS Code')"
                                        value={newKeyName}
                                        onChange={e => setNewKeyName(e.target.value)}
                                    />
                                    <motion.button
                                        type="submit"
                                        className="btn-primary whitespace-nowrap"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Generate
                                    </motion.button>
                                </form>

                                {newKey && (
                                    <motion.div
                                        className="mt-4 p-4 rounded-xl bg-[var(--accent-green-glow)] border border-[var(--accent-green)]"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <p className="text-sm text-[var(--accent-green)] font-medium mb-2">
                                            🔐 Your new API key (copy it now, it won&apos;t be shown again):
                                        </p>
                                        <code className="block p-3 bg-[var(--background)] rounded-lg text-sm break-all font-mono text-[var(--foreground)]">
                                            {newKey}
                                        </code>
                                    </motion.div>
                                )}
                            </div>

                            {/* API Keys List */}
                            <div className="glass-card p-6">
                                <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
                                    📋 Your API Keys
                                </h2>
                                <div className="space-y-3">
                                    {apiKeys.map((key, index) => (
                                        <motion.div
                                            key={key.id}
                                            className="run-card flex justify-between items-center"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <div>
                                                <div className="text-[var(--foreground)] font-medium">{key.name}</div>
                                                <code className="text-sm text-[var(--foreground-muted)] font-mono">{key.key}</code>
                                            </div>
                                            <button
                                                onClick={() => revokeApiKey(key.id)}
                                                className="text-[var(--accent-red)] hover:bg-[var(--accent-red-glow)] px-3 py-1.5 rounded-lg text-sm transition-colors"
                                            >
                                                Revoke
                                            </button>
                                        </motion.div>
                                    ))}
                                    {apiKeys.length === 0 && (
                                        <div className="text-[var(--foreground-muted)] text-center py-8">
                                            No API keys yet. Generate one above!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CLI Usage Guide */}
                            <motion.div
                                className="glass-card p-6 mt-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h3 className="text-lg font-semibold text-[var(--accent-blue)] mb-3">
                                    💻 CLI Usage
                                </h3>
                                <pre className="bg-[var(--background)] p-4 rounded-xl text-sm overflow-x-auto text-[var(--foreground-secondary)]">
                                    {`# Install CLI globally
npm install -g @ai-tester/cli

# Configure your API key
ai-tester config set-key YOUR_API_KEY

# Analyze a code file
ai-tester analyze ./src/components/Button.tsx

# Generate tests for a file
ai-tester test ./src/components/Button.tsx --watch`}
                                </pre>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
