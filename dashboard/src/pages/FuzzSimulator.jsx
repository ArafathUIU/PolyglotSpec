import React, { useState, useEffect, useRef } from 'react';
import './FuzzSimulator.css';

export default function FuzzSimulator() {
  const [targetUrl, setTargetUrl] = useState('http://localhost:8000/api/users');
  const [fuzzMode, setFuzzMode] = useState('deterministic');
  const [selectedSchema, setSelectedSchema] = useState('StoreUserRequest');
  
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ passed: 0, leaks: 0, crashes: 0 });

  const terminalEndRef = useRef(null);

  // Auto scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const simulateFuzz = () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setStats({ passed: 0, leaks: 0, crashes: 0 });

    const scenarios = [
      { type: 'info', text: 'Initializing PolyglotSpec Adversarial Fuzzer...' },
      { type: 'info', text: `Analyzing schema: ${selectedSchema}` },
      { type: 'info', text: 'Compiling deterministic boundary constraints and type mutations...' },
      { type: 'info', text: 'SLM Connector Offline: Falling back to rule-based semantic heuristic generator...' },
      { type: 'info', text: 'Compiled 10 fuzzing payloads. Starting target execution against ' + targetUrl },
      { type: 'passed', text: '[OK] PASS [Baseline valid payload]: Valid baseline payload accepted as expected (201 Created).' },
      { type: 'passed', text: '[OK] PASS [Omitted required field: username]: Rejected with expected validation status 422.' },
      { type: 'passed', text: '[OK] PASS [String minLength underflow (2/3) in: username]: Rejected with expected status 400.' },
      { type: 'leak', text: '[LEAK] VULNERABILITY [String maxLength overflow (21/20) in: username]: Accepted with status 200 OK!' },
      { type: 'passed', text: '[OK] PASS [Numeric minimum underflow in: age]: Rejected with expected status 422.' },
      { type: 'crash', text: '[CRASH] SERVER ERROR [Type mutation (bool instead of integer) in: age]: Server crashed with status 500!' },
      { type: 'passed', text: '[OK] PASS [Semantic invalid email in: email]: Rejected with expected status 400.' },
      { type: 'passed', text: '[OK] PASS [Semantic negative amount in: price]: Rejected with expected status 422.' },
      { type: 'leak', text: '[LEAK] VULNERABILITY [Null byte injection in: username]: String terminated prematurely, bypassed filter. Status 200!' },
      { type: 'info', text: 'Fuzzing suite execution complete.' }
    ];

    let currentStep = 0;
    
    const interval = setInterval(() => {
      if (currentStep < scenarios.length) {
        const stepData = scenarios[currentStep];
        setLogs(prev => [...prev, stepData]);
        
        // Update stats
        if (stepData.type === 'passed') {
          setStats(prev => ({ ...prev, passed: prev.passed + 1 }));
        } else if (stepData.type === 'leak') {
          setStats(prev => ({ ...prev, leaks: prev.leaks + 1 }));
        } else if (stepData.type === 'crash') {
          setStats(prev => ({ ...prev, crashes: prev.crashes + 1 }));
        }

        currentStep++;
        setProgress(Math.floor((currentStep / scenarios.length) * 100));
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 600);
  };

  return (
    <div className="fuzz-simulator-container">
      {/* Control Configuration Panel */}
      <div className="fuzz-controls glass-panel">
        <h3 className="controls-title">Fuzzer Configuration</h3>
        
        <div className="controls-grid">
          <div className="control-field">
            <label className="field-label">Target URL Endpoint:</label>
            <input 
              type="text" 
              className="fuzz-input"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="http://localhost:8000/api/users"
              disabled={isRunning}
            />
          </div>

          <div className="control-field">
            <label className="field-label">Fuzz Schema Context:</label>
            <select 
              className="fuzz-select" 
              value={selectedSchema} 
              onChange={(e) => setSelectedSchema(e.target.value)}
              disabled={isRunning}
            >
              <option value="StoreUserRequest">StoreUserRequest (Laravel PHP)</option>
              <option value="UserModel">UserModel (Python FastAPI)</option>
              <option value="UserSchema">UserSchema (TypeScript Zod)</option>
            </select>
          </div>

          <div className="control-field">
            <label className="field-label">Fuzz Engine Mode:</label>
            <select 
              className="fuzz-select" 
              value={fuzzMode} 
              onChange={(e) => setFuzzMode(e.target.value)}
              disabled={isRunning}
            >
              <option value="deterministic">Deterministic Boundaries (Heuristics)</option>
              <option value="semantic">Adversarial Semantic (SLM Prompts)</option>
            </select>
          </div>
        </div>

        <button 
          className={`btn-primary fuzz-run-btn ${isRunning ? 'running' : ''}`}
          onClick={simulateFuzz}
          disabled={isRunning}
        >
          {isRunning ? '💥 Fuzzing Target...' : '⚡ Run Adversarial Fuzzer'}
        </button>
      </div>

      {/* Progress & Stat Widgets */}
      <div className="fuzz-stats-row">
        <div className="progress-container glass-panel">
          <span className="stat-label">Execution Progress</span>
          <div className="progress-header">
            <span className="progress-percent">{progress}%</span>
          </div>
          <div className="fuzz-progress-bg">
            <div className="fuzz-progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="stat-box glass-panel green">
          <span className="stat-num">{stats.passed}</span>
          <span className="stat-label">Passed Checks</span>
        </div>

        <div className="stat-box glass-panel yellow">
          <span className="stat-num">{stats.leaks}</span>
          <span className="stat-label">Contract Leaks</span>
        </div>

        <div className="stat-box glass-panel red">
          <span className="stat-num">{stats.crashes}</span>
          <span className="stat-label">Server Crashes</span>
        </div>
      </div>

      {/* Live Terminal Output Console */}
      <div className="terminal-console glass-panel">
        <div className="terminal-header">
          <div className="terminal-buttons">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>
          <span className="terminal-title">Console: polyglotspec fuzz --target</span>
        </div>
        
        <div className="terminal-body">
          {logs.length === 0 && (
            <div className="terminal-placeholder">
              Configure parameters above and click "Run Adversarial Fuzzer" to watch live test execution logs...
            </div>
          )}
          
          {logs.map((log, index) => (
            <div key={index} className={`terminal-line ${log.type}`}>
              <span className="line-timestamp">[{new Date().toLocaleTimeString()}]</span>
              <span className="line-text">{log.text}</span>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
