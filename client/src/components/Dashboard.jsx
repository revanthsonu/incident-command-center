import React from 'react';
import { useApi, timeAgo, apiPatch } from '../hooks/useApi';

export default function Dashboard({ setActivePage }) {
    const { data, loading } = useApi('/dashboard', { refreshInterval: 10000 });

    if (loading || !data) return <DashboardSkeleton />;

    const { kpis, services, recentAlerts, recentIncidents } = data;

    return (
        <div>
            <div className="page-header">
                <h1>Command Center</h1>
                <div className="subtitle">Real-time system overview • Last updated: {new Date().toLocaleTimeString()}</div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card" style={{ '--kpi-color': 'var(--healthy)' }}>
                    <div className="kpi-icon">🟢</div>
                    <div className="kpi-value">{kpis.services_healthy}/{kpis.services_total}</div>
                    <div className="kpi-label">Services Healthy</div>
                    <div className="kpi-detail">{kpis.services_total - kpis.services_healthy > 0 ? `${kpis.services_total - kpis.services_healthy} need attention` : 'All systems operational'}</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-color': kpis.critical_incidents > 0 ? 'var(--critical)' : 'var(--accent)' }}>
                    <div className="kpi-icon">🔥</div>
                    <div className="kpi-value">{kpis.active_incidents}</div>
                    <div className="kpi-label">Active Incidents</div>
                    <div className="kpi-detail">{kpis.critical_incidents > 0 ? `${kpis.critical_incidents} critical` : 'No critical incidents'}</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-color': kpis.unacked_alerts > 5 ? 'var(--high)' : 'var(--medium)' }}>
                    <div className="kpi-icon">🔔</div>
                    <div className="kpi-value">{kpis.unacked_alerts}</div>
                    <div className="kpi-label">Unacked Alerts</div>
                    <div className="kpi-detail">Requires attention</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-color': 'var(--accent)' }}>
                    <div className="kpi-icon">🤖</div>
                    <div className="kpi-value">{kpis.automation_runs}</div>
                    <div className="kpi-label">Automation Runs</div>
                    <div className="kpi-detail">Total executions</div>
                </div>
            </div>

            <div className="section-grid">
                {/* Recent Alerts */}
                <div className="card">
                    <div className="card-header">
                        <h2>🔔 Recent Alerts</h2>
                        <button className="btn btn-sm btn-secondary" onClick={() => setActivePage('alerts')}>View All</button>
                    </div>
                    <div className="alert-list">
                        {recentAlerts.map(alert => (
                            <div key={alert.id} className="alert-item">
                                <div className={`alert-severity-dot ${alert.severity}`}></div>
                                <div className="alert-content">
                                    <div className="alert-message">{alert.message}</div>
                                    <div className="alert-meta">
                                        <span>{alert.service_name}</span>
                                        <span>{timeAgo(alert.created_at)}</span>
                                    </div>
                                </div>
                                <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                            </div>
                        ))}
                        {recentAlerts.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">✅</div>
                                <div className="empty-text">No unacknowledged alerts</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Incidents */}
                <div className="card">
                    <div className="card-header">
                        <h2>🔥 Active Incidents</h2>
                        <button className="btn btn-sm btn-secondary" onClick={() => setActivePage('incidents')}>View All</button>
                    </div>
                    <div>
                        {recentIncidents.map(inc => (
                            <div key={inc.id} className="incident-item" onClick={() => setActivePage('incidents')}>
                                <div className="incident-info">
                                    <div className="incident-title">{inc.title}</div>
                                    <div className="incident-meta">
                                        <span className={`badge badge-${inc.severity}`}>{inc.severity}</span>
                                        <span className={`badge badge-${inc.status === 'resolved' ? 'healthy' : 'warning'}`}>{inc.status}</span>
                                        <span>{inc.service_name}</span>
                                        <span>{timeAgo(inc.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {recentIncidents.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">🎉</div>
                                <div className="empty-text">No active incidents</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Service Health Grid */}
            <div className="card">
                <div className="card-header">
                    <h2>🖥️ System Health</h2>
                    <button className="btn btn-sm btn-secondary" onClick={() => setActivePage('services')}>Details</button>
                </div>
                <div className="card-body">
                    <div className="services-grid">
                        {services.map(svc => (
                            <div key={svc.id} className="service-tile" onClick={() => setActivePage('services')}>
                                <div className="svc-header">
                                    <span className="svc-name">{svc.name}</span>
                                    <span className={`status-dot ${svc.status}`}></span>
                                </div>
                                <div className="svc-region">{svc.region}</div>
                                <div className="svc-metrics" style={{ marginTop: 10 }}>
                                    <div className="svc-metric">
                                        <div className="metric-value" style={{ color: svc.cpu_usage > 70 ? 'var(--high)' : 'var(--text-bright)' }}>{Math.round(svc.cpu_usage)}%</div>
                                        <div className="metric-label">CPU</div>
                                    </div>
                                    <div className="svc-metric">
                                        <div className="metric-value" style={{ color: svc.memory_usage > 80 ? 'var(--critical)' : 'var(--text-bright)' }}>{Math.round(svc.memory_usage)}%</div>
                                        <div className="metric-label">MEM</div>
                                    </div>
                                    <div className="svc-metric">
                                        <div className="metric-value">{svc.request_rate > 1000 ? `${(svc.request_rate / 1000).toFixed(1)}K` : svc.request_rate}</div>
                                        <div className="metric-label">REQ/S</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div>
            <div className="page-header">
                <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 8 }}></div>
                <div className="skeleton" style={{ width: 300, height: 14 }}></div>
            </div>
            <div className="kpi-grid">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }}></div>)}
            </div>
        </div>
    );
}
