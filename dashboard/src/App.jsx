import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import DiffAnalyzer from './pages/DiffAnalyzer';
import FuzzSimulator from './pages/FuzzSimulator';
import CicdGuide from './pages/CicdGuide';
import LandingPage from './pages/LandingPage';
import { sampleSchemas } from './mockData';
import './App.css';

export default function App() {
  const [view, setView] = useState('landing');
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

  const getModelDetails = (schemaStr, defaultName, defaultFile, lang) => {
    try {
      const parsed = JSON.parse(schemaStr);
      const keys = Object.keys(parsed);
      if (keys.length === 0) return { name: defaultName, file: "Active Session Comparison", isFlat: true };
      
      const firstKey = keys[0];
      const firstVal = parsed[firstKey];
      
      if (firstVal && typeof firstVal === 'object' && firstVal.fields) {
        const rawClass = firstVal.raw_class || firstKey;
        let path = defaultFile;
        if (lang === 'laravel') {
          path = `app/Http/Requests/${rawClass}.php`;
        } else if (lang === 'python') {
          path = `app/models/${rawClass.toLowerCase()}.py`;
        } else if (lang === 'typescript') {
          path = `src/schemas/${rawClass.toLowerCase()}.ts`;
        }
        return { name: rawClass, file: path, isFlat: false };
      }
      
      // Check if flat
      const isFlat = Object.values(parsed).some(v => v && typeof v === 'object' && 'type' in v);
      if (isFlat) {
        return { name: "Flat Schema", file: "Active Session Comparison", isFlat: true };
      }
      
      return { name: defaultName, file: "Active Session Comparison", isFlat: true };
    } catch (e) {
      return { name: defaultName, file: defaultFile, isFlat: false };
    }
  };

  // Compute stats dynamically
  const getDynamicServices = () => {
    const breakingCount = diffResults.filter(r => r.severity === 'breaking').length;
    const warningCount = diffResults.filter(r => r.severity === 'warning').length;
    const totalIssues = diffResults.length;
    const computedScore = Math.max(0, 100 - (breakingCount * 10) - (warningCount * 5));

    const consumerInfo = getModelDetails(consumerSchema, "StoreUserRequest", "StoreUserRequest.php", consumerLang);
    const providerInfo = getModelDetails(providerSchema, "UserModel", "user_models.py", providerLang);

    return [
      {
        id: "laravel-api",
        name: consumerLang === 'laravel' ? consumerInfo.name : "Laravel Core API",
        type: "consumer",
        framework: "PHP / Laravel",
        status: consumerLang === 'laravel' ? (totalIssues > 0 ? 'drifted' : 'synced') : 'synced',
        lastChecked: "Just now",
        activeIssues: consumerLang === 'laravel' ? totalIssues : 0,
        syncScore: consumerLang === 'laravel' ? computedScore : 100,
        filePath: consumerLang === 'laravel' ? consumerInfo.file : "app/Http/Requests/StoreUserRequest.php",
        schemaKey: consumerLang === 'laravel' ? consumerInfo.name : "StoreUserRequest"
      },
      {
        id: "fastapi-service",
        name: providerLang === 'python' ? providerInfo.name : "FastAPI AI Microservice",
        type: "provider",
        framework: "Python / FastAPI",
        status: providerLang === 'python' ? (totalIssues > 0 ? 'drifted' : 'synced') : 'synced',
        lastChecked: "Just now",
        activeIssues: providerLang === 'python' ? totalIssues : 0,
        syncScore: providerLang === 'python' ? computedScore : 100,
        filePath: providerLang === 'python' ? providerInfo.file : "app/models/user.py",
        schemaKey: providerLang === 'python' ? providerInfo.name : "UserModel"
      },
      {
        id: "node-gateway",
        name: consumerLang === 'typescript' ? consumerInfo.name : "Express API Gateway",
        type: "consumer",
        framework: "TypeScript / Node.js (Zod)",
        status: consumerLang === 'typescript' ? (totalIssues > 0 ? 'drifted' : 'synced') : 'synced',
        lastChecked: "Just now",
        activeIssues: consumerLang === 'typescript' ? totalIssues : 0,
        syncScore: consumerLang === 'typescript' ? computedScore : 100,
        filePath: consumerLang === 'typescript' ? consumerInfo.file : "src/schemas/user.ts",
        schemaKey: consumerLang === 'typescript' ? consumerInfo.name : "UserSchema"
      }
    ];
  };

  const services = getDynamicServices();
  const activeIssuesCount = diffResults.length;
  const averageSyncScore = Math.round(services.reduce((acc, s) => acc + s.syncScore, 0) / services.length);

  const getAlertLevel = () => {
    if (activeIssuesCount === 0) return "Fully Synced";
    const hasBreaking = diffResults.some(r => r.severity === 'breaking');
    return hasBreaking ? "Drift Alert" : "Drift Warning";
  };

  const alertLevel = getAlertLevel();

  const getDynamicHistory = () => {
    if (diffResults.length === 0) {
      return [
        {
          id: "dh-sync",
          service: consumerLang === 'laravel' ? "Laravel Core API" : "Express API Gateway",
          commit: "latest",
          author: "Active Session",
          message: "Contract drift check passed successfully",
          severity: "info",
          timestamp: "Just now",
          details: "All fields are fully compatible."
        }
      ];
    }

    return diffResults.map((res, index) => {
      return {
        id: `dh-dyn-${index}`,
        service: consumerLang === 'laravel' ? "Laravel Core API" : "Express API Gateway",
        commit: `drift-${index + 1}`,
        author: "Active Session",
        message: `Detected drift in field: ${res.field}`,
        severity: res.severity,
        timestamp: "Just now",
        details: res.message
      };
    });
  };

  const history = getDynamicHistory();

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview 
            services={services}
            averageSyncScore={averageSyncScore}
            activeIssuesCount={activeIssuesCount}
            alertLevel={alertLevel}
            history={history}
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

  if (view === 'landing') {
    return <LandingPage onEnterConsole={() => setView('dashboard')} />;
  }

  return (
    <div className="app-container">
      {/* Background glow layers */}
      <div className="bg-glow-container">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onExitConsole={() => setView('landing')} 
      />
      
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
          <div key={activeTab} className="fade-in-slide">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
