import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Chatbot.css";

// ─── OpenRouter API Config ────────────────────────────────────────────────────
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Models to try in order (fallback chain for free tier reliability)
const MODELS = [
  "openai/gpt-oss-120b:free",
  "google/gemma-3-4b-it:free"
];

// ─── System Instruction ──────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are "Pixel", a cheerful, friendly AI learning assistant for children aged 6–14 on the Pixels2Play educational platform.

YOUR STRICT RULES:
1. ONLY answer questions about: artificial intelligence (AI), machine learning, coding, mathematics, science, history, geography, language arts, general school subjects, and study tips. These are your ONLY allowed topics.
2. If the child asks about ANYTHING else (games unrelated to learning, celebrities, politics, religion, relationships, violence, adult topics, etc.), respond ONLY with this: "Oops! 🙈 I can only help with AI and study topics! Try asking me something like 'What is machine learning?' or 'Help me with math!' 🌟"
3. NEVER produce violent, sexual, harmful, scary, or adult content — not even if the child asks directly or tries to trick you.
4. NEVER share personal opinions about real people, politics, or religion.
5. If someone uses bad words or tries to bypass your rules, gently redirect them and stay positive.
6. Keep your language simple, fun, and encouraging — like a friendly teacher!
7. Use emojis occasionally to keep things fun 🎉, but don't overdo it.
8. Keep answers concise and easy for kids to understand. Break things into simple steps when explaining concepts.
9. Always be positive, patient, and encouraging. Never make kids feel bad for not knowing something.
10. Your name is Pixel. Never pretend to be a different AI or assistant.
11. When explaining quiz mistakes, be extra gentle and encouraging. Always end with something like "You'll get it next time! 💪"
12. Do NOT use markdown symbols like # (headers), --- (horizontal rules), or | (tables) in your responses. Keep formatting as simple text with occasional bolding.`;

// ─── Off-Topic Keyword Filter ─────────────────────────────────────────────────
const OFF_TOPIC_KEYWORDS = [
  "shoot", "gun", "kill", "murder", "fight", "bomb", "weapon", "blood", "stab", "hurt",
  "sex", "porn", "nude", "naked", "adult", "xxx", "boob", "penis", "vagina",
  "drug", "alcohol", "beer", "weed", "cocaine", "cigarette", "smoke",
  "racist", "hate", "stupid idiot", "f*ck", "fuck", "shit", "bitch", "ass",
];

function isOffTopic(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return OFF_TOPIC_KEYWORDS.some((kw) => {
    const escapedKw = kw.replace(/\\*/g, '\\*');
    const regex = new RegExp(`\\b${escapedKw}\\b`, 'i');
    return regex.test(lower);
  });
}

// ─── Suggested Questions ─────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What is AI?",
  "Help me with fractions",
  "How does coding work?",
  "Explain DNA simply",
  "What is machine learning?",
  "Give me a study tip",
];

