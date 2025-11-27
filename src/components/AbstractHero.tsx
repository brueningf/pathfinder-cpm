import React, { useEffect, useRef } from 'react';

interface AbstractHeroProps {
    theme: 'dark' | 'light';
}

export const AbstractHero: React.FC<AbstractHeroProps> = ({ theme }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Colors based on theme
    const colors = {
        bg: theme === 'dark' ? '#020617' : '#fafaf9', // slate-950 : stone-50
        node: theme === 'dark' ? '#94a3b8' : '#a8a29e', // slate-400 : stone-400
        critical: theme === 'dark' ? '#f43f5e' : '#f97316', // rose-500 : orange-500 (warm)
        connection: theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(168, 162, 158, 0.2)',
        criticalConnection: theme === 'dark' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)',
        particle: theme === 'dark' ? '#60a5fa' : '#0ea5e9', // blue-400 : sky-500
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let nodes: Node[] = [];
        let connections: Connection[] = [];

        const resize = () => {
            canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
            canvas.height = canvas.parentElement?.clientHeight || 500;
            init();
        };

        class Node {
            x: number;
            y: number;
            isCritical: boolean;

            constructor(x: number, y: number, isCritical: boolean) {
                this.x = x;
                this.y = y;
                this.isCritical = isCritical;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.isCritical ? 4 : 2, 0, Math.PI * 2);
                ctx.fillStyle = this.isCritical ? colors.critical : colors.node;
                ctx.fill();

                // Glow
                if (this.isCritical) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = colors.critical;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }

        class Connection {
            start: Node;
            end: Node;
            isCritical: boolean;

            constructor(start: Node, end: Node) {
                this.start = start;
                this.end = end;
                // Connection is critical if both nodes are (simplified logic for visual)
                this.isCritical = start.isCritical && end.isCritical;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.moveTo(this.start.x, this.start.y);
                ctx.lineTo(this.end.x, this.end.y);
                ctx.strokeStyle = this.isCritical ? colors.criticalConnection : colors.connection;
                ctx.lineWidth = this.isCritical ? 2 : 1;
                ctx.stroke();
            }
        }

        class Particle {
            currentConnection: Connection;
            progress: number;
            speed: number;

            constructor(connection: Connection) {
                this.currentConnection = connection;
                this.progress = 0;
                this.speed = 0.01 + Math.random() * 0.01;
                if (connection.isCritical) this.speed *= 1.5;
            }

            update() {
                this.progress += this.speed;
                if (this.progress >= 1) {
                    // Find next connection
                    const nextConnections = connections.filter(c => c.start === this.currentConnection.end);
                    if (nextConnections.length > 0) {
                        // Prefer critical path if on critical path
                        const criticalNext = nextConnections.find(c => c.isCritical);
                        if (this.currentConnection.isCritical && criticalNext && Math.random() > 0.2) {
                            this.currentConnection = criticalNext;
                        } else {
                            this.currentConnection = nextConnections[Math.floor(Math.random() * nextConnections.length)];
                        }
                        this.progress = 0;
                    } else {
                        // Respawn at start
                        const startConnections = connections.filter(c => c.start.x < canvas!.width * 0.2);
                        this.currentConnection = startConnections[Math.floor(Math.random() * startConnections.length)];
                        this.progress = 0;
                    }
                }
            }

            draw() {
                if (!ctx) return;
                const sx = this.currentConnection.start.x;
                const sy = this.currentConnection.start.y;
                const ex = this.currentConnection.end.x;
                const ey = this.currentConnection.end.y;

                const x = sx + (ex - sx) * this.progress;
                const y = sy + (ey - sy) * this.progress;

                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fillStyle = this.currentConnection.isCritical ? colors.critical : colors.particle;
                ctx.fill();

                // Trail
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - (ex - sx) * 0.05, y - (ey - sy) * 0.05);
                ctx.strokeStyle = this.currentConnection.isCritical ? colors.criticalConnection : colors.connection;
                ctx.stroke();
            }
        }

        const init = () => {
            nodes = [];
            connections = [];
            particles = [];

            // Create Nodes (Layers)
            const layers = 6;
            const width = canvas.width;
            const height = canvas.height;

            // Critical Path Nodes
            const cpY = height / 2;
            const cpNodes: Node[] = [];
            for (let i = 0; i < layers; i++) {
                const x = (width * 0.1) + (width * 0.8 * (i / (layers - 1)));
                // Increased vertical variation for less flat look
                const yOffset = (Math.random() * (height * 0.4)) - (height * 0.2);
                const node = new Node(x, cpY + yOffset, true);
                nodes.push(node);
                cpNodes.push(node);
            }

            // Random Nodes
            for (let i = 0; i < 15; i++) {
                const x = (width * 0.1) + Math.random() * (width * 0.8);
                const y = Math.random() * height;
                // Avoid CP area slightly
                if (Math.abs(y - cpY) > 50) {
                    nodes.push(new Node(x, y, false));
                }
            }

            // Sort by X to make connections easier
            nodes.sort((a, b) => a.x - b.x);

            // Create Connections
            // 1. Connect Critical Path
            for (let i = 0; i < cpNodes.length - 1; i++) {
                connections.push(new Connection(cpNodes[i], cpNodes[i + 1]));
            }

            // 2. Connect Random Nodes (forward only)
            nodes.forEach((node, i) => {
                // Connect to 1-2 forward nodes
                const forwardNodes = nodes.slice(i + 1).filter(n => n.x > node.x && n.x < node.x + width * 0.3);
                if (forwardNodes.length > 0) {
                    const count = Math.floor(Math.random() * 2) + 1;
                    for (let j = 0; j < count; j++) {
                        const target = forwardNodes[Math.floor(Math.random() * forwardNodes.length)];
                        // Avoid duplicating CP connections
                        if (!connections.some(c => c.start === node && c.end === target)) {
                            connections.push(new Connection(node, target));
                        }
                    }
                }
            });

            // Create Particles
            for (let i = 0; i < 20; i++) {
                const conn = connections[Math.floor(Math.random() * connections.length)];
                const p = new Particle(conn);
                p.progress = Math.random();
                particles.push(p);
            }
        };

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Connections
            connections.forEach(c => c.draw());

            // Draw Nodes
            nodes.forEach(n => n.draw());

            // Update and Draw Particles
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]); // Re-run when theme changes

    return <canvas ref={canvasRef} className="w-full h-full absolute inset-0 pointer-events-none opacity-60" />;
};
