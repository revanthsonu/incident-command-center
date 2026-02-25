import React, { useState } from 'react';
import { useApi, apiPost, apiPatch, timeAgo } from '../hooks/useApi';

export default function IncidentPanel() {
    const { data, loading, refetch } = useApi('/incidents', { refreshInterval: 15000 });
    const [selectedId, setSelectedId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState('all');

    if (loading || !data) return <div className="skeleton" style={{ height: 400, borderRadius: 14 }}></div>;

    const filtered = filter === 'all' ? data.incidents : data.incidents.filter(i => i.status !== 'resolved' ? filter === 'active' : filter === 'resolved');

    return (
        <div>
            <div className="page-header">
                <h1>Incident Management</h1>
                <div className="subtitle">Track, manage, and resolve incidents across your infrastructure</div>
            </div>

            <div className="flex items-center justify-between mb-3">
                <div className="filter-bar">
                    {['all', 'active', 'resolved'].map(f => (
                        <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                            {f === 'all' ? 'All' : f === 'active' ? `Active (${data.summary.active})` : 'Resolved'}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Incident</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1fr' : '1fr', gap: 20 }}>
                <div className="card">
                    <div className="card-body" style={{ padding: 0 }}>
                        {filtered.map(inc => (
                            <div key={inc.id} className={`incident-item ${selectedId === inc.id ? 'active' : ''}`}
                                onClick={() => setSelectedId(inc.id)}
                                style={selectedId === inc.id ? { background: 'var(--accent-bg)' } : {}}>
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
                    </div>
                </div>

                {selectedId && <IncidentDetail id={selectedId} onClose={() => setSelectedId(null)} onUpdate={refetch} />}
            </div>

            {showCreate && <CreateIncidentModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refetch(); }} />}
        </div>
    );
}

function IncidentDetail({ id, onClose, onUpdate }) {
    const { data, loading, refetch } = useApi(`/incidents/${id}`);
    const [updating, setUpdating] = useState(false);

    if (loading || !data) return <div className="card"><div className="card-body"><div className="skeleton" style={{ height: 200 }}></div></div></div>;

    const { incident, timeline } = data;
    const statusFlow = ['investigating', 'identified', 'monitoring', 'resolved'];
    const currentIdx = statusFlow.indexOf(incident.status);

    const updateStatus = async (newStatus) => {
        setUpdating(true);
        await apiPatch(`/incidents/${id}/status`, { status: newStatus, actor: 'Sarah Chen' });
        await refetch();
        onUpdate();
        setUpdating(false);
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2>INC-{String(id).padStart(4, '0')}</h2>
                <button className="btn btn-sm btn-secondary" onClick={onClose}>✕</button>
            </div>
            <div className="card-body">
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 8 }}>{incident.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{incident.description}</p>

                <div className="flex gap-2 mb-3">
                    <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>
                    <span className={`badge badge-${incident.status === 'resolved' ? 'healthy' : 'warning'}`}>{incident.status}</span>
                </div>

                <div className="flex gap-4 mb-4 text-sm text-muted">
                    <span>👤 {incident.assignee || 'Unassigned'}</span>
                    <span>🖥️ {incident.service_name}</span>
                    <span>🕐 {timeAgo(incident.created_at)}</span>
                </div>

                {/* Status Actions */}
                {incident.status !== 'resolved' && (
                    <div className="flex gap-2 mb-4">
                        {statusFlow.slice(currentIdx + 1).map(s => (
                            <button key={s} className={`btn btn-sm ${s === 'resolved' ? 'btn-success' : 'btn-secondary'}`}
                                disabled={updating} onClick={() => updateStatus(s)}>
                                → {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Timeline */}
                <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Timeline</h4>
                <div className="timeline">
                    {timeline.map((tl, i) => (
                        <div key={i} className="timeline-item">
                            <div className="tl-action" style={{ color: tl.action === 'resolved' ? 'var(--healthy)' : tl.action === 'created' ? 'var(--critical)' : 'var(--accent-hover)' }}>
                                {tl.action}
                            </div>
                            <div className="tl-detail">{tl.detail}</div>
                            <div className="tl-meta">{tl.actor} • {timeAgo(tl.created_at)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CreateIncidentModal({ onClose, onCreated }) {
    const { data: svcData } = useApi('/services');
    const [form, setForm] = useState({ title: '', description: '', severity: 'medium', service_id: '', assignee: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await apiPost('/incidents', form);
        setSubmitting(false);
        onCreated();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create Incident</h2>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input className="input" placeholder="Brief incident title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="textarea" placeholder="What's happening?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Severity</label>
                                <select className="select" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                                    <option value="critical">Critical</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Service</label>
                                <select className="select" value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}>
                                    <option value="">Select service</option>
                                    {svcData?.services?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Assignee</label>
                            <input className="input" placeholder="Engineer name" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting || !form.title}>
                            {submitting ? 'Creating...' : 'Create Incident'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
