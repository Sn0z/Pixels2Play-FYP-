import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import './DinoGame.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const auth = getAuth();

// --- Game Constants ---
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const GROUND_Y = 550;
const GRAVITY = 1.1;
const JUMP_STRENGTH = 22;
const BASE_SPEED = 300.0;
const ACCEL = 22.0;

// Hitboxes (slightly forgiving)
const DINO_RUN_W = 80, DINO_RUN_H = 100;
const DINO_DUCK_W = 110, DINO_DUCK_H = 60;

export default function DinoGame() {
    const navigate = useNavigate();
    const [authUser, setAuthUser] = useState(null);
    const [screen, setScreen] = useState('menu'); // 'menu', 'calibrating', 'playing', 'gameover'
    const [score, setScore] = useState(0);

    // Canvas references
    const canvasRef = useRef(null);
    const videoRef = useRef(null);

    // MediaPipe & Camera refs
    const poseRef = useRef(null);
    const cameraRef = useRef(null);

    // Game State refs (to avoid stale closures in requestAnimationFrame)
    const gameState = useRef({
        active: false,
        speed: BASE_SPEED,
        score: 0,
        elapsedTime: 0,
        lastTime: 0,
        dino: {
            x: 100,
            y: GROUND_Y,
            velY: 0,
            onGround: true,
            ducking: false,
            frame: 0
        },
        obstacles: [],
        clouds: [],
        groundX: 0,
        obstacleTimer: 0,
        obstacleCooldown: 1000
    });

    // Body Tracking Calibration
    const trackingState = useRef({
        action: 'none',
        calibrated: false,
        neutralShoulderY: null,
        jumpThreshold: null,
        crouchThreshold: null,
        landmarks: null
    });

    // Assets
    const assets = useRef({
        dinoRun: [],
        dinoDuck: [],
        cacti: [],
        cloud: null,
        ground: null,
        loaded: false
    });

    // ── Pre-load Assets ────────────────────────────────────────────────────────
    useEffect(() => {
        const loadImg = (src) => {
            return new Promise(resolve => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(img);
            });
        };

        const loadAll = async () => {
            try {
                // Ensure the 'assets' folder from Pygame is copied to 'public/assets' in Vite
                const [d1, d2, dd1, dd2, c1, c2, c3, c4, c5, c6, cl, gr] = await Promise.all([
                    loadImg('/assets/Dino1.png'), loadImg('/assets/Dino2.png'),
                    loadImg('/assets/DinoDucking1.png'), loadImg('/assets/DinoDucking2.png'),
                    loadImg('/assets/cacti/cactus1.png'), loadImg('/assets/cacti/cactus2.png'),
                    loadImg('/assets/cacti/cactus3.png'), loadImg('/assets/cacti/cactus4.png'),
                    loadImg('/assets/cacti/cactus5.png'), loadImg('/assets/cacti/cactus6.png'),
                    loadImg('/assets/cloud.png'), loadImg('/assets/ground.png')
                ]);

                assets.current = {
                    dinoRun: [d1, d2],
                    dinoDuck: [dd1, dd2],
                    cacti: [c1, c2, c3, c4, c5, c6],
                    cloud: cl,
                    ground: gr,
                    loaded: true
                };
            } catch (err) {
                console.error("Failed to load some game assets. Check public/assets directory.", err);
            }
        };
        loadAll();
    }, []);

    // ── Auth ───────────────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => {
            if (u) setAuthUser(u);
            else navigate('/login');
        });
        return () => unsub();
    }, [navigate]);

    // ── MediaPipe Setup ────────────────────────────────────────────────────────
    const initTracker = useCallback(() => {
        if (!videoRef.current) return;

        poseRef.current = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        poseRef.current.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        poseRef.current.onResults(onPoseResults);

        cameraRef.current = new Camera(videoRef.current, {
            onFrame: async () => {
                if (poseRef.current && videoRef.current) {
                    await poseRef.current.send({ image: videoRef.current });
                }
            },
            width: 640,
            height: 480
        });

        cameraRef.current.start();
    }, []);

    const stopTracker = useCallback(() => {
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }
        if (poseRef.current) {
            poseRef.current.close();
            poseRef.current = null;
        }
    }, []);

    useEffect(() => {
        return stopTracker; // Cleanup on unmount
    }, [stopTracker]);

    // ── Pose Processing ────────────────────────────────────────────────────────
    const onPoseResults = (results) => {
        const trk = trackingState.current;
        trk.landmarks = results.poseLandmarks;

        if (!results.poseLandmarks) {
            trk.action = 'none';
            return;
        }

        const lms = results.poseLandmarks;
        const leftShoulder = lms[11];
        const rightShoulder = lms[12];
        const leftHip = lms[23];

        // y is normalized [0, 1]
        const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

        if (!trk.calibrated && screen === 'calibrating') {
            trk.neutralShoulderY = avgShoulderY;
            const torsoLength = Math.abs(leftHip.y - avgShoulderY);
            // Thumb-rules for thresholds
            trk.jumpThreshold = avgShoulderY - (torsoLength * 0.4);
            trk.crouchThreshold = avgShoulderY + (torsoLength * 0.35);
            trk.calibrated = true;
            
            setTimeout(() => {
                setScreen('playing');
                startGame();
            }, 1000); // 1 sec delay showing calibration success
        }

        if (trk.calibrated) {
            if (avgShoulderY < trk.jumpThreshold) trk.action = 'jump';
            else if (avgShoulderY > trk.crouchThreshold) trk.action = 'crouch';
            else trk.action = 'none';
        }
    };

    // ── Game Engine Logic ──────────────────────────────────────────────────────
    const resetGameState = () => {
        gameState.current = {
            active: true,
            speed: BASE_SPEED,
            score: 0,
            elapsedTime: 0,
            lastTime: performance.now(),
            startTime: Date.now(),
            dino: { x: 100, y: GROUND_Y, velY: 0, onGround: true, ducking: false, frame: 0 },
            obstacles: [],
            clouds: [],
            groundX: 0,
            obstacleTimer: performance.now(),
            obstacleCooldown: 1000
        };
        setScore(0);
    };

    const startGame = () => {
        resetGameState();
        requestAnimationFrame(gameLoop);
    };

    const submitScore = () => {
        if (!authUser) return;
        const finalScore = Math.floor(gameState.current.score);
        const durationSeconds = Math.floor((Date.now() - gameState.current.startTime) / 1000);
        
        authUser.getIdToken().then(tok => {
            fetch(`${API_BASE}/games/attempt/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_id: 'dino_camera_game', 
                    score: 1.0, // using raw score in game_data
                    difficulty_level: 1, 
                    completed: true,
                    game_data: { raw_score: finalScore, duration_seconds: durationSeconds },
                }),
            }).catch(() => {});
        });
    };

    const gameOver = () => {
        gameState.current.active = false;
        setScreen('gameover');
        submitScore();
    };

    // ── Physics & Rendering Loop ───────────────────────────────────────────────
    const gameLoop = (timeNow) => {
        const state = gameState.current;
        if (!state.active) return;

        const dtObj = (timeNow - state.lastTime) / 1000.0;
        const dt = Math.min(dtObj, 0.1); // cap dt to prevent death-lags
        state.lastTime = timeNow;

        // 1. Update Game Speed & Score
        state.elapsedTime += dt;
        state.speed = BASE_SPEED + (ACCEL * state.elapsedTime);
        state.score += 12.0 * dt;
        if (Math.floor(state.score) % 10 === 0) setScore(Math.floor(state.score));

        // 2. Handle Inputs
        const action = trackingState.current.action;
        const d = state.dino;

        if (action === 'jump') {
            if (d.onGround) { d.velY = -JUMP_STRENGTH; d.onGround = false; }
            d.ducking = false;
        } else if (action === 'crouch') {
            if (d.onGround) d.ducking = true;
            else d.velY += GRAVITY * 1.5; // fast fall
        } else {
            d.ducking = false;
        }

        // 3. Dino Physics & Animation
        if (!d.onGround) {
            d.velY += GRAVITY;
            d.y += d.velY;
            if (d.y >= GROUND_Y) {
                d.y = GROUND_Y;
                d.velY = 0;
                d.onGround = true;
            }
        }
        d.frame += dt * 10; // animation speed

        // 4. Spawning Obstacles
        if (timeNow - state.obstacleTimer > state.obstacleCooldown) {
            state.obstacles.push({
                x: CANVAS_WIDTH,
                y: GROUND_Y,
                spriteIdx: Math.floor(Math.random() * 6),
                width: 70, height: 80 // hitboxes
            });
            state.obstacleTimer = timeNow;
            const minCd = Math.max(500, 1800 - 0.9 * state.speed);
            const maxCd = Math.max(900, 2600 - 0.9 * state.speed);
            state.obstacleCooldown = minCd + Math.random() * (maxCd - minCd);
        }

        // Spawning Clouds
        if (Math.random() < 0.01) {
            state.clouds.push({ x: CANVAS_WIDTH, y: 50 + Math.random() * 200 });
        }

        // 5. Update Positions & Collision
        state.groundX -= state.speed * dt;
        if (state.groundX <= -CANVAS_WIDTH) state.groundX += CANVAS_WIDTH;

        // Clouds updates (slower)
        for (let i = state.clouds.length - 1; i >= 0; i--) {
            state.clouds[i].x -= Math.max(60, 0.25 * state.speed) * dt;
            if (state.clouds[i].x < -200) state.clouds.splice(i, 1);
        }

        // Dino Hitbox
        // Rect format: {l: left, r: right, t: top, b: bottom}
        const dw = d.ducking ? DINO_DUCK_W : DINO_RUN_W;
        const dh = d.ducking ? DINO_DUCK_H : DINO_RUN_H;
        // Shrink hitbox to be forgiving
        const dxOff = 15, dyOff = 10;
        const dBox = {
            l: d.x - (dw/2) + dxOff,
            r: d.x + (dw/2) - dxOff,
            t: d.y - dh + dyOff,
            b: d.y - dyOff
        };

        // Obstacles updates
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
            const obs = state.obstacles[i];
            obs.x -= state.speed * dt;
            if (obs.x < -100) {
                state.obstacles.splice(i, 1);
                continue;
            }

            // AABB Collision
            // Cactus is anchored bottom-center. Usually ~100x100 texture, shrink box slightly
            const ow = obs.width, oh = obs.height;
            const oBox = { l: obs.x - ow/2, r: obs.x + ow/2, t: obs.y - oh, b: obs.y };
            
            if (dBox.l < oBox.r && dBox.r > oBox.l && dBox.t < oBox.b && dBox.b > oBox.t) {
                gameOver();
                return; // Stop loop
            }
        }

        // 6. Draw to Canvas
        renderGame();

        // 7. Loop
        requestAnimationFrame(gameLoop);
    };

    const renderGame = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !assets.current.loaded) return;

        const ast = assets.current;
        const st = gameState.current;
        const d = st.dino;

        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Ground
        if (ast.ground) {
            ctx.drawImage(ast.ground, st.groundX, GROUND_Y - 18, CANVAS_WIDTH, 20);
            ctx.drawImage(ast.ground, st.groundX + CANVAS_WIDTH, GROUND_Y - 18, CANVAS_WIDTH, 20);
        }

        // Draw Clouds
        if (ast.cloud) {
            for (const c of st.clouds) {
                ctx.drawImage(ast.cloud, c.x, c.y, 160, 60);
            }
        }

        // Draw Obstacles
        for (const obs of st.obstacles) {
            const cImg = ast.cacti[obs.spriteIdx];
            if (cImg) {
                // draw bottom-centered
                ctx.drawImage(cImg, obs.x - 40, obs.y - 80, 80, 80);
            }
        }

        // Draw Dino
        const frameIdx = Math.floor(d.frame) % 2;
        let img = null;
        let w = DINO_RUN_W, h = DINO_RUN_H;

        if (d.ducking && d.onGround) {
            img = ast.dinoDuck[frameIdx];
            w = DINO_DUCK_W; h = DINO_DUCK_H;
        } else {
            // Jumping or running
            img = !d.onGround ? ast.dinoRun[0] : ast.dinoRun[frameIdx];
        }

        if (img) {
            // Drawn anchored at midbottom (x, y)
            ctx.drawImage(img, d.x - w/2, d.y - h, w, h);
        }

        // Draw Score Overlay
        ctx.fillStyle = '#1e1b4b';
        ctx.font = 'bold 32px "Courier New", Courier, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(st.score).toString().padStart(5, '0'), CANVAS_WIDTH - 40, 50);
        ctx.fillText(`HI: ${Math.floor(st.speed)} px/s`, CANVAS_WIDTH - 40, 90);
    };

    // ── UI Actions ─────────────────────────────────────────────────────────────
    const handleStartCalibration = () => {
        setScreen('calibrating');
        initTracker();
    };

    const handleReplay = () => {
        setScreen('playing');
        startGame();
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="dino-page">
            
            {/* The Main Menu Card */}
            {screen === 'menu' && (
                <div className="dino-card">
                    <img src="/mole.png" className="dino-hero-temp" alt="Dino Placeholder" />
                    <h1 className="dino-title">Dino Camera Runner</h1>
                    <p className="dino-desc">Control the T-Rex using your webcam! Stand up straight. <strong>Jump</strong> up to jump, and <strong>crouch</strong> down to duck under birds.</p>
                    <button className="dino-btn" onClick={handleStartCalibration}>📹 Give Camera Access & Start</button>
                    <button className="dino-btn-link" onClick={() => navigate('/kidshome')}>Back Home</button>
                </div>
            )}

            {/* Calibration Overlay */}
            {screen === 'calibrating' && (
                <div className="dino-card calib-card">
                    <h2>Stand up straight!</h2>
                    <p>We are measuring your height to understand when you jump and crouch.</p>
                    <p>Make sure your upper body is entirely visible in the camera frame.</p>
                    <div className="calib-cam-wrap">
                        {/* the hidden video element provides frames to mediapipe */}
                        <div className="pulse-ring"></div>
                    </div>
                    {trackingState.current.calibrated ? (
                        <h3 className="calib-success">Calibrated! Get ready...</h3>
                    ) : (
                        <h3>Detecting...</h3>
                    )}
                </div>
            )}

            {/* Game Over Screen Overlay */}
            {screen === 'gameover' && (
                <div className="dino-go-overlay">
                    <div className="dino-card go-card">
                        <h1>Game Over!</h1>
                        <div className="dino-score-big">{score}<span>PTS</span></div>
                        <button className="dino-btn" onClick={handleReplay}>🔄 Play Again</button>
                        <button className="dino-btn-link" onClick={() => { stopTracker(); setScreen('menu'); }}>Main Menu</button>
                    </div>
                </div>
            )}

            {/* Hidden video element for MediaPipe input (must exist when tracking is active) */}
            <video 
                ref={videoRef} 
                className="hidden-video"
                playsInline 
                autoPlay 
                muted
                style={screen === 'menu' ? {display: 'none'} : {}}
            />

            {/* The actual Game Canvas (hidden in menu) */}
            <div className={`dino-game-container ${screen === 'playing' || screen === 'gameover' ? 'active' : ''}`}>
                <canvas 
                    ref={canvasRef} 
                    width={CANVAS_WIDTH} 
                    height={CANVAS_HEIGHT} 
                    className="dino-canvas"
                />

                {/* Picture-in-Picture webcam view */}
                {(screen === 'playing' || screen === 'gameover') && (
                    <div className="dino-pip">
                        <video 
                            ref={(el) => { if(el && videoRef.current) el.srcObject = videoRef.current.srcObject; }}
                            autoPlay muted playsInline 
                            className="pip-video"
                        />
                        <div className={`pip-status ${trackingState.current.action}`}>
                            {trackingState.current.action.toUpperCase()}
                        </div>
                    </div>
                )}
            </div>
            
        </div>
    );
}
