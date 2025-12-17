'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useScroll, useVelocity } from 'framer-motion';

// Dynamically import Three.js background to avoid SSR issues
const ThreeBackground = dynamic(() => import('./components/ThreeBackground'), {
    ssr: false,
    loading: () => null
});

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

// Animated Icon Components
function RocketIcon() {
    return (
        <motion.svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            suppressHydrationWarning
        >
            <path d="M12 2L8 8H16L12 2Z" fill="url(#grad1)" />
            <path d="M8 8L6 18H18L16 8H8Z" fill="url(#grad2)" />
            <circle cx="12" cy="13" r="2" fill="#030305" />
            <path d="M6 18L4 22H8L6 18Z" fill="#22c55e" />
            <path d="M18 18L20 22H16L18 18Z" fill="#22c55e" />
            <defs suppressHydrationWarning>
                <linearGradient id="grad1" x1="8" y1="2" x2="16" y2="8" suppressHydrationWarning>
                    <stop stopColor="#22c55e" suppressHydrationWarning />
                    <stop offset="1" stopColor="#3b82f6" suppressHydrationWarning />
                </linearGradient>
                <linearGradient id="grad2" x1="6" y1="8" x2="18" y2="18" suppressHydrationWarning>
                    <stop stopColor="#3b82f6" suppressHydrationWarning />
                    <stop offset="1" stopColor="#a855f7" suppressHydrationWarning />
                </linearGradient>
            </defs>
        </motion.svg>
    );
}

function BrainIcon() {
    return (
        <motion.svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            suppressHydrationWarning
        >
            <path d="M12 4C8 4 5 7 5 11C5 15 8 18 12 18C16 18 19 15 19 11C19 7 16 4 12 4Z" stroke="url(#brainGrad)" strokeWidth="2" fill="none" />
            <path d="M9 8C9 8 10 10 12 10C14 10 15 8 15 8" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 14C9 14 10 12 12 12C14 12 15 14 15 14" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
            <defs suppressHydrationWarning>
                <linearGradient id="brainGrad" x1="5" y1="4" x2="19" y2="18" suppressHydrationWarning>
                    <stop stopColor="#22c55e" suppressHydrationWarning />
                    <stop offset="0.5" stopColor="#3b82f6" suppressHydrationWarning />
                    <stop offset="1" stopColor="#a855f7" suppressHydrationWarning />
                </linearGradient>
            </defs>
        </motion.svg>
    );
}

