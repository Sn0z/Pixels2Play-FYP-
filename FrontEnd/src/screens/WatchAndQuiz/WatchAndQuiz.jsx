import React, { useEffect, useRef, useState } from 'react';
import './WatchAndQuiz.css';
import { auth } from '../../FireBase/firebase';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, ''); // Use Django API directly.

const API_BASE_COURSES = `${API_BASE}/courses`;

export default function WatchAndQuiz({ videoId, moduleId }) {
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [maxWatched, setMaxWatched] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [watchedEnough, setWatchedEnough] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [details, setDetails] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [attentionAction, setAttentionAction] = useState(null);
  const [attentionNotice, setAttentionNotice] = useState(null);
  const [endedByAttention, setEndedByAttention] = useState(false);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) return;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  }, []);

  // Create player once API available
  useEffect(() => {
    let mounted = true;

    function createPlayer() {
      if (!mounted || !window.YT || !playerRef.current) return;

      playerInstanceRef.current = new window.YT.Player(playerRef.current, {
        height: '360',
        width: '640',
        videoId: videoId,
        playerVars: {
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            try {
              const d = e.target.getDuration();
              setDuration(d);
            } catch (err) {}
          },
          onStateChange: (e) => {
            // nothing special for now
          },
        },
      });
    }

    const interval = setInterval(() => {
      if (!window.YT || !window.YT.Player) return;
      if (!playerInstanceRef.current) createPlayer();
    }, 500);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (playerInstanceRef.current && playerInstanceRef.current.destroy) {
        playerInstanceRef.current.destroy();
      }
    };
  }, [videoId]);

  // Periodic time monitoring + anti-forward logic
  useEffect(() => {
    const tick = async () => {
      const player = playerInstanceRef.current;
      if (!player || !player.getCurrentTime) return;

      const cur = player.getCurrentTime();
      setCurrentTime(cur);

      // If user seeks forward beyond maxWatched + 0.6s, rewind to maxWatched
      if (cur > maxWatched + 0.6) {
        player.seekTo(maxWatched, true);
        return;
      }

      if (cur > maxWatched) {
        setMaxWatched(cur);
      }

      // Every 5 seconds send an update to server
      const nowSeconds = Math.floor(cur);
      if (nowSeconds % 5 === 0) {
        // Avoid spamming; send only on boundaries
        await sendWatchProgress(nowSeconds);
      }
    };

    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxWatched]);

  useEffect(() => {
    if (!duration) return;
    if (maxWatched >= duration * 0.95) {
      setWatchedEnough(true);
    }
  }, [maxWatched, duration]);

  // Poll attention-status and apply actions (play/pause/end)
  useEffect(() => {
    let id;
    let mounted = true;

    const poll = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        const res = await fetch(`${API_BASE_COURSES}/modules/${moduleId}/attention-status/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;

        if (data.action && data.action !== attentionAction) {
          setAttentionAction(data.action);
          const player = playerInstanceRef.current;

          if (data.action === 'play') {
            setAttentionNotice(null);
            player && player.playVideo && player.playVideo();
          }

          if (data.action === 'pause') {
            player && player.pauseVideo && player.pauseVideo();
            setAttentionNotice('Paused: please look at the screen');
          }

          if (data.action === 'end') {
            player && player.pauseVideo && player.pauseVideo();
            setEndedByAttention(true);
            setAttentionNotice(data.message || 'Course ended due to inactivity');
          }
        }
      } catch (err) {
        // silent
        console.error('attention poll error', err);
      }
    };

    if (playerInstanceRef.current) {
      poll();
      id = setInterval(poll, 2000);
    }

    return () => {
      mounted = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, attentionAction]);

  const sendWatchProgress = async (current_time) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      await fetch(`${API_BASE_COURSES}/modules/${moduleId}/watch/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ current_time }),
      });
    } catch (err) {
      // silent
      console.error('sendWatchProgress error', err);
    }
  };

  const fetchQuiz = async () => {
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) {
        setError('Please sign in first');
        return;
      }
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE_COURSES}/modules/${moduleId}/quiz/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch quiz');
      const data = await res.json();
      setQuiz(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch quiz');
    }
  };

  const submitQuiz = async () => {
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) {
        setError('Please sign in first');
        return;
      }
      const token = await user.getIdToken();

      const payload = Object.entries(answers).map(([question_id, choice_id]) => ({ question_id, choice_id }));

      const res = await fetch(`${API_BASE_COURSES}/modules/${moduleId}/quiz/submit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: payload }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit quiz');
      }

      const data = await res.json();
      setScore(data.score);
      setCompleted(data.completed);
      setDetails(data.details || null);
    } catch (err) {
      setError(err.message || 'Submit failed');
    }
  };

  const onChoice = (questionId, choiceId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  return (
    <div className="watch-container">
      <div className="video-area">
        <div ref={playerRef} className="video-player" />
        <div className="video-stats">
          <div>Time: {Math.floor(currentTime)}s</div>
          <div>Max watched: {Math.floor(maxWatched)}s</div>
          <div>Duration: {Math.floor(duration)}s</div>
        </div>
        {!watchedEnough && <div className="notice">Watch at least 95% to enable quiz</div>}
        {attentionNotice && <div className="attention-notice">{attentionNotice}</div>}
        {endedByAttention && <div className="error">{attentionNotice || 'Course ended due to inactivity'}</div>}
        {watchedEnough && !quiz && !endedByAttention && (
          <button className="primary" onClick={fetchQuiz}>Start Quiz</button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {quiz && (
        <div className="quiz-area">
          <h3>Quiz</h3>
          {quiz.map((q) => (
            <div key={q.id} className="question">
              <div className="q-text">{q.text}</div>
              <div className="choices">
                {q.choices.map((c) => {
                  const selected = answers[q.id] === c.id;
                  const feedback = score !== null && details && details.find(d => d.question_id === q.id);
                  const isCorrect = feedback ? feedback.is_correct : null;
                  return (
                    <label
                      key={c.id}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onChoice(q.id, c.id);
                        }
                      }}
                      className={`choice ${selected ? 'selected' : ''} ${isCorrect !== null ? (isCorrect ? 'correct' : (selected ? 'incorrect' : '')) : ''}`}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={selected}
                        onChange={() => onChoice(q.id, c.id)}
                      />
                      {c.text}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="quiz-actions">
            <button className="primary" onClick={submitQuiz} disabled={Object.keys(answers).length < quiz.length || endedByAttention}>Submit Quiz</button>
          </div>

          {score !== null && (
            <div className="result" role="status" aria-live="polite">Score: {(score * 100).toFixed(0)}% — {completed ? 'Module completed 🎉' : 'Not completed yet'}</div>
          )}
        </div>
      )}
    </div>
  );
}
