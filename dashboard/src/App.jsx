import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'diff':
        return (
          <div className="page-stub">
            <h2>Diff Analyzer</h2>
            <p>Interactive schema diff comparisons will load here.</p>
          </div>
        );
      case 'fuzz':
        return (
          <div className="page-stub">
            <h2>Fuzz Simulator</h2>
            <p>Real-time terminal outputs will run here.</p>
          </div>
        );
      case 'cicd':
        return (
          <div className="page-stub">
            <h2>CI/CD Guide</h2>
            <p>Interactive workflow builder will load here.</p>
          </div>
        );
      default:
        return <div>Not Found</div>;
    }
  };

  return (
    <div className="app-container">
      {/* Background glow layers */}
      <div className="bg-glow-container">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <header className="app-header glass-panel">
          <div className="header-search">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search connected specs, APIs, issues..." />
          </div>
          <div className="header-actions">
            <div className="status-badge red glow-active">
              <span>⚠️ 2 Contract Drifts</span>
            </div>
            <div className="user-profile">
              <span className="avatar">👤</span>
              <span className="user-name">Developer Node</span>
            </div>
          </div>
        </header>

        <div className="content-container">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
