// src/components/MainArea.jsx
import React, { useState } from 'react';
import GeminiPrompt from './GeminiPrompt';
import './MainArea.css';

function MainArea({ selectedModel }) {
  const [systemInstructions, setSystemInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="main-area">
      <div className={`system-instructions-container ${showInstructions ? 'expanded' : 'collapsed'}`}>
        <div className="instructions-header">
          <label htmlFor="system-instructions">System Instructions</label>
          <button 
            className="toggle-button" 
            onClick={() => setShowInstructions(!showInstructions)}
          >
            {showInstructions ? '−' : '+'}
          </button>
        </div>
        
        {showInstructions && (
          <>
            <textarea
              id="system-instructions"
              className="system-instructions-input"
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              placeholder="Enter system instructions to guide the model's behavior (optional)"
              rows="3"
            />
            <div className="instructions-help">
              <i className="info-icon">ⓘ</i>
              System instructions help steer the model's behavior for your specific use case
            </div>
          </>
        )}
      </div>
      <GeminiPrompt selectedModel={selectedModel} systemInstructions={systemInstructions} />
    </div>
  );
}

export default MainArea;
