import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './DinoGame.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const auth = getAuth();

// Physics constants
const W = 900, H = 300;
const GROUND_Y   = 240;
const GRAVITY    = 0.65;
const JUMP_V     = -12.5;
const BASE_SPD   = 6;
const MAX_SPD    = 14;
const SPD_INC    = 0.0015;   // speed added per frame
const DINO_X     = 100;

// Dimensions & offsets to align sprites on the ground
const DINO_RUN_W = 43, DINO_RUN_H = 51, DINO_RUN_BLANK_Y = 3;
const DINO_DUC_W = 55, DINO_DUC_H = 30; 
const DINO_JMP_W = 43, DINO_JMP_H = 51, DINO_JMP_BLANK_Y = 5;

const CACTUS_W = 50, CACTUS_H = 50;
const CACTI_BLANK_Y = [0, 1, 2, 8, 8, 8];

const DRAW_OFFSET_Y = 8; // pushes sprites down to sit perfectly on the line

// Hitboxes relative to top-left of the drawn boundaries
const DINO_RUN_HB = { x: 4, y: 4, w: 35, h: 44 };
const DINO_DUC_HB = { x: 4, y: 2, w: 48, h: 26 };
const DINO_JMP_HB = { x: 4, y: 4, w: 34, h: 42 };

const CACTI_HITBOXES = [
    { x: 4,  y: 2,  w: 42, h: 48 }, // cactus1
    { x: 13, y: 2,  w: 24, h: 47 }, // cactus2
    { x: 4,  y: 3,  w: 42, h: 45 }, // cactus3
    { x: 4,  y: 8,  w: 42, h: 34 }, // cactus4
    { x: 8,  y: 8,  w: 34, h: 34 }, // cactus5
    { x: 16, y: 8,  w: 17, h: 34 }, // cactus6
];

// Load image promise helper
function loadImg(src) {
    return new Promise(res => {
        const img = new Image();
        img.onload  = () => res(img);
        img.onerror = () => { console.warn('missing:', src); res(null); };
        img.src = src;
    });
}

// Quietly load audio without crashing if unsupported
function tryAudio(src) {
    try { return new Audio(src); } catch { return null; }
}

// Standard AABB bounding box collision helper
function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Reset state
function freshState() {
    return {
        active:         true,
        frame:          0,
        speed:          BASE_SPD,
        score:          0,
        lastMilestone:  0,
        groundX:        0,
        nextSpawnIn:    60,
        obstacles:      [],
        clouds:         [{ x: 300, y: 50 }, { x: 650, y: 35 }],
        dino: {
            y:          GROUND_Y,
            vy:         0,
            onGround:   true,
            ducking:    false,
            animTick:   0,
            animFrame:  0,
        },
    };
}

