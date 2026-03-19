import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./ChildLearnPage.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const auth = getAuth();

// ── Dummy AI Quiz Data (used when Firestore quiz not fetched) ────────────────
const AI_QUIZ = {
  title: "AI Basics Quiz 🤖",
  questions: [
    {
      id: "q1",
      text: "What does AI stand for?",
      choices: [
        { id: "q1-a", text: "Artificial Intelligence", is_correct: true },
        { id: "q1-b", text: "Automatic Internet", is_correct: false },
        { id: "q1-c", text: "Advanced Information", is_correct: false },
        { id: "q1-d", text: "Alien Interaction", is_correct: false },
      ],
    },
    {
      id: "q2",
      text: "Which of the following is an example of Artificial Intelligence?",
      choices: [
        { id: "q2-a", text: "A regular calculator", is_correct: false },
        { id: "q2-b", text: "A voice assistant like Siri or Alexa", is_correct: true },
        { id: "q2-c", text: "A simple light switch", is_correct: false },
        { id: "q2-d", text: "A printed book", is_correct: false },
      ],
    },
    {
      id: "q3",
      text: "How does AI help computers learn from data?",
      choices: [
        { id: "q3-a", text: "By memorizing everything humans tell them word-for-word", is_correct: false },
        { id: "q3-b", text: "By using algorithms that find patterns in large amounts of examples", is_correct: true },
        { id: "q3-c", text: "By copying information from books", is_correct: false },
        { id: "q3-d", text: "Through random guessing until it gets it right", is_correct: false },
      ],
    },
  ],
};

