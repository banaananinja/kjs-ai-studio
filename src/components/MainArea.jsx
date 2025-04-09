// src/components/MainArea.jsx
import React, { useState } from 'react';
import GeminiPrompt from './GeminiPrompt';
import './MainArea.css';

function MainArea({ selectedModel }) {
  const [systemInstructions, setSystemInstructions] = useState('');

  return (
    <div className="main-area">
      <div className="system-instructions-container">
        <label htmlFor="system-instructions">System Instructions:</label>
        <textarea
          id="system-instructions"
          className="system-instructions-input"
          value={systemInstructions}
          onChange={(e) => setSystemInstructions(e.target.value)}
          placeholder="Enter system instructions to guide the model's behavior (optional)"
          rows="3"
        />
        <div className="instructions-help">
          System instructions help steer the model's behavior for your specific use case
        </div>
      </div>
      <GeminiPrompt selectedModel={selectedModel} systemInstructions={systemInstructions} />
      {/* You can add other main content here if needed */}
    </div>
  );
}

export default MainArea;
