// src/components/RightSidebar.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './RightSidebar.css';
// Import file utilities
import { extractTextFromPDF, isPDF } from '../utils/pdfParser';
import { extractTextFromRTF, isRTF } from '../utils/rtfParser';
// Import token counter
import { countTokens } from '../services/geminiService';

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
  // File Pool props
  filePool = [],
  setFilePool = () => {},
  filePoolTokenCount = 0,
  setFilePoolTokenCount = () => {},
  addDebugLog = () => {},
}) {
  // Dropdown expansion states (local UI state)
  const [toolsOpen, setToolsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [filePoolOpen, setFilePoolOpen] = useState(true);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  // File Pool UI State
  const [dragActive, setDragActive] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const fileInputRef = useRef(null);

  const models = [
    { name: "Gemini 2.5 Pro Experimental", code: "gemini-2.5-pro-exp-03-25" },
    { name: "Gemini 2.0 Flash", code: "gemini-2.0-flash" },
    { name: "Gemini 2.0 Flash-Lite", code: "gemini-2.0-flash-lite" },
    { name: "Gemini 1.5 Flash", code: "gemini-1.5-flash" },
    { name: "Gemini 1.5 Flash-8B", code: "gemini-1.5-flash-8b" },
    { name: "Gemini 1.5 Pro", code: "gemini-1.5-pro" },
  ];

  // --- Handlers for Controls (Update App.js state via props) ---
  const handleTemperatureChange = (value) => {
    const newTemp = parseFloat(value);
    if (!isNaN(newTemp) && newTemp >= 0 && newTemp <= 2) {
      setTemperature(newTemp);
    }
  };
  const handleOutputLengthChange = (value) => {
     const maxAllowed = getSidebarMaxOutputTokens(selectedModel);
     let newLength = parseInt(value, 10);
     if (value === '') { return; }
     if (isNaN(newLength) || newLength < 1) { newLength = 1; }
     else if (newLength > maxAllowed) { newLength = maxAllowed; }
     setOutputLength(newLength);
  };
   const handleTopPChange = (value) => {
       const newTopP = parseFloat(value);
       if (!isNaN(newTopP) && newTopP >= 0 && newTopP <= 1) {
         setTopP(newTopP);
       }
   };

  // --- File Pool Handlers ---
  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const processFiles = useCallback(async (files) => {
      const newFilesData = [];
      let addedTokens = 0;
      setProcessingFiles(true);
      setProcessingError(null);
      for (let i = 0; i < files.length; i++) {
          const file = files[i]; let textContent = null; let fileType = 'text';
          try {
              if (isPDF(file)) { fileType = 'pdf'; textContent = await extractTextFromPDF(file); }
              else if (isRTF(file)) { fileType = 'rtf'; textContent = await extractTextFromRTF(file); }
              else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) { fileType = 'text'; textContent = await readFileAsText(file); }
              else { setProcessingError(`Skipped unsupported file: ${file.name}`); continue; }

              if (textContent !== null) {
                  const tokenCountForFile = await countTokens(textContent, selectedModel);
                  const fileData = { id: Date.now() + i + Math.random(), name: file.name, content: textContent, size: file.size, tokenCount: tokenCountForFile, type: fileType };
                  newFilesData.push(fileData); addedTokens += tokenCountForFile;
                  addDebugLog({ type: 'file-added', message: `File added: ${file.name} (${tokenCountForFile} tokens)`, details: { name: file.name, size: file.size, type: fileType, tokens: tokenCountForFile } });
              }
          } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              setProcessingError(`Error processing ${file.name}: ${error.message}`);
              addDebugLog({ type: 'error', message: `Error processing file: ${file.name} - ${error.message}` });
          }
      }
      if (newFilesData.length > 0) { setFilePool(prevPool => [...prevPool, ...newFilesData]); setFilePoolTokenCount(prevTotal => prevTotal + addedTokens); }
      setProcessingFiles(false);
  }, [selectedModel, addDebugLog, setFilePool, setFilePoolTokenCount]);

   const handleDrop = useCallback(async (e) => {
       e.preventDefault(); e.stopPropagation(); setDragActive(false);
       if (e.dataTransfer.files?.length > 0) await processFiles(e.dataTransfer.files);
   }, [processFiles]);

   const handleFileInputChange = useCallback(async (e) => {
       if (e.target.files?.length > 0) { await processFiles(e.target.files); e.target.value = null; }
   }, [processFiles]);

   const triggerFileInput = useCallback(() => fileInputRef.current?.click(), []);

   const readFileAsText = (file) => new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => resolve(e.target.result);
       reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
       reader.readAsText(file);
   });

   const removeFile = useCallback((fileId) => {
       let removedTokenCount = 0; let removedFileName = "";
       setFilePool(prevPool => prevPool.filter(file => { if (file.id === fileId) { removedTokenCount = file.tokenCount; removedFileName = file.name; return false; } return true; }));
       setFilePoolTokenCount(prevTotal => Math.max(0, prevTotal - removedTokenCount));
       addDebugLog({ type: 'file-removed', message: `File removed: ${removedFileName} (${removedTokenCount} tokens)`, details: { name: removedFileName, tokens: removedTokenCount } });
   }, [setFilePool, setFilePoolTokenCount, addDebugLog]);

   const clearFilePool = useCallback(() => {
       const clearedCount = filePool.length; const clearedTokens = filePoolTokenCount;
       setFilePool([]); setFilePoolTokenCount(0);
       addDebugLog({ type: 'file-pool-cleared', message: `File Pool cleared (${clearedCount} files, ${clearedTokens} tokens)`, details: { count: clearedCount, tokens: clearedTokens } });
   }, [filePool.length, filePoolTokenCount, setFilePool, setFilePoolTokenCount, addDebugLog]);

  // --- Other UI Interaction Handlers ---
  const toggleTools = () => setToolsOpen(!toolsOpen);
  const toggleAdvanced = () => setAdvancedOpen(!advancedOpen);
  const toggleDebug = () => setDebugOpen(!debugOpen);
  const toggleFilePool = () => setFilePoolOpen(!filePoolOpen);

  const handleClearHistoryClick = () => { setShowClearConfirmation(true); setToolsOpen(false); };
  const confirmClearHistory = () => { onClearHistory(); setShowClearConfirmation(false); };
  const cancelClearHistory = () => setShowClearConfirmation(false);

  // Format timestamp for debug logs
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp || Date.now()); // Fallback to now if timestamp is missing
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { return "Invalid Date"; }
  };

   // Format file size helper
   const formatFileSize = (bytes) => {
       if (bytes < 1024) return bytes + ' B';
       if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
       return (bytes / 1048576).toFixed(1) + ' MB';
   };

  // --- Render ---
  return (
    <div className="right-sidebar">
      {/* Model Selector */}
      <div className="model-selector">
        <label htmlFor="model-select">Model:</label>
        <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {models.map((model) => (<option key={model.code} value={model.code}>{model.name}</option>))}
        </select>
      </div>

      {/* Token Count Display */}
      <div className="token-count-display">
        <p>Tokens: {tokenCount} / {tokenLimit}</p>
      </div>

      {/* Temperature Control */}
      <div className="parameter-control">
        <div className="label-input-group">
          <label htmlFor="temperature-input">Temperature:</label>
          <span className="slider-value">{typeof temperature === 'number' ? temperature.toFixed(2) : 'N/A'}</span>
          <input type="number" id="temperature-input" className="value-input" value={temperature} onChange={(e) => handleTemperatureChange(e.target.value)} step="0.01" min="0" max="2" />
        </div>
        <input type="range" id="temperature-slider" min="0" max="2" step="0.01" value={temperature} onChange={(e) => handleTemperatureChange(e.target.value)} className="slider" />
      </div>

      {/* Tools Dropdown */}
      <div className="settings-dropdown">
        <button onClick={toggleTools} className="dropdown-toggle-button"><span>Tools</span><span>{toolsOpen ? '▲' : '▼'}</span></button>
        {toolsOpen && (
          <div className="dropdown-menu-content tools-menu">
             <button className="tool-button" onClick={() => navigator.clipboard.writeText(JSON.stringify(debugLogs, null, 2))}>Copy Debug Logs</button>
             <button className="tool-button" onClick={handleClearHistoryClick}>Clear Conversation History</button>
          </div>
        )}
      </div>

      {/* Advanced Settings Dropdown */}
      <div className="settings-dropdown">
        <button onClick={toggleAdvanced} className="dropdown-toggle-button"><span>Advanced Settings</span><span>{advancedOpen ? '▲' : '▼'}</span></button>
        {advancedOpen && (
          <div className="dropdown-menu-content settings-menu">
            <div className="parameter-control">
               <label htmlFor="output-length-input">Output Token Limit:</label>
               <input type="number" id="output-length-input" className="dark-input" value={outputLength} onChange={(e) => handleOutputLengthChange(e.target.value)} min="1" max={getSidebarMaxOutputTokens(selectedModel)} placeholder={`Max: ${getSidebarMaxOutputTokens(selectedModel)}`} />
            </div>
             <div className="parameter-control">
               <div className="label-input-group">
                   <label htmlFor="topP-input">Top P:</label>
                   <span className="slider-value">{typeof topP === 'number' ? topP.toFixed(2) : 'N/A'}</span>
                   <input type="number" id="topP-input" className="value-input" value={topP} onChange={(e) => handleTopPChange(e.target.value)} step="0.01" min="0" max="1" />
               </div>
               <input type="range" id="topP-slider" min="0" max="1" step="0.01" value={topP} onChange={(e) => handleTopPChange(e.target.value)} className="slider" />
             </div>
          </div>
        )}
      </div>

      {/* File Pool Section */}
       <div className="settings-dropdown">
           <button onClick={toggleFilePool} className="dropdown-toggle-button">
               <span>File Pool {filePool.length > 0 ? `(${filePool.length})` : ''}</span>
               <span>{filePoolOpen ? '▲' : '▼'}</span>
           </button>
           {filePoolOpen && (
              <div className={`file-pool-container ${dragActive ? 'drag-active' : ''}`} onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
                 <div className="dropdown-menu-content file-pool-content">
                     <div className="file-pool-header">
                        <div className="file-pool-stats">
                           <span>{filePool.length} file{filePool.length !== 1 ? 's' : ''}</span>
                           <span>{filePoolTokenCount} tokens</span>
                        </div>
                        <div className="file-pool-actions">
                           <input ref={fileInputRef} type="file" accept=".txt,text/*,.pdf,application/pdf,.rtf,application/rtf,text/rtf" style={{ display: 'none' }} onChange={handleFileInputChange} multiple />
                           <button className="pool-action-button add-button" onClick={triggerFileInput} disabled={processingFiles} title="Add text, PDF, or RTF files">
                               {processingFiles ? 'Processing...' : 'Add Files'}
                           </button>
                           {filePool.length > 0 && (<button className="pool-action-button clear-button" onClick={clearFilePool} disabled={processingFiles} title="Remove all files">Clear All</button>)}
                        </div>
                     </div>
                     {processingError && (<div className="file-processing-error">{processingError}</div>)}
                     {filePool.length === 0 && !processingFiles ? (
                         <div className="file-pool-empty"><p>Drag & drop TXT, PDF, RTF files here</p><p>or click "Add Files"</p></div>
                     ) : processingFiles && filePool.length === 0 ? (
                         <div className="file-processing"><p>Processing files...</p></div>
                     ) : (
                        <div className="file-pool-files">
                           {filePool.map(file => (
                               <div key={file.id} className={`file-item ${file.type}`}>
                                   <div className="file-info">
                                      <span className="file-name" title={file.name}>{file.type === 'pdf' ? '📕' : file.type === 'rtf' ? '📝' : '📄'} {file.name}</span>
                                       <div className="file-meta">
                                           <span>{formatFileSize(file.size)}</span>
                                           <span className="file-token-count">{file.tokenCount} tokens</span>
                                       </div>
                                   </div>
                                   <button className="remove-file-button" onClick={() => removeFile(file.id)} title="Remove this file">✕</button>
                               </div>
                           ))}
                           {processingFiles && filePool.length > 0 && <div className="file-processing"><p>Processing more files...</p></div>}
                        </div>
                     )}
                     {dragActive && (<div className="drop-instructions"><p>Drop files here</p></div>)}
                 </div>
              </div>
           )}
       </div>

      {/* Debug Section */}
      <div className="settings-dropdown debug-section">
        <button onClick={toggleDebug} className="dropdown-toggle-button">
           <span>Debug Information</span>
           <span>{debugOpen ? '▲' : '▼'}</span>
        </button>
        {debugOpen && (
          <div className="dropdown-menu-content debug-content">
            <div className="debug-logs">
              {debugLogs.length === 0 ? (
                <p className="no-logs">No interactions logged yet.</p>
              ) : (
                // *** MORE RESILIENT DEBUG RENDERING ***
                debugLogs.map((log, index) => (
                  <div key={`${log.timestamp || Date.now()}-${index}`} className={`debug-log ${log.type || 'info'}`}>
                    <div className="log-header">
                      <span className="log-time">{formatTime(log.timestamp)}</span>
                      <span className="log-type">
                         {log.type === 'api-response' ? '🤖 API Response' :
                          log.type === 'user-message-only' ? '📝 Appended' :
                          log.type === 'user-input' ? '💬 User Input' :
                          log.type === 'clear-history' ? '🧹 History Cleared' :
                          log.type === 'message-edit' ? '✏️ Edited' :
                          log.type === 'rerun-from-user' ? '🔄 Rerun (User)' :
                          log.type === 'regenerate-assistant' ? '🔄 Regenerate (AI)' :
                          log.type === 'files-included' ? '📎 Files Sent' :
                          log.type === 'file-added' ? '📂 File Added' :
                          log.type === 'file-removed' ? '🗑️ File Removed' :
                          log.type === 'file-pool-cleared' ? '🧹 Pool Cleared' :
                          log.type === 'debug-clear' ? '🧹 Logs Cleared' :
                          log.type === 'output-length-auto-adjusted' ? '📐 Output Adjusted' :
                          log.type === 'message-delete' ? '🗑️ Deleted' :
                          log.type === 'error' ? '❌ Error' :
                          log.type === 'warning' ? '⚠️ Warning' : // Added warning type
                          `ℹ️ ${log.type || 'Info'}`
                         }
                      </span>
                    </div>
                    <div className="log-details">
                       {log.model && <div><strong>M:</strong> {log.model.replace('gemini-', '')}</div>}
                       {typeof log.temperature === 'number' && <div><strong>T:</strong> {log.temperature.toFixed(2)}</div>}
                       {typeof log.tokenCount === 'number' && <div><strong>Tok:</strong> {log.tokenCount}</div>}
                       {typeof log.responseTime === 'number' && <div><strong>Ms:</strong> {log.responseTime}</div>}
                       {typeof log.outputLength === 'number' && <div><strong>Out:</strong> {log.outputLength}</div>}
                       {typeof log.topP === 'number' && <div><strong>TopP:</strong> {log.topP.toFixed(2)}</div>}
                    </div>
                    {log.message && (
                        <div className="log-message">
                            <strong>Msg:</strong>
                            <div className="message-content-preview">
                                {String(log.message).substring(0, 150)}{String(log.message).length > 150 ? '...' : ''}
                            </div>
                        </div>
                    )}
                    {log.details && (
                       <div className="log-extra-details">
                           <pre>{JSON.stringify(log.details, null, 2)}</pre>
                       </div>
                    )}
                  </div>
                ))
                // *** END RESILIENT DEBUG RENDERING ***
              )}
            </div>
            {debugLogs.length > 0 && (
                <button onClick={clearDebugLogs} className="clear-debug-button">
                    Clear Debug Logs
                </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showClearConfirmation && (
        <div className="confirmation-modal-overlay">
          <div className="confirmation-modal">
            <h3>Clear Conversation History</h3>
            <p>Are you sure you want to clear all messages? This cannot be undone.</p>
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