import React from 'react';
import { useApi } from '../hooks/useApi';

export default function ServiceHealth() {
    const { data, loading } = useApi('/services', { refreshInterval: 10000 });

    if (loading || !data) return <div className="skeleton" style={{ height: 400, borderRadius: 14 }}></div>;

    const { services, summary } = data;

    return (
        <div>
            <div className="page-header">
                <h1>Service Health</h1>
                <div className="subtitle">{summary.healthy} healthy • {summary.degraded} degraded • {summary.warning} warning • {summary.down} down</div>
            </div>

            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card" style={{ '--kpi-color': 'var(--healthy)' }}>
                    <div className="kpi-value" style={{ color: 'var(--healthy)' }}>{summary.healthy}</div>
                    <div className="kpi-label">Healthy</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-color': 'var(--high)' }}>
                    <div className="kpi-value" style={{ color: 'var(--high)' }}>{summary.degraded}</div>
                    <div className="kpi-label">Degraded</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-color': 'var(--medium)' }}>
                    <div className="kpi-value" style={{ color: 'var(--medium)' }}>{summary.warning}</div>
                    <div className="kpi-label">Warning</div>
                </div>
                <div className="kpi-card" style={{ '--kpi-color': 'var(--critical)' }}>
                    <div className="kpi-value" style={{ color: 'var(--critical)' }}>{summary.down}</div>
                    <div className="kpi-label">Down</div>
                </div>
            </div>

            <div className="services-grid">
                {services.map(svc => (
                    <div key={svc.id} className="service-tile">
                        <div className="svc-header">
                            <span className="svc-name">{svc.name}</span>
                            <span className={`status-dot ${svc.status}`}></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span className="svc-region">{svc.region}</span>
                            <span className={`badge badge-${svc.status}`}>{svc.status}</span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                                <span>Uptime</span>
                                <span style={{ color: svc.uptime_percent > 99.9 ? 'var(--healthy)' : 'var(--medium)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{svc.uptime_percent}%</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${svc.uptime_percent}%` }}></div>
                            </div>
                        </div>
                        <div className="svc-metrics">
                            <div className="svc-metric">
                                <div className="metric-value" style={{ fontSize: 14, color: svc.cpu_usage > 70 ? 'var(--high)' : 'var(--text-bright)' }}>{Math.round(svc.cpu_usage)}%</div>
                                <div className="metric-label">CPU</div>
                            </div>
                            <div className="svc-metric">
                                <div className="metric-value" style={{ fontSize: 14, color: svc.memory_usage > 80 ? 'var(--critical)' : 'var(--text-bright)' }}>{Math.round(svc.memory_usage)}%</div>
                                <div className="metric-label">MEM</div>
                            </div>
                            <div className="svc-metric">
                                <div className="metric-value" style={{ fontSize: 14 }}>{svc.error_rate}%</div>
                                <div className="metric-label">ERR</div>
                            </div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                            P99: {svc.latency_p99}ms • {svc.request_rate.toLocaleString()} req/s
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
