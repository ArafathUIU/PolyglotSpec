import React from 'react';
import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'diff', name: 'Diff Analyzer', icon: '🔍' },
    { id: 'fuzz', name: 'Fuzz Simulator', icon: '⚡' },
    { id: 'cicd', name: 'CI/CD Guide', icon: '🛠️' },
  ];

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-brand">
        <span className="brand-logo">🛰️</span>
        <span className="brand-name gradient-text">PolyglotSpec</span>
      </div>
      
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.name}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-status">
          <div className="status-indicator online pulse"></div>
          <span>CLI Node Active</span>
        </div>
        <div className="footer-version">v0.1.0</div>
      </div>
    </aside>
  );
}
