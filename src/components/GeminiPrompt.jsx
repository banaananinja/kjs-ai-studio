// src/components/GeminiPrompt.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { generateChatResponse } from '../services/geminiService';
import './GeminiPrompt.css';

function GeminiPrompt({ selectedModel, systemInstructions }) {
  const [messages, setMessages] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  const toggleMessageExpansion = (messageId) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const startEditingMessage = (index, content) => {
    setEditingMessageId(index);
    setEditingContent(content);
  };

  const saveMessageEdit = () => {
    setMessages(prevMessages => 
      prevMessages.map((msg, index) => 
        index === editingMessageId ? { ...msg, content: editingContent } : msg
      )
    );
    setEditingMessageId(null);
  };

  const cancelMessageEdit = () => {
    setEditingMessageId(null);
  };
  
  const handleRegenerateMessage = async (index) => {
    let conversationToKeep;
    
    if (messages[index].role === 'assistant') {
      // For assistant messages, find the last user message before this one
      let lastUserMessageIndex = index - 1;
      while (lastUserMessageIndex >= 0 && messages[lastUserMessageIndex].role !== 'user') {
        lastUserMessageIndex--;
      }
      
      if (lastUserMessageIndex < 0) return; // No user message found
      
      // Keep messages up to the user message that triggered this response
      conversationToKeep = messages.slice(0, lastUserMessageIndex + 1);
    } else if (messages[index].role === 'user') {
      // For user messages, keep messages up to and including the clicked message
      conversationToKeep = messages.slice(0, index + 1);
    }
    
    // Update messages to remove everything after the relevant point
    setMessages(conversationToKeep);
    setLoading(true);
    
    try {
      // Generate new response based on the conversation up to this point
      const replyText = await generateChatResponse(conversationToKeep, selectedModel, systemInstructions);
      const assistantMessage = { role: 'assistant', content: replyText };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = { role: 'assistant', content: 'Error: Unable to regenerate response from Gemini API' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

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
          <div 
            key={index} 
            className={`message-bubble ${msg.role} ${expandedMessages[index] ? 'expanded' : ''} ${editingMessageId === index ? 'editing' : ''}`}
          >
            <div className="message-actions">
              {editingMessageId === index ? (
                <>
                  <button onClick={saveMessageEdit} className="edit-action-button save">✔️</button>
                  <button onClick={cancelMessageEdit} className="edit-action-button cancel">❌</button>
                </>
              ) : (
                <>
                  <button onClick={() => toggleMessageExpansion(index)}>
                    {expandedMessages[index] ? '➖' : '➕'}
                  </button>
                  <button onClick={() => startEditingMessage(index, msg.content)}>✏️</button>
                  <button onClick={() => handleRegenerateMessage(index)}>💎</button>
                </>
              )}
            </div>
            <strong className="message-sender">{msg.role === 'assistant' ? 'Gemini' : 'You'}:</strong>
            <div className="message-content">
              {editingMessageId === index ? (
                <textarea
                  className="edit-message-textarea"
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={5}
                />
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown 
                    rehypePlugins={[rehypeHighlight]}
                    remarkPlugins={[remarkGfm]}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="prompt-form">
        <div className="input-container">
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
            className="prompt-textarea"
          />
          
          <div className="side-buttons">
            <button 
              type="submit" 
              disabled={loading || !currentPrompt}
              title="CTRL+ENTER"
              className="run-button"
            >
              {loading ? 'Generating...' : 'Run'}
            </button>
            <button 
              type="button" 
              disabled={loading || !currentPrompt}
              title="ALT+ENTER"
              className="append-button"
            >
              Append
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default GeminiPrompt;
