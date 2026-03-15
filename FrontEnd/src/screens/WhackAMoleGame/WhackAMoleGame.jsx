import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './WhackAMoleGame.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const auth = getAuth();
const GAME_DURATION = 60;

// ── Audio Engine (Web Audio API) ──────────────────────────────────────────────
function createAudioEngine() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        function playTone(freq, type, duration, gainVal = 0.3, startTime = ctx.currentTime) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(gainVal, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        }

        function playCorrect() {
            // Happy ascending chord: C5 E5 G5
            const now = ctx.currentTime;
            playTone(523, 'sine', 0.18, 0.4, now);
            playTone(659, 'sine', 0.18, 0.4, now + 0.1);
            playTone(784, 'sine', 0.28, 0.4, now + 0.2);
        }

        function playWrong() {
            // Descending buzzer
            const now = ctx.currentTime;
            playTone(220, 'sawtooth', 0.12, 0.25, now);
            playTone(180, 'sawtooth', 0.14, 0.25, now + 0.1);
            playTone(140, 'sawtooth', 0.18, 0.2, now + 0.2);
        }

        // Background music — simple looping melody
        let bgNodes = [];
        let bgInterval = null;
        let bgMuted = false;

        const melody = [
            [523, 0.18], [659, 0.18], [784, 0.18], [659, 0.18],
            [523, 0.35], [440, 0.18], [494, 0.18], [523, 0.35],
            [392, 0.18], [440, 0.18], [494, 0.18], [523, 0.18],
            [587, 0.35], [659, 0.35],
        ];

        function playBgBeat() {
            if (bgMuted) return;
            let offset = ctx.currentTime;
            melody.forEach(([freq, dur]) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.connect(g); g.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq * 0.5, offset); // bass octave, softer
                g.gain.setValueAtTime(0.06, offset);
                g.gain.exponentialRampToValueAtTime(0.001, offset + dur * 0.9);
                osc.start(offset); osc.stop(offset + dur);
                offset += dur;
                bgNodes.push(osc);
            });
        }

        function startBg() {
            bgMuted = false;
            playBgBeat();
            const totalDur = melody.reduce((s, [, d]) => s + d, 0) * 1000;
            bgInterval = setInterval(() => { if (!bgMuted) playBgBeat(); }, totalDur);
        }

        function stopBg() {
            bgMuted = true;
            clearInterval(bgInterval);
            bgNodes.forEach(n => { try { n.stop(); } catch (_) {} });
            bgNodes = [];
        }

        function toggleBg() {
            if (bgMuted) startBg();
            else stopBg();
            return !bgMuted;
        }

        return { playCorrect, playWrong, startBg, stopBg, toggleBg, resume: () => ctx.resume() };
    } catch {
        // No audio support — return no-ops
        return {
            playCorrect: () => {}, playWrong: () => {},
            startBg: () => {}, stopBg: () => {}, toggleBg: () => true, resume: () => {},
        };
    }
}

// ── Math helpers ──────────────────────────────────────────────────────────────
function generateProblem(difficulty) {
    let a, b, op;
    if (difficulty === 1) {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
        op = '+';
    } else if (difficulty === 2) {
        a = Math.floor(Math.random() * 16) + 10;
        b = Math.floor(Math.random() * 15) + 1;
        op = Math.random() > 0.5 ? '+' : '-';
    } else {
        a = Math.floor(Math.random() * 31) + 20;
        b = Math.floor(Math.random() * 41) + 10;
        op = Math.random() > 0.5 ? '+' : '-';
    }
    const ans = op === '+' ? a + b : a - b;
    return { problem: `${a} ${op} ${b}`, answer: ans };
}

function getMoleCount(d) {
    return d === 1 ? Math.floor(Math.random() * 2) + 3
         : d === 2 ? Math.floor(Math.random() * 2) + 5
         :           Math.floor(Math.random() * 2) + 8;
}

function generateWrongAnswers(correct, count) {
    const s = new Set();
    while (s.size < count) {
        const delta = Math.floor(Math.random() * 12) + 1;
        const w = Math.random() > 0.5 ? correct + delta : correct - delta;
        if (w !== correct) s.add(w);
    }
    return [...s];
}

const DIFF_CONFIG = [
    { level: 1, label: 'Easy',   emoji: '🌱', sub: '3–4 moles', color: '#16a34a', border: '#bbf7d0' },
    { level: 2, label: 'Medium', emoji: '⚡', sub: '5–6 moles', color: '#d97706', border: '#fde68a' },
    { level: 3, label: 'Hard',   emoji: '🔥', sub: '8–9 moles', color: '#dc2626', border: '#fecaca' },
];

