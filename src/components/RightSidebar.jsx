// src/components/RightSidebar.jsx
import React, { useState, useEffect } from 'react';
import './RightSidebar.css';

function RightSidebar({ selectedModel, setSelectedModel, temperature = 0.7, setTemperature }) {
  // Define state variables for dropdown toggles
  const [toolsOpen, setToolsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
      <div className="temperature-control">
        <div className="control-header">
          <label htmlFor="temperature-slider">Temperature: {tempValue.toFixed(1)}</label>
        </div>
        <input
          id="temperature-slider"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={tempValue}
          onChange={handleTemperatureChange}
          className="temperature-slider"
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
              <div className="output-length">
                <label>Output Length:</label>
                <input type="number" placeholder="Enter length" />
              </div>
              <div className="stop-sequences">
                <label>Stop Sequences:</label>
                <input type="text" placeholder="Comma separated" />
              </div>
              <div className="top-p">
                <label>Top P:</label>
                <input type="range" min="0" max="1" step="0.01" />
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
