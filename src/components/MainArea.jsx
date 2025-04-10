// src/components/MainArea.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight'; // Optional: for code syntax highlighting
import remarkGfm from 'remark-gfm';
import { generateChatResponse, countTokens } from '../services/geminiService';
import './MainArea.css'; // Ensure this points to the renamed CSS file

// Model token limits (copied from stable app)
const MODEL_TOKEN_LIMITS = {
  'gemini-2.5-pro-exp-03-25': 1048576,
  'gemini-1.5-pro': 2097152,
  'gemini-1.5-flash-8b': 1048576,
  'gemini-1.5-flash': 1048576,
  'gemini-2.0-flash': 1048576,
  'gemini-2.0-flash-lite': 1048576,
  // Add other models if necessary
  'gemini-1.0-pro': 32768,
};

// Maximum output token limits by model (copied from stable app)
const MODEL_MAX_OUTPUT_TOKENS = {
  'gemini-2.5-pro-exp-03-25': 65536,
  'default': 8192
};

// Helper functions (copied from stable app)
const getTokenLimit = (model) => MODEL_TOKEN_LIMITS[model] || 32768;
const getMaxOutputTokens = (model) => MODEL_MAX_OUTPUT_TOKENS[model] || MODEL_MAX_OUTPUT_TOKENS['default'];