// ── Mole Hole component ───────────────────────────────────────────────────────
function MoleHole({ value, isUp, isCorrect, onWhack }) {
    const [hammerVisible, setHammerVisible] = useState(false);
    const [whacked, setWhacked] = useState(false);

    const handleClick = () => {
        if (!isUp || whacked) return;
        setHammerVisible(true);
        setWhacked(true);
        setTimeout(() => setHammerVisible(false), 400);
        onWhack(isCorrect);
    };

    useEffect(() => {
        if (isUp) setWhacked(false);
    }, [isUp]);

    return (
        <div className="mole-hole" onClick={handleClick}>
            {/* Dirt hole — sits on top */}
            <div className="hole-shadow" />

            {/* Clip zone — hides mole below ground */}
            <div className="hole-clip">
                <div className={`mole-wrap ${isUp ? 'up' : 'down'} ${whacked ? 'whacked' : ''}`}>
                    {/* Mole image + number overlay in one relative box */}
                    <div className="mole-img-wrap">
                        <img
                            src={whacked ? '/dizzy-mole.png' : '/mole.png'}
                            className={`mole-img ${whacked ? 'mole-dizzy' : ''}`}
                            alt="mole"
                            draggable="false"
                        />
                        {/* Number overlaid directly on where the sign is */}
                        <div className="mole-sign-number">{value}</div>
                    </div>
                </div>
            </div>

            {/* Hammer */}
            {hammerVisible && (
                <div className={`hammer ${isCorrect ? 'hit-correct' : 'hit-wrong'}`}>🔨</div>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WhackAMoleGame() {
    const navigate = useNavigate();
    const [authUser, setAuthUser] = useState(null);
    const [screen, setScreen] = useState('menu');
    const [difficulty, setDifficulty] = useState(1);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [score, setScore] = useState(0);
    const [answered, setAnswered] = useState(0);
    const [{ problem, answer }, setProblem] = useState({ problem: '', answer: 0 });
    const [moles, setMoles] = useState([]);
    const [flash, setFlash] = useState(null);
    const [musicOn, setMusicOn] = useState(true);

    const timerRef = useRef(null);
    const moleTimersRef = useRef([]);
    const audioRef = useRef(null);
    const startTimeRef = useRef(null);

    useEffect(() => {
        audioRef.current = createAudioEngine();
    }, []);

    // ── Auth ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) setAuthUser(u);
            else navigate('/login');
        });
        return () => unsub();
    }, [navigate]);

    // ── Mole spawning ─────────────────────────────────────────────────────────
    const spawnMoles = useCallback((diff, ans) => {
        const count = getMoleCount(diff);
        const wrongs = generateWrongAnswers(ans, count - 1);
        const answers = [ans, ...wrongs].sort(() => Math.random() - 0.5);
        const newMoles = answers.map((v, i) => ({ id: i, value: v, isCorrect: v === ans, isUp: false }));
        setMoles(newMoles);
        moleTimersRef.current.forEach(clearTimeout);
        moleTimersRef.current = [];
        newMoles.forEach((_, i) => {
            const t = setTimeout(() => {
                setMoles(prev => prev.map(m => m.id === i ? { ...m, isUp: true } : m));
            }, i * 160 + Math.random() * 150);
            moleTimersRef.current.push(t);
        });
    }, []);

    const nextProblem = useCallback((diff) => {
        const { problem: p, answer: a } = generateProblem(diff);
        setProblem({ problem: p, answer: a });
        spawnMoles(diff, a);
    }, [spawnMoles]);

    // ── Start game ────────────────────────────────────────────────────────────
    const startGame = useCallback(() => {
        audioRef.current?.resume();
        startTimeRef.current = Date.now();
        setScore(0); setAnswered(0); setTimeLeft(GAME_DURATION); setFlash(null);
        setScreen('playing');
        nextProblem(difficulty);
        if (musicOn) audioRef.current?.startBg();
    }, [difficulty, nextProblem, musicOn]);

    // ── Timer ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (screen !== 'playing') return;
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timerRef.current); setScreen('gameover'); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [screen]);

    // Stop music on game over
    useEffect(() => {
        if (screen === 'gameover') {
            audioRef.current?.stopBg();
        }
    }, [screen]);

    // ── Score submit ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (screen !== 'gameover' || !authUser) return;
        const finalScore = answered > 0 ? Math.min(1, score / answered) : 0;
        authUser.getIdToken().then(tok => {
            fetch(`${API_BASE}/games/attempt/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_id: 'whack_a_mole_math', score: finalScore,
                    difficulty_level: difficulty, completed: true,
                    game_data: { 
                        raw_score: score, 
                        total_attempted: answered,
                        duration_seconds: startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0
                    },
                }),
            }).catch(() => {});
        });
    }, [screen]); // eslint-disable-line

    // ── Whack ─────────────────────────────────────────────────────────────────
    const handleWhack = useCallback((isCorrect) => {
        if (isCorrect) {
            audioRef.current?.playCorrect();
            setScore(s => s + 1); setAnswered(a => a + 1);
            setFlash('correct'); setTimeout(() => setFlash(null), 350);
            setMoles(prev => prev.map(m => ({ ...m, isUp: false })));
            setTimeout(() => nextProblem(difficulty), 500);
        } else {
            audioRef.current?.playWrong();
            setScore(s => Math.max(0, s - 1));
            setFlash('wrong'); setTimeout(() => setFlash(null), 350);
        }
    }, [difficulty, nextProblem]);

    // ── Music toggle ──────────────────────────────────────────────────────────
    const handleMusicToggle = () => {
        audioRef.current?.resume();
        const newState = audioRef.current?.toggleBg();
        setMusicOn(newState ?? !musicOn);
    };

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => () => {
        clearInterval(timerRef.current);
        moleTimersRef.current.forEach(clearTimeout);
        audioRef.current?.stopBg();
    }, []);

    const cols = difficulty === 1 ? 3 : difficulty === 2 ? 3 : 4;
    const timePct = (timeLeft / GAME_DURATION) * 100;
    const timerColor = timeLeft > 20 ? '#16a34a' : timeLeft > 10 ? '#d97706' : '#dc2626';

    // ── MENU ──────────────────────────────────────────────────────────────────
    if (screen === 'menu') return (
        <div className="wam-page">
            <div className="wam-card">
                <div className="wam-hero-wrap">
                    <img src="/mole.png" className="wam-hero-mole" alt="mole mascot" />
                </div>
                <h1 className="wam-title">Whack-a-Mole Math!</h1>
                <p className="wam-desc">Solve the equation, then <strong>whack</strong> the mole holding the right answer!</p>

                <p className="wam-pick-label">Select Difficulty</p>
                <div className="wam-diff-row">
                    {DIFF_CONFIG.map(d => (
                        <button
                            key={d.level}
                            className={`wam-diff-btn ${difficulty === d.level ? 'active' : ''}`}
                            style={difficulty === d.level ? { borderColor: d.color, background: d.border } : {}}
                            onClick={() => setDifficulty(d.level)}
                        >
                            <span className="wam-diff-emoji">{d.emoji}</span>
                            <span className="wam-diff-name" style={difficulty === d.level ? { color: d.color } : {}}>{d.label}</span>
                            <span className="wam-diff-sub">{d.sub}</span>
                        </button>
                    ))}
                </div>

                <button className="wam-play-btn" onClick={startGame}>🎮 Play Now</button>
                <button className="wam-back-link" onClick={() => navigate('/kidshome')}>← Back to Home</button>
            </div>
        </div>
    );

    // ── GAME OVER ─────────────────────────────────────────────────────────────
    if (screen === 'gameover') {
        const acc = answered > 0 ? Math.round((score / answered) * 100) : 0;
        const emoji = score >= 10 ? '🏆' : score >= 5 ? '⭐' : '💪';
        const msg = score >= 10 ? "Outstanding! You're a math wizard! 🧙" : score >= 5 ? "Great job! Keep practising!" : "Nice try! You'll do better next time!";
        return (
            <div className="wam-page">
                <div className="wam-card gameover-card">
                    <div className="wam-go-emoji">{emoji}</div>
                    <h1 className="wam-title">Game Over!</h1>
                    <div className="wam-stats-grid">
                        <div className="wam-stat purple"><span>{score}</span><label>Score</label></div>
                        <div className="wam-stat blue"><span>{answered}</span><label>Answered</label></div>
                        <div className="wam-stat green"><span>{acc}%</span><label>Accuracy</label></div>
                    </div>
                    <p className="wam-verdict">{msg}</p>
                    <div className="wam-go-btns">
                        <button className="wam-play-btn" onClick={startGame}>🔄 Play Again</button>
                        <button className="wam-secondary-btn" onClick={() => setScreen('menu')}>Change Difficulty</button>
                    </div>
                    <button className="wam-back-link" onClick={() => navigate('/kidshome')}>← Back to Home</button>
                </div>
            </div>
        );
    }

    // ── PLAYING ───────────────────────────────────────────────────────────────
    return (
        <div className={`wam-page playing ${flash ? `flash-${flash}` : ''}`}>
            {/* HUD */}
            <div className="wam-hud">
                <div className="wam-hud-item">
                    <span className="hud-label">Score</span>
                    <span className="hud-value score-val">{score}</span>
                </div>
                <div className="wam-hud-problem">
                    <span className="problem-text">{problem} = ?</span>
                </div>
                <div className="wam-hud-item">
                    <span className="hud-label">Time</span>
                    <span className="hud-value" style={{ color: timerColor }}>{timeLeft}s</span>
                </div>
                <button className="wam-music-btn" onClick={handleMusicToggle} title="Toggle music">
                    {musicOn ? '🎵' : '🔇'}
                </button>
            </div>

            {/* Timer bar */}
            <div className="wam-timer-bar">
                <div className="wam-timer-fill" style={{ width: `${timePct}%`, background: timerColor }} />
            </div>

            {/* Field */}
            <div className="wam-field">
                <div className="wam-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                    {moles.map(m => (
                        <MoleHole
                            key={m.id}
                            value={m.value}
                            isUp={m.isUp}
                            isCorrect={m.isCorrect}
                            onWhack={handleWhack}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
