'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Types
interface TestResult {
    success?: boolean;
    testCode?: string;
    output?: string;
    artifacts?: Record<string, string>;
    error?: string;
}

interface TestRun {
    id: string;
    url: string;
    prompt: string;
    status: string;
    result?: TestResult;
    createdAt?: string;
    updatedAt?: string;
}

// Status Badge Component
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

export default function RunDetails({ params }: { params: Promise<{ id: string }> }) {
    const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);
    const [run, setRun] = useState<TestRun | null>(null);

    // Unwrap params promise
    useEffect(() => {
        params.then(setUnwrappedParams);
    }, [params]);

    // Subscribe to updates with SSE
    useEffect(() => {
        if (!unwrappedParams?.id) return;

        // Initial fetch
        const fetchData = async () => {
            try {
                const res = await fetch(`http://localhost:3001/api/runs/${unwrappedParams.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setRun(data);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();

        // SSE for real-time updates
        const eventSource = new EventSource(
            `http://localhost:3001/api/runs/${unwrappedParams.id}/stream`
        );

        eventSource.addEventListener('update', (event) => {
            const data = JSON.parse(event.data);
            setRun((prev) => (prev ? { ...prev, ...data } : data));
        });

        eventSource.addEventListener('complete', (event) => {
            const data = JSON.parse(event.data);
            setRun((prev) => (prev ? { ...prev, ...data } : data));
            eventSource.close();
        });

        eventSource.addEventListener('error', () => {
            eventSource.close();
            // Fallback to polling
            const interval = setInterval(fetchData, 2000);
            setTimeout(() => clearInterval(interval), 60000); // Stop after 1 min
        });

        return () => eventSource.close();
    }, [unwrappedParams]);

    if (!run) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <motion.div
                    className="text-[var(--foreground-muted)]"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <span className="text-2xl">◌</span> Loading...
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8" style={{ background: 'var(--background)' }}>
            <div className="max-w-4xl mx-auto">
                {/* Back Link */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[var(--accent-blue)] hover:text-[var(--accent-green)] transition-colors mb-6"
                    >
                        ← Back to Tests
                    </Link>
                </motion.div>

                {/* Header */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Test Run Details</h1>
                    <code className="text-[var(--foreground-muted)] text-sm font-mono">ID: {run.id}</code>
                </motion.div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Configuration Card */}
                    <motion.div
                        className="glass-card p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
                            ⚙️ Configuration
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <span className="text-[var(--foreground-muted)] text-sm">Target URL</span>
                                <div className="text-[var(--foreground)] font-medium mt-1 break-all">{run.url}</div>
                            </div>
                            <div>
                                <span className="text-[var(--foreground-muted)] text-sm">Status</span>
                                <div className="mt-1">
                                    <StatusBadge status={run.status} />
                                </div>
                            </div>
                            <div>
                                <span className="text-[var(--foreground-muted)] text-sm">Test Instructions</span>
                                <div className="text-[var(--foreground)] mt-1">{run.prompt}</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Card */}
                    <motion.div
                        className="glass-card p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
                            📊 Stats
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="run-card text-center">
                                <div className="text-2xl font-bold text-[var(--accent-green)]">
                                    {run.result?.success ? '✓' : run.status === 'RUNNING' ? '...' : '✕'}
                                </div>
                                <div className="text-[var(--foreground-muted)] text-sm mt-1">Result</div>
                            </div>
                            <div className="run-card text-center">
                                <div className="text-2xl font-bold text-[var(--accent-blue)]">
                                    {run.result?.artifacts ? Object.keys(run.result.artifacts).length : 0}
                                </div>
                                <div className="text-[var(--foreground-muted)] text-sm mt-1">Artifacts</div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Results Card */}
                <motion.div
                    className="glass-card p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
                        📋 Test Results
                    </h2>

                    {run.status === 'RUNNING' || run.status === 'QUEUED' ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <motion.div
                                className="text-4xl mb-4"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                                ◌
                            </motion.div>
                            <div className="text-[var(--foreground-muted)]">
                                {run.status === 'RUNNING' ? 'Test is running...' : 'Waiting in queue...'}
                            </div>
                        </div>
                    ) : (
                        <pre className="bg-[var(--background)] p-4 rounded-xl text-sm overflow-auto max-h-96 font-mono text-[var(--foreground-secondary)]">
                            {run.result ? JSON.stringify(run.result, null, 2) : 'No results yet'}
                        </pre>
                    )}
                </motion.div>

                {/* Generated Test Code */}
                {run.result?.testCode && (
                    <motion.div
                        className="glass-card p-6 mt-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
                            💻 Generated Test Code
                        </h2>
                        <pre className="bg-[var(--background)] p-4 rounded-xl text-sm overflow-auto max-h-96 font-mono text-[var(--accent-green)]">
                            {run.result.testCode}
                        </pre>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