// --- Main Component ---
const MainArea = forwardRef(({
  selectedModel = "gemini-2.0-flash-lite",
  temperature = 1,
  outputLength = 8192, // Receive from App.js later
  topP = 0.95,         // Receive from App.js later
  messages = [],       // Receive messages from App.js
  setMessages,       // Receive setter from App.js
  onTokenCountChange = () => {}, // Receive from App.js
  addDebugLog = () => {}, // Receive from App.js later
  filePool = []        // Receive from App.js later
}, ref) => {

  // Local state for UI interactions
  const [inputValue, setInputValue] = useState('');
  const [systemInstructions, setSystemInstructions] = useState(''); // Local state for now
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null); // Use message ID (timestamp)
  const [editingContent, setEditingContent] = useState('');
  const [expandedMessages, setExpandedMessages] = useState({}); // Use message ID
  const [activeDropdown, setActiveDropdown] = useState(null); // { id: messageId, position: { top, left } }
  const [showSystemInstructions, setShowSystemInstructions] = useState(false); // For expand/collapse

  const chatHistoryRef = useRef(null);
  const dropdownRefs = useRef({}); // To store refs for dropdown buttons

  // --- Effects ---

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  // Update token count when messages or model change
  useEffect(() => {
    const calculateTokenCount = async () => {
      let currentContent = "";
      if (systemInstructions.trim()) {
        currentContent += `System: ${systemInstructions}\n\n`;
      }
      // Include file pool content if files exist (prepended as system info)
      if (filePool && filePool.length > 0) {
         const fileContents = filePool.map(file => `File: ${file.name}\n${file.content}\n---`).join('\n\n');
         currentContent += `### Reference Files:\n\n${fileContents}\n\n`;
      }
      // Add message history
      currentContent += messages
        .map(msg => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`)
        .join('\n\n');

      try {
        const count = await countTokens(currentContent, selectedModel);
        const limit = getTokenLimit(selectedModel);
        onTokenCountChange(count, limit); // Notify parent
      } catch (error) {
        console.error('Error counting tokens:', error);
        const limit = getTokenLimit(selectedModel);
        onTokenCountChange(0, limit); // Notify parent with 0 count on error
      }
    };

    calculateTokenCount();
  }, [messages, selectedModel, systemInstructions, filePool, onTokenCountChange]); // Rerun when these change


  // Ensure OutputLength is within limits when model changes (from stable app)
  useEffect(() => {
    const maxAllowed = getMaxOutputTokens(selectedModel);
    // This check requires outputLength to be passed down correctly,
    // We'll fully enable this when App.js state is set up.
    /*
    if (outputLength > maxAllowed) {
      // TODO: Need a way to signal this change back up to App.js
      console.warn(`Output length ${outputLength} exceeds limit ${maxAllowed} for ${selectedModel}. Clamping.`);
      // setOutputLength(maxAllowed); // Cannot directly set prop
    }
    */
  }, [selectedModel, outputLength]);


  // Close dropdown when clicking outside or scrolling (from app-2 GeminiPrompt)
  useEffect(() => {
    const handleClickOutside = (event) => {
       // Close if click is outside *any* dropdown button and the menu itself
       if (activeDropdown && !event.target.closest('.dropdown-menu') && !event.target.closest('.dropdown-toggle-button')) {
          setActiveDropdown(null);
       }
    };
    const handleScroll = () => setActiveDropdown(null);

    document.addEventListener('click', handleClickOutside, true); // Use capture phase
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdown]);


  // --- Imperative Handle for Clearing History --- (from stable app)
  useImperativeHandle(ref, () => ({
    clearHistory: () => {
      setMessages([]); // Update messages via the prop setter
      setEditingMessageId(null);
      setEditingContent('');
      setActiveDropdown(null);
      setExpandedMessages({});
      // Log action (will be passed via addDebugLog prop later)
      addDebugLog({
         type: 'clear-history',
         timestamp: new Date().toISOString(),
         model: selectedModel,
         temperature, outputLength, topP, // Use props passed down
         message: 'Conversation history cleared'
      });
      console.log("History cleared");
    }
  }));

  // --- Event Handlers ---

  // Handle main prompt submission (merging stable app logic with file pool prep)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = { id: Date.now(), role: 'user', content: trimmedInput };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages); // Update state via prop
    setInputValue('');
    setIsLoading(true);

    // Prepare conversation history for API call
    let apiMessages = [];
    // Add file contents if available
    if (filePool && filePool.length > 0) {
       const fileContents = filePool.map(file => `File: ${file.name}\n${file.content}\n---`).join('\n\n');
       // Prepending files as a system-like context message
       // Note: The SDK handles system instructions separately, so we don't add them here
       // but pass them to the model config. We will treat file context similarly.
       // For now, let's try prepending it to the *user's* first message or the current prompt.
       // A cleaner way might be needed depending on API behavior.
       // Let's just pass the raw messages for now and handle context in the service if needed.
       apiMessages = [...currentMessages];

       // Log file inclusion
        addDebugLog({
          type: 'files-included', timestamp: new Date().toISOString(),
          model: selectedModel, temperature, outputLength, topP,
          message: `Including ${filePool.length} files in request context.`,
          details: { fileCount: filePool.length, fileNames: filePool.map(f => f.name) }
        });
    } else {
       apiMessages = [...currentMessages];
    }


     // Log user input
     try {
         const userTokenCount = await countTokens(trimmedInput, selectedModel);
         addDebugLog({
             type: 'user-input', timestamp: new Date().toISOString(),
             model: selectedModel, temperature, outputLength, topP,
             message: trimmedInput, tokenCount: userTokenCount
         });
     } catch (tokenError) { console.error("Error counting user input tokens:", tokenError); }


    try {
      const response = await generateChatResponse(
        apiMessages, // Pass the messages array
        selectedModel,
        temperature,
        outputLength, // Pass down from props
        topP,          // Pass down from props
        systemInstructions // Pass down system instructions
      );

      const assistantMessage = { id: Date.now() + 1, role: 'assistant', content: response.text };
      setMessages([...currentMessages, assistantMessage]); // Update state via prop

      // Log API response
       addDebugLog({
           type: 'api-response', timestamp: new Date().toISOString(),
           model: response.modelUsed || selectedModel,
           temperature: response.temperatureUsed || temperature,
           outputLength: response.outputLengthUsed || outputLength,
           topP: response.topPUsed || topP,
           message: response.text,
           tokenCount: response.tokenCount || 0,
           responseTime: response.responseTime
       });

    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Sorry, there was an error: ${error.message}`, // Provide more error detail
        isError: true
      };
      setMessages([...currentMessages, errorMessage]); // Update state via prop

       // Log error
       addDebugLog({
           type: 'error', timestamp: new Date().toISOString(),
           model: selectedModel, temperature, outputLength, topP,
           message: error.toString()
       });
    } finally {
      setIsLoading(false);
    }
  };

  // Append message without API call (from stable app)
  const handleAppend = () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = { id: Date.now(), role: 'user', content: trimmedInput };
    setMessages([...messages, userMessage]); // Update state via prop
    setInputValue('');

    // Log append action
     addDebugLog({
         type: 'user-message-only', timestamp: new Date().toISOString(),
         model: selectedModel, temperature, outputLength, topP,
         message: trimmedInput, details: { note: 'Message appended without API request' }
     });
  };

  // Handle keyboard shortcuts (Ctrl+Enter / Alt+Enter)
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.altKey && e.key === 'Enter') {
      e.preventDefault();
      handleAppend();
    }
  };

  // --- Message Interaction Handlers (from app-2 GeminiPrompt, adapted for IDs) ---

  const toggleMessageExpansion = (messageId) => {
    setExpandedMessages(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const startEditingMessage = (messageId, content) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
    setActiveDropdown(null); // Close dropdown when editing starts
  };

  const saveMessageEdit = async () => {
    if (editingMessageId === null) return;

    const originalMessage = messages.find(msg => msg.id === editingMessageId);
    if (!originalMessage) return;

    // Only save if content actually changed
    if (originalMessage.content !== editingContent) {
       setMessages(prevMessages =>
           prevMessages.map(msg =>
               msg.id === editingMessageId ? { ...msg, content: editingContent } : msg
           )
       );
        // Log edit action
        addDebugLog({
            type: 'message-edit', timestamp: new Date().toISOString(),
            model: selectedModel, temperature, outputLength, topP,
            message: `Message ${editingMessageId} edited. New content: ${editingContent.substring(0, 50)}...`
        });
    }
    setEditingMessageId(null);
    setEditingContent('');

     // Optional: Regenerate response if an assistant message was edited?
     // Or only allow editing user messages? For now, allows editing both.
  };

  const cancelMessageEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleRegenerateMessage = async (messageId) => {
      setActiveDropdown(null); // Close dropdown
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;

      const messageToRegen = messages[messageIndex];
      let conversationToSubmit;
      let logType;

      if (messageToRegen.role === 'assistant') {
          // Find the user message immediately preceding this assistant message
          let userPromptIndex = messageIndex - 1;
          // Go back further if needed (e.g., multiple assistant messages)
          while (userPromptIndex >= 0 && messages[userPromptIndex].role !== 'user') {
              userPromptIndex--;
          }
          if (userPromptIndex < 0) {
             console.error("Cannot regenerate assistant message without a preceding user message.");
             return; // Cannot regenerate if there's no user prompt before it
          }
          // Submit conversation up to and including the preceding user message
          conversationToSubmit = messages.slice(0, userPromptIndex + 1);
          logType = 'regenerate-assistant';
      } else if (messageToRegen.role === 'user') {
          // Submit conversation up to and including the clicked user message
          conversationToSubmit = messages.slice(0, messageIndex + 1);
          logType = 'rerun-from-user';
      } else {
          return; // Should not happen
      }

      // Update UI immediately: remove messages after the point of regeneration
      setMessages(conversationToSubmit);
      setIsLoading(true);

       // Log regenerate action
       addDebugLog({
           type: logType, timestamp: new Date().toISOString(),
           model: selectedModel, temperature, outputLength, topP,
           message: `Regenerating response based on conversation up to message ${messageId}`
       });

      try {
          const response = await generateChatResponse(
              conversationToSubmit, selectedModel, temperature, outputLength, topP, systemInstructions
          );
          const assistantMessage = { id: Date.now(), role: 'assistant', content: response.text };
          // Append the new assistant message
          setMessages([...conversationToSubmit, assistantMessage]);

          // Log API response
            addDebugLog({
               type: 'api-response', timestamp: new Date().toISOString(),
               model: response.modelUsed || selectedModel,
               temperature: response.temperatureUsed || temperature,
               outputLength: response.outputLengthUsed || outputLength,
               topP: response.topPUsed || topP,
               message: response.text, tokenCount: response.tokenCount || 0, responseTime: response.responseTime
           });
      } catch (error) {
          console.error('Error regenerating response:', error);
          const errorMessage = { id: Date.now(), role: 'assistant', content: `Error regenerating: ${error.message}`, isError: true };
          // Append error message after the point of regeneration
          setMessages([...conversationToSubmit, errorMessage]);

          // Log error
            addDebugLog({
                type: 'error', timestamp: new Date().toISOString(),
                model: selectedModel, temperature, outputLength, topP, message: error.toString()
            });
      } finally {
          setIsLoading(false);
      }
  };


  const toggleDropdown = (messageId, event) => {
    event.stopPropagation(); // Prevent click bubbling up to document listener
    const buttonElement = event.currentTarget;
    dropdownRefs.current[messageId] = buttonElement; // Store ref to button

    if (activeDropdown && activeDropdown.id === messageId) {
      setActiveDropdown(null);
    } else {
      const buttonRect = buttonElement.getBoundingClientRect();
       // Position menu relative to the button
       // Adjust left/top positioning as needed for your layout
      const dropdownPosition = {
        top: buttonRect.bottom + window.scrollY + 5, // Add scrollY for correct positioning
        left: buttonRect.left + window.scrollX - 150 + buttonRect.width, // Adjust as needed
      };
      setActiveDropdown({ id: messageId, position: dropdownPosition });
    }
  };


  const handleDeleteMessage = (messageId) => {
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      setActiveDropdown(null); // Close dropdown
       // Log delete action (if addDebugLog is available)
       addDebugLog({
           type: 'message-delete', timestamp: new Date().toISOString(),
           model: selectedModel, temperature, outputLength, topP,
           message: `Message ${messageId} deleted.`
       });
  };

  const copyToClipboard = (content) => {
      navigator.clipboard.writeText(content)
          .then(() => console.log("Copied to clipboard"))
          .catch(err => console.error("Failed to copy:", err));
      setActiveDropdown(null); // Close dropdown
  };


  // --- JSX ---
  return (
    <div className="main-area-container"> {/* Use a different class name if needed */}
      {/* System Instructions Input */}
      <div className={`system-instructions-container ${showSystemInstructions ? 'expanded' : 'collapsed'}`}>
          <div className="instructions-header">
            <label htmlFor="system-instructions-input">System Instructions</label>
            <button
              className="toggle-button"
              onClick={() => setShowSystemInstructions(!showSystemInstructions)}
              title={showSystemInstructions ? "Collapse" : "Expand"}
            >
              {showSystemInstructions ? '−' : '+'}
            </button>
          </div>
          {showSystemInstructions && (
             <>
              <textarea
                  id="system-instructions-input"
                  className="system-instructions-input"
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  placeholder="Enter system instructions to guide the model's behavior (optional)"
                  rows="3"
              />
               {/* Optional help text */}
               {/* <div className="instructions-help">
                   <i className="info-icon">ⓘ</i> System instructions help steer behavior.
               </div> */}
             </>
          )}
      </div>

      {/* Chat History */}
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.map((msg) => (
          <div
            key={msg.id} // Use unique ID
            className={`message-bubble ${msg.role} ${expandedMessages[msg.id] ? 'expanded' : ''} ${editingMessageId === msg.id ? 'editing' : ''} ${msg.isError ? 'error' : ''}`}
          >
            {/* Action Buttons */}
            <div className="message-actions">
              {editingMessageId === msg.id ? (
                <>
                  <button onClick={saveMessageEdit} className="action-button save" title="Save">✔️</button>
                  <button onClick={cancelMessageEdit} className="action-button cancel" title="Cancel">❌</button>
                </>
              ) : (
                <>
                  <button onClick={() => toggleMessageExpansion(msg.id)} className="action-button expand-toggle" title={expandedMessages[msg.id] ? 'Collapse' : 'Expand'}>
                    {expandedMessages[msg.id] ? '➖' : '➕'}
                  </button>
                  <button onClick={() => startEditingMessage(msg.id, msg.content)} className="action-button edit" title="Edit">✏️</button>
                  <button onClick={() => handleRegenerateMessage(msg.id)} className="action-button regenerate" title="Regenerate">💎</button>
                  <div className="dropdown-container">
                      <button
                          onClick={(e) => toggleDropdown(msg.id, e)}
                          className="action-button dropdown-toggle-button" // Add class for targeting
                          title="More..."
                      >
                          🍔
                      </button>
                       {/* Dropdown Menu - Rendered outside flow using fixed positioning */}
                       {activeDropdown && activeDropdown.id === msg.id && (
                           <div className="dropdown-menu" style={{ top: `${activeDropdown.position.top}px`, left: `${activeDropdown.position.left}px` }}>
                               <button onClick={() => handleDeleteMessage(msg.id)}>Delete Message</button>
                               <button onClick={() => copyToClipboard(msg.content)}>Copy Text</button>
                               {/* Add more options if needed */}
                           </div>
                       )}
                  </div>
                </>
              )}
            </div>

            {/* Message Content */}
            <strong className="message-sender">{msg.role === 'assistant' ? 'Gemini' : 'You'}:</strong>
            <div className="message-content-wrapper"> {/* Wrapper for content */}
              {editingMessageId === msg.id ? (
                <textarea
                  className="edit-message-textarea"
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={Math.max(3, editingContent.split('\n').length)} // Auto-grow slightly
                  autoFocus
                />
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown
                    rehypePlugins={[rehypeHighlight]} // Optional syntax highlighting
                    remarkPlugins={[remarkGfm]}      // Table support etc.
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Loading Indicator */}
        {isLoading && (
          <div className="message-bubble assistant loading">
              <div className="loading-indicator">Generating response...</div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="prompt-form">
          <div className="input-container">
              <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter your prompt here..."
                  rows={3} // Start slightly larger
                  onKeyDown={handleKeyDown}
                  className="prompt-textarea"
                  disabled={isLoading}
              />
              <div className="side-buttons">
                  <button
                      type="submit"
                      disabled={isLoading || !inputValue.trim()}
                      title="Run (CTRL+ENTER)"
                      className="run-button"
                  >
                      {isLoading ? 'Generating...' : 'Run'}
                  </button>
                  <button
                      type="button"
                      onClick={handleAppend}
                      disabled={isLoading || !inputValue.trim()}
                      title="Append (ALT+ENTER)"
                      className="append-button"
                  >
                      Append
                  </button>
              </div>
          </div>
      </form>
    </div>
  );
}); // End of forwardRef

export default MainArea;