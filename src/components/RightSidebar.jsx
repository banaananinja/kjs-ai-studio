// src/components/RightSidebar.jsx
import React, { useState, useCallback, useRef } from 'react';
import './RightSidebar.css';
import FileBrowser from './FileBrowser';

const MODEL_MAX_OUTPUT_TOKENS = { 'gemini-2.5-pro-exp-03-25': 65536, 'default': 8192 };
const getSidebarMaxOutputTokens = (model) => MODEL_MAX_OUTPUT_TOKENS[model] || MODEL_MAX_OUTPUT_TOKENS['default'];

function RightSidebar({
  selectedModel, setSelectedModel, temperature, setTemperature, outputLength, setOutputLength, topP, setTopP,
  tokenCount = 0, tokenLimit = 32768, debugLogs = [], clearDebugLogs = () => {}, onClearHistory = () => {},
  selectedFilePaths = {}, setSelectedFilePaths = () => {}, ancestorPaths = {},
  triggerFileProcessing = () => {}, clearProcessedFiles = () => {},
  fileProcessingLoading = false,
  addDebugLog = () => {},
  isExpanded, toggleExpansion
}) {
  const [toolsOpen, setToolsOpen] = useState(false); const [advancedOpen, setAdvancedOpen] = useState(false); const [debugOpen, setDebugOpen] = useState(false); const [filePoolOpen, setFilePoolOpen] = useState(true); const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  const models = [ /* ... model list ... */ { name: "Gemini 2.5 Pro Experimental", code: "gemini-2.5-pro-exp-03-25" }, { name: "Gemini 2.0 Flash", code: "gemini-2.0-flash" }, { name: "Gemini 2.0 Flash-Lite", code: "gemini-2.0-flash-lite" }, { name: "Gemini 1.5 Flash", code: "gemini-1.5-flash" }, { name: "Gemini 1.5 Flash-8B", code: "gemini-1.5-flash-8b" }, { name: "Gemini 1.5 Pro", code: "gemini-1.5-pro" }, ];

  // Handlers
  const handleTemperatureChange = (value) => { /* ... */ const newTemp = parseFloat(value); if (!isNaN(newTemp) && newTemp >= 0 && newTemp <= 2) setTemperature(newTemp); };
  const handleOutputLengthChange = (value) => { /* ... */ const maxAllowed = getSidebarMaxOutputTokens(selectedModel); let newLength = parseInt(value, 10); if (value === '') return; if (isNaN(newLength) || newLength < 1) newLength = 1; else if (newLength > maxAllowed) newLength = maxAllowed; setOutputLength(newLength); };
  const handleTopPChange = (value) => { /* ... */ const newTopP = parseFloat(value); if (!isNaN(newTopP) && newTopP >= 0 && newTopP <= 1) setTopP(newTopP); };
  const handleSelectedPathsChange = useCallback((path, isChecked) => { setSelectedFilePaths(prevSelected => { const newSelected = { ...prevSelected }; if (isChecked) newSelected[path] = true; else delete newSelected[path]; return newSelected; }); }, [setSelectedFilePaths]);
  const clearFileSelection = useCallback(() => { const clearedCount = Object.keys(selectedFilePaths).length; setSelectedFilePaths({}); clearProcessedFiles(); addDebugLog({ type: 'file-selection-cleared', message: `Cleared ${clearedCount} selected file/folder paths.` }); }, [selectedFilePaths, setSelectedFilePaths, clearProcessedFiles, addDebugLog]);
  const toggleTools = () => setToolsOpen(!toolsOpen); const toggleAdvanced = () => setAdvancedOpen(!advancedOpen); const toggleDebug = () => setDebugOpen(!debugOpen); const toggleFilePool = () => setFilePoolOpen(!filePoolOpen);

  // *** FIX: Remove setToolsOpen(false) ***
  const handleClearHistoryClick = () => {
    setShowClearConfirmation(true);
    // setToolsOpen(false); // REMOVED
  };
  // *** END FIX ***

  const confirmClearHistory = () => { onClearHistory(); setShowClearConfirmation(false); };
  const cancelClearHistory = () => setShowClearConfirmation(false);
  const formatTime = (timestamp) => { /* ... */ try { const date = new Date(timestamp || Date.now()); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { return "Invalid Date"; } };
  const handleCopyDebugLogs = useCallback(() => { /* ... */ const logText = JSON.stringify(debugLogs, null, 2); navigator.clipboard.writeText(logText).then(() => addDebugLog({ type: 'info', message: 'Debug logs copied.'})).catch(err => addDebugLog({ type: 'error', message: 'Failed to copy debug logs.'})); }, [debugLogs, addDebugLog]);

  const selectedItemCount = Object.keys(selectedFilePaths).length;

  return (
    <div className={`right-sidebar ${isExpanded ? 'expanded' : ''}`}>
      <button onClick={toggleExpansion} className="sidebar-toggle-button" title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}> {isExpanded ? '➡️' : '⬅️'} </button>
      {/* Model Selector, Token Count, Temp Control */}
      <div className="model-selector"> {/* label removed */} <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}> {models.map((model) => (<option key={model.code} value={model.code}>{model.name}</option>))} </select> </div>
      <div className="token-count-display"> <p>Tokens: {tokenCount} / {tokenLimit}</p> </div>
      <div className="parameter-control"> <div className="label-input-group"> <label htmlFor="temperature-input">Temperature:</label> <span className="slider-value">{typeof temperature === 'number' ? temperature.toFixed(2) : 'N/A'}</span> <input type="number" id="temperature-input" className="value-input" value={temperature} onChange={(e) => handleTemperatureChange(e.target.value)} step="0.01" min="0" max="2" /> </div> <input type="range" id="temperature-slider" min="0" max="2" step="0.01" value={temperature} onChange={(e) => handleTemperatureChange(e.target.value)} className="slider" /> </div>
      {/* Tools Dropdown */}
      <div className="settings-dropdown"> <button onClick={toggleTools} className="dropdown-toggle-button"><span>Tools</span><span>{toolsOpen ? '▲' : '▼'}</span></button> {toolsOpen && ( <div className="dropdown-menu-content tools-menu"> {/* Copy button removed */} <button className="tool-button" onClick={handleClearHistoryClick}>Clear History</button> </div> )} </div>
      {/* Advanced Settings Dropdown */}
      <div className="settings-dropdown"> <button onClick={toggleAdvanced} className="dropdown-toggle-button"><span>Advanced Settings</span><span>{advancedOpen ? '▲' : '▼'}</span></button> {advancedOpen && ( <div className="dropdown-menu-content settings-menu"> <div className="parameter-control"> <label htmlFor="output-length-input">Output Token Limit:</label> <input type="number" id="output-length-input" className="dark-input" value={outputLength} onChange={(e) => handleOutputLengthChange(e.target.value)} min="1" max={getSidebarMaxOutputTokens(selectedModel)} placeholder={`Max: ${getSidebarMaxOutputTokens(selectedModel)}`} /> </div> <div className="parameter-control"> <div className="label-input-group"> <label htmlFor="topP-input">Top P:</label> <span className="slider-value">{typeof topP === 'number' ? topP.toFixed(2) : 'N/A'}</span> <input type="number" id="topP-input" className="value-input" value={topP} onChange={(e) => handleTopPChange(e.target.value)} step="0.01" min="0" max="1" /> </div> <input type="range" id="topP-slider" min="0" max="1" step="0.01" value={topP} onChange={(e) => handleTopPChange(e.target.value)} className="slider" /> </div> </div> )} </div>
      {/* File Browser Section */}
       <div className="settings-dropdown file-browser-section"> <button onClick={toggleFilePool} className="dropdown-toggle-button"> <span>File Browser {selectedItemCount > 0 ? `(${selectedItemCount} selected)` : ''}</span> <span>{filePoolOpen ? '▲' : '▼'}</span> </button> {filePoolOpen && ( <div className="dropdown-menu-content file-browser-content"> <FileBrowser selectedPaths={selectedFilePaths} ancestorPaths={ancestorPaths} onSelectedPathsChange={handleSelectedPathsChange} /> <div className="file-browser-actions"> <button className="pool-action-button process-button" onClick={triggerFileProcessing} disabled={selectedItemCount === 0 || fileProcessingLoading} title="Load content"> {fileProcessingLoading ? 'Loading...' : `Load Selected (${selectedItemCount})`} </button> <button className="pool-action-button clear-selection-button" onClick={clearFileSelection} disabled={selectedItemCount === 0 || fileProcessingLoading} title="Clear selections"> Clear Selection </button> </div> </div> )} </div>
      {/* Debug Section */}
      <div className="settings-dropdown debug-section"> <button onClick={toggleDebug} className="dropdown-toggle-button"> <span>Debug Information</span> <span>{debugOpen ? '▲' : '▼'}</span> </button> {debugOpen && ( <div className="dropdown-menu-content debug-content"> <div className="debug-logs"> {debugLogs.length === 0 ? (<p className="no-logs">No interactions logged yet.</p>) : ( debugLogs.map((log, index) => ( /* ... log rendering ... */ <div key={`${log.timestamp || Date.now()}-${index}`} className={`debug-log ${log.type || 'info'}`}> <div className="log-header"><span className="log-time">{formatTime(log.timestamp)}</span> <span className="log-type">{log.type === 'api-response' ? '🤖 API Response' : log.type === 'user-message-only' ? '📝 Appended' : log.type === 'user-input' ? '💬 User Input' : log.type === 'clear-history' ? '🧹 History Cleared' : log.type === 'message-edit' ? '✏️ Edited' : log.type === 'rerun-from-user' ? '🔄 Rerun (User)' : log.type === 'regenerate-assistant' ? '🔄 Regenerate (AI)' : log.type === 'files-included' ? '📎 Files Sent' : log.type === 'file-added' ? '📂 File Added' : log.type === 'file-removed' ? '🗑️ File Removed' : log.type === 'file-pool-cleared' ? '🧹 Pool Cleared' : log.type === 'file-selection-cleared' ? '🧹 Selection Cleared': log.type === 'debug-clear' ? '🧹 Logs Cleared' : log.type === 'output-length-auto-adjusted' ? '📐 Output Adjusted' : log.type === 'message-delete' ? '🗑️ Deleted' : log.type === 'error' ? '❌ Error' : log.type === 'warning' ? '⚠️ Warning' : `ℹ️ ${log.type || 'Info'}` }</span> </div> <div className="log-details">{log.model && <div><strong>M:</strong> {log.model.replace('gemini-', '')}</div>} {typeof log.temperature === 'number' && <div><strong>T:</strong> {log.temperature.toFixed(2)}</div>} {typeof log.tokenCount === 'number' && <div><strong>Tok:</strong> {log.tokenCount}</div>} {typeof log.responseTime === 'number' && <div><strong>Ms:</strong> {log.responseTime}</div>} {typeof log.outputLength === 'number' && <div><strong>Out:</strong> {log.outputLength}</div>} {typeof log.topP === 'number' && <div><strong>TopP:</strong> {log.topP.toFixed(2)}</div>} </div> {log.message && ( <div className="log-message"> <strong>Msg:</strong> <div className="message-content-preview">{String(log.message).substring(0, 150)}{String(log.message).length > 150 ? '...' : ''}</div> </div> )} {log.details && ( <div className="log-extra-details"> <pre>{JSON.stringify(log.details, null, 2)}</pre> </div> )} </div> )) )} </div>
            {debugLogs.length > 0 && ( <div className="debug-actions"> <button onClick={handleCopyDebugLogs} className="copy-debug-button">Copy Debug Logs</button> <button onClick={clearDebugLogs} className="clear-debug-button">Clear Debug Logs</button> </div> )}
           </div> )} </div>
      {/* Confirmation Modal */}
      {showClearConfirmation && ( <div className="confirmation-modal-overlay"> <div className="confirmation-modal"> <h3>Clear History</h3> <p>Are you sure?</p> <div className="confirmation-buttons"> <button className="cancel-button" onClick={cancelClearHistory}>Cancel</button> <button className="confirm-button" onClick={confirmClearHistory}>Yes, Clear</button> </div> </div> </div> )}
    </div>
  );
}

export default RightSidebar;