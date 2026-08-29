import React, { useState, useEffect } from 'react';
import { sampleSchemas } from '../mockData';
import './DiffAnalyzer.css';

export default function DiffAnalyzer({
  consumerLang,
  setConsumerLang,
  providerLang,
  setProviderLang,
  consumerSchema,
  setConsumerSchema,
  providerSchema,
  setProviderSchema,
  diffResults,
  setDiffResults,
  searchQuery = ""
}) {
  const [errorMsg, setErrorMsg] = useState('');
  const [activePreset, setActivePreset] = useState('preset1');
  const [expandedFixIdx, setExpandedFixIdx] = useState(null);
  const [llmExplanation, setLlmExplanation] = useState({});
  const [loadingLlm, setLoadingLlm] = useState(null);

  // Run visual diff rules
  const runDiff = () => {
    try {
      setErrorMsg('');
      const consumer = JSON.parse(consumerSchema);
      const provider = JSON.parse(providerSchema);

      const extractFields = (schema) => {
        if (!schema || typeof schema !== 'object') return {};
        const keys = Object.keys(schema);
        if (keys.length === 0) return {};

        const firstKey = keys[0];
        const val = schema[firstKey];

        // Wrapped schema structure: { "Model": { "fields": { ... } } }
        if (val && typeof val === 'object' && val.fields) {
          return val.fields;
        }

        // Flat schema structure: { "field1": { "type": "string" } }
        const isFlat = Object.values(schema).some(
          v => v && typeof v === 'object' && 'type' in v
        );
        if (isFlat) {
          return schema;
        }

        return {};
      };

      const cFields = extractFields(consumer);
      const pFields = extractFields(provider);

      const mismatches = [];

      // 1. Check fields defined in Consumer against Provider
      for (const field of Object.keys(cFields)) {
        const cProp = cFields[field];

        if (!(field in pFields)) {
          // Warning: Field removed in provider
          mismatches.push({
            field,
            severity: 'warning',
            message: `Provider does not define field '${field}' which is sent by Consumer.`
          });
          continue;
        }

        const pProp = pFields[field];

        // Type check
        if (cProp.type !== pProp.type) {
          // Exception: integer and number are compatible
          const isNumInt = (cProp.type === 'integer' && pProp.type === 'number') ||
                           (cProp.type === 'number' && pProp.type === 'integer');
          if (!isNumInt) {
            mismatches.push({
              field,
              severity: 'breaking',
              message: `Type mismatch: Consumer sends '${cProp.type}', but Provider expects '${pProp.type}'.`
            });
          }
        }

        // Check boundaries
        const cMin = cProp.min_length !== undefined ? cProp.min_length : cProp.min;
        const pMin = pProp.min_length !== undefined ? pProp.min_length : pProp.min;
        if (cMin !== undefined && pMin !== undefined && cMin < pMin) {
          mismatches.push({
            field,
            severity: 'breaking',
            message: `Minimum boundary tightened: Provider requires >= ${pMin}, but Consumer permits ${cMin}.`
          });
        }

        const cMax = cProp.max_length !== undefined ? cProp.max_length : cProp.max;
        const pMax = pProp.max_length !== undefined ? pProp.max_length : pProp.max;
        if (cMax !== undefined && pMax !== undefined && cMax > pMax) {
          mismatches.push({
            field,
            severity: 'breaking',
            message: `Maximum boundary tightened: Provider limits <= ${pMax}, but Consumer permits ${cMax}.`
          });
        }

        // Check ge constraint
        if (cProp.ge !== undefined && pProp.ge !== undefined && cProp.ge < pProp.ge) {
          mismatches.push({
            field,
            severity: 'breaking',
            message: `ge constraint tightened: Provider requires >= ${pProp.ge}, but Consumer permits ${cProp.ge}.`
          });
        }
      }

      // 2. Check fields in Provider that Consumer is not sending
      for (const field of Object.keys(pFields)) {
        if (!(field in cFields)) {
          const pProp = pFields[field];
          if (pProp.required) {
            mismatches.push({
              field,
              severity: 'breaking',
              message: `Missing required field: Provider expects '${field}' to be present.`
            });
          } else {
            mismatches.push({
              field,
              severity: 'warning',
              message: `Provider defines optional field '${field}' which is not sent by Consumer.`
            });
          }
        }
      }

      setDiffResults(mismatches);
    } catch (e) {
      setErrorMsg(`Parsing Error: ${e.message}`);
      setDiffResults([]);
    }
  };

  // Re-run diff whenever schema input changes
  useEffect(() => {
    runDiff();
  }, [consumerSchema, providerSchema]);

  const presets = [
    {
      id: 'boundary',
      name: 'Preset 1: Boundary Drift',
      consumer: {
        "StoreUserRequest": {
          "fields": {
            "username": {
              "type": "string",
              "required": true,
              "nullable": false,
              "min": 2,
              "max": 30
            }
          },
          "raw_class": "StoreUserRequest"
        }
      },
      provider: {
        "UserModel": {
          "fields": {
            "username": {
              "type": "string",
              "required": true,
              "nullable": false,
              "min_length": 3,
              "max_length": 20
            }
          },
          "raw_class": "UserModel"
        }
      },
      consumerLang: 'laravel',
      providerLang: 'python'
    },
    {
      id: 'required',
      name: 'Preset 2: Missing Required Field',
      consumer: {
        "StoreUserRequest": {
          "fields": {
            "username": {
              "type": "string",
              "required": true,
              "nullable": false
            }
          },
          "raw_class": "StoreUserRequest"
        }
      },
      provider: {
        "UserModel": {
          "fields": {
            "username": {
              "type": "string",
              "required": true,
              "nullable": false
            },
            "tax_code": {
              "type": "string",
              "required": true,
              "nullable": false
            }
          },
          "raw_class": "UserModel"
        }
      },
      consumerLang: 'laravel',
      providerLang: 'python'
    },
    {
      id: 'synced',
      name: 'Preset 3: Fully Synced',
      consumer: {
        "StoreUserRequest": {
          "fields": {
            "username": {
              "type": "string",
              "required": true,
              "nullable": false,
              "min": 3,
              "max": 20
            }
          },
          "raw_class": "StoreUserRequest"
        }
      },
      provider: {
        "UserModel": {
          "fields": {
            "username": {
              "type": "string",
              "required": true,
              "nullable": false,
              "min_length": 3,
              "max_length": 20
            }
          },
          "raw_class": "UserModel"
        }
      },
      consumerLang: 'laravel',
      providerLang: 'python'
    }
  ];

  const handleApplyPreset = (preset) => {
    setActivePreset(preset.id);
    setConsumerLang(preset.consumerLang);
    setProviderLang(preset.providerLang);
    setConsumerSchema(JSON.stringify(preset.consumer, null, 2));
    setProviderSchema(JSON.stringify(preset.provider, null, 2));
  };

  // Load sample schema
  const handleLoadSample = (type, lang) => {
    setActivePreset(null);
    if (type === 'consumer') {
      setConsumerLang(lang);
      setConsumerSchema(JSON.stringify(sampleSchemas[lang], null, 2));
    } else {
      setProviderLang(lang);
      setProviderSchema(JSON.stringify(sampleSchemas[lang], null, 2));
    }
  };

  const getAIExplanation = (res) => {
    const msg = res.message;
    if (msg.includes('minimum value') || msg.includes('length minimum')) {
      return `The consumer request rules allow smaller inputs than the provider backend is configured to accept. Any request containing a value below the provider's threshold will result in a 400 Bad Request at runtime.`;
    }
    if (msg.includes('maximum value') || msg.includes('length maximum')) {
      return `The consumer request rules permit larger inputs than the provider validates. This is a security risk that can cause database field truncation errors or memory resource exhaustion on the backend API.`;
    }
    if (msg.includes('Required field omission')) {
      return `The provider API marks this parameter as required, but the consumer validation rules do not enforce its presence. A client sending requests without this field will trigger 422 Unprocessable Entity errors.`;
    }
    if (msg.includes('Type mismatch')) {
      return `The consumer validation rules expect a different data type than the provider expects. This causes type casting failures or serialization exceptions during API payload parsing.`;
    }
    return `A contract drift constraint mismatch was detected. Align the schema parameters between the consumer's request rules and the provider's API specifications.`;
  };

  const askLlmAdvisor = async (idx, res) => {
    setLoadingLlm(idx);
    setLlmExplanation(prev => ({ ...prev, [idx]: 'Calling local LLM (Ollama) endpoint...' }));
    
    try {
      const prompt = `Explain the following microservice API contract drift in 2 sentences. Mismatch: ${res.message}`;
      const response = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || 'No explanation received.';
        setLlmExplanation(prev => ({ ...prev, [idx]: content }));
      } else {
        throw new Error('Ollama offline');
      }
    } catch (err) {
      // Offline fallback after minor delay for native loading feel
      setTimeout(() => {
        const fallback = `[Local AI Advisor]: ${getAIExplanation(res)} Suggested fix: Click "Align Consumer" or "Align Provider" below to sync the contract boundaries automatically.`;
        setLlmExplanation(prev => ({ ...prev, [idx]: fallback }));
      }, 700);
    } finally {
      setTimeout(() => setLoadingLlm(null), 700);
    }
  };

  const applyAIFix = (res, target) => {
    try {
      const consumer = JSON.parse(consumerSchema);
      const provider = JSON.parse(providerSchema);
      
      const consumerKey = Object.keys(consumer)[0];
      const providerKey = Object.keys(provider)[0];
      if (!consumerKey || !providerKey) return;
      
      const cField = consumer[consumerKey].fields[res.field];
      const pField = provider[providerKey].fields[res.field];
      
      const msg = res.message;
      
      // 1. Min boundary drift
      if (msg.includes('minimum value') || msg.includes('length minimum')) {
        const match = msg.match(/(?:minimum value|length minimum) (\d+), but Provider requires minimum (\d+)/);
        if (match) {
          const cMin = parseInt(match[1]);
          const pMin = parseInt(match[2]);
          if (target === 'consumer') {
            if (cField.min !== undefined) cField.min = pMin;
            if (cField.minimum !== undefined) cField.minimum = pMin;
            if (cField.min_length !== undefined) cField.min_length = pMin;
          } else {
            if (pField.minimum !== undefined) pField.minimum = cMin;
            if (pField.ge !== undefined) pField.ge = cMin;
            if (pField.min_length !== undefined) pField.min_length = cMin;
            if (pField.min !== undefined) pField.min = cMin;
          }
        }
      }
      
      // 2. Max boundary drift
      else if (msg.includes('maximum value') || msg.includes('length maximum')) {
        const match = msg.match(/(?:maximum value|length maximum) (\d+), but Provider limits maximum to (\d+)/);
        if (match) {
          const cMax = parseInt(match[1]);
          const pMax = parseInt(match[2]);
          if (target === 'consumer') {
            if (cField.max !== undefined) cField.max = pMax;
            if (cField.maximum !== undefined) cField.maximum = pMax;
            if (cField.max_length !== undefined) cField.max_length = pMax;
          } else {
            if (pField.maximum !== undefined) pField.maximum = cMax;
            if (pField.le !== undefined) pField.le = cMax;
            if (pField.max_length !== undefined) pField.max_length = cMax;
            if (pField.max !== undefined) pField.max = cMax;
          }
        }
      }
      
      // 3. Required field omission
      else if (msg.includes('Required field omission')) {
        if (target === 'consumer') {
          if (cField) cField.required = true;
        } else {
          if (pField) pField.required = false;
        }
      }
      
      // 4. Type mismatch
      else if (msg.includes('Type mismatch')) {
        const match = msg.match(/Consumer sends '([^']*)', but Provider expects '([^']*)'/);
        if (match) {
          const cType = match[1];
          const pType = match[2];
          if (target === 'consumer') {
            if (cField) cField.type = pType;
          } else {
            if (pField) pField.type = cType;
          }
        }
      }
      
      setConsumerSchema(JSON.stringify(consumer, null, 2));
      setProviderSchema(JSON.stringify(provider, null, 2));
      setExpandedFixIdx(null); // Collapse panel
    } catch (err) {
      console.error("AI fix parsing failed:", err);
    }
  };

  const filteredDiffResults = diffResults.filter(r => 
    r.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="diff-analyzer-container">
      {/* Presets Toolbar */}
      <div className="presets-toolbar glass-panel">
        <span className="presets-label">⚡ Quick Presets:</span>
        <div className="presets-buttons">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`btn-secondary btn-sm preset-btn ${activePreset === preset.id ? 'active' : ''}`}
              onClick={() => handleApplyPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selection row */}
      <div className="diff-header-row">
        <div className="selector-panel glass-panel">
          <div className="selector-group">
            <span className="selector-label">Consumer Schema:</span>
            <div className="selector-buttons">
              <button 
                className={`btn-secondary btn-sm ${consumerLang === 'laravel' ? 'active' : ''}`}
                onClick={() => handleLoadSample('consumer', 'laravel')}
              >
                Laravel PHP
              </button>
              <button 
                className={`btn-secondary btn-sm ${consumerLang === 'typescript' ? 'active' : ''}`}
                onClick={() => handleLoadSample('consumer', 'typescript')}
              >
                TS Zod
              </button>
            </div>
          </div>

          <div className="separator">↔</div>

          <div className="selector-group">
            <span className="selector-label">Provider Schema:</span>
            <div className="selector-buttons">
              <button 
                className={`btn-secondary btn-sm ${providerLang === 'python' ? 'active' : ''}`}
                onClick={() => handleLoadSample('provider', 'python')}
              >
                Python Pydantic
              </button>
              <button 
                className={`btn-secondary btn-sm ${providerLang === 'typescript' ? 'active' : ''}`}
                onClick={() => handleLoadSample('provider', 'typescript')}
              >
                TS Zod
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor row */}
      <div className="diff-editors-row">
        <div className="editor-container glass-panel">
          <div className="editor-header">
            <span>Consumer (Validation Rules)</span>
            <span className="editor-lang-badge">{consumerLang}</span>
          </div>
          <textarea 
            className="schema-textarea"
            value={consumerSchema}
            onChange={(e) => {
              setConsumerSchema(e.target.value);
              setActivePreset(null);
            }}
          />
        </div>

        <div className="editor-container glass-panel">
          <div className="editor-header">
            <span>Provider (Target API Contract)</span>
            <span className="editor-lang-badge">{providerLang}</span>
          </div>
          <textarea 
            className="schema-textarea"
            value={providerSchema}
            onChange={(e) => {
              setProviderSchema(e.target.value);
              setActivePreset(null);
            }}
          />
        </div>
      </div>

      {/* Results output */}
      <div className="diff-results-row glass-panel">
        <h3 className="results-title">Drift Detection Results</h3>
        
        {errorMsg && <div className="error-banner">{errorMsg}</div>}
        
        {!errorMsg && diffResults.length === 0 && (
          <div className="success-banner">
            <span className="success-icon">✔</span>
            <span>No contract drift detected! Consumer and Provider contracts are fully compatible.</span>
          </div>
        )}

        {!errorMsg && filteredDiffResults.length > 0 && (
          <div className="mismatches-list">
            {filteredDiffResults.map((res, i) => {
              const isExpanded = expandedFixIdx === i;
              return (
                <div key={i} className={`mismatch-card ${res.severity} ${isExpanded ? 'ai-expanded' : ''}`}>
                  <div className="mismatch-header-row">
                    <div className="mismatch-main-info">
                      <span className={`status-badge ${res.severity === 'breaking' ? 'red' : 'yellow'}`}>
                        {res.severity}
                      </span>
                      <div className="mismatch-info">
                        <span className="mismatch-field">[{res.field}]</span>
                        <span className="mismatch-text">{res.message}</span>
                      </div>
                    </div>
                    <button 
                      className={`btn-secondary btn-xs ai-copilot-btn ${isExpanded ? 'active' : ''}`}
                      onClick={() => {
                        setExpandedFixIdx(isExpanded ? null : i);
                        if (!isExpanded && !llmExplanation[i]) {
                          askLlmAdvisor(i, res);
                        }
                      }}
                    >
                      🪄 AI Copilot
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ai-fix-panel">
                      <div className="ai-fix-divider"></div>
                      <div className="ai-advisor-header">
                        <span className="ai-sparkle-icon">✨</span>
                        <span className="ai-advisor-title">AI Resolution Advisor</span>
                      </div>
                      <p className="ai-explanation-text">
                        {llmExplanation[i] || 'Analyzing contract drift...'}
                      </p>
                      <div className="ai-fix-actions">
                        <span className="ai-action-label">Apply Alignment Fix:</span>
                        <div className="ai-action-buttons">
                          <button 
                            className="btn-primary btn-xs"
                            onClick={() => applyAIFix(res, 'consumer')}
                          >
                            Align Consumer ➔
                          </button>
                          <button 
                            className="btn-secondary btn-xs"
                            onClick={() => applyAIFix(res, 'provider')}
                          >
                            Align Provider ➔
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
