// src/App.js
import React, { useState } from 'react';
import './App.css';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import GeminiPrompt from './components/GeminiPrompt';

function App() {
  // Default model (you can update this later via the drop-down)
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-lite");

  return (
    <div className="App">
      <LeftSidebar />
      <div className="main-area">
        <GeminiPrompt selectedModel={selectedModel} />
      </div>
      <RightSidebar selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
    </div>
  );
}

export default App;
