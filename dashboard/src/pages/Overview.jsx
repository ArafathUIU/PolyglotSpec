import React from 'react';
import { initialServices, driftHistory } from '../mockData';
import './Overview.css';

export default function Overview({
  services = initialServices,
  averageSyncScore = 94,
  activeIssuesCount = 2,
  alertLevel = "Drift Warning"
}) {
  const getSeverityClass = (sev) => {
    return sev === 'breaking' ? 'red' : 'yellow';
  };

  const getStatusClass = (status) => {
    return status === 'synced' ? 'green' : 'red';
  };

  return (
    <div className="overview-container">
      {/* Metrics Section */}
      <section className="metrics-grid">
        <div className="metric-card glass-panel">
          <span className="metric-icon">🛡️</span>
          <div className="metric-info">
            <span className="metric-label">Alert Level</span>
            <span className={`metric-value ${alertLevel === 'Fully Synced' ? 'text-green' : (alertLevel === 'Drift Alert' ? 'text-red' : 'text-yellow')}`}>
              {alertLevel}
            </span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <span className="metric-icon">📦</span>
          <div className="metric-info">
            <span className="metric-label">Connected Services</span>
            <span className="metric-value">3 Active</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <span className="metric-icon">🔄</span>
          <div className="metric-info">
            <span className="metric-label">Average Sync Score</span>
            <span className={`metric-value ${averageSyncScore === 100 ? 'text-green' : 'text-yellow'}`}>{averageSyncScore}%</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <span className="metric-icon">🚨</span>
          <div className="metric-info">
            <span className="metric-label">Active Issues</span>
            <span className={`metric-value ${activeIssuesCount === 0 ? 'text-green' : 'text-red'}`}>
              {activeIssuesCount === 0 ? '0 Issues' : `${activeIssuesCount} Drifts`}
            </span>
          </div>
        </div>
      </section>

      {/* Services Grid & Activity Row */}
      <div className="overview-row">
        {/* Connected Services */}
        <section className="services-section glass-panel">
          <h3 className="section-title">Connected Microservices</h3>
          <div className="services-list">
            {services.map((service) => (
              <div key={service.id} className="service-item">
                <div className="service-header">
                  <div>
                    <h4 className="service-name">{service.name}</h4>
                    <span className="service-framework">{service.framework}</span>
                  </div>
                  <span className={`status-badge ${getStatusClass(service.status)}`}>
                    {service.status}
                  </span>
                </div>

                <div className="service-details">
                  <div className="detail-item">
                    <span className="detail-label">File:</span>
                    <code className="detail-code">{service.filePath}</code>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Type:</span>
                    <span className="type-tag">{service.type}</span>
                  </div>
                </div>

                <div className="score-container">
                  <div className="score-header">
                    <span>Sync Score</span>
                    <span className="score-value">{service.syncScore}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className={`progress-bar ${service.syncScore === 100 ? 'green' : 'yellow'}`}
                      style={{ width: `${service.syncScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Drift Timeline */}
        <section className="timeline-section glass-panel">
          <h3 className="section-title">Contract Change History</h3>
          <div className="timeline-list">
            {driftHistory.map((history) => (
              <div key={history.id} className="timeline-item">
                <div className="timeline-badge-container">
                  <div className={`timeline-dot ${getSeverityClass(history.severity)}`}></div>
                  <div className="timeline-line"></div>
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-commit">commit {history.commit}</span>
                    <span className="timeline-time">{history.timestamp}</span>
                  </div>
                  <h4 className="timeline-service-name">{history.service}</h4>
                  <p className="timeline-msg">{history.message}</p>
                  <div className="timeline-drift-info">
                    <span className={`status-badge ${getSeverityClass(history.severity)}`}>
                      {history.severity}
                    </span>
                    <span className="drift-desc">{history.details}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
