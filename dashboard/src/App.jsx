import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import DiffAnalyzer from './pages/DiffAnalyzer';
import FuzzSimulator from './pages/FuzzSimulator';
import CicdGuide from './pages/CicdGuide';
import { sampleSchemas } from './mockData';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Lifted Diff analyzer state
  const [consumerLang, setConsumerLang] = useState('laravel');
  const [providerLang, setProviderLang] = useState('python');
  const [consumerSchema, setConsumerSchema] = useState(
    JSON.stringify(sampleSchemas.laravel, null, 2)
  );
  const [providerSchema, setProviderSchema] = useState(
    JSON.stringify(sampleSchemas.python, null, 2)
  );
  const [diffResults, setDiffResults] = useState([]);

  // Compute stats dynamically
  const getDynamicServices = () => {
    const breakingCount = diffResults.filter(r => r.severity === 'breaking').length;
    const warningCount = diffResults.filter(r => r.severity === 'warning').length;
    const totalIssues = diffResults.length;
    const computedScore = Math.max(0, 100 - (breakingCount * 10) - (warningCount * 5));

    return [
      {
        id: "laravel-api",
        name: "Laravel Core API",
        type: "consumer",
        framework: "PHP / Laravel",
        status: consumerLang === 'laravel' ? (totalIssues > 0 ? 'drifted' : 'synced') : 'synced',
        lastChecked: "Just now",
        activeIssues: consumerLang === 'laravel' ? totalIssues : 0,
        syncScore: consumerLang === 'laravel' ? computedScore : 100,
        filePath: "app/Http/Requests/StoreUserRequest.php",
        schemaKey: "StoreUserRequest"
      },
      {
        id: "fastapi-service",
        name: "FastAPI AI Microservice",
        type: "provider",
        framework: "Python / FastAPI",
        status: "synced",
        lastChecked: "Just now",
        activeIssues: 0,
        syncScore: 100,
        filePath: "app/models/user.py",
        schemaKey: "UserModel"
      },
      {
        id: "node-gateway",
        name: "Express API Gateway",
        type: "consumer",
        framework: "TypeScript / Node.js (Zod)",
        status: consumerLang === 'typescript' ? (totalIssues > 0 ? 'drifted' : 'synced') : 'synced',
        lastChecked: "Just now",
        activeIssues: consumerLang === 'typescript' ? totalIssues : 0,
        syncScore: consumerLang === 'typescript' ? computedScore : 100,
        filePath: "src/schemas/user.ts",
        schemaKey: "UserSchema"
      }
    ];
  };

  const services = getDynamicServices();
  const activeIssuesCount = services.reduce((acc, s) => acc + s.activeIssues, 0);
  const averageSyncScore = Math.round(services.reduce((acc, s) => acc + s.syncScore, 0) / services.length);

  const getAlertLevel = () => {
    if (activeIssuesCount === 0) return "Fully Synced";
    const hasBreaking = diffResults.some(r => r.severity === 'breaking');
    return hasBreaking ? "Drift Alert" : "Drift Warning";
  };

  const alertLevel = getAlertLevel();

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview 
            services={services}
            averageSyncScore={averageSyncScore}
            activeIssuesCount={activeIssuesCount}
            alertLevel={alertLevel}
          />
        );
      case 'diff':
        return (
          <DiffAnalyzer 
            consumerLang={consumerLang}
            setConsumerLang={setConsumerLang}
            providerLang={providerLang}
            setProviderLang={setProviderLang}
            consumerSchema={consumerSchema}
            setConsumerSchema={setConsumerSchema}
            providerSchema={providerSchema}
            setProviderSchema={setProviderSchema}
            diffResults={diffResults}
            setDiffResults={setDiffResults}
          />
        );
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
            <div className={`status-badge ${activeIssuesCount === 0 ? 'green' : 'red glow-active'}`}>
              <span>{activeIssuesCount === 0 ? '✔ Fully Synced' : `⚠️ ${activeIssuesCount} Contract Drifts`}</span>
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
