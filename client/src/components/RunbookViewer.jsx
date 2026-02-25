import React, { useState } from 'react';
import { useApi, apiPost } from '../hooks/useApi';

export default function RunbookViewer() {
    const { data, loading } = useApi('/runbooks');
    const [selectedId, setSelectedId] = useState(null);
    const [results, setResults] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [filter, setFilter] = useState('all');

    if (loading || !data) return <div className="skeleton" style={{ height: 400, borderRadius: 14 }}></div>;

    const categories = ['all', ...data.categories];
    const filtered = filter === 'all' ? data.runbooks : data.runbooks.filter(r => r.category === filter);
    const selected = data.runbooks.find(r => r.id === selectedId);

    const executeRunbook = async (id) => {
        setExecuting(true);
        setResults(null);
        const res = await apiPost(`/runbooks/${id}/execute`);
        setResults(res.results);
        setExecuting(false);
    };

    return (
        <div>
            <div className="page-header">
                <h1>Runbook Engine</h1>
                <div className="subtitle">Operational runbooks for incident response, maintenance, and daily ops</div>
            </div>

            <div className="filter-bar mb-3">
                {categories.map(c => (
                    <button key={c} className={`filter-chip ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
                        {c === 'all' ? 'All' : c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '360px 1fr' : '1fr', gap: 20 }}>
                {/* Runbook List */}
                <div className="runbook-list">
                    {filtered.map(rb => (
                        <div key={rb.id} className={`runbook-item ${selectedId === rb.id ? 'active' : ''}`}
                            onClick={() => { setSelectedId(rb.id); setResults(null); }}>
                            <div className="rb-title">{rb.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{rb.description}</div>
                            <div className="rb-meta">
                                <span className={`badge badge-${rb.severity}`}>{rb.severity}</span>
                                <span>⏱ {rb.estimated_time}</span>
                                <span>▶ {rb.execution_count} runs</span>
                                <span>{rb.steps.length} steps</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Runbook Detail */}
                {selected && (
                    <div className="card">
                        <div className="card-header">
                            <h2>📋 {selected.title}</h2>
                            <button className="btn btn-primary" onClick={() => executeRunbook(selected.id)} disabled={executing}>
                                {executing ? '⏳ Executing...' : '▶ Execute Runbook'}
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="flex gap-3 mb-4 text-sm">
                                <span className={`badge badge-${selected.severity}`}>{selected.severity}</span>
                                <span className="text-muted">⏱ {selected.estimated_time}</span>
                                <span className="text-muted">📁 {selected.category}</span>
                            </div>

                            {selected.steps.map((step, i) => {
                                const result = results?.[i];
                                return (
                                    <div key={i} className="runbook-step">
                                        <div className={`step-number ${result ? (result.status === 'success' ? 'done' : 'failed') : executing ? 'running' : ''}`}>
                                            {result ? (result.status === 'success' ? '✓' : '!') : step.step}
                                        </div>
                                        <div className="step-content">
                                            <div className="step-action">{step.action}</div>
                                            <div className="step-command">$ {step.command}</div>
                                            <div className="step-expected">Expected: {step.expected}</div>
                                            {result && (
                                                <div className="terminal mt-2" style={{ fontSize: 11, padding: 10 }}>
                                                    <span className={result.status === 'success' ? 'term-success' : 'term-warning'}>
                                                        [{result.status === 'success' ? '✓' : '⚠'}] {result.output}
                                                    </span>
                                                    <br />
                                                    <span className="term-muted">Duration: {result.duration_ms}ms</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
