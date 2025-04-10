// src/components/MainArea.jsx
import React, { useState } from 'react';
import GeminiPrompt from './GeminiPrompt';
import './MainArea.css';

function MainArea({ selectedModel, systemInstructions: externalSystemInstructions, onSystemInstructionsChange, enableCodeExecution }) {
  // Use local state if external props aren't provided
  const [localSystemInstructions, setLocalSystemInstructions] = useState('');
  const [filePool, setFilePool] = useState([]);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Determine whether to use props or local state
  const systemInstructions = externalSystemInstructions !== undefined ? externalSystemInstructions : localSystemInstructions;
  
  // Handle changes to system instructions
  const handleSystemInstructionsChange = (value) => {
    if (onSystemInstructionsChange) {
      onSystemInstructionsChange(value);
    } else {
      setLocalSystemInstructions(value);
    }
  };

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
              onChange={(e) => handleSystemInstructionsChange(e.target.value)}
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
      
      <GeminiPrompt 
        selectedModel={selectedModel} 
        systemInstructions={systemInstructions}
        enableCodeExecution={enableCodeExecution}
        filePool={filePool}
      />
    </div>
  );
}

export default MainArea;
