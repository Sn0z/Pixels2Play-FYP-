import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./ChildLearnPage.css";
import KidsChatbot from "../../chatbot/Chatbot";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const auth = getAuth();

// ── Pixel AI chatbot overlay ──────────────────────────────────────────────────
function PixelHelpOverlay({ autoPrompt, recommendedCourses, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px',
        animation: 'clp-fadeIn 0.25s ease',
      }}
    >
      <KidsChatbot
        floating={true}
        onClose={onClose}
        autoPrompt={autoPrompt}
        recommendedCourses={recommendedCourses}
        quizHelpMode={true}
      />
    </div>
  );
}

// ── Quiz Component ────────────────────────────────────────────────────────────
function QuizComponent({ quiz, onComplete, initialScore, courseTitle, userId, moduleId }) {
  const localStorageKey = `quiz_learn_${moduleId}_${userId}`;

  const [answers, setAnswers] = useState(() => {
    if (initialScore !== null) {
      try {
        const stored = localStorage.getItem(localStorageKey + '_answers');
        if (stored) return JSON.parse(stored);
      } catch (e) { }
    }
    return {};
  });

  const [submitted, setSubmitted] = useState(initialScore !== null);
  const [results, setResults] = useState(() => {
    if (initialScore !== null) {
      try {
        const stored = localStorage.getItem(localStorageKey + '_results');
        if (stored) return JSON.parse(stored);
      } catch (e) { }
    }
    return null;
  });
  const [score, setScore] = useState(initialScore);

  // Pixel chatbot state
  const [showPixel, setShowPixel] = useState(false);
  const [pixelPrompt, setPixelPrompt] = useState(null);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const hasFetchedCourses = useRef(false);

  const handleSelect = (qId, choiceId) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: choiceId }));
  };

  const handleSubmit = async () => {
    let correct = 0;
    const res = {};
    const wrongItems = [];

    quiz.questions.forEach((q) => {
      const selected = answers[q.id];
      const correctChoice = q.choices.find((c) => c.is_correct);
      const selectedChoice = q.choices.find((c) => c.id === selected);
      const isCorrect = selected === correctChoice?.id;
      if (isCorrect) correct++;
      else {
        wrongItems.push({
          questionText: q.text,
          theirAnswer: selectedChoice?.text || 'their answer',
          correctAnswer: correctChoice?.text || 'the correct answer',
        });
      }
      res[q.id] = { selected, correctId: correctChoice?.id, isCorrect };
    });

    const sc = correct / quiz.questions.length;
    setScore(sc);
    setResults(res);
    setSubmitted(true);
    if (onComplete) onComplete(sc);

    if (userId) {
      localStorage.setItem(localStorageKey + '_answers', JSON.stringify(answers));
      localStorage.setItem(localStorageKey + '_results', JSON.stringify(res));
    }

    if (wrongItems.length > 0) {
      const topic = courseTitle || quiz.title || 'this topic';
      const quizText = quiz.questions.map((q, i) => {
        const correctChoice = q.choices.find(c => c.is_correct);
        const myChoiceId = answers[q.id];
        const myChoice = q.choices.find(c => c.id === myChoiceId);
        const optionsText = q.choices.map(c => `- ${c.text} ${c.is_correct ? '(Correct)' : ''}`).join('\n');
        const answerStatus = myChoiceId === correctChoice?.id ? '[Correct]' : '[Wrong]';
        return `Question ${i + 1}: ${q.text}\nOptions:\n${optionsText}\nMy Answer: ${myChoice?.text || 'None'} ${answerStatus}`;
      }).join('\n\n');

      const prompt = `Hi Pixel! I just took a quiz about "${topic}". Here is the quiz and my answers:\n\n${quizText}\n\nI got ${wrongItems.length} question${wrongItems.length > 1 ? 's' : ''} wrong. Can you explain where I made mistakes and why they are wrong in a simple, kid-friendly way?`;
      setPixelPrompt(prompt);

      if (!hasFetchedCourses.current) {
        hasFetchedCourses.current = true;
        try {
          const res2 = await fetch(`${API_BASE}/courses/`);
          const data = res2.ok ? await res2.json() : [];
          const allCourses = Array.isArray(data) ? data : [];
          const topicWords = topic.toLowerCase().split(/\s+/);
          const matched = allCourses
            .filter((c) => topicWords.some((w) => w.length > 3 && (
              c.title?.toLowerCase().includes(w) ||
              c.category?.toLowerCase().includes(w) ||
              c.description?.toLowerCase().includes(w)
            )))
            .slice(0, 3);
          setRecommendedCourses(matched.length > 0 ? matched : allCourses.slice(0, 2));
        } catch {
          setRecommendedCourses([]);
        }
      }
    }
  };

  const wrongCount = results ? quiz.questions.filter((q) => !results[q.id]?.isCorrect).length : 0;

  return (
    <div className="clp-quiz">
      <div className="clp-quiz-header">
        <h3 className="clp-quiz-title">{quiz.title}</h3>
        <p className="clp-quiz-subtitle">Answer all questions, then click Submit!</p>
      </div>

      {quiz.questions.map((q, qIdx) => {
        const res = results?.[q.id];
        return (
          <div key={q.id} className={`clp-question ${res ? (res.isCorrect ? "q-correct" : "q-wrong") : ""}`}>
            <p className="clp-q-text">
              <span className="clp-q-num">Q{qIdx + 1}.</span> {q.text}
            </p>
            <div className="clp-choices">
              {q.choices.map((c) => {
                const isSelected = answers[q.id] === c.id;
                const isCorrect = c.is_correct;
                let cls = "clp-choice";
                if (submitted && isCorrect) cls += " choice-correct";
                else if (submitted && isSelected && !isCorrect) cls += " choice-wrong";
                else if (!submitted && isSelected) cls += " choice-selected";

                return (
                  <button
                    key={c.id}
                    className={cls}
                    onClick={() => handleSelect(q.id, c.id)}
                    disabled={submitted}
                  >
                    <span className="clp-choice-dot" />
                    {c.text}
                    {submitted && isCorrect && <span className="clp-tick">✓</span>}
                    {submitted && isSelected && !isCorrect && <span className="clp-cross">✗</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {!submitted ? (
        <button
          className="clp-submit-btn"
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < quiz.questions.length}
        >
          Submit Answers
        </button>
      ) : (
        <>
          <div className="clp-score-result">
            {score >= 0.9
              ? "Amazing! You're an AI genius!"
              : score >= 0.7
                ? "Great job! Keep it up!"
                : "Good try! Review and try again!"}
            <span className="clp-score-num">{Math.round(score * 100)}%</span>
          </div>

          {wrongCount > 0 && (
            <div className="clp-pixel-help-panel">
              <div className="clp-pixel-content">
                <h4 className="clp-pixel-title">Don't worry! Pixel can help!</h4>
                <p className="clp-pixel-desc">
                  You got <strong>{wrongCount} question{wrongCount > 1 ? 's' : ''}</strong> wrong.
                  Let me explain what happened and suggest what to study next!
                </p>
                <button className="clp-pixel-btn" onClick={() => setShowPixel(true)}>
                  Ask Pixel to Explain My Mistakes
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showPixel && (
        <PixelHelpOverlay
          autoPrompt={pixelPrompt}
          recommendedCourses={recommendedCourses}
          onClose={() => setShowPixel(false)}
        />
      )}
    </div>
  );
}

// ── Coding Challenge Component ────────────────────────────────────────────────
function CodingChallenge({ challenge, onComplete, isCompleted, moduleId, userId }) {
  const [code, setCode] = useState(challenge?.initial_code || '');
  const [feedback, setFeedback] = useState(null); // null | 'pass' | 'fail' | 'partial'
  const [submitted, setSubmitted] = useState(isCompleted);

  const validateCode = () => {
    if (!code.trim()) {
      setFeedback('empty');
      return;
    }
    const regex = challenge?.validation_regex ? new RegExp(challenge.validation_regex, 's') : null;
    const passed = regex ? regex.test(code) : code.trim().length > 0;
    setFeedback(passed ? 'pass' : 'fail');
    if (passed) {
      setSubmitted(true);
      if (onComplete) onComplete(code);
    }
  };

  return (
    <div className="clp-coding-panel">
      <div className="clp-coding-header">
        <div>
          <h3 className="clp-coding-title">Coding Challenge</h3>
          <p className="clp-coding-subtitle">Write your Python code below!</p>
        </div>
        {submitted && <span className="clp-coding-badge">✓ Completed</span>}
      </div>

      <div className="clp-coding-task">
        <span className="clp-task-label">Your Task:</span>
        <p className="clp-task-text">{challenge?.task || 'Complete the coding task!'}</p>
      </div>

      <div className="clp-editor-wrapper">
        <div className="clp-editor-bar">
          <span className="clp-editor-dot clp-dot-red" />
          <span className="clp-editor-dot clp-dot-yellow" />
          <span className="clp-editor-dot clp-dot-green" />
          <span className="clp-editor-lang">Python</span>
        </div>
        <textarea
          className="clp-code-editor"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setFeedback(null);
          }}
          disabled={submitted}
          spellCheck={false}
          placeholder="# Write your Python code here..."
          rows={10}
        />
      </div>

      {!submitted && (
        <button className="clp-run-btn" onClick={validateCode}>
          Run & Submit Code
        </button>
      )}

      {feedback === 'pass' && (
        <div className="clp-code-feedback clp-feedback-pass">
          Excellent! Your code looks great! Coding challenge completed!
        </div>
      )}
      {feedback === 'fail' && (
        <div className="clp-code-feedback clp-feedback-fail">
          Not quite right. Check the task description and try again!
          <br /><small>Hint: Make sure you're using the right Python syntax.</small>
        </div>
      )}
      {feedback === 'empty' && (
        <div className="clp-code-feedback clp-feedback-fail">
          Please write some code before submitting!
        </div>
      )}
      {submitted && (
        <div className="clp-code-feedback clp-feedback-pass">
          Coding challenge completed! Move on to the next lesson.
        </div>
      )}
    </div>
  );
}

// ── XP Badge Component ────────────────────────────────────────────────────────
function XPToast({ xp }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="clp-xp-toast">
      +{xp} XP earned!
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChildLearnPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ completed_lessons: [], quiz_score: null });
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("lesson"); // lesson | video | quiz | coding
  const [completingLesson, setCompletingLesson] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  // Per-module state maps (keyed by module index)
  const [videoWatchedMap, setVideoWatchedMap] = useState({});
  const [quizScoreMap, setQuizScoreMap] = useState({});
  const [codingDoneMap, setCodingDoneMap] = useState({});

  // Load coding/quiz states from localStorage on mount
  useEffect(() => {
    try {
      const storedCoding = localStorage.getItem(`coding_done_${courseId}`);
      if (storedCoding) setCodingDoneMap(JSON.parse(storedCoding));
      const storedQuiz = localStorage.getItem(`quiz_scores_${courseId}`);
      if (storedQuiz) setQuizScoreMap(JSON.parse(storedQuiz));
      const storedVideo = localStorage.getItem(`video_watched_${courseId}`);
      if (storedVideo) setVideoWatchedMap(JSON.parse(storedVideo));
    } catch (e) { }
  }, [courseId]);

  // Fetch course + progress from the existing backend
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/login"); return; }
      setAuthUser(user);
      try {
        const token = await user.getIdToken();
        const [courseRes, progressRes] = await Promise.all([
          fetch(`${API_BASE}/courses/${courseId}/`),
          fetch(`${API_BASE}/courses/child-progress/${courseId}/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const courseData = courseRes.ok ? await courseRes.json() : null;
        const progressData = progressRes.ok
          ? await progressRes.json()
          : { completed_lessons: [], quiz_score: null };

        setCourse(courseData);
        setProgress(progressData);
      } catch (e) {
        console.error("ChildLearnPage fetch error:", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [courseId, navigate]);

  // Use modules as the unit of progress — each module contains one lesson.
  // We ALWAYS use mod.id (the Firestore document ID) as the completion key
  // because lesson sub-document IDs (e.g. "lesson1") are NOT unique across modules
  // and would cause all lessons to appear complete when one is marked.
  const allModules = course?.modules || [];
  const totalLessons = allModules.length;  // one lesson per module
  const completedLessons = progress.completed_lessons || [];
  const completedCount = allModules.filter((mod) => completedLessons.includes(mod.id)).length;
  const progressPct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  const activeModule = allModules[activeModuleIdx];
  const activeLesson = activeModule?.lessons?.[0];
  // Always use the module's own unique Firestore ID as the completion key
  const lessonId = activeModule?.id || null;
  const isLessonDone = !!(lessonId && completedLessons.includes(lessonId));

  const isCourseComplete = allModules.length > 0 && allModules.every((mod) =>
    completedLessons.includes(mod.id)
  );

  // Completion states for current module
  const isVideoWatched = videoWatchedMap[activeModuleIdx] || isLessonDone;
  const currentQuizScore = quizScoreMap[activeModuleIdx] ?? null;
  const isQuizPassed = currentQuizScore !== null;
  const isCodingDone = codingDoneMap[activeModuleIdx] || isLessonDone;

  // Derive quiz data from lesson or module (from Firestore via backend)
  const lessonQuiz = activeLesson?.quiz || activeModule?.quiz || null;
  const codingChallenge = activeLesson?.coding_challenge || activeModule?.coding_challenge || null;
  const hasQuiz = !!lessonQuiz && lessonQuiz.questions?.length > 0;
  const hasCoding = !!codingChallenge;

  // All requirements met → can mark lesson complete
  const canComplete = isVideoWatched && (!hasQuiz || isQuizPassed) && (!hasCoding || isCodingDone);

  const markLessonDone = useCallback(async () => {
    if (!authUser || !lessonId || isLessonDone || !canComplete) return;
    setCompletingLesson(true);
    try {
      const token = await authUser.getIdToken();
      await fetch(`${API_BASE}/courses/child-progress/${courseId}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed_lesson: lessonId }),
      });
      setProgress((prev) => ({
        ...prev,
        completed_lessons: [...(prev.completed_lessons || []), lessonId],
      }));
      setShowXP(true);
    } catch (e) {
      console.error("markLessonDone error:", e);
    } finally {
      setCompletingLesson(false);
    }
  }, [authUser, lessonId, isLessonDone, courseId, canComplete]);

  // Auto-complete lesson when all conditions are met (no button click needed)
  useEffect(() => {
    if (canComplete && !isLessonDone && lessonId && authUser && !completingLesson) {
      markLessonDone();
    }
  }, [canComplete, isLessonDone, lessonId, authUser, completingLesson, markLessonDone]);

  const handleQuizComplete = useCallback(async (score) => {
    const updated = { ...quizScoreMap, [activeModuleIdx]: score };
    setQuizScoreMap(updated);
    localStorage.setItem(`quiz_scores_${courseId}`, JSON.stringify(updated));

    if (!authUser) return;
    try {
      const token = await authUser.getIdToken();
      await fetch(`${API_BASE}/courses/child-progress/${courseId}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_score: score }),
      });
      setProgress((prev) => ({ ...prev, quiz_score: score }));
    } catch (e) {
      console.error("handleQuizComplete error:", e);
    }
  }, [authUser, courseId, activeModuleIdx, quizScoreMap]);

  const handleVideoWatched = () => {
    const updated = { ...videoWatchedMap, [activeModuleIdx]: true };
    setVideoWatchedMap(updated);
    localStorage.setItem(`video_watched_${courseId}`, JSON.stringify(updated));
    // Guide the student to the next required step
    if (hasQuiz && !isQuizPassed) setActiveTab("quiz");
    else if (hasCoding && !isCodingDone) setActiveTab("coding");
    else setActiveTab("lesson");
  };

  const handleCodingComplete = useCallback(async (submittedCode) => {
    const updated = { ...codingDoneMap, [activeModuleIdx]: true };
    setCodingDoneMap(updated);
    localStorage.setItem(`coding_done_${courseId}`, JSON.stringify(updated));

    // Save to backend via child-progress (coding_completed field)
    if (!authUser) return;
    try {
      const token = await authUser.getIdToken();
      await fetch(`${API_BASE}/courses/child-progress/${courseId}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ coding_completed: true, module_idx: activeModuleIdx }),
      });
    } catch (e) {
      console.error("handleCodingComplete error:", e);
    }
  }, [authUser, courseId, activeModuleIdx, codingDoneMap]);

  const switchModule = (idx) => {
    // Check if user is skipping lessons: all previous lessons must be completed
    for (let i = 0; i < idx; i++) {
      if (!completedLessons.includes(allModules[i].id)) {
        setModalMessage("Please complete all previous lessons before starting this one!");
        return;
      }
    }
    setActiveModuleIdx(idx);
    setActiveTab("lesson");
    setShowXP(false);
  };

  if (loading) {
    return (
      <div className="clp-fullscreen-load">
        <div className="clp-bubbles">
          <div className="clp-bubble" />
          <div className="clp-bubble" />
          <div className="clp-bubble" />
        </div>
        <p>Loading your lesson…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="clp-fullscreen-load">
        <p>Failed to load course. <button onClick={() => navigate("/child-courses")}>Go Back</button></p>
      </div>
    );
  }

  return (
    <div className={`clp-page ${courseId === "intro-ai-kids" ? "clp-page--white-theme" : ""}`}>
      {showXP && <XPToast xp={100} />}

      {/* ── Top Bar ── */}
      <div className="clp-topbar">
        <button className="clp-back-btn" onClick={() => navigate("/child-courses")}>
          ← My Courses
        </button>
        <div className="clp-course-label">{course.title || course.name}</div>
        <div className="clp-topbar-progress">
          <span>{progressPct}% done</span>
          <div className="clp-mini-bar">
            <div className="clp-mini-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="clp-layout">
        {/* ── Left Sidebar ── */}
        <aside className="clp-sidebar">
          <h3 className="clp-sidebar-title">Lessons</h3>
          {allModules.map((mod, mIdx) => {
            // Use mod.id as the unique completion key — lesson IDs like "lesson1" are shared
            const done = completedLessons.includes(mod.id);
            const isActive = mIdx === activeModuleIdx;
            
            // Check if this module is locked (i.e. any previous module is not completed)
            let isLocked = false;
            for (let i = 0; i < mIdx; i++) {
              if (!completedLessons.includes(allModules[i].id)) {
                isLocked = true;
                break;
              }
            }

            const lesson = mod.lessons?.[0];
            const modHasQuiz = (lesson?.quiz?.questions?.length > 0) || (mod.quiz?.questions?.length > 0);
            const modHasCoding = !!lesson?.coding_challenge || !!mod.coding_challenge;
            return (
              <button
                key={mod.id}
                className={`clp-lesson-item ${isActive ? "lesson-active" : ""} ${done ? "lesson-done" : ""} ${isLocked ? "lesson-locked" : ""}`}
                onClick={() => switchModule(mIdx)}
                disabled={isLocked}
              >
                <span className="clp-lesson-check">
                  {done ? (
                    "✓"
                  ) : isLocked ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" className="clp-lock-icon" style={{ width: '15px', height: '15px', fill: 'currentColor' }}>
                      <path d="M 36 10 C 28.28 10 22 16.28 22 24 L 22 28.587891 C 19.069798 29.775473 17 32.643974 17 36 L 17 52 C 17 56.418 20.582 60 25 60 L 47 60 C 51.418 60 55 56.418 55 52 L 55 36 C 55 32.643974 52.930202 29.775473 50 28.587891 L 50 24 C 50 16.28 43.72 10 36 10 z M 36 18 C 39.309 18 42 20.691 42 24 L 42 28 L 30 28 L 30 24 C 30 20.691 32.691 18 36 18 z"></path>
                    </svg>
                  ) : (
                    mIdx + 1
                  )}
                </span>
                <span className="clp-lesson-name">{mod.title}</span>
                {modHasQuiz && <span className="clp-quiz-tag">Quiz</span>}
                {modHasCoding && <span className="clp-code-tag">Code</span>}
              </button>
            );
          })}

          {/* Progress Card */}
          <div className="clp-progress-card">
            <h4 className="clp-pc-title">Progress</h4>
            <div className="clp-pc-bar-wrap">
              <div className="clp-pc-bar">
                <div className="clp-pc-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span>{progressPct}%</span>
            </div>
            <div className="clp-pc-stats">
              <span className="clp-pc-stat-inline">
                <strong>{completedCount}</strong> / {totalLessons} Lessons
              </span>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="clp-content">
          {/* Module header */}
          <div className="clp-module-header">
            <h1 className="clp-module-title">
              Lesson {activeModuleIdx + 1}: {activeModule?.title}
            </h1>
            {isLessonDone && <span className="clp-done-badge">✓ Completed</span>}
          </div>

          {/* Requirements strip */}
          {!isLessonDone && (
            <div className="clp-requirements">
              <div className={`clp-req-item ${isVideoWatched ? 'req-done' : ''}`}>
                {isVideoWatched ? '✓' : '1'} Watch Video
              </div>
              {hasQuiz && (
                <div className={`clp-req-item ${isQuizPassed ? 'req-done' : ''}`}>
                  {isQuizPassed ? '✓' : hasQuiz ? '2' : ''} Pass Quiz
                </div>
              )}
              {hasCoding && (
                <div className={`clp-req-item ${isCodingDone ? 'req-done' : ''}`}>
                  {isCodingDone ? '✓' : '3'} Code Challenge
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="clp-tabs">
            <button
              className={`clp-tab ${activeTab === "lesson" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("lesson")}
            >
              Lesson
            </button>
            <button
              className={`clp-tab ${activeTab === "video" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("video")}
            >
              Video
            </button>
            {hasQuiz && (
              <button
                className={`clp-tab ${activeTab === "quiz" ? "tab-active" : ""}`}
                onClick={() => {
                  if (isVideoWatched) setActiveTab("quiz");
                  else setModalMessage("Please finish watching the video first to unlock the quiz!");
                }}
              >
                {isVideoWatched ? "Quiz" : "Quiz (Locked)"}
              </button>
            )}
            {hasCoding && (
              <button
                className={`clp-tab ${activeTab === "coding" ? "tab-active" : ""}`}
                onClick={() => {
                  if (isVideoWatched) setActiveTab("coding");
                  else setModalMessage("Please finish watching the video first!");
                }}
              >
                {isVideoWatched ? "Code" : "Code (Locked)"}
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="clp-tab-content">
            {/* Lesson Tab */}
            {activeTab === "lesson" && (
              <div className="clp-lesson-panel">
                {activeModule?.description && (
                  <div className="clp-explanation-card">
                    <div className="clp-explanation-icon">Tip</div>
                    <p>{activeModule.description}</p>
                  </div>
                )}

                <div className="clp-lesson-text">
                  {(activeLesson?.content || activeModule?.content || activeModule?.description || "")
                    .split("\n")
                    .map((line, i) => {
                      if (!line.trim()) return <br key={i} />;

                      // Helper to parse **bold** and `code` inline
                      const parseInline = (text) => {
                        const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
                        return parts.map((part, idx) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return <strong key={idx}>{part.slice(2, -2)}</strong>;
                          }
                          if (part.startsWith("`") && part.endsWith("`")) {
                            return <code key={idx} className="clp-content-code-inline">{part.slice(1, -1)}</code>;
                          }
                          return part;
                        });
                      };

                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <h3 key={i} className="clp-content-h3">{parseInline(line.slice(2, -2))}</h3>;
                      }
                      // Code blocks: lines starting and ending with backtick
                      if (line.startsWith("`") && line.endsWith("`") && !line.includes(" ", 1)) {
                        return <code key={i} className="clp-content-code">{line.replace(/`/g, "")}</code>;
                      }
                      if (line.startsWith("• ")) {
                        return <li key={i} className="clp-content-li">{parseInline(line.slice(2))}</li>;
                      }
                      if (/^\d+\./.test(line)) {
                        return <li key={i} className="clp-content-li numbered">{parseInline(line)}</li>;
                      }
                      return <p key={i} className="clp-content-p">{parseInline(line)}</p>;
                    })}
                </div>

                {/* Completion messages */}
                {!isLessonDone && canComplete && (
                  <p className="clp-saving-msg">Saving lesson progress...</p>
                )}
                {!isLessonDone && !canComplete && (
                  <div className="clp-requirements-msg">
                    Complete all requirements to unlock lesson completion:
                    {!isVideoWatched && <span> Watch the video.</span>}
                    {hasQuiz && !isQuizPassed && <span> Pass the quiz.</span>}
                    {hasCoding && !isCodingDone && <span> Complete the coding challenge.</span>}
                  </div>
                )}
                {isLessonDone && (
                  <p className="clp-done-msg">You completed this lesson! Try the next one in the sidebar.</p>
                )}
              </div>
            )}

            {/* Video Tab */}
            {activeTab === "video" && (
              <div className="clp-video-panel">
                <div className="clp-video-wrapper">
                  <iframe
                    src={activeModule?.video_url || "https://www.youtube.com/embed/kWmX3pd1f10"}
                    title={activeModule?.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="clp-video-frame"
                  />
                </div>
                <div className="clp-video-label">
                  Watch the video, then click "I have finished" to unlock the next step!
                </div>
                {!isVideoWatched && (
                  <button
                    className="clp-mark-done-btn"
                    onClick={handleVideoWatched}
                    style={{ alignSelf: "flex-start", marginTop: "10px" }}
                  >
                    ✓ I have finished watching the video
                  </button>
                )}
                {isVideoWatched && (
                  <p className="clp-done-msg" style={{ marginTop: "10px" }}>
                    Video completed!
                    {hasQuiz && !isQuizPassed ? " Now take the Quiz!" : ""}
                    {hasCoding && !isCodingDone ? " Now complete the Coding Challenge!" : ""}
                    {(!hasQuiz || isQuizPassed) && (!hasCoding || isCodingDone) ? " You can now complete this lesson." : ""}
                  </p>
                )}
              </div>
            )}

            {/* Quiz Tab */}
            {activeTab === "quiz" && hasQuiz && isVideoWatched && (
              <QuizComponent
                quiz={lessonQuiz}
                onComplete={handleQuizComplete}
                initialScore={currentQuizScore}
                courseTitle={course?.title || course?.name || 'AI Course'}
                userId={authUser?.uid}
                moduleId={`${courseId}_${activeModuleIdx}`}
              />
            )}
            {activeTab === "quiz" && !isVideoWatched && (
              <div className="clp-fullscreen-load" style={{ minHeight: 'auto', padding: '60px 20px', background: 'transparent' }}>
                <p style={{ color: '#d97706', fontWeight: 800, fontSize: '1.1rem' }}>Watch the video first to unlock the quiz!</p>
                <button className="clp-mark-done-btn" onClick={() => setActiveTab('video')} style={{ marginTop: 16 }}>
                  Go to Video →
                </button>
              </div>
            )}

            {/* Coding Tab */}
            {activeTab === "coding" && hasCoding && isVideoWatched && (
              <CodingChallenge
                challenge={codingChallenge}
                onComplete={handleCodingComplete}
                isCompleted={isCodingDone}
                moduleId={`${courseId}_${activeModuleIdx}`}
                userId={authUser?.uid}
              />
            )}
            {activeTab === "coding" && !isVideoWatched && (
              <div className="clp-fullscreen-load" style={{ minHeight: 'auto', padding: '60px 20px', background: 'transparent' }}>
                <p style={{ color: '#d97706', fontWeight: 800, fontSize: '1.1rem' }}>Watch the video first to unlock the coding challenge!</p>
                <button className="clp-mark-done-btn" onClick={() => setActiveTab('video')} style={{ marginTop: 16 }}>
                  Go to Video →
                </button>
              </div>
            )}
          </div>

          {/* Next Lesson Button */}
          {activeModuleIdx < allModules.length - 1 && isLessonDone && (
            <button
              className="clp-next-btn"
              onClick={() => { setActiveModuleIdx(activeModuleIdx + 1); setActiveTab("lesson"); }}
            >
              Next Lesson →
            </button>
          )}
          {isCourseComplete && (
            <div className="clp-course-complete" style={{ marginTop: '20px' }}>
              You've completed the entire course! Amazing work!
            </div>
          )}
        </main>
      </div>

      {/* ── Floating Chatbot Button ── */}
      {activeTab !== "quiz" && (
        <>
          <button
            className="chatbot-float-btn"
            onClick={() => setChatOpen((o) => !o)}
            title="Ask Pixel - AI Study Buddy"
          >
            {chatOpen ? "✕" : <img src="https://cdn-icons-png.flaticon.com/512/12637/12637629.png" alt="robot" style={{ width: '60%', height: '60%', objectFit: 'contain' }} />}
            <span className="float-tooltip">Ask Pixel!</span>
          </button>
          {chatOpen && (
            <div className="chatbot-float-panel">
              <KidsChatbot floating={true} onClose={() => setChatOpen(false)} />
            </div>
          )}
        </>
      )}

      {/* Custom styled child-friendly modal popup */}
      {modalMessage && (
        <div className="clp-modal-overlay" onClick={() => setModalMessage(null)}>
          <div className="clp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="clp-modal-header">
              <h3>Oops!</h3>
            </div>
            <div className="clp-modal-body">
              <p>{modalMessage}</p>
            </div>
            <div className="clp-modal-footer">
              <button className="clp-modal-btn" onClick={() => setModalMessage(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