export default function DinoGame() {
    const navigate  = useNavigate();
    const canvasRef = useRef(null);

    const [screen, setScreen] = useState('menu');
    const [score,  setScore]  = useState(0);
    const [hi,     setHi]     = useState(() => parseInt(localStorage.getItem('dinoHi') || '0'));
    const [authUser, setAuthUser] = useState(null);

    const gs   = useRef(null);          // core state ref
    const ast  = useRef({ loaded: false });
    const sfx  = useRef({});
    const keys = useRef({ up: false, down: false });
    const rafRef = useRef(null);
    const startTimeRef = useRef(null);  // tracks when current run started

    // Auth listener — track logged-in user for activity submission
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setAuthUser(u || null);
        });
        return () => unsub();
    }, []);

    // Initial asset loader
    useEffect(() => {
        (async () => {
            const [d1, d2, dd1, dd2, dj,
                   c1, c2, c3, c4, c5, c6,
                   cloud, ground] = await Promise.all([
                loadImg('/dino/Dino1.png'),
                loadImg('/dino/Dino2.png'),
                loadImg('/dino/DinoDucking1.png'),
                loadImg('/dino/DinoDucking2.png'),
                loadImg('/dino/DinoJumping.png'),
                loadImg('/dino/cacti/cactus1.png'),
                loadImg('/dino/cacti/cactus2.png'),
                loadImg('/dino/cacti/cactus3.png'),
                loadImg('/dino/cacti/cactus4.png'),
                loadImg('/dino/cacti/cactus5.png'),
                loadImg('/dino/cacti/cactus6.png'),
                loadImg('/dino/cloud.png'),
                loadImg('/dino/ground.png'),
            ]);
            ast.current = {
                run:  [d1, d2], duck: [dd1, dd2], jump: dj,
                cacti: [c1, c2, c3, c4, c5, c6],
                cloud, ground, loaded: true,
            };
            sfx.current = {
                jump:    tryAudio('/dino/sfx/jump.mp3'),
                lose:    tryAudio('/dino/sfx/lose.mp3'),
                hundred: tryAudio('/dino/sfx/100points.mp3'),
            };
        })();
    }, []);

    // Play sounds
    const playSfx = useCallback((name) => {
        try {
            const s = sfx.current[name];
            if (!s) return;
            const c = s.cloneNode();
            c.volume = 0.4;
            c.play().catch(() => {});
        } catch {}
    }, []);

    // Main render function
    function drawFrame(ctx) {
        const g = gs.current;
        const a = ast.current;
        if (!g || !a.loaded) return;

        const d = g.dino;

        // Apply high-DPI scaling dynamically
        const dpr = window.devicePixelRatio || 1;
        if (ctx.canvas.width !== Math.floor(W * dpr) || ctx.canvas.height !== Math.floor(H * dpr)) {
            ctx.canvas.width = Math.floor(W * dpr);
            ctx.canvas.height = Math.floor(H * dpr);
            ctx.canvas.style.width = `${W}px`;
            ctx.canvas.style.height = `${H}px`;
        }
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;

        // Background sky
        ctx.fillStyle = '#f7f7f7';
        ctx.fillRect(0, 0, W, H);

        // Render clouds
        if (a.cloud) {
            ctx.globalAlpha = 0.65;
            for (const c of g.clouds) {
                ctx.drawImage(a.cloud, c.x, c.y, 50, 20);
            }
            ctx.globalAlpha = 1;
        }

        // Tiled scrolling road
        if (a.ground) {
            ctx.drawImage(a.ground, g.groundX, GROUND_Y, 642, 12);
            ctx.drawImage(a.ground, g.groundX + 642, GROUND_Y, 642, 12);
            if (g.groundX + 642 < W) {
                ctx.drawImage(a.ground, g.groundX + 1284, GROUND_Y, 642, 12);
            }
        }

        // Render obstacles
        for (const obs of g.obstacles) {
            const img = a.cacti[obs.si % 6];
            if (!img) continue;

            const blankY = CACTI_BLANK_Y[obs.si % 6];
            const drawY = GROUND_Y - CACTUS_H + blankY + DRAW_OFFSET_Y;

            if (obs.double) {
                ctx.drawImage(img, obs.x - CACTUS_W + 5, drawY, CACTUS_W, CACTUS_H);
                ctx.drawImage(img, obs.x + 5, drawY, CACTUS_W, CACTUS_H);
            } else {
                ctx.drawImage(img, obs.x - CACTUS_W / 2, drawY, CACTUS_W, CACTUS_H);
            }
        }

        // Render dino depending on action state
        let img;
        let dw = DINO_RUN_W, dh = DINO_RUN_H;
        let blankY = DINO_RUN_BLANK_Y;

        if (!d.onGround) {
            img = a.jump || a.run[0];
            dw = DINO_JMP_W; dh = DINO_JMP_H;
            blankY = DINO_JMP_BLANK_Y;
        } else if (d.ducking) {
            img = a.duck[d.animFrame];
            dw = DINO_DUC_W; dh = DINO_DUC_H;
            blankY = d.animFrame === 0 ? 1 : 2;
        } else {
            img = a.run[d.animFrame];
            dw = DINO_RUN_W; dh = DINO_RUN_H;
            blankY = DINO_RUN_BLANK_Y;
        }

        if (img) {
            const drawY = d.y - dh + blankY + DRAW_OFFSET_Y;
            ctx.drawImage(img, DINO_X - dw / 2, drawY, dw, dh);
        }

        // Live stats panel
        ctx.fillStyle = '#535353';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'right';
        const scoreStr = String(g.score).padStart(5, '0');
        const hiStr    = String(hi).padStart(5, '0');
        ctx.fillText(`HI ${hiStr}  ${scoreStr}`, W - 16, 24);
    }

    // Game loop simulation frame
    const tickRef = useRef(null);
    tickRef.current = (ctx) => {
        const g = gs.current;
        if (!g?.active) return;

        const d = g.dino;

        // Physics speed progression and score calculation
        g.frame++;
        g.speed  = Math.min(MAX_SPD, BASE_SPD + SPD_INC * g.frame);
        g.score  = Math.floor(g.frame * g.speed * 0.045);
        setScore(g.score);

        // Play alert sound every 100 points
        const m = Math.floor(g.score / 100);
        if (m > g.lastMilestone) { g.lastMilestone = m; playSfx('hundred'); }

        // Core physics controls input handlers
        if (keys.current.up && d.onGround) {
            d.vy = JUMP_V;
            d.onGround = false;
            d.ducking  = false;
            playSfx('jump');
        }
        if (keys.current.down && d.onGround) {
            d.ducking = true;
        } else if (!keys.current.down) {
            d.ducking = false;
        }

        // Apply velocities and gravity
        if (!d.onGround) {
            if (keys.current.down) {
                d.vy += GRAVITY * 2; // Fast fall
            } else {
                d.vy += GRAVITY;
            }
            d.y += d.vy;
            if (d.y >= GROUND_Y) {
                d.y = GROUND_Y;
                d.vy = 0;
                d.onGround = true;
            }
        }

        // Toggle legs animations
        d.animTick++;
        if (d.animTick >= 6) { d.animTick = 0; d.animFrame ^= 1; }

        // Move background objects
        g.groundX -= g.speed;
        if (g.groundX <= -642) g.groundX += 642;

        for (let i = g.clouds.length - 1; i >= 0; i--) {
            g.clouds[i].x -= g.speed * 0.2;
            if (g.clouds[i].x < -60) g.clouds.splice(i, 1);
        }
        if (Math.random() < 0.005) g.clouds.push({ x: W + 60, y: 20 + Math.random() * 60 });

        // Spawn obstacles randomly
        g.nextSpawnIn--;
        if (g.nextSpawnIn <= 0) {
            const isDouble = Math.random() < 0.25;
            g.obstacles.push({
                x:      W + 50,
                si:     Math.floor(Math.random() * 6),
                double: isDouble,
            });
            const min = Math.max(65,  180 - g.frame * 0.035);
            const max = Math.max(110, 280 - g.frame * 0.035);
            g.nextSpawnIn = Math.floor(min + Math.random() * (max - min));
        }

        // Collision loop
        let dw = DINO_RUN_W, dh = DINO_RUN_H;
        let blankY = DINO_RUN_BLANK_Y;
        let hb = DINO_RUN_HB;

        if (!d.onGround) {
            dw = DINO_JMP_W; dh = DINO_JMP_H;
            blankY = DINO_JMP_BLANK_Y;
            hb = DINO_JMP_HB;
        } else if (d.ducking) {
            dw = DINO_DUC_W; dh = DINO_DUC_H;
            blankY = d.animFrame === 0 ? 1 : 2;
            hb = DINO_DUC_HB;
        }

        const dinoDrawY = d.y - dh + blankY + DRAW_OFFSET_Y;
        const dhx = DINO_X - dw / 2 + hb.x;
        const dhy = dinoDrawY + hb.y;
        const dhw = hb.w;
        const dhh = hb.h;

        for (let i = g.obstacles.length - 1; i >= 0; i--) {
            const obs = g.obstacles[i];
            obs.x -= g.speed;
            if (obs.x < -100) { g.obstacles.splice(i, 1); continue; }

            const idx = obs.si % 6;
            const obsBlankY = CACTI_BLANK_Y[idx];
            const obsDrawY = GROUND_Y - CACTUS_H + obsBlankY + DRAW_OFFSET_Y;
            const ohb = CACTI_HITBOXES[idx];

            if (obs.double) {
                const cx1 = obs.x - CACTUS_W + 5 + ohb.x;
                const cy1 = obsDrawY + ohb.y;
                const cw1 = ohb.w;
                const ch1 = ohb.h;

                const cx2 = obs.x + 5 + ohb.x;
                const cy2 = obsDrawY + ohb.y;
                const cw2 = ohb.w;
                const ch2 = ohb.h;

                if (overlap(dhx, dhy, dhw, dhh, cx1, cy1, cw1, ch1) ||
                    overlap(dhx, dhy, dhw, dhh, cx2, cy2, cw2, ch2)) {
                    triggerGameOver();
                    return;
                }
            } else {
                const cx = obs.x - CACTUS_W / 2 + ohb.x;
                const cy = obsDrawY + ohb.y;
                const cw = ohb.w;
                const ch = ohb.h;

                if (overlap(dhx, dhy, dhw, dhh, cx, cy, cw, ch)) {
                    triggerGameOver();
                    return;
                }
            }
        }

        function triggerGameOver() {
            g.active = false;
            playSfx('lose');
            setScreen('gameover');
            const final = g.score;
            setHi(prev => {
                const next = Math.max(prev, final);
                localStorage.setItem('dinoHi', String(next));
                return next;
            });
            drawFrame(ctx);
        }

        drawFrame(ctx);
    };

    // React game loop hook
    useEffect(() => {
        if (screen !== 'playing') return;

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        function loop() {
            tickRef.current(ctx);
            if (gs.current?.active) rafRef.current = requestAnimationFrame(loop);
        }
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [screen]);

    // Global keyboard listener
    useEffect(() => {
        const dn = (e) => {
            if (['Space','ArrowUp'].includes(e.code))  { e.preventDefault(); keys.current.up   = true; }
            if (e.code === 'ArrowDown')                { e.preventDefault(); keys.current.down = true; }
            if (['Space','ArrowUp'].includes(e.code)) {
                if (screen === 'menu')     startGame();
                if (screen === 'gameover') startGame();
            }
        };
        const up = (e) => {
            if (['Space','ArrowUp'].includes(e.code))  keys.current.up   = false;
            if (e.code === 'ArrowDown')                keys.current.down = false;
        };
        window.addEventListener('keydown', dn);
        window.addEventListener('keyup',   up);
        return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
    }, [screen]); // eslint-disable-line

    const startGame = useCallback(() => {
        keys.current = { up: false, down: false };
        gs.current   = freshState();
        setScore(0);
        startTimeRef.current = Date.now();  // record run start time
        setScreen('playing');
    }, []);

    // Submit play activity when game is over
    useEffect(() => {
        if (screen !== 'gameover' || !authUser) return;
        const durationSeconds = startTimeRef.current
            ? Math.floor((Date.now() - startTimeRef.current) / 1000)
            : 0;
        if (durationSeconds <= 0) return;
        authUser.getIdToken().then(tok => {
            fetch(`${API_BASE}/games/attempt/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_id: 'dino_camera_game',
                    score: Math.min(1, score / Math.max(1, score + 1)),
                    difficulty_level: 1,
                    completed: true,
                    game_data: { duration_seconds: durationSeconds, final_score: score },
                }),
            }).catch(() => {});
        });
    }, [screen]); // eslint-disable-line

    // Draw frame for menu / game over states
    useEffect(() => {
        if (screen === 'playing') return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            if (!ast.current.loaded) { setTimeout(draw, 200); return; }
            const a = ast.current;

            const dpr = window.devicePixelRatio || 1;
            if (ctx.canvas.width !== Math.floor(W * dpr) || ctx.canvas.height !== Math.floor(H * dpr)) {
                ctx.canvas.width = Math.floor(W * dpr);
                ctx.canvas.height = Math.floor(H * dpr);
                ctx.canvas.style.width = `${W}px`;
                ctx.canvas.style.height = `${H}px`;
            }
            ctx.resetTransform();
            ctx.scale(dpr, dpr);
            ctx.imageSmoothingEnabled = false;

            ctx.fillStyle = '#f7f7f7';
            ctx.fillRect(0, 0, W, H);
            if (a.ground) ctx.drawImage(a.ground, 0, GROUND_Y, 642, 12);
            const img = a.run[0];
            if (img) {
                const drawY = GROUND_Y - DINO_RUN_H + DINO_RUN_BLANK_Y + DRAW_OFFSET_Y;
                ctx.drawImage(img, DINO_X - DINO_RUN_W / 2, drawY, DINO_RUN_W, DINO_RUN_H);
            }
            ctx.fillStyle = '#535353';
            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`HI ${String(hi).padStart(5,'0')}  00000`, W - 16, 24);
        };
        draw();
    }, [screen, hi]);

    // Touch click handler for mobile
    const handleTap = () => {
        if (screen === 'menu' || screen === 'gameover') { startGame(); return; }
        keys.current.up = true;
        setTimeout(() => { keys.current.up = false; }, 120);
    };

    return (
        <div className="dino-page" onPointerDown={handleTap}>
            <div className="dino-wrapper">
                <canvas ref={canvasRef} width={W} height={H} className="dino-canvas" />

                {/* Menu */}
                {screen === 'menu' && (
                    <div className="dino-overlay">
                        <img src="/dino/DinoJumping.png" alt="dino" className="dino-menu-sprite" />
                        <h1 className="dino-title">Dino Runner</h1>
                        <p className="dino-hint">
                            Press <kbd>SPACE</kbd> / <kbd>↑</kbd> to jump &nbsp;·&nbsp; <kbd>↓</kbd> to duck
                        </p>
                        <div className="dino-play-instruction">
                            Press <kbd>SPACE</kbd> / <kbd>↑</kbd> to Play
                        </div>
                        <button className="dino-back-btn" onPointerDown={e => { e.stopPropagation(); navigate('/kidshome'); }}>
                            ← Back Home
                        </button>
                    </div>
                )}

                {/* Game Over */}
                {screen === 'gameover' && (
                    <div className="dino-overlay gameover-overlay">
                        <p className="dino-go-label">GAME OVER</p>
                        <div className="dino-score-row">
                            <span className="dino-score-val">{String(score).padStart(5, '0')}</span>
                            <span className="dino-score-unit">PTS</span>
                        </div>
                        {score > 0 && score >= hi && <p className="dino-new-hi">★ New High Score!</p>}
                        <div className="dino-go-btns">
                            <div className="dino-play-instruction">
                                Press <kbd>SPACE</kbd> / <kbd>↑</kbd> to Play Again
                            </div>
                            <button className="dino-back-btn" onPointerDown={e => { e.stopPropagation(); navigate('/kidshome'); }}>
                                ← Home
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

