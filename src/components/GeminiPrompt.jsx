// src/components/GeminiPrompt.jsx
import React, { useState } from 'react';
import { generateChatResponse } from '../services/geminiService';
import './GeminiPrompt.css';

function GeminiPrompt({ selectedModel }) {
  const [messages, setMessages] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPrompt.trim()) return;

    // Add user's message
    const userMessage = { role: 'user', content: currentPrompt.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentPrompt('');
    setLoading(true);

    try {
      // Send full conversation along with selected model code to Gemini
      const replyText = await generateChatResponse(newMessages, selectedModel);
      const assistantMessage = { role: 'assistant', content: replyText };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = { role: 'assistant', content: 'Error: Unable to get response from Gemini API' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gemini-prompt">
      <div className="chat-history">
        {messages.map((msg, index) => (
          <div key={index} className={`message-bubble ${msg.role}`}>
            <strong>{msg.role === 'assistant' ? 'Gemini' : 'You'}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={currentPrompt}
          onChange={(e) => setCurrentPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          rows={2}
        />
        <button type="submit" disabled={loading || !currentPrompt}>
          {loading ? 'Generating...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default GeminiPrompt;
