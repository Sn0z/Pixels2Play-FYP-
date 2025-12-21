import { useState } from "react";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input) return;

    const userMessage = { sender: "user", text: input };
    setMessages([...messages, userMessage]);

    const response = await fetch("http://127.0.0.1:5000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: input }),
    });

    const data = await response.json();
    const botMessage = { sender: "bot", text: data.answer };
    setMessages([...messages, userMessage, botMessage]);
    setInput("");
  };

  return (
    <div style={{ maxWidth: "500px", margin: "auto" }}>
      <h1>AI Kids Chatbot</h1>
      <div style={{ border: "1px solid #ccc", padding: "10px", height: "400px", overflowY: "auto" }}>
        {messages.map((msg, i) => (
          <p key={i} style={{ textAlign: msg.sender === "bot" ? "left" : "right" }}>
            <strong>{msg.sender === "bot" ? "Bot" : "You"}:</strong> {msg.text}
          </p>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask me about AI!"
        style={{ width: "80%" }}
      />
      <button onClick={sendMessage} style={{ width: "18%" }}>Send</button>
    </div>
  );
}
