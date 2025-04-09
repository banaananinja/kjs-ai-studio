// src/components/GeminiPrompt.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { generateChatResponse } from '../services/geminiService';
import './GeminiPrompt.css';

/**
 * GeminiPrompt Component - Handles chat interface for Gemini AI model interactions
 * 
 * @param {Object} props - Component props
 * @param {string} props.selectedModel - The currently selected Gemini model
 * @param {string} props.systemInstructions - System instructions to guide the AI's behavior
 */
function GeminiPrompt({ selectedModel, systemInstructions }) {
  const [messages, setMessages] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const chatHistoryRef = useRef(null);

  /**
   * Scroll chat history container to the bottom when messages change
   */
  useEffect(() => {
    if (chatHistoryRef.current) {
      // Scroll to the bottom of the chat container instead of the whole page
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Toggles the expansion state of a message
   * @param {number} messageId - Index of the message to toggle
   */
  const toggleMessageExpansion = (messageId) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  /**
   * Initiates editing mode for a specific message
   * @param {number} index - Index of the message to edit
   * @param {string} content - Current content of the message
   */
  const startEditingMessage = (index, content) => {
    setEditingMessageId(index);
    setEditingContent(content);
  };

  /**
   * Saves the edited message content
   */
  const saveMessageEdit = () => {
    setMessages(prevMessages => 
      prevMessages.map((msg, index) => 
        index === editingMessageId ? { ...msg, content: editingContent } : msg
      )
    );
    setEditingMessageId(null);
  };

  /**
   * Cancels the current message edit operation
   */
  const cancelMessageEdit = () => {
    setEditingMessageId(null);
  };
  
  /**
   * Toggles the dropdown menu for a message
   * @param {number} index - Index of the message to toggle dropdown for
   * @param {Event} e - Click event that triggered the toggle
   */
  const toggleDropdown = (index, e) => {
    e.stopPropagation();
    
    if (activeDropdown && activeDropdown.index === index) {
      setActiveDropdown(null);
    } else {
      // Calculate position for the dropdown based on the button's position
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const dropdownPosition = {
        top: buttonRect.bottom + 5,
        left: buttonRect.left - 120, // Position to the left of the button
      };
      
      setActiveDropdown({index, position: dropdownPosition});
    }
  };

  // Close dropdown when clicking outside or when scrolling
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    const handleScroll = () => setActiveDropdown(null);
    
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);
  
  /**
   * Deletes a message from the conversation
   * @param {number} index - Index of the message to delete
   */
  const handleDeleteMessage = (index) => {
    setMessages(prevMessages => prevMessages.filter((_, i) => i !== index));
    setActiveDropdown(null);
  };

  /**
   * Copies message content to clipboard
   * @param {string} content - Content to copy
   * @param {string} [format='text'] - Format to copy (text or markdown)
   */
  const copyToClipboard = (content, format = 'text') => {
    navigator.clipboard.writeText(content);
    setActiveDropdown(null);
    // Could show a toast notification here in the future
  };

  /**
   * Copies plain text content to clipboard
   * @param {string} content - Text content to copy
   */
  const handleCopyText = (content) => copyToClipboard(content);

  /**
   * Copies markdown content to clipboard
   * @param {string} content - Markdown content to copy
   */
  const handleCopyMarkdown = (content) => copyToClipboard(content);
  
  /**
   * Regenerates an AI response for a given message
   * @param {number} index - Index of the message to regenerate a response for
   */
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

  /**
   * Handles the submission of a new prompt
   * @param {Event} e - Form submission event
   */
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

  /**
   * Appends the current prompt to the conversation without generating a response
   */
  const handleAppend = () => {
    if (!currentPrompt.trim()) return;
    
    // Add user's message without generating a response
    const userMessage = { role: 'user', content: currentPrompt.trim() };
    setMessages(prev => [...prev, userMessage]);
    setCurrentPrompt('');
  };

  return (
    <div className="gemini-prompt">
      <div className="chat-history" ref={chatHistoryRef}>
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
                  <div className="dropdown-container">
                    <button onClick={(e) => toggleDropdown(index, e)}>🍔</button>
                    {activeDropdown && activeDropdown.index === index && (
                      <div className="dropdown-menu" style={{
                        top: `${activeDropdown.position.top}px`,
                        left: `${activeDropdown.position.left}px`
                      }}>
                        <button onClick={() => handleDeleteMessage(index)}>Delete</button>
                        <button onClick={() => handleCopyText(msg.content)}>Copy text</button>
                        <button onClick={() => handleCopyMarkdown(msg.content)}>Copy markdown</button>
                      </div>
                    )}
                  </div>
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
              } else if (e.altKey && e.key === 'Enter') {
                e.preventDefault();
                handleAppend();
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
              onClick={handleAppend}
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
