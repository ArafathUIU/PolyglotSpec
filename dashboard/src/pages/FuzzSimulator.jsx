import React, { useState, useEffect, useRef } from 'react';
import { sampleSchemas } from '../mockData';
import './FuzzSimulator.css';

// JS Adversarial Fuzzer Payload Generator
const generateFuzzPayloads = (schema) => {
  if (!schema) return [];
  const modelKey = Object.keys(schema)[0];
  if (!modelKey) return [];
  
  const model = schema[modelKey];
  const fields = model.fields || {};
  
  // 1. Get baseline value helper
  const getBaselineValue = (prop) => {
    const t = prop.type;
    if (t === 'string') {
      const min = prop.min !== undefined ? prop.min : (prop.min_length !== undefined ? prop.min_length : 0);
      return "A".repeat(Math.max(min, 3));
    }
    if (t === 'integer' || t === 'number') {
      const min = prop.minimum !== undefined ? prop.minimum : (prop.ge !== undefined ? prop.ge : 0);
      return Math.max(min, 1);
    }
    if (t === 'boolean') {
      return true;
    }
    if (t === 'array') {
      return [];
    }
    return null;
  };
  
  const baseline = {};
  for (const field of Object.keys(fields)) {
    baseline[field] = getBaselineValue(fields[field]);
  }
  
  const cases = [];
  
  // A. Baseline Case
  cases.push({
    scenario: "Baseline valid payload",
    payload: { ...baseline },
    isBaseline: true
  });
  
  // B. Required fields omission
  for (const field of Object.keys(fields)) {
    const prop = fields[field];
    if (prop.required) {
      const mutated = { ...baseline };
      delete mutated[field];
      cases.push({
        scenario: `Omitted required field: ${field}`,
        payload: mutated,
        isBaseline: false
      });
    }
  }
  
  // C. String boundaries & mutations
  for (const field of Object.keys(fields)) {
    const prop = fields[field];
    if (prop.type === 'string') {
      // Null byte
      const nullByteMutated = { ...baseline };
      nullByteMutated[field] = "admin\u0000user";
      cases.push({
        scenario: `Null byte injection in string: ${field}`,
        payload: nullByteMutated,
        isBaseline: false
      });
      
      // Min length underflow
      const min = prop.min !== undefined ? prop.min : prop.min_length;
      if (min !== undefined && min > 0) {
        const underflowMutated = { ...baseline };
        underflowMutated[field] = "A".repeat(min - 1);
        cases.push({
          scenario: `String minLength underflow (${min - 1}/${min}) in: ${field}`,
          payload: underflowMutated,
          isBaseline: false
        });
      }
      
      // Max length overflow
      const max = prop.max !== undefined ? prop.max : prop.max_length;
      if (max !== undefined) {
        const overflowMutated = { ...baseline };
        overflowMutated[field] = "A".repeat(max + 1);
        cases.push({
          scenario: `String maxLength overflow (${max + 1}/${max}) in: ${field}`,
          payload: overflowMutated,
          isBaseline: false
        });
      }
      
      // Semantic heuristics email
      const fieldLower = field.toLowerCase();
      if (fieldLower.includes('email')) {
        const badEmail = { ...baseline };
        badEmail[field] = "invalid-email-format";
        cases.push({
          scenario: `Semantic invalid email in: ${field}`,
          payload: badEmail,
          isBaseline: false
        });
      }
    }
    
    // D. Numeric boundaries
    if (prop.type === 'integer' || prop.type === 'number') {
      const min = prop.minimum !== undefined ? prop.minimum : prop.ge;
      if (min !== undefined) {
        const underflowMutated = { ...baseline };
        underflowMutated[field] = min - 1;
        cases.push({
          scenario: `Numeric minimum underflow in: ${field}`,
          payload: underflowMutated,
          isBaseline: false
        });
      }
      
      const max = prop.maximum !== undefined ? prop.maximum : prop.le;
      if (max !== undefined) {
        const overflowMutated = { ...baseline };
        overflowMutated[field] = max + 1;
        cases.push({
          scenario: `Numeric maximum overflow in: ${field}`,
          payload: overflowMutated,
          isBaseline: false
        });
      }
      
      // Negative heuristics
      const fieldLower = field.toLowerCase();
      if (['price', 'amount', 'cost', 'quantity'].some(x => fieldLower.includes(x))) {
        const negativeMutated = { ...baseline };
        negativeMutated[field] = -100;
        cases.push({
          scenario: `Semantic negative amount in field: ${field}`,
          payload: negativeMutated,
          isBaseline: false
        });
      }
    }
    
    // E. Type mutations
    const typeMutations = [
      { typeName: 'boolean', value: true },
      { typeName: 'integer', value: 999 },
      { typeName: 'string', value: "bad_type_str" },
      { typeName: 'array', value: [] }
    ];
    for (const mutation of typeMutations) {
      if (prop.type !== mutation.typeName) {
        if (prop.type === 'number' && mutation.typeName === 'integer') continue;
        if (prop.type === 'integer' && mutation.typeName === 'number') continue;
        
        const typeMutated = { ...baseline };
        typeMutated[field] = mutation.value;
        cases.push({
          scenario: `Type mutation (${mutation.typeName} instead of ${prop.type}) in: ${field}`,
          payload: typeMutated,
          isBaseline: false
        });
      }
    }
  }
  
  return cases;
};