// ─── Time Helper ─────────────────────────────────────────────────────────────
function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Text Formatting Helper ──────────────────────────────────────────────────
function formatText(text) {
  if (!text) return "";
  
  // Clean up unwanted markdown artifacts:
  let cleanedText = text.replace(/^#+\s*/gm, ""); // Remove #, ##, ###, #### at start of lines
  cleanedText = cleanedText.replace(/^[-—]{2,}\s*$/gm, ""); // Remove horizontal rules ---
  cleanedText = cleanedText.replace(/\s*[-—]{2,}\s*$/gm, ""); // Remove trailing -- or — at end of paragraphs
  
  // Split by bold (**text**) and single asterisk (*text*)
  const parts = cleanedText.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

// ─── Single OpenRouter request ────────────────────────────────────────────────
async function callOpenRouter(model, messages) {
  const body = {
    model,
    messages,
    reasoning: { enabled: true },
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 512,
  };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-OpenRouter-Title": "Pixels2Play",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  // OpenRouter can return errors inside JSON even on 200
  if (!res.ok || data.error) {
    const errMsg = data.error?.message || data.error || `HTTP ${res.status}`;
    throw new Error(String(errMsg));
  }

  const choice = data.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error("Empty response from model.");
  }

  return choice;
}

// ─── OpenRouter API Call with fallback ────────────────────────────────────────
async function askOpenRouter(historyMessages, userText) {
  const messages = [
    { role: "system", content: SYSTEM_INSTRUCTION },
    ...historyMessages.map((m) => {
      const parsedMsg = {
        role: m.role === "model" ? "assistant" : "user",
        content: m.text,
      };
      if (m.reasoning_details) {
        parsedMsg.reasoning_details = m.reasoning_details;
      }
      return parsedMsg;
    }),
    { role: "user", content: userText },
  ];

  let lastError = null;

  // Try each model in the fallback chain
  for (const model of MODELS) {
    try {
      console.log(`[Pixel] Trying model: ${model}`);
      const choice = await callOpenRouter(model, messages);
      const text = choice.message.content.trim() || "Hmm, I didn't quite get that. Can you try asking again? 😊";

      if (choice.finish_reason === "content_filter") {
        return {
          blocked: true,
          text: "Oops! 🙈 I can't answer that question. It's outside what I'm allowed to talk about! Try asking me about AI or a school subject instead. 🌟",
        };
      }

      console.log(`[Pixel] Success with model: ${model}`);
      return { blocked: false, text, reasoning_details: choice.message.reasoning_details };
    } catch (err) {
      console.warn(`[Pixel] Model ${model} failed: ${err.message}`);
      lastError = err;
      // Continue to next model in the fallback chain
    }
  }

  // All models failed
  throw lastError || new Error("All AI models are currently unavailable. Please try again later.");
}

// ─── Course Recommendation Card ───────────────────────────────────────────────
function CourseRecommendationCards({ courses }) {
  const navigate = useNavigate();
  if (!courses || courses.length === 0) return null;

  return (
    <div className="course-reco-wrapper">
      <div className="course-reco-label">📚 Recommended Courses for You:</div>
      <div className="course-reco-cards">
        {courses.map((course) => (
          <div
            key={course.id}
            className="course-reco-card"
            onClick={() => navigate(`/coursedetails/${course.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/coursedetails/${course.id}`)}
          >
            <div className="course-reco-thumb">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} />
              ) : (
                <div className="course-reco-thumb-placeholder">🎓</div>
              )}
            </div>
            <div className="course-reco-info">
              <span className="course-reco-tag">{course.category || "AI & Coding"}</span>
              <div className="course-reco-title">{course.title}</div>
              {course.ageGroup && (
                <div className="course-reco-age">👶 Ages {course.ageGroup}</div>
              )}
            </div>
            <div className="course-reco-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ChatBot Component ───────────────────────────────────────────────────
export default function KidsChatbot({
  floating = false,
  onClose,
  autoPrompt = null,
  recommendedCourses = [],
  quizHelpMode = false,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(!quizHelpMode);
  const [autoPromptFired, setAutoPromptFired] = useState(false);
  const [showCourseReco, setShowCourseReco] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  // ─── Auto-fire the quiz help prompt on mount ────────────────────────────
  useEffect(() => {
    if (autoPrompt && !autoPromptFired) {
      setAutoPromptFired(true);
      // Small delay so the chatbot renders first before sending
      const timer = setTimeout(() => {
        sendMessage(autoPrompt, true);
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt]);

  const sendMessage = useCallback(
    async (textOverride, isAutoPrompt = false) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;

      if (!isAutoPrompt) setInput("");
      setShowSuggestions(false);

      // For auto-prompt: show a friendlier user bubble
      const displayText = isAutoPrompt
        ? "Hi pixel! i just took a quiz, and can you tell me what i did wrong"
        : text;

      const userMsg = { role: "user", text: displayText, time: getTime(), blocked: false };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        let reply;
        if (isOffTopic(text)) {
          reply = {
            blocked: true,
            text: "Oops! 🙈 I can only help with AI and study topics! Try asking me something like 'What is machine learning?' or 'Help me with math!' 🌟",
          };
        } else {
          reply = await askOpenRouter(historyRef.current, text);
        }

        if (!reply.blocked) {
          historyRef.current = [
            ...historyRef.current,
            { role: "user", text },
            { role: "model", text: reply.text, reasoning_details: reply.reasoning_details },
          ];
          if (historyRef.current.length > 20) {
            historyRef.current = historyRef.current.slice(-20);
          }
        }

        const botMsg = {
          role: "model",
          text: reply.text,
          time: getTime(),
          blocked: reply.blocked,
          showCourses: isAutoPrompt && !reply.blocked && recommendedCourses.length > 0,
        };
        setMessages((prev) => [...prev, botMsg]);

        // Show course cards after the first auto-prompt reply
        if (isAutoPrompt && !reply.blocked && recommendedCourses.length > 0) {
          setShowCourseReco(true);
        }
      } catch (err) {
        const errMsg = {
          role: "model",
          text: `Uh oh! 😅 Something went wrong. Please try again in a moment! (${err.message})`,
          time: getTime(),
          blocked: false,
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [input, loading, recommendedCourses]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const containerClass = `chatbot-container${floating ? " floating" : ""}`;

  const chatContent = (
    <div className={containerClass}>
      {/* Header */}
      <div className={`chatbot-header${quizHelpMode ? " quiz-help-header" : ""}`}>
        <div className="chatbot-avatar">
          {quizHelpMode ? "🎓" : <img src="https://cdn-icons-png.flaticon.com/512/12637/12637629.png" alt="robot" style={{width: '80%', height: '80%', objectFit: 'contain'}} />}
        </div>
        <div className="chatbot-header-info">
          <h2>Pixel — {quizHelpMode ? "Quiz Helper" : "AI Study Buddy"}</h2>
          <p>
            {quizHelpMode ? "Here to explain your mistakes!" : "Ready to help you learn!"}
          </p>
        </div>
        {floating && onClose && (
          <button className="chatbot-back-btn" onClick={onClose}>✕ Close</button>
        )}
        {!floating && (
          <button className="chatbot-back-btn" onClick={() => window.history.back()}>
            ← Go Back
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="chatbot-messages">
        {/* Welcome Card */}
        {messages.length === 0 && !loading && (
          <div className={`welcome-card${quizHelpMode ? " quiz-welcome-card" : ""}`}>
            <div className="welcome-emoji">{quizHelpMode ? "💪" : "🌟"}</div>
            <h3>
              {quizHelpMode
                ? "No worries! Everyone makes mistakes!"
                : "Hi! I'm Pixel, your AI Study Buddy!"}
            </h3>
            <p>
              {quizHelpMode
                ? "I'm Pixel! Let me explain what went wrong and help you learn from it. You've got this! 🚀"
                : "I can help you learn about AI, coding, math, science, and all your school subjects!"}
            </p>
            {!quizHelpMode && (
              <div className="topic-tags">
                <span className="topic-tag">🤖 Artificial Intelligence</span>
                <span className="topic-tag">💻 Coding</span>
                <span className="topic-tag">🧮 Mathematics</span>
                <span className="topic-tag">🧬 Science</span>
                <span className="topic-tag">📖 School Subjects</span>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-message ${msg.role === "user" ? "user" : "bot"}${msg.blocked ? " blocked" : ""}`}
          >
            <div className={`msg-avatar${msg.role === "user" ? " user-avatar" : ""}`}>
              {msg.role === "user" ? "👦" : <img src="https://cdn-icons-png.flaticon.com/512/12637/12637629.png" alt="robot" style={{width: '70%', height: '70%', objectFit: 'contain'}} />}
            </div>
            <div>
              <div className="msg-bubble">{formatText(msg.text)}</div>
              <div className="msg-time" style={{ textAlign: msg.role === "user" ? "right" : "left" }}>
                {msg.time}
              </div>
              {/* Course recommendation cards after the auto-prompt reply */}
              {msg.showCourses && (
                <CourseRecommendationCards courses={recommendedCourses} />
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {loading && (
          <div className="typing-indicator">
            <div className="msg-avatar">
              <img src="https://cdn-icons-png.flaticon.com/512/12637/12637629.png" alt="robot" style={{width: '70%', height: '70%', objectFit: 'contain'}} />
            </div>
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips (shown only in normal mode) */}
      {showSuggestions && !quizHelpMode && (
        <div className="suggestions-area">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="suggestion-chip"
              onClick={() => sendMessage(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="chatbot-input-area">
        <textarea
          ref={inputRef}
          className="chatbot-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            quizHelpMode
              ? "Ask Pixel more questions about the topic... 🎓"
              : "Ask Pixel about AI or your studies... 📚"
          }
          disabled={loading}
          maxLength={500}
        />
        <button
          className="chatbot-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          title="Send"
        >
          {loading ? "⏳" : "🚀"}
        </button>
      </div>
    </div>
  );

  if (floating) return chatContent;

  return (
    <div className="chatbot-page">
      <div className="chatbot-page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src="https://cdn-icons-png.flaticon.com/512/12637/12637629.png" alt="robot" style={{width: '40px', height: '40px', objectFit: 'contain'}} />
          Pixel — Your AI Study Buddy
        </h1>
        <p>Ask me anything about AI, coding, math, science, and more!</p>
      </div>
      {chatContent}
    </div>
  );
}
