import React from 'react';
import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab, onExitConsole }) {
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

      <div className="sidebar-exit" style={{ marginTop: 'auto', marginBottom: '12px' }}>
        <button className="nav-item exit-btn" onClick={onExitConsole} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 16px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label" style={{ fontWeight: '600', fontSize: '0.9rem' }}>Exit Console</span>
        </button>
      </div>

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
