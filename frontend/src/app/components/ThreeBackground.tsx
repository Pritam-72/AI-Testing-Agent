'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float, Stars, Trail } from '@react-three/drei';
import * as THREE from 'three';

// --- Utils ---
function useMousePosition() {
    const [mouse, setMouse] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMouse({
                x: (e.clientX / window.innerWidth) * 2 - 1,
                y: -(e.clientY / window.innerHeight) * 2 + 1
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);
    return mouse;
}

// --- Components ---

// 1. Futuristic Space Fighter
function SpaceFighter({ mouse }: { mouse: { x: number; y: number } }) {
    const groupRef = useRef<THREE.Group>(null);
    const engineRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        if (groupRef.current) {
            // Smooth movement to mouse position
            const targetX = mouse.x * 6; // Range multiplier
            const targetY = mouse.y * 3;

            // Lerp position
            groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.1);
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);

            // Banking effect (roll when moving)
            const diffX = targetX - groupRef.current.position.x;
            const diffY = targetY - groupRef.current.position.y;

            groupRef.current.rotation.z = -diffX * 0.5; // Roll
            groupRef.current.rotation.x = diffY * 0.2; // Pitch
        }

        // Engine Pulse
        if (engineRef.current) {
            const scale = 1 + Math.sin(t * 20) * 0.2;
            engineRef.current.scale.setScalar(scale);
            (engineRef.current.material as THREE.Material).opacity = 0.5 + Math.sin(t * 10) * 0.3;
        }
    });

    return (
        <group ref={groupRef} position={[0, -2, 0]} scale={[0.4, 0.4, 0.4]}>
            <Trail width={1} length={6} color={new THREE.Color(0, 0.5, 1)} attenuation={(t) => t * t}>
                {/* Main Body */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.8, 3, 4]} />
                    <meshStandardMaterial color="#222" roughness={0.4} metalness={0.8} />
                </mesh>
            </Trail>

            {/* Cockpit */}
            <mesh position={[0, 0.2, 0.5]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.5, 0.4, 1]} />
                <meshStandardMaterial color="#111" roughness={0.2} metalness={1} />
            </mesh>
            <mesh position={[0, 0.45, 0.2]}>
                <boxGeometry args={[0.45, 0.1, 0.8]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
            </mesh>

            {/* Wings */}
            <mesh position={[0, -0.2, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[3, 1, 0.1]} />
                <meshStandardMaterial color="#333" roughness={0.5} metalness={0.7} />
            </mesh>
            {/* Vertical Stabilizers */}
            <mesh position={[0.8, 0.5, -1]} rotation={[0, 0, 0.5]}>
                <boxGeometry args={[0.1, 1, 1]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[-0.8, 0.5, -1]} rotation={[0, 0, -0.5]}>
                <boxGeometry args={[0.1, 1, 1]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* Engine Glow */}
            <mesh ref={engineRef} position={[0, 0, -1.5]}>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshBasicMaterial color="#00aaff" transparent opacity={0.8} />
            </mesh>
            <pointLight position={[0, 0, -2]} color="#00aaff" intensity={2} distance={5} />
        </group>
    );
}

// 2. Classic UFO
function UFO() {
    const groupRef = useRef<THREE.Group>(null);
    const lightsRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        if (groupRef.current) {
            // Hover movement
            groupRef.current.position.y = 3 + Math.sin(t * 0.5) * 0.5;
            groupRef.current.position.x = Math.sin(t * 0.3) * 4;
            groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.1;
            groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
        }

        if (lightsRef.current) {
            lightsRef.current.rotation.y += 0.05; // Spin lights
        }
    });

    return (
        <group ref={groupRef} position={[0, 3, -5]}>
            {/* Saucer Body */}
            <mesh>
                <cylinderGeometry args={[2, 0.5, 0.5, 32]} />
                <meshStandardMaterial color="#444" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Glass Dome */}
            <mesh position={[0, 0.3, 0]}>
                <sphereGeometry args={[0.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshPhysicalMaterial
                    color="#88ccff"
                    roughness={0}
                    metalness={0.1}
                    transmission={0.6}
                    thickness={0.5}
                />
            </mesh>

            {/* Rotating Lights Ring */}
            <group ref={lightsRef} position={[0, -0.1, 0]}>
                {[...Array(8)].map((_, i) => (
                    <mesh key={i} position={[
                        Math.cos((i / 8) * Math.PI * 2) * 1.8,
                        0,
                        Math.sin((i / 8) * Math.PI * 2) * 1.8
                    ]}>
                        <sphereGeometry args={[0.15, 16, 16]} />
                        <meshBasicMaterial color="#00ff00" toneMapped={false} />
                    </mesh>
                ))}
            </group>

            {/* Abduction Beam (Optional, subtle) */}
            <mesh position={[0, -3, 0]}>
                <cylinderGeometry args={[0.1, 2, 6, 32, 1, true]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={0.05} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
        </group>
    );
}

// 3. Procedural Starfield
function StarField() {
    const count = 3000;
    const ref = useRef<THREE.Points>(null);
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 100;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 50 - 20; // depth
        }
        return pos;
    });

    useFrame((state) => {
        if (ref.current) {
            // Warp speed effect
            const positions = ref.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < count; i++) {
                // Move stars towards camera (Z axis)
                positions[i * 3 + 2] += 0.5;

                // Reset if too close/behind camera
                if (positions[i * 3 + 2] > 20) {
                    positions[i * 3 + 2] = -50;
                }
            }
            ref.current.geometry.attributes.position.needsUpdate = true;

            // Subtle rotation for dynamic feel
            ref.current.rotation.z += 0.0002;
        }
    });

    return (
        <Points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <PointMaterial size={0.05} color="#ffffff" transparent opacity={0.8} sizeAttenuation depthWrite={false} />
        </Points>
    );
}

function Scene() {
    const mouse = useMousePosition();
    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
            <pointLight position={[-10, -5, -10]} intensity={0.5} color="#3b82f6" />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            <SpaceFighter mouse={mouse} />
            <UFO />
            <StarField />

            <fog attach="fog" args={['#000000', 10, 60]} />
        </>
    );
}

export default function ThreeBackground() {
    return (
        <div className="fixed inset-0 -z-10 bg-black">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 60 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]}
            >
                <color attach="background" args={['#000000']} />
                <Scene />
            </Canvas>
        </div>
    );
}
