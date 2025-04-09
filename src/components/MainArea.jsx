// src/components/MainArea.jsx
import React from 'react';
import GeminiPrompt from './GeminiPrompt';
import './MainArea.css';

function MainArea({ selectedModel }) {
  return (
    <div className="main-area">
      <GeminiPrompt selectedModel={selectedModel} />
      {/* You can add other main content here if needed */}
    </div>
  );
}

export default MainArea;
