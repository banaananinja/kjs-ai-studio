// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
// --- Make sure ALL imports are present ---
import './App.css';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MainArea from './components/MainArea';
import SettingsView from './components/SettingsView';
import { extractTextFromPDF } from './utils/pdfParser';
import { extractTextFromRTF } from './utils/rtfParser';
import { countTokens } from './services/geminiService';
// --- End Imports ---

const MODEL_TOKEN_LIMITS = { 'gemini-2.5-pro-exp-03-25': 1048576, 'gemini-1.5-pro': 2097152, 'gemini-1.5-flash-8b': 1048576, 'gemini-1.5-flash': 1048576, 'gemini-2.0-flash': 1048576, 'gemini-2.0-flash-lite': 1048576, 'gemini-1.0-pro': 32768, };
const getAppTokenLimit = (model) => MODEL_TOKEN_LIMITS[model] || 32768;
const getParentPath = (filePath) => { if (!filePath) return null; const separator = filePath.includes('\\') ? '\\' : '/'; const lastSeparatorIndex = filePath.lastIndexOf(separator); if (lastSeparatorIndex <= 0 || filePath.match(/^[A-Za-z]:\\?$/)) return null; return filePath.substring(0, lastSeparatorIndex); };

function App() {
  // --- State declarations ---
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-lite"); const [messages, setMessages] = useState([]); const [temperature, setTemperature] = useState(1); const [outputLength, setOutputLength] = useState(8192); const [topP, setTopP] = useState(0.95); const [conversationTokenCount, setConversationTokenCount] = useState(0); const [tokenLimit, setTokenLimit] = useState(getAppTokenLimit(selectedModel)); const [debugLogs, setDebugLogs] = useState([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState({}); const [processedFilesData, setProcessedFilesData] = useState([]); const [fileProcessingLoading, setFileProcessingLoading] = useState(false); const [fileProcessingError, setFileProcessingError] = useState(null); const [processedFilesTokenCount, setProcessedFilesTokenCount] = useState(0); const [ancestorPaths, setAncestorPaths] = useState({});
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false); const [activeView, setActiveView] = useState('prompt');
  const [loadedApiKey, setLoadedApiKey] = useState(''); const [apiKeyLoading, setApiKeyLoading] = useState(true);
  const mainAreaRef = useRef();


  // Load API Key on Mount with extra logging
  useEffect(() => {
      const loadKey = async () => {
          setApiKeyLoading(true);
          console.log("App: Attempting to load API key..."); // Log 1
          try {
              if (window.electronAPI?.loadApiKey) {
                  console.log("App: Calling window.electronAPI.loadApiKey()..."); // Log 2
                  const result = await window.electronAPI.loadApiKey();
                  console.log("App: Received result from electronAPI.loadApiKey():", result); // Log 3 - CRITICAL

                  if (result === undefined) { // Explicit check for undefined
                     console.error("App: ERROR - Result from loadApiKey was undefined!");
                     throw new Error("IPC communication failed (received undefined).");
                  }

                  if (result.success) {
                      setLoadedApiKey(result.apiKey || '');
                      console.log("App: API Key loaded (length:", result.apiKey?.length || 0, ")");
                      if (!result.apiKey) { addDebugLog({ type: 'warning', message: 'API Key is not set. Please configure it in Settings.' }); }
                  } else {
                      console.error("App: Failed to load API key from store:", result.error);
                      addDebugLog({ type: 'error', message: `Failed to load API key: ${result.error}` });
                  }
              } else {
                 console.warn("App: electronAPI.loadApiKey not available.");
                 addDebugLog({ type: 'warning', message: 'Cannot load API key: Not in Electron env?' });
              }
          } catch (error) {
              console.error("App: Catch block: IPC Error loading API Key:", error); // Log 4
              addDebugLog({ type: 'error', message: `IPC Error loading API key: ${error.message}` });
          } finally {
              setApiKeyLoading(false);
          }
      };
      loadKey();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep dependencies minimal for initial load

  // --- Other Callbacks and Effects ---
  const addDebugLog = useCallback((logData) => { console.log("App: addDebugLog called with type:", logData?.type); const logEntry = { type: logData.type || 'info', message: logData.message || '(No message provided)', timestamp: logData.timestamp || new Date().toISOString(), model: logData.model || selectedModel, temperature: typeof logData.temperature === 'number' ? logData.temperature : temperature, outputLength: typeof logData.outputLength === 'number' ? logData.outputLength : outputLength, topP: typeof logData.topP === 'number' ? logData.topP : topP, tokenCount: typeof logData.tokenCount === 'number' ? logData.tokenCount : undefined, responseTime: typeof logData.responseTime === 'number' ? logData.responseTime : undefined, details: logData.details || undefined, }; Object.keys(logEntry).forEach(key => logEntry[key] === undefined && delete logEntry[key]); setDebugLogs(prevLogs => [logEntry, ...prevLogs].slice(0, 50)); }, [selectedModel, temperature, outputLength, topP]);
  const clearDebugLogs = useCallback(() => { console.log("App: clearDebugLogs called"); setDebugLogs([]); }, []);
  const clearHistory = useCallback(() => { console.log("App: clearHistory called"); if (mainAreaRef.current?.clearHistory) { mainAreaRef.current.clearHistory(); } else { console.error("Could not call clearHistory ref."); addDebugLog({ type: 'warning', message: 'MainArea ref not found, clearing history from App.' }); setMessages([]); } }, [addDebugLog]);
  const handleTokenCountChange = useCallback((conversationCount, currentLimit) => { console.log(`App: handleTokenCountChange called - Count: ${conversationCount}, Limit: ${currentLimit}`); setConversationTokenCount(conversationCount); setTokenLimit(currentLimit); }, []);
  const triggerFileProcessing = useCallback(async () => { const paths = Object.keys(selectedFilePaths); if (paths.length === 0) { setProcessedFilesData([]); setProcessedFilesTokenCount(0); return; } console.log("App: Triggering file processing for:", paths); setFileProcessingLoading(true); setFileProcessingError(null); addDebugLog({ type: 'info', message: `Requesting recursive content for ${paths.length} selected root path(s)...`}); try { const result = await window.electronAPI.readFilesRecursive(paths); if (result.success) { console.log(`App: Received ${result.files.length} raw file data objects.`); addDebugLog({ type: 'info', message: `Received raw data for ${result.files.length} files from backend.`}); let currentProcessedFiles = []; let totalTokens = 0; let fileErrors = []; for (const rawFileData of result.files) { if (rawFileData.error) { fileErrors.push(`Failed ${rawFileData.name || rawFileData.path}: ${rawFileData.error}`); continue; } try { let content = ''; let tokenCount = 0; if (rawFileData.contentType === 'base64' && rawFileData.type === 'pdf') { const pdfData = Uint8Array.from(atob(rawFileData.rawContent), c => c.charCodeAt(0)); content = await extractTextFromPDF({ arrayBuffer: () => Promise.resolve(pdfData.buffer), name: rawFileData.name }); } else if (rawFileData.type === 'rtf') { content = await extractTextFromRTF({ text: () => Promise.resolve(rawFileData.rawContent), name: rawFileData.name }); } else { content = rawFileData.rawContent || ''; } if (content && loadedApiKey) { tokenCount = await countTokens(content, selectedModel, loadedApiKey); } else if (content && !loadedApiKey) { console.warn("Cannot count file tokens: API Key missing."); addDebugLog({type: 'warning', message: `Token count skipped for ${rawFileData.name}: API Key missing.`}) } currentProcessedFiles.push({ id: rawFileData.id, name: rawFileData.name, content: content, size: rawFileData.size, tokenCount: tokenCount, type: rawFileData.type, }); totalTokens += tokenCount; } catch (parseError) { console.error(`App: Error parsing/counting ${rawFileData.name}:`, parseError); fileErrors.push(`Parse ${rawFileData.name}: ${parseError.message}`); } } console.log("App: Setting processed files data:", currentProcessedFiles.length, "files"); console.log("App: Setting processed files token count:", totalTokens); setProcessedFilesData(currentProcessedFiles); setProcessedFilesTokenCount(totalTokens); if (fileErrors.length > 0) { setFileProcessingError(fileErrors.join('; ')); addDebugLog({ type: 'error', message: `Processing errors: ${fileErrors.length} files failed.` }); } else { addDebugLog({ type: 'info', message: `Successfully processed ${currentProcessedFiles.length} files, ${totalTokens} tokens loaded.` }); } } else { console.error("App: Error from readFilesRecursive:", result.error); setFileProcessingError(result.error || "Failed."); addDebugLog({ type: 'error', message: `Failed to read files: ${result.error}` }); setProcessedFilesData([]); setProcessedFilesTokenCount(0); } } catch (ipcError) { console.error("App: Error calling electronAPI:", ipcError); setFileProcessingError(ipcError.message || "IPC Error."); addDebugLog({ type: 'error', message: `IPC Error reading files: ${ipcError.message}` }); setProcessedFilesData([]); setProcessedFilesTokenCount(0); } finally { setFileProcessingLoading(false); } }, [selectedFilePaths, selectedModel, addDebugLog, loadedApiKey]); // Added loadedApiKey
  const clearProcessedFiles = useCallback(() => { console.log("App: clearProcessedFiles called"); if (processedFilesData.length > 0) addDebugLog({ type: 'info', message: `Clearing ${processedFilesData.length} processed files & ${processedFilesTokenCount} tokens.` }); setProcessedFilesData([]); setProcessedFilesTokenCount(0); }, [processedFilesData.length, processedFilesTokenCount, addDebugLog]);
  const toggleRightSidebar = useCallback(() => { setIsRightSidebarExpanded(prev => !prev); }, []);
  useEffect(() => { setTokenLimit(getAppTokenLimit(selectedModel)); }, [selectedModel]);
  useEffect(() => { const newAncestorPaths = {}; for (const path in selectedFilePaths) { let current = getParentPath(path); while (current !== null) { newAncestorPaths[current] = true; current = getParentPath(current); } } setAncestorPaths(newAncestorPaths); }, [selectedFilePaths]);

  const combinedTokenCount = conversationTokenCount + processedFilesTokenCount;

  // --- Render ---
  if (apiKeyLoading) { return <div style={{ padding: '20px', color: '#ccc' }}>Loading Settings...</div>; } // Basic loading state

  return (
    <div className={`App ${isRightSidebarExpanded ? 'right-sidebar-expanded' : ''}`}>
      <LeftSidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="main-content-area">
         {activeView === 'prompt' && ( <MainArea ref={mainAreaRef} selectedModel={selectedModel} temperature={temperature} outputLength={outputLength} topP={topP} messages={messages} setMessages={setMessages} onTokenCountChange={handleTokenCountChange} addDebugLog={addDebugLog} filePool={processedFilesData} apiKey={loadedApiKey} /> )}
         {activeView === 'settings' && <SettingsView />}
         {activeView === 'library' && <div style={{padding: '20px', color: '#ccc'}}>Library View Coming Soon!</div>}
      </div>
      <RightSidebar selectedModel={selectedModel} setSelectedModel={setSelectedModel} temperature={temperature} setTemperature={setTemperature} outputLength={outputLength} setOutputLength={setOutputLength} topP={topP} setTopP={setTopP} tokenCount={combinedTokenCount} tokenLimit={tokenLimit} debugLogs={debugLogs} clearDebugLogs={clearDebugLogs} onClearHistory={clearHistory} selectedFilePaths={selectedFilePaths} setSelectedFilePaths={setSelectedFilePaths} ancestorPaths={ancestorPaths} triggerFileProcessing={triggerFileProcessing} clearProcessedFiles={clearProcessedFiles} fileProcessingLoading={fileProcessingLoading} addDebugLog={addDebugLog} isExpanded={isRightSidebarExpanded} toggleExpansion={toggleRightSidebar} />
    </div>
  );
}
export default App;