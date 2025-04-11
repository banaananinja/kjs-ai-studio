// src/components/LeftSidebar.jsx
import React from 'react';
import './LeftSidebar.css';
import logoImage from '../assets/KJs_AI_Studio.png';

// Receive activeView and setActiveView props from App.js
function LeftSidebar({ activeView, setActiveView }) {
  return (
    <div className="left-sidebar">
      <img src={logoImage} alt="KJ's AI Studio" className="sidebar-logo" />
      <ul>
        {/* Add onClick handlers and conditional 'active' class */}
        <li
          className={activeView === 'prompt' ? 'active' : ''}
          onClick={() => setActiveView('prompt')}
        >
          Prompt
        </li>
        <li
          className={activeView === 'library' ? 'active' : ''}
          onClick={() => setActiveView('library')}
        >
          Library (Soon)
        </li>
        <li
          className={activeView === 'settings' ? 'active' : ''}
          onClick={() => setActiveView('settings')}
        >
          Settings
        </li>
      </ul>
    </div>
  );
}

export default LeftSidebar;