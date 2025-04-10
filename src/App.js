// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MainArea from './components/MainArea';
import { getTokenLimit } from './components/MainArea'; // Import helper if needed, or redefine here

// Define getTokenLimit here if not importing (simpler for now)
const MODEL_TOKEN_LIMITS = {
    'gemini-2.5-pro-exp-03-25': 1048576,
    'gemini-1.5-pro': 2097152,
    'gemini-1.5-flash-8b': 1048576,
    'gemini-1.5-flash': 1048576,
    'gemini-2.0-flash': 1048576,
    'gemini-2.0-flash-lite': 1048576,
    'gemini-1.0-pro': 32768,
};
const getAppTokenLimit = (model) => MODEL_TOKEN_LIMITS[model] || 32768;


function App() {
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-lite");
  const [messages, setMessages] = useState([]); // Central message state

  // --- Full State Implementation ---
  const [temperature, setTemperature] = useState(1);         // Default Temp
  const [outputLength, setOutputLength] = useState(8192);     // Default Output Length
  const [topP, setTopP] = useState(0.95);             // Default Top P
  const [conversationTokenCount, setConversationTokenCount] = useState(0); // Tokens from messages + system instructions
  const [filePoolTokenCount, setFilePoolTokenCount] = useState(0); // Tokens from files (Phase 3)
  const [tokenLimit, setTokenLimit] = useState(getAppTokenLimit(selectedModel)); // Dynamic limit
  const [debugLogs, setDebugLogs] = useState([]);           // Debug log state
  const [filePool, setFilePool] = useState([]);           // File pool state (Phase 3)

  const mainAreaRef = useRef(); // Ref to access MainArea methods

  // --- Handlers and Callbacks ---

  // Update token count from MainArea (includes messages, sys instructions, files)
  // Renamed parameter 'count' to 'conversationCount' for clarity
  const handleTokenCountChange = useCallback((conversationCount, currentLimit) => {
    setConversationTokenCount(conversationCount);
    // We get the limit from MainArea too, which is based on the selectedModel
    // already passed down, so we can just use it.
    setTokenLimit(currentLimit);
  }, []); // No dependencies needed if it just sets state

  // Add a new debug log entry
  const addDebugLog = useCallback((logData) => {
    // Add full context to the log
    const logEntry = {
      ...logData,
      // Ensure core parameters are always included if not already present
      model: logData.model || selectedModel,
      temperature: typeof logData.temperature === 'number' ? logData.temperature : temperature,
      outputLength: typeof logData.outputLength === 'number' ? logData.outputLength : outputLength,
      topP: typeof logData.topP === 'number' ? logData.topP : topP,
      timestamp: logData.timestamp || new Date().toISOString(), // Ensure timestamp
    };
    setDebugLogs(prevLogs => [logEntry, ...prevLogs].slice(0, 50)); // Keep latest 50
  }, [selectedModel, temperature, outputLength, topP]); // Dependencies for context

  // Clear debug logs
  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
    // Optional: Add a log entry indicating clearance
    addDebugLog({ type: 'debug-clear', message: 'Debug logs cleared.' });
  }, [addDebugLog]);

  // Function to trigger history clear in MainArea via ref
  const clearHistory = useCallback(() => {
    if (mainAreaRef.current && mainAreaRef.current.clearHistory) {
      mainAreaRef.current.clearHistory();
    } else {
       console.error("Could not call clearHistory on MainArea ref.");
       // Fallback if ref fails? Clear messages directly in App?
       // setMessages([]); // Use with caution, might desync state if ref exists
    }
  }, []); // No dependencies, relies on ref


  // --- Effects ---

  // Update token limit when model changes
  useEffect(() => {
    setTokenLimit(getAppTokenLimit(selectedModel));
  }, [selectedModel]);

  // Calculate combined token count for display
  const combinedTokenCount = conversationTokenCount + filePoolTokenCount;

  // --- Render ---
  return (
    <div className="App">
      <LeftSidebar /> {/* Will update in Step 3 */}
      <MainArea
        ref={mainAreaRef} // Pass ref
        selectedModel={selectedModel}
        temperature={temperature}     // Pass down state
        outputLength={outputLength}   // Pass down state
        topP={topP}                 // Pass down state
        messages={messages}           // Pass down state
        setMessages={setMessages}     // Pass down setter
        onTokenCountChange={handleTokenCountChange} // Pass down handler
        addDebugLog={addDebugLog}     // Pass down handler
        filePool={filePool}           // Pass down state (for token calc)
      />
      <RightSidebar
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel} // Pass down setter
        temperature={temperature}         // Pass down state
        setTemperature={setTemperature}     // Pass down setter
        outputLength={outputLength}       // Pass down state
        setOutputLength={setOutputLength}   // Pass down setter
        topP={topP}                     // Pass down state
        setTopP={setTopP}                 // Pass down setter
        tokenCount={combinedTokenCount}     // Pass down COMBINED count
        tokenLimit={tokenLimit}           // Pass down current limit
        debugLogs={debugLogs}           // Pass down state
        clearDebugLogs={clearDebugLogs}     // Pass down handler
        onClearHistory={clearHistory}       // Pass down handler
        // Pass file pool state/setters later in Phase 3
        filePool={filePool}
        setFilePool={setFilePool}
        filePoolTokenCount={filePoolTokenCount}
        setFilePoolTokenCount={setFilePoolTokenCount}
        addDebugLog={addDebugLog} // Pass addDebugLog for file operations later
      />
    </div>
  );
}

export default App;