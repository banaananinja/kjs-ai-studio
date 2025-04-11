// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MainArea from './components/MainArea';
import SettingsView from './components/SettingsView';
import { extractTextFromPDF } from './utils/pdfParser'; // Needed here for processing
import { extractTextFromRTF } from './utils/rtfParser'; // Needed here for processing
import { countTokens } from './services/geminiService'; // Needed here for processing

const MODEL_TOKEN_LIMITS = { 'gemini-2.5-pro-exp-03-25': 1048576, 'gemini-1.5-pro': 2097152, 'gemini-1.5-flash-8b': 1048576, 'gemini-1.5-flash': 1048576, 'gemini-2.0-flash': 1048576, 'gemini-2.0-flash-lite': 1048576, 'gemini-1.0-pro': 32768, };
const getAppTokenLimit = (model) => MODEL_TOKEN_LIMITS[model] || 32768;
const getParentPath = (filePath) => { if (!filePath) return null; const separator = filePath.includes('\\') ? '\\' : '/'; const lastSeparatorIndex = filePath.lastIndexOf(separator); if (lastSeparatorIndex <= 0 || filePath.match(/^[A-Za-z]:\\?$/)) return null; return filePath.substring(0, lastSeparatorIndex); };

function App() {
  // Core State
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-lite"); const [messages, setMessages] = useState([]); const [temperature, setTemperature] = useState(1); const [outputLength, setOutputLength] = useState(8192); const [topP, setTopP] = useState(0.95); const [conversationTokenCount, setConversationTokenCount] = useState(0); const [tokenLimit, setTokenLimit] = useState(getAppTokenLimit(selectedModel)); const [debugLogs, setDebugLogs] = useState([]);
  // File Browser State
  const [selectedFilePaths, setSelectedFilePaths] = useState({}); const [processedFilesData, setProcessedFilesData] = useState([]); const [fileProcessingLoading, setFileProcessingLoading] = useState(false); const [fileProcessingError, setFileProcessingError] = useState(null); const [processedFilesTokenCount, setProcessedFilesTokenCount] = useState(0); const [ancestorPaths, setAncestorPaths] = useState({});
  // UI State
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false); const [activeView, setActiveView] = useState('prompt');
  // API Key State
  const [loadedApiKey, setLoadedApiKey] = useState(''); const [apiKeyLoading, setApiKeyLoading] = useState(true);

  const mainAreaRef = useRef();

  // Load API Key on Mount
  useEffect(() => {
      const loadKey = async () => { /* ... same loading logic ... */
        setApiKeyLoading(true); console.log("App: Attempting to load API key..."); try { if (window.electronAPI?.loadApiKey) { const result = await window.electronAPI.loadApiKey(); if (result.success) { setLoadedApiKey(result.apiKey || ''); console.log("App: API Key loaded (length:", result.apiKey?.length || 0, ")"); if (!result.apiKey) { addDebugLog({ type: 'warning', message: 'API Key is not set. Please configure it in Settings.' }); } } else { console.error("App: Failed to load API key:", result.error); addDebugLog({ type: 'error', message: `Failed to load API key: ${result.error}` }); } } else { console.warn("App: electronAPI not ready for loading key."); addDebugLog({ type: 'warning', message: 'Cannot load API key: Not in Electron environment.' }); } } catch (error) { console.error("App: IPC Error loading API Key:", error); addDebugLog({ type: 'error', message: `IPC Error loading API key: ${error.message}` }); } finally { setApiKeyLoading(false); } };
        loadKey();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Add addDebugLog? No, causes loop on warning.

  // --- Handlers and Callbacks ---
  // Add console logs inside callbacks to verify they are called
  const addDebugLog = useCallback((logData) => {
      console.log("App: addDebugLog called with type:", logData?.type); // Verify call
      const logEntry = { type: logData.type || 'info', message: logData.message || '(No message provided)', timestamp: logData.timestamp || new Date().toISOString(), model: logData.model || selectedModel, temperature: typeof logData.temperature === 'number' ? logData.temperature : temperature, outputLength: typeof logData.outputLength === 'number' ? logData.outputLength : outputLength, topP: typeof logData.topP === 'number' ? logData.topP : topP, tokenCount: typeof logData.tokenCount === 'number' ? logData.tokenCount : undefined, responseTime: typeof logData.responseTime === 'number' ? logData.responseTime : undefined, details: logData.details || undefined, }; Object.keys(logEntry).forEach(key => logEntry[key] === undefined && delete logEntry[key]);
      setDebugLogs(prevLogs => [logEntry, ...prevLogs].slice(0, 50));
  }, [selectedModel, temperature, outputLength, topP]); // Keep dependencies for context

  const clearDebugLogs = useCallback(() => {
      console.log("App: clearDebugLogs called"); // Verify call
      setDebugLogs([]);
   }, []);

  const clearHistory = useCallback(() => {
      console.log("App: clearHistory called"); // Verify call
      if (mainAreaRef.current?.clearHistory) { mainAreaRef.current.clearHistory(); }
      else { console.error("Could not call clearHistory ref."); addDebugLog({ type: 'warning', message: 'MainArea ref not found, clearing history from App.' }); setMessages([]); }
  }, [addDebugLog]); // Keep addDebugLog dep

  const handleTokenCountChange = useCallback((conversationCount, currentLimit) => {
      console.log(`App: handleTokenCountChange called - Count: ${conversationCount}, Limit: ${currentLimit}`); // Verify call
      setConversationTokenCount(conversationCount);
      setTokenLimit(currentLimit);
  }, []);

  // File Processing Logic
  const triggerFileProcessing = useCallback(async () => {
      const paths = Object.keys(selectedFilePaths);
      if (paths.length === 0) { setProcessedFilesData([]); setProcessedFilesTokenCount(0); return; }
      console.log("App: Triggering file processing for:", paths); // Keep log
      setFileProcessingLoading(true); setFileProcessingError(null);
      addDebugLog({ type: 'info', message: `Requesting recursive content for ${paths.length} selected root path(s)...`});
      try {
          const result = await window.electronAPI.readFilesRecursive(paths);
          if (result.success) {
              console.log(`App: Received ${result.files.length} raw file data objects.`); // Keep log
              addDebugLog({ type: 'info', message: `Received raw data for ${result.files.length} files from backend.`});
              let currentProcessedFiles = []; let totalTokens = 0; let fileErrors = [];
              for (const rawFileData of result.files) {
                   if (rawFileData.error) { fileErrors.push(`Failed ${rawFileData.name || rawFileData.path}: ${rawFileData.error}`); continue; }
                  try {
                      let content = ''; let tokenCount = 0;
                      if (rawFileData.contentType === 'base64' && rawFileData.type === 'pdf') { const pdfData = Uint8Array.from(atob(rawFileData.rawContent), c => c.charCodeAt(0)); content = await extractTextFromPDF({ arrayBuffer: () => Promise.resolve(pdfData.buffer), name: rawFileData.name }); }
                      else if (rawFileData.type === 'rtf') { content = await extractTextFromRTF({ text: () => Promise.resolve(rawFileData.rawContent), name: rawFileData.name }); }
                      else { content = rawFileData.rawContent || ''; }
                      if (content && loadedApiKey) { // Need API key to count tokens
                          tokenCount = await countTokens(content, selectedModel, loadedApiKey);
                      } else if (content && !loadedApiKey) {
                         console.warn("Cannot count file tokens: API Key missing.");
                         addDebugLog({type: 'warning', message: `Token count skipped for ${rawFileData.name}: API Key missing.`})
                      }
                      currentProcessedFiles.push({ id: rawFileData.id, name: rawFileData.name, content: content, size: rawFileData.size, tokenCount: tokenCount, type: rawFileData.type, });
                      totalTokens += tokenCount;
                  } catch (parseError) { console.error(`App: Error parsing/counting ${rawFileData.name}:`, parseError); fileErrors.push(`Parse ${rawFileData.name}: ${parseError.message}`); }
              } // End for loop

              console.log("App: Setting processed files data:", currentProcessedFiles); // Log before setting
              console.log("App: Setting processed files token count:", totalTokens); // Log before setting
              setProcessedFilesData(currentProcessedFiles);
              setProcessedFilesTokenCount(totalTokens);

              if (fileErrors.length > 0) { setFileProcessingError(fileErrors.join('; ')); addDebugLog({ type: 'error', message: `Processing errors: ${fileErrors.length} files failed.` }); }
              else { addDebugLog({ type: 'info', message: `Successfully processed ${currentProcessedFiles.length} files, ${totalTokens} tokens loaded.` }); }
          } else { console.error("App: Error from readFilesRecursive:", result.error); setFileProcessingError(result.error || "Failed."); addDebugLog({ type: 'error', message: `Failed to read files: ${result.error}` }); setProcessedFilesData([]); setProcessedFilesTokenCount(0); }
      } catch (ipcError) { console.error("App: Error calling electronAPI:", ipcError); setFileProcessingError(ipcError.message || "IPC Error."); addDebugLog({ type: 'error', message: `IPC Error reading files: ${ipcError.message}` }); setProcessedFilesData([]); setProcessedFilesTokenCount(0); }
      finally { setFileProcessingLoading(false); }
  }, [selectedFilePaths, selectedModel, addDebugLog, loadedApiKey]); // Added loadedApiKey dep

  const clearProcessedFiles = useCallback(() => {
      console.log("App: clearProcessedFiles called"); // Verify call
      if (processedFilesData.length > 0) addDebugLog({ type: 'info', message: `Clearing ${processedFilesData.length} processed files & ${processedFilesTokenCount} tokens.` });
      setProcessedFilesData([]);
      setProcessedFilesTokenCount(0);
  }, [processedFilesData.length, processedFilesTokenCount, addDebugLog]);

  const toggleRightSidebar = useCallback(() => { setIsRightSidebarExpanded(prev => !prev); }, []);

  // --- Effects ---
  useEffect(() => { setTokenLimit(getAppTokenLimit(selectedModel)); }, [selectedModel]);
  useEffect(() => { const newAncestorPaths = {}; for (const path in selectedFilePaths) { let current = getParentPath(path); while (current !== null) { newAncestorPaths[current] = true; current = getParentPath(current); } } setAncestorPaths(newAncestorPaths); /* console.log("Updated ancestor paths:", newAncestorPaths); */ }, [selectedFilePaths]); // Keep console log commented unless debugging ancestors

  // *** Recalculate combinedTokenCount here ***
  const combinedTokenCount = conversationTokenCount + processedFilesTokenCount;

  // --- Render ---
  if (apiKeyLoading) { return <div>Loading Settings...</div>; }

  return (
    <div className={`App ${isRightSidebarExpanded ? 'right-sidebar-expanded' : ''}`}>
      <LeftSidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="main-content-area">
         {activeView === 'prompt' && (
            <MainArea
                ref={mainAreaRef} selectedModel={selectedModel} temperature={temperature} outputLength={outputLength} topP={topP}
                messages={messages} setMessages={setMessages} onTokenCountChange={handleTokenCountChange}
                addDebugLog={addDebugLog} filePool={processedFilesData} // Pass processed data
                apiKey={loadedApiKey}
            />
         )}
         {activeView === 'settings' && <SettingsView />}
         {activeView === 'library' && <div style={{padding: '20px'}}>Library View Coming Soon!</div>}
      </div>
      <RightSidebar
         selectedModel={selectedModel} setSelectedModel={setSelectedModel} temperature={temperature} setTemperature={setTemperature} outputLength={outputLength} setOutputLength={setOutputLength} topP={topP} setTopP={setTopP}
         tokenCount={combinedTokenCount} // Pass combined count
         tokenLimit={tokenLimit}
         debugLogs={debugLogs} // Pass debug logs state
         clearDebugLogs={clearDebugLogs} // Pass handler
         onClearHistory={clearHistory} // Pass handler
         selectedFilePaths={selectedFilePaths} setSelectedFilePaths={setSelectedFilePaths} // Pass state & setter
         ancestorPaths={ancestorPaths} // Pass ancestor state
         triggerFileProcessing={triggerFileProcessing} // Pass handler
         clearProcessedFiles={clearProcessedFiles} // Pass handler
         fileProcessingLoading={fileProcessingLoading} // Pass loading state
         addDebugLog={addDebugLog} // Pass handler
         isExpanded={isRightSidebarExpanded} toggleExpansion={toggleRightSidebar} // Pass expansion state & handler
       />
    </div>
  );
}
export default App;