export default function FuzzSimulator() {
  const [targetUrl, setTargetUrl] = useState('http://localhost:8000/api/users');
  const [fuzzMode, setFuzzMode] = useState('deterministic');
  const [selectedSchema, setSelectedSchema] = useState('StoreUserRequest');
  
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ passed: 0, leaks: 0, crashes: 0 });

  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const runLiveFuzz = async () => {
    if (isRunning) return;
    
    if (!targetUrl.toLowerCase().startsWith('http://') && !targetUrl.toLowerCase().startsWith('https://')) {
      setLogs([{
        type: 'error',
        text: `[ERROR] Invalid Target URL: "${targetUrl}". Only HTTP and HTTPS protocols are supported.`
      }]);
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setStats({ passed: 0, leaks: 0, crashes: 0 });

    const schema = selectedSchema === 'StoreUserRequest' ? sampleSchemas.laravel 
                 : (selectedSchema === 'UserModel' ? sampleSchemas.python : sampleSchemas.typescript);
                 
    setLogs(prev => [...prev, { type: 'info', text: 'Initializing PolyglotSpec Adversarial Fuzzer...' }]);
    setLogs(prev => [...prev, { type: 'info', text: `Target Endpoint: ${targetUrl}` }]);
    setLogs(prev => [...prev, { type: 'info', text: `Analyzing schema: ${selectedSchema}` }]);
    
    const testCases = generateFuzzPayloads(schema);
    setLogs(prev => [...prev, { type: 'info', text: `Generated ${testCases.length} dynamic validation mutations.` }]);
    setLogs(prev => [...prev, { type: 'info', text: 'Starting HTTP test suite execution...' }]);

    let passedCount = 0;
    let leakCount = 0;
    let crashCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const caseItem = testCases[i];
      const start = performance.now();
      
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(caseItem.payload)
        });
        
        const latency = Math.round(performance.now() - start);
        const status = response.status;
        
        let outcomeType = 'info';
        let logText = '';
        
        if (caseItem.isBaseline) {
          if (status >= 200 && status < 300) {
            passedCount++;
            outcomeType = 'passed';
            logText = `[OK] PASS [${caseItem.scenario}]: Valid baseline payload accepted as expected (Status ${status}, ${latency}ms).`;
          } else {
            outcomeType = 'error';
            logText = `[FAIL] Valid baseline payload rejected with status ${status} (${latency}ms).`;
          }
        } else {
          if (status === 400 || status === 422) {
            passedCount++;
            outcomeType = 'passed';
            logText = `[OK] PASS [${caseItem.scenario}]: Rejected with expected status ${status} (${latency}ms).`;
          } else if (status >= 500) {
            crashCount++;
            outcomeType = 'crash';
            logText = `[CRASH] SERVER ERROR [${caseItem.scenario}]: Server crashed with status ${status} (${latency}ms)!`;
          } else {
            leakCount++;
            outcomeType = 'leak';
            logText = `[LEAK] VULNERABILITY [${caseItem.scenario}]: Accepted with status ${status} (${latency}ms)!`;
          }
        }
        
        setLogs(prev => [...prev, { type: outcomeType, text: logText }]);
        setStats({ passed: passedCount, leaks: leakCount, crashes: crashCount });
      } catch (err) {
        const latency = Math.round(performance.now() - start);
        setLogs(prev => [...prev, {
          type: 'error',
          text: `[ERROR] Connection failed [${caseItem.scenario}] (${latency}ms): Network offline or CORS policy blocked.`
        }]);
      }
      
      setProgress(Math.round(((i + 1) / testCases.length) * 100));
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setLogs(prev => [...prev, { type: 'info', text: 'Adversarial fuzz execution complete.' }]);
    setIsRunning(false);
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
          onClick={runLiveFuzz}
          disabled={isRunning}
        >
          {isRunning ? '💥 Fuzzing Target...' : '⚡ Run Live HTTP Fuzzer'}
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
              Configure parameters above and click "Run Live HTTP Fuzzer" to execute dynamic payloads against target...
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
