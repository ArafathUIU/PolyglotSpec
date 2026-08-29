import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import DiffAnalyzer from './pages/DiffAnalyzer';
import FuzzSimulator from './pages/FuzzSimulator';
import CicdGuide from './pages/CicdGuide';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [driftCount, setDriftCount] = useState(2);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'diff':
        return <DiffAnalyzer setDriftCount={setDriftCount} />;
      case 'fuzz':
        return <FuzzSimulator />;
      case 'cicd':
        return <CicdGuide />;
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
            <div className={`status-badge ${driftCount === 0 ? 'green' : 'red glow-active'}`}>
              <span>{driftCount === 0 ? '✔ Fully Synced' : `⚠️ ${driftCount} Contract Drifts`}</span>
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
