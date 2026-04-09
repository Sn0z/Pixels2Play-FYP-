import React, { useEffect, useRef, useState } from 'react';
import './WatchAndQuiz.css';
import { auth } from '../../FireBase/firebase';
import KidsChatbot from '../../chatbot/Chatbot';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

const API_BASE_COURSES = `${API_BASE}/courses`;

export default function WatchAndQuiz({ videoId, moduleId, moduleTitle = '' }) {
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const maxWatchedRef = useRef(0);
  const lastProgressSecondRef = useRef(-1);
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

  // Chatbot states
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatAutoPrompt, setChatAutoPrompt] = useState(null);
  const [wrongAnswerContext, setWrongAnswerContext] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);

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
        playerVars: { controls: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => {
            try { setDuration(e.target.getDuration()); } catch (err) {}
          },
          onStateChange: () => {},
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
      if (playerInstanceRef.current?.destroy) playerInstanceRef.current.destroy();
    };
  }, [videoId]);

  // Periodic time monitoring + anti-forward logic
  useEffect(() => {
    const tick = async () => {
      const player = playerInstanceRef.current;
      if (!player || !player.getCurrentTime) return;

      const cur = player.getCurrentTime();
      setCurrentTime(cur);

      const mw = maxWatchedRef.current || 0;
      if (cur > mw + 0.6) { player.seekTo(mw, true); return; }
      if (cur > mw) { maxWatchedRef.current = cur; setMaxWatched(cur); }

      const nowSeconds = Math.floor(cur);
      if (nowSeconds % 5 === 0 && lastProgressSecondRef.current !== nowSeconds) {
        lastProgressSecondRef.current = nowSeconds;
        await sendWatchProgress(nowSeconds);
      }
    };

    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [moduleId]);

  useEffect(() => {
    if (!duration) return;
    if (maxWatched >= duration * 0.95) setWatchedEnough(true);
  }, [maxWatched, duration]);

  // Poll attention-status
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
          if (data.action === 'play') { setAttentionNotice(null); player?.playVideo?.(); }
          if (data.action === 'pause') { player?.pauseVideo?.(); setAttentionNotice('Paused: please look at the screen'); }
          if (data.action === 'end') {
            player?.pauseVideo?.();
            setEndedByAttention(true);
            setAttentionNotice(data.message || 'Course ended due to inactivity');
          }
        }
      } catch (err) { console.error('attention poll error', err); }
    };

    if (playerInstanceRef.current) {
      poll();
      id = setInterval(poll, 2000);
    }

    return () => { mounted = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, attentionAction]);

  const sendWatchProgress = async (current_time) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(`${API_BASE_COURSES}/modules/${moduleId}/watch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_time }),
      });
    } catch (err) { console.error('sendWatchProgress error', err); }
  };

  const fetchQuiz = async () => {
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) { setError('Please sign in first'); return; }
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_COURSES}/modules/${moduleId}/quiz/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch quiz');
      setQuiz(await res.json());
    } catch (err) { setError(err.message || 'Failed to fetch quiz'); }
  };

  // Fetch courses list for recommendations
  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_BASE}/courses/`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  };

  const submitQuiz = async () => {
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) { setError('Please sign in first'); return; }
      const token = await user.getIdToken();

      const payload = Object.entries(answers).map(([question_id, choice_id]) => ({
        question_id,
        choice_id,
      }));

      const res = await fetch(`${API_BASE_COURSES}/modules/${moduleId}/quiz/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: payload }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit quiz');
      }

      const data = await res.json();
      setScore(data.score);
      setCompleted(data.completed);

      const detailsData = data.details || null;
      setDetails(detailsData);

      // ── Detect wrong answers and build Pixel context ──────────────────────
      if (detailsData && quiz) {
        const wrongItems = detailsData.filter((d) => !d.is_correct);

        if (wrongItems.length > 0) {
          // Build rich context for each wrong answer
          const context = wrongItems.map((wrong) => {
            const question = quiz.find((q) => q.id === wrong.question_id);
            const selectedChoice = question?.choices?.find(
              (c) => c.id === wrong.selected_choice_id
            );
            const correctChoice = question?.choices?.find(
              (c) => c.id === wrong.correct_choice_id
            );
            return {
              questionText: question?.text || 'a question',
              theirAnswer: selectedChoice?.text || 'their answer',
              correctAnswer: correctChoice?.text || 'the correct answer',
            };
          });

          setWrongAnswerContext(context);

          // Build Pixel's auto-prompt
          const topic = moduleTitle || 'this topic';
          
          const quizText = quiz.map((q, i) => {
            const wrongItem = wrongItems.find(w => w.question_id === q.id);
            const myChoiceId = wrongItem ? wrongItem.selected_choice_id : answers[q.id];
            const myChoice = q.choices?.find(c => c.id === myChoiceId);
            const correctChoice = q.choices?.find(c => c.is_correct);

            const optionsText = q.choices?.map(c => `- ${c.text} ${c.is_correct ? '(Correct)' : ''}`).join('\n');
            const answerStatus = myChoiceId === correctChoice?.id ? '✅' : '❌';
            return `Question ${i + 1}: ${q.text}\nOptions:\n${optionsText}\nMy Answer: ${myChoice?.text || 'None'} ${answerStatus}`;
          }).join('\n\n');

          const autoPrompt = `Hi Pixel! I just took a quiz about "${topic}". Here is the quiz and my answers:\n\n${quizText}\n\nI got ${wrongItems.length} question${wrongItems.length > 1 ? 's' : ''} wrong. Can you explain where I made mistakes and why they are wrong in a simple, kid-friendly way?`;

          setChatAutoPrompt(autoPrompt);

          // Save to localStorage to persist review context
          localStorage.setItem(`quiz_watch_${moduleId}_${user.uid}_answers`, JSON.stringify(answers));
          localStorage.setItem(`quiz_watch_${moduleId}_${user.uid}_details`, JSON.stringify(detailsData));
          localStorage.setItem(`quiz_watch_${moduleId}_${user.uid}_quiz`, JSON.stringify(quiz));

          // Fetch courses for recommendations
          const allCourses = await fetchCourses();
          // Pick up to 3 relevant courses (simple keyword match on title/category)
          const topicWords = topic.toLowerCase().split(/\s+/);
          const matched = allCourses
            .filter((c) =>
              topicWords.some(
                (w) =>
                  w.length > 3 &&
                  (
                    c.title?.toLowerCase().includes(w) ||
                    c.category?.toLowerCase().includes(w) ||
                    c.description?.toLowerCase().includes(w)
                  )
              )
            )
            .slice(0, 3);

          // If no matches, just use first 2 courses as fallback
          setRecommendedCourses(matched.length > 0 ? matched : allCourses.slice(0, 2));
        }
      }
    } catch (err) { setError(err.message || 'Submit failed'); }
  };

  const onChoice = (questionId, choiceId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  const hasWrongAnswers = details && details.some((d) => !d.is_correct);

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

      {quiz && !endedByAttention && (
        <div className="quiz-area">
          <h3>Quiz</h3>
          {quiz.map((q) => (
            <div key={q.id} className="question">
              <div className="q-text">{q.text}</div>
              <div className="choices">
                {q.choices.map((c) => {
                  const selected = answers[q.id] === c.id;
                  const feedback = score !== null && details && details.find((d) => d.question_id === q.id);
                  const isCorrect = feedback ? feedback.is_correct : null;
                  const isThisCorrectChoice = feedback ? c.id === feedback.correct_choice_id : false;
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
                      className={`choice ${selected ? 'selected' : ''} ${
                        isCorrect !== null
                          ? isCorrect
                            ? 'correct'
                            : selected
                            ? 'incorrect'
                            : isThisCorrectChoice
                            ? 'show-correct'
                            : ''
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={selected}
                        onChange={() => onChoice(q.id, c.id)}
                      />
                      {c.text}
                      {score !== null && isThisCorrectChoice && !isCorrect && (
                        <span className="correct-answer-hint"> ✓ Correct answer</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="quiz-actions">
            <button
              className="primary"
              onClick={submitQuiz}
              disabled={Object.keys(answers).length < quiz.length || endedByAttention || score !== null}
            >
              {score !== null ? 'Submitted ✓' : 'Submit Quiz'}
            </button>
          </div>

          {score !== null && (
            <div className={`result ${completed ? 'result-passed' : 'result-failed'}`} role="status" aria-live="polite">
              {completed
                ? `🎉 Amazing! You scored ${(score * 100).toFixed(0)}% — Module completed!`
                : `📊 You scored ${(score * 100).toFixed(0)}% — Keep learning and try again!`}
            </div>
          )}
        </div>
      )}

      {/* ── Pixel Help Panel — shown when kid has wrong answers ─────────── */}
      {hasWrongAnswers && (
        <div className="pixel-help-panel">
          <div className="pixel-help-icon">🤖</div>
          <div className="pixel-help-content">
            <h4 className="pixel-help-title">Don't worry! Pixel can help you! 🌟</h4>
            <p className="pixel-help-desc">
              You got{' '}
              <strong>{details.filter((d) => !d.is_correct).length} question{details.filter((d) => !d.is_correct).length > 1 ? 's' : ''}</strong>{' '}
              wrong. Let me explain what happened and suggest a course to help you improve!
            </p>
            <button
              className="pixel-help-btn"
              onClick={() => setShowChatbot(true)}
            >
              <span className="pixel-help-btn-icon">💬</span>
              Ask Pixel to Explain My Mistakes
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Chatbot Overlay ─────────────────────────────────────── */}
      {showChatbot && (
        <div className="chatbot-overlay">
          <KidsChatbot
            floating={true}
            onClose={() => setShowChatbot(false)}
            autoPrompt={chatAutoPrompt}
            recommendedCourses={recommendedCourses}
            quizHelpMode={true}
          />
        </div>
      )}

      {/* ── Floating Chatbot Button (hidden entirely when quiz is loaded) ── */}
      {!quiz && (
        <>
          <button
            className="chatbot-float-btn"
            onClick={() => setChatOpen((o) => !o)}
            title="Ask Pixel - AI Study Buddy"
          >
            {chatOpen ? "✕" : "🤖"}
            <span className="float-tooltip">Ask Pixel!</span>
          </button>
          {chatOpen && (
            <div className="chatbot-float-panel">
              <KidsChatbot floating={true} onClose={() => setChatOpen(false)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
