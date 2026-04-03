import React, { useState } from "react";
import { sendQuery } from "../services/api";

function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input) return;

    const userMsg = { role: "user", text: input };
    setMessages([...messages, userMsg]);

    const res = await sendQuery(input);

    const botMsg = { role: "bot", text: res.response };
    setMessages((prev) => [...prev, botMsg]);

    setInput("");
  };

  return (
    <div className="card">
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i}>
            <b>{msg.role === "user" ? "You" : "AI"}:</b> {msg.text}
          </div>
        ))}
      </div>

      <div className="input-box">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask security query..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

export default AIChat;