function ChartIcon() {
    return (
        <motion.svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
        >
            <motion.rect
                x="4" y="14" width="4" height="6" rx="1" fill="#22c55e"
                animate={{ height: [6, 8, 6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.rect
                x="10" y="10" width="4" height="10" rx="1" fill="#3b82f6"
                animate={{ height: [10, 12, 10] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.rect
                x="16" y="6" width="4" height="14" rx="1" fill="#a855f7"
                animate={{ height: [14, 16, 14] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
        </motion.svg>
    );
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

// Test Run Card Component
function TestRunCard({ run, index }: { run: TestRun; index: number }) {
    return (
        <motion.div
            className="run-card flex justify-between items-center"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.02, x: 4 }}
        >
            <div className="flex-1 min-w-0">
                <div className="text-[var(--foreground)] font-semibold truncate">{run.url}</div>
                <div className="text-[var(--foreground-muted)] text-sm truncate mt-1">{run.prompt}</div>
            </div>
            <div className="flex items-center gap-4 ml-4">
                <StatusBadge status={run.status} />
                <Link
                    href={`/runs/${run.id}`}
                    className="text-[var(--accent-green)] hover:text-[var(--accent-blue)] text-sm font-semibold transition-all hover:translate-x-1"
                >
                    View →
                </Link>
            </div>
        </motion.div>
    );
}

// StepCard Component with Tilt
function StepCard({ number, title, description, icon, delay }: {
    number: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    delay: number;
}) {
    return (
        <TiltCard delay={delay}>
            <div className="step-card h-full">
                <div className="step-number">{number}</div>
                <div className="mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">{title}</h3>
                <p className="text-[var(--foreground-muted)] text-sm leading-relaxed">{description}</p>
            </div>
        </TiltCard>
    );
}

// Feature Card Component with Tilt
function FeatureCard({ icon, title, description, delay }: {
    icon: string;
    title: string;
    description: string;
    delay: number;
}) {
    return (
        <TiltCard delay={delay}>
            <div className="feature-card h-full">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">{title}</h3>
                <p className="text-[var(--foreground-muted)] text-sm leading-relaxed">{description}</p>
            </div>
        </TiltCard>
    );
}

// Animated Counter Component
function AnimatedCounter({ value, suffix = '', duration = 2 }: { value: number; suffix?: string; duration?: number }) {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        if (!hasStarted) return;

        let startTime: number;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            setCount(Math.floor(progress * value));
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }, [hasStarted, value, duration]);

    return (
        <motion.span
            onViewportEnter={() => setHasStarted(true)}
            className="tabular-nums"
        >
            {count.toLocaleString()}{suffix}
        </motion.span>
    );
}

// Stat Card Component
function StatCard({ icon, value, label, suffix, delay }: {
    icon: string;
    value: number;
    label: string;
    suffix?: string;
    delay: number;
}) {
    return (
        <motion.div
            className="text-center p-6 rounded-2xl bg-gradient-to-b from-[var(--background-elevated)] to-transparent border border-[var(--border-default)]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.05, borderColor: 'var(--accent-green)' }}
        >
            <div className="text-3xl mb-3">{icon}</div>
            <div className="text-4xl font-black gradient-text mb-2">
                <AnimatedCounter value={value} suffix={suffix} />
            </div>
            <div className="text-[var(--foreground-secondary)] text-sm">{label}</div>
        </motion.div>
    );
}

// Magnetic Button Component (Polymorphic)
function MagneticButton({ children, onClick, href, className = "", disabled = false }: any) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - left - width / 2);
        y.set(e.clientY - top - height / 2);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const style = { x: mouseX, y: mouseY };
    const props = {
        className,
        onClick,
        disabled,
        onMouseMove: handleMouseMove,
        onMouseLeave: handleMouseLeave,
        style,
        whileTap: { scale: 0.9 }
    };

    if (href) {
        return (
            <motion.a href={href} {...props}>
                {children}
            </motion.a>
        );
    }

    return (
        <motion.button {...props}>
            {children}
        </motion.button>
    );
}

// Scroll Velocity Component
function ScrollVelocitySkew({ children }: { children: React.ReactNode }) {
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);
    const skew = useTransform(scrollVelocity, [-1000, 1000], [-10, 10]);
    const springSkew = useSpring(skew, { stiffness: 400, damping: 90 });

    return (
        <motion.div style={{ skewX: springSkew }}>
            {children}
        </motion.div>
    );
}

// Scramble Text Component
function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
    const [display, setDisplay] = useState(text);
    const chars = "!@#$%^&*()_+-=[]{}|;':,./<>?";

    useEffect(() => {
        let interval: any;
        let iteration = 0;

        const scramble = () => {
            interval = setInterval(() => {
                setDisplay(
                    text
                        .split("")
                        .map((letter, index) => {
                            if (index < iteration) return text[index];
                            return chars[Math.floor(Math.random() * chars.length)];
                        })
                        .join("")
                );

                if (iteration >= text.length) clearInterval(interval);
                iteration += 1 / 3;
            }, 30);
        };

        scramble();
        return () => clearInterval(interval);
    }, [text]);

    return <span className={className}>{display}</span>;
}

// 3D Tilt Card Component
function TiltCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 50 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 50 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay, type: 'spring', stiffness: 100, damping: 20 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="perspective-1000 relative"
        >
            <div style={{ transform: "translateZ(30px)" }}>
                {children}
            </div>
        </motion.div>
    );
}

// Glitch Text Component
function GlitchText({ text }: { text: string }) {
    return (
        <div className="relative inline-block font-black text-6xl md:text-8xl mb-6">
            <motion.span
                className="relative z-10 gradient-text block"
                animate={{
                    textShadow: [
                        "2px 2px #ff00de",
                        "-2px -2px #00ffff",
                        "2px -2px #00ff00",
                        "0px 0px #fff"
                    ]
                }}
                transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror", repeatDelay: 5 }}
            >
                <ScrambleText text={text} />
            </motion.span>
            <motion.span
                className="absolute top-0 left-0 -z-10 opacity-50 text-[var(--accent-pink)]"
                animate={{ x: [-2, 2, -1, 0] }}
                transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
            >
                {text}
            </motion.span>
            <motion.span
                className="absolute top-0 left-0 -z-10 opacity-50 text-[var(--accent-blue)]"
                animate={{ x: [2, -2, 1, 0] }}
                transition={{ duration: 0.3, repeat: Infinity, repeatType: "mirror" }}
            >
                {text}
            </motion.span>
        </div>
    );
}

