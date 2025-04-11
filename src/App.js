// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MainArea from './components/MainArea';
import { extractTextFromPDF } from './utils/pdfParser';
import { extractTextFromRTF } from './utils/rtfParser';
import { countTokens } from './services/geminiService';

const MODEL_TOKEN_LIMITS = { /* ...limits... */ 'gemini-2.5-pro-exp-03-25': 1048576, 'gemini-1.5-pro': 2097152, 'gemini-1.5-flash-8b': 1048576, 'gemini-1.5-flash': 1048576, 'gemini-2.0-flash': 1048576, 'gemini-2.0-flash-lite': 1048576, 'gemini-1.0-pro': 32768, };
const getAppTokenLimit = (model) => MODEL_TOKEN_LIMITS[model] || 32768;

// Helper moved outside component for reuse
const getParentPath = (filePath) => {
  if (!filePath) return null;
  const separator = filePath.includes('\\') ? '\\' : '/';
  const lastSeparatorIndex = filePath.lastIndexOf(separator);
  if (lastSeparatorIndex <= 0 || filePath.match(/^[A-Za-z]:\\?$/)) return null; // Handle C:\ and /
  return filePath.substring(0, lastSeparatorIndex);
};


function App() {
  // --- Core State ---
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-lite"); const [messages, setMessages] = useState([]); const [temperature, setTemperature] = useState(1); const [outputLength, setOutputLength] = useState(8192); const [topP, setTopP] = useState(0.95); const [conversationTokenCount, setConversationTokenCount] = useState(0); const [tokenLimit, setTokenLimit] = useState(getAppTokenLimit(selectedModel)); const [debugLogs, setDebugLogs] = useState([]);
  // --- File Browser State ---
  const [selectedFilePaths, setSelectedFilePaths] = useState({}); const [processedFilesData, setProcessedFilesData] = useState([]); const [fileProcessingLoading, setFileProcessingLoading] = useState(false); const [fileProcessingError, setFileProcessingError] = useState(null); const [processedFilesTokenCount, setProcessedFilesTokenCount] = useState(0);
  // *** NEW State for ancestor highlighting ***
  const [ancestorPaths, setAncestorPaths] = useState({}); // { [path]: true }

  const mainAreaRef = useRef();

  // --- Logging and History Handlers ---
  const addDebugLog = useCallback((logData) => { /* ... */ const logEntry = { type: logData.type || 'info', message: logData.message || '(No message provided)', timestamp: logData.timestamp || new Date().toISOString(), model: logData.model || selectedModel, temperature: typeof logData.temperature === 'number' ? logData.temperature : temperature, outputLength: typeof logData.outputLength === 'number' ? logData.outputLength : outputLength, topP: typeof logData.topP === 'number' ? logData.topP : topP, tokenCount: typeof logData.tokenCount === 'number' ? logData.tokenCount : undefined, responseTime: typeof logData.responseTime === 'number' ? logData.responseTime : undefined, details: logData.details || undefined, }; Object.keys(logEntry).forEach(key => logEntry[key] === undefined && delete logEntry[key]); setDebugLogs(prevLogs => [logEntry, ...prevLogs].slice(0, 50)); }, [selectedModel, temperature, outputLength, topP]);
  const clearDebugLogs = useCallback(() => { /* ... */ setDebugLogs([]); console.log("Debug logs cleared."); }, []);
  const clearHistory = useCallback(() => { /* ... */ if (mainAreaRef.current?.clearHistory) mainAreaRef.current.clearHistory(); else { console.error("Could not call clearHistory ref."); addDebugLog({ type: 'warning', message: 'MainArea ref not found, clearing history from App.' }); setMessages([]); } }, [addDebugLog]);

  // --- Token Count Handler ---
  const handleTokenCountChange = useCallback((conversationCount, currentLimit) => { setConversationTokenCount(conversationCount); setTokenLimit(currentLimit); }, []);

  // --- File Processing Logic ---
  const triggerFileProcessing = useCallback(async () => { /* ... remains the same ... */ const paths = Object.keys(selectedFilePaths); if (paths.length === 0) { setProcessedFilesData([]); setProcessedFilesTokenCount(0); return; } console.log("App: Triggering file processing for:", paths); setFileProcessingLoading(true); setFileProcessingError(null); addDebugLog({ type: 'info', message: `Requesting recursive content for ${paths.length} selected root path(s)...`}); try { const result = await window.electronAPI.readFilesRecursive(paths); if (result.success) { console.log(`App: Received ${result.files.length} raw file data objects.`); addDebugLog({ type: 'info', message: `Received raw data for ${result.files.length} files from backend.`}); let currentProcessedFiles = []; let totalTokens = 0; let fileErrors = []; for (const rawFileData of result.files) { if (rawFileData.error) { fileErrors.push(`Failed ${rawFileData.name || rawFileData.path}: ${rawFileData.error}`); continue; } try { let content = ''; let tokenCount = 0; if (rawFileData.contentType === 'base64' && rawFileData.type === 'pdf') { const pdfData = Uint8Array.from(atob(rawFileData.rawContent), c => c.charCodeAt(0)); content = await extractTextFromPDF({ arrayBuffer: () => Promise.resolve(pdfData.buffer), name: rawFileData.name }); } else if (rawFileData.type === 'rtf') { content = await extractTextFromRTF({ text: () => Promise.resolve(rawFileData.rawContent), name: rawFileData.name }); } else { content = rawFileData.rawContent || ''; } if (content) { tokenCount = await countTokens(content, selectedModel); } currentProcessedFiles.push({ id: rawFileData.id, name: rawFileData.name, content: content, size: rawFileData.size, tokenCount: tokenCount, type: rawFileData.type, }); totalTokens += tokenCount; } catch (parseError) { console.error(`App: Error parsing/counting ${rawFileData.name}:`, parseError); fileErrors.push(`Parse ${rawFileData.name}: ${parseError.message}`); } } setProcessedFilesData(currentProcessedFiles); setProcessedFilesTokenCount(totalTokens); if (fileErrors.length > 0) { setFileProcessingError(fileErrors.join('; ')); addDebugLog({ type: 'error', message: `Processing errors: ${fileErrors.length} files failed.` }); } else { addDebugLog({ type: 'info', message: `Successfully processed ${currentProcessedFiles.length} files, ${totalTokens} tokens loaded.` }); } } else { console.error("App: Error from readFilesRecursive:", result.error); setFileProcessingError(result.error || "Failed to read files."); addDebugLog({ type: 'error', message: `Failed to read files: ${result.error}` }); setProcessedFilesData([]); setProcessedFilesTokenCount(0); } } catch (ipcError) { console.error("App: Error calling electronAPI:", ipcError); setFileProcessingError(ipcError.message || "IPC Error."); addDebugLog({ type: 'error', message: `IPC Error reading files: ${ipcError.message}` }); setProcessedFilesData([]); setProcessedFilesTokenCount(0); } finally { setFileProcessingLoading(false); } }, [selectedFilePaths, selectedModel, addDebugLog]);
  const clearProcessedFiles = useCallback(() => { /* ... */ if (processedFilesData.length > 0) addDebugLog({ type: 'info', message: `Clearing ${processedFilesData.length} processed files & ${processedFilesTokenCount} tokens.` }); setProcessedFilesData([]); setProcessedFilesTokenCount(0); }, [processedFilesData.length, processedFilesTokenCount, addDebugLog]);

  // --- Effects ---
  useEffect(() => { setTokenLimit(getAppTokenLimit(selectedModel)); }, [selectedModel]);

  // *** NEW Effect to calculate ancestor paths when selection changes ***
  useEffect(() => {
    const newAncestorPaths = {};
    for (const path in selectedFilePaths) {
      let current = getParentPath(path);
      while (current !== null) {
        newAncestorPaths[current] = true;
        current = getParentPath(current);
      }
    }
    setAncestorPaths(newAncestorPaths);
    console.log("Updated ancestor paths:", newAncestorPaths); // For debugging
  }, [selectedFilePaths]); // Recalculate whenever selection changes


  const combinedTokenCount = conversationTokenCount + processedFilesTokenCount;

  return ( // --- Render ---
    <div className="App">
      <LeftSidebar />
      <MainArea ref={mainAreaRef} selectedModel={selectedModel} temperature={temperature} outputLength={outputLength} topP={topP} messages={messages} setMessages={setMessages} onTokenCountChange={handleTokenCountChange} addDebugLog={addDebugLog} filePool={processedFilesData} />
      <RightSidebar
         selectedModel={selectedModel} setSelectedModel={setSelectedModel} temperature={temperature} setTemperature={setTemperature} outputLength={outputLength} setOutputLength={setOutputLength} topP={topP} setTopP={setTopP} tokenCount={combinedTokenCount} tokenLimit={tokenLimit} debugLogs={debugLogs} clearDebugLogs={clearDebugLogs} onClearHistory={clearHistory}
         selectedFilePaths={selectedFilePaths} setSelectedFilePaths={setSelectedFilePaths}
         ancestorPaths={ancestorPaths} // *** Pass ancestor paths down ***
         triggerFileProcessing={triggerFileProcessing} clearProcessedFiles={clearProcessedFiles} addDebugLog={addDebugLog}
       />
    </div>
  );
}
export default App;