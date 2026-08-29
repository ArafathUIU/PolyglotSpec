import React, { useState } from 'react';
import './CicdGuide.css';

export default function CicdGuide() {
  const [platform, setPlatform] = useState('github');
  const [branch, setBranch] = useState('main');
  const [consumerPath, setConsumerPath] = useState('app/Http/Requests/StoreUserRequest.php');
  const [providerPath, setProviderPath] = useState('app/models/user.py');
  const [failOnWarnings, setFailOnWarnings] = useState(false);
  const [copied, setCopied] = useState(false);

  const getGithubYaml = () => {
    const warningFlag = failOnWarnings ? ' --fail-on-warnings' : '';
    return `name: API Contract Drift Check

on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]

jobs:
  contract-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install PolyglotSpec
        run: |
          pip install git+https://github.com/ArafathUIU/PolyglotSpec.git

      - name: Detect Contract Drift
        run: |
          # Compare validation schemas against models
          polyglotspec diff ${consumerPath} ${providerPath}${warningFlag}
`;
  };

  const getGitlabYaml = () => {
    const warningFlag = failOnWarnings ? ' --fail-on-warnings' : '';
    return `stages:
  - test

contract-drift-check:
  stage: test
  image: python:3.11-slim
  before_script:
    - apt-get update && apt-get install -y git
    - pip install git+https://github.com/ArafathUIU/PolyglotSpec.git
  script:
    - polyglotspec diff ${consumerPath} ${providerPath}${warningFlag}
  only:
    - ${branch}
    - merge_requests
`;
  };

  const codeText = platform === 'github' ? getGithubYaml() : getGitlabYaml();

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cicd-guide-container">
      <div className="guide-config glass-panel">
        <h3 className="guide-title">CI/CD Configurator</h3>
        
        <div className="config-grid">
          <div className="config-field">
            <label className="field-label">CI/CD Platform:</label>
            <div className="platform-toggle">
              <button 
                className={`btn-secondary ${platform === 'github' ? 'active' : ''}`}
                onClick={() => setPlatform('github')}
              >
                GitHub Actions
              </button>
              <button 
                className={`btn-secondary ${platform === 'gitlab' ? 'active' : ''}`}
                onClick={() => setPlatform('gitlab')}
              >
                GitLab CI
              </button>
            </div>
          </div>

          <div className="config-field">
            <label className="field-label">Primary Branch:</label>
            <input 
              type="text" 
              className="config-input" 
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>

          <div className="config-field">
            <label className="field-label">Consumer Path:</label>
            <input 
              type="text" 
              className="config-input" 
              value={consumerPath}
              onChange={(e) => setConsumerPath(e.target.value)}
            />
          </div>

          <div className="config-field">
            <label className="field-label">Provider Path:</label>
            <input 
              type="text" 
              className="config-input" 
              value={providerPath}
              onChange={(e) => setProviderPath(e.target.value)}
            />
          </div>

          <div className="config-field checkbox-field">
            <input 
              type="checkbox" 
              id="failWarnings" 
              checked={failOnWarnings}
              onChange={(e) => setFailOnWarnings(e.target.checked)}
            />
            <label htmlFor="failWarnings" className="checkbox-label">
              Fail pipeline on warnings
            </label>
          </div>
        </div>

        <div className="guide-info-text">
          <p>
            Integrate **PolyglotSpec** directly into your Pull Request checks. If developer changes in consumer service validation rules drift from the provider target models, the pipeline exits with code `1`, preventing silent contract failures.
          </p>
        </div>
      </div>

      <div className="code-viewer-panel glass-panel">
        <div className="code-header">
          <span className="code-filename">
            {platform === 'github' ? '.github/workflows/api-drift.yml' : '.gitlab-ci.yml'}
          </span>
          <button className="btn-secondary copy-btn" onClick={handleCopy}>
            {copied ? '✔ Copied!' : '📋 Copy Code'}
          </button>
        </div>
        <pre className="code-pre">
          <code>{codeText}</code>
        </pre>
      </div>
    </div>
  );
}
