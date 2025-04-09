// src/components/GeminiPrompt.jsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { generateChatResponse } from '../services/geminiService';
import './GeminiPrompt.css';

function GeminiPrompt({ selectedModel, systemInstructions }) {
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
      // Send full conversation along with selected model code and system instructions
      const replyText = await generateChatResponse(newMessages, selectedModel, systemInstructions);
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
            <div className="message-actions">
              <button>➕</button>
              <button>✏️</button>
              <button>💎</button>
              <button>🍔</button>
            </div>
            <strong className="message-sender">{msg.role === 'assistant' ? 'Gemini' : 'You'}:</strong> 
            <div className="message-content">
              <div className="markdown-content">
                <ReactMarkdown 
                  rehypePlugins={[rehypeHighlight]}
                  remarkPlugins={[remarkGfm]}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={currentPrompt}
          onChange={(e) => setCurrentPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          rows={2}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="button-container">
          <button 
            type="button" 
            disabled={loading || !currentPrompt}
            title="ALT+ENTER"
          >
            Append
          </button>
          <button 
            type="submit" 
            disabled={loading || !currentPrompt}
            title="CTRL+ENTER"
          >
            {loading ? 'Generating...' : 'Run'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default GeminiPrompt;
