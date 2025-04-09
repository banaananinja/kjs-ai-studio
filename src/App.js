// src/App.js
import React, { useState } from 'react';
import './App.css';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MainArea from './components/MainArea';

function App() {
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-lite");

  return (
    <div className="App">
      <LeftSidebar />
      <MainArea selectedModel={selectedModel} />
      <RightSidebar selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
    </div>
  );
}

export default App;