// ── Quiz Component ───────────────────────────────────────────────────────────
function QuizComponent({ quiz, onComplete, initialScore }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(initialScore !== null);
  const [results, setResults] = useState(null);
  const [score, setScore] = useState(initialScore);

  const handleSelect = (qId, choiceId) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: choiceId }));
  };

  const handleSubmit = () => {
    let correct = 0;
    const res = {};
    quiz.questions.forEach((q) => {
      const selected = answers[q.id];
      const correctChoice = q.choices.find((c) => c.is_correct);
      const isCorrect = selected === correctChoice?.id;
      if (isCorrect) correct++;
      res[q.id] = { selected, correctId: correctChoice?.id, isCorrect };
    });
    const sc = correct / quiz.questions.length;
    setScore(sc);
    setResults(res);
    setSubmitted(true);
    if (onComplete) onComplete(sc);
  };

  return (
    <div className="clp-quiz">
      <div className="clp-quiz-header">
        <span className="clp-quiz-icon">📝</span>
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
          Submit Answers 🚀
        </button>
      ) : (
        <div className="clp-score-result">
          {score >= 0.7 ? "🏆" : "💪"}{" "}
          {score >= 0.9
            ? "Amazing! You're an AI genius!"
            : score >= 0.7
            ? "Great job! Keep it up!"
            : "Good try! Review and try again!"}
          <span className="clp-score-num">
            {Math.round(score * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ChildLearnPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ completed_lessons: [], quiz_score: null });
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("lesson"); // lesson | video | quiz
  const [completingLesson, setCompletingLesson] = useState(false);
  const [videoWatchedMap, setVideoWatchedMap] = useState({}); // Track video completion per module

  // Fetch course + progress
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

  // All lessons flattened for progress counting
  const allModules = course?.modules || [];
  const allLessons = allModules.flatMap((m) => m.lessons || []);
  const totalLessons = allLessons.length;
  const completedLessons = progress.completed_lessons || [];
  const completedCount = completedLessons.length;
  const progressPct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  const activeModule = allModules[activeModuleIdx];
  const activeLesson = activeModule?.lessons?.[0]; // each module has 1 lesson in our data
  const lessonId = activeLesson?.id;
  const isLessonDone = lessonId && completedLessons.includes(lessonId);
  const isVideoWatched = videoWatchedMap[activeModuleIdx] || isLessonDone;

  // Whether this is the first module (has quiz)
  const hasQuiz = activeModuleIdx === 0;

  const markLessonDone = useCallback(async () => {
    if (!authUser || !lessonId || isLessonDone) return;
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
    } catch (e) {
      console.error("markLessonDone error:", e);
    } finally {
      setCompletingLesson(false);
    }
  }, [authUser, lessonId, isLessonDone, courseId]);

  const handleQuizComplete = useCallback(async (score) => {
    if (!authUser) return;
    try {
      const token = await authUser.getIdToken();
      await fetch(`${API_BASE}/courses/child-progress/${courseId}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quiz_score: score }),
      });
      setProgress((prev) => ({ ...prev, quiz_score: score }));
      
      // Auto-complete the lesson when quiz is submitted
      if (!isLessonDone) {
        markLessonDone();
      }
    } catch (e) {
      console.error("handleQuizComplete error:", e);
    }
  }, [authUser, courseId, isLessonDone, markLessonDone]);

  const handleVideoWatched = () => {
    setVideoWatchedMap(prev => ({ ...prev, [activeModuleIdx]: true }));
    if (hasQuiz) {
      setActiveTab("quiz");
    } else {
      setActiveTab("lesson");
    }
  };

  if (loading) {
    return (
      <div className="clp-fullscreen-load">
        <div className="clp-load-spinner" />
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
      {/* ── Top Bar ── */}
      <div className="clp-topbar">
        <button className="clp-back-btn" onClick={() => navigate("/child-courses")}>
          ← My Courses
        </button>
        <div className="clp-course-label">
          {course.title || course.name}
        </div>
        <div className="clp-topbar-progress">
          <span>{progressPct}% done</span>
          <div className="clp-mini-bar">
            <div className="clp-mini-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="clp-layout">
        {/* ── Left Sidebar: Lesson List ── */}
        <aside className="clp-sidebar">
          <h3 className="clp-sidebar-title">📚 Lessons</h3>
          {allModules.map((mod, mIdx) => {
            const lesson = mod.lessons?.[0];
            const lid = lesson?.id;
            const done = lid && completedLessons.includes(lid);
            const isActive = mIdx === activeModuleIdx;
            return (
              <button
                key={mod.id}
                className={`clp-lesson-item ${isActive ? "lesson-active" : ""} ${done ? "lesson-done" : ""}`}
                onClick={() => { setActiveModuleIdx(mIdx); setActiveTab("lesson"); }}
              >
                <span className="clp-lesson-check">{done ? "✓" : (mIdx + 1)}</span>
                <span className="clp-lesson-name">{mod.title}</span>
                {mIdx === 0 && (
                  <span className="clp-quiz-tag">Quiz</span>
                )}
              </button>
            );
          })}

          {/* Progress Tracker */}
          <div className="clp-progress-card">
            <h4 className="clp-pc-title">🏆 Progress</h4>
            <div className="clp-pc-bar-wrap">
              <div className="clp-pc-bar">
                <div className="clp-pc-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span>{progressPct}%</span>
            </div>
            <div className="clp-pc-stats">
              <div className="clp-pc-stat">
                <strong>{completedCount}</strong>
                <span>/{totalLessons} Lessons</span>
              </div>
              <div className="clp-pc-stat">
                <strong>
                  {progress.quiz_score != null
                    ? `${Math.round(progress.quiz_score * 100)}%`
                    : "—"}
                </strong>
                <span>Quiz Score</span>
              </div>
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
            {isLessonDone && (
              <span className="clp-done-badge">✓ Completed</span>
            )}
          </div>

          {/* Tabs */}
          <div className="clp-tabs">
            <button
              className={`clp-tab ${activeTab === "lesson" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("lesson")}
            >
              📖 Lesson
            </button>
            <button
              className={`clp-tab ${activeTab === "video" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("video")}
            >
              🎬 Video
            </button>
            {hasQuiz && (
              <button
                className={`clp-tab ${activeTab === "quiz" ? "tab-active" : ""}`}
                onClick={() => {
                  if (isVideoWatched) setActiveTab("quiz");
                  else alert("Please finish watching the video first to unlock the quiz!");
                }}
              >
                {isVideoWatched ? "📝 Quiz" : "🔒 Quiz (Locked)"}
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="clp-tab-content">
            {/* Lesson Tab */}
            {activeTab === "lesson" && (
              <div className="clp-lesson-panel">
                {activeModule?.data?.explanation && (
                  <div className="clp-explanation-card">
                    <div className="clp-explanation-icon">💡</div>
                    <p>{activeModule.data.explanation || activeModule.explanation}</p>
                  </div>
                )}

                <div className="clp-lesson-text">
                  {(activeLesson?.content || activeLesson?.data?.content || "")
                    .split("\n")
                    .map((line, i) => {
                      if (!line.trim()) return <br key={i} />;
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <h3 key={i} className="clp-content-h3">{line.replace(/\*\*/g, "")}</h3>;
                      }
                      if (line.startsWith("• ")) {
                        return <li key={i} className="clp-content-li">{line.slice(2)}</li>;
                      }
                      if (/^\d+\./.test(line)) {
                        return <li key={i} className="clp-content-li numbered">{line}</li>;
                      }
                      return <p key={i} className="clp-content-p">{line}</p>;
                    })}
                </div>

                {!isLessonDone && !hasQuiz && (
                  <button
                    className="clp-mark-done-btn"
                    onClick={markLessonDone}
                    disabled={completingLesson || !isVideoWatched}
                  >
                    {completingLesson ? "Saving…" : "✓ Mark Lesson as Complete"}
                  </button>
                )}
                {!isLessonDone && !hasQuiz && !isVideoWatched && (
                   <p className="clp-done-msg" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", borderColor: "rgba(239, 68, 68, 0.3)", marginTop: "10px" }}>
                     Please watch the video first before marking this lesson as complete.
                   </p>
                )}
                {!isLessonDone && hasQuiz && (
                   <p className="clp-done-msg" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                     ⚠️ To complete this lesson, you must watch the video and submit the quiz!
                   </p>
                )}
                {isLessonDone && (
                  <p className="clp-done-msg">
                    🎉 You completed this lesson! Try the next one in the sidebar.
                  </p>
                )}
              </div>
            )}

            {/* Video Tab */}
            {activeTab === "video" && (
              <div className="clp-video-panel">
                <div className="clp-video-wrapper">
                  <iframe
                    src={
                      activeLesson?.videoUrl ||
                      activeLesson?.data?.videoUrl ||
                      "https://www.youtube.com/embed/kWmX3pd1f10"
                    }
                    title={activeModule?.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="clp-video-frame"
                  />
                </div>
                <div className="clp-video-label">
                  🎬 Watch the video, then click "I have finished" to unlock the {hasQuiz ? "Quiz" : "Lesson completion"}!
                </div>
                {!isVideoWatched && (
                  <button className="clp-mark-done-btn" onClick={handleVideoWatched} style={{ alignSelf: "flex-start", marginTop: "10px" }}>
                    ✓ I have finished watching the video
                  </button>
                )}
                {isVideoWatched && (
                  <p className="clp-done-msg" style={{ marginTop: "10px" }}>
                    ✅ Video completed! {hasQuiz ? "You can now take the Quiz." : "You can now mark the lesson as complete on the Lesson tab."}
                  </p>
                )}
              </div>
            )}

            {/* Quiz Tab */}
            {activeTab === "quiz" && hasQuiz && (
              <QuizComponent
                quiz={AI_QUIZ}
                onComplete={handleQuizComplete}
                initialScore={progress.quiz_score}
              />
            )}
          </div>

          {/* Next Lesson */}
          {activeModuleIdx < allModules.length - 1 && isLessonDone && (
            <button
              className="clp-next-btn"
              onClick={() => { setActiveModuleIdx(activeModuleIdx + 1); setActiveTab("lesson"); }}
            >
              Next Lesson →
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
