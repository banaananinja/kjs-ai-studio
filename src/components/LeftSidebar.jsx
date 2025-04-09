// src/components/LeftSidebar.jsx
import React from 'react';
import './LeftSidebar.css';

function LeftSidebar() {
  return (
    <div className="left-sidebar">
      <h2>Navigation</h2>
      <ul>
        <li>Prompt</li>
        <li>Library</li>
        <li>Settings</li>
      </ul>
    </div>
  );
}

export default LeftSidebar;
