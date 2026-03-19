/**
 * Hero Connection Network — procedural canvas animation
 * Draws an organic, living network of nodes and connections that
 * form and dissolve across the full hero section width.
 * Includes glowing nodes/lines and data-flow pulse effects.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('hero-network');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ─── Configuration ───────────────────────────────────────
    const COLOR = '#FACC15';                 // lime green accent
    const COLOR_RGB = '57, 255, 20';         // for rgba()
    const NODE_COUNT = 48;                   // total nodes
    const NODE_RADIUS = 3;                   // base dot radius (up from 2)
    const LINE_WIDTH = 1.5;                  // connection thickness (up from 1.2)
    const MAX_CONNECT_DIST = 190;            // px – max distance for a connection
    const CENTER_KEEP_OUT_X = 0.32;          // fraction of width from center to avoid (each side)

    // Animation timing
    const TICK_INTERVAL = 70;                // ms between connection state changes (faster)
    const CONNECTION_SPEED = 0.014;          // progress per frame (faster formation)
    const MAX_ACTIVE_CONNECTIONS = 32;       // concurrent visible connections
    const NODE_DRIFT_SPEED = 0.18;           // px per frame max drift

    // Glow settings
    const NODE_GLOW_RADIUS = 12;            // shadowBlur for nodes
    const LINE_GLOW_RADIUS = 8;             // shadowBlur for lines

    // Data pulse settings
    const PULSE_CHANCE = 0.02;              // chance per frame an active connection spawns a pulse
    const PULSE_SPEED = 0.025;              // progress per frame for pulse travel
    const PULSE_RADIUS = 2.5;              // radius of the pulse dot
    const PULSE_GLOW = 18;                  // shadowBlur for pulse

    // ─── State ───────────────────────────────────────────────
    let W, H;
    let nodes = [];
    let connections = [];        // { a, b, progress, direction, type, lineAlpha, speed }
    let pulses = [];             // { connIdx, progress, speed }
    let tickTimer = 0;
    let dpr = window.devicePixelRatio || 1;

    // ─── Helpers ─────────────────────────────────────────────
    function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
    function randInt(lo, hi) { return Math.floor(rand(lo, hi)); }

    /** Weight node placement toward left & right edges, with a keepout center */
    function weightedX() {
        const r = Math.random();
        if (r < 0.42) {
            // left edge band (0 – 28%)
            return rand(0, W * 0.28);
        } else if (r < 0.84) {
            // right edge band (72 – 100%)
            return rand(W * 0.72, W);
        } else {
            // sparse center band (28 – 72%), but avoid the inner keepout
            let x;
            do {
                x = rand(W * 0.28, W * 0.72);
            } while (Math.abs(x - W * 0.5) < W * CENTER_KEEP_OUT_X * 0.4);
            return x;
        }
    }

    function dist(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** Interpolate a point along a connection path at progress t (0–1) */
    function pointOnConnection(c, t) {
        const a = nodes[c.a];
        const b = nodes[c.b];
        if (c.type === 0) {
            // straight
            return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        } else if (c.type === 1) {
            // bent: horizontal from A, then vertical toward B
            const midX = b.x, midY = a.y;
            if (t < 0.5) {
                const s = t * 2;
                return { x: a.x + (midX - a.x) * s, y: a.y };
            } else {
                const s = (t - 0.5) * 2;
                return { x: midX, y: midY + (b.y - midY) * s };
            }
        } else {
            // bent: vertical from A, then horizontal toward B
            const midX = a.x, midY = b.y;
            if (t < 0.5) {
                const s = t * 2;
                return { x: a.x, y: a.y + (midY - a.y) * s };
            } else {
                const s = (t - 0.5) * 2;
                return { x: midX + (b.x - midX) * s, y: midY };
            }
        }
    }

    // ─── Init ────────────────────────────────────────────────
    function resize() {
        const hero = canvas.parentElement;
        W = window.innerWidth;
        H = hero.offsetHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        generateNodes();
        connections = [];
        pulses = [];
    }

    function generateNodes() {
        nodes = [];
        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push({
                x: weightedX(),
                y: rand(H * 0.05, H * 0.95),
                r: rand(NODE_RADIUS * 0.7, NODE_RADIUS * 1.3),
                vx: rand(-NODE_DRIFT_SPEED, NODE_DRIFT_SPEED),
                vy: rand(-NODE_DRIFT_SPEED, NODE_DRIFT_SPEED),
                glowPhase: rand(0, Math.PI * 2),
            });
        }
    }

    // ─── Connection lifecycle ────────────────────────────────
    function trySpawnConnection() {
        if (connections.length >= MAX_ACTIVE_CONNECTIONS) return;

        const ai = randInt(0, nodes.length);
        const a = nodes[ai];
        let best = null, bestDist = Infinity;
        for (let j = 0; j < nodes.length; j++) {
            if (j === ai) continue;
            const d = dist(a, nodes[j]);
            if (d < MAX_CONNECT_DIST && d < bestDist) {
                const dup = connections.some(c =>
                    (c.a === ai && c.b === j) || (c.a === j && c.b === ai)
                );
                if (!dup) { best = j; bestDist = d; }
            }
        }
        if (best === null) return;

        // Choose connection type: 0=straight, 1=bent-L, 2=bent-L reverse
        const type = Math.random() < 0.50 ? 0 : (Math.random() < 0.5 ? 1 : 2);

        connections.push({
            a: ai,
            b: best,
            progress: 0,
            direction: 1,       // 1 = forming, -1 = collapsing
            type,
            lineAlpha: rand(0.45, 0.85),
            speed: rand(CONNECTION_SPEED * 0.7, CONNECTION_SPEED * 1.4),
        });
    }

    // ─── Update ──────────────────────────────────────────────
    function update(dt) {
        // Drift nodes gently
        for (const n of nodes) {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > W) n.vx *= -1;
            if (n.y < 0 || n.y > H) n.vy *= -1;
            n.x = Math.max(0, Math.min(W, n.x));
            n.y = Math.max(0, Math.min(H, n.y));
            if (Math.random() < 0.003) {
                n.vx = rand(-NODE_DRIFT_SPEED, NODE_DRIFT_SPEED);
                n.vy = rand(-NODE_DRIFT_SPEED, NODE_DRIFT_SPEED);
            }
            n.glowPhase += 0.02;
        }

        // Advance connections
        for (let i = connections.length - 1; i >= 0; i--) {
            const c = connections[i];
            c.progress += c.direction * c.speed;
            if (c.progress >= 1) {
                c.progress = 1;
                // hold for a while then start collapsing
                if (Math.random() < 0.018) c.direction = -1;
            }
            if (c.progress <= 0) {
                // remove any pulses referencing this connection
                pulses = pulses.filter(p => p.connIdx !== i);
                // also shift pulse indices
                pulses.forEach(p => { if (p.connIdx > i) p.connIdx--; });
                connections.splice(i, 1);
            }
        }

        // Spawn data pulses on fully-formed connections
        for (let i = 0; i < connections.length; i++) {
            const c = connections[i];
            if (c.progress >= 1 && c.direction === 1 && Math.random() < PULSE_CHANCE) {
                pulses.push({
                    connIdx: i,
                    progress: 0,
                    speed: rand(PULSE_SPEED * 0.7, PULSE_SPEED * 1.3),
                });
            }
        }

        // Advance pulses
        for (let i = pulses.length - 1; i >= 0; i--) {
            pulses[i].progress += pulses[i].speed;
            if (pulses[i].progress >= 1) {
                pulses.splice(i, 1);
            }
        }

        // Periodically spawn new connections
        tickTimer += dt;
        if (tickTimer > TICK_INTERVAL) {
            tickTimer = 0;
            trySpawnConnection();
            if (Math.random() < 0.55) trySpawnConnection();
        }
    }

    // ─── Draw ────────────────────────────────────────────────
    function drawNode(n) {
        const glow = 0.5 + 0.35 * Math.sin(n.glowPhase);

        // Outer glow
        ctx.save();
        ctx.shadowColor = COLOR;
        ctx.shadowBlur = NODE_GLOW_RADIUS;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = COLOR;
        ctx.globalAlpha = glow;
        ctx.fill();
        ctx.restore();

        // Bright core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#F8FAFC';
        ctx.globalAlpha = glow * 0.4;
        ctx.fill();
    }

    function drawConnection(c) {
        const a = nodes[c.a];
        const b = nodes[c.b];
        const p = c.progress;
        if (p <= 0) return;

        ctx.save();
        ctx.lineWidth = LINE_WIDTH;
        ctx.strokeStyle = COLOR;
        ctx.globalAlpha = c.lineAlpha * p;
        ctx.shadowColor = COLOR;
        ctx.shadowBlur = LINE_GLOW_RADIUS * p;

        ctx.beginPath();
        if (c.type === 0) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p);
        } else if (c.type === 1) {
            const midX = b.x, midY = a.y;
            if (p < 0.5) {
                const t = p * 2;
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(a.x + (midX - a.x) * t, a.y);
            } else {
                const t = (p - 0.5) * 2;
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(midX, midY);
                ctx.lineTo(midX, midY + (b.y - midY) * t);
            }
        } else {
            const midX = a.x, midY = b.y;
            if (p < 0.5) {
                const t = p * 2;
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(a.x, a.y + (midY - a.y) * t);
            } else {
                const t = (p - 0.5) * 2;
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(midX, midY);
                ctx.lineTo(midX + (b.x - midX) * t, midY);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    function drawPulse(pulse) {
        if (pulse.connIdx >= connections.length) return;
        const c = connections[pulse.connIdx];
        const pt = pointOnConnection(c, pulse.progress);

        ctx.save();
        ctx.shadowColor = '#F8FAFC';
        ctx.shadowBlur = PULSE_GLOW;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, PULSE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#F8FAFC';
        ctx.globalAlpha = 0.9;
        ctx.fill();

        // green halo around pulse
        ctx.shadowColor = COLOR;
        ctx.shadowBlur = PULSE_GLOW * 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, PULSE_RADIUS + 1.5, 0, Math.PI * 2);
        ctx.fillStyle = COLOR;
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Draw connections behind nodes
        for (const c of connections) {
            drawConnection(c);
        }

        // Draw nodes
        for (const n of nodes) {
            drawNode(n);
        }

        // Draw data pulses on top
        for (const p of pulses) {
            drawPulse(p);
        }

        ctx.globalAlpha = 1;
    }

    // ─── Loop ────────────────────────────────────────────────
    let lastTime = 0;
    function loop(time) {
        const dt = lastTime ? time - lastTime : 16;
        lastTime = time;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }

    // ─── Bootstrap ───────────────────────────────────────────
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(loop);
})();
