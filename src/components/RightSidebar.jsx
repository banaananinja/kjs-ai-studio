// src/components/RightSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './RightSidebar.css';
// Import helper function for output limits, or redefine here
// import { getMaxOutputTokens } from './MainArea'; // If defined there

// Define getMaxOutputTokens here if not importing
const MODEL_MAX_OUTPUT_TOKENS = {
  'gemini-2.5-pro-exp-03-25': 65536,
  'default': 8192
};
const getSidebarMaxOutputTokens = (model) => MODEL_MAX_OUTPUT_TOKENS[model] || MODEL_MAX_OUTPUT_TOKENS['default'];


function RightSidebar({
  // Model props
  selectedModel,
  setSelectedModel,
  // Parameter props
  temperature,
  setTemperature,
  outputLength,
  setOutputLength,
  topP,
  setTopP,
  // Token props
  tokenCount = 0, // Combined count from App.js
  tokenLimit = 32768,
  // Debug props
  debugLogs = [],
  clearDebugLogs = () => {},
  // History props
  onClearHistory = () => {},
  // File Pool props (Placeholders for Phase 3)
  filePool = [],
  setFilePool = () => {},
  filePoolTokenCount = 0,
  setFilePoolTokenCount = () => {},
  addDebugLog = () => {}, // Used by file pool later
}) {
  // Dropdown expansion states (local UI state)
  const [toolsOpen, setToolsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false); // Closed by default
  const [filePoolOpen, setFilePoolOpen] = useState(false); // Closed by default
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  const models = [
    { name: "Gemini 2.5 Pro Experimental", code: "gemini-2.5-pro-exp-03-25" },
    { name: "Gemini 2.0 Flash", code: "gemini-2.0-flash" },
    { name: "Gemini 2.0 Flash-Lite", code: "gemini-2.0-flash-lite" },
    { name: "Gemini 1.5 Flash", code: "gemini-1.5-flash" },
    { name: "Gemini 1.5 Flash-8B", code: "gemini-1.5-flash-8b" },
    { name: "Gemini 1.5 Pro", code: "gemini-1.5-pro" },
  ];

  // --- Handlers for Controls (Update App.js state via props) ---

  // Temperature slider AND text input handler
  const handleTemperatureChange = (value) => {
    const newTemp = parseFloat(value);
    if (!isNaN(newTemp) && newTemp >= 0 && newTemp <= 2) {
      setTemperature(newTemp); // Update App.js state
    }
  };

  // Output Length text input handler (with validation)
  const handleOutputLengthChange = (value) => {
     const maxAllowed = getSidebarMaxOutputTokens(selectedModel);
     let newLength = parseInt(value, 10);

     if (isNaN(newLength) || newLength < 1) {
         newLength = 1; // Minimum valid value
     } else if (newLength > maxAllowed) {
         newLength = maxAllowed; // Cap at max allowed
     }
     setOutputLength(newLength); // Update App.js state
  };

   // Top P slider AND text input handler
   const handleTopPChange = (value) => {
       const newTopP = parseFloat(value);
       if (!isNaN(newTopP) && newTopP >= 0 && newTopP <= 1) {
         setTopP(newTopP); // Update App.js state
       }
   };

  // Stop Sequences handler (if needed later)
  // const [stopSequences, setStopSequences] = useState('');
  // const handleStopSequencesChange = (e) => setStopSequences(e.target.value);


  // --- UI Interaction Handlers ---

  const toggleTools = () => setToolsOpen(!toolsOpen);
  const toggleAdvanced = () => setAdvancedOpen(!advancedOpen);
  const toggleDebug = () => setDebugOpen(!debugOpen);
  const toggleFilePool = () => setFilePoolOpen(!filePoolOpen); // For Phase 3

  // Clear History confirmation
  const handleClearHistoryClick = () => {
    setShowClearConfirmation(true);
    setToolsOpen(false); // Close tools dropdown
  };

  const confirmClearHistory = () => {
    onClearHistory(); // Call the function passed from App.js
    setShowClearConfirmation(false);
  };

  const cancelClearHistory = () => {
    setShowClearConfirmation(false);
  };

  // Format timestamp for debug logs (from stable app)
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return "Invalid Date";
    }
  };

  // --- Render ---
  return (
    <div className="right-sidebar">
      {/* Model Selector Drop-down */}
      <div className="model-selector">
        <label htmlFor="model-select">Model:</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)} // Update App.js state
        >
          {models.map((model) => (
            <option key={model.code} value={model.code}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Token Count Display */}
      <div className="token-count-display"> {/* Added a wrapper class */}
        <p>Tokens: {tokenCount} / {tokenLimit}</p>
      </div>

      {/* Temperature Control (Slider + Text Input) */}
      <div className="parameter-control">
        <div className="label-input-group">
          <label htmlFor="temperature-input">Temperature:</label>
          <input
              type="number"
              id="temperature-input"
              className="value-input"
              value={temperature.toFixed(2)} // Display state from App.js
              onChange={(e) => handleTemperatureChange(e.target.value)}
              step="0.01" min="0" max="2"
          />
        </div>
        <input
          type="range"
          id="temperature-slider"
          min="0"
          max="2"
          step="0.01"
          value={temperature} // Use state from App.js
          onChange={(e) => handleTemperatureChange(e.target.value)}
          className="slider"
        />
         {/* Optional: Add labels like Precise/Creative if desired */}
         {/* <div className="slider-labels"><span>Precise</span><span>Creative</span></div> */}
      </div>

      {/* Tools Dropdown */}
      <div className="settings-dropdown"> {/* Reusing class from stable app */}
        <button onClick={toggleTools} className="dropdown-toggle-button">
          <span>Tools</span>
          <span>{toolsOpen ? '▲' : '▼'}</span>
        </button>
        {toolsOpen && (
          <div className="dropdown-menu-content tools-menu"> {/* Reusing classes */}
             {/* Make items look like buttons */}
             <button className="tool-button" onClick={() => navigator.clipboard.writeText(JSON.stringify(debugLogs))}>
                Copy Debug Logs
             </button>
             <button className="tool-button" onClick={handleClearHistoryClick}>
                Clear Conversation History
             </button>
             {/* Add Export later if needed */}
          </div>
        )}
      </div>

      {/* Advanced Settings Dropdown */}
      <div className="settings-dropdown">
        <button onClick={toggleAdvanced} className="dropdown-toggle-button">
          <span>Advanced Settings</span>
          <span>{advancedOpen ? '▲' : '▼'}</span>
        </button>
        {advancedOpen && (
          <div className="dropdown-menu-content settings-menu"> {/* Reusing classes */}
            {/* Output Length Control */}
            <div className="parameter-control">
               <label htmlFor="output-length-input">Output Token Limit:</label>
               <input
                   type="number"
                   id="output-length-input"
                   className="dark-input" // Use a consistent input style
                   value={outputLength} // Use state from App.js
                   onChange={(e) => handleOutputLengthChange(e.target.value)}
                   min="1"
                   max={getSidebarMaxOutputTokens(selectedModel)} // Dynamic max based on model
                   placeholder={`Max: ${getSidebarMaxOutputTokens(selectedModel)}`}
               />
            </div>

            {/* Top P Control (Slider + Text Input) */}
             <div className="parameter-control">
               <div className="label-input-group">
                   <label htmlFor="topP-input">Top P:</label>
                   <input
                       type="number"
                       id="topP-input"
                       className="value-input"
                       value={topP.toFixed(2)} // Use state from App.js
                       onChange={(e) => handleTopPChange(e.target.value)}
                       step="0.01" min="0" max="1"
                   />
               </div>
               <input
                   type="range"
                   id="topP-slider"
                   min="0"
                   max="1"
                   step="0.01"
                   value={topP} // Use state from App.js
                   onChange={(e) => handleTopPChange(e.target.value)}
                   className="slider"
               />
             </div>

             {/* Stop Sequences Input (Optional) */}
              {/* <div className="parameter-control">
                  <label htmlFor="stop-sequences">Stop Sequences:</label>
                  <input type="text" id="stop-sequences" className="dark-input" placeholder="Comma separated" />
              </div> */}
          </div>
        )}
      </div>

      {/* File Pool Section (Placeholder for Phase 3) */}
       <div className="settings-dropdown">
           <button onClick={toggleFilePool} className="dropdown-toggle-button">
               <span>File Pool {filePool.length > 0 ? `(${filePool.length})` : ''}</span>
               <span>{filePoolOpen ? '▲' : '▼'}</span>
           </button>
           {filePoolOpen && (
               <div className="dropdown-menu-content file-pool-placeholder">
                   <p>File Pool functionality coming in Phase 3.</p>
                   {/* File pool UI will go here */}
               </div>
           )}
       </div>


      {/* Debug Section */}
      <div className="settings-dropdown debug-section"> {/* Added debug-section class */}
        <button onClick={toggleDebug} className="dropdown-toggle-button">
           <span>Debug Information</span>
           <span>{debugOpen ? '▲' : '▼'}</span>
        </button>
        {debugOpen && (
          <div className="dropdown-menu-content debug-content"> {/* Reusing classes */}
            <div className="debug-logs">
              {debugLogs.length === 0 ? (
                <p className="no-logs">No interactions logged yet.</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={`${log.timestamp}-${index}`} className={`debug-log ${log.type}`}> {/* Use timestamp+index for key */}
                    <div className="log-header">
                      <span className="log-time">{formatTime(log.timestamp)}</span>
                      {/* Map log types to readable names/icons (from stable app) */}
                       <span className="log-type">
                           {log.type === 'api-response' ? '🤖 API Response' :
                            log.type === 'user-message-only' ? '📝 Appended' :
                            log.type === 'user-input' ? '💬 User Input' :
                            log.type === 'clear-history' ? '🧹 History Cleared' :
                            log.type === 'message-edit' ? '✏️ Edited' :
                            log.type === 'rerun-from-user' ? '🔄 Rerun (User)' :
                            log.type === 'regenerate-assistant' ? '🔄 Regenerate (AI)' :
                            log.type === 'files-included' ? '📎 Files Sent' :
                            log.type === 'file-added' ? '📂 File Added' :      // For Phase 3
                            log.type === 'file-removed' ? '🗑️ File Removed' :    // For Phase 3
                            log.type === 'file-pool-cleared' ? '🧹 Pool Cleared' : // For Phase 3
                            log.type === 'debug-clear' ? '🧹 Logs Cleared' :
                            log.type === 'output-length-auto-adjusted' ? '📐 Output Adjusted' :
                            log.type === 'message-delete' ? '🗑️ Deleted' :
                            log.type === 'error' ? '❌ Error' :
                            `ℹ️ ${log.type || 'Info'}` /* Default/Unknown type */
                           }
                       </span>
                    </div>
                    <div className="log-details">
                       {/* Conditionally display relevant details */}
                       {log.model && <div><strong>M:</strong> {log.model.replace('gemini-', '')}</div>}
                       {typeof log.temperature === 'number' && <div><strong>T:</strong> {log.temperature.toFixed(2)}</div>}
                       {typeof log.tokenCount === 'number' && <div><strong>Tok:</strong> {log.tokenCount}</div>}
                       {log.responseTime && <div><strong>Ms:</strong> {log.responseTime}</div>}
                       {typeof log.outputLength === 'number' && <div><strong>Out:</strong> {log.outputLength}</div>}
                       {typeof log.topP === 'number' && <div><strong>TopP:</strong> {log.topP.toFixed(2)}</div>}
                       {log.message && (
                           <div className="log-message">
                               <strong>Msg:</strong>
                               {/* Simple text display for now, expandable later if needed */}
                               <div className="message-content-preview">{log.message.substring(0, 150)}{log.message.length > 150 ? '...' : ''}</div>
                           </div>
                       )}
                       {log.details && <div className="log-extra-details"><pre>{JSON.stringify(log.details, null, 2)}</pre></div>}
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Clear Debug Logs Button */}
            {debugLogs.length > 0 && (
                <button
                    onClick={clearDebugLogs} // Use handler from props
                    className="clear-debug-button"
                >
                    Clear Debug Logs
                </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clear History */}
      {showClearConfirmation && (
        <div className="confirmation-modal-overlay">
          <div className="confirmation-modal">
            <h3>Clear Conversation History</h3>
            <p>Are you sure you want to clear all messages in this conversation? This action cannot be undone.</p>
            <div className="confirmation-buttons">
              <button className="cancel-button" onClick={cancelClearHistory}>No, Cancel</button>
              <button className="confirm-button" onClick={confirmClearHistory}>Yes, Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RightSidebar;