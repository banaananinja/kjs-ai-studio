// src/components/LeftSidebar.jsx
import React from 'react';
import './LeftSidebar.css';
// Import the logo - make sure the path is correct relative to this file
import logoImage from '../assets/KJs_AI_Studio.png';

function LeftSidebar() {
  return (
    <div className="left-sidebar">
      {/* Add the logo image */}
      <img src={logoImage} alt="KJ's AI Studio" className="sidebar-logo" />
      {/* Navigation Links */}
      <ul>
        {/* Add onClick handlers later if these need to change the view */}
        <li>Prompt</li>
        <li>Library (Soon)</li>
        <li>Settings (Soon)</li>
      </ul>
    </div>
  );
}

export default LeftSidebar;