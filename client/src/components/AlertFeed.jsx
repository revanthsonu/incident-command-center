import React, { useState } from 'react';
import { useApi, apiPatch, timeAgo } from '../hooks/useApi';

export default function AlertFeed() {
    const { data, loading, refetch } = useApi('/alerts', { refreshInterval: 10000 });
    const [filter, setFilter] = useState('all');

    if (loading || !data) return <div className="skeleton" style={{ height: 400, borderRadius: 14 }}></div>;

    const filtered = filter === 'all'
        ? data.alerts
        : filter === 'unacked'
            ? data.alerts.filter(a => !a.acknowledged)
            : data.alerts.filter(a => a.severity === filter);

    const handleAck = async (id) => {
        await apiPatch(`/alerts/${id}/acknowledge`, { acknowledged_by: 'Sarah Chen' });
        refetch();
    };

    return (
        <div>
            <div className="page-header">
                <h1>Alert Management</h1>
                <div className="subtitle">{data.summary.unacknowledged} unacknowledged • {data.summary.critical} critical</div>
            </div>

            <div className="filter-bar">
                {['all', 'unacked', 'critical', 'high', 'medium', 'low'].map(f => (
                    <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f === 'all' ? 'All' : f === 'unacked' ? `Unacked (${data.summary.unacknowledged})` : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className="card">
                <div className="alert-list">
                    {filtered.map(alert => (
                        <div key={alert.id} className="alert-item" style={alert.acknowledged ? { opacity: 0.5 } : {}}>
                            <div className={`alert-severity-dot ${alert.severity}`}></div>
                            <div className="alert-content">
                                <div className="alert-message">{alert.message}</div>
                                <div className="alert-meta">
                                    <span>{alert.service_name}</span>
                                    <span>{alert.type}</span>
                                    <span>{timeAgo(alert.created_at)}</span>
                                    {alert.acknowledged_by && <span>✓ {alert.acknowledged_by}</span>}
                                </div>
                            </div>
                            <div className="alert-actions flex gap-2">
                                <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                                {!alert.acknowledged && (
                                    <button className="btn btn-sm btn-secondary" onClick={() => handleAck(alert.id)}>
                                        Acknowledge
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">🔕</div>
                            <div className="empty-text">No alerts match this filter</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