// Tech Badge ComponentWithTilt
function TechBadge({ name, icon, color, delay }: { name: string; icon: string; color: string; delay: number }) {
    return (
        <TiltCard delay={delay}>
            <div
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-default)] bg-[var(--background-elevated)]"
                style={{ borderColor: color }}
            >
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-bold text-[var(--foreground)]">{name}</span>
            </div>
        </TiltCard>
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
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

                const eventSource = new EventSource(
                    `http://localhost:3001/api/runs/${newRun.id}/stream`
                );

                eventSource.addEventListener('update', () => fetchRuns());
                eventSource.addEventListener('complete', () => {
                    fetchRuns();
                    eventSource.close();
                });
                eventSource.addEventListener('error', () => eventSource.close());
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
        <div className="min-h-screen relative">
            {/* CSS Animated Background Fallback (always visible, works everywhere) */}
            <div className="animated-bg-fallback" />
            <div className="css-particles">
                <div className="css-particle" />
                <div className="css-particle" />
                <div className="css-particle" />
                <div className="css-particle" />
                <div className="css-particle" />
                <div className="css-particle" />
                <div className="css-particle" />
                <div className="css-particle" />
                <div className="css-particle" />
                <div className="css-particle" />
            </div>

            {/* Three.js Background (enhanced, on top of CSS fallback) */}
            {mounted && (
                <Suspense fallback={null}>
                    <ThreeBackground />
                </Suspense>
            )}

            {/* Gradient Overlay */}
            <div className="hero-gradient fixed inset-0 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 px-6 py-12 max-w-6xl mx-auto">
                {/* Hero Section */}
                <motion.section
                    className="text-center mb-20 pt-8"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.div
                        className="inline-block mb-6 relative"
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    >
                        <span className="text-7xl absolute blur-md opacity-50 animate-pulse">🧪</span>
                        <span className="text-7xl relative z-10">🧪</span>
                    </motion.div>
                    <div className="mb-6">
                        <GlitchText text="AI Test Agent" />
                    </div>
                    <p className="text-xl md:text-2xl text-[var(--foreground-secondary)] max-w-2xl mx-auto mb-8">
                        Automate your end-to-end testing with the power of AI.
                        Write tests in plain English, get results in seconds.
                    </p>
                    <MagneticButton
                        href="#get-started"
                        className="btn-primary inline-block text-lg"
                    >
                        Get Started →
                    </MagneticButton>
                </motion.section>

                {/* How It Works Section */}
                <motion.section
                    className="mb-20"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <ScrollVelocitySkew>
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[var(--foreground)]">
                            <ScrambleText text="How It Works" />
                        </h2>
                    </ScrollVelocitySkew>
                    <p className="text-center text-[var(--foreground-muted)] mb-12 max-w-xl mx-auto">
                        Three simple steps to automate your testing workflow
                    </p>
                    <div className="grid md:grid-cols-3 gap-6">
                        <StepCard
                            number={1}
                            title="Enter Your URL"
                            description="Provide the URL of the web application you want to test. Our AI will analyze and understand the page structure."
                            icon={<RocketIcon />}
                            delay={0.1}
                        />
                        <StepCard
                            number={2}
                            title="Describe Your Test"
                            description="Write what you want to test in plain English. No coding required - just describe the user journey."
                            icon={<BrainIcon />}
                            delay={0.2}
                        />
                        <StepCard
                            number={3}
                            title="Get Results"
                            description="AI generates and runs Playwright tests automatically. View detailed results with screenshots and videos."
                            icon={<ChartIcon />}
                            delay={0.3}
                        />
                    </div>
                </motion.section>

                {/* Features Section */}
                <motion.section
                    className="mb-20"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <ScrollVelocitySkew>
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[var(--foreground)]">
                            <ScrambleText text="Powerful Features" />
                        </h2>
                    </ScrollVelocitySkew>
                    <p className="text-center text-[var(--foreground-muted)] mb-12 max-w-xl mx-auto">
                        Everything you need for modern, AI-powered testing
                    </p>
                    <div className="grid md:grid-cols-3 gap-6">
                        <FeatureCard
                            icon="🤖"
                            title="AI-Powered"
                            description="Advanced LLM understands your test descriptions and generates robust Playwright test code."
                            delay={0.1}
                        />
                        <FeatureCard
                            icon="⚡"
                            title="Real-Time Results"
                            description="Watch your tests run live with real-time status updates and instant feedback."
                            delay={0.2}
                        />
                        <FeatureCard
                            icon="🔌"
                            title="API Integration"
                            description="Integrate with your CI/CD pipeline, IDE, or any tool using our REST API."
                            delay={0.3}
                        />
                    </div>
                </motion.section>

                {/* Stats Section */}
                <motion.section
                    className="mb-20"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <ScrollVelocitySkew>
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[var(--foreground)]">
                            <ScrambleText text="Trusted by Developers" />
                        </h2>
                    </ScrollVelocitySkew>
                    <p className="text-center text-[var(--foreground-muted)] mb-12 max-w-xl mx-auto">
                        Join thousands of developers automating their testing workflow
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <StatCard icon="🧪" value={runs.length || 127} label="Tests Run" delay={0.1} />
                        <StatCard icon="✅" value={98} suffix="%" label="Success Rate" delay={0.2} />
                        <StatCard icon="⚡" value={2} suffix="s" label="Avg. Runtime" delay={0.3} />
                        <StatCard icon="👥" value={1200} suffix="+" label="Active Users" delay={0.4} />
                    </div>
                </motion.section>

                {/* Technology Stack Section */}
                <motion.section
                    className="mb-20"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <ScrollVelocitySkew>
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[var(--foreground)]">
                            <ScrambleText text="Built with Modern Tech" />
                        </h2>
                    </ScrollVelocitySkew>
                    <p className="text-center text-[var(--foreground-muted)] mb-12 max-w-xl mx-auto">
                        Powered by cutting-edge technologies for reliability and performance
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <TechBadge name="Playwright" icon="🎭" color="#22c55e" delay={0.1} />
                        <TechBadge name="OpenAI" icon="🧠" color="#a855f7" delay={0.15} />
                        <TechBadge name="TypeScript" icon="📘" color="#3b82f6" delay={0.2} />
                        <TechBadge name="Next.js" icon="▲" color="#ffffff" delay={0.25} />
                        <TechBadge name="Three.js" icon="🎨" color="#06b6d4" delay={0.3} />
                        <TechBadge name="PostgreSQL" icon="🐘" color="#3b82f6" delay={0.35} />
                        <TechBadge name="Redis" icon="⚡" color="#ef4444" delay={0.4} />
                        <TechBadge name="Docker" icon="🐳" color="#3b82f6" delay={0.45} />
                    </div>
                </motion.section>

                {/* Main App Section */}
                <section id="get-started" className="scroll-mt-8">
                    {/* Tab Navigation */}
                    <motion.div
                        className="flex gap-3 mb-6 justify-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {['runs', 'keys'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as 'runs' | 'keys')}
                                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                            >
                                {tab === 'runs' ? '🧪 Test Runs' : '🔑 API Keys'}
                            </button>
                        ))}
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'runs' && (
                            <motion.div
                                key="runs"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 30 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* New Test Run Form */}
                                <div className="glass-card neon-border p-8 mb-8">
                                    <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)] flex items-center gap-3">
                                        <span className="text-3xl">✨</span> New Test Run
                                    </h2>
                                    <form onSubmit={startRun} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-[var(--foreground-secondary)] mb-2">
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
                                            <label className="block text-sm font-semibold text-[var(--foreground-secondary)] mb-2">
                                                Test Instructions
                                            </label>
                                            <textarea
                                                className="input-field min-h-[120px] resize-none"
                                                placeholder="E.g., Navigate to the login page, enter test credentials, verify the dashboard loads correctly..."
                                                value={prompt}
                                                onChange={e => setPrompt(e.target.value)}
                                            />
                                        </div>
                                        <MagneticButton
                                            type="submit"
                                            disabled={loading}
                                            className="btn-primary w-full text-lg"
                                        >
                                            {loading ? (
                                                <span className="flex items-center justify-center gap-3">
                                                    <motion.span
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                    >
                                                        ⚙️
                                                    </motion.span>
                                                    Running Test...
                                                </span>
                                            ) : (
                                                '🚀 Start Test Run'
                                            )}
                                        </MagneticButton>
                                    </form>
                                </div>

                                {/* Recent Runs */}
                                <div className="glass-card p-8">
                                    <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)] flex items-center gap-3">
                                        <span className="text-3xl">📋</span> Recent Runs
                                    </h2>
                                    <div className="space-y-4">
                                        <AnimatePresence>
                                            {runs.map((run, index) => (
                                                <TestRunCard key={run.id} run={run} index={index} />
                                            ))}
                                        </AnimatePresence>
                                        {runs.length === 0 && (
                                            <motion.div
                                                className="text-[var(--foreground-muted)] text-center py-12"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                            >
                                                <div className="text-5xl mb-4">🔍</div>
                                                <p>No test runs yet. Create your first test above!</p>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'keys' && (
                            <motion.div
                                key="keys"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Generate API Key */}
                                <div className="glass-card neon-border p-8 mb-8">
                                    <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)] flex items-center gap-3">
                                        <span className="text-3xl">🔑</span> Generate API Key
                                    </h2>
                                    <p className="text-[var(--foreground-muted)] mb-6 text-sm">
                                        Use API keys to integrate with VS Code, Cursor, or your CI/CD pipeline
                                    </p>
                                    <form onSubmit={createApiKey} className="flex gap-4">
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
                                            className="mt-6 p-5 rounded-xl bg-[rgba(34,197,94,0.1)] border border-[var(--accent-green)]"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <p className="text-sm text-[var(--accent-green)] font-semibold mb-3">
                                                🔐 Your new API key (copy it now, won&apos;t be shown again):
                                            </p>
                                            <code className="block p-4 bg-[var(--background)] rounded-lg text-sm break-all font-mono text-[var(--foreground)]">
                                                {newKey}
                                            </code>
                                        </motion.div>
                                    )}
                                </div>

                                {/* API Keys List */}
                                <div className="glass-card p-8 mb-8">
                                    <h2 className="text-2xl font-bold mb-6 text-[var(--foreground)] flex items-center gap-3">
                                        <span className="text-3xl">📋</span> Your API Keys
                                    </h2>
                                    <div className="space-y-4">
                                        {apiKeys.map((key, index) => (
                                            <motion.div
                                                key={key.id}
                                                className="run-card flex justify-between items-center"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <div>
                                                    <div className="text-[var(--foreground)] font-semibold">{key.name}</div>
                                                    <code className="text-sm text-[var(--foreground-muted)] font-mono">{key.key}</code>
                                                </div>
                                                <button
                                                    onClick={() => revokeApiKey(key.id)}
                                                    className="text-[var(--accent-red)] hover:bg-[var(--accent-red-glow)] px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                                >
                                                    Revoke
                                                </button>
                                            </motion.div>
                                        ))}
                                        {apiKeys.length === 0 && (
                                            <div className="text-[var(--foreground-muted)] text-center py-12">
                                                <div className="text-5xl mb-4">🔐</div>
                                                <p>No API keys yet. Generate one above!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CLI Usage Guide */}
                                <motion.div
                                    className="glass-card p-8"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h3 className="text-xl font-bold text-[var(--accent-blue)] mb-4 flex items-center gap-3">
                                        <span className="text-2xl">💻</span> CLI Usage
                                    </h3>
                                    <pre className="bg-[var(--background)] p-6 rounded-xl text-sm overflow-x-auto text-[var(--foreground-secondary)] leading-relaxed">
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
                </section>

                {/* Footer */}
                <motion.footer
                    className="text-center mt-20 py-8 text-[var(--foreground-muted)] text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <p>Built with ❤️ using Next.js, Three.js, and AI</p>
                </motion.footer>
            </div>
        </div>
    );
}
