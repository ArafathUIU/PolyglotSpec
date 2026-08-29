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
  setDiffResults
}) {
  const [errorMsg, setErrorMsg] = useState('');

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

  // Load sample schema
  const handleLoadSample = (type, lang) => {
    if (type === 'consumer') {
      setConsumerLang(lang);
      setConsumerSchema(JSON.stringify(sampleSchemas[lang], null, 2));
    } else {
      setProviderLang(lang);
      setProviderSchema(JSON.stringify(sampleSchemas[lang], null, 2));
    }
  };

  return (
    <div className="diff-analyzer-container">
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
            onChange={(e) => setConsumerSchema(e.target.value)}
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
            onChange={(e) => setProviderSchema(e.target.value)}
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

        {!errorMsg && diffResults.length > 0 && (
          <div className="mismatches-list">
            {diffResults.map((res, i) => (
              <div key={i} className={`mismatch-card ${res.severity}`}>
                <span className={`status-badge ${res.severity === 'breaking' ? 'red' : 'yellow'}`}>
                  {res.severity}
                </span>
                <div className="mismatch-info">
                  <span className="mismatch-field">[{res.field}]</span>
                  <span className="mismatch-text">{res.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
