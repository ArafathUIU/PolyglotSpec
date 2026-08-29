import React from 'react';
import { initialServices, driftHistory } from '../mockData';
import './Overview.css';

export default function Overview({
  services = initialServices,
  averageSyncScore = 94,
  activeIssuesCount = 2,
  alertLevel = "Drift Warning",
  history = driftHistory
}) {
  const getSeverityClass = (sev) => sev === 'breaking' ? 'red' : 'yellow';
  const getStatusClass = (status) => status === 'synced' ? 'green' : 'red';

  return (
    <div className="overview-container">
      {/* Top Stats Cards Horizontal Row */}
      <section className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Alert Level</span>
          <span className={`metric-value ${alertLevel === 'Fully Synced' ? 'text-green' : alertLevel === 'Drift Alert' ? 'text-red' : 'text-yellow'}`}>
            {alertLevel}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Connected Services</span>
          <span className="metric-value">3 Active</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Average Sync Score</span>
          <span className="metric-value">{averageSyncScore}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active Issues</span>
          <span className={`metric-value ${activeIssuesCount === 0 ? 'text-green' : 'text-red'}`}>
            {activeIssuesCount === 0 ? '0 Issues' : `${activeIssuesCount} Drifts`}
          </span>
        </div>
      </section>

      {/* Main Dashboard Split (2 Columns: 2/3 and 1/3) */}
      <div className="overview-row">
        {/* Left Column (Connected Microservices) */}
        <section className="services-section">
          <h3 className="section-title">Connected Microservices</h3>
          <div className="services-list">
            {services.map((service) => (
              <div key={service.id} className="service-item">
                <div className="service-header">
                  <div className="service-title-group">
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
                
                <div className="progress-bar-container">
                  <div className="progress-bar-bg">
                    <div 
                      className={`progress-bar ${service.syncScore === 100 ? 'green' : service.syncScore >= 90 ? 'amber' : 'red'}`} 
                      style={{ width: `${service.syncScore}%` }}
                    ></div>
                  </div>
                  <span className="progress-percent">{service.syncScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column (Contract Change History) */}
        <section className="timeline-section">
          <h3 className="section-title">Contract Change History</h3>
          <div className="timeline-list">
            {history.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-badge-container">
                  <div className={`timeline-dot ${getSeverityClass(item.severity)}`}></div>
                  <div className="timeline-line"></div>
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-commit">{item.commit}</span>
                    <span className="timeline-time">{item.timestamp}</span>
                  </div>
                  <h4 className="timeline-service-name">{item.service}</h4>
                  <p className="timeline-msg">{item.message}</p>
                  <div className="timeline-drift-info">
                    <span className={`status-badge ${getSeverityClass(item.severity)}`}>
                      {item.severity}
                    </span>
                    <span className="drift-details">{item.details}</span>
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