// src/components/MainArea.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { generateChatResponse, countTokens } from '../services/geminiService';
import './MainArea.css';
import 'highlight.js/styles/github-dark.css'; // Theme for syntax highlighting

// Model token limits
const MODEL_TOKEN_LIMITS = { 'gemini-2.5-pro-exp-03-25': 1048576, 'gemini-1.5-pro': 2097152, 'gemini-1.5-flash-8b': 1048576, 'gemini-1.5-flash': 1048576, 'gemini-2.0-flash': 1048576, 'gemini-2.0-flash-lite': 1048576, 'gemini-1.0-pro': 32768 };
// Max output limits
const MODEL_MAX_OUTPUT_TOKENS = { 'gemini-2.5-pro-exp-03-25': 65536, 'default': 8192 };
// Helpers
const getTokenLimit = (model) => MODEL_TOKEN_LIMITS[model] || 32768;
const getMaxOutputTokens = (model) => MODEL_MAX_OUTPUT_TOKENS[model] || MODEL_MAX_OUTPUT_TOKENS['default'];

// --- Main Component ---
const MainArea = forwardRef(({
  selectedModel = "gemini-2.0-flash-lite", temperature = 1, outputLength = 8192, topP = 0.95,
  messages = [], setMessages, onTokenCountChange = () => {}, addDebugLog = () => {}, filePool = [] // Receives processedFilesData here
}, ref) => {

  // --- State ---
  const [inputValue, setInputValue] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [expandedMessages, setExpandedMessages] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showSystemInstructions, setShowSystemInstructions] = useState(false);
  const chatHistoryRef = useRef(null);
  const dropdownRefs = useRef({});

  // --- Effects ---
  useEffect(() => { /* Scroll effect */ if (chatHistoryRef.current) { setTimeout(() => { if (chatHistoryRef.current) chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight; }, 50); } }, [messages]);

  // *** CORRECTED Token count effect ***
  useEffect(() => {
    const calculateConversationTokenCount = async () => {
      let conversationContent = "";
      // 1. Add System Instructions
      if (systemInstructions.trim()) {
        conversationContent += `System: ${systemInstructions.trim()}\n\n`;
      }
      // 2. Add Message History ONLY
      conversationContent += messages
        .map(msg => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`)
        .join('\n');

      try {
        // Count tokens for ONLY the conversation part
        const count = await countTokens(conversationContent, selectedModel);
        const limit = getTokenLimit(selectedModel); // Limit is still relevant
        // Report ONLY conversation count back to App.js
        onTokenCountChange(count, limit);
      } catch (error) {
        console.error('Error counting conversation tokens:', error);
        const limit = getTokenLimit(selectedModel);
        onTokenCountChange(0, limit); // Report 0 on error
      }
    };
    calculateConversationTokenCount();
    // Depend only on messages and systemInstructions for *this* count
  }, [messages, systemInstructions, selectedModel, onTokenCountChange]);
  // *** END CORRECTION ***

  useEffect(() => { /* Output length check effect */ const maxAllowed = getMaxOutputTokens(selectedModel); if (outputLength > maxAllowed) { addDebugLog({ type: 'warning', message: `Configured Output Length (${outputLength}) exceeds limit (${maxAllowed}) for model ${selectedModel}. It will be capped.`, details: { current: outputLength, limit: maxAllowed } }); console.warn(`Output length ${outputLength} exceeds limit ${maxAllowed}. Input is capped.`); } }, [selectedModel, outputLength, addDebugLog]);
  useEffect(() => { /* Dropdown close effect */ const handleClickOutside = (event) => { if (activeDropdown && !event.target.closest('.dropdown-menu') && !event.target.closest('.dropdown-toggle-button')) setActiveDropdown(null); }; const handleScroll = () => setActiveDropdown(null); document.addEventListener('click', handleClickOutside, true); document.addEventListener('scroll', handleScroll, true); return () => { document.removeEventListener('click', handleClickOutside, true); document.removeEventListener('scroll', handleScroll, true); }; }, [activeDropdown]);

  // --- Imperative Handle ---
  useImperativeHandle(ref, () => ({ clearHistory: () => { addDebugLog({ type: 'clear-history', message: `Clearing ${messages.length} messages.` }); setMessages([]); setEditingMessageId(null); setEditingContent(''); setActiveDropdown(null); setExpandedMessages({}); console.log("History cleared via ref"); } }), [setMessages, addDebugLog, messages.length]);

  // --- Event Handlers ---
  const handleSubmit = async (e) => { /* ...no changes needed here... */ e.preventDefault(); const trimmedInput = inputValue.trim(); if (!trimmedInput || isLoading) return; const userMessage = { id: Date.now(), role: 'user', content: trimmedInput }; const currentMessages = [...messages, userMessage]; setMessages(currentMessages); setInputValue(''); setIsLoading(true); const apiMessages = [...currentMessages]; if (filePool?.length > 0) addDebugLog({ type: 'files-included', message: `Including ${filePool.length} files...`, details: { fileCount: filePool.length, fileNames: filePool.map(f => f.name) } }); try { const userTokenCount = await countTokens(trimmedInput, selectedModel); addDebugLog({ type: 'user-input', message: trimmedInput, tokenCount: userTokenCount }); } catch (tokenError) { console.error("Error counting user input tokens:", tokenError); } try { const response = await generateChatResponse( apiMessages, selectedModel, temperature, outputLength, topP, systemInstructions, filePool ); const assistantMessage = { id: Date.now() + 1, role: 'assistant', content: response.text }; setMessages([...currentMessages, assistantMessage]); addDebugLog({ type: 'api-response', message: response.text, tokenCount: response.tokenCount || 0, responseTime: response.responseTime, model: selectedModel, temperature: temperature, outputLength: outputLength, topP: topP, }); } catch (error) { console.error('Error getting response:', error); const errorMessage = { id: Date.now() + 1, role: 'assistant', content: `Sorry, there was an error: ${error.message}`, isError: true }; setMessages([...currentMessages, errorMessage]); addDebugLog({ type: 'error', message: error.message || error.toString(), model: selectedModel, temperature, outputLength, topP }); } finally { setIsLoading(false); } };
  const handleAppend = () => { /* ...no changes needed here... */ const trimmedInput = inputValue.trim(); if (!trimmedInput || isLoading) return; const userMessage = { id: Date.now(), role: 'user', content: trimmedInput }; setMessages([...messages, userMessage]); setInputValue(''); addDebugLog({ type: 'user-message-only', message: trimmedInput, details: { note: 'Message appended without API request' } }); };
  const handleKeyDown = (e) => { /* ...no changes needed here... */ if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSubmit(e); } else if (e.altKey && e.key === 'Enter') { e.preventDefault(); handleAppend(); } };
  const toggleMessageExpansion = (messageId) => { /* ...no changes needed here... */ setExpandedMessages(prev => ({ ...prev, [messageId]: !prev[messageId] })); };
  const startEditingMessage = (messageId, content) => { /* ...no changes needed here... */ setEditingMessageId(messageId); setEditingContent(content); setActiveDropdown(null); };
  const saveMessageEdit = async () => { /* ...no changes needed here... */ if (editingMessageId === null) return; const originalMessage = messages.find(msg => msg.id === editingMessageId); if (!originalMessage) return; if (originalMessage.content !== editingContent) { setMessages(prevMessages => prevMessages.map(msg => msg.id === editingMessageId ? { ...msg, content: editingContent } : msg )); addDebugLog({ type: 'message-edit', message: `Message ${editingMessageId} edited.`, details: { /* ... */ } }); } setEditingMessageId(null); setEditingContent(''); };
  const cancelMessageEdit = () => { /* ...no changes needed here... */ setEditingMessageId(null); setEditingContent(''); };
  const handleRegenerateMessage = async (messageId) => { /* ...no changes needed here... */ setActiveDropdown(null); const messageIndex = messages.findIndex(msg => msg.id === messageId); if (messageIndex === -1) return; const messageToRegen = messages[messageIndex]; let conversationToSubmit; let logType; if (messageToRegen.role === 'assistant') { let userPromptIndex = messageIndex - 1; while (userPromptIndex >= 0 && messages[userPromptIndex].role !== 'user') userPromptIndex--; if (userPromptIndex < 0) { addDebugLog({ type: 'error', message: 'Cannot regenerate: No preceding user message found.' }); return; } conversationToSubmit = messages.slice(0, userPromptIndex + 1); logType = 'regenerate-assistant'; } else if (messageToRegen.role === 'user') { conversationToSubmit = messages.slice(0, messageIndex + 1); logType = 'rerun-from-user'; } else return; setMessages(conversationToSubmit); setIsLoading(true); addDebugLog({ type: logType, message: `Regenerating based on history up to message ${messageId}`, details: { /* ... */ } }); try { const response = await generateChatResponse( conversationToSubmit, selectedModel, temperature, outputLength, topP, systemInstructions, filePool ); const assistantMessage = { id: Date.now(), role: 'assistant', content: response.text }; setMessages([...conversationToSubmit, assistantMessage]); addDebugLog({ type: 'api-response', /* ... */ message: response.text, tokenCount: response.tokenCount, responseTime: response.responseTime }); } catch (error) { console.error('Error regenerating:', error); const errorMessage = { id: Date.now(), role: 'assistant', content: `Error regenerating: ${error.message}`, isError: true }; setMessages([...conversationToSubmit, errorMessage]); addDebugLog({ type: 'error', message: `Error regenerating: ${error.toString()}` }); } finally { setIsLoading(false); } };
  const toggleDropdown = (messageId, event) => { /* ...no changes needed here... */ event.stopPropagation(); const buttonElement = event.currentTarget; dropdownRefs.current[messageId] = buttonElement; if (activeDropdown?.id === messageId) setActiveDropdown(null); else { const buttonRect = buttonElement.getBoundingClientRect(); const dropdownPosition = { top: buttonRect.bottom + window.scrollY + 5, left: buttonRect.left + window.scrollX - 150 + buttonRect.width, }; setActiveDropdown({ id: messageId, position: dropdownPosition }); } };
  const handleDeleteMessage = (messageId) => { /* ...no changes needed here... */ const messageToDelete = messages.find(msg => msg.id === messageId); setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId)); setActiveDropdown(null); addDebugLog({ type: 'message-delete', message: `Message ${messageId} deleted.`, details: { /* ... */ } }); };
  const copyToClipboard = (content) => { /* ...no changes needed here... */ navigator.clipboard.writeText(content).then(() => addDebugLog({ type: 'info', message: 'Content copied.'})).catch(err => addDebugLog({ type: 'error', message: 'Failed to copy.'})); setActiveDropdown(null); };

  // --- JSX ---
  return (
    <div className="main-area-container">
      {/* System Instructions Input */}
      <div className={`system-instructions-container ${showSystemInstructions ? 'expanded' : 'collapsed'}`}>
         <div className="instructions-header" onClick={() => setShowSystemInstructions(!showSystemInstructions)}> <label htmlFor="system-instructions-input">System Instructions</label> <button className="toggle-button" onClick={(e) => { e.stopPropagation(); setShowSystemInstructions(!showSystemInstructions); }} title={showSystemInstructions ? "Collapse" : "Expand"}> {showSystemInstructions ? '−' : '+'} </button> </div>
        {showSystemInstructions && ( <textarea id="system-instructions-input" className="system-instructions-input" value={systemInstructions} onChange={(e) => setSystemInstructions(e.target.value)} placeholder="Enter system instructions..." rows="3" /> )}
      </div>

      {/* Chat History */}
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.role} ${expandedMessages[msg.id] ? 'expanded' : ''} ${editingMessageId === msg.id ? 'editing' : ''} ${msg.isError ? 'error' : ''}`}>
             <div className="message-actions"> {editingMessageId === msg.id ? ( <> <button onClick={saveMessageEdit} className="action-button save" title="Save">✔️</button> <button onClick={cancelMessageEdit} className="action-button cancel" title="Cancel">❌</button> </> ) : ( <> <button onClick={() => toggleMessageExpansion(msg.id)} className="action-button expand-toggle" title={expandedMessages[msg.id] ? 'Collapse' : 'Expand'}>{expandedMessages[msg.id] ? '➖' : '➕'}</button> <button onClick={() => startEditingMessage(msg.id, msg.content)} className="action-button edit" title="Edit">✏️</button> <button onClick={() => handleRegenerateMessage(msg.id)} className="action-button regenerate" title="Regenerate">💎</button> <div className="dropdown-container"><button onClick={(e) => toggleDropdown(msg.id, e)} className="action-button dropdown-toggle-button" title="More...">🍔</button> {activeDropdown?.id === msg.id && (<div className="dropdown-menu" style={{ top: `${activeDropdown.position.top}px`, left: `${activeDropdown.position.left}px` }}><button onClick={() => handleDeleteMessage(msg.id)}>Delete Message</button><button onClick={() => copyToClipboard(msg.content)}>Copy Text</button></div>)}</div> </> )} </div>
             <strong className="message-sender">{msg.role === 'assistant' ? 'Gemini' : 'You'}:</strong>
            <div className="message-content-wrapper">
              {editingMessageId === msg.id ? ( <textarea className="edit-message-textarea" value={editingContent} onChange={(e) => setEditingContent(e.target.value)} rows={Math.max(3, editingContent.split('\n').length)} autoFocus />
              ) : (
                <div className="markdown-content"> <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]} >{msg.content || ''}</ReactMarkdown> </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && ( <div className="message-bubble assistant loading"><div className="loading-indicator">Generating response...</div></div> )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="prompt-form">
         <div className="input-container"> <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter your prompt here..." rows={3} onKeyDown={handleKeyDown} className="prompt-textarea" disabled={isLoading} /> <div className="side-buttons"> <button type="submit" disabled={isLoading || !inputValue.trim()} title="Run (CTRL+ENTER)" className="run-button">{isLoading ? 'Generating...' : 'Run'}</button> <button type="button" onClick={handleAppend} disabled={isLoading || !inputValue.trim()} title="Append (ALT+ENTER)" className="append-button">Append</button> </div> </div>
      </form>
    </div>
  );
});

export default MainArea;