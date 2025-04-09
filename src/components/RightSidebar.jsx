// src/components/RightSidebar.jsx
import React, { useState, useEffect } from 'react';
import './RightSidebar.css';

function RightSidebar({ selectedModel, setSelectedModel, temperature = 0.7, setTemperature }) {
  // Define state variables for dropdown toggles
  const [toolsOpen, setToolsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Add state variables for advanced parameters
  const [outputLength, setOutputLength] = useState('');
  const [stopSequences, setStopSequences] = useState('');
  const [topP, setTopP] = useState(0.8);

  const models = [
    { name: "Gemini 2.5 Pro Preview", code: "gemini-2.5-pro-preview-03-25" },
    { name: "Gemini 2.0 Flash", code: "gemini-2.0-flash" },
    { name: "Gemini 2.0 Flash-Lite", code: "gemini-2.0-flash-lite" },
    { name: "Gemini 1.5 Flash", code: "gemini-1.5-flash" },
    { name: "Gemini 1.5 Flash-8B", code: "gemini-1.5-flash-8b" },
    { name: "Gemini 1.5 Pro", code: "gemini-1.5-pro" },
  ];

  // Local temperature state that syncs with parent
  const [tempValue, setTempValue] = useState(temperature);

  // Update parent component when slider changes
  const handleTemperatureChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setTempValue(newValue);
    if (setTemperature) {
      setTemperature(newValue);
    }
  };

  // Add handlers for advanced parameters
  const handleOutputLengthChange = (e) => {
    setOutputLength(e.target.value);
  };

  const handleStopSequencesChange = (e) => {
    setStopSequences(e.target.value);
  };

  const handleTopPChange = (e) => {
    setTopP(parseFloat(e.target.value));
  };

  // Keep local state in sync with props
  useEffect(() => {
    setTempValue(temperature);
  }, [temperature]);

  return (
    <div className="right-sidebar">
      {/* Model selector */}
      <div className="model-selector">
        <label htmlFor="model-select">Model:</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {models.map((model) => (
            <option key={model.code} value={model.code}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Temperature slider */}
      <div className="slider-container">
        <div className="label-with-value">
          <label>Temperature:</label>
          <span className="slider-value">{tempValue.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={tempValue}
          onChange={handleTemperatureChange}
          className="slider"
        />
        <div className="slider-labels">
          <span>Precise</span>
          <span>Balanced</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Tools dropdown */}
      <div className="dropdown-section">
        <div className="section-header">Tools</div>
        <div className="dropdown-title" onClick={() => setToolsOpen(!toolsOpen)}>
          <span>Available Tools</span>
          <span>{toolsOpen ? '▲' : '▼'}</span>
        </div>
        {toolsOpen && (
          <ul className="dropdown-menu">
            <li>Tool 1 (coming soon)</li>
            <li>Tool 2 (coming soon)</li>
          </ul>
        )}
      </div>

      {/* Advanced settings dropdown */}
      <div className="dropdown-section">
        <div className="section-header">Advanced Settings</div>
        <div className="dropdown-title" onClick={() => setAdvancedOpen(!advancedOpen)}>
          <span>Parameters</span>
          <span>{advancedOpen ? '▲' : '▼'}</span>
        </div>
        {advancedOpen && (
          <ul className="dropdown-menu">
            <div className="advanced-content">
              <div className="input-container">
                <label>Output Length:</label>
                <input 
                  type="text" 
                  value={outputLength} 
                  onChange={handleOutputLengthChange} 
                  className="dark-input"
                />
              </div>
              <div className="input-container">
                <label>Stop Sequences:</label>
                <input 
                  type="text" 
                  value={stopSequences} 
                  onChange={handleStopSequencesChange} 
                  className="dark-input"
                />
              </div>
              <div className="slider-container">
                <div className="label-with-value">
                  <label>Top P:</label>
                  <span className="slider-value">{topP.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={handleTopPChange}
                  className="slider"
                />
              </div>
            </div>
          </ul>
        )}
      </div>

      {/* You can add more settings sections as needed */}
    </div>
  );
}

export default RightSidebar;
