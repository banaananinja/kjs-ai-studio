// src/components/RightSidebar.jsx
import React, { useState } from 'react';
import './RightSidebar.css';

function RightSidebar({ selectedModel, setSelectedModel }) {
  const models = [
    { name: "Gemini 2.5 Pro Preview", code: "gemini-2.5-pro-preview-03-25" },
    { name: "Gemini 2.0 Flash", code: "gemini-2.0-flash" },
    { name: "Gemini 2.0 Flash-Lite", code: "gemini-2.0-flash-lite" },
    { name: "Gemini 1.5 Flash", code: "gemini-1.5-flash" },
    { name: "Gemini 1.5 Flash-8B", code: "gemini-1.5-flash-8b" },
    { name: "Gemini 1.5 Pro", code: "gemini-1.5-pro" },
  ];

  const [toolsOpen, setToolsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

      <div className="token-count">
        <p>Token Count: 0</p>
      </div>

      <div className="temperature-slider">
        <label htmlFor="temperature">Temperature:</label>
        {/* Set slider range 0 to 2 if mimicking Google AI Studio */}
        <input type="range" id="temperature" min="0" max="2" step="0.01" />
      </div>

      {/* Tools dropdown */}
      <div className="tools-dropdown">
        <button onClick={() => setToolsOpen(!toolsOpen)}>Tools ▼</button>
        {toolsOpen && (
          <ul className="dropdown-menu">
            <li>Tool 1 (coming soon)</li>
            <li>Tool 2 (coming soon)</li>
          </ul>
        )}
      </div>

      {/* Advanced settings dropdown */}
      <div className="advanced-settings">
        <button onClick={() => setAdvancedOpen(!advancedOpen)}>Advanced Settings ▼</button>
        {advancedOpen && (
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
        )}
      </div>
    </div>
  );
}

export default RightSidebar